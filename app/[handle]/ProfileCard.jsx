"use client";

import { useEffect, useRef, useState } from "react";
import FuzzyText from "../components/FuzzyText";
import WarpText from "../components/WarpText";
import DiscordPresence from "./DiscordPresence";
import TimeWidget from "./TimeWidget";
import { buildCardStyle, isCardLayout, withCardDefaults } from "../lib/cardStyle";
import { buildWidgetStyle } from "../lib/widgets";
import { withTiltDefaults } from "../lib/tilt";
import useCardTilt from "./useCardTilt";
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

// The Fuzzy username effect renders the name onto a <canvas>, so a plain
// CSS text-shadow (which only shadows real text) can't glow it — this
// gives the same GLOW_SHADOWS look via drop-shadow filters instead, which
// do work on canvas pixels.
const GLOW_DROP_SHADOWS = {
  off: "none",
  low: (c) => `drop-shadow(0 0 6px ${c})`,
  mid: (c) => `drop-shadow(0 0 6px ${c}) drop-shadow(0 0 16px ${c})`,
  high: (c) => `drop-shadow(0 0 8px ${c}) drop-shadow(0 0 20px ${c}) drop-shadow(0 0 40px ${c})`,
};

function glowDropShadow(style, color) {
  const fn = GLOW_DROP_SHADOWS[style] ?? GLOW_DROP_SHADOWS.mid;
  return typeof fn === "function" ? fn(color || "#ffffff") : fn;
}

function isVideoUrl(url) {
  if (!url) return false;
  return /\.(mp4|webm|mov)$/i.test(url.split("?")[0]);
}

// Cycles through bio lines one at a time, typing each one out and
// deleting it before moving to the next. Pure client-side timer loop —
// no external deps needed for something this small.
function useTypewriter(lines, active, typeMs, holdMs, deleteMs) {
  const [text, setText] = useState("");
  const timerRef = useRef(null);
  // `lines` is a brand-new array every render (built fresh in
  // ProfileCard below), even when the bio content hasn't actually
  // changed. Every setText() call here triggers a re-render, which
  // used to make the effect see a "new" `lines` and restart from
  // scratch — that's why it only ever typed 1-2 letters before
  // resetting. Depend on the actual content instead of the reference.
  const linesKey = lines.join("\n");

  useEffect(() => {
    if (!active || lines.length === 0) {
      setText("");
      return;
    }

    let lineIndex = 0;
    let charIndex = 0;
    let phase = "typing"; // "typing" | "holding" | "deleting"

    const TYPE_MS = typeMs;
    const DELETE_MS = deleteMs;
    const HOLD_MS = holdMs;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, active, typeMs, holdMs, deleteMs]);

  return text;
}

// badges: [{ id, icon (image url), label (alt/tooltip) }, ...]
// Passed in from page.tsx, already filtered to this profile's enabled
// badges and mapped through the shared badge catalog.
/**
 * @param {{
 *   profile: any,
 *   bioLines?: { line: string }[],
 *   badges?: { id: string, icon: string, label?: string }[],
 *   tracks?: { url: string, title?: string }[],
 *   discordTag?: { tag: string, badgeUrl: string | null } | null,
 *   widgets?: { id: string, platform: string, accountId: string }[],
 *   presences?: Record<string, any>,
 *   widgetStyle?: object | null,
 * }} props
 */
