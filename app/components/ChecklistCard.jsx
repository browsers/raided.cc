import Card from "./Card";
import "./ChecklistCard.css";

export default function ChecklistCard({ title, subtitle, items }) {
  return (
    <Card className="dash-checklist">
      <h3 className="dash-checklist__title">{title}</h3>
      <div className="dash-card__eyebrow" style={{ marginBottom: 18 }}>
        {subtitle}
      </div>

      <ul className="dash-checklist__list">
        {items.map(({ label, icon: Icon, done }) => (
          <li key={label} className="dash-checklist__item">
            <Icon className="dash-checklist__icon" />
            <span className="dash-checklist__label">{label}</span>
            <span
              className={`dash-checklist__status${
                done ? " dash-checklist__status--done" : ""
              }`}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
