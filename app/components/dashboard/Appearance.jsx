"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import Card from "./Card";
import "./Profile.css";
import "./Appearance.css";

// Layout only for now: nothing here is saved or applied to the public
// profile yet. State is local so the controls feel real while we build.

const LAYOUTS = [
  {
    value: "minimal",
    label: "Minimal",
    hint: "No container. Your name, badges and bio sit straight on the background.",
  },
  {
    value: "card",
    label: "Card",
    hint: "Wraps everything in a card you can style, like guns.lol.",
  },
];

const PROFILE_EFFECTS = ["None", "Snow", "Rain", "Sparkles", "Stars", "Fireflies"];

// Corner shapes, left to right: square, then increasingly rounded, then
// the cut/fancy ones. `r` is the SVG preview radius.
const CORNERS = [
  { value: "square", label: "Square", d: "M6 6h20v20H6z" },
  { value: "soft", label: "Soft", d: "M6 6h14a6 6 0 0 1 6 6v14H6z" },
  { value: "round", label: "Round", d: "M6 6h10a10 10 0 0 1 10 10v10H6z" },
  { value: "rounder", label: "Rounder", d: "M6 6h6a14 14 0 0 1 14 14v6H6z" },
  { value: "leaf", label: "Leaf", d: "M6 6a20 20 0 0 1 20 20H6z" },
  { value: "slant", label: "Slant", d: "M6 6c14 0 20 8 20 20H6z" },
];

