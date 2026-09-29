// Server-only. Never import this from a "use client" component — it reads
// TWITTER_BEARER_TOKEN, which must stay off the client bundle entirely.
//
// Public X (Twitter) profile snapshot: avatar, display name, follower/
// following counts, and verification status. Plain REST, no gateway needed
// here (unlike Discord's presence) since all of this is public profile data.
//
// Setup (developer.x.com -> your app):
//   1. Generate a Bearer Token (App-only OAuth2) for the app.
//   2. TWITTER_BEARER_TOKEN in the environment.
//   3. The "Users lookup" endpoint needs at least Basic API access — X's
//      free tier doesn't include it, so this quietly returns nothing
//      without a paid plan, same as a missing Discord bot token.
//
// Batches every widget's username into as few requests as possible (X
// allows up to 100 usernames per call) and caches results for
// TWITTER_PROFILE_TTL_SECONDS (default 300, minimum 60) per username per
// server instance.

const X_API = "https://api.x.com/2";
const TTL_MS = Math.max(60, Number(process.env.TWITTER_PROFILE_TTL_SECONDS) || 300) * 1000;
const FAIL_TTL_MS = 30 * 1000; // don't hammer the API if it's failing

/** @type {Map<string, { at: number, ttl: number, value: any }>} */
const cache = new Map();

// Only what the widget draws — keeps what's sent to the browser small.
function slim(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.name ?? u.username,
    // X hands back the small "_normal" size by default; ask for the bigger one.
    avatar: u.profile_image_url ? u.profile_image_url.replace("_normal", "_400x400") : null,
    followers: u.public_metrics?.followers_count ?? 0,
    following: u.public_metrics?.following_count ?? 0,
    // Legacy blue check (`verified`) and the newer `verified_type` both mean
    // "has a checkmark" — a business/government account is still verified.
    verified: Boolean(u.verified) || (typeof u.verified_type === "string" && u.verified_type !== "none"),
  };
}

/**
 * @param {string[]} usernames
 * @returns {Promise<Record<string, ReturnType<typeof slim> | null>>} keyed by lowercased username
 */
export async function getTwitterProfiles(usernames) {
  const want = Array.from(new Set((usernames ?? []).map((u) => String(u).trim().toLowerCase()).filter(Boolean)));
  const out = {};
  if (want.length === 0) return out;

  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    for (const u of want) out[u] = null;
    return out;
  }

  const now = Date.now();
  const toFetch = [];
  for (const u of want) {
    const hit = cache.get(u);
    if (hit && now - hit.at < hit.ttl) out[u] = hit.value;
    else toFetch.push(u);
  }
  if (toFetch.length === 0) return out;

  for (let i = 0; i < toFetch.length; i += 100) {
    const chunk = toFetch.slice(i, i + 100);
    try {
      const res = await fetch(
        `${X_API}/users/by?usernames=${chunk.join(",")}&user.fields=profile_image_url,public_metrics,verified,verified_type`,
        { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: TTL_MS / 1000 } }
      );
      const body = res.ok ? await res.json() : null;
      const found = new Map((body?.data ?? []).map((u) => [String(u.username).toLowerCase(), slim(u)]));
      for (const u of chunk) {
        const value = found.get(u) ?? null;
        out[u] = value;
        cache.set(u, { at: now, ttl: value ? TTL_MS : FAIL_TTL_MS, value });
      }
    } catch {
      for (const u of chunk) {
        out[u] = null;
        cache.set(u, { at: now, ttl: FAIL_TTL_MS, value: null });
      }
    }
  }
  return out;
}
