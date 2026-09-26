"use client";

import "./RedirectCard.css";

export default function RedirectCard({ text = "Redirecting you now" }) {
  return (
    <div className="redirect-card">
      <span className="redirect-card__text">{text}</span>
      <span className="redirect-card__dots" aria-hidden="true">
        <span className="redirect-card__dot" />
        <span className="redirect-card__dot" />
        <span className="redirect-card__dot" />
      </span>
    </div>
  );
}
