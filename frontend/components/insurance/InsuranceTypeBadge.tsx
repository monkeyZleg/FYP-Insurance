import { getInsuranceConfig } from "@/constants/insurance";

export default function InsuranceTypeBadge({ type }: { type: string | null | undefined }) {
  const cfg = getInsuranceConfig(type || undefined);
  if (!cfg) return <span className="text-xs text-gray-400">—</span>;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
