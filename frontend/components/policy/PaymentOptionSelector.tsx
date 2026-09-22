"use client";
import { INSTALMENT_OPTIONS } from "@/constants/policyPlans";
import type { PaymentMode } from "@/types";

export default function PaymentOptionSelector({
  mode,
  onModeChange,
  instalmentCount,
  onInstalmentCountChange,
  allowPayLater,
}: {
  mode: PaymentMode;
  onModeChange: (m: PaymentMode) => void;
  instalmentCount: number;
  onInstalmentCountChange: (n: number) => void;
  allowPayLater: boolean;
}) {
  const options: { value: PaymentMode; label: string; labelZh: string; hint: string; disabled?: boolean }[] = [
    { value: "PayNow", label: "Pay Now", labelZh: "一次付清", hint: "Pay the full premium now, policy becomes Active immediately" },
    { value: "Instalment", label: "Instalment", labelZh: "分期付款", hint: "Pay in 3, 6 or 12 monthly instalments" },
    {
      value: "PayLater",
      label: "Renew First, Pay Later",
      labelZh: "先续保后付款",
      hint: allowPayLater
        ? "Coverage stays continuous — pay in full within the 14-day grace period"
        : "Only available when renewing an existing policy",
      disabled: !allowPayLater,
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition-colors ${
            mode === o.value ? "border-chain-indigo bg-[#EEF0FC]" : "border-border"
          } ${o.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <input
            type="radio"
            name="paymentMode"
            checked={mode === o.value}
            disabled={o.disabled}
            onChange={() => onModeChange(o.value)}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-medium text-ink">
              {o.label} <span className="text-gray-400 font-normal">{o.labelZh}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{o.hint}</p>
          </div>
        </label>
      ))}

      {mode === "Instalment" && (
        <div className="flex gap-2 pl-8">
          {INSTALMENT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onInstalmentCountChange(n)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
                instalmentCount === n ? "bg-chain-indigo text-white" : "bg-white border border-border text-gray-600"
              }`}
            >
              {n}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
