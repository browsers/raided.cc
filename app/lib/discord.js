// Server-only. Never import this from a "use client" component — it reads
// DISCORD_BOT_TOKEN, which must stay off the client bundle entirely.
//
// Discord's user object carries a "primary_guild" field (what the client
// UI calls a server tag / guild tag): a 2-4 character tag plus a badge
// image, shown next to a user's name. It's public profile data — no
// per-user OAuth needed — and comes back from a plain bot-token lookup:
// GET /users/{id}. Docs: https://discord.com/developers/docs/resources/user
//
// Requires a Discord application with a bot user (discord.com/developers)
// and DISCORD_BOT_TOKEN set in the environment. The bot doesn't need to
// share a server with anyone — this lookup works for any user ID.
const DISCORD_API = "https://discord.com/api/v10";

/**
 * @param {string} discordUserId
 * @returns {Promise<{ tag: string, badgeUrl: string | null } | null>}
 */
export async function getDiscordGuildTag(discordUserId) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !discordUserId) return null;

  try {
    const res = await fetch(`${DISCORD_API}/users/${discordUserId}`, {
      headers: { Authorization: `Bot ${token}` },
      // Cache for 5 minutes — this is a shared bot token with its own
      // global rate limit, and a profile's tag doesn't change often
      // enough to justify fetching it on every single page view.
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const user = await res.json();
    const guild = user?.primary_guild;

    // identity_enabled is explicitly false when the user turned their tag
    // off, and null when Discord itself cleared it (left the server, etc).
    // Either way, nothing to show.
    if (!guild || guild.identity_enabled !== true || !guild.tag) return null;

    return {
      tag: guild.tag,
      badgeUrl:
        guild.identity_guild_id && guild.badge
          ? `https://cdn.discordapp.com/clan-badges/${guild.identity_guild_id}/${guild.badge}.png?size=64`
          : null,
    };
  } catch {
    // Network hiccup or bad ID shouldn't ever break the profile page.
    return null;
  }
}
