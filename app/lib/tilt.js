// 3D card tilt settings. Same pattern as avatar shape / widgets: these
// columns are read and written on their own (never batched with the card
// columns), so the migration not being run yet can't break the card
// settings or 404 a profile, it just means the defaults below apply.

export const TILT_COLUMNS = "tilt_enabled, tilt_intensity, tilt_reverse";

export const TILT_DEFAULTS = {
  tilt_enabled: true,
  tilt_intensity: 50, // 0-100, how reactive the card is
  tilt_reverse: false, // false = edge under the cursor pushes away, true = comes toward it
};

export function withTiltDefaults(row) {
  const out = { ...TILT_DEFAULTS };
  if (!row) return out;
  if (typeof row.tilt_enabled === "boolean") out.tilt_enabled = row.tilt_enabled;
  if (typeof row.tilt_reverse === "boolean") out.tilt_reverse = row.tilt_reverse;
  const n = Number(row.tilt_intensity);
  if (row.tilt_intensity !== null && row.tilt_intensity !== undefined && Number.isFinite(n)) {
    out.tilt_intensity = Math.min(Math.max(n, 0), 100);
  }
  return out;
}
