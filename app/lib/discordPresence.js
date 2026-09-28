// Server-only. Never import this from a "use client" component — it reads
// DISCORD_BOT_TOKEN, which must stay off the client bundle entirely.
//
// Snapshot (NOT live) Discord presence, read with the bot token.
//
// Why this isn't a plain REST call: Discord's REST API has no presence
// endpoint. Status + activities only exist on the gateway (websocket), and
// only for users who share a server with the bot. So instead of keeping a
// socket open forever, we open one, ask for the users we need, take what
// comes back, and close it. The result is cached in memory, so the profile
// page just shows "as of the last snapshot".
//
// Setup (discord.com/developers -> your app -> Bot):
//   1. Turn ON "Presence Intent" (privileged). Without it Discord closes the
//      socket with code 4014 and this returns nothing.
//   2. The bot must be in a server the user is also in.
//   3. DISCORD_BOT_TOKEN in the environment.
//
// Budget: every uncached snapshot is one gateway IDENTIFY, and bots get
// 1000 of those per 24h. All users needed for one page view share a single
// connection, and results are cached for DISCORD_PRESENCE_TTL_SECONDS
// (default 300, minimum 60) per user per server instance.

const DISCORD_API = "https://discord.com/api/v10";
const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const INTENTS = (1 << 0) | (1 << 8); // GUILDS | GUILD_PRESENCES
const GATEWAY_TIMEOUT_MS = 6000;
const FAIL_TTL_MS = 30 * 1000; // don't hammer the gateway if it's failing

const TTL_MS =
  Math.max(60, Number(process.env.DISCORD_PRESENCE_TTL_SECONDS) || 300) * 1000;

/** @type {Map<string, { at: number, ttl: number, value: any }>} */
const cache = new Map();
/** @type {Map<string, Promise<any>>} */
const inflight = new Map();

// Only what the card draws — keeps the props sent to the browser small.
function slimActivity(a) {
  return {
    type: a.type,
    name: a.name ?? "",
    details: a.details ?? null,
    state: a.state ?? null,
    emoji: a.emoji
      ? { id: a.emoji.id ?? null, name: a.emoji.name ?? null, animated: !!a.emoji.animated }
      : null,
    application_id: a.application_id ?? null,
    assets: a.assets?.large_image ? { large_image: a.assets.large_image } : null,
  };
}

function slimPresence(p) {
  return {
    status: ["online", "idle", "dnd", "offline"].includes(p.status) ? p.status : "offline",
    activities: (p.activities ?? []).map(slimActivity),
  };
}

