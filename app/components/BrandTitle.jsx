"use client";

import FuzzyText from "./FuzzyText";
import InfoButton from "./InfoButton";
import "./BrandTitle.css";

// Font size for the entire brand title
const FONT_SIZE = 32;
const FONT_WEIGHT = 700;

// FuzzyText padding range
const FUZZ_RANGE = 6;

export default function BrandTitle({ fontSize = FONT_SIZE }) {
  return (
    <div className="brand-title">
      <span
        className="brand-title__static"
        style={{
          fontSize,
          fontWeight: FONT_WEIGHT,
        }}
      >
        raided
      </span>

      <FuzzyText
        fontSize={fontSize}
        fontWeight={FONT_WEIGHT}
        color="#f5f5f5"
        enableHover
        baseIntensity={0.12}
        hoverIntensity={0.55}
        fuzzRange={FUZZ_RANGE}
        transitionDuration={12}
        className="brand-title__fuzzy"
      >
        .cc
      </FuzzyText>

      <div className="brand-title__info">
        <InfoButton />
      </div>
    </div>
  );
}