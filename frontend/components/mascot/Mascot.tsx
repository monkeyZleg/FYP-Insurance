"use client";

/**
 * The ChainIns mascot — a friendly rounded shield character.
 * Appears only on the policyholder-facing side, at onboarding, empty
 * states and claim outcomes (see design spec Part 1.5, Principle 4).
 * Never used on staff (verifier/admin/auditor) screens or shared chrome.
 */
export default function Mascot({
  mood = "neutral",
  className,
  id = "mascot",
}: {
  mood?: "neutral" | "happy";
  className?: string;
  id?: string;
}) {
  return (
    <svg
      id={id}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={mood === "happy" ? "Mascot smiling happily" : "Mascot"}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#7ea0ff" />
          <stop offset="0.55" stopColor="#3a63e0" />
          <stop offset="1" stopColor="#1f3c9c" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g id={`${id}-body`} style={{ transformOrigin: "100px 110px", transformBox: "view-box" }}>
        <path
          id={`${id}-shield`}
          d="M100 18c6 0 58 20 66 26 5 4 6 10 6 18v42c0 46-33 76-68 88-3 1-5 1-8 0-35-12-68-42-68-88V62c0-8 1-14 6-18 8-6 60-26 66-26Z"
          fill={`url(#${id}-fill)`}
        />
        <path d="M100 30c5 0 48 17 55 22 3 2 4 6 4 11v12c-30-8-88-8-118 0V63c0-5 1-9 4-11 7-5 50-22 55-22Z" fill={`url(#${id}-shine)`} />
        <circle id={`${id}-eye-l`} cx="78" cy="100" r="9" fill="#fff" />
        <circle id={`${id}-eye-r`} cx="122" cy="100" r="9" fill="#fff" />
        <circle cx="80" cy="102" r="4.5" fill="#0d1b4d" />
        <circle cx="124" cy="102" r="4.5" fill="#0d1b4d" />
        {mood === "happy" ? (
          <path id={`${id}-mouth`} d="M80 124 Q100 146 120 124" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
        ) : (
          <path id={`${id}-mouth`} d="M86 128 Q100 136 114 128" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
        )}
        <circle cx="64" cy="122" r="7" fill="#ff8fb1" opacity="0.45" />
        <circle cx="136" cy="122" r="7" fill="#ff8fb1" opacity="0.45" />
      </g>
    </svg>
  );
}
