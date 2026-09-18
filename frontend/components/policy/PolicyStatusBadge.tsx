import { POLICY_STATUS_CONFIG } from "@/constants/policyPlans";
import type { PolicyRecordStatus } from "@/types";

export default function PolicyStatusBadge({ status }: { status: PolicyRecordStatus }) {
  const cfg = POLICY_STATUS_CONFIG[status] || { label: status, bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
