"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import Card from "./Card";
import "./Profile.css";
import "./Links.css";

// Layout only for now: nothing here saves and nothing shows on the public
// profile yet. To add a platform later, drop its icon in public/link/ and
// add an entry here. The picker grid and the list both read this array.
const PLATFORMS = [
  { key: "discord", label: "Discord", icon: "/link/discord.png", placeholder: "https://discord.gg/invite" },
  { key: "x", label: "X", icon: "/link/x.png", placeholder: "https://x.com/username" },
  { key: "tiktok", label: "TikTok", icon: "/link/tiktik.png", placeholder: "https://tiktok.com/@username" },
];

const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map((p) => [p.key, p]));

const DEFAULT_ICON_COLOR = "#ffffff";
const DEFAULT_HOVER_COLOR = "#ff0101";

const isHex = (v) => /^#([0-9a-fA-F]{6})$/.test(v);

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

  const has = (key) => links.some((l) => l.platform === key);

  // Clicking a platform adds it to the list, clicking it again takes it off.
  function togglePlatform(key) {
    setLinks((prev) =>
      prev.some((l) => l.platform === key)
        ? prev.filter((l) => l.platform !== key)
        : [...prev, { platform: key, url: "" }]
    );
  }

  function setUrl(key, url) {
    setLinks((prev) => prev.map((l) => (l.platform === key ? { ...l, url } : l)));
  }

  function removeLink(key) {
    setLinks((prev) => prev.filter((l) => l.platform !== key));
  }

  function moveTo(fromKey, toKey) {
    if (fromKey === toKey) return;
    setLinks((prev) => {
      const from = prev.findIndex((l) => l.platform === fromKey);
      const to = prev.findIndex((l) => l.platform === toKey);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
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
          <div className="dash-card__eyebrow">LINKS</div>
          <h3 className="dash-profile-section__title">Links</h3>

          <div className="lk-colors">
            <ColorField label="Icon Color" value={iconColor} onChange={setIconColor} />
            <ColorField label="Hover Color" value={hoverColor} onChange={setHoverColor} />
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
