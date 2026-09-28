"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { emitDisplayNameChange } from "../../lib/profileBus";
import { PaletteIcon } from "./icons";
import "./Identity.css";

const GLOW_STYLES = [
  { value: "off", label: "Off" },
  { value: "low", label: "Low" },
  { value: "mid", label: "Mid" },
  { value: "high", label: "High" },
];

const USERNAME_EFFECTS = [
  { value: "none", label: "None" },
  { value: "fuzzy", label: "Fuzzy" },
  { value: "warp", label: "Warp" },
];

const GUILD_TAG_SIZES = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

// Which parts of the profile the selected Font actually gets applied to.
// "both" is the historical default (username + bio, nothing else).
const FONT_TARGETS = [
  { value: "both", label: "Username & Bio" },
  { value: "username", label: "Username Only" },
  { value: "bio", label: "Bio Only" },
  { value: "tooltips", label: "Tooltips Only" },
  { value: "tooltips_username", label: "Tooltips & Username" },
  { value: "tooltips_bio", label: "Tooltips & Bio" },
  { value: "all", label: "Everything" },
];

const FONT_GROUPS = [
  {
    label: "Standard",
    fonts: [
      "Poppins",
      "Montserrat",
      "Inter",
      "Roboto",
      "Open Sans",
      "Lato",
      "Nunito",
      "Arial",
      "Verdana",
      "Trebuchet MS",
    ],
  },
  {
    label: "Serif",
    fonts: ["Georgia", "Times New Roman", "Playfair Display", "Merriweather", "Lora"],
  },
  {
    label: "Mono",
    fonts: ["Courier New", "JetBrains Mono", "Space Mono"],
  },
  {
    label: "Bold & Display",
    fonts: [
      "Impact",
      "Anton",
      "Bebas Neue",
      "Oswald",
      "Archivo Black",
      "Alfa Slab One",
      "Staatliches",
      "Passion One",
    ],
  },
  {
    label: "Pixel",
    fonts: ["Press Start 2P", "Pixelify Sans", "VT323", "Silkscreen", "Jersey 10", "DotGothic16"],
  },
  {
    label: "Bubble",
    fonts: [
      "Fredoka",
      "Baloo 2",
      "Luckiest Guy",
      "Bubblegum Sans",
      "Chewy",
      "Titan One",
      "Sniglet",
      "Varela Round",
    ],
  },
  {
    label: "Graffiti & Comic",
    fonts: ["Bungee", "Bangers", "Permanent Marker", "Rock Salt", "Shrikhand"],
  },
  {
    label: "Script & Handwriting",
    fonts: [
      "Caveat",
      "Dancing Script",
      "Great Vibes",
      "Pacifico",
      "Satisfy",
      "Sacramento",
      "Kalam",
      "Comic Sans MS",
    ],
  },
  {
    label: "Futuristic & Spooky",
    fonts: ["Orbitron", "Audiowide", "Creepster", "Nosifer", "Monoton", "Eater"],
  },
];

// How long to wait after the person stops typing before we push a text
// field (display name, a bio line edit) up to Supabase.
const SAVE_DEBOUNCE_MS = 600;

// Small status dot + label reused next to each sub-section so saving
// state reads the same way it does over in AssetsUploader.
function SaveHint({ status }) {
  if (status === "saving") {
    return <span className="identity-hint identity-hint--saving">Saving…</span>;
  }
  if (status === "error") {
    return <span className="identity-hint identity-hint--error">Save failed</span>;
  }
  return null;
}