function Switch({ on, onChange, label }) {
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

function ColorField({ label, value, onChange }) {
  return (
    <div className="ap-field">
      <span className="ap-field__label">{label}</span>
      <div className="ap-color">
        <label className="ap-color__swatch" style={{ background: value }}>
          <input
            type="color"
            hidden
            value={/^#([0-9a-fA-F]{6})$/.test(value) ? value : "#151515"}
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

// Number + slider tile (Blur, Opacity, Border, Shadow). An optional colour
// swatch sits top right for the ones that have one.
function SliderTile({ label, unit, value, min, max, step = 1, onChange, color, onColor }) {
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
            <input
              type="color"
              hidden
              value={color}
              onChange={(e) => onColor(e.target.value)}
            />
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

function LayoutPreview({ kind }) {
  return (
    <div className="ap-preview">
      <div className={`ap-preview__stage${kind === "card" ? " ap-preview__stage--card" : ""}`}>
        <span className="ap-preview__avatar" />
        <span className="ap-preview__name" />
        <span className="ap-preview__badges">
          <i />
          <i />
          <i />
        </span>
        <span className="ap-preview__bio" />
      </div>
    </div>
  );
}

export default function Appearance() {
  const [layout, setLayout] = useState("minimal");

  // Card settings
  const [bgMode, setBgMode] = useState("gradient"); // "solid" | "gradient"
  const [startColor, setStartColor] = useState("#151515");
  const [endColor, setEndColor] = useState("#151515");
  const [angle, setAngle] = useState(0);
  const [blur, setBlur] = useState(0);
  const [opacity, setOpacity] = useState(5);
  const [border, setBorder] = useState(2);
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [shadow, setShadow] = useState(12);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [corner, setCorner] = useState("square");

  // Effects
  const [profileEffect, setProfileEffect] = useState("Snow");
  const [tilt, setTilt] = useState(true);
  const [glowIcons, setGlowIcons] = useState(false);

  const isCard = layout === "card";

  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Appearance" />

      <div className="dash-profile-body">
        <Card className="dash-profile-section">
          <div className="dash-card__eyebrow">LAYOUT</div>
          <h3 className="dash-profile-section__title">Profile Layout</h3>
          <div className="ap-layouts">
            {LAYOUTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`ap-layout${layout === opt.value ? " ap-layout--active" : ""}`}
                aria-pressed={layout === opt.value}
                onClick={() => setLayout(opt.value)}
              >
                <LayoutPreview kind={opt.value} />
                <span className="ap-layout__row">
                  <span className="ap-layout__label">{opt.label}</span>
                  {opt.value === "minimal" ? (
                    <span className="ap-layout__tag">Default</span>
                  ) : null}
                </span>
                <span className="ap-layout__hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </Card>

        <div className="ap-grid">
          <Card className={`dash-profile-section ap-card-settings${isCard ? "" : " ap-locked"}`}>
            <div className="dash-card__eyebrow">CONTAINER</div>
            <h3 className="dash-profile-section__title">Card Settings</h3>
            {!isCard ? (
              <div className="ap-locked__note">Switch to the Card layout to edit these.</div>
            ) : null}

            <fieldset className="ap-fieldset" disabled={!isCard}>
              <div className="ap-bg">
                <div className="ap-bg__top">
                  <div className="ap-bg__title">
                    <span className="ap-tile__label">Container Background</span>
                    <strong>{bgMode === "gradient" ? "Gradient fill" : "Solid fill"}</strong>
                    <span className="ap-bg__sub">Controls the profile card only</span>
                  </div>
                  <div className="ap-seg">
                    {["solid", "gradient"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`ap-seg__btn${bgMode === m ? " ap-seg__btn--active" : ""}`}
                        onClick={() => setBgMode(m)}
                      >
                        {m === "solid" ? "Solid" : "Gradient"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`ap-bg__colors${bgMode === "solid" ? " ap-bg__colors--solid" : ""}`}>
                  <ColorField
                    label={bgMode === "solid" ? "Color" : "Start color"}
                    value={startColor}
                    onChange={setStartColor}
                  />
                  {bgMode === "gradient" ? (
                    <>
                      <ColorField label="End color" value={endColor} onChange={setEndColor} />
                      <div className="ap-field ap-field--angle">
                        <span className="ap-field__label">Angle</span>
                        <input
                          type="number"
                          className="ap-input"
                          min={0}
                          max={360}
                          value={angle}
                          onChange={(e) => setAngle(Number(e.target.value))}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="ap-tiles">
                <SliderTile label="Blur" unit="px" value={blur} min={0} max={40} onChange={setBlur} />
                <SliderTile label="Opacity" unit="%" value={opacity} min={0} max={100} onChange={setOpacity} />
                <SliderTile
                  label="Border"
                  unit="px"
                  value={border}
                  min={0}
                  max={12}
                  onChange={setBorder}
                  color={borderColor}
                  onColor={setBorderColor}
                />
                <SliderTile
                  label="Shadow"
                  unit="px"
                  value={shadow}
                  min={0}
                  max={60}
                  onChange={setShadow}
                  color={shadowColor}
                  onColor={setShadowColor}
                />
              </div>

              <div className="ap-field ap-field--corners">
                <span className="ap-field__label">Corner Radius</span>
                <div className="ap-corners">
                  {CORNERS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={c.label}
                      title={c.label}
                      className={`ap-corner${corner === c.value ? " ap-corner--active" : ""}`}
                      onClick={() => setCorner(c.value)}
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
              </div>
            </fieldset>
          </Card>

          <Card className="dash-profile-section ap-effects">
            <div className="dash-card__eyebrow">EFFECTS</div>
            <h3 className="dash-profile-section__title">Motion + Styling</h3>

            <label className="ap-field">
              <span className="ap-field__label">Profile Effects</span>
              <select
                className="ap-select"
                value={profileEffect}
                onChange={(e) => setProfileEffect(e.target.value)}
              >
                {PROFILE_EFFECTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <div className="ap-switches">
              <div className={`ap-switch${isCard ? "" : " ap-switch--off"}`}>
                <div>
                  <div className="ap-switch__label">3D Tilt</div>
                  <div className="ap-switch__hint">
                    {isCard ? "Card hover motion" : "Needs the Card layout"}
                  </div>
                </div>
                <Switch on={tilt && isCard} onChange={isCard ? setTilt : () => {}} label="3D tilt" />
              </div>
              <div className="ap-switch">
                <div>
                  <div className="ap-switch__label">Glowing Icons</div>
                  <div className="ap-switch__hint">Glow-tinted links</div>
                </div>
                <Switch on={glowIcons} onChange={setGlowIcons} label="Glowing icons" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