// Profile data (name, avatar) is public and comes from plain REST.
async function getDiscordUser(id, token) {
  try {
    const res = await fetch(`${DISCORD_API}/users/${id}`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return {
      id: u.id,
      username: u.username ?? null,
      global_name: u.global_name ?? null,
      avatar: u.avatar ?? null,
    };
  } catch {
    return null;
  }
}

// One gateway session for every id. Resolves a Map of id -> { status,
// activities } for whoever it could see. Ids that never show up in any
// server the bot shares are simply missing from the map.
async function gatewaySnapshot(token, ids) {
  let WS = globalThis.WebSocket;
  if (!WS) {
    // Node < 22 has no global WebSocket; fall back to the `ws` package.
    WS = (await import("ws")).default;
  }

  return new Promise((resolve) => {
    const want = new Set(ids);
    const found = new Map();
    const pending = new Set(); // guilds from READY we haven't finished
    let ws;
    let finished = false;
    let timer;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        ws?.close(1000);
      } catch {}
      resolve(found);
    };

    const send = (op, d) => {
      try {
        ws.send(JSON.stringify({ op, d }));
      } catch {}
    };

    // Presence entries beat "member exists but no presence" (= offline).
    const readPresences = (list) => {
      for (const p of list ?? []) {
        const uid = p?.user?.id;
        if (uid && want.has(uid)) found.set(uid, slimPresence(p));
      }
    };
    const readMembers = (list) => {
      for (const m of list ?? []) {
        const uid = m?.user?.id;
        if (uid && want.has(uid) && !found.has(uid)) {
          found.set(uid, { status: "offline", activities: [] });
        }
      }
    };

    timer = setTimeout(finish, GATEWAY_TIMEOUT_MS);

    try {
      ws = new WS(GATEWAY_URL);
    } catch (err) {
      console.error("[discordPresence] couldn't open gateway:", err);
      return finish();
    }

    ws.onmessage = (ev) => {
      let msg;
      try {
        const raw = typeof ev.data === "string" ? ev.data : ev.data.toString();
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      if (msg.op === 10) {
        // HELLO -> identify right away. We're gone in a few seconds, well
        // inside the heartbeat interval, so no heartbeat loop needed.
        send(2, {
          token,
          intents: INTENTS,
          properties: { os: "linux", browser: "raided-cc", device: "raided-cc" },
        });
        return;
      }

      if (msg.op === 9) {
        console.error("[discordPresence] gateway rejected the session (invalid session)");
        return finish();
      }

      if (msg.op !== 0) return;

      if (msg.t === "READY") {
        for (const g of msg.d.guilds ?? []) pending.add(g.id);
        if (pending.size === 0) finish(); // bot isn't in any server
        return;
      }

      if (msg.t === "GUILD_CREATE") {
        const gid = msg.d.id;
        readPresences(msg.d.presences);
        if (found.size === want.size && [...found.values()].every((v) => v.status !== "offline")) {
          return finish();
        }
        // Not everyone's here yet: ask this guild directly. Covers huge
        // servers where GUILD_CREATE leaves presences out, and tells us
        // "member but offline" apart from "not in this server".
        const missing = [...want].filter((id) => !found.has(id) || found.get(id).status === "offline");
        send(8, { guild_id: gid, user_ids: missing, presences: true, limit: 0 });
        return;
      }

      if (msg.t === "GUILD_MEMBERS_CHUNK") {
        readPresences(msg.d.presences);
        readMembers(msg.d.members);
        pending.delete(msg.d.guild_id);
        if (pending.size === 0) finish();
      }
    };

    ws.onclose = (ev) => {
      if (ev?.code === 4014) {
        console.error(
          "[discordPresence] gateway closed with 4014: turn on Presence Intent for the bot in the Discord developer portal."
        );
      } else if (ev?.code === 4004) {
        console.error("[discordPresence] gateway closed with 4004: DISCORD_BOT_TOKEN is invalid.");
      }
      finish();
    };
    ws.onerror = () => finish();
  });
}

async function fetchBatch(ids, token) {
  const [gw, users] = await Promise.all([
    gatewaySnapshot(token, ids).catch((err) => {
      console.error("[discordPresence] snapshot failed:", err);
      return new Map();
    }),
    Promise.all(ids.map((id) => getDiscordUser(id, token))),
  ]);

  const out = new Map();
  ids.forEach((id, i) => {
    const p = gw.get(id);
    out.set(id, p ? { user: users[i], status: p.status, activities: p.activities } : null);
  });
  return out;
}

/**
 * Presence snapshot for a set of Discord user ids.
 * Returns { [userId]: { user, status, activities } } — ids the bot can't see
 * (no shared server, gateway down, no token) are left out.
 *
 * @param {string[]} userIds
 * @returns {Promise<Record<string, { user: { id: string, username: string | null, global_name: string | null, avatar: string | null } | null, status: "online" | "idle" | "dnd" | "offline", activities: any[] }>>}
 */
export async function getDiscordPresences(userIds) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const ids = [...new Set((userIds ?? []).filter(Boolean))];
  if (!token || ids.length === 0) return {};

  const now = Date.now();
  const results = {};
  const waiting = [];
  const toFetch = [];

  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && now - hit.at < hit.ttl) {
      if (hit.value) results[id] = hit.value;
    } else if (inflight.has(id)) {
      waiting.push([id, inflight.get(id)]);
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length > 0) {
    // One socket for the whole list.
    const batch = fetchBatch(toFetch, token);
    for (const id of toFetch) {
      const p = batch.then((m) => m.get(id) ?? null);
      inflight.set(id, p);
      waiting.push([id, p]);
    }
    batch
      .then((m) => {
        const at = Date.now();
        for (const id of toFetch) {
          const value = m.get(id) ?? null;
          cache.set(id, { at, ttl: value ? TTL_MS : FAIL_TTL_MS, value });
        }
      })
      .finally(() => {
        for (const id of toFetch) inflight.delete(id);
      });
  }

  await Promise.all(
    waiting.map(async ([id, p]) => {
      const v = await p;
      if (v) results[id] = v;
    })
  );

  return results;
}
