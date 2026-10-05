import {
  AirplaneFilled,
  AirplaneRegular,
  HeartPulseFilled,
  HeartPulseRegular,
  PersonHeartFilled,
  PersonHeartRegular,
  VehicleCarFilled,
  VehicleCarRegular,
} from "@fluentui/react-icons";
import type { InsuranceType, PolicyPlanType } from "@/types";

type Category = InsuranceType | PolicyPlanType;

const MAP: Record<Category, { tint: string; Filled: typeof AirplaneFilled; Regular: typeof AirplaneRegular }> = {
  health: { tint: "var(--cat-health)", Filled: HeartPulseFilled, Regular: HeartPulseRegular },
  medical: { tint: "var(--cat-health)", Filled: HeartPulseFilled, Regular: HeartPulseRegular },
  life: { tint: "var(--cat-life)", Filled: PersonHeartFilled, Regular: PersonHeartRegular },
  transportation: { tint: "var(--cat-transport)", Filled: VehicleCarFilled, Regular: VehicleCarRegular },
  motor: { tint: "var(--cat-transport)", Filled: VehicleCarFilled, Regular: VehicleCarRegular },
  flight: { tint: "var(--cat-flight)", Filled: AirplaneFilled, Regular: AirplaneRegular },
};

export function categoryTint(type: Category | null | undefined) {
  return type && MAP[type] ? MAP[type].tint : "var(--text-tertiary)";
}

export function CategoryIcon({ type, filled = false, fontSize = 16, className = "" }: { type: Category; filled?: boolean; fontSize?: number; className?: string }) {
  const m = MAP[type];
  if (!m) return null;
  const Icon = filled ? m.Filled : m.Regular;
  return <Icon fontSize={fontSize} className={className} style={{ color: m.tint }} aria-hidden />;
}

/**
 * Windows 11 style glyph tile for an insurance / policy category.
 *  - "soft": tinted plate, tinted glyph (lists, tables)
 *  - "solid": luminous gradient plate, white glyph (hero cards)
 */
export default function CategoryGlyph({
  type,
  size = 40,
  variant = "soft",
  className = "",
}: {
  type: Category | null | undefined;
  size?: number;
  variant?: "soft" | "solid";
  className?: string;
}) {
  if (!type || !MAP[type]) return null;
  const m = MAP[type];
  const radius = size >= 40 ? 8 : size >= 28 ? 6 : 4;
  const solid = variant === "solid";
  return (
    <span
      aria-hidden
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: solid
          ? `linear-gradient(145deg, color-mix(in srgb, ${m.tint} 72%, white) 0%, ${m.tint} 55%, color-mix(in srgb, ${m.tint} 78%, black) 100%)`
          : `color-mix(in srgb, ${m.tint} 13%, transparent)`,
        boxShadow: solid
          ? `inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px -4px color-mix(in srgb, ${m.tint} 55%, transparent)`
          : `inset 0 0 0 1px color-mix(in srgb, ${m.tint} 16%, transparent)`,
      }}
    >
      <m.Filled fontSize={Math.round(size * 0.5)} style={{ color: solid ? "#fff" : m.tint }} />
    </span>
  );
}
