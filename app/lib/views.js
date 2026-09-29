// Views counter placement + look. Same pattern as tilt / avatar shape: these
// columns are read and written on their own (never batched with the card
// columns), so the migration not being run yet can't break the card
// settings or 404 a profile, it just means the defaults below apply.

export const VIEWS_COLUMNS = "views_position, views_glass";

export const VIEWS_POSITIONS = [
  { value: "page-right", label: "Bottom right of page" }, // the original spot
  { value: "page-left", label: "Bottom left of page" },
  { value: "card-right", label: "Bottom right of card" },
  { value: "card-left", label: "Bottom left of card" },
];

export const VIEWS_DEFAULTS = {
  views_position: "page-right",
  views_glass: true, // the faint box + border around the counter
};

export function withViewsDefaults(row) {
  const out = { ...VIEWS_DEFAULTS };
  if (!row) return out;
  if (VIEWS_POSITIONS.some((o) => o.value === row.views_position)) {
    out.views_position = row.views_position;
  }
  if (typeof row.views_glass === "boolean") out.views_glass = row.views_glass;
  return out;
}
