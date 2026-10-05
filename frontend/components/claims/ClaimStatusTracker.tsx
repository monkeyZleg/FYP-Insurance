"use client";
import { CheckmarkRegular, DismissRegular } from "@fluentui/react-icons";

type Step = {
  label: string;
  description: string;
  done: boolean;
  active: boolean;
  failed?: boolean;
};

/**
 * Claim progress as a chain of links: each completed link fills, the current
 * one breathes, a rejection ends the chain in the critical colour.
 */
export default function ClaimStatusTracker({ status }: { status: string }) {
  const rejected = status === "Rejected";
  const steps: Step[] = [
    {
      label: "Submitted",
      description: "Claim recorded",
      done: ["Submitted", "UnderReview", "Approved", "Rejected", "Settled"].includes(status),
      active: status === "Submitted",
    },
    {
      label: "Under review",
      description: "Verifier assigned and reviewing",
      done: ["UnderReview", "Approved", "Rejected", "Settled"].includes(status),
      active: status === "UnderReview",
    },
    {
      label: "Decision",
      description:
        status === "Approved" || status === "Settled" ? "Claim approved" : rejected ? "Claim rejected" : "Awaiting decision",
      done: ["Approved", "Rejected", "Settled"].includes(status),
      active: status === "Approved" || rejected,
      failed: rejected,
    },
    {
      label: "Settled",
      description: status === "Settled" ? "Payout settled" : rejected ? "Not applicable" : "Awaiting settlement",
      done: status === "Settled",
      active: status === "Settled",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <ol className="relative grid grid-cols-1 gap-5 sm:grid-cols-4 sm:gap-2" aria-label="Claim progress">
      {/* connector track (horizontal on sm+, vertical on mobile) */}
      <span aria-hidden className="absolute hidden sm:block left-[12.5%] right-[12.5%] top-[15px] h-[2px] rounded-full bg-[var(--control-stroke-secondary)]" />
      <span
        aria-hidden
        className="absolute hidden sm:block left-[12.5%] top-[15px] h-[2px] rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.1,0.9,0.2,1)]"
        style={{
          width: `${(Math.max(0, doneCount - 1) / (steps.length - 1)) * 75}%`,
          background: rejected ? "linear-gradient(90deg, var(--success), var(--critical))" : "var(--success)",
        }}
      />
      <span aria-hidden className="absolute sm:hidden left-[15px] top-4 bottom-4 w-[2px] rounded-full bg-[var(--control-stroke-secondary)]" />

      {steps.map((step, i) => {
        const color = step.failed ? "var(--critical)" : step.done ? "var(--success)" : step.active ? "var(--accent-fill)" : undefined;
        return (
          <li
            key={step.label}
            aria-current={step.active ? "step" : undefined}
            className="enter relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span
              className="relative z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-full t-body-strong transition-colors duration-300"
              style={{
                background: color ?? "var(--solid-quarternary)",
                color: color ? "var(--text-on-accent)" : "var(--text-secondary)",
                boxShadow: color ? `0 0 0 4px color-mix(in srgb, ${color} 16%, transparent)` : "inset 0 0 0 1.5px var(--control-strong-stroke)",
              }}
            >
              {step.failed ? <DismissRegular fontSize={16} /> : step.done ? <CheckmarkRegular fontSize={16} /> : i + 1}
            </span>
            <span className="pt-1 sm:pt-0">
              <span className={`block t-body-strong ${step.done || step.active ? "text-fg" : "text-fg-2"}`}>{step.label}</span>
              <span className="block t-caption text-fg-2 mt-0.5">{step.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
