import "./DiscordPresence.css";

// Presence is a snapshot the server took with the bot token
// (see app/lib/discordPresence.js) and passed down as props. It isn't live:
// it's as fresh as the last server-side refresh, and there's no polling here.
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

function pickActivity(activities) {
  const act = (activities ?? []).find((x) => x.type !== 4);
  if (!act) return null;

  // Spotify comes through as a Listening activity: details = song,
  // state = artists separated by ";".
  if (act.type === 2 && act.name === "Spotify") {
    return {
      kind: "Listening to Spotify",
      name: act.details || "Spotify",
      detail: (act.state ?? "").replace(/;\s*/g, ", "),
      image: activityImage(act),
    };
  }

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
 *   presence: {
 *     user: { id: string, username: string | null, global_name: string | null, avatar: string | null } | null,
 *     status: string,
 *     activities: any[],
 *   } | null | undefined,
 *   tag?: { tag: string, badgeUrl: string | null } | null,
 *   boxStyle?: Record<string, string>,
 * }} props
 */
export default function DiscordPresence({ presence, tag = null, boxStyle }) {
  // The bot couldn't see this user (not in a shared server, no token, gateway
  // down). Don't leave visitors looking at an empty box.
  if (!presence) return null;

  const user = presence.user;
  const status = STATUS_LABEL[presence.status] ? presence.status : "offline";
  const name = user?.global_name || user?.username || "Discord";
  const custom = (presence.activities ?? []).find((a) => a.type === 4);
  const activity = status === "offline" ? null : pickActivity(presence.activities);

  return (
    <div className="dpw" style={boxStyle}>
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