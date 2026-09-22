"use client";

/**
 * The BEICVS mascot — a friendly rounded shield character.
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
      <g id={`${id}-body`}>
        <path
          id={`${id}-shield`}
          d="M100 20 L170 50 V110 C170 150 140 180 100 190
             C60 180 30 150 30 110 V50 Z"
          fill="#3D4FE0"
        />
        <circle id={`${id}-eye-l`} cx="80" cy="95" r="6" fill="#10203D" />
        <circle id={`${id}-eye-r`} cx="120" cy="95" r="6" fill="#10203D" />
        {mood === "happy" ? (
          <path
            id={`${id}-mouth`}
            d="M80 118 Q100 138 120 118"
            stroke="#10203D"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <path
            id={`${id}-mouth`}
            d="M85 120 Q100 128 115 120"
            stroke="#10203D"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
}
