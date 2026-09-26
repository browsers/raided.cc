import Card from "./Card";
import { ChartIcon, LinkIcon, UserIcon, HashIcon } from "./icons";
import "./StatCards.css";

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card className="dash-stat-card">
      <div className="dash-card__eyebrow">
        <Icon width={14} height={14} />
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
        icon={ChartIcon}
        label="Total Views"
        value={totalViews.toLocaleString()}
        sub="All time"
      />
      <StatCard
        icon={HashIcon}
        label="UID"
        value={uid != null ? `#${uid}` : "—"}
        sub="Signup number"
      />
      <StatCard
        icon={LinkIcon}
        label="Alias"
        value={`@${alias}`}
        sub="Public handle"
      />
      <StatCard
        icon={UserIcon}
        label="Account Age"
        value={accountAgeLabel}
        sub={accountAgeDate}
      />
    </div>
  );
}