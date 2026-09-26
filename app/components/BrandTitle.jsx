"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import FuzzyText from "./FuzzyText";
import "./BrandTitle.css";

// Font size for the entire brand title
const FONT_SIZE = 32;
const FONT_WEIGHT = 700;

// FuzzyText padding range
const FUZZ_RANGE = 6;

// Swap this out for whatever the real blurb should say.
const DESCRIPTION =
  "raided.cc is an invite-only exclusive biolink created by @hamfy, to get your own link press the request access button or message @hamfy on discord for faster responses.";

export default function BrandTitle({ fontSize = FONT_SIZE }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="brand-title-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
      </div>

      <AnimatePresence>
        {hovered ? (
          <motion.div
            className="brand-title__popover"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            role="tooltip"
          >
            <p className="brand-title__popover-text">{DESCRIPTION}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}