"use client";

// Small form controls shared by the widget style editor. Same look as the
// Card settings on the Appearance tab (they reuse its ap-* classes), kept in
// their own file so Appearance.jsx doesn't need to change.

import "./Appearance.css";

// Same switch as the Appearance tab's badge toggles (shares its CSS class).
export function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`dash-badge-switch${on ? " dash-badge-switch--on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <span className="dash-badge-switch__knob" />
    </button>
  );
}

export function ColorField({ label, value, onChange }) {
  return (
    <div className="ap-field">
      <span className="ap-field__label">{label}</span>
      <div className="ap-color">
        <label className="ap-color__swatch" style={{ background: value }}>
          <input
            type="color"
            hidden
            value={/^#([0-9a-fA-F]{6})$/.test(value) ? value : "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <input
          type="text"
          className="ap-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// Number + slider tile. An optional colour swatch sits top right.
export function SliderTile({ label, unit, value, min, max, step = 1, onChange, color, onColor }) {
  return (
    <div className="ap-tile">
      <div className="ap-tile__head">
        <span className="ap-tile__label">{label}</span>
        <div className="ap-tile__num">
          <input
            type="number"
            className="ap-num"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="ap-tile__unit">{unit}</span>
        </div>
        {onColor ? (
          <label className="ap-tile__swatch" style={{ background: color }}>
            <input type="color" hidden value={color} onChange={(e) => onColor(e.target.value)} />
          </label>
        ) : null}
      </div>
      <input
        type="range"
        className="ap-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// Radius presets in px. `d` is just the little icon.
const CORNERS = [
  { value: 0, label: "Square", d: "M6 6h20v20H6z" },
  { value: 6, label: "Slight", d: "M6 6h16a4 4 0 0 1 4 4v16H6z" },
  { value: 12, label: "Soft", d: "M6 6h14a6 6 0 0 1 6 6v14H6z" },
  { value: 18, label: "Round", d: "M6 6h10a10 10 0 0 1 10 10v10H6z" },
  { value: 26, label: "Rounder", d: "M6 6h6a14 14 0 0 1 14 14v6H6z" },
  { value: 40, label: "Pill", d: "M6 6a20 20 0 0 1 20 20H6z" },
];

// value === null means "follow the profile card's corner radius".
export function CornerPicker({ value, onChange }) {
  return (
    <div className="ap-field ap-field--corners">
      <span className="ap-field__label">Corner Radius</span>
      <div className="ap-corners">
        {CORNERS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-label={c.label}
            title={c.label}
            className={`ap-corner${value === c.value ? " ap-corner--active" : ""}`}
            onClick={() => onChange(c.value)}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d={c.d}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="rgba(255,255,255,0.06)"
              />
            </svg>
          </button>
        ))}
      </div>
      <div className="wg-match">
        <div className="ap-seg">
          <button
            type="button"
            className={`ap-seg__btn${value === null ? " ap-seg__btn--active" : ""}`}
            onClick={() => onChange(null)}
          >
            Match card corners
          </button>
        </div>
      </div>
    </div>
  );
}