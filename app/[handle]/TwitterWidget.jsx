import "./TwitterWidget.css";

// 1,234 -> "1.2K", 4,000,000 -> "4M". Matches the shorthand X itself uses.
function formatCount(n) {
  const v = Number(n) || 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) return `${(v / 1000).toFixed(v % 1000 >= 100 ? 1 : 0)}K`.replace(".0K", "K");
  return `${(v / 1_000_000).toFixed(v % 1_000_000 >= 100_000 ? 1 : 0)}M`.replace(".0M", "M");
}

/**
 * @param {{
 *   profile: {
 *     username: string,
 *     name: string,
 *     avatar: string | null,
 *     followers: number,
 *     following: number,
 *     verified: boolean,
 *   } | null | undefined,
 *   boxStyle?: Record<string, string>,
 * }} props
 */
export default function TwitterWidget({ profile, boxStyle }) {
  // X (or the public lookup) couldn't return this account — don't leave
  // visitors looking at an empty box (same rule as Discord).
  if (!profile) return null;

  return (
    <div className="xw" style={boxStyle}>
      <div className="xw__main">
        <div className="xw__avatar">
          <img src={profile.avatar || "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"} alt="" />
        </div>
        <div className="xw__who">
          <div className="xw__name-row">
            <span className="xw__name">{profile.name}</span>
            {profile.verified ? (
              <img className="xw__verified" src="/badges/verified.png" alt="Verified" title="Verified" />
            ) : null}
          </div>
          <div className="xw__handle">@{profile.username}</div>
        </div>

        <div className="xw__stats">
          <div className="xw__stat">
            <span className="xw__stat-num">{formatCount(profile.followers)}</span>
            <span className="xw__stat-label">Followers</span>
          </div>
          <div className="xw__stat">
            <span className="xw__stat-num">{formatCount(profile.following)}</span>
            <span className="xw__stat-label">Following</span>
          </div>
        </div>
      </div>
    </div>
  );
}