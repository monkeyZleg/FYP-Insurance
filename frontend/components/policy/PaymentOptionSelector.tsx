"use client";
import { ArrowRepeatAllRegular, CalendarLtrRegular, FlashRegular } from "@fluentui/react-icons";
import { INSTALMENT_OPTIONS } from "@/constants/policyPlans";
import SelectorBar from "@/components/ui/SelectorBar";
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
  const options = [
    { value: "PayNow" as const, Icon: FlashRegular, label: "Pay now", labelZh: "一次付清", hint: "Pay the full premium now — the policy becomes Active immediately." },
    { value: "Instalment" as const, Icon: CalendarLtrRegular, label: "Instalment", labelZh: "分期付款", hint: "Spread the premium over 3, 6 or 12 monthly instalments." },
    {
      value: "PayLater" as const,
      Icon: ArrowRepeatAllRegular,
      label: "Renew first, pay later",
      labelZh: "先续保后付款",
      hint: allowPayLater
        ? "Coverage stays continuous — pay in full within the 14-day grace period."
        : "Only available when renewing an existing policy.",
      disabled: !allowPayLater,
    },
  ];

  return (
    <div role="radiogroup" aria-label="Payment option" className="space-y-2">
      {options.map((o) => {
        const checked = mode === o.value;
        return (
          <label
            key={o.value}
            className={`group flex items-start gap-3 rounded-[var(--radius-overlay)] border p-4 transition-[background-color,border-color,box-shadow] duration-150 ${
              o.disabled
                ? "cursor-not-allowed border-[var(--card-stroke)] opacity-55"
                : checked
                  ? "cursor-pointer border-[var(--accent-fill)] bg-[var(--accent-subtle)] shadow-[inset_0_0_0_1px_var(--accent-fill)]"
                  : "cursor-pointer border-[var(--control-stroke-secondary)] bg-[var(--control-fill)] hover:bg-[var(--control-fill-secondary)]"
            }`}
          >
            <input
              type="radio"
              name="paymentMode"
              className="radio mt-0.5"
              checked={checked}
              disabled={o.disabled}
              onChange={() => onModeChange(o.value)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 t-body-strong text-fg">
                {o.label}
                <span className="t-caption font-normal text-fg-3">{o.labelZh}</span>
              </span>
              <span className="block t-caption text-fg-2 mt-0.5">{o.hint}</span>
              {o.value === "Instalment" && checked && (
                <span className="mt-3 block fade-in">
                  <SelectorBar
                    variant="segmented"
                    size="sm"
                    label="Number of instalments"
                    value={String(instalmentCount)}
                    onChange={(v) => onInstalmentCountChange(Number(v))}
                    items={INSTALMENT_OPTIONS.map((n) => ({ value: String(n), label: `${n} months` }))}
                  />
                </span>
              )}
            </span>
            <o.Icon fontSize={20} className={`mt-0.5 shrink-0 transition-colors ${checked ? "text-accent-text" : "text-fg-3"}`} aria-hidden />
          </label>
        );
      })}
    </div>
  );
}
