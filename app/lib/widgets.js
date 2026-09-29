// Shared by the dashboard Widgets tab and the public profile page, so both
// agree on what a saved widget looks like. Lives in its own column and is
// queried on its own (see [handle]/page.tsx), so a missing column (migration
// not run yet) can never break a profile.

import { isHex } from "./cardStyle";

export const WIDGETS_COLUMN = "widgets";
export const MAX_WIDGETS = 8;

// Discord user IDs are 17-20 digit numbers.
export const isDiscordId = (v) => /^\d{17,20}$/.test(String(v ?? "").trim());

// X (Twitter) usernames: letters, digits, underscore, 1-15 chars. Case
// doesn't matter to X, but the profile lookup (lib/twitter.js) lowercases
// before comparing either way.
export const isTwitterHandle = (v) => /^\w{1,15}$/.test(String(v ?? "").trim());

// Current-time widget: the "account" is an IANA timezone name, e.g.
// "Europe/London". Intl throws a RangeError for anything it doesn't know.
export const isTimezone = (v) => {
  const s = String(v ?? "").trim();
  if (!s || s.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: s });
    return true;
  } catch {
    return false;
  }
};

// platform key -> account id validator. Add new widget types here too.
const VALIDATORS = {
  "discord-presence": isDiscordId,
  "current-time": isTimezone,
  twitter: isTwitterHandle,
};

// Per-widget settings for the current-time widget (stored on the widget as
// `options`). Everything is optional; missing values fall back to these.
// Digit size, biggest first. "large" is the original look, so clocks saved
// before size/layout existed render exactly as they did.
export const CLOCK_SIZES = [
  { value: "large", label: "Large" },
  { value: "medium", label: "Medium" },
  { value: "small", label: "Small" },
];

// "minimal" is the original stacked look. Add new layouts here, then style
// them in [handle]/TimeWidget.css (.twg--layout-<value>).
export const CLOCK_LAYOUTS = [
  { value: "minimal", label: "Minimal" },
  { value: "flip", label: "Flip" },
  { value: "terminal", label: "Terminal" },
];

const pick = (list, v, fallback) => (list.some((x) => x.value === v) ? v : fallback);

export const CLOCK_OPTION_DEFAULTS = {
  hour12: false, // false = 24h, true = 12h with AM/PM
  seconds: true, // show :SS
  date: true, // show the date line under the time
  label: "", // custom name for the place (blank = derived from the timezone)
  size: "large", // see CLOCK_SIZES
  layout: "minimal", // see CLOCK_LAYOUTS
};

/**
 * @param {unknown} raw
 * @returns {{ hour12: boolean, seconds: boolean, date: boolean, label: string, size: string, layout: string }}
 */
export function sanitizeClockOptions(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const d = CLOCK_OPTION_DEFAULTS;
  return {
    hour12: typeof o.hour12 === "boolean" ? o.hour12 : d.hour12,
    seconds: typeof o.seconds === "boolean" ? o.seconds : d.seconds,
    date: typeof o.date === "boolean" ? o.date : d.date,
    label: typeof o.label === "string" ? o.label.trim().slice(0, 32) : d.label,
    size: pick(CLOCK_SIZES, o.size, d.size),
    layout: pick(CLOCK_LAYOUTS, o.layout, d.layout),
  };
}

/**
 * Clean whatever came out of the database into a safe, ordered list.
 * Drops anything malformed or unknown instead of throwing.
 * @param {unknown} raw
 * Each widget can carry its own `style` (see sanitizeWidgetStyle below); null
 * means "no look of its own", so the profile falls back to the shared style.
 * `options` only exists on current-time widgets (see sanitizeClockOptions).
 * @returns {{ id: string, platform: string, accountId: string, style: object | null, options: object | null }[]}
 */
export function sanitizeWidgets(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const platform = String(item.platform ?? "");
    const accountId = String(item.accountId ?? "").trim();
    const validate = VALIDATORS[platform];
    if (!validate || !validate(accountId)) continue;

    let id = String(item.id ?? "").slice(0, 40);
    if (!id || seen.has(id)) id = `w_${out.length}_${accountId.slice(-4)}`;
    seen.add(id);

    out.push({
      id,
      platform,
      accountId,
      style: sanitizeWidgetStyle(item.style),
      options: platform === "current-time" ? sanitizeClockOptions(item.options) : null,
    });
    if (out.length >= MAX_WIDGETS) break;
  }
  return out;
}

