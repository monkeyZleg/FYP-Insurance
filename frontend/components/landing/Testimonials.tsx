"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Demo personas, one per role. All ChainIns data is simulated, and the section
// says so; these are not real customers.
const FEEDBACK = [
  {
    quote: "I filed my hospital claim from my phone and could see the moment a verifier picked it up. No more calling to ask where it is.",
    name: "Policyholder",
    tint: ["#7ea0ff", "#2a4fc4"],
  },
  {
    quote: "My queue shows the oldest claim first, and every decision I sign is on record under my own wallet. I never wonder who changed what.",
    name: "Claim verifier",
    tint: ["#5fd4c4", "#0e7a6f"],
  },
  {
    quote: "Assigning a week of claims takes a few clicks. When a payout is settled, the proof is already there for finance.",
    name: "Insurance admin",
    tint: ["#ffb35c", "#c75a12"],
  },
  {
    quote: "I paste a claim ID and get a match or mismatch in seconds. Checking a fingerprint beats reading through spreadsheets.",
    name: "Auditor",
    tint: ["#c9a2f7", "#7a35c4"],
  },
];

const HOLD_MS = 6500;

function initials(s: string) {
  return s
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Feedback carousel: one quote at a time, crossfading every few seconds.
 * All quotes share one grid cell so the section never changes height;
 * the outgoing quote fades up and out while the next fades in. Auto-advance
 * runs only while the section is on screen and pauses on hover, keyboard
 * focus, a hidden tab, and under reduced motion.
 */
export default function Testimonials({ serifClassName = "" }: { serifClassName?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const on = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  // Only rotate while the section is on screen, so nobody misses the first quote.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = useCallback((i: number) => setIndex((i + FEEDBACK.length) % FEEDBACK.length), []);

  const still = paused || reduced || hidden || !inView;
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => go(index + 1), HOLD_MS);
    return () => clearTimeout(id);
  }, [index, still, go]);

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="What people say about ChainIns"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="mx-auto max-w-[900px] px-4 py-24 text-center sm:px-8 sm:py-32">
        <div className="grid" aria-live={paused ? "polite" : "off"}>
          {FEEDBACK.map((f, i) => {
            const on = i === index;
            return (
              <figure
                key={f.name}
                aria-hidden={!on}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${FEEDBACK.length}`}
                className={`col-start-1 row-start-1 flex flex-col items-center transition-[opacity,transform,filter] ease-[cubic-bezier(0.1,0.9,0.2,1)] ${
                  on
                    ? "visible translate-y-0 opacity-100 blur-0 duration-[900ms] delay-200"
                    : "invisible -translate-y-2 opacity-0 blur-[3px] duration-500 [transition-property:opacity,transform,filter,visibility]"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-[76px] w-[76px] place-items-center rounded-[22px] font-display text-[26px] font-semibold text-white shadow-[0_18px_36px_-12px_rgba(16,24,64,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] transition-transform duration-[900ms] ease-[cubic-bezier(0.1,0.9,0.2,1)] ${
                    on ? "scale-100" : "scale-90"
                  }`}
                  style={{ background: `linear-gradient(145deg, ${f.tint[0]}, ${f.tint[1]})` }}
                >
                  {initials(f.name)}
                </span>
                <blockquote
                  className={`${serifClassName} mt-10 text-[clamp(24px,3.4vw,36px)] leading-[1.42] tracking-[-0.005em] text-fg [text-wrap:balance]`}
                >
                  &ldquo;{f.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-7 t-caption text-fg-3">– {f.name}</figcaption>
              </figure>
            );
          })}
        </div>

        {/* pager: the active pill fills over the hold time */}
        <div className="mt-12 flex items-center justify-center gap-2" role="tablist" aria-label="Choose feedback">
          {FEEDBACK.map((f, i) => {
            const on = i === index;
            return (
              <button
                key={f.name}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={`Show feedback from ${f.name.toLowerCase()}`}
                onClick={() => go(i)}
                className="group grid h-6 place-items-center px-0.5"
              >
                <span
                  className={`relative block h-1.5 overflow-hidden rounded-full bg-[var(--control-stroke-secondary)] transition-[width,background-color] duration-500 ease-[cubic-bezier(0.1,0.9,0.2,1)] group-hover:bg-[var(--control-strong-stroke)] ${
                    on ? "w-8" : "w-1.5"
                  }`}
                >
                  {on && (
                    <span
                      key={`${index}-${still}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-fill)]"
                      style={{
                        width: still ? "100%" : undefined,
                        animation: still ? undefined : `feedback-fill ${HOLD_MS}ms linear both`,
                      }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-6 t-caption text-fg-3">Illustrative feedback from the four demo roles — ChainIns is a student project.</p>
      </div>
    </section>
  );
}
