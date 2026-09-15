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
      description: "Claim recorded on blockchain",
      done: ["Pending", "UnderReview", "Approved", "Rejected"].includes(status),
      active: status === "Pending",
    },
    {
      label: "Under Review",
      description: "Verifier assigned and reviewing",
      done: ["UnderReview", "Approved", "Rejected"].includes(status),
      active: status === "UnderReview",
    },
    {
      label: "Decision",
      description:
        status === "Approved"
          ? "Claim approved"
          : status === "Rejected"
            ? "Claim rejected"
            : "Awaiting decision",
      done: ["Approved", "Rejected"].includes(status),
      active: ["Approved", "Rejected"].includes(status),
    },
  ];

  return (
    <div className="flex items-center gap-0">
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
