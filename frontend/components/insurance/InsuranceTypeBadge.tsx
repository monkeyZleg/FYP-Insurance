import { getInsuranceConfig } from "@/constants/insurance";
import { CategoryIcon } from "@/components/ui/CategoryGlyph";

export default function InsuranceTypeBadge({ type }: { type: string | null | undefined }) {
  const cfg = getInsuranceConfig(type || undefined);
  if (!cfg) return <span className="t-caption text-fg-3">—</span>;

  return (
    <span className="inline-flex items-center gap-2 t-body text-fg whitespace-nowrap">
      <CategoryIcon type={cfg.id} filled fontSize={16} />
      {cfg.label}
    </span>
  );
}
