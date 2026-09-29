"use client";

import { useEffect } from "react";

// Small mouse-tracking tilt + glow for widget boxes (Discord presence,
// current time, ...) — same idea as the profile card's 3D tilt
// (useCardTilt.js) but lighter, since a widget is small and usually sits
// close to the edge of the page.
//
// "Reactivity" is 1-5 from the dashboard slider, not 0-100 like the card,
// so it's mapped to a max angle here rather than stored as degrees.
const REACTIVITY_ANGLES = { 1: 3, 2: 5, 3: 8, 4: 11, 5: 15 };
const PERSPECTIVE = 500;

export default function useWidgetHover(ref, { enabled, reactivity = 3 }) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;

    const max = REACTIVITY_ANGLES[reactivity] ?? REACTIVITY_ANGLES[3];

    // Same fix as the card's tilt: listen on the parent, and hit-test
    // against the widget's own flat (untransformed) box. The widget is
    // rotated by this effect, so near an edge a tilted widget can slip out
    // from under the cursor; if we listened on the widget itself, that
    // would fire "leave", snap it flat, put the cursor back over it, tilt
    // again — the same fast spazzing the card had.
    const host = el.parentElement || window;

    let frame = 0;
    let lastEvent = null;
    let active = false;

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
      const x = Math.max(-1, Math.min(1, ((lastEvent.clientX - rect.left) / rect.width - 0.5) * 2));
      const y = Math.max(-1, Math.min(1, ((lastEvent.clientY - rect.top) / rect.height - 0.5) * 2));
      const rotateX = -y * max;
      const rotateY = x * max;
      el.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`;
      el.style.setProperty("--dpw-hover-glow", (0.15 + (max / 15) * 0.25).toFixed(2));
    }

    function reset() {
      if (!active) return;
      active = false;
      lastEvent = null;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      el.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = "";
      el.style.removeProperty("--dpw-hover-glow");
      el.classList.remove("dpw--hovering");
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
        el.style.transition = "transform 0.12s ease-out";
        el.classList.add("dpw--hovering");
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
      el.style.removeProperty("--dpw-hover-glow");
      el.classList.remove("dpw--hovering");
    };
  }, [ref, enabled, reactivity]);
}
