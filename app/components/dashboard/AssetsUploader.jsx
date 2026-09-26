"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./AssetsUploader.css";

// Turns a File into an object URL and cleans up after itself when the
// file changes or the component unmounts.
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

// One upload tile. Shows a live preview (image/gif/video) once a file
// is loaded, with the label + hint sitting on top of a dark scrim so
// they stay readable over any artwork. Falls back to a custom icon +
// label when empty.
function AssetTile({
  label,
  hint,
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
        <span className="asset-tile__hint">{hint}</span>
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
  const [avatarFile, setAvatarFile] = useState(null);
  const avatarPreviewUrl = useObjectUrl(avatarFile);

  const [bgMode, setBgMode] = useState("wallpaper");
  const [bgFile, setBgFile] = useState(null);
  const [bgColor, setBgColor] = useState(null);
  const bgPreviewUrl = useObjectUrl(bgMode === "wallpaper" ? bgFile : null);
  const bgPreviewKind = useMemo(
    () => (bgFile?.type?.startsWith("video/") ? "video" : "image"),
    [bgFile]
  );

  const [trackFiles, setTrackFiles] = useState([]);

  const bgHasValue = bgMode === "wallpaper" ? Boolean(bgFile) : Boolean(bgColor);

  return (
    <div className="assets-uploader">
      <AssetTile
        label="Avatar"
        hint={avatarFile ? "Click to change image" : "Click to upload image"}
        icon="/icons/upload.png"
        accept={AVATAR_ACCEPT}
        cornerBadge="IMG/GIF"
        hasValue={Boolean(avatarFile)}
        previewUrl={avatarPreviewUrl}
        previewKind="image"
        onFiles={(files) => setAvatarFile(files[0])}
        onClear={() => setAvatarFile(null)}
      />

      <AssetTile
        label="Background"
        hint={
          bgMode === "wallpaper"
            ? bgFile
              ? "Click to change wallpaper"
              : "Click to upload image, gif or video"
            : bgColor
            ? `${bgColor} — click to change`
            : "Click to pick a color"
        }
        icon="/icons/upload.png"
        inputType={bgMode === "color" ? "color" : "file"}
        accept={BACKGROUND_ACCEPT}
        colorValue={bgColor}
        cornerControl={
          <BackgroundModeToggle mode={bgMode} onChange={setBgMode} />
        }
        hasValue={bgHasValue}
        previewUrl={bgPreviewUrl}
        previewKind={bgPreviewKind}
        onFiles={(files) => setBgFile(files[0])}
        onColorChange={(value) => setBgColor(value)}
        onClear={() =>
          bgMode === "wallpaper" ? setBgFile(null) : setBgColor(null)
        }
      />

      <AssetTile
        label="Music"
        hint={
          trackFiles.length > 0
            ? `${trackFiles.length} track${
                trackFiles.length === 1 ? "" : "s"
              } loaded`
            : "Click to upload tracks"
        }
        icon="/icons/music.png"
        accept="audio/*"
        multiple
        cornerBadge=".MP3"
        hasValue={trackFiles.length > 0}
        onFiles={(files) => setTrackFiles(Array.from(files))}
        onClear={() => setTrackFiles([])}
      />
    </div>
  );
}