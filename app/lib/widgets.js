// Shared by the dashboard Widgets tab and the public profile page, so both
// agree on what a saved widget looks like. Lives in its own column and is
// queried on its own (see [handle]/page.tsx), so a missing column (migration
// not run yet) can never break a profile.

export const WIDGETS_COLUMN = "widgets";
export const MAX_WIDGETS = 8;

// Discord user IDs are 17-20 digit numbers.
export const isDiscordId = (v) => /^\d{17,20}$/.test(String(v ?? "").trim());

// platform key -> account id validator. Add new widget types here too.
const VALIDATORS = {
  "discord-presence": isDiscordId,
};

/**
 * Clean whatever came out of the database into a safe, ordered list.
 * Drops anything malformed or unknown instead of throwing.
 * @param {unknown} raw
 * @returns {{ id: string, platform: string, accountId: string }[]}
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

    out.push({ id, platform, accountId });
    if (out.length >= MAX_WIDGETS) break;
  }
  return out;
}

export function newWidgetId() {
  return `w_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
