"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import Card from "./Card";
import "./Profile.css";
import "./Appearance.css";
import "./Widgets.css";

// LAYOUT ONLY for now — everything here is local state. Nothing is saved
// or rendered on the public profile yet (that's the next pass).

// Each icon is just the inner SVG paths (24x24, stroked) so the catalog
// stays compact and matches the stroke style in icons.jsx.
const WIDGET_CATALOG = [
  {
    id: "discord",
    name: "Discord Presence",
    hint: "Live status, activity and custom status",
    icon: (
      <>
        <path d="M7 6.5c1.6-.8 3.3-1.2 5-1.2s3.4.4 5 1.2c1.7 2.6 2.5 5.3 2.7 8.2-1.2 1-2.6 1.6-4 2l-.9-1.5c.5-.2 1-.4 1.4-.7-2.4 1-5 1-7.4 0 .4.3.9.5 1.4.7L8.3 16.7c-1.4-.4-2.8-1-4-2C4.5 11.8 5.3 9.1 7 6.5Z" />
        <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: "spotify",
    name: "Now Playing",
    hint: "What you're listening to right now",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M7.5 9.5c3-.9 6.5-.6 9 .8" />
        <path d="M8 12.5c2.5-.7 5.2-.4 7.5.8" />
        <path d="M8.5 15.3c2-.5 4-.3 5.8.6" />
      </>
    ),
  },
  {
    id: "views",
    name: "View Counter",
    hint: "Total profile views, live",
    icon: (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
  },
  {
    id: "clock",
    name: "Local Time",
    hint: "Your current time and timezone",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    id: "weather",
    name: "Weather",
    hint: "Current conditions for your city",
    icon: (
      <>
        <path d="M7 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 8.5a4.8 4.8 0 0 1 .5 9.5Z" />
      </>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    hint: "Recent repos and contribution activity",
    icon: (
      <>
        <path d="M8.5 19c-4 1.2-4-2-5.5-2.5M14.5 21v-3.2c0-1 .1-1.4-.5-2 2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6.2 0C6.1 3.1 5.1 3.4 5.1 3.4a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.7 9.8c0 4.7 2.8 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
      </>
    ),
  },
  {
    id: "location",
    name: "Location",
    hint: "City or region pin",
    icon: (
      <>
        <path d="M12 21s7-5.8 7-11.5a7 7 0 0 0-14 0C5 15.2 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  },
  {
    id: "text",
    name: "Custom Text",
    hint: "A quote, status or short note",
    icon: (
      <>
        <path d="M5 6h14" />
        <path d="M5 12h14" />
        <path d="M5 18h9" />
      </>
    ),
  },
];

const BY_ID = Object.fromEntries(WIDGET_CATALOG.map((w) => [w.id, w]));

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

function WidgetIcon({ id, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {BY_ID[id].icon}
    </svg>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`wg-switch${on ? " wg-switch--on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <span className="wg-switch__knob" />
    </button>
  );
}

const Chevron = ({ up }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

export default function Widgets() {
  // Ordered list of enabled widget ids — order = order on the profile.
  const [active, setActive] = useState(["discord", "views", "clock"]);

  // Display settings
  const [position, setPosition] = useState("below");
  const [arrange, setArrange] = useState("stack"); // "stack" | "grid"
  const [widgetStyle, setWidgetStyle] = useState("glass");
  const [showLabels, setShowLabels] = useState(true);
  const [compact, setCompact] = useState(false);

  const toggle = (id) =>
    setActive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const move = (id, dir) =>
    setActive((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Widgets" />

      <div className="dash-profile-body">
        <Card className="dash-profile-section">
          <div className="dash-card__eyebrow">
            ACTIVE
            <span className="wg-count">
              {active.length} / {WIDGET_CATALOG.length}
            </span>
          </div>
          <h3 className="dash-profile-section__title">Your Widgets</h3>

          {active.length === 0 ? (
            <div className="wg-empty">
              <strong>No widgets yet</strong>
              <span>Turn one on from the library below and it will show up here.</span>
            </div>
          ) : (
            <ul className="wg-active">
              {active.map((id, i) => (
                <li key={id} className="wg-row">
                  <span className="wg-row__icon">
                    <WidgetIcon id={id} />
                  </span>
                  <div className="wg-row__text">
                    <div className="wg-row__name">{BY_ID[id].name}</div>
                    <div className="wg-row__hint">{BY_ID[id].hint}</div>
                  </div>
                  <div className="wg-row__actions">
                    <button
                      type="button"
                      className="wg-iconbtn"
                      aria-label={`Move ${BY_ID[id].name} up`}
                      disabled={i === 0}
                      onClick={() => move(id, -1)}
                    >
                      <Chevron up />
                    </button>
                    <button
                      type="button"
                      className="wg-iconbtn"
                      aria-label={`Move ${BY_ID[id].name} down`}
                      disabled={i === active.length - 1}
                      onClick={() => move(id, 1)}
                    >
                      <Chevron />
                    </button>
                    <button
                      type="button"
                      className="wg-btn"
                      onClick={() => toggle(id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="wg-grid">
          <Card className="dash-profile-section">
            <div className="dash-card__eyebrow">LIBRARY</div>
            <h3 className="dash-profile-section__title">Available Widgets</h3>

            <div className="wg-library">
              {WIDGET_CATALOG.map((w) => {
                const on = active.includes(w.id);
                return (
                  <div key={w.id} className={`wg-tile${on ? " wg-tile--on" : ""}`}>
                    <div className="wg-tile__top">
                      <span className="wg-tile__icon">
                        <WidgetIcon id={w.id} size={20} />
                      </span>
                      <Switch on={on} onChange={() => toggle(w.id)} label={w.name} />
                    </div>
                    <div className="wg-tile__name">{w.name}</div>
                    <div className="wg-tile__hint">{w.hint}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="dash-profile-section">
            <div className="dash-card__eyebrow">DISPLAY</div>
            <h3 className="dash-profile-section__title">Widget Settings</h3>

            <label className="ap-field wg-field">
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

            <div className="ap-field wg-field">
              <span className="ap-field__label">Arrangement</span>
              <div className="ap-seg wg-seg">
                {[
                  { value: "stack", label: "Stack" },
                  { value: "grid", label: "Grid" },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`ap-seg__btn${arrange === o.value ? " ap-seg__btn--active" : ""}`}
                    onClick={() => setArrange(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="ap-field wg-field">
              <span className="ap-field__label">Widget Style</span>
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

            <div className="ap-switches">
              <div className="ap-switch">
                <div>
                  <div className="ap-switch__label">Show Labels</div>
                  <div className="ap-switch__hint">Small title above each widget</div>
                </div>
                <Switch on={showLabels} onChange={setShowLabels} label="Show labels" />
              </div>
              <div className="ap-switch">
                <div>
                  <div className="ap-switch__label">Compact Mode</div>
                  <div className="ap-switch__hint">Tighter padding and spacing</div>
                </div>
                <Switch on={compact} onChange={setCompact} label="Compact mode" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
