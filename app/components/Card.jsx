import "./Card.css";

export default function Card({ className = "", children, ...rest }) {
  return (
    <div className={`dash-card ${className}`} {...rest}>
      {children}
    </div>
  );
}
