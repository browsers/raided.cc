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
export const LINK_PLATFORMS = [
  { key: "discord", label: "Discord", icon: "/link/discord.png", placeholder: "https://discord.gg/invite" },
  { key: "x", label: "X", icon: "/link/x.png", placeholder: "https://x.com/username" },
  { key: "tiktok", label: "TikTok", icon: "/link/tiktik.png", placeholder: "https://tiktok.com/@username" },
];

export const LINK_PLATFORM_BY_KEY = Object.fromEntries(LINK_PLATFORMS.map((p) => [p.key, p]));

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
 * Editor version: keeps rows whose URL is still blank or half typed, so
 * adding an icon and typing the link later works. Drops unknown platforms
 * and duplicates.
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
      items.push({ platform, url: String(it.url ?? "").trim().slice(0, 300) });
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
