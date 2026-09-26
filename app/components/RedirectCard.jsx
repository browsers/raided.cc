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
      borderRadius={20}
      glowRadius={30}
      glowIntensity={1}
      coneSpread={30}
      fillOpacity={0}
      colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0.25)"]}
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