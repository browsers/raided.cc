"use client";

import { useEffect, useRef, useState } from "react";
import TopBar from "./TopBar";
import Card from "./Card";
import { supabase } from "../../lib/supabaseClient";
import { isHex } from "../../lib/cardStyle";
import {
  LINKS_COLUMN,
  LINK_DEFAULTS,
  LINK_PLATFORMS as PLATFORMS,
  LINK_PLATFORM_BY_KEY as PLATFORM_BY_KEY,
  sanitizeLinks,
} from "../../lib/links";
import "./Profile.css";
import "./Appearance.css";
import "./Links.css";

// Saves to profiles.profile_links (jsonb). The platform list, defaults and
// validation all live in lib/links.js so this tab and the public profile
// always agree. To add a platform, drop its icon in public/link/ and add a
// line to LINK_PLATFORMS there.
const DEFAULT_ICON_COLOR = LINK_DEFAULTS.iconColor;
const DEFAULT_HOVER_COLOR = LINK_DEFAULTS.hoverColor;
const SAVE_DEBOUNCE_MS = 600;

// The icon PNGs are solid shapes, so they're drawn as a mask over a
// background colour. That's what lets the icon colour and hover colour
// actually tint them.
function Glyph({ src }) {
  return <span className="lk-glyph" style={{ "--lk-src": `url(${src})` }} aria-hidden="true" />;
}

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
      <circle cx="2.5" cy="3" r="1.2" />
      <circle cx="7.5" cy="3" r="1.2" />
      <circle cx="2.5" cy="8" r="1.2" />
      <circle cx="7.5" cy="8" r="1.2" />
      <circle cx="2.5" cy="13" r="1.2" />
      <circle cx="7.5" cy="13" r="1.2" />
    </svg>
  );
}

