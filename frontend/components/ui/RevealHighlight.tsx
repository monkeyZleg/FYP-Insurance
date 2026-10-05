"use client";
import { useEffect } from "react";

/**
 * Fluent "reveal" lighting: any element with the `.reveal` class gets a soft
 * light that follows the pointer along its border. One listener for the page.
 */
export default function RevealHighlight() {
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    function apply() {
      frame = 0;
      if (!last) return;
      const el = (last.target as Element | null)?.closest?.<HTMLElement>(".reveal");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--rx", `${last.clientX - r.left}px`);
      el.style.setProperty("--ry", `${last.clientY - r.top}px`);
    }
    function onMove(e: PointerEvent) {
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    }
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