export default function ProfileCard({ profile, bioLines, badges = [], tracks = [], discordTag = null, widgets = [], presences = {}, widgetStyle = null }) {
  const {
    handle,
    display_name: displayName,
    avatar_url: avatarUrl,
    avatar_hidden: avatarHidden,
    background_url: backgroundUrl,
    background_type: backgroundType,
    background_color: backgroundColor,
    glow_color: glowColor,
    glow_style: glowStyle,
    font,
    font_target: fontTargetRaw,
    bio_type_speed_ms: bioTypeSpeedMs,
    bio_delete_hold_ms: bioDeleteHoldMs,
    bio_delete_speed_ms: bioDeleteSpeedMs,
    bio_cursor: bioCursor,
    username_effect: usernameEffect,
    uid,
    audio_muted: audioMuted,
    badges_animated: badgesAnimated,
    badge_color: badgeColor,
    badge_glow: badgeGlowRaw,
    discord_tag_size: discordTagSizeRaw,
    discord_tag_layout: discordTagLayoutRaw,
    // TODO: profile.avatar_disabled (or similar) once that toggle exists —
    // reference has a "disable pfp" setting we haven't built yet.
  } = profile;

  // Minimal (default) = no box. Card = boxed, styled from the Appearance tab.
  const boxed = isCardLayout(profile);
  const cardStyle = boxed ? buildCardStyle(profile) : undefined;

  const lines = (bioLines ?? []).map((l) => l.line).filter(Boolean);
  const isTypewriter = profile.bio_mode !== "static";
  // Clamp so a bad/blank saved value can't stall or spam the timer loop.
  const typeMs = Math.min(Math.max(Number(bioTypeSpeedMs) || 45, 5), 1000);
  const holdMs = Math.min(Math.max(Number(bioDeleteHoldMs) || 1400, 0), 10000);
  const deleteMs = Math.min(Math.max(Number(bioDeleteSpeedMs) || 25, 5), 1000);
  const cursorChar = (bioCursor ?? "|").toString().slice(0, 1) || "|";
  const typedText = useTypewriter(lines, isTypewriter && lines.length > 0, typeMs, holdMs, deleteMs);

  const name = displayName?.trim() || handle;
  const discordTagSize = ["sm", "md", "lg"].includes(discordTagSizeRaw) ? discordTagSizeRaw : "md";
  // "inline" = next to the name (default), otherwise stacked on its own line.
  const discordTagLayout = ["inline", "below_name", "below_badges"].includes(discordTagLayoutRaw)
    ? discordTagLayoutRaw
    : "inline";

  // Built once, placed in one of three spots below depending on layout.
  const discordTagEl = discordTag ? (
    <span
      className={`public-profile-card__discord-tag public-profile-card__discord-tag--${discordTagSize}${
        discordTagLayout === "inline" ? "" : " public-profile-card__discord-tag--stacked"
      }`}
    >
      {discordTag.badgeUrl ? (
        <img className="public-profile-card__discord-tag-badge" src={discordTag.badgeUrl} alt="" />
      ) : null}
      {discordTag.tag}
    </span>
  ) : null;

  // The saved font can be scoped to just the username, just the bio, just
  // the badge/UID tooltips, the historical "both" (username + bio), or
  // "all" of the above. "both" is the default so existing profiles saved
  // before this setting existed keep behaving exactly as they did.
  const fontStack = font ? `"${font}", var(--font-sans), sans-serif` : undefined;
  const fontTarget = fontTargetRaw || "both";
  const usernameFontFamily = ["username", "both", "tooltips_username", "all"].includes(fontTarget)
    ? fontStack
    : undefined;
  const bioFontFamily = ["bio", "both", "tooltips_bio", "all"].includes(fontTarget)
    ? fontStack
    : undefined;
  const tooltipFontFamily = ["tooltips", "tooltips_username", "tooltips_bio", "all"].includes(
    fontTarget
  )
    ? fontStack
    : undefined;

  const hasWallpaper = backgroundType !== "color" && Boolean(backgroundUrl);
  const hasColorBg = backgroundType === "color" && Boolean(backgroundColor);
  const hasVideoBg = hasWallpaper && isVideoUrl(backgroundUrl);
  const hasTracks = tracks.length > 0;
  const hasBadges = badges.length > 0;

  // Badge glow: "off" | "low" | "mid" | "high" from the dashboard. Each badge
  // glows in its own colour (--badge-glow), or in the custom badge colour
  // when one is set, so a recoloured set glows to match.
  const BADGE_GLOW_COLORS = {
    owner: "#ffb020",
    staff: "#00b7ff",
    partner: "#7b8ff0",
    "bug-hunter": "#3ddc84",
    verified: "#00a8f0",
    developer: "#e8e8e8",
  };
  const badgeGlow = ["low", "mid", "high"].includes(badgeGlowRaw) ? badgeGlowRaw : "off";
  const badgeGlowClass = badgeGlow === "off" ? "" : ` public-profile-card__badge--glow-${badgeGlow}`;
  const badgeGlowStyle = (badge) =>
    badgeGlow === "off" ? undefined : { "--badge-glow": badgeColor || BADGE_GLOW_COLORS[badge.id] || badge.glow || "#ffffff" };

  // A single floating tooltip, positioned relative to the card itself
  // rather than the badge's own CSS box. The badge row sits inside an
  // overflow:hidden strip (needed to hide the looping marquee copy),
  // and any tooltip anchored inside that strip gets sliced off
  // whenever it's wider than the badge or the badge sits near an edge.
  //
  // This can't just be position:fixed with raw viewport coordinates
  // either: .public-profile-card carries a permanent `filter: blur(0)`
  // (so the reveal-gate's blur transition has something to animate
  // from), and any non-none filter on an ancestor makes that ancestor
  // the positioning root for fixed descendants instead of the
  // viewport. So instead this measures the badge relative to the card
  // container itself and renders as a plain absolutely-positioned
  // child of that same container, which sidesteps the mismatch
  // entirely regardless of what filter/transform tricks live upstream.
  const cardRef = useRef(null);

  // 3D tilt only applies to the boxed (Card) layout, since Minimal has no
  // box to tilt. Settings come from the Appearance tab.
  const tilt = withTiltDefaults(profile);
  useCardTilt(cardRef, {
    enabled: boxed && tilt.tilt_enabled,
    intensity: tilt.tilt_intensity,
    reverse: tilt.tilt_reverse,
  });
  const [badgeTooltip, setBadgeTooltip] = useState({ label: "", x: 0, y: 0, visible: false });

  function showBadgeTooltip(e, label) {
    if (!label || !cardRef.current) return;
    const badge = e.currentTarget;
    const badgeRect = badge.getBoundingClientRect();

    // In the animated variant, the marquee only pauses once the mouse
    // is over it — so a badge can still be mid-scroll, partway behind
    // the edge of the visible strip, right when the hover fires. Don't
    // show a tooltip pointing at a sliver of a badge; wait until it's
    // basically fully in view. The static variant has no clip strip,
    // so this only kicks in when one is actually found.
    const clip = badge.closest(".public-profile-card__badges-clip");
    if (clip) {
      const clipRect = clip.getBoundingClientRect();
      const visibleLeft = Math.max(badgeRect.left, clipRect.left);
      const visibleRight = Math.min(badgeRect.right, clipRect.right);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);
      if (visibleWidth < badgeRect.width * 0.9) return;
    }

    const cardRect = cardRef.current.getBoundingClientRect();
    setBadgeTooltip({
      label,
      x: badgeRect.left + badgeRect.width / 2 - cardRect.left,
      y: badgeRect.top - cardRect.top - 8,
      visible: true,
    });
  }

  function hideBadgeTooltip() {
    setBadgeTooltip((t) => ({ ...t, visible: false }));
  }

  // Video backgrounds autoplay muted, and any uploaded track needs a user
  // gesture to play with sound at all — browsers block both without one.
  // So when there's audio to unlock, we gate the card behind a "click to
  // enter" overlay and use that click to unmute/play. Muting audio in the
  // dashboard skips the gate entirely (page just loads silent).
  const hasAudioContent = hasVideoBg || hasTracks;
  const gateEnabled = hasAudioContent && !audioMuted;

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [entered, setEntered] = useState(!gateEnabled);

  function handleEnter() {
    setEntered(true);
    const video = videoRef.current;
    const audio = audioRef.current;

    if (audio) {
      // An uploaded track is the intended "background music" — keep the
      // video's own audio muted so the two don't play over each other.
      audio.volume = 1;
      audio.play().catch(() => {});
    } else if (video) {
      video.muted = false;
      video.volume = 1;
      video.play().catch(() => {});
    }
  }

  // Logs this visit (once per browser per day — see /api/views) and
  // fetches the all-time total for the corner badge below.
  const [views, setViews] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setViews(data.views);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [handle]);

  const bio =
    lines.length > 0 ? (
      isTypewriter ? (
        <div className="public-profile-card__bio" style={{ fontFamily: bioFontFamily }}>
          {boxed ? (
            // Invisible copy of the longest line: the card sizes itself to
            // its content, so this keeps its width steady while the
            // typewriter types and deletes instead of growing/shrinking.
            <span className="public-profile-card__bio-sizer" aria-hidden="true">
              {lines.reduce((a, b) => (b.length > a.length ? b : a), "")}
            </span>
          ) : null}
          {typedText}
          <span className="public-profile-card__caret">{cursorChar}</span>
        </div>
      ) : (
        <div
          className="public-profile-card__bio public-profile-card__bio--static"
          style={{ fontFamily: bioFontFamily }}
        >
          {lines.map((line, i) => (
            <div key={i} className="public-profile-card__bio-line">
              {line}
            </div>
          ))}
        </div>
      )
    ) : null;


  // "Match card corners": the avatar borrows the card's corner radius (only
  // in the Card layout; minimal has no card, so it stays a rounded square).
  // border-radius clamps itself, so a big radius on a small avatar just
  // becomes a circle instead of breaking.
  const avatarStyle =
    boxed && profile.avatar_shape === "match"
      ? { borderRadius: `${withCardDefaults(profile).card_corner}px` }
      : avatarHidden && !boxed
        ? { visibility: "hidden" }
        : undefined;

  const avatarEl = avatarUrl && !(boxed && avatarHidden) ? (
          <div
            className={`public-profile-card__avatar${profile.avatar_shape === "circle" ? " public-profile-card__avatar--circle" : ""}`}
            // Hiding the avatar shouldn't reflow the card, the name
            // stays right where it was, so this keeps the 152x152 box
            // (and its margin) reserved and just hides the pixels.
            style={avatarStyle}
          >
            <img className="public-profile-card__avatar-img" src={avatarUrl} alt="" />
          </div>
        ) : null;

  const nameEl = (
          <h1
            className="public-profile-card__name"
            style={
              usernameEffect === "fuzzy" || usernameEffect === "warp"
                ? { fontFamily: usernameFontFamily, "--tooltip-font": tooltipFontFamily }
                : {
                    fontFamily: usernameFontFamily,
                    textShadow: glowTextShadow(glowStyle, glowColor),
                    "--tooltip-font": tooltipFontFamily,
                  }
            }
            data-tooltip={uid != null ? `UID: ${uid}` : undefined}
          >
            {usernameEffect === "fuzzy" || usernameEffect === "warp" ? (
              // The effect below is rendered position:absolute (so swapping
              // effects doesn't reflow the page), which means it contributes
              // nothing to this h1's own box size. min-height already covers
              // vertical space; this invisible copy of the plain name is
              // what reserves the correct *width* too, so the flex row
              // doesn't collapse the gap next to it (e.g. the Discord tag)
              // down to fit an empty box.
              <span aria-hidden="true" style={{ visibility: "hidden" }}>
                {name}
              </span>
            ) : null}
            {usernameEffect === "fuzzy" ? (
              <span
                className="public-profile-card__name-fuzzy"
                style={{ filter: glowDropShadow(glowStyle, glowColor) }}
              >
                <FuzzyText
                  fontSize={boxed ? 30 : 38}
                  fontWeight={800}
                  color="#f5f5f5"
                  enableHover
                  baseIntensity={0.12}
                  hoverIntensity={0.5}
                  fuzzRange={12}
                  transitionDuration={12}
                >
                  {name}
                </FuzzyText>
              </span>
            ) : usernameEffect === "warp" ? (
              <span
                className="public-profile-card__name-warp"
                style={{ filter: glowDropShadow(glowStyle, glowColor) }}
              >
                <WarpText
                  text={name}
                  color="#f5f5f5"
                  fontSize={boxed ? 30 : 38}
                  fontWeight={800}
                  fontFamily={usernameFontFamily}
                />
              </span>
            ) : (
              name
            )}
          </h1>
  );

  const badgesEl = hasBadges ? (
          badgesAnimated ? (
            <div
              className="public-profile-card__badges-marquee"
              style={{
                // Pin the visible window to exactly the width a static
                // pill would be for this many badges — the track behind
                // it holds two copies and is twice as wide, so this is
                // what actually gives overflow something to clip/scroll.
                width: `${6 + badges.length * 32}px`,
              }}
            >
              <div className="public-profile-card__badges-clip">
                <div className="public-profile-card__badges-track">
                  {[0, 1].map((copy) =>
                    badges.map((badge) => (
                      <span
                        key={`${copy}-${badge.id}`}
                        className={`public-profile-card__badge public-profile-card__badge--${badge.id}${badgeGlowClass}`}
                        style={badgeGlowStyle(badge)}
                        aria-hidden={copy === 1 ? "true" : undefined}
                        onMouseEnter={(e) => showBadgeTooltip(e, badge.label)}
                        onMouseLeave={hideBadgeTooltip}
                      >
                        {badgeColor ? (
                          <span
                            className="public-profile-card__badge-glyph"
                            style={{
                              backgroundColor: badgeColor,
                              WebkitMaskImage: `url(${badge.icon})`,
                              maskImage: `url(${badge.icon})`,
                            }}
                          />
                        ) : (
                          <img src={badge.icon} alt={copy === 0 ? badge.label ?? "" : ""} />
                        )}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="public-profile-card__badges">
              {badges.map((badge) => (
                <span
                  key={badge.id}
                  className={`public-profile-card__badge public-profile-card__badge--${badge.id}${badgeGlowClass}`}
                  style={badgeGlowStyle(badge)}
                  onMouseEnter={(e) => showBadgeTooltip(e, badge.label)}
                  onMouseLeave={hideBadgeTooltip}
                >
                  {badgeColor ? (
                    <span
                      className="public-profile-card__badge-glyph"
                      style={{
                        backgroundColor: badgeColor,
                        WebkitMaskImage: `url(${badge.icon})`,
                        maskImage: `url(${badge.icon})`,
                      }}
                    />
                  ) : (
                    <img src={badge.icon} alt={badge.label ?? ""} />
                  )}
                </span>
              ))}
            </div>
          )
        ) : null;

  const badgeTooltipEl = hasBadges ? (
          <div
            className={
              badgeTooltip.visible
                ? "public-profile-card__badge-tooltip public-profile-card__badge-tooltip--visible"
                : "public-profile-card__badge-tooltip"
            }
            style={{ top: badgeTooltip.y, left: badgeTooltip.x, fontFamily: tooltipFontFamily }}
          >
            {badgeTooltip.label}
          </div>
        ) : null;

  // Widgets from the dashboard's Widgets tab, in the order the user set.
  // Boxed: full width under the avatar + name row (left edge of the avatar
  // to the right edge of the badges). Minimal: centered under everything.
  // The guild tag was looked up for the profile's own Discord ID, so it only
  // rides along on a widget that uses that same ID.
  const widgetCornerRadius = boxed
    ? Math.min(Number(withCardDefaults(profile).card_corner) || 0, 18)
    : 14;
  const widgetsEl =
    widgets.length > 0 ? (
      <div
        className={`public-profile-card__widgets${boxed ? " public-profile-card__widgets--boxed" : ""}`}
        style={{ "--dpw-radius": `${widgetCornerRadius}px` }}
      >
        {widgets.map((w) => {
          if (w.platform === "discord-presence") {
            const effectiveStyle = w.style ?? widgetStyle;
            return (
              <DiscordPresence
                key={w.id}
                presence={presences[w.accountId] ?? null}
                boxStyle={buildWidgetStyle(effectiveStyle)}
                hover={effectiveStyle}
                tag={w.accountId === profile.discord_user_id ? discordTag : null}
              />
            );
          }
          if (w.platform === "current-time") {
            return (
              <TimeWidget
                key={w.id}
                zone={w.accountId}
                options={w.options}
                boxStyle={buildWidgetStyle(w.style ?? widgetStyle)}
              />
            );
          }
          return null;
        })}
      </div>
    ) : null;

  return (
    <main
      className={boxed ? "public-profile-page public-profile-page--boxed" : "public-profile-page"}
      style={hasColorBg ? { background: backgroundColor } : undefined}
    >
      {hasWallpaper ? (
        isVideoUrl(backgroundUrl) ? (
          <video
            ref={videoRef}
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

      <div
        ref={cardRef}
        className={[
          "public-profile-card",
          boxed ? "public-profile-card--boxed" : "",
          boxed && !avatarEl ? "public-profile-card--noavatar" : "",
          gateEnabled && !entered ? "public-profile-card--hidden" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={cardStyle}
      >
        {boxed ? (
          <>
          <div className="public-profile-card__row">
            {avatarEl}
            <div className="public-profile-card__info">
              <div className="public-profile-card__name-row">
                {nameEl}
                {badgesEl}
                {discordTagLayout === "inline" ? discordTagEl : null}
              </div>
              {discordTagLayout !== "inline" ? discordTagEl : null}
              {bio}
              {/* Profile links go here (under the bio) once that section is built. */}
            </div>
            {badgeTooltipEl}
          </div>
          {widgetsEl}
          </>
        ) : (
          <>
            {avatarEl}
            <div className="public-profile-card__name-row">
              {nameEl}
              {discordTagLayout === "inline" ? discordTagEl : null}
            </div>
            {discordTagLayout === "below_name" ? discordTagEl : null}
            {badgesEl}
            {badgeTooltipEl}
            {discordTagLayout === "below_badges" ? discordTagEl : null}
            {bio}
            {/* Links go here once that section is built. */}
            {widgetsEl}
          </>
        )}
      </div>

      {hasTracks && !audioMuted ? (
        <audio ref={audioRef} src={tracks[0].url} loop preload="auto" />
      ) : null}

      {gateEnabled && !entered ? (
        <button
          type="button"
          className="public-profile-enter"
          onClick={handleEnter}
        >
          <span className="public-profile-enter__label">click to enter</span>
        </button>
      ) : null}

      {views !== null ? (
        <div className="public-profile-views">
          <img src="/icons/view.png" alt="" className="public-profile-views__icon" />
          <span>{views.toLocaleString()}</span>
        </div>
      ) : null}
    </main>
  );
}