export default function Identity() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Identity fields ------------------------------------------------
  const [displayName, setDisplayName] = useState("");
  const [nameStatus, setNameStatus] = useState("idle");

  const [glowColor, setGlowColor] = useState("#ffffff");
  const [glowStatus, setGlowStatus] = useState("idle");

  const [glowStyle, setGlowStyle] = useState("mid");
  const [styleStatus, setStyleStatus] = useState("idle");

  const [font, setFont] = useState("Poppins");
  const [fontStatus, setFontStatus] = useState("idle");

  const [discordUserId, setDiscordUserId] = useState("");
  const [discordIdStatus, setDiscordIdStatus] = useState("idle");

  const [discordTagSize, setDiscordTagSize] = useState("md");
  const [discordTagSizeStatus, setDiscordTagSizeStatus] = useState("idle");

  const [fontTarget, setFontTarget] = useState("both");
  const [fontTargetStatus, setFontTargetStatus] = useState("idle");

  const [usernameEffect, setUsernameEffect] = useState("none");
  const [usernameEffectStatus, setUsernameEffectStatus] = useState("idle");

  // Bio --------------------------------------------------------------
  const [bioMode, setBioMode] = useState("typewriter"); // "typewriter" | "static"
  const [bioLines, setBioLines] = useState([]); // [{ id, line, position }]
  const [newLine, setNewLine] = useState("");
  const [bioStatus, setBioStatus] = useState("idle");

  // Typewriter tuning: how fast it types (ms/char), how long it holds a
  // finished line before deleting it (ms), and the cursor character.
  const [bioTypeSpeed, setBioTypeSpeed] = useState("45");
  const [bioDeleteHold, setBioDeleteHold] = useState("1400");
  const [bioDeleteSpeed, setBioDeleteSpeed] = useState("25");
  const [bioCursor, setBioCursor] = useState("|");
  const [bioTuningStatus, setBioTuningStatus] = useState("idle");

  const nameSaveTimer = useRef(null);
  const discordIdSaveTimer = useRef(null);
  const bioTypeSpeedTimer = useRef(null);
  const bioDeleteHoldTimer = useRef(null);
  const bioDeleteSpeedTimer = useRef(null);

  // Load whatever's already saved for this user on mount.
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

      const [{ data: profile }, { data: lineRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, glow_color, glow_style, font, font_target, bio_mode, bio_type_speed_ms, bio_delete_hold_ms, bio_delete_speed_ms, bio_cursor, username_effect, discord_user_id, discord_tag_size"
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("profile_bio_lines")
          .select("id, line, position")
          .eq("profile_id", user.id)
          .order("position", { ascending: true }),
      ]);

      if (cancelled) return;

      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setGlowColor(profile.glow_color ?? "#ffffff");
        setGlowStyle(profile.glow_style ?? "mid");
        setFont(profile.font ?? "Poppins");
        setFontTarget(profile.font_target ?? "both");
        setDiscordUserId(profile.discord_user_id ?? "");
        setDiscordTagSize(profile.discord_tag_size ?? "md");
        setUsernameEffect(profile.username_effect ?? "none");
        setBioMode(profile.bio_mode === "static" ? "static" : "typewriter");
        setBioTypeSpeed(String(profile.bio_type_speed_ms ?? 45));
        setBioDeleteHold(String(profile.bio_delete_hold_ms ?? 1400));
        setBioDeleteSpeed(String(profile.bio_delete_speed_ms ?? 25));
        setBioCursor(profile.bio_cursor ?? "|");
      }
      if (lineRows) setBioLines(lineRows);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      clearTimeout(nameSaveTimer.current);
      clearTimeout(discordIdSaveTimer.current);
      clearTimeout(bioTypeSpeedTimer.current);
      clearTimeout(bioDeleteHoldTimer.current);
      clearTimeout(bioDeleteSpeedTimer.current);
    };
  }, []);

  // --- Display name (debounced save while typing) -----------------------
  function handleNameChange(value) {
    setDisplayName(value);
    // Update anywhere else the name shows (e.g. the Sidebar account card)
    // immediately, ahead of the debounced save below.
    emitDisplayNameChange(value);
    if (!userId) return;
    setNameStatus("saving");
    clearTimeout(nameSaveTimer.current);
    nameSaveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: value })
        .eq("id", userId);
      setNameStatus(error ? "error" : "idle");
    }, SAVE_DEBOUNCE_MS);
  }

  // --- Discord user ID (debounced save while typing) --------------------
  // Just the raw snowflake — server tag is looked up live from Discord
  // using this ID, nothing else gets stored.
  function handleDiscordIdChange(value) {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    setDiscordUserId(digitsOnly);
    if (!userId) return;
    setDiscordIdStatus("saving");
    clearTimeout(discordIdSaveTimer.current);
    discordIdSaveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ discord_user_id: digitsOnly || null })
        .eq("id", userId);
      setDiscordIdStatus(error ? "error" : "idle");
    }, SAVE_DEBOUNCE_MS);
  }

  // --- Guild tag size ------------------------------------------------
  async function handleDiscordTagSizeChange(value) {
    setDiscordTagSize(value);
    if (!userId) return;
    setDiscordTagSizeStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ discord_tag_size: value })
      .eq("id", userId);
    setDiscordTagSizeStatus(error ? "error" : "idle");
  }

  // --- Glow color ---------------------------------------------------
  async function handleGlowColorChange(value) {
    setGlowColor(value);
    if (!userId) return;
    setGlowStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ glow_color: value })
      .eq("id", userId);
    setGlowStatus(error ? "error" : "idle");
  }

  function handleGlowHexInput(value) {
    // Let them type freely; only push a save once it's a real hex color.
    setGlowColor(value);
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
      handleGlowColorChange(value);
    }
  }

  // --- Glow style -----------------------------------------------------
  async function handleGlowStyleChange(value) {
    setGlowStyle(value);
    if (!userId) return;
    setStyleStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ glow_style: value })
      .eq("id", userId);
    setStyleStatus(error ? "error" : "idle");
  }

  // --- Font -----------------------------------------------------------
  async function handleFontChange(value) {
    setFont(value);
    if (!userId) return;
    setFontStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ font: value })
      .eq("id", userId);
    setFontStatus(error ? "error" : "idle");
  }

  // --- Font target (which parts of the profile the font applies to) -----
  async function handleFontTargetChange(value) {
    setFontTarget(value);
    if (!userId) return;
    setFontTargetStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ font_target: value })
      .eq("id", userId);
    setFontTargetStatus(error ? "error" : "idle");
  }

  // --- Username effect --------------------------------------------------
  async function handleUsernameEffectChange(value) {
    setUsernameEffect(value);
    if (!userId) return;
    setUsernameEffectStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ username_effect: value })
      .eq("id", userId);
    setUsernameEffectStatus(error ? "error" : "idle");
  }

  // --- Bio mode ---------------------------------------------------------
  async function handleBioModeChange(mode) {
    setBioMode(mode);
    if (!userId) return;
    setBioStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ bio_mode: mode })
      .eq("id", userId);
    setBioStatus(error ? "error" : "idle");
  }

  // --- Bio typewriter tuning ---------------------------------------------
  function handleBioTypeSpeedChange(value) {
    setBioTypeSpeed(value);
    if (!userId) return;
    const ms = Math.min(Math.max(parseInt(value, 10) || 45, 5), 1000);
    setBioTuningStatus("saving");
    clearTimeout(bioTypeSpeedTimer.current);
    bioTypeSpeedTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ bio_type_speed_ms: ms })
        .eq("id", userId);
      setBioTuningStatus(error ? "error" : "idle");
    }, SAVE_DEBOUNCE_MS);
  }

  function handleBioDeleteHoldChange(value) {
    setBioDeleteHold(value);
    if (!userId) return;
    const ms = Math.min(Math.max(parseInt(value, 10) || 0, 0), 10000);
    setBioTuningStatus("saving");
    clearTimeout(bioDeleteHoldTimer.current);
    bioDeleteHoldTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ bio_delete_hold_ms: ms })
        .eq("id", userId);
      setBioTuningStatus(error ? "error" : "idle");
    }, SAVE_DEBOUNCE_MS);
  }

  function handleBioDeleteSpeedChange(value) {
    setBioDeleteSpeed(value);
    if (!userId) return;
    const ms = Math.min(Math.max(parseInt(value, 10) || 25, 5), 1000);
    setBioTuningStatus("saving");
    clearTimeout(bioDeleteSpeedTimer.current);
    bioDeleteSpeedTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ bio_delete_speed_ms: ms })
        .eq("id", userId);
      setBioTuningStatus(error ? "error" : "idle");
    }, SAVE_DEBOUNCE_MS);
  }

  async function handleBioCursorChange(value) {
    // Only one character allowed — take the last char typed so replacing
    // the default "|" by typing a new symbol just swaps it in, rather
    // than requiring a select-all first.
    const char = value.slice(-1);
    setBioCursor(char);
    if (!userId) return;
    setBioTuningStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ bio_cursor: char || "|" })
      .eq("id", userId);
    setBioTuningStatus(error ? "error" : "idle");
  }

  // --- Bio lines --------------------------------------------------------
  async function handleAddLine() {
    const line = newLine.trim();
    if (!line || !userId) return;

    setBioStatus("saving");
    const position = bioLines.length;
    const { data, error } = await supabase
      .from("profile_bio_lines")
      .insert({ profile_id: userId, line, position })
      .select("id, line, position")
      .single();

    if (error) {
      console.error("Bio line add failed:", error);
      setBioStatus("error");
      return;
    }

    setBioLines((prev) => [...prev, data]);
    setNewLine("");
    setBioStatus("idle");
  }

  async function handleRemoveLine(id) {
    const prev = bioLines;
    setBioLines((lines) => lines.filter((l) => l.id !== id));
    if (!userId) return;
    setBioStatus("saving");
    const { error } = await supabase.from("profile_bio_lines").delete().eq("id", id);
    if (error) {
      console.error("Bio line remove failed:", error);
      setBioLines(prev);
      setBioStatus("error");
      return;
    }
    setBioStatus("idle");
  }

  function handleNewLineKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLine();
    }
  }

  return (
    <>
      <div className="identity-field-row">
        <label className="identity-field">
          <span className="identity-field__label">
            Display Name <SaveHint status={nameStatus} />
          </span>
          <input
            type="text"
            className="identity-input"
            placeholder={loading ? "Loading…" : "Your display name"}
            value={displayName}
            disabled={!userId}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </label>
      </div>

      <div className="identity-field-row identity-field-row--two">
        <label className="identity-field">
          <span className="identity-field__label">
            Discord User ID <SaveHint status={discordIdStatus} />
          </span>
          <input
            type="text"
            inputMode="numeric"
            className="identity-input"
            placeholder="e.g. 80351110224678912"
            value={discordUserId}
            disabled={!userId}
            onChange={(e) => handleDiscordIdChange(e.target.value)}
          />
        </label>

        <label className="identity-field">
          <span className="identity-field__label">
            Guild Tag Size <SaveHint status={discordTagSizeStatus} />
          </span>
          <select
            className="identity-select"
            value={discordTagSize}
            disabled={!userId}
            onChange={(e) => handleDiscordTagSizeChange(e.target.value)}
          >
            {GUILD_TAG_SIZES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="identity-field-hint identity-field-hint--discord">
        This shows your Discord server tag — the small badge + 2–4 letter tag some servers let
        members display next to their name (Server Settings → Overview → enable "Show as
        primary" on Discord's side). Paste your Discord user ID above and it'll be pulled in
        automatically and shown next to your username on your public profile.
      </div>

      <div className="identity-field-row identity-field-row--three">
        <div className="identity-field">
          <span className="identity-field__label">
            Glow Color <SaveHint status={glowStatus} />
          </span>
          <div className="identity-color-field">
            <label className="identity-color-swatch" style={{ background: glowColor }}>
              <input
                type="color"
                hidden
                value={/^#([0-9a-fA-F]{6})$/.test(glowColor) ? glowColor : "#ffffff"}
                disabled={!userId}
                onChange={(e) => handleGlowColorChange(e.target.value)}
              />
            </label>
            <input
              type="text"
              className="identity-input"
              value={glowColor}
              disabled={!userId}
              onChange={(e) => handleGlowHexInput(e.target.value)}
            />
          </div>
        </div>

        <div className="identity-field">
          <span className="identity-field__label">
            Glow Style <SaveHint status={styleStatus} />
          </span>
          <select
            className="identity-select"
            value={glowStyle}
            disabled={!userId}
            onChange={(e) => handleGlowStyleChange(e.target.value)}
          >
            {GLOW_STYLES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="identity-field">
          <span className="identity-field__label">
            Font <SaveHint status={fontStatus} />
          </span>
          <select
            className="identity-select"
            value={font}
            disabled={!userId}
            onChange={(e) => handleFontChange(e.target.value)}
            style={{ fontFamily: `"${font}", var(--font-sans), sans-serif` }}
          >
            {FONT_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.fonts.map((name) => (
                  <option key={name} value={name} style={{ fontFamily: `"${name}", sans-serif` }}>
                    {name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="identity-field-row identity-field-row--two">
        <label className="identity-field">
          <span className="identity-field__label">
            Username Effect <SaveHint status={usernameEffectStatus} />
          </span>
          <select
            className="identity-select"
            value={usernameEffect}
            disabled={!userId}
            onChange={(e) => handleUsernameEffectChange(e.target.value)}
          >
            {USERNAME_EFFECTS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="identity-field">
          <span className="identity-field__label">
            Apply Font To <SaveHint status={fontTargetStatus} />
          </span>
          <select
            className="identity-select"
            value={fontTarget}
            disabled={!userId}
            onChange={(e) => handleFontTargetChange(e.target.value)}
          >
            {FONT_TARGETS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="identity-bio">
        <div className="identity-bio__header">
          <div>
            <div className="identity-bio__label">
              BIO <SaveHint status={bioStatus} />
            </div>
            <div className="identity-bio__hint">Cycles through multiple lines on your profile.</div>
          </div>
          <div className="identity-toggle" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`identity-toggle__btn${bioMode === "typewriter" ? " identity-toggle__btn--active" : ""}`}
              disabled={!userId}
              onClick={() => handleBioModeChange("typewriter")}
            >
              Typewriter
            </button>
            <button
              type="button"
              className={`identity-toggle__btn${bioMode === "static" ? " identity-toggle__btn--active" : ""}`}
              disabled={!userId}
              onClick={() => handleBioModeChange("static")}
            >
              Static
            </button>
          </div>
        </div>

        {bioMode === "typewriter" ? (
          <>
            <div className="identity-field-row identity-field-row--three identity-bio-tuning">
            <div className="identity-field">
              <span className="identity-field__label">
                Typing Speed (ms) <SaveHint status={bioTuningStatus} />
              </span>
              <input
                type="number"
                className="identity-input"
                min={5}
                max={1000}
                placeholder="45"
                value={bioTypeSpeed}
                disabled={!userId}
                onChange={(e) => handleBioTypeSpeedChange(e.target.value)}
              />
              <input
                type="range"
                className="identity-slider"
                min={5}
                max={300}
                step={5}
                value={Math.min(Math.max(Number(bioTypeSpeed) || 45, 5), 300)}
                disabled={!userId}
                onChange={(e) => handleBioTypeSpeedChange(e.target.value)}
              />
            </div>

            <div className="identity-field">
              <span className="identity-field__label">Delete Speed (ms)</span>
              <input
                type="number"
                className="identity-input"
                min={5}
                max={1000}
                placeholder="25"
                value={bioDeleteSpeed}
                disabled={!userId}
                onChange={(e) => handleBioDeleteSpeedChange(e.target.value)}
              />
              <input
                type="range"
                className="identity-slider"
                min={5}
                max={300}
                step={5}
                value={Math.min(Math.max(Number(bioDeleteSpeed) || 25, 5), 300)}
                disabled={!userId}
                onChange={(e) => handleBioDeleteSpeedChange(e.target.value)}
              />
            </div>

            <div className="identity-field">
              <span className="identity-field__label">Delete Delay (ms)</span>
              <input
                type="number"
                className="identity-input"
                min={0}
                max={10000}
                placeholder="1400"
                value={bioDeleteHold}
                disabled={!userId}
                onChange={(e) => handleBioDeleteHoldChange(e.target.value)}
              />
              <input
                type="range"
                className="identity-slider"
                min={0}
                max={5000}
                step={50}
                value={Math.min(Math.max(Number(bioDeleteHold) || 0, 0), 5000)}
                disabled={!userId}
                onChange={(e) => handleBioDeleteHoldChange(e.target.value)}
              />
            </div>
          </div>

          <div className="identity-field-row identity-bio-tuning">
            <div className="identity-field identity-field--cursor">
              <span className="identity-field__label">Cursor</span>
              <input
                type="text"
                className="identity-input"
                maxLength={1}
                placeholder="|"
                value={bioCursor}
                disabled={!userId}
                onChange={(e) => handleBioCursorChange(e.target.value)}
              />
            </div>
          </div>
          </>
        ) : null}

        <div className="identity-bio-add">
          <span className="identity-bio-add__icon">
            <PaletteIcon />
          </span>
          <input
            type="text"
            className="identity-bio-add__input"
            placeholder="Add a bio line"
            value={newLine}
            disabled={!userId}
            onChange={(e) => setNewLine(e.target.value)}
            onKeyDown={handleNewLineKeyDown}
          />
          <button
            type="button"
            className="identity-bio-add__btn"
            disabled={!userId || !newLine.trim()}
            onClick={handleAddLine}
          >
            +
          </button>
        </div>

        <div className="identity-bio-lines">
          {bioLines.map((l) => (
            <div className="identity-bio-line" key={l.id}>
              <span className="identity-bio-line__text">{l.line}</span>
              <button
                type="button"
                className="identity-bio-line__remove"
                aria-label="Remove bio line"
                onClick={() => handleRemoveLine(l.id)}
              >
                X
              </button>
            </div>
          ))}
          {!loading && bioLines.length === 0 ? (
            <div className="identity-bio-lines__empty">No bio lines yet — add one above.</div>
          ) : null}
        </div>
      </div>
    </>
  );
}