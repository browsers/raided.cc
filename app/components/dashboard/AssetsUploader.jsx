"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./AssetsUploader.css";

const BUCKETS = { avatar: "avatars", background: "backgrounds", track: "tracks" };

// Turns a File into an object URL and cleans up after itself when the
// file changes or the component unmounts. Used only for the instant
// local preview while an upload is in flight.
function useObjectUrl(file) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

// Picks a file extension: prefer the real filename, fall back to the
// mime type for pasted/blob files that don't have a normal name.
function getExtension(file) {
  const fromName = file.name?.split(".").pop();
  if (fromName && fromName.length <= 5 && /^[a-zA-Z0-9]+$/.test(fromName)) {
    return fromName.toLowerCase();
  }
  const byMime = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
  };
  return byMime[file.type] || "bin";
}

// Recovers the storage object path from one of our own public URLs, so
// we can delete the old file after a replace/clear.
function storagePathFromPublicUrl(url, bucket) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return url.slice(idx + marker.length);
  }
}

function inferKindFromUrl(url) {
  if (!url) return "image";
  const clean = url.split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov)$/.test(clean) ? "video" : "image";
}

// Uploads a file under a fresh, unique name (so browsers never show a
// stale cached copy at an old URL), then best-effort deletes whatever
// used to live at `prevUrl` so storage doesn't pile up old versions.
async function replaceFile(bucket, userId, prevUrl, file) {
  const path = `${userId}/${crypto.randomUUID()}.${getExtension(file)}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  const prevPath = storagePathFromPublicUrl(prevUrl, bucket);
  if (prevPath) {
    supabase.storage.from(bucket).remove([prevPath]).catch(() => {});
  }

  return data.publicUrl;
}

// One upload tile. Shows a live preview (image/gif/video) once a file
// is loaded, with the label + hint sitting on top of a dark scrim so
// they stay readable over any artwork. Falls back to a custom icon +
// label when empty.
function AssetTile({
  label,
  hint,
  hintTone = "default", // "default" | "saving" | "error"
  icon,
  inputType = "file",
  accept,
  multiple = false,
  cornerBadge,
  cornerControl,
  hasValue,
  colorValue,
  previewUrl,
  previewKind, // "image" | "video" | undefined
  onFiles,
  onColorChange,
  onClear,
}) {
  const inputRef = useRef(null);
  const showPreview = Boolean(previewUrl) || (inputType === "color" && Boolean(colorValue));

  return (
    <div
      className={`asset-tile${showPreview ? " asset-tile--filled" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      {inputType === "color" ? (
        <input
          ref={inputRef}
          type="color"
          hidden
          value={colorValue ?? "#ffffff"}
          onChange={(e) => onColorChange?.(e.target.value)}
        />
      ) : (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onChange={(e) => {
            if (e.target.files?.length) onFiles?.(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      )}

      {previewUrl ? (
        previewKind === "video" ? (
          <video
            className="asset-tile__preview"
            src={previewUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img className="asset-tile__preview" src={previewUrl} alt="" />
        )
      ) : inputType === "color" && colorValue ? (
        <div
          className="asset-tile__preview asset-tile__preview--color"
          style={{ background: colorValue }}
        />
      ) : null}

      {showPreview ? <div className="asset-tile__scrim" /> : null}

      {hasValue && onClear ? (
        <button
          type="button"
          className="asset-tile__clear"
          aria-label={`Clear ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          X
        </button>
      ) : null}

      <div className="asset-tile__corner">
        {cornerControl ??
          (cornerBadge ? (
            <span className="asset-tile__badge">{cornerBadge}</span>
          ) : null)}
      </div>

      <div className="asset-tile__body">
        {!showPreview && icon ? (
          <img className="asset-tile__icon" src={icon} alt="" />
        ) : null}
        <span className="asset-tile__label">{label}</span>
        <span
          className={`asset-tile__hint${
            hintTone !== "default" ? ` asset-tile__hint--${hintTone}` : ""
          }`}
        >
          {hint}
        </span>
      </div>
    </div>
  );
}

function BackgroundModeToggle({ mode, onChange }) {
  return (
    <div
      className="asset-tile__toggle"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`asset-tile__toggle-btn${
          mode === "wallpaper" ? " asset-tile__toggle-btn--active" : ""
        }`}
        onClick={() => onChange("wallpaper")}
      >
        Wallpaper
      </button>
      <button
        type="button"
        className={`asset-tile__toggle-btn${
          mode === "color" ? " asset-tile__toggle-btn--active" : ""
        }`}
        onClick={() => onChange("color")}
      >
        Color
      </button>
    </div>
  );
}

// Images + gifs accepted everywhere an image is accepted (browsers treat
// .gif as image/gif, so "image/*" already covers jpg/png/gif/webp/etc).
const AVATAR_ACCEPT = "image/*";
// Wallpaper accepts images, gifs, and video clips.
const BACKGROUND_ACCEPT = "image/*,video/mp4,video/webm,video/quicktime";

export default function AssetsUploader() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Avatar ----------------------------------------------------------
  const [avatarUrl, setAvatarUrl] = useState(null); // persisted
  const [avatarPendingFile, setAvatarPendingFile] = useState(null); // local, mid-upload
  const [avatarStatus, setAvatarStatus] = useState("idle"); // idle | saving | error
  const avatarLocalPreview = useObjectUrl(avatarPendingFile);

  // Background --------------------------------------------------------
  const [bgMode, setBgMode] = useState("wallpaper"); // persisted
  const [bgUrl, setBgUrl] = useState(null); // persisted (wallpaper)
  const [bgColor, setBgColor] = useState(null); // persisted (color)
  const [bgPendingFile, setBgPendingFile] = useState(null); // local, mid-upload
  const [bgStatus, setBgStatus] = useState("idle");
  const bgLocalPreview = useObjectUrl(bgPendingFile);

  // Tracks ------------------------------------------------------------
  const [tracks, setTracks] = useState([]); // [{ url, title }]
  const [trackStatus, setTrackStatus] = useState("idle");

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

      const [{ data: profile }, { data: trackRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("avatar_url, background_url, background_type, background_color")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("profile_tracks")
          .select("url, title")
          .eq("profile_id", user.id)
          .order("position", { ascending: true }),
      ]);

      if (cancelled) return;

      if (profile) {
        setAvatarUrl(profile.avatar_url ?? null);
        setBgMode(profile.background_type === "color" ? "color" : "wallpaper");
        setBgUrl(profile.background_url ?? null);
        setBgColor(profile.background_color ?? null);
      }
      if (trackRows) setTracks(trackRows);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- Avatar handlers -------------------------------------------------
  async function handleAvatarFiles(files) {
    const file = files[0];
    setAvatarPendingFile(file);
    setAvatarStatus("saving");
    try {
      if (!userId) throw new Error("Not signed in");
      const publicUrl = await replaceFile(BUCKETS.avatar, userId, avatarUrl, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (error) throw error;
      setAvatarUrl(publicUrl);
      setAvatarStatus("idle");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setAvatarStatus("error");
    } finally {
      setAvatarPendingFile(null);
    }
  }

  async function handleAvatarClear() {
    const prevUrl = avatarUrl;
    setAvatarUrl(null);
    setAvatarPendingFile(null);
    setAvatarStatus("idle");
    if (!userId) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    const path = storagePathFromPublicUrl(prevUrl, BUCKETS.avatar);
    if (path) supabase.storage.from(BUCKETS.avatar).remove([path]).catch(() => {});
  }

  // --- Background handlers ----------------------------------------------
  async function handleBackgroundFiles(files) {
    const file = files[0];
    setBgPendingFile(file);
    setBgStatus("saving");
    try {
      if (!userId) throw new Error("Not signed in");
      const publicUrl = await replaceFile(BUCKETS.background, userId, bgUrl, file);
      const { error } = await supabase
        .from("profiles")
        .update({ background_url: publicUrl, background_type: "wallpaper" })
        .eq("id", userId);
      if (error) throw error;
      setBgUrl(publicUrl);
      setBgStatus("idle");
    } catch (err) {
      console.error("Background upload failed:", err);
      setBgStatus("error");
    } finally {
      setBgPendingFile(null);
    }
  }

  async function handleBackgroundColorChange(value) {
    setBgColor(value);
    if (!userId) return;
    setBgStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ background_color: value, background_type: "color" })
      .eq("id", userId);
    setBgStatus(error ? "error" : "idle");
  }

  async function handleBackgroundModeChange(mode) {
    setBgMode(mode);
    if (!userId) return;
    await supabase.from("profiles").update({ background_type: mode }).eq("id", userId);
  }

  async function handleBackgroundClear() {
    if (bgMode === "wallpaper") {
      const prevUrl = bgUrl;
      setBgUrl(null);
      setBgPendingFile(null);
      setBgStatus("idle");
      if (!userId) return;
      await supabase.from("profiles").update({ background_url: null }).eq("id", userId);
      const path = storagePathFromPublicUrl(prevUrl, BUCKETS.background);
      if (path) supabase.storage.from(BUCKETS.background).remove([path]).catch(() => {});
    } else {
      setBgColor(null);
      if (!userId) return;
      await supabase.from("profiles").update({ background_color: null }).eq("id", userId);
    }
  }

  // --- Track handlers ------------------------------------------------
  async function handleTrackFiles(files) {
    setTrackStatus("saving");
    try {
      if (!userId) throw new Error("Not signed in");
      const fileList = Array.from(files);

      const uploaded = [];
      for (const file of fileList) {
        const path = `${userId}/${crypto.randomUUID()}.${getExtension(file)}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKETS.track)
          .upload(path, file, { upsert: true, cacheControl: "3600" });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(BUCKETS.track).getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, title: file.name.replace(/\.[^/.]+$/, "") });
      }

      // This picker replaces the whole track list, so clear out whatever
      // was there before (storage objects + rows) and write the new set.
      const oldPaths = tracks
        .map((t) => storagePathFromPublicUrl(t.url, BUCKETS.track))
        .filter(Boolean);
      if (oldPaths.length) {
        await supabase.storage.from(BUCKETS.track).remove(oldPaths).catch(() => {});
      }
      await supabase.from("profile_tracks").delete().eq("profile_id", userId);

      const rows = uploaded.map((t, i) => ({
        profile_id: userId,
        url: t.url,
        title: t.title,
        position: i,
      }));
      const { error: insErr } = await supabase.from("profile_tracks").insert(rows);
      if (insErr) throw insErr;

      setTracks(uploaded);
      setTrackStatus("idle");
    } catch (err) {
      console.error("Track upload failed:", err);
      setTrackStatus("error");
    }
  }

  async function handleTracksClear() {
    const oldPaths = tracks
      .map((t) => storagePathFromPublicUrl(t.url, BUCKETS.track))
      .filter(Boolean);
    setTracks([]);
    setTrackStatus("idle");
    if (!userId) return;
    if (oldPaths.length) {
      await supabase.storage.from(BUCKETS.track).remove(oldPaths).catch(() => {});
    }
    await supabase.from("profile_tracks").delete().eq("profile_id", userId);
  }

  // --- Derived display state ------------------------------------------
  const avatarPreviewUrl = avatarLocalPreview || avatarUrl;
  const bgPreviewUrl = bgMode === "wallpaper" ? bgLocalPreview || bgUrl : null;
  const bgPreviewKind = bgPendingFile
    ? bgPendingFile.type?.startsWith("video/")
      ? "video"
      : "image"
    : inferKindFromUrl(bgUrl);
  const bgHasValue = bgMode === "wallpaper" ? Boolean(bgUrl || bgPendingFile) : Boolean(bgColor);

  const avatarHint = !userId
    ? "Sign in to upload"
    : avatarStatus === "saving"
    ? "Uploading…"
    : avatarStatus === "error"
    ? "Upload failed — try again"
    : avatarPreviewUrl
    ? "Click to change image"
    : "Click to upload image";

  const backgroundHint = !userId
    ? "Sign in to upload"
    : bgStatus === "saving"
    ? "Saving…"
    : bgStatus === "error"
    ? "Save failed — try again"
    : bgMode === "wallpaper"
    ? bgPreviewUrl
      ? "Click to change wallpaper"
      : "Click to upload image, gif or video"
    : bgColor
    ? `${bgColor} — click to change`
    : "Click to pick a color";

  const trackHint = !userId
    ? "Sign in to upload"
    : trackStatus === "saving"
    ? "Uploading…"
    : trackStatus === "error"
    ? "Upload failed — try again"
    : tracks.length > 0
    ? `${tracks.length} track${tracks.length === 1 ? "" : "s"} loaded`
    : "Click to upload tracks";

  return (
    <div className="assets-uploader">
      <AssetTile
        label="Avatar"
        hint={loading ? "Loading…" : avatarHint}
        hintTone={avatarStatus === "error" ? "error" : avatarStatus === "saving" ? "saving" : "default"}
        icon="/icons/upload.png"
        accept={AVATAR_ACCEPT}
        cornerBadge="IMG/GIF"
        hasValue={Boolean(avatarPreviewUrl)}
        previewUrl={avatarPreviewUrl}
        previewKind="image"
        onFiles={handleAvatarFiles}
        onClear={handleAvatarClear}
      />

      <AssetTile
        label="Background"
        hint={loading ? "Loading…" : backgroundHint}
        hintTone={bgStatus === "error" ? "error" : bgStatus === "saving" ? "saving" : "default"}
        icon="/icons/upload.png"
        inputType={bgMode === "color" ? "color" : "file"}
        accept={BACKGROUND_ACCEPT}
        colorValue={bgColor}
        cornerControl={
          <BackgroundModeToggle mode={bgMode} onChange={handleBackgroundModeChange} />
        }
        hasValue={bgHasValue}
        previewUrl={bgPreviewUrl}
        previewKind={bgPreviewKind}
        onFiles={handleBackgroundFiles}
        onColorChange={handleBackgroundColorChange}
        onClear={handleBackgroundClear}
      />

      <AssetTile
        label="Music"
        hint={loading ? "Loading…" : trackHint}
        hintTone={trackStatus === "error" ? "error" : trackStatus === "saving" ? "saving" : "default"}
        icon="/icons/music.png"
        accept="audio/*"
        multiple
        cornerBadge=".MP3"
        hasValue={tracks.length > 0}
        onFiles={handleTrackFiles}
        onClear={handleTracksClear}
      />
    </div>
  );
}