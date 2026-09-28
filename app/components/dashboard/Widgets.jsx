"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import Card from "./Card";
import "./Profile.css";
import "./Appearance.css";
import "./Widgets.css";

// LAYOUT ONLY for now — everything here is local state. Nothing is saved
// or rendered on the public profile yet (that's the next pass).
// Discord Presence is the only widget for now; more get added later.

const POSITIONS = [
  { value: "below", label: "Below links" },
  { value: "above", label: "Above links" },
  { value: "bottom", label: "Bottom of card" },
];

const WIDGET_STYLES = [
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
  { value: "flat", label: "Flat (no container)" },
];

// Preview only — lets you see how each status dot looks.
const STATUSES = [
  { value: "online", label: "Online" },
  { value: "idle", label: "Idle" },
  { value: "dnd", label: "DND" },
  { value: "offline", label: "Offline" },
];

function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`wg-switch${on ? " wg-switch--on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <span className="wg-switch__knob" />
    </button>
  );
}

function OptionRow({ title, hint, children }) {
  return (
    <div className="wg-opt">
      <div className="wg-opt__text">
        <div className="wg-opt__title">{title}</div>
        {hint ? <div className="wg-opt__hint">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

// Fake Discord presence, driven by the settings on the right.
function PresencePreview({ status, showDot, showActivity, showCustom, compact, styleKey, showLabel }) {
  return (
    <div className="wg-stage">
      {showLabel ? <div className="wg-pv__label">Discord</div> : null}
      <div
        className={`wg-pv wg-pv--${styleKey}${compact ? " wg-pv--compact" : ""}`}
      >
        <div className="wg-pv__main">
          <div className="wg-pv__avatar">
            {showDot ? <span className={`wg-dot wg-dot--${status}`} /> : null}
          </div>
          <div className="wg-pv__who">
            <div className="wg-pv__name">die</div>
            {showCustom ? <div className="wg-pv__custom">your custom status</div> : null}
          </div>
        </div>

        {showActivity && status !== "offline" ? (
          <div className="wg-pv__activity">
            <span className="wg-pv__art" />
            <div className="wg-pv__atext">
              <div className="wg-pv__akind">Playing</div>
              <div className="wg-pv__aname">Sample game</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Widgets() {
  const [enabled, setEnabled] = useState(true);

  const [position, setPosition] = useState("below");
  const [widgetStyle, setWidgetStyle] = useState("glass");
  const [showDot, setShowDot] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [showCustom, setShowCustom] = useState(true);
  const [showLabel, setShowLabel] = useState(false);
  const [compact, setCompact] = useState(false);

  const [previewStatus, setPreviewStatus] = useState("online");

  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Widgets" />

      <div className="dash-profile-body">
        <Card className="dash-profile-section">
          <div className="wg-head">
            <span className="wg-head__icon">
              <img src="/icons/discord.png" alt="" />
            </span>
            <div className="wg-head__text">
              <h3 className="wg-head__title">Discord Presence</h3>
              <div className="wg-head__sub">
                Show your live status and what you're playing on your profile.
              </div>
            </div>
            <Switch on={enabled} onChange={setEnabled} label="Enable Discord Presence" />
          </div>

          <div className={`wg-body${enabled ? "" : " wg-body--off"}`}>
            <div className="wg-col">
              <div className="wg-col__head">
                <span className="wg-col__label">Preview</span>
                <div className="ap-seg">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`ap-seg__btn${previewStatus === s.value ? " ap-seg__btn--active" : ""}`}
                      onClick={() => setPreviewStatus(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <PresencePreview
                status={previewStatus}
                showDot={showDot}
                showActivity={showActivity}
                showCustom={showCustom}
                compact={compact}
                styleKey={widgetStyle}
                showLabel={showLabel}
              />
              <div className="wg-note">
                Sample data. Your real presence needs your Discord User ID set in the Profile tab.
              </div>
            </div>

            <div className="wg-col">
              <div className="wg-col__head">
                <span className="wg-col__label">Settings</span>
              </div>

              <div className="wg-selects">
                <label className="ap-field">
                  <span className="ap-field__label">Position</span>
                  <select
                    className="ap-select"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    {POSITIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ap-field">
                  <span className="ap-field__label">Style</span>
                  <select
                    className="ap-select"
                    value={widgetStyle}
                    onChange={(e) => setWidgetStyle(e.target.value)}
                  >
                    {WIDGET_STYLES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="wg-opts">
                <OptionRow title="Status dot" hint="Online, idle, DND or offline on your avatar">
                  <Switch on={showDot} onChange={setShowDot} label="Status dot" />
                </OptionRow>
                <OptionRow title="Activity" hint="The game or app you're currently using">
                  <Switch on={showActivity} onChange={setShowActivity} label="Activity" />
                </OptionRow>
                <OptionRow title="Custom status" hint="Your Discord custom status text">
                  <Switch on={showCustom} onChange={setShowCustom} label="Custom status" />
                </OptionRow>
                <OptionRow title="Label" hint="Small “Discord” title above the widget">
                  <Switch on={showLabel} onChange={setShowLabel} label="Label" />
                </OptionRow>
                <OptionRow title="Compact" hint="Tighter padding and spacing">
                  <Switch on={compact} onChange={setCompact} label="Compact" />
                </OptionRow>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}