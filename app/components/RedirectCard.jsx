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
      glowRadius={14}
      glowIntensity={0.3}
      coneSpread={35}
      fillOpacity={0.08}
      colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0.3)", "rgba(255,255,255,0.2)"]}
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