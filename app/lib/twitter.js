// Server-only. No API key, no login, no paid X plan.
//
// Public X (Twitter) profile snapshot: avatar, display name, follower/
// following counts, verification. Same return shape as the old X-API version,
// so TwitterWidget.jsx / [handle]/page.tsx don't need to change.
//
// Sources, tried in order per username:
//   1. api.fxtwitter.com/<user>   (public JSON, one request per user)
//   2. cdn.syndication.twimg.com  (the follow-button endpoint X itself serves,
//                                  batched; no verified flag, but has counts)
//
// Results are cached for TWITTER_PROFILE_TTL_SECONDS (default 600, min 60).
// If both sources fail, the last good value is kept (stale beats an empty
// card) and we retry after a short cooldown.

const TTL_MS = Math.max(60, Number(process.env.TWITTER_PROFILE_TTL_SECONDS) || 600) * 1000;
const FAIL_TTL_MS = 60 * 1000;
const TIMEOUT_MS = 4000;
const UA = "Mozilla/5.0 (compatible; raided.cc profile widget)";

/** @type {Map<string, { at: number, ttl: number, value: any }>} */
const cache = new Map();

const bigAvatar = (url) => (url ? String(url).replace("_normal", "_400x400") : null);

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store", // we do our own caching above
    });
    if (!res.ok) {
      console.error(`Twitter widget: ${res.status} from ${new URL(url).host}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Twitter widget: request to ${new URL(url).host} failed:`, err?.message ?? err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 1. FxTwitter
async function fromFx(username) {
  const body = await getJson(`https://api.fxtwitter.com/${encodeURIComponent(username)}`);
  const u = body?.user;
  if (!u) return null;
  return {
    id: String(u.id ?? ""),
    username: u.screen_name ?? username,
    name: u.name ?? u.screen_name ?? username,
    avatar: bigAvatar(u.avatar_url),
    followers: Number(u.followers) || 0,
    following: Number(u.following) || 0,
    verified: Boolean(u.verification?.verified),
  };
}

// 2. X's own syndication endpoint, batched
async function fromSyndication(usernames) {
  const out = {};
  if (usernames.length === 0) return out;
  const body = await getJson(
    `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${usernames.join(",")}`
  );
  if (!Array.isArray(body)) return out;
  for (const u of body) {
    const key = String(u.screen_name ?? "").toLowerCase();
    if (!key) continue;
    out[key] = {
      id: String(u.id ?? ""),
      username: u.screen_name,
      name: u.name ?? u.screen_name,
      avatar: bigAvatar(u.profile_image_url_https),
      followers: Number(u.followers_count) || 0,
      following: Number(u.friends_count) || 0,
      verified: Boolean(u.verified),
    };
  }
  return out;
}

/**
 * @param {string[]} usernames
 * @returns {Promise<Record<string, { id: string, username: string, name: string, avatar: string | null, followers: number, following: number, verified: boolean } | null>>} keyed by lowercased username
 */
export async function getTwitterProfiles(usernames) {
  const want = Array.from(new Set((usernames ?? []).map((u) => String(u).trim().toLowerCase()).filter(Boolean)));
  const out = {};
  if (want.length === 0) return out;

  const now = Date.now();
  const toFetch = [];
  for (const u of want) {
    const hit = cache.get(u);
    if (hit && now - hit.at < hit.ttl) out[u] = hit.value;
    else toFetch.push(u);
  }
  if (toFetch.length === 0) return out;

  // Source 1, all users in parallel.
  const fx = await Promise.all(toFetch.map((u) => fromFx(u)));
  const results = {};
  const missing = [];
  toFetch.forEach((u, i) => {
    if (fx[i]) results[u] = fx[i];
    else missing.push(u);
  });

  // Source 2 for whoever source 1 couldn't give us.
  if (missing.length) {
    const syn = await fromSyndication(missing);
    for (const u of missing) if (syn[u]) results[u] = syn[u];
  }

  for (const u of toFetch) {
    const fresh = results[u] ?? null;
    if (fresh) {
      out[u] = fresh;
      cache.set(u, { at: now, ttl: TTL_MS, value: fresh });
    } else {
      // Keep showing the last good snapshot if we have one.
      const stale = cache.get(u)?.value ?? null;
      out[u] = stale;
      cache.set(u, { at: now, ttl: FAIL_TTL_MS, value: stale });
    }
  }
  return out;
}