function ColorField({ label, value, onChange }) {
  const invalid = value.trim() !== "" && !isHex(value);
  return (
    <div className="lk-field">
      <span className="lk-label">{label}</span>
      <div className="lk-color">
        <label className="lk-color__swatch" style={{ background: isHex(value) ? value : "#000" }}>
          <input
            type="color"
            value={isHex(value) ? value : "#ffffff"}
            aria-label={label}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <input
          type="text"
          className={`lk-input${invalid ? " lk-input--invalid" : ""}`}
          value={value}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default function Links() {
  const [iconColor, setIconColor] = useState(DEFAULT_ICON_COLOR);
  const [hoverColor, setHoverColor] = useState(DEFAULT_HOVER_COLOR);
  const [links, setLinks] = useState([]); // [{ platform, url }]
  const [dragKey, setDragKey] = useState(null);
  const [overKey, setOverKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error

  const userIdRef = useRef(null);
  // Always the latest values, so a debounced save never works from stale state.
  const latest = useRef({ iconColor, hoverColor, links });
  const timer = useRef(null);
  const pending = useRef(false);

  async function save() {
    pending.current = false;
    if (!userIdRef.current) return;
    const { iconColor: ic, hoverColor: hc, links: items } = latest.current;
    // sanitizeLinks drops unknown/duplicate platforms and swaps a half-typed
    // hex for the default, so junk never reaches the database.
    const clean = sanitizeLinks({ iconColor: ic, hoverColor: hc, items });
    const { error } = await supabase
      .from("profiles")
      .update({ [LINKS_COLUMN]: clean })
      .eq("id", userIdRef.current);
    if (error) console.error("Links save failed:", error);
    setStatus(error ? "error" : "saved");
  }

  // Every change goes through here: update state, then save shortly after
  // (debounced so typing a URL isn't one request per keystroke).
  function commit(patch) {
    latest.current = { ...latest.current, ...patch };
    if ("links" in patch) setLinks(patch.links);
    if ("iconColor" in patch) setIconColor(patch.iconColor);
    if ("hoverColor" in patch) setHoverColor(patch.hoverColor);
    if (!userIdRef.current) return;
    pending.current = true;
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DEBOUNCE_MS);
  }

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

      const { data: row, error } = await supabase
        .from("profiles")
        .select(LINKS_COLUMN)
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        // Almost always "column does not exist" = migration not run yet.
        console.error("Links load failed:", error);
        setLoadError(error.message);
      } else {
        userIdRef.current = user.id;
        const saved = sanitizeLinks(row?.[LINKS_COLUMN]);
        latest.current = { iconColor: saved.iconColor, hoverColor: saved.hoverColor, links: saved.items };
        setIconColor(saved.iconColor);
        setHoverColor(saved.hoverColor);
        setLinks(saved.items);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      // Push anything still waiting so a quick tab switch doesn't lose it.
      if (pending.current) save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const has = (key) => links.some((l) => l.platform === key);

  // Clicking a platform adds it to the list, clicking it again takes it off.
  function togglePlatform(key) {
    commit({
      links: has(key)
        ? links.filter((l) => l.platform !== key)
        : [...links, { platform: key, url: "" }],
    });
  }

  function setUrl(key, url) {
    commit({ links: links.map((l) => (l.platform === key ? { ...l, url } : l)) });
  }

  function removeLink(key) {
    commit({ links: links.filter((l) => l.platform !== key) });
  }

  function moveTo(fromKey, toKey) {
    if (fromKey === toKey) return;
    const from = links.findIndex((l) => l.platform === fromKey);
    const to = links.findIndex((l) => l.platform === toKey);
    if (from < 0 || to < 0) return;
    const next = [...links];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit({ links: next });
  }

  // Colours only save once they're a real hex; until then the box just shows
  // what's being typed.
  function setColor(kind, v) {
    if (isHex(v)) commit({ [kind]: v });
    else if (kind === "iconColor") setIconColor(v);
    else setHoverColor(v);
  }

  function endDrag() {
    setDragKey(null);
    setOverKey(null);
  }

  const cssVars = {
    "--lk-icon": isHex(iconColor) ? iconColor : DEFAULT_ICON_COLOR,
    "--lk-hover": isHex(hoverColor) ? hoverColor : DEFAULT_HOVER_COLOR,
  };

  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Links" />

      <div className="dash-profile-body">
        <Card className="dash-profile-section lk-card" style={cssVars}>
          <div className="dash-card__eyebrow">
            LINKS{" "}
            {status === "saving" ? <span className="ap-hint">Saving…</span> : null}
            {status === "saved" ? <span className="ap-hint">Saved</span> : null}
            {status === "error" ? <span className="ap-hint ap-hint--error">Save failed</span> : null}
          </div>
          <h3 className="dash-profile-section__title">Links</h3>

          {loadError ? (
            <div className="ap-notice">
              Couldn't load your links: {loadError}. Make sure the profile_links column exists on
              profiles (run the SQL in the Supabase SQL editor), then refresh.
            </div>
          ) : null}

          <div className="lk-colors">
            <ColorField label="Icon Color" value={iconColor} onChange={(v) => setColor("iconColor", v)} />
            <ColorField label="Hover Color" value={hoverColor} onChange={(v) => setColor("hoverColor", v)} />
          </div>

          <div className="lk-section">
            <span className="lk-label">Platforms</span>
            <div className="lk-subtitle">Choose Icons</div>
            <div className="lk-platforms" role="group" aria-label="Platforms">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.label}
                  aria-label={p.label}
                  aria-pressed={has(p.key)}
                  disabled={loading || Boolean(loadError)}
                  className={`lk-platform${has(p.key) ? " lk-platform--active" : ""}`}
                  onClick={() => togglePlatform(p.key)}
                >
                  <Glyph src={p.icon} />
                </button>
              ))}
            </div>
          </div>

          <div className="lk-section">
            <span className="lk-label">Added Links</span>
            {links.length === 0 ? (
              <div className="lk-empty">Pick an icon above to add your first link.</div>
            ) : (
              <ul className="lk-rows">
                {links.map((l) => {
                  const p = PLATFORM_BY_KEY[l.platform];
                  return (
                    <li
                      key={l.platform}
                      className={`lk-row${dragKey === l.platform ? " lk-row--dragging" : ""}${
                        overKey === l.platform && dragKey !== l.platform ? " lk-row--over" : ""
                      }`}
                      draggable
                      onDragStart={(e) => {
                        setDragKey(l.platform);
                        e.dataTransfer.effectAllowed = "move";
                        // Firefox needs data set for the drag to start.
                        e.dataTransfer.setData("text/plain", l.platform);
                      }}
                      onDragOver={(e) => {
                        if (dragKey === null) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (overKey !== l.platform) setOverKey(l.platform);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragKey !== null) moveTo(dragKey, l.platform);
                        endDrag();
                      }}
                      onDragEnd={endDrag}
                    >
                      <span className="lk-grip" aria-hidden="true">
                        <GripIcon />
                      </span>
                      <span className="lk-row__icon">
                        <Glyph src={p.icon} />
                      </span>
                      <span className="lk-row__name">{p.label}</span>
                      <input
                        type="text"
                        className="lk-input lk-row__url"
                        value={l.url}
                        placeholder={p.placeholder}
                        spellCheck={false}
                        onChange={(e) => setUrl(l.platform, e.target.value)}
                      />
                      <button type="button" className="lk-remove" onClick={() => removeLink(l.platform)}>
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}