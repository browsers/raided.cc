"use client";

import BorderGlow from "./BorderGlow";
import "./RedirectCard.css";

export default function RedirectCard({ text = "Redirecting you now" }) {
  return (
    <BorderGlow
      className="redirect-card-glow"
      edgeSensitivity={35}
      glowColor="0 0 100"
      backgroundColor="rgba(18, 20, 16, 0.55)"
      borderRadius={12}
      glowRadius={22}
      glowIntensity={1.4}
      coneSpread={30}
      animated
      colors={["#ffffff", "#f5f5f5", "#e6e6e6"]}
    >
      <div className="redirect-card">
        <span className="redirect-card__text">{text}</span>
        <span className="redirect-card__dots" aria-hidden="true">
          <span className="redirect-card__dot" />
          <span className="redirect-card__dot" />
          <span className="redirect-card__dot" />
        </span>
      </div>
    </BorderGlow>
  );
}