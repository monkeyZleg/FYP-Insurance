"use client";
import { INSURANCE_TYPES } from "@/constants/insurance";
import SelectorBar from "@/components/ui/SelectorBar";
import type { InsuranceType } from "@/types";

/** Segmented insurance-type filter shared by the staff queues. */
export default function TypeFilter({
  value,
  onChange,
  counts,
}: {
  value: InsuranceType | "All";
  onChange: (v: InsuranceType | "All") => void;
  counts?: Record<string, number>;
}) {
  return (
    <SelectorBar
      variant="segmented"
      label="Filter by insurance type"
      value={value}
      onChange={onChange}
      items={[
        { value: "All" as const, label: "All types", count: counts?.All },
        ...INSURANCE_TYPES.map((t) => ({ value: t.id, label: t.label, count: counts?.[t.id] })),
      ]}
    />
  );
}
