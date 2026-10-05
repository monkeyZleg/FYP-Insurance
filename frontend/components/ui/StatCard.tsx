import type { ComponentType, ReactNode } from "react";

/** KPI tile: glyph, label, large tabular value, optional share-of-total meter. */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "var(--accent-fill)",
  share,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string; fontSize?: number; style?: React.CSSProperties }>;
  tone?: string;
  share?: number; // 0..1
  hint?: ReactNode;
}) {
  return (
    <div className="card reveal relative overflow-hidden p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="t-body text-fg-2">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
          <Icon fontSize={18} style={{ color: tone }} aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-display text-[32px] font-semibold leading-10 tracking-tight text-fg tabular-nums">{value}</p>
      {typeof share === "number" && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--subtle-fill-secondary)]" aria-hidden>
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.1,0.9,0.2,1)]"
            style={{ width: `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`, background: tone }}
          />
        </div>
      )}
      {hint && <p className="mt-2 t-caption text-fg-2">{hint}</p>}
    </div>
  );
}
