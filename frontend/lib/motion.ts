/**
 * Shared helpers for GSAP animation moments across BEICVS.
 * See the design spec, Part 3.4 (Motion rules) — every timeline must
 * respect prefers-reduced-motion, and no animation may block interaction.
 */
import { gsap } from "gsap";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Builds a GSAP timeline via `build(tl)`. If the viewer prefers reduced
 * motion, the timeline's animations are skipped and every affected target
 * is jumped straight to its end state with gsap.set() instead.
 */
export function safeTimeline(
  build: (tl: gsap.core.Timeline) => void,
  options?: gsap.TimelineVars
): gsap.core.Timeline {
  const tl = gsap.timeline(options);
  build(tl);
  if (prefersReducedMotion()) {
    tl.progress(1, false);
  }
  return tl;
}
