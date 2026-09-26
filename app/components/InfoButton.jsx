"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import "./InfoButton.css";

// Swap this out for whatever the real blurb should say.
const DEFAULT_DESCRIPTION =
  "raided.cc is an invite-only exclusive biolink created by @hamfy, if you looking to create you own page on here message me on discord / @hamfy";

export default function InfoButton({
  label = "What is raided.cc?",
  description = DEFAULT_DESCRIPTION,
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="info-button-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src="/icons/info.png"
        alt={label}
        className="info-button__icon"
      />

      <AnimatePresence>
        {hovered ? (
          <motion.div
            className="info-popover"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            role="tooltip"
          >
            <p className="info-popover__text">{description}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}