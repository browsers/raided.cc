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

    // Listen on the parent (the page), NOT the card itself. The card is
    // rotated by this very effect, so near an edge the tilted card can slide
    // out from under the cursor, the browser fires "pointerleave", the card
    // snaps flat, the cursor is over it again, it tilts again... and that
    // loop is the spazzing. The page never moves, so its events are stable,
    // and "is the cursor on the card?" is answered from the card's flat
    // (untransformed) layout box instead of its tilted one.
    const host = el.parentElement || window;

    let frame = 0;
    let lastEvent = null;
    let active = false;

    // Where the card sits on screen with no transform applied.
    function flatRect() {
      const parent = el.offsetParent || el.parentElement;
      const pr = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
      const left = pr.left + (parent ? parent.clientLeft : 0) + el.offsetLeft - (parent ? parent.scrollLeft : 0);
      const top = pr.top + (parent ? parent.clientTop : 0) + el.offsetTop - (parent ? parent.scrollTop : 0);
      return { left, top, width: el.offsetWidth, height: el.offsetHeight };
    }

    function apply() {
      frame = 0;
      if (!lastEvent) return;
      const rect = flatRect();
      if (rect.width === 0 || rect.height === 0) return;
      // -1..1 from the card's centre. Clamped so a fast mouse can't overshoot.
      const x = Math.max(-1, Math.min(1, ((lastEvent.clientX - rect.left) / rect.width - 0.5) * 2));
      const y = Math.max(-1, Math.min(1, ((lastEvent.clientY - rect.top) / rect.height - 0.5) * 2));
      const rotateX = -y * max * dir;
      const rotateY = x * max * dir;
      const scale = reverse ? REVERSE_SCALE : 1;
      el.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale})`;
    }

    function reset() {
      if (!active) return;
      active = false;
      lastEvent = null;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      el.style.transition = resetTransition;
      el.style.transform = "";
    }

    function onMove(e) {
      const r = flatRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.left + r.width &&
        e.clientY >= r.top && e.clientY <= r.top + r.height;
      if (!inside) {
        reset();
        return;
      }
      if (!active) {
        active = true;
        el.style.transition = followTransition;
      }
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    }

    el.style.willChange = "transform";
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", reset);

    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", reset);
      if (frame) cancelAnimationFrame(frame);
      el.style.transform = "";
      el.style.transition = "";
      el.style.willChange = "";
    };
  }, [ref, enabled, intensity, reverse]);
}