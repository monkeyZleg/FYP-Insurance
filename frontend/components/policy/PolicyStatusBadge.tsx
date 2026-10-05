import { POLICY_STATUS_CONFIG } from "@/constants/policyPlans";
import ToneBadge from "@/components/ui/ToneBadge";
import type { PolicyRecordStatus } from "@/types";

/** Policy status. `dot` renders the inline dot + word variant used in the policy list. */
export default function PolicyStatusBadge({ status, dot = false }: { status: PolicyRecordStatus; dot?: boolean }) {
  const cfg = POLICY_STATUS_CONFIG[status] || { label: status, tone: "neutral" as const };
  return (
    <ToneBadge tone={cfg.tone} dot={dot} pulse={status === "GracePeriod"}>
      {cfg.label}
    </ToneBadge>
  );
}
