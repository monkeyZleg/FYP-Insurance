"use client";
import { useCallback, useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-theme-pref"] });
  return () => obs.disconnect();
}

function resolve(pref: ThemePref) {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(pref: ThemePref) {
  try {
    localStorage.setItem("theme", pref);
  } catch {}
  const d = document.documentElement;
  d.setAttribute("data-theme-pref", pref);
  d.setAttribute("data-theme", resolve(pref));
}

/**
 * Theme preference backed by localStorage + the inline script in app/layout.tsx.
 * `setTheme(pref, origin)` plays a circular reveal from `origin` where the
 * View Transitions API is available and motion is allowed.
 */
export function useTheme() {
  const pref = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.getAttribute("data-theme-pref") as ThemePref) || "system",
    () => "system" as ThemePref
  );
  const resolved = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light",
    () => "light" as const
  );

  const setTheme = useCallback((next: ThemePref, origin?: { x: number; y: number }) => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduced || !origin || resolve(next) === document.documentElement.getAttribute("data-theme")) {
      apply(next);
      return;
    }
    const { x, y } = origin;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.classList.add("theme-vt");
    const vt = doc.startViewTransition(() => apply(next));
    vt.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 520, easing: "cubic-bezier(0.1, 0.9, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
        ).finished.finally(() => document.documentElement.classList.remove("theme-vt"));
      })
      .catch(() => document.documentElement.classList.remove("theme-vt"));
  }, []);

  return { pref, resolved, setTheme };
}
