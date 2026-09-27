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
export default function Badges() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [earnedKeys, setEarnedKeys] = useState(() => new Set());
  const [enabledKeys, setEnabledKeys] = useState(() => new Set());
  const [animated, setAnimated] = useState(false);

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
          .select("badges_animated")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (rows) {
        setEarnedKeys(new Set(rows.map((r) => r.badge_key)));
        setEnabledKeys(new Set(rows.filter((r) => r.enabled).map((r) => r.badge_key)));
      }
      if (profile) setAnimated(Boolean(profile.badges_animated));

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