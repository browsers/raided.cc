"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import "./InfoButton.css";

// Swap this out for whatever the real blurb should say.
const DEFAULT_DESCRIPTION =
  "raided.cc is a bio-link profile page — one link that brings together your socials, music, and highlights in one place.";

export default function InfoButton({
  label = "What is raided.cc?",
  description = DEFAULT_DESCRIPTION,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;

    const handlePointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="info-button-wrap" ref={wrapRef}>
      <button
        type="button"
        className="info-button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <img
          src="/icons/info.png"
          alt=""
          className="info-button__icon"
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="info-popover"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
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
