import { STATUS_CONFIG } from "@/constants/insurance";

export default function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    bg: "bg-gray-100",
    text: "text-gray-600",
  };
  return (
    <span
      className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}
