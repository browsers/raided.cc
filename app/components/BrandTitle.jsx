"use client";

import FuzzyText from "./FuzzyText";
import "./BrandTitle.css";

// Tweak these two together — fuzzRange controls how far the ".cc" can jitter,
// FUZZ_PAD is how much extra canvas space FuzzyText reserves around the text
// (fuzzRange + 20px baked into the component), which we pull back with a
// negative margin so ".cc" sits snug against "raided" instead of floating
// off to the right.
// If you change FUZZ_RANGE, update the matching --brand-fuzz-pull
// (fuzzRange + 20) in BrandTitle.css so ".cc" stays snug against "raided".
const FUZZ_RANGE = 8;

export default function BrandTitle({ fontSize = "clamp(1.8rem, 6vw, 3rem)" }) {
  return (
    <div className="brand-title">
      <span className="brand-title__static" style={{ fontSize }}>
        raided
      </span>
      <FuzzyText
        fontSize={fontSize}
        fontWeight={600}
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
    </div>
  );
}
