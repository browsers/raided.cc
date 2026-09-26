import Card from "./Card";
import "./StatCards.css";

function StatCard({ iconSrc, label, value, sub }) {
  return (
    <Card className="dash-stat-card">
      <div className="dash-card__eyebrow">
        <img src={iconSrc} alt="" className="dash-card__eyebrow-icon" />
        {label}
      </div>
      <div className="dash-stat-card__value">{value}</div>
      <div className="dash-stat-card__sub">{sub}</div>
    </Card>
  );
}

export default function StatCards({ totalViews, uid, alias, accountAgeLabel, accountAgeDate }) {
  return (
    <div className="dash-stat-row">
      <StatCard
        iconSrc="/icons/graph.png"
        label="Total Views"
        value={totalViews.toLocaleString()}
        sub="All time"
      />
      <StatCard
        iconSrc="/icons/hashtag.png"
        label="UID"
        value={uid != null ? `#${uid}` : "—"}
        sub="Signup number"
      />
      <StatCard
        iconSrc="/icons/at.png"
        label="Alias"
        value={`@${alias}`}
        sub="Public handle"
      />
      <StatCard
        iconSrc="/icons/profile.png"
        label="Account Age"
        value={accountAgeLabel}
        sub={accountAgeDate}
      />
    </div>
  );
}