import { STATUS_CONFIG } from "@/constants/insurance";

/**
 * Status indicator. `dot` renders a colored-dot + word row variant
 * (accessible to color-blind users, per design spec Part 1.4); the default
 * renders the original pill shape used in tables across the app.
 */
export default function StatusPill({ status, dot = false }: { status: string; dot?: boolean }) {
  const cfg = STATUS_CONFIG[status] || {
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
    <span
      className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}
