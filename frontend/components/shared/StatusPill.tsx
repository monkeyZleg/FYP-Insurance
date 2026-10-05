import { STATUS_CONFIG } from "@/constants/insurance";
import ToneBadge from "@/components/ui/ToneBadge";

/** Claim status. `dot` renders the inline dot + word variant for dense rows. */
export default function StatusPill({ status, dot = false }: { status: string; dot?: boolean }) {
  const cfg = STATUS_CONFIG[status] || { label: status, tone: "neutral" as const };
  return (
    <ToneBadge tone={cfg.tone} dot={dot} pulse={status === "UnderReview"}>
      {cfg.label}
    </ToneBadge>
  );
}
