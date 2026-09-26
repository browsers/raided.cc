"use client";

import { useRef, useState } from "react";
import "./AssetsUploader.css";

// One plain upload tile. Deliberately bare — no preview image is ever
// rendered here. `.asset-tile__icon` is an empty slot; drop a custom
// icon/img into it once the art's ready, it's already centered and
// sized for one.
function AssetTile({
  label,
  hint,
  inputType = "file",
  accept,
  multiple = false,
  cornerBadge,
  cornerControl,
  hasValue,
  colorValue,
  onFiles,
  onColorChange,
  onClear,
}) {
  const inputRef = useRef(null);

  return (
    <div
      className="asset-tile"
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
        <div
          className="asset-tile__icon"
          style={
            inputType === "color" && colorValue
              ? { background: colorValue }
              : undefined
          }
        />
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

export default function AssetsUploader() {
  const [avatarFile, setAvatarFile] = useState(null);

  const [bgMode, setBgMode] = useState("wallpaper");
  const [bgFile, setBgFile] = useState(null);
  const [bgColor, setBgColor] = useState(null);

  const [trackFiles, setTrackFiles] = useState([]);

  const bgHasValue = bgMode === "wallpaper" ? Boolean(bgFile) : Boolean(bgColor);

  return (
    <div className="assets-uploader">
      <AssetTile
        label="Avatar"
        hint={avatarFile ? "Click to change image" : "Click to upload image"}
        accept="image/*"
        cornerBadge=".JPG"
        hasValue={Boolean(avatarFile)}
        onFiles={(files) => setAvatarFile(files[0])}
        onClear={() => setAvatarFile(null)}
      />

      <AssetTile
        label="Background"
        hint={
          bgMode === "wallpaper"
            ? bgFile
              ? "Click to change wallpaper"
              : "Click to upload wallpaper"
            : bgColor
            ? `${bgColor} — click to change`
            : "Click to pick a color"
        }
        inputType={bgMode === "color" ? "color" : "file"}
        accept="image/*"
        colorValue={bgColor}
        cornerControl={
          <BackgroundModeToggle mode={bgMode} onChange={setBgMode} />
        }
        hasValue={bgHasValue}
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