export function newWidgetId() {
  return `w_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}


// ---------------------------------------------------------------------------
// Widget style: one look shared by every widget on a profile (opacity,
// border, shadow, ...). Lives in its own jsonb column and is queried on its
// own, same as the widgets list, so a missing column can never break a
// profile. `null` (nothing saved) means "use the stock look from the CSS".
// ---------------------------------------------------------------------------

export const WIDGET_STYLE_COLUMN = "widget_style";

export const WIDGET_STYLE_DEFAULTS = {
  bg_color: "#ffffff",
  opacity: 5, // % — background fill strength
  blur: 0, // px — backdrop blur
  border: 1, // px
  border_color: "#2a2a2a",
  shadow: 0, // px
  shadow_color: "#000000",
  corner: null, // px, or null = follow the profile card's corner radius
  hover_effect: true, // mouse-tracking tilt + glow on hover, like the badges
  hover_reactivity: 3, // 1 (subtle) - 5 (strong), see [handle]/useWidgetHover.js
};

const clampNum = (v, fallback, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

function hexToRgba(hex, alpha) {
  let h = isHex(hex) ? hex.slice(1) : "ffffff";
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Clean whatever came out of the database into a full, safe style object.
 * Returns null when nothing usable was saved (=> stock look).
 * @param {unknown} raw
 */
export function sanitizeWidgetStyle(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = WIDGET_STYLE_DEFAULTS;
  return {
    bg_color: isHex(raw.bg_color) ? raw.bg_color : d.bg_color,
    opacity: clampNum(raw.opacity, d.opacity, 0, 100),
    blur: clampNum(raw.blur, d.blur, 0, 40),
    border: clampNum(raw.border, d.border, 0, 12),
    border_color: isHex(raw.border_color) ? raw.border_color : d.border_color,
    shadow: clampNum(raw.shadow, d.shadow, 0, 60),
    shadow_color: isHex(raw.shadow_color) ? raw.shadow_color : d.shadow_color,
    corner:
      raw.corner === null || raw.corner === undefined
        ? null
        : clampNum(raw.corner, 12, 0, 40),
    hover_effect: typeof raw.hover_effect === "boolean" ? raw.hover_effect : d.hover_effect,
    hover_reactivity: Math.round(clampNum(raw.hover_reactivity, d.hover_reactivity, 1, 5)),
  };
}

/**
 * Inline style for a widget box. Returns undefined for "no saved style" so
 * the CSS defaults apply untouched.
 * @param {ReturnType<typeof sanitizeWidgetStyle>} style
 */
// Hover pop strength by reactivity (1-5) — same idea as the badges'
// scale(1.05) on hover, just a little bigger since the widget is bigger.
// No mouse tracking, no tilt: these only ever apply on CSS :hover.
const HOVER_SCALE = { 1: 1.015, 2: 1.025, 3: 1.035, 4: 1.05, 5: 1.07 };
const HOVER_GLOW = { 1: 0.12, 2: 0.18, 3: 0.25, 4: 0.32, 5: 0.4 };

export function buildWidgetStyle(style) {
  if (!style) return undefined;
  const out = {
    background: hexToRgba(style.bg_color, style.opacity / 100),
    border: style.border > 0 ? `${style.border}px solid ${style.border_color}` : "none",
    boxShadow: style.shadow > 0 ? `0 0 ${style.shadow}px ${style.shadow_color}` : "none",
    "--dpw-hover-scale": style.hover_effect ? HOVER_SCALE[style.hover_reactivity] ?? HOVER_SCALE[3] : 1,
    "--dpw-hover-glow": style.hover_effect ? HOVER_GLOW[style.hover_reactivity] ?? HOVER_GLOW[3] : 0,
  };
  if (style.blur > 0) {
    out.backdropFilter = `blur(${style.blur}px)`;
    out.WebkitBackdropFilter = `blur(${style.blur}px)`;
  }
  if (style.corner !== null) out.borderRadius = `${style.corner}px`;
  return out;
}