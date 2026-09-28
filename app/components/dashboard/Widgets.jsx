"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  MAX_WIDGETS,
  WIDGETS_COLUMN,
  isDiscordId,
  newWidgetId,
  sanitizeWidgets,
} from "../../lib/widgets";
import TopBar from "./TopBar";
import Card from "./Card";
import "./Profile.css";
import "./Appearance.css";
import "./Widgets.css";

// The list saves to profiles.widgets (see widgets_migration.sql) and is
// rendered on the public profile by [handle]/ProfileCard.jsx.
//
// To add a widget type later, add an entry here. The modal picker and the
// list both read from this array.
const PLATFORMS = [
  {
    key: "discord-presence",
    label: "Discord presence",
    icon: "/icons/discord.png",
    fieldLabel: "Discord user ID",
    placeholder: "123456789012345678",
    help: "Discord → Settings → Advanced → Developer Mode, then right-click your name → Copy User ID. You must also join discord.gg/lanyard so your status can be read.",
    valid: isDiscordId,
  },
];

const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map((p) => [p.key, p]));

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);

const GripIcon = () => (
  <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
    <circle cx="4" cy="4" r="1.4" />
    <circle cx="10" cy="4" r="1.4" />
    <circle cx="4" cy="9" r="1.4" />
    <circle cx="10" cy="9" r="1.4" />
    <circle cx="4" cy="14" r="1.4" />
    <circle cx="10" cy="14" r="1.4" />
  </svg>
);

