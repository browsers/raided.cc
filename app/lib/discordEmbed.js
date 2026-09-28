// Pure helpers for Discord "component embeds" — the newer link-preview
// format that lets a page swap the plain Open Graph card for a layout made
// of Discord components (text, thumbnail/gallery, and real link buttons).
//
// No server-only imports in here on purpose: the dashboard imports this to
// draw its live preview + byte meter, and the server imports the exact same
// code to build the payload Discord actually fetches, so what you see in
// the editor is what Discord gets.
//
// How Discord reads it (docs are still an open PR at the time of writing:
// github.com/discord/discord-api-docs/pull/8606 — subject to change):
//   - the page's <head> points at a JSON payload: `discord:component-embed`
//   - payload is { component: <Container> }, Container type 17
//   - every link button must be style 5 (link) with a label + https url
//   - limits: <= 40 components, <= 3000 bytes of JSON (escapes count),
//     media items only take { url }, urls <= 2048 chars
//   - Open Graph tags stay on the page as the fallback when a payload is
//     rejected (too big, invalid, etc.)

export const EMBED_LIMITS = {
  maxBytes: 3000,
  maxButtons: 5, // one ActionRow holds 5 buttons — keeps the card to a single row
  maxLabel: 80, // Discord's button label limit
  maxUrl: 2048,
  maxTitle: 120,
  maxDescription: 1500,
};

export const DEFAULT_ACCENT = "#2b2d31";

const encoder = new TextEncoder();
const byteLength = (s) => encoder.encode(s).length;

// "#abc" / "abc" / "#aabbcc" -> "#aabbcc" (lowercase). null if not a hex color.
export function normalizeHex(value) {
  if (typeof value !== "string") return null;
  let v = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split("").map((c) => c + c).join("");
  return /^[0-9a-fA-F]{6}$/.test(v) ? `#${v.toLowerCase()}` : null;
}

// Accepts "https://x.y/z" or a bare "x.y/z" (https:// gets added). Anything
// that isn't http(s) — javascript:, data:, discord://, etc. — is rejected.
export function normalizeUrl(value) {
  if (typeof value !== "string") return null;
  let v = value.trim();
  if (!v) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    const href = u.toString();
    return href.length <= EMBED_LIMITS.maxUrl ? href : null;
  } catch {
    return null;
  }
}

// Drops anything Discord would reject (blank label, bad url) and caps the count.
export function sanitizeButtons(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const b of list) {
    const label = typeof b?.label === "string" ? b.label.trim().slice(0, EMBED_LIMITS.maxLabel) : "";
    const url = normalizeUrl(b?.url);
    if (label && url) out.push({ label, url });
    if (out.length >= EMBED_LIMITS.maxButtons) break;
  }
  return out;
}

/**
 * Turns a profiles row (+ a bit of profile identity) into resolved embed
 * settings with defaults filled in.
 *
 * `embed_buttons` distinguishes "never configured" (null -> one default
 * "Open page" button so a fresh embed isn't bare) from "configured, and
 * the owner removed them all" ([] -> no buttons).
 */
export function resolveEmbed(row, { handle, displayName }, origin) {
  const pageUrl = `${origin}/${handle}`;
  const title = (row?.embed_title ?? "").trim() || displayName || handle;

  return {
    title: title.slice(0, EMBED_LIMITS.maxTitle),
    description: (row?.embed_description ?? "").slice(0, EMBED_LIMITS.maxDescription),
    accent: normalizeHex(row?.embed_accent) ?? DEFAULT_ACCENT,
    layout: row?.embed_image_layout === "small" ? "small" : "large",
    imageUrl: normalizeUrl(row?.embed_image_url),
    buttons: Array.isArray(row?.embed_buttons)
      ? sanitizeButtons(row.embed_buttons)
      : [{ label: "Open page", url: pageUrl }],
    pageUrl,
  };
}

function assemble({ title, description, accent, layout, imageUrl, buttons }) {
  const heading = `## ${title.replace(/\s*\n\s*/g, " ").trim() || "Untitled"}`;
  const text = { type: 10, content: description ? `${heading}\n${description}` : heading };

  const components = [];

  if (imageUrl && layout === "small") {
    // Small = thumbnail tucked beside the text (a Section with a Thumbnail accessory).
    components.push({
      type: 9,
      components: [text],
      accessory: { type: 11, media: { url: imageUrl } },
    });
  } else {
    components.push(text);
  }

  if (imageUrl && layout === "large") {
    components.push({ type: 12, items: [{ media: { url: imageUrl } }] });
  }

  if (buttons.length) {
    components.push({ type: 14, divider: true, spacing: 1 });
    components.push({
      type: 1,
      components: buttons.map((b) => ({ type: 2, style: 5, label: b.label, url: b.url })),
    });
  }

  return {
    component: {
      type: 17,
      accent_color: parseInt((normalizeHex(accent) ?? DEFAULT_ACCENT).slice(1), 16),
      components,
    },
  };
}

/**
 * Builds the payload Discord fetches. If it would blow the 3000-byte cap
 * (Discord then silently falls back to plain Open Graph), the description
 * is trimmed until it fits.
 *
 * @returns {{ payload: object, bytes: number, trimmed: boolean, overLimit: boolean }}
 */
export function buildComponentEmbed(settings) {
  const size = (p) => byteLength(JSON.stringify(p));

  let description = settings.description ?? "";
  let payload = assemble({ ...settings, description });
  let bytes = size(payload);
  let trimmed = false;

  while (bytes > EMBED_LIMITS.maxBytes && description.length > 0) {
    trimmed = true;
    const chars = Array.from(description);
    const over = bytes - EMBED_LIMITS.maxBytes;
    // Cut a little more than the overshoot (multi-byte chars, plus room for the ellipsis).
    const cut = Math.max(1, Math.ceil(over / 2) + 3);
    description = chars.length > cut ? `${chars.slice(0, chars.length - cut).join("").trimEnd()}…` : "";
    payload = assemble({ ...settings, description });
    bytes = size(payload);
  }

  return { payload, bytes, trimmed, overLimit: bytes > EMBED_LIMITS.maxBytes };
}
