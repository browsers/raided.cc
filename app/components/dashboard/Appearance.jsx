"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  AVATAR_SHAPES,
  AVATAR_SHAPE_COLUMN,
  CARD_COLUMNS,
  isHex,
  withCardDefaults,
} from "../../lib/cardStyle";
import { TILT_COLUMNS, withTiltDefaults } from "../../lib/tilt";
import { VIEWS_COLUMNS, VIEWS_POSITIONS, withViewsDefaults } from "../../lib/views";
import TopBar from "./TopBar";
import Card from "./Card";
import "./Profile.css";
import "./Appearance.css";

// Layout + card settings save to the profiles table and are applied on the
// public page (see lib/cardStyle.js). 3D Tilt (on/off, intensity, reverse)
// saves on its own too (see lib/tilt.js). Profile Effects and Glowing Icons
// are still local-only for now.

const SAVE_DEBOUNCE_MS = 600;

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

// Corner presets. `value` is the radius in px applied to the card; `d` is
// just the little icon.
const CORNERS = [
  { value: 0, label: "Square", d: "M6 6h20v20H6z" },
  { value: 10, label: "Soft", d: "M6 6h14a6 6 0 0 1 6 6v14H6z" },
  { value: 20, label: "Round", d: "M6 6h10a10 10 0 0 1 10 10v10H6z" },
  { value: 32, label: "Rounder", d: "M6 6h6a14 14 0 0 1 14 14v6H6z" },
  { value: 44, label: "Extra round", d: "M6 6a20 20 0 0 1 20 20H6z" },
  { value: 60, label: "Max", d: "M6 6c14 0 20 8 20 20H6z" },
];

const clamp = (v, min, max) => Math.min(Math.max(Number.isFinite(v) ? v : 0, min), max);

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

