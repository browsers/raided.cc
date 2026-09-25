"use client";

import FuzzyText from "./FuzzyText";
import "./BrandTitle.css";

// IMPORTANT: fontSize must be a plain number (pixels), not a CSS string like
// "clamp(...)" or a value using vw/rem. Canvas's ctx.font doesn't reliably
// resolve viewport-relative units the same way the browser resolves them for
// normal HTML text, which is what made ".cc" render far bigger than "raided"
// and throw off the alignment. A plain pixel number guarantees both pieces
// use the exact same size.
const FONT_SIZE = 32; // px — bump this up/down to resize the whole title
const FONT_WEIGHT = 700;

// FuzzyText pads its canvas by (fuzzRange + 20)px on both left and right so
// the jitter never clips. BrandTitle.css pulls that padding back with
// negative margins (-26px = fuzzRange + 20) so ".cc" sits snug against
// "raided" and the row stays centered. If you change FUZZ_RANGE, update
// those margin values in BrandTitle.css to match.
const FUZZ_RANGE = 6;

export default function BrandTitle({ fontSize = FONT_SIZE }) {
  return (
    <div className="brand-title">
      <span className="brand-title__static" style={{ fontSize, fontWeight: FONT_WEIGHT }}>
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
    </div>
  );
}