// Single source of truth for badge metadata. Icons live at
// /public/badges/<key>.png — rename the paths below if your files end up
// named differently. Used by the dashboard Badges page and the public
// profile card, so both always agree on label/icon for a given key.
export const BADGE_CATALOG = [
  { key: "owner", label: "Owner", icon: "/badges/owner.png" },
  { key: "staff", label: "Staff", icon: "/badges/staff.png" },
  { key: "partner", label: "Partner", icon: "/badges/partner.png" },
  { key: "bug-hunter", label: "Bug Hunter", icon: "/badges/bug-hunter.png" },
  { key: "verified", label: "Verified", icon: "/badges/verified.png" },
  { key: "developer", label: "Developer", icon: "/badges/developer.png" },
];

export function getBadgeMeta(key) {
  return BADGE_CATALOG.find((b) => b.key === key) ?? null;
}
