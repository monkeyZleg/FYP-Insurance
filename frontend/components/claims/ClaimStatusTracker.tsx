"use client";

type Step = {
  label: string;
  description: string;
  done: boolean;
  active: boolean;
};

export default function ClaimStatusTracker({ status }: { status: string }) {
  const steps: Step[] = [
    {
      label: "Submitted",
      description: "Claim recorded",
      done: ["Submitted", "UnderReview", "Approved", "Rejected", "Settled"].includes(status),
      active: status === "Submitted",
    },
    {
      label: "Under Review",
      description: "Verifier assigned and reviewing",
      done: ["UnderReview", "Approved", "Rejected", "Settled"].includes(status),
      active: status === "UnderReview",
    },
    {
      label: "Decision",
      description:
        status === "Approved" || status === "Settled"
          ? "Claim approved"
          : status === "Rejected"
            ? "Claim rejected"
            : "Awaiting decision",
      done: ["Approved", "Rejected", "Settled"].includes(status),
      active: status === "Approved" || status === "Rejected",
    },
    {
      label: "Settled",
      description: status === "Settled" ? "Payout settled" : "Awaiting settlement",
      done: status === "Settled",
      active: status === "Settled",
    },
  ];

  return (
    <div className="flex items-center gap-0 flex-wrap">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.done
                  ? "bg-green-500 text-white"
                  : step.active
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </div>
            <span className="text-xs mt-1 text-center max-w-[80px]">
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-16 mx-2 ${step.done ? "bg-green-400" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
