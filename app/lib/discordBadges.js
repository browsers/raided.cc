// Discord profile badges, decoded from the `public_flags` number that comes
// back on GET /users/{id}. No server-only code in here, so the widget can
// import it on the client.
//
// What the bot can and can't see: public_flags only covers the badges tied to
// account flags (Staff, Partner, HypeSquad, Bug Hunter, Early Supporter, Active
// Developer, ...). Nitro, Server Boost, Quest and "originally known as" badges
// are not part of that number, so Discord never gives them to a bot.
//
// Icons load from Discord's CDN. If one ever goes missing, drop a PNG into
// public/discord-badges/ and point that entry's `icon` at "/discord-badges/x.png".

const CDN = "https://cdn.discordapp.com/badge-icons";

// Order here is the order they show up next to the name.
// bit = position in the public_flags bitfield.
export const DISCORD_BADGES = [
  { bit: 0, key: "staff", label: "Discord Staff", icon: `${CDN}/5e74e9b61934fc1f67c65515d1f7e60d.png` },
  { bit: 1, key: "partner", label: "Partnered Server Owner", icon: `${CDN}/3f9748e53446a137a052f3454e2de41e.png` },
  { bit: 18, key: "certified_moderator", label: "Moderator Programs Alumni", icon: `${CDN}/fee1624003e2fee35cb398e125dc479b.png` },
  { bit: 2, key: "hypesquad_events", label: "HypeSquad Events", icon: `${CDN}/bf01d1073931f921909045f3a39fd264.png` },
  { bit: 6, key: "hypesquad_bravery", label: "HypeSquad Bravery", icon: `${CDN}/8a88d63823d8a71cd5e390baa45efa02.png` },
  { bit: 7, key: "hypesquad_brilliance", label: "HypeSquad Brilliance", icon: `${CDN}/011940fd013da3f7fb926e4a1cd2e618.png` },
  { bit: 8, key: "hypesquad_balance", label: "HypeSquad Balance", icon: `${CDN}/3aa41de486fa12454c3761e8e223442e.png` },
  { bit: 3, key: "bug_hunter_1", label: "Discord Bug Hunter", icon: `${CDN}/2717692c7dca7289b35297368a940dd0.png` },
  { bit: 14, key: "bug_hunter_2", label: "Discord Bug Hunter", icon: `${CDN}/848f79194d4be5ff5f81505cbd0ce1e6.png` },
  { bit: 9, key: "early_supporter", label: "Early Supporter", icon: `${CDN}/7060786766c9c840eb3019e725d2b358.png` },
  { bit: 17, key: "verified_developer", label: "Early Verified Bot Developer", icon: `${CDN}/6df5892e0f35b051f8b61eace34f4967.png` },
  { bit: 22, key: "active_developer", label: "Active Developer", icon: `${CDN}/6bdc42827a38498929a4920da12695d9.png` },
];

/**
 * @param {unknown} flags public_flags number from Discord
 * @returns {{ key: string, label: string, icon: string }[]}
 */
export function decodeDiscordBadges(flags) {
  const n = Number(flags);
  if (!Number.isFinite(n) || n <= 0) return [];
  const out = [];
  for (const b of DISCORD_BADGES) {
    // Bit math on a float is fine here: the highest bit we read is 22.
    if (Math.floor(n / 2 ** b.bit) % 2 === 1) out.push({ key: b.key, label: b.label, icon: b.icon });
  }
  // Bug Hunter level 2 replaces level 1 in the client.
  return out.some((b) => b.key === "bug_hunter_2") ? out.filter((b) => b.key !== "bug_hunter_1") : out;
}
