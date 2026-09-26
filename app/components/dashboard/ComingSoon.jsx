import "./ComingSoon.css";

export default function ComingSoon({ label = "Coming soon" }) {
  return (
    <div className="dash-coming-soon">
      <span className="dash-coming-soon__text">{label}</span>
    </div>
  );
}