function AddWidgetModal({ onClose, onAdd, existing }) {
  const [platformKey, setPlatformKey] = useState(PLATFORMS[0].key);
  const [accountId, setAccountId] = useState("");
  const inputRef = useRef(null);
  const platform = PLATFORM_BY_KEY[platformKey];
  const valid = platform.valid(accountId);
  const dup = valid && existing.some((w) => w.platform === platformKey && w.accountId === accountId.trim());
  const ok = valid && !dup;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (!ok) return;
    onAdd({ platform: platformKey, accountId: accountId.trim() });
  };

  return createPortal(
    <div
      className="wg-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="wg-modal" role="dialog" aria-modal="true" aria-labelledby="wg-modal-title">
        <button type="button" className="wg-modal__close" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>

        <h2 id="wg-modal-title" className="wg-modal__title">Add widget</h2>
        <p className="wg-modal__sub">Pick a platform, enter your account, and preview it before adding.</p>

        <div className="wg-platforms" role="radiogroup" aria-label="Platform">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={platformKey === p.key}
              className={`wg-platform${platformKey === p.key ? " wg-platform--active" : ""}`}
              onClick={() => setPlatformKey(p.key)}
            >
              <img src={p.icon} alt="" />
              {p.label}
            </button>
          ))}
        </div>

        <label className="ap-field wg-modal__field">
          <span className="wg-modal__label">{platform.fieldLabel}</span>
          <div className="wg-modal__inputrow">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              className="ap-input"
              placeholder={platform.placeholder}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            {/* Layout only — hooks up to the real lookup later. */}
            <button type="button" className="wg-btn wg-btn--ghost" disabled={!valid}>
              <SearchIcon />
              Preview
            </button>
          </div>
          {dup ? (
            <span className="wg-modal__help wg-modal__help--error">You already added this one.</span>
          ) : null}
          <span className="wg-modal__help">{platform.help}</span>
        </label>

        <div className="wg-modal__actions">
          <button type="button" className="wg-btn wg-btn--text" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wg-btn wg-btn--primary" disabled={!ok} onClick={submit}>
            Add widget
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Widgets() {
  const [widgets, setWidgets] = useState([]); // { id, platform, accountId }
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const userIdRef = useRef(null);

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

      const { data: row, error } = await supabase
        .from("profiles")
        .select(WIDGETS_COLUMN)
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        // Almost always "column does not exist" = migration not run yet.
        console.error("Widgets load failed:", error);
        setLoadError(error.message);
        userIdRef.current = null; // don't try to save into a missing column
      } else {
        setWidgets(sanitizeWidgets(row?.[WIDGETS_COLUMN]));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Every change (add, remove, reorder) updates the list and saves it.
  async function commit(next) {
    setWidgets(next);
    if (!userIdRef.current) return;
    setStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ [WIDGETS_COLUMN]: next })
      .eq("id", userIdRef.current);
    if (error) console.error("Widgets save failed:", error);
    setStatus(error ? "error" : "saved");
  }

  const atLimit = widgets.length >= MAX_WIDGETS;

  const addWidget = ({ platform, accountId }) => {
    commit([...widgets, { id: newWidgetId(), platform, accountId }]);
    setModalOpen(false);
  };

  const removeWidget = (id) => commit(widgets.filter((w) => w.id !== id));

  // Move `fromId` to the slot currently held by `toId`.
  const moveTo = (fromId, toId) => {
    if (fromId === toId) return;
    const from = widgets.findIndex((w) => w.id === fromId);
    const to = widgets.findIndex((w) => w.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...widgets];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  };

  // Keyboard reordering from the grip: ArrowUp / ArrowDown.
  const onGripKey = (e, id) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const i = widgets.findIndex((w) => w.id === id);
    const j = i + (e.key === "ArrowUp" ? -1 : 1);
    if (i < 0 || j < 0 || j >= widgets.length) return;
    const next = [...widgets];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const endDrag = () => {
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Widgets" />

      <div className="dash-profile-body">
        <Card className="dash-profile-section">
          <div className="wg-head">
            <div className="wg-head__text">
              <div className="dash-card__eyebrow">
                WIDGETS
                {status === "saving" ? <span className="ap-hint">Saving…</span> : null}
                {status === "saved" ? <span className="ap-hint">Saved</span> : null}
                {status === "error" ? <span className="ap-hint ap-hint--error">Save failed</span> : null}
              </div>
              <h3 className="wg-head__title">Profile Widgets</h3>
              <div className="wg-head__sub">
                Add live widgets to your profile and drag them into the order you want.
              </div>
            </div>
            <button
              type="button"
              className="wg-btn wg-btn--primary"
              disabled={loading || Boolean(loadError) || atLimit}
              title={atLimit ? `Max ${MAX_WIDGETS} widgets` : undefined}
              onClick={() => setModalOpen(true)}
            >
              <PlusIcon />
              Add Widget
            </button>
          </div>

          {loadError ? (
            <div className="ap-notice">
              Couldn't load your widgets. Run widgets_migration.sql in the Supabase SQL editor, then
              refresh.
            </div>
          ) : null}

          <div className="wg-list">
            {widgets.length === 0 ? (
              <div className="wg-empty">
                <strong>No widgets yet</strong>
                <span>Hit Add Widget to put your first one on your profile.</span>
              </div>
            ) : (
              <ul className="wg-rows">
                {widgets.map((w) => {
                  const p = PLATFORM_BY_KEY[w.platform];
                  return (
                    <li
                      key={w.id}
                      className={`wg-row${dragId === w.id ? " wg-row--dragging" : ""}${
                        overId === w.id && dragId !== w.id ? " wg-row--over" : ""
                      }`}
                      draggable
                      onDragStart={(e) => {
                        setDragId(w.id);
                        e.dataTransfer.effectAllowed = "move";
                        // Firefox needs data set for the drag to start.
                        e.dataTransfer.setData("text/plain", String(w.id));
                      }}
                      onDragOver={(e) => {
                        if (dragId === null) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (overId !== w.id) setOverId(w.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragId !== null) moveTo(dragId, w.id);
                        endDrag();
                      }}
                      onDragEnd={endDrag}
                    >
                      <button
                        type="button"
                        className="wg-grip"
                        aria-label={`Reorder ${p.label}. Use the up and down arrow keys.`}
                        onKeyDown={(e) => onGripKey(e, w.id)}
                      >
                        <GripIcon />
                      </button>
                      <span className="wg-row__icon">
                        <img src={p.icon} alt="" />
                      </span>
                      <div className="wg-row__text">
                        <div className="wg-row__name">{p.label}</div>
                        <div className="wg-row__hint">{w.accountId}</div>
                      </div>
                      <button
                        type="button"
                        className="wg-iconbtn"
                        aria-label={`Remove ${p.label}`}
                        onClick={() => removeWidget(w.id)}
                      >
                        <CloseIcon />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {modalOpen ? (
        <AddWidgetModal onClose={() => setModalOpen(false)} onAdd={addWidget} existing={widgets} />
      ) : null}
    </div>
  );
}