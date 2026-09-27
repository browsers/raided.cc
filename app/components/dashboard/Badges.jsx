"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { BADGE_CATALOG } from "../../lib/badgeCatalog";
import TopBar from "./TopBar";
import Card from "./Card";
import "./Badges.css";


// Badges are granted by SQL only — see the migration for the
// profile_badges table. There is no self-serve "earn a badge" flow, and
// nothing in this file ever inserts a row into that table. All a user can
// do here is toggle visibility (enabled) on a badge they've already been
// given.

// Small status label reused next to the color field, matching the
// save-state hint pattern already used over in Identity.jsx.
function SaveHint({ status }) {
  if (status === "saving") {
    return <span className="dash-badge-color-hint dash-badge-color-hint--saving">Saving…</span>;
  }
  if (status === "error") {
    return <span className="dash-badge-color-hint dash-badge-color-hint--error">Couldn't save</span>;
  }
  return null;
}

// Renders a badge's icon. With no override, it's just the artwork as
// exported (which is why "Verified" is blue, "Bug Hunter" is green,
// etc). Once a badge_color override is set, every badge is redrawn as
// a flat silhouette in that one color instead — done by using the PNG
// purely as an alpha mask over a solid background-color, which is also
// why any inner shading (e.g. the checkmark cutout on "Verified") is
// lost in tinted mode.
function BadgeGlyph({ src, color }) {
  if (!color) return <img src={src} alt="" />;
  return (
    <span
      className="dash-badge-glyph--tinted"
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
    />
  );
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default function Badges() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [earnedKeys, setEarnedKeys] = useState(() => new Set());
  const [enabledKeys, setEnabledKeys] = useState(() => new Set());
  const [animated, setAnimated] = useState(false);
  const [badgeColor, setBadgeColor] = useState(null);
  const [colorStatus, setColorStatus] = useState("idle");

  // Load whatever's actually been granted to this profile on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (cancelled) return;
      setUserId(user.id);

      const [{ data: rows }, { data: profile }] = await Promise.all([
        supabase
          .from("profile_badges")
          .select("badge_key, enabled")
          .eq("profile_id", user.id),
        supabase
          .from("profiles")
          .select("badges_animated, badge_color")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (rows) {
        setEarnedKeys(new Set(rows.map((r) => r.badge_key)));
        setEnabledKeys(new Set(rows.filter((r) => r.enabled).map((r) => r.badge_key)));
      }
      if (profile) {
        setAnimated(Boolean(profile.badges_animated));
        setBadgeColor(profile.badge_color ?? null);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleAnimated() {
    if (!userId) return;
    const next = !animated;
    setAnimated(next);
    const { error } = await supabase
      .from("profiles")
      .update({ badges_animated: next })
      .eq("id", userId);
    if (error) setAnimated(!next); // revert on failure
  }

  async function toggleEnabled(key) {
    if (!userId) return;

    const wasEnabled = enabledKeys.has(key);
    const nextEnabled = !wasEnabled;

    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (nextEnabled) next.add(key);
      else next.delete(key);
      return next;
    });

    const { error } = await supabase
      .from("profile_badges")
      .update({ enabled: nextEnabled })
      .eq("profile_id", userId)
      .eq("badge_key", key);

    if (error) {
      // Revert on failure.
      setEnabledKeys((prev) => {
        const next = new Set(prev);
        if (wasEnabled) next.add(key);
        else next.delete(key);
        return next;
      });
    }
  }

  // --- Badge color (recolor every badge at once) ------------------------
  async function saveBadgeColor(value) {
    if (!userId) return;
    setColorStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ badge_color: value })
      .eq("id", userId);
    setColorStatus(error ? "error" : "idle");
  }

  function handleBadgeColorChange(value) {
    setBadgeColor(value);
    saveBadgeColor(value);
  }

  function handleBadgeColorHexInput(value) {
    // Let them type freely; only push a save once it's a real hex color.
    setBadgeColor(value);
    if (HEX_RE.test(value)) saveBadgeColor(value);
  }

  function handleResetBadgeColor() {
    setBadgeColor(null);
    saveBadgeColor(null);
  }

  const earnedBadges = BADGE_CATALOG.filter((b) => earnedKeys.has(b.key));

  return (
    <div className="dash-badges-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Badges" />

      <div className="dash-badges-body">
        <Card className="dash-badges-section">
          <div className="dash-card__eyebrow">MY BADGES</div>
          <h3 className="dash-profile-section__title">Enabled On Profile</h3>

          <div className="dash-badge-row dash-badge-row--setting">
            <div className="dash-badge-row__meta">
              <span className="dash-badge-row__label">Animated Badges</span>
              <span className="dash-badge-row__status">
                Badges scroll in a smooth loop instead of sitting still
              </span>
            </div>
            <button
              type="button"
              className={`dash-badge-switch${animated ? " dash-badge-switch--on" : ""}`}
              role="switch"
              aria-checked={animated}
              aria-label="Toggle animated badges"
              onClick={toggleAnimated}
            >
              <span className="dash-badge-switch__knob" />
            </button>
          </div>

          {!loading && earnedBadges.length === 0 ? (
            <p className="dash-badges-empty">
              No badges granted to your account yet.
            </p>
          ) : (
            <div className="dash-badges-grid">
              {earnedBadges.map((badge) => {
                const enabled = enabledKeys.has(badge.key);
                return (
                  <div key={badge.key} className="dash-badge-row">
                    <span className="dash-badge-row__icon">
                      <BadgeGlyph src={badge.icon} color={badgeColor} />
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
                    <BadgeGlyph src={badge.icon} color={badgeColor} />
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

        <Card className="dash-badges-section">
          <div className="dash-card__eyebrow">CUSTOMIZE</div>
          <h3 className="dash-profile-section__title">
            Badge Color <SaveHint status={colorStatus} />
          </h3>
          <p className="dash-badges-color-desc">
            Pick one color and every badge — enabled or not, here and on your
            profile — is recolored to match. Reset to bring back each
            badge's original artwork.
          </p>

          <div className="dash-badge-color-row">
            <div className="dash-badge-color-field">
              <label
                className="dash-badge-color-swatch"
                style={{ background: badgeColor || "#3a3a3a" }}
              >
                <input
                  type="color"
                  hidden
                  value={/^#([0-9a-fA-F]{6})$/.test(badgeColor || "") ? badgeColor : "#00e5ff"}
                  disabled={!userId}
                  onChange={(e) => handleBadgeColorChange(e.target.value)}
                />
              </label>
              <input
                type="text"
                className="dash-badge-color-input"
                placeholder="No override — original colors"
                value={badgeColor ?? ""}
                disabled={!userId}
                onChange={(e) => handleBadgeColorHexInput(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="dash-badge-color-reset"
              disabled={!userId || !badgeColor}
              onClick={handleResetBadgeColor}
            >
              Reset to default
            </button>
          </div>

          <div className="dash-badge-color-preview">
            {BADGE_CATALOG.map((badge) => (
              <span key={badge.key} className="dash-badge-color-preview__icon">
                <BadgeGlyph src={badge.icon} color={badgeColor} />
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}