// Turns the saved Appearance settings into an inline style for the profile
// card. Used by the public page (ProfileCard) so what you set in the
// dashboard is exactly what visitors see.

export const CARD_DEFAULTS = {
  appearance_layout: "minimal", // "minimal" | "card"
  card_bg_mode: "gradient", // "solid" | "gradient"
  card_start_color: "#151515",
  card_end_color: "#151515",
  card_angle: 0,
  card_blur: 0,
  card_opacity: 5,
  card_border: 2,
  card_border_color: "#ffffff",
  card_shadow: 12,
  card_shadow_color: "#000000",
  card_corner: 0,
};

export const CARD_COLUMNS = Object.keys(CARD_DEFAULTS).join(", ");

export function isHex(v) {
  return typeof v === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

function hexToRgba(hex, alpha) {
  let h = isHex(hex) ? hex.slice(1) : "151515";
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function num(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// Fill in anything missing/null so old profiles (or a migration that
// hasn't run yet) fall back to the defaults instead of breaking.
export function withCardDefaults(row) {
  const out = { ...CARD_DEFAULTS };
  if (row) {
    for (const key of Object.keys(CARD_DEFAULTS)) {
      if (row[key] !== null && row[key] !== undefined) out[key] = row[key];
    }
  }
  return out;
}

export function isCardLayout(row) {
  return row?.appearance_layout === "card";
}

export function buildCardStyle(row) {
  const s = withCardDefaults(row);

  const alpha = num(s.card_opacity, 5, 0, 100) / 100;
  const start = hexToRgba(s.card_start_color, alpha);
  const end = hexToRgba(s.card_end_color, alpha);
  const angle = num(s.card_angle, 0, 0, 360);
  const blur = num(s.card_blur, 0, 0, 40);
  const border = num(s.card_border, 2, 0, 12);
  const shadow = num(s.card_shadow, 12, 0, 60);
  const radius = num(s.card_corner, 0, 0, 64);

  const style = {
    background:
      s.card_bg_mode === "solid" ? start : `linear-gradient(${angle}deg, ${start}, ${end})`,
    borderRadius: `${radius}px`,
    border: border > 0 ? `${border}px solid ${isHex(s.card_border_color) ? s.card_border_color : "#ffffff"}` : "none",
    boxShadow:
      shadow > 0
        ? `0 0 ${shadow}px ${isHex(s.card_shadow_color) ? s.card_shadow_color : "#000000"}`
        : "none",
  };

  if (blur > 0) {
    style.backdropFilter = `blur(${blur}px)`;
    style.WebkitBackdropFilter = `blur(${blur}px)`;
  }
  return style;
}