function LayoutPreview({ kind, shape }) {
  return (
    <div className="ap-preview">
      <div className={`ap-preview__stage${kind === "card" ? " ap-preview__stage--card" : ""}`}>
        <span
          className="ap-preview__avatar"
          style={{ borderRadius: shape === "circle" ? "50%" : "8px" }}
        />
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error

  const userIdRef = useRef(null);
  const pending = useRef({});
  const saveTimer = useRef(null);

  const [layout, setLayoutRaw] = useState("minimal");
  const [avatarShape, setAvatarShapeRaw] = useState("rounded"); // "rounded" | "circle" | "match"
  const [viewsPosition, setViewsPositionRaw] = useState("page-right");
  const [viewsGlass, setViewsGlassRaw] = useState(true);

  // Card settings
  const [bgMode, setBgModeRaw] = useState("gradient"); // "solid" | "gradient"
  const [startColor, setStartColorRaw] = useState("#151515");
  const [endColor, setEndColorRaw] = useState("#151515");
  const [angle, setAngleRaw] = useState(0);
  const [blur, setBlurRaw] = useState(0);
  const [opacity, setOpacityRaw] = useState(5);
  const [border, setBorderRaw] = useState(2);
  const [borderColor, setBorderColorRaw] = useState("#ffffff");
  const [shadow, setShadowRaw] = useState(12);
  const [shadowColor, setShadowColorRaw] = useState("#000000");
  const [corner, setCornerRaw] = useState(0);

  // Effects. Tilt saves; profile effect + glowing icons aren't saved yet.
  const [profileEffect, setProfileEffect] = useState("Snow");
  const [tilt, setTiltRaw] = useState(true);
  const [tiltIntensity, setTiltIntensityRaw] = useState(50);
  const [tiltReverse, setTiltReverseRaw] = useState(false);
  const [glowIcons, setGlowIcons] = useState(false);

  // --- Saving: batches fast changes into one update ----------------------
  async function flush() {
    const cols = pending.current;
    pending.current = {};
    if (!userIdRef.current || Object.keys(cols).length === 0) return;
    const { error } = await supabase.from("profiles").update(cols).eq("id", userIdRef.current);
    if (error) console.error("Appearance save failed:", error);
    setStatus(error ? "error" : "saved");
  }

  function queueSave(cols) {
    if (!userIdRef.current) return;
    Object.assign(pending.current, cols);
    setStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }

  // Avatar shape saves by itself (not in the batch) because its column can
  // exist or not independently of the card columns.
  async function setAvatarShape(v) {
    setAvatarShapeRaw(v);
    if (!userIdRef.current) return;
    setStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ [AVATAR_SHAPE_COLUMN]: v })
      .eq("id", userIdRef.current);
    if (error) console.error("Avatar shape save failed:", error);
    setStatus(error ? "error" : "saved");
  }

  // Views counter settings (position + glass border) save on their own too,
  // so a missing views migration can't break anything else. viewsUserId
  // stays null if the columns don't exist, and changes just won't save.
  const viewsUserId = useRef(null);

  async function saveViews(cols) {
    if (!viewsUserId.current) return;
    setStatus("saving");
    const { error } = await supabase.from("profiles").update(cols).eq("id", viewsUserId.current);
    if (error) console.error("Views save failed:", error);
    setStatus(error ? "error" : "saved");
  }

  const setViewsPosition = (v) => { setViewsPositionRaw(v); saveViews({ views_position: v }); };
  const setViewsGlass = (v) => { setViewsGlassRaw(v); saveViews({ views_glass: v }); };

  // Tilt settings save on their own (own debounce, own columns) so a missing
  // tilt migration can't break the card settings above, and vice versa.
  const tiltPending = useRef({});
  const tiltTimer = useRef(null);
  const tiltUserId = useRef(null);

  async function flushTilt() {
    const cols = tiltPending.current;
    tiltPending.current = {};
    if (!tiltUserId.current || Object.keys(cols).length === 0) return;
    const { error } = await supabase.from("profiles").update(cols).eq("id", tiltUserId.current);
    if (error) console.error("Tilt save failed:", error);
    setStatus(error ? "error" : "saved");
  }

  function queueTiltSave(cols) {
    if (!tiltUserId.current) return;
    Object.assign(tiltPending.current, cols);
    setStatus("saving");
    clearTimeout(tiltTimer.current);
    tiltTimer.current = setTimeout(flushTilt, SAVE_DEBOUNCE_MS);
  }

  const setTilt = (v) => { setTiltRaw(v); queueTiltSave({ tilt_enabled: v }); };
  const setTiltIntensity = (v) => { const n = clamp(v, 0, 100); setTiltIntensityRaw(n); queueTiltSave({ tilt_intensity: n }); };
  const setTiltReverse = (v) => { setTiltReverseRaw(v); queueTiltSave({ tilt_reverse: v }); };

  // Wrapped setters: same names the JSX already uses, but each one also
  // queues a save. Text colors only save once they're a real hex.
  const setLayout = (v) => { setLayoutRaw(v); queueSave({ appearance_layout: v }); };
  const setBgMode = (v) => { setBgModeRaw(v); queueSave({ card_bg_mode: v }); };
  const setStartColor = (v) => { setStartColorRaw(v); if (isHex(v)) queueSave({ card_start_color: v }); };
  const setEndColor = (v) => { setEndColorRaw(v); if (isHex(v)) queueSave({ card_end_color: v }); };
  const setBorderColor = (v) => { setBorderColorRaw(v); if (isHex(v)) queueSave({ card_border_color: v }); };
  const setShadowColor = (v) => { setShadowColorRaw(v); if (isHex(v)) queueSave({ card_shadow_color: v }); };
  const setAngle = (v) => { const n = clamp(v, 0, 360); setAngleRaw(n); queueSave({ card_angle: n }); };
  const setBlur = (v) => { const n = clamp(v, 0, 40); setBlurRaw(n); queueSave({ card_blur: n }); };
  const setOpacity = (v) => { const n = clamp(v, 0, 100); setOpacityRaw(n); queueSave({ card_opacity: n }); };
  const setBorder = (v) => { const n = clamp(v, 0, 12); setBorderRaw(n); queueSave({ card_border: n }); };
  const setShadow = (v) => { const n = clamp(v, 0, 60); setShadowRaw(n); queueSave({ card_shadow: n }); };
  const setCorner = (v) => { setCornerRaw(v); queueSave({ card_corner: v }); };

  // Load what's already saved.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      userIdRef.current = user.id;

      // Handle in its own query so a missing appearance column can't hide it.
      const { data: h } = await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle();
      if (!cancelled && h?.handle) setHandle(h.handle);

      // Own query too: if the avatar_shape migration hasn't run, this just
      // errors quietly and the shape stays on the rounded default.
      const { data: shapeRow } = await supabase
        .from("profiles")
        .select(AVATAR_SHAPE_COLUMN)
        .eq("id", user.id)
        .maybeSingle();
      const savedShape = shapeRow?.[AVATAR_SHAPE_COLUMN];
      if (!cancelled && AVATAR_SHAPES.some((o) => o.value === savedShape)) {
        setAvatarShapeRaw(savedShape);
      }

      // Views counter settings: own query, same reasoning as the avatar shape.
      const { data: viewsRow, error: viewsError } = await supabase
        .from("profiles")
        .select(VIEWS_COLUMNS)
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && !viewsError) {
        const vw = withViewsDefaults(viewsRow);
        viewsUserId.current = user.id;
        setViewsPositionRaw(vw.views_position);
        setViewsGlassRaw(vw.views_glass);
      } else if (viewsError) {
        console.error("Views settings load failed (run views_migration.sql):", viewsError);
      }

      // Tilt settings: own query, same reasoning as the avatar shape. If the
      // migration hasn't run this errors quietly, defaults stay, and tilt
      // changes just won't save (tiltUserId stays null).
      const { data: tiltRow, error: tiltError } = await supabase
        .from("profiles")
        .select(TILT_COLUMNS)
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && !tiltError) {
        const t = withTiltDefaults(tiltRow);
        tiltUserId.current = user.id;
        setTiltRaw(t.tilt_enabled);
        setTiltIntensityRaw(t.tilt_intensity);
        setTiltReverseRaw(t.tilt_reverse);
      } else if (tiltError) {
        console.error("Tilt load failed (run tilt_migration.sql):", tiltError);
      }

      const { data: row, error } = await supabase
        .from("profiles")
        .select(CARD_COLUMNS)
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        // Almost always "column does not exist" = migration not run yet.
        console.error("Appearance load failed:", error);
        setLoadError(error.message);
        userIdRef.current = null; // don't try to save into missing columns
      } else {
        const v = withCardDefaults(row);
        setLayoutRaw(v.appearance_layout === "card" ? "card" : "minimal");
        setBgModeRaw(v.card_bg_mode === "solid" ? "solid" : "gradient");
        setStartColorRaw(v.card_start_color);
        setEndColorRaw(v.card_end_color);
        setAngleRaw(v.card_angle);
        setBlurRaw(v.card_blur);
        setOpacityRaw(v.card_opacity);
        setBorderRaw(v.card_border);
        setBorderColorRaw(v.card_border_color);
        setShadowRaw(v.card_shadow);
        setShadowColorRaw(v.card_shadow_color);
        setCornerRaw(v.card_corner);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
      clearTimeout(tiltTimer.current);
      // Push anything still waiting so a quick tab switch doesn't lose it.
      flush();
      flushTilt();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCard = layout === "card";
  const tiltActive = isCard && tilt;

  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Appearance" />

      <div className="dash-profile-body">
        <Card className="dash-profile-section">
          <div className="dash-card__eyebrow">
            LAYOUT
            {status === "saving" ? <span className="ap-hint">Saving…</span> : null}
            {status === "error" ? <span className="ap-hint ap-hint--error">Save failed</span> : null}
          </div>
          <h3 className="dash-profile-section__title">Profile Layout</h3>
          {loadError ? (
            <div className="ap-notice">
              Couldn't load your appearance settings. Run appearance_migration.sql in the Supabase SQL
              editor, then refresh.
            </div>
          ) : null}
          <div className="ap-layouts">
            {LAYOUTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`ap-layout${layout === opt.value ? " ap-layout--active" : ""}`}
                aria-pressed={layout === opt.value}
                onClick={() => setLayout(opt.value)}
              >
                <LayoutPreview kind={opt.value} shape={avatarShape} />
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
          <div className="ap-field-row">
            <label className="ap-field ap-field--shape">
              <span className="ap-field__label">Avatar Shape</span>
              <select
                className="ap-select"
                value={avatarShape}
                disabled={loading}
                onChange={(e) => setAvatarShape(e.target.value)}
              >
                {AVATAR_SHAPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {avatarShape === "match" ? (
                <span className="ap-field__hint">
                  {layout === "card"
                    ? "Your avatar uses the same corners as the card (Corner Radius below)."
                    : "Only applies in the Card layout. Minimal keeps a rounded square."}
                </span>
              ) : null}
            </label>
            <label className="ap-field ap-field--shape">
              <span className="ap-field__label">Views Position</span>
              <select
                className="ap-select"
                value={viewsPosition}
                disabled={loading}
                onChange={(e) => setViewsPosition(e.target.value)}
              >
                {VIEWS_POSITIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {viewsPosition.startsWith("card-") && layout !== "card" ? (
                <span className="ap-field__hint">
                  Only applies in the Card layout. Minimal keeps it in the page corner.
                </span>
              ) : null}
            </label>
          </div>

          <div className="ap-switch ap-views-glass">
            <div>
              <div className="ap-switch__label">Views Glass Border</div>
              <div className="ap-switch__hint">
                The faint box and border around the views counter
              </div>
            </div>
            <Switch on={viewsGlass} onChange={setViewsGlass} label="Views glass border" />
          </div>
          {handle ? (
            <a className="ap-view" href={`/${handle}`} target="_blank" rel="noreferrer">
              View your profile
            </a>
          ) : null}
        </Card>

        <div className="ap-grid">
          <Card className={`dash-profile-section ap-card-settings${isCard ? "" : " ap-locked"}`}>
            <div className="dash-card__eyebrow">CONTAINER</div>
            <h3 className="dash-profile-section__title">Card Settings</h3>
            {!isCard ? (
              <div className="ap-locked__note">Switch to the Card layout to edit these.</div>
            ) : null}

            <fieldset className="ap-fieldset" disabled={!isCard || loading}>
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

              <div className={tiltActive ? "" : "ap-switch--off"}>
                <SliderTile
                  label="Tilt Intensity"
                  unit="%"
                  min={0}
                  max={100}
                  value={tiltIntensity}
                  onChange={tiltActive ? setTiltIntensity : () => {}}
                />
              </div>

              <div className={`ap-switch${tiltActive ? "" : " ap-switch--off"}`}>
                <div>
                  <div className="ap-switch__label">Reverse Tilt</div>
                  <div className="ap-switch__hint">Card comes toward your cursor</div>
                </div>
                <Switch
                  on={tiltReverse && tiltActive}
                  onChange={tiltActive ? setTiltReverse : () => {}}
                  label="Reverse tilt"
                />
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