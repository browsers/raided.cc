import Card from "./Card";
import "./OverviewRow.css";

export default function OverviewRow({ displayName, handle, completionPct, essentialsDone, essentialsTotal }) {
  return (
    <div className="dash-overview-row">
      <Card className="dash-overview-row__welcome">
        <div className="dash-card__eyebrow">Overview</div>
        <h2 className="dash-welcome__heading">Welcome back, {displayName}</h2>
        <span className="dash-welcome__handle">@{handle}</span>
        <span className="dash-welcome__rule" />
      </Card>

      <Card className="dash-overview-row__completion">
        <div className="dash-card__eyebrow">Profile Completion</div>
        <div className="dash-completion__pct">{completionPct}%</div>
        <div className="dash-completion__sub">
          {essentialsDone} of {essentialsTotal} essentials done
        </div>
        <div className="dash-progress-track">
          <div
            className="dash-progress-fill"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
