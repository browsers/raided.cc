// Shared by the dashboard Links tab and the public profile page, so both
// agree on what a saved link looks like. Everything lives in one jsonb
// column and is queried on its own (see [handle]/page.tsx), so a missing
// column (migration not run yet) can never break a profile.
//
// Saved shape: { iconColor: "#ffffff", hoverColor: "#c7c7c7",
//                items: [{ platform: "discord", url: "https://..." }] }

import { isHex } from "./cardStyle";

export const LINKS_COLUMN = "profile_links";

export const LINK_DEFAULTS = {
  iconColor: "#ffffff",
  hoverColor: "#c7c7c7",
};

// To add a platform: drop its icon in public/link/ and add a line here.
// The icons are solid shapes, drawn as a mask so they can be recoloured.
//
// Each platform has a fixed `prefix`: users only type the part after it (the
// username / invite code), so a link can only ever point at that site.
//   chars: characters allowed in the typed part, min/max: its length.
//   placeholder: example of the typed part (shown inside the input).
export const LINK_PLATFORMS = [
  { key: "discord", label: "Discord", icon: "/link/discord.png", prefix: "https://discord.gg/", placeholder: "invite", chars: /[^A-Za-z0-9-]/g, min: 2, max: 32 },
  { key: "x", label: "X", icon: "/link/x.png", prefix: "https://x.com/", placeholder: "username", chars: /[^A-Za-z0-9_]/g, min: 1, max: 15 },
  { key: "tiktok", label: "TikTok", icon: "/link/tiktik.png", prefix: "https://tiktok.com/@", placeholder: "username", chars: /[^A-Za-z0-9._]/g, min: 1, max: 24 },
];

export const LINK_PLATFORM_BY_KEY = Object.fromEntries(LINK_PLATFORMS.map((p) => [p.key, p]));

// Drops the platform's own prefix if the user pasted a full link (with or
// without https://, with or without www.), plus a leading @ and a trailing /.
function stripPrefix(p, raw) {
  let s = String(raw ?? "").trim();
  const bare = p.prefix.replace(/^https:\/\//, "");
  for (const pre of [p.prefix, `http://${bare}`, `https://www.${bare}`, `www.${bare}`, bare]) {
    if (s.toLowerCase().startsWith(pre.toLowerCase())) {
      s = s.slice(pre.length);
      break;
    }
  }
  return s.replace(/^@+/, "").replace(/\/+$/, "");
}

/**
 * Typing filter for the editor input: pasted full links lose their prefix and
 * any character the platform doesn't allow (slashes, ?, spaces...) is removed
 * as it's typed. Lenient on length, so half-typed input still shows.
 * @param {string} platform
 * @param {unknown} raw
 * @returns {string}
 */
export function filterLinkSuffix(platform, raw) {
  const p = LINK_PLATFORM_BY_KEY[platform];
  if (!p) return "";
  return stripPrefix(p, raw).replace(p.chars, "").slice(0, p.max);
}

/**
 * Strict version: the typed part if it is a complete valid one, else "".
 * @param {string} platform
 * @param {unknown} raw
 * @returns {string}
 */
export function cleanLinkSuffix(platform, raw) {
  const p = LINK_PLATFORM_BY_KEY[platform];
  if (!p) return "";
  const s = stripPrefix(p, raw);
  if (s.length < p.min || s.length > p.max || s.replace(p.chars, "") !== s) return "";
  return s;
}

/**
 * The full saved URL (prefix + typed part), or "" when the typed part isn't
 * valid yet. Accepts either the typed part or a full link.
 * @param {string} platform
 * @param {unknown} raw
 * @returns {string}
 */
export function buildLinkUrl(platform, raw) {
  const p = LINK_PLATFORM_BY_KEY[platform];
  const suffix = cleanLinkSuffix(platform, raw);
  return p && suffix ? `${p.prefix}${suffix}` : "";
}

/**
 * Turns whatever was typed into a safe http(s) URL, or null. Adds https://
 * when the scheme is missing. Anything else (javascript:, data:, ...) is
 * rejected, since these become real href values on the public page.
 * @param {unknown} v
 * @returns {string | null}
 */
export function normalizeLinkUrl(v) {
  const s = String(v ?? "").trim();
  if (!s || s.length > 300) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Editor version: keeps rows whose link is still blank or half typed (saved
 * as an empty url), so adding an icon and typing the link later works. Every
 * url is rebuilt from the platform's fixed prefix, so nothing else can get
 * through, even if the database is written to directly. Drops unknown
 * platforms and duplicates.
 * @param {unknown} raw
 * @returns {{ iconColor: string, hoverColor: string, items: { platform: string, url: string }[] }}
 */
export function sanitizeLinks(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const seen = new Set();
  const items = [];
  if (Array.isArray(o.items)) {
    for (const it of o.items) {
      if (!it || typeof it !== "object") continue;
      const platform = String(it.platform ?? "");
      if (!LINK_PLATFORM_BY_KEY[platform] || seen.has(platform)) continue;
      seen.add(platform);
      items.push({ platform, url: buildLinkUrl(platform, it.url) });
    }
  }
  return {
    iconColor: isHex(o.iconColor) ? o.iconColor : LINK_DEFAULTS.iconColor,
    hoverColor: isHex(o.hoverColor) ? o.hoverColor : LINK_DEFAULTS.hoverColor,
    items,
  };
}

/**
 * Public version: only links with a valid URL, each with its label and icon
 * attached, ready to render.
 * @param {unknown} raw
 * @returns {{ iconColor: string, hoverColor: string, items: { platform: string, label: string, icon: string, url: string }[] }}
 */
export function resolveLinks(raw) {
  const clean = sanitizeLinks(raw);
  const items = [];
  for (const it of clean.items) {
    const url = normalizeLinkUrl(it.url);
    if (!url) continue;
    const p = LINK_PLATFORM_BY_KEY[it.platform];
    items.push({ platform: it.platform, label: p.label, icon: p.icon, url });
  }
  return { iconColor: clean.iconColor, hoverColor: clean.hoverColor, items };
}