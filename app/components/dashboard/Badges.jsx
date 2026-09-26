"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import Card from "./Card";
import "./Badges.css";

// Badge catalog. Icons live at /public/badges/<key>.png — rename the paths
// below if your files end up named differently.
const BADGE_CATALOG = [
  { key: "owner", label: "Owner", icon: "/badges/owner.png" },
  { key: "staff", label: "Staff", icon: "/badges/staff.png" },
  { key: "partner", label: "Partner", icon: "/badges/partner.png" },
  { key: "bug-hunter", label: "Bug Hunter", icon: "/badges/bug-hunter.png" },
  { key: "verified", label: "Verified", icon: "/badges/verified.png" },
  { key: "ims", label: "IMS", icon: "/badges/ims.png" },
];

// TODO: none of this is wired to Supabase yet — there's no table tracking
// which badges a profile has earned or which are toggled visible. Everything
// here is local state so the page works end-to-end to build against; swap
// in a real fetch/save (e.g. a profile_badges table) once that exists.
export default function Badges() {
  // Stand-in for "earned" badges until real data exists — treating the
  // whole catalog as earned for now.
  const [earnedKeys] = useState(() => new Set(BADGE_CATALOG.map((b) => b.key)));
  const [enabledKeys, setEnabledKeys] = useState(
    () => new Set(BADGE_CATALOG.map((b) => b.key))
  );

  function toggleEnabled(key) {
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const earnedBadges = BADGE_CATALOG.filter((b) => earnedKeys.has(b.key));

  return (
    <div className="dash-badges-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Badges" />

      <div className="dash-badges-body">
        <Card className="dash-badges-section">
          <div className="dash-card__eyebrow">MY BADGES</div>
          <h3 className="dash-profile-section__title">Enabled On Profile</h3>

          {earnedBadges.length > 0 ? (
            <div className="dash-badges-grid">
              {earnedBadges.map((badge) => {
                const enabled = enabledKeys.has(badge.key);
                return (
                  <div key={badge.key} className="dash-badge-row">
                    <span className="dash-badge-row__icon">
                      <img src={badge.icon} alt="" />
                    </span>
                    <div className="dash-badge-row__meta">
                      <span className="dash-badge-row__label">{badge.label}</span>
                      <span className="dash-badge-row__status">
                        {enabled ? "Visible on profile" : "Hidden from profile"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`dash-badge-switch${enabled ? " dash-badge-switch--on" : ""}`}
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`Toggle ${badge.label} visibility`}
                      onClick={() => toggleEnabled(badge.key)}
                    >
                      <span className="dash-badge-switch__knob" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="dash-badges-empty">
              You haven't earned any badges yet — browse the catalog below.
            </p>
          )}
        </Card>

        <Card className="dash-badges-section">
          <div className="dash-card__eyebrow">BROWSE ALL</div>
          <h3 className="dash-profile-section__title">Badge Catalog</h3>

          <div className="dash-badges-catalog">
            {BADGE_CATALOG.map((badge) => {
              const earned = earnedKeys.has(badge.key);
              return (
                <div
                  key={badge.key}
                  className={`dash-badge-tile${earned ? " dash-badge-tile--earned" : ""}`}
                >
                  <span className="dash-badge-tile__icon">
                    <img src={badge.icon} alt="" />
                  </span>
                  <span className="dash-badge-tile__label">{badge.label}</span>
                  <span className="dash-badge-tile__status">
                    {earned ? "Earned" : "Locked"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
