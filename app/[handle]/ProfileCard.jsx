"use client";

import { useEffect, useRef, useState } from "react";
import "./ProfileCard.css";

const GLOW_SHADOWS = {
  off: "none",
  low: (c) => `0 0 6px ${c}`,
  mid: (c) => `0 0 6px ${c}, 0 0 16px ${c}`,
  high: (c) => `0 0 8px ${c}, 0 0 20px ${c}, 0 0 40px ${c}`,
};

function glowTextShadow(style, color) {
  const fn = GLOW_SHADOWS[style] ?? GLOW_SHADOWS.mid;
  return typeof fn === "function" ? fn(color || "#ffffff") : fn;
}

function isVideoUrl(url) {
  if (!url) return false;
  return /\.(mp4|webm|mov)$/i.test(url.split("?")[0]);
}

// Cycles through bio lines one at a time, typing each one out and
// deleting it before moving to the next. Pure client-side timer loop —
// no external deps needed for something this small.
function useTypewriter(lines, active) {
  const [text, setText] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active || lines.length === 0) {
      setText("");
      return;
    }

    let lineIndex = 0;
    let charIndex = 0;
    let phase = "typing"; // "typing" | "holding" | "deleting"

    const TYPE_MS = 45;
    const DELETE_MS = 25;
    const HOLD_MS = 1400;
    const GAP_MS = 300;

    function tick() {
      const line = lines[lineIndex] ?? "";

      if (phase === "typing") {
        charIndex += 1;
        setText(line.slice(0, charIndex));
        if (charIndex >= line.length) {
          phase = "holding";
          timerRef.current = setTimeout(tick, HOLD_MS);
        } else {
          timerRef.current = setTimeout(tick, TYPE_MS);
        }
        return;
      }

      if (phase === "holding") {
        phase = "deleting";
        timerRef.current = setTimeout(tick, DELETE_MS);
        return;
      }

      // deleting
      charIndex -= 1;
      setText(line.slice(0, charIndex));
      if (charIndex <= 0) {
        lineIndex = (lineIndex + 1) % lines.length;
        phase = "typing";
        timerRef.current = setTimeout(tick, GAP_MS);
      } else {
        timerRef.current = setTimeout(tick, DELETE_MS);
      }
    }

    timerRef.current = setTimeout(tick, GAP_MS);
    return () => clearTimeout(timerRef.current);
  }, [lines, active]);

  return text;
}

// badges: [{ id, icon (image url), label (alt/tooltip) }, ...]
// Not wired to a data source yet — dashboard/badges is still "coming soon" —
// so this always renders empty for now. Pass real data in once that's built.
export default function ProfileCard({ profile, bioLines, badges = [] }) {
  const {
    handle,
    display_name: displayName,
    avatar_url: avatarUrl,
    background_url: backgroundUrl,
    background_type: backgroundType,
    background_color: backgroundColor,
    glow_color: glowColor,
    glow_style: glowStyle,
    font,
    // TODO: profile.avatar_disabled (or similar) once that toggle exists —
    // reference has a "disable pfp" setting we haven't built yet.
  } = profile;

  const lines = (bioLines ?? []).map((l) => l.line).filter(Boolean);
  const isTypewriter = profile.bio_mode !== "static";
  const typedText = useTypewriter(lines, isTypewriter && lines.length > 0);

  const name = displayName?.trim() || handle;
  const fontFamily = font ? `"${font}", var(--font-sans), sans-serif` : undefined;

  const hasWallpaper = backgroundType !== "color" && Boolean(backgroundUrl);
  const hasColorBg = backgroundType === "color" && Boolean(backgroundColor);
  const hasBadges = badges.length > 0;

  const bio =
    lines.length > 0 ? (
      isTypewriter ? (
        <div className="public-profile-card__bio" style={{ fontFamily }}>
          {typedText}
          <span className="public-profile-card__caret" />
        </div>
      ) : (
        <div
          className="public-profile-card__bio public-profile-card__bio--static"
          style={{ fontFamily }}
        >
          {lines.map((line, i) => (
            <div key={i} className="public-profile-card__bio-line">
              {line}
            </div>
          ))}
        </div>
      )
    ) : null;

  return (
    <main
      className="public-profile-page"
      style={hasColorBg ? { background: backgroundColor } : undefined}
    >
      {hasWallpaper ? (
        isVideoUrl(backgroundUrl) ? (
          <video
            className="public-profile-page__bg"
            src={backgroundUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img className="public-profile-page__bg" src={backgroundUrl} alt="" />
        )
      ) : null}
      {hasWallpaper ? <div className="public-profile-page__bg-scrim" /> : null}

      <div className="public-profile-card">
        {avatarUrl ? (
          <div className="public-profile-card__avatar">
            <img className="public-profile-card__avatar-img" src={avatarUrl} alt="" />
          </div>
        ) : null}

        <h1
          className="public-profile-card__name"
          style={{ fontFamily, textShadow: glowTextShadow(glowStyle, glowColor) }}
        >
          {name}
        </h1>

        {hasBadges ? (
          <div className="public-profile-card__badges">
            {badges.map((badge) => (
              <span key={badge.id} className="public-profile-card__badge" title={badge.label}>
                <img src={badge.icon} alt={badge.label ?? ""} />
              </span>
            ))}
          </div>
        ) : null}

        {bio}

        {/* Links go here once that section is built. */}
      </div>
    </main>
  );
}