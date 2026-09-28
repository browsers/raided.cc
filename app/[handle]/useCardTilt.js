"use client";

import { useEffect } from "react";

// Highest tilt angle (degrees) at intensity 100. Kept modest so text stays
// readable and the badge tooltips (which are measured from the card's
// bounding box) don't drift noticeably.
const MAX_ANGLE = 20;
const PERSPECTIVE = 900;
// Reverse mode also lifts the card a touch so it feels like it's coming
// up to meet the cursor, not just rotating.
const REVERSE_SCALE = 1.03;

/**
 * 3D tilt (parallax) for the profile card.
 *
 * - normal:  the edge under your cursor pushes away from you
 * - reverse: the edge under your cursor comes closer to you
 *
 * Writes the transform straight onto the element (no React state), so
 * moving the mouse never re-renders the profile. Touch devices and people
 * with "reduce motion" on are skipped.
 */
export default function useCardTilt(ref, { enabled, intensity = 50, reverse = false }) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || intensity <= 0) return undefined;
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;

    const max = (intensity / 100) * MAX_ANGLE;
    const dir = reverse ? -1 : 1;

    // The card already fades/blurs in via CSS transitions (click-to-enter),
    // so keep those and add transform next to them instead of replacing.
    const base = "opacity 0.5s ease, filter 0.5s ease";
    const followTransition = `${base}, transform 0.12s ease-out`;
    const resetTransition = `${base}, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)`;

    let frame = 0;
    let lastEvent = null;

    function apply() {
      frame = 0;
      if (!lastEvent) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // -1..1 from the card's centre. Clamped so a fast mouse can't overshoot.
      const x = Math.max(-1, Math.min(1, ((lastEvent.clientX - rect.left) / rect.width - 0.5) * 2));
      const y = Math.max(-1, Math.min(1, ((lastEvent.clientY - rect.top) / rect.height - 0.5) * 2));
      const rotateX = -y * max * dir;
      const rotateY = x * max * dir;
      const scale = reverse ? REVERSE_SCALE : 1;
      el.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale})`;
    }

    function onEnter() {
      el.style.transition = followTransition;
    }

    function onMove(e) {
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    }

    function onLeave() {
      lastEvent = null;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      el.style.transition = resetTransition;
      el.style.transform = "";
    }

    el.style.willChange = "transform";
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
      el.style.transform = "";
      el.style.transition = "";
      el.style.willChange = "";
    };
  }, [ref, enabled, intensity, reverse]);
}
