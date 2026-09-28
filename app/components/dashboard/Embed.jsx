"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  DEFAULT_ACCENT,
  EMBED_LIMITS,
  buildComponentEmbed,
  normalizeHex,
  normalizeUrl,
  sanitizeButtons,
} from "../../lib/discordEmbed";
import TopBar from "./TopBar";
import Card from "./Card";
import { replaceFile, storagePathFromPublicUrl } from "./AssetsUploader";
import "./Profile.css";
import "./Embed.css";

const EMBED_BUCKET = "embeds";
const SAVE_DEBOUNCE_MS = 600;

const EMBED_COLUMNS =
  "handle, display_name, embed_title, embed_description, embed_accent, embed_image_layout, embed_image_url, embed_buttons";

// Small "opens a link" arrow used on the link buttons, same idea as
// Discord's own link buttons.
function ExternalIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

let buttonIdCounter = 0;
const newButtonId = () => `btn-${Date.now()}-${buttonIdCounter++}`;

export default function Embed() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Identity, only used for the fallbacks the public page uses too
  // (blank title -> display name -> handle).
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Persisted embed fields ------------------------------------------
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState(DEFAULT_ACCENT); // what's typed in the box
  const [layout, setLayout] = useState("large"); // "small" | "large"
  const [imageUrl, setImageUrl] = useState(null);
  const [buttons, setButtons] = useState([]); // [{ id, label, url }]

  // Image upload state
  const [pendingFile, setPendingFile] = useState(null);
  const [imageStatus, setImageStatus] = useState("idle"); // idle | saving | error
  const [pendingPreview, setPendingPreview] = useState(null);

  // Save state for everything else: idle | saving | saved | error
  const [status, setStatus] = useState("idle");

  const userIdRef = useRef(null);
  const pending = useRef({}); // columns waiting for the next debounced flush
  const saveTimer = useRef(null);
  const imageInputRef = useRef(null);

  // Instant local preview of a file while it uploads.
  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  // --- Saving ------------------------------------------------------------
  async function flush() {
    const cols = pending.current;
    pending.current = {};
    if (!userIdRef.current || Object.keys(cols).length === 0) return;
    const { error } = await supabase.from("profiles").update(cols).eq("id", userIdRef.current);
    if (error) console.error("Embed save failed:", error);
    setStatus(error ? "error" : "saved");
  }

  // Merges into whatever's already waiting, then (re)starts the debounce, so
  // fast typing across several fields still ends up as one update.
  function queueSave(cols) {
    if (!userIdRef.current) return;
    Object.assign(pending.current, cols);
    setStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }

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
      userIdRef.current = user.id;

      const { data: row, error } = await supabase
        .from("profiles")
        .select(EMBED_COLUMNS)
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // Almost always "column ... does not exist" = migration not run yet.
        console.error("Embed load failed:", error);
        setLoadError(error.message);
      } else if (row) {
        setHandle(row.handle ?? "");
        setDisplayName(row.display_name ?? "");
        setTitle(row.embed_title ?? "");
        setDescription(row.embed_description ?? "");
        setAccent(normalizeHex(row.embed_accent) ?? DEFAULT_ACCENT);
        setLayout(row.embed_image_layout === "small" ? "small" : "large");
        setImageUrl(row.embed_image_url ?? null);
        setButtons(
          Array.isArray(row.embed_buttons)
            ? row.embed_buttons.map((b) => ({ id: newButtonId(), label: b.label ?? "", url: b.url ?? "" }))
            : // Never configured: same default the public page falls back to.
              [
                {
                  id: newButtonId(),
                  label: "Open page",
                  url: row.handle ? `${window.location.origin}/${row.handle}` : "",
                },
              ]
        );
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      // Don't lose an edit made in the last 600ms if they switch tabs.
      clearTimeout(saveTimer.current);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Field handlers ------------------------------------------------------
  function handleTitleChange(value) {
    const next = value.slice(0, EMBED_LIMITS.maxTitle);
    setTitle(next);
    queueSave({ embed_title: next.trim() || null });
  }

  function handleDescriptionChange(value) {
    const next = value.slice(0, EMBED_LIMITS.maxDescription);
    setDescription(next);
    queueSave({ embed_description: next.trim() ? next : null });
  }

  function handleAccentChange(value) {
    setAccent(value); // let them type freely...
    const hex = normalizeHex(value);
    if (hex) queueSave({ embed_accent: hex }); // ...only save real colors
  }

  function handleAccentBlur() {
    // Snap a half-typed / invalid value back to what's actually saved.
    setAccent(normalizeHex(accent) ?? DEFAULT_ACCENT);
  }

  function handleLayoutChange(next) {
    setLayout(next);
    queueSave({ embed_image_layout: next });
  }

  // Buttons: every edit re-saves the whole (valid) list.
  function commitButtons(next) {
    setButtons(next);
    queueSave({ embed_buttons: sanitizeButtons(next) });
  }

  function handleButtonChange(id, field, value) {
    commitButtons(buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }

  function handleButtonUrlBlur(id) {
    const b = buttons.find((x) => x.id === id);
    const fixed = b && normalizeUrl(b.url);
    if (fixed && fixed !== b.url) handleButtonChange(id, "url", fixed);
  }

  function handleAddButton() {
    if (buttons.length >= EMBED_LIMITS.maxButtons) return;
    setButtons([...buttons, { id: newButtonId(), label: "", url: "" }]);
  }

  function handleRemoveButton(id) {
    commitButtons(buttons.filter((b) => b.id !== id));
  }

  // --- Image ----------------------------------------------------------------
  async function handleImageFiles(files) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPendingFile(file);
    setImageStatus("saving");
    try {
      if (!userId) throw new Error("Not signed in");
      const publicUrl = await replaceFile(EMBED_BUCKET, userId, imageUrl, file);
      const { error } = await supabase
        .from("profiles")
        .update({ embed_image_url: publicUrl })
        .eq("id", userId);
      if (error) throw error;
      setImageUrl(publicUrl);
      setImageStatus("idle");
    } catch (err) {
      console.error("Embed image upload failed:", err);
      setImageStatus("error");
    } finally {
      setPendingFile(null);
    }
  }

  async function handleImageClear() {
    const prevUrl = imageUrl;
    setImageUrl(null);
    setPendingFile(null);
    setImageStatus("idle");
    if (!userId) return;
    await supabase.from("profiles").update({ embed_image_url: null }).eq("id", userId);
    const path = storagePathFromPublicUrl(prevUrl, EMBED_BUCKET);
    if (path) supabase.storage.from(EMBED_BUCKET).remove([path]).catch(() => {});
  }

  // --- Derived: exactly what the public page + Discord will use -----------
  const origin = typeof window === "undefined" ? "https://raided.cc" : window.location.origin;
  const previewTitle = title.trim() || displayName || handle || "Untitled";
  const previewButtons = useMemo(() => sanitizeButtons(buttons), [buttons]);
  const previewImage = pendingPreview || imageUrl;
  const accentHex = normalizeHex(accent) ?? DEFAULT_ACCENT;
  const accentInvalid = accent.trim() !== "" && !normalizeHex(accent);

  const built = useMemo(
    () =>
      buildComponentEmbed({
        title: previewTitle,
        description,
        accent: accentHex,
        layout,
        imageUrl: imageUrl ? normalizeUrl(imageUrl) : null,
        buttons: previewButtons,
        pageUrl: `${origin}/${handle}`,
      }),
    [previewTitle, description, accentHex, layout, imageUrl, previewButtons, origin, handle]
  );

  const imageHint = !userId
    ? "Sign in to upload"
    : imageStatus === "saving"
    ? "Uploading…"
    : imageStatus === "error"
    ? "Upload failed — try again"
    : previewImage
    ? "Click to replace image"
    : "Click to upload an image or gif";

  const statusLabel =
    status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed" : null;

  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Embed" />

      <div className="dash-profile-body">
        {loadError ? (
          <div className="embed-banner embed-banner--error" role="alert">
            Couldn&apos;t load your embed settings — the database is probably missing the embed columns.
            Run <code>supabase/embed_migration.sql</code> in the Supabase SQL editor, then refresh.
            <span className="embed-banner__detail">{loadError}</span>
          </div>
        ) : null}

        <div className="dash-embed-body">
          {/* Left: editor */}
          <Card className="dash-profile-section">
            <div className="embed-card-head">
              <div>
                <div className="dash-card__eyebrow">EMBED</div>
                <h3 className="dash-profile-section__title">Share Preview</h3>
              </div>
              {statusLabel ? (
                <span className={`embed-status embed-status--${status}`}>{statusLabel}</span>
              ) : null}
            </div>

            <div className="embed-field">
              <span className="embed-field__label">Title</span>
              <input
                type="text"
                className="embed-input"
                value={title}
                placeholder={displayName || handle || "Title"}
                maxLength={EMBED_LIMITS.maxTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div className="embed-field">
              <span className="embed-field__label">Description</span>
              <textarea
                className="embed-textarea"
                value={description}
                placeholder="Your description goes here"
                rows={4}
                maxLength={EMBED_LIMITS.maxDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
              />
              <span className="embed-field__hint">Supports Discord markdown (**bold**, *italic*, [links](https://…)).</span>
            </div>

            <div className="embed-row">
              <div className="embed-field embed-field--grow">
                <span className="embed-field__label">Accent Color</span>
                <div className="embed-color">
                  <label className="embed-color__swatch" style={{ background: accentHex }}>
                    <input
                      type="color"
                      value={accentHex}
                      aria-label="Pick accent color"
                      onChange={(e) => handleAccentChange(e.target.value)}
                    />
                  </label>
                  <input
                    type="text"
                    className={`embed-input${accentInvalid ? " embed-input--invalid" : ""}`}
                    value={accent}
                    maxLength={7}
                    spellCheck={false}
                    onChange={(e) => handleAccentChange(e.target.value)}
                    onBlur={handleAccentBlur}
                  />
                </div>
              </div>

              <div className="embed-field">
                <span className="embed-field__label">Image Layout</span>
                <div className="embed-toggle">
                  <button
                    type="button"
                    className={`embed-toggle__btn${layout === "small" ? " embed-toggle__btn--active" : ""}`}
                    onClick={() => handleLayoutChange("small")}
                  >
                    Small
                  </button>
                  <button
                    type="button"
                    className={`embed-toggle__btn${layout === "large" ? " embed-toggle__btn--active" : ""}`}
                    onClick={() => handleLayoutChange("large")}
                  >
                    Large
                  </button>
                </div>
              </div>
            </div>

            <div
              className="embed-image-tile"
              role="button"
              tabIndex={0}
              onClick={() => imageInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") imageInputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) handleImageFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) handleImageFiles(e.target.files);
                  e.target.value = ""; // allow re-selecting the same file
                }}
              />

              {previewImage ? (
                <>
                  <img className="embed-image-tile__preview" src={previewImage} alt="" />
                  <div className="embed-image-tile__scrim" />
                </>
              ) : null}

              {previewImage ? (
                <button
                  type="button"
                  className="embed-image-tile__clear"
                  aria-label="Remove embed image"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClear();
                  }}
                >
                  X
                </button>
              ) : null}

              <div className="embed-image-tile__body">
                <span className="embed-image-tile__label">Embed Image</span>
                <span
                  className={`embed-image-tile__hint${
                    imageStatus === "error" ? " embed-image-tile__hint--error" : ""
                  }`}
                >
                  {loading ? "Loading…" : imageHint}
                </span>
              </div>
            </div>

            <div className="embed-buttons">
              <div className="embed-buttons__header">
                <span className="embed-field__label">
                  Buttons ({buttons.length}/{EMBED_LIMITS.maxButtons})
                </span>
                <button
                  type="button"
                  className="embed-buttons__add"
                  onClick={handleAddButton}
                  disabled={buttons.length >= EMBED_LIMITS.maxButtons}
                >
                  + Add button
                </button>
              </div>

              {buttons.map((b) => {
                const urlBad = b.url.trim() !== "" && !normalizeUrl(b.url);
                return (
                  <div className="embed-button-row" key={b.id}>
                    <input
                      type="text"
                      className="embed-input embed-button-row__label"
                      value={b.label}
                      placeholder="Label"
                      maxLength={EMBED_LIMITS.maxLabel}
                      onChange={(e) => handleButtonChange(b.id, "label", e.target.value)}
                    />
                    <input
                      type="text"
                      className={`embed-input embed-button-row__url${urlBad ? " embed-input--invalid" : ""}`}
                      value={b.url}
                      placeholder="https://"
                      spellCheck={false}
                      onChange={(e) => handleButtonChange(b.id, "url", e.target.value)}
                      onBlur={() => handleButtonUrlBlur(b.id)}
                    />
                    <button
                      type="button"
                      className="embed-button-row__remove"
                      aria-label="Remove button"
                      onClick={() => handleRemoveButton(b.id)}
                    >
                      X
                    </button>
                  </div>
                );
              })}

              {buttons.length === 0 ? (
                <span className="embed-field__hint">No buttons — the embed shows just the card.</span>
              ) : (
                <span className="embed-field__hint">
                  Each button needs a label and a valid link to show up in Discord.
                </span>
              )}
            </div>
          </Card>

          {/* Right: live preview */}
          <Card className="dash-profile-section">
            <div className="dash-card__eyebrow">PREVIEW</div>
            <h3 className="dash-profile-section__title">Social Embed</h3>

            <div className="embed-preview">
              <span className="embed-preview__bar" style={{ background: accentHex }} />
              <div className="embed-preview__content">
                <div className="embed-preview__top">
                  <div className="embed-preview__text">
                    <div className="embed-preview__title">{previewTitle}</div>
                    {description ? <div className="embed-preview__desc">{description}</div> : null}
                  </div>
                  {layout === "small" && previewImage ? (
                    <img className="embed-preview__thumb" src={previewImage} alt="" />
                  ) : null}
                </div>

                {layout === "large" && previewImage ? (
                  <img className="embed-preview__image" src={previewImage} alt="" />
                ) : null}

                {previewButtons.length ? (
                  <>
                    <div className="embed-preview__divider" />
                    <div className="embed-preview__buttons">
                      {previewButtons.map((b, i) => (
                        <button type="button" className="embed-preview__button" key={i}>
                          <span>{b.label}</span>
                          <ExternalIcon />
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className={`embed-meter${built.trimmed || built.overLimit ? " embed-meter--warn" : ""}`}>
              <span>
                Discord payload: {built.bytes.toLocaleString()} / {EMBED_LIMITS.maxBytes.toLocaleString()} bytes
              </span>
              {built.trimmed ? (
                <span> — description is being trimmed to fit Discord&apos;s size limit.</span>
              ) : null}
              {built.overLimit ? (
                <span> — too large: Discord will fall back to a plain link preview. Shorten the title or button labels/links.</span>
              ) : null}
            </div>
            <div className="embed-meter">
              Discord caches previews — after saving, paste your link in a fresh message (or add a
              <code> ?v=2 </code>to the end) to see changes.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}