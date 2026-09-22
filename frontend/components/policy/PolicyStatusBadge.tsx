import { POLICY_STATUS_CONFIG } from "@/constants/policyPlans";
import type { PolicyRecordStatus } from "@/types";

/**
 * Policy status indicator. `dot` renders the colored-dot + word row variant
 * used in the policy dashboard row layout; the default keeps the original
 * pill shape for other usages (purchase flow confirmation, etc).
 */
export default function PolicyStatusBadge({
  status,
  dot = false,
}: {
  status: PolicyRecordStatus;
  dot?: boolean;
}) {
  const cfg = POLICY_STATUS_CONFIG[status] || {
    label: status,
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "#9CA3AF",
  };

  if (dot) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink whitespace-nowrap">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
        {cfg.label}
      </span>
    );
  }

  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
