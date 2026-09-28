"use client";

import { useEffect, useState } from "react";
import "./DiscordPresence.css";

// Presence comes from Lanyard (api.lanyard.rest). Discord only exposes live
// presence over its gateway, which needs a bot that shares a server with the
// user, so the bot token alone can't read it. Lanyard's bot does that part:
// the user joins discord.gg/lanyard once and their status shows up here.
// Their public API needs no key and allows browser requests.
const LANYARD = "https://api.lanyard.rest/v1/users/";
const POLL_MS = 30000;

const STATUS_LABEL = {
  online: "Online",
  idle: "Idle",
  dnd: "Do not disturb",
  offline: "Offline",
};

const KIND_LABEL = {
  0: "Playing",
  1: "Streaming",
  2: "Listening to",
  3: "Watching",
  5: "Competing in",
};

// Discord hands back a few different asset formats for activity art.
function activityImage(activity) {
  const img = activity?.assets?.large_image;
  if (!img) return null;
  if (img.startsWith("mp:external/")) return `https://media.discordapp.net/external/${img.slice(12)}`;
  if (img.startsWith("mp:")) return `https://media.discordapp.net/${img.slice(3)}`;
  if (img.startsWith("spotify:")) return `https://i.scdn.co/image/${img.slice(8)}`;
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png?size=128`;
  }
  return null;
}

function avatarUrl(user) {
  if (!user?.id || !user?.avatar) return "https://cdn.discordapp.com/embed/avatars/0.png";
  const ext = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
}

function pickActivity(data) {
  if (data.listening_to_spotify && data.spotify) {
    return {
      kind: "Listening to Spotify",
      name: data.spotify.song,
      detail: data.spotify.artist,
      image: data.spotify.album_art_url,
    };
  }
  const act = (data.activities ?? []).find((a) => a.type !== 4);
  if (!act) return null;
  return {
    kind: KIND_LABEL[act.type] ?? "Playing",
    name: act.name,
    detail: [act.details, act.state].filter(Boolean).join(" · "),
    image: activityImage(act),
  };
}

function CustomStatus({ activity }) {
  if (!activity) return null;
  const emoji = activity.emoji;
  const text = activity.state;
  if (!emoji && !text) return null;

  return (
    <div className="dpw__custom">
      {emoji?.id ? (
        <img
          className="dpw__emoji"
          src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=32`}
          alt=""
        />
      ) : emoji?.name ? (
        <span className="dpw__emoji-text">{emoji.name}</span>
      ) : null}
      {text ? <span className="dpw__custom-text">{text}</span> : null}
    </div>
  );
}

/**
 * @param {{
 *   userId: string,
 *   tag?: { tag: string, badgeUrl: string | null } | null,
 * }} props
 */
export default function DiscordPresence({ userId, tag = null }) {
  const [state, setState] = useState("loading"); // loading | ready | error
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${LANYARD}${userId}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json?.success && json.data) {
          setData(json.data);
          setState("ready");
        } else {
          // Not in the Lanyard server (or bad ID). Keep old data if we
          // already had some, otherwise show nothing.
          setState((s) => (s === "ready" ? s : "error"));
        }
      } catch {
        if (!cancelled) setState((s) => (s === "ready" ? s : "error"));
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [userId]);

  // Nothing to show: don't leave visitors looking at an empty box.
  if (state === "error") return null;

  // Reserves the space while loading so the card doesn't jump when the
  // presence arrives.
  if (state === "loading" || !data) {
    return <div className="dpw dpw--loading" aria-hidden="true" />;
  }

  const user = data.discord_user;
  const status = STATUS_LABEL[data.discord_status] ? data.discord_status : "offline";
  const name = user?.global_name || user?.display_name || user?.username || "Discord";
  const custom = (data.activities ?? []).find((a) => a.type === 4);
  const activity = status === "offline" ? null : pickActivity(data);

  return (
    <div className="dpw">
      <div className="dpw__main">
        <div className="dpw__avatar">
          <img src={avatarUrl(user)} alt="" />
          <span className={`dpw__dot dpw__dot--${status}`} title={STATUS_LABEL[status]} />
        </div>
        <div className="dpw__who">
          <div className="dpw__name-row">
            <span className="dpw__name">{name}</span>
            {tag ? (
              <span className="dpw__tag">
                {tag.badgeUrl ? <img src={tag.badgeUrl} alt="" /> : null}
                {tag.tag}
              </span>
            ) : null}
          </div>
          <CustomStatus activity={custom} />
          {!custom ? <div className="dpw__custom-text">{STATUS_LABEL[status]}</div> : null}
        </div>
      </div>

      {activity ? (
        <div className="dpw__activity">
          {activity.image ? (
            <img className="dpw__art" src={activity.image} alt="" />
          ) : (
            <span className="dpw__art dpw__art--empty" />
          )}
          <div className="dpw__atext">
            <div className="dpw__kind">{activity.kind}</div>
            <div className="dpw__aname">{activity.name}</div>
            {activity.detail ? <div className="dpw__adetail">{activity.detail}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
