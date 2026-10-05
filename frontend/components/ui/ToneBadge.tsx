import type { ReactNode } from "react";
import type { Tone } from "@/constants/insurance";

const BADGE: Record<Tone, string> = {
  success: "badge badge-success",
  caution: "badge badge-caution",
  critical: "badge badge-critical",
  accent: "badge badge-accent",
  neutral: "badge",
};

export const TONE_COLOR: Record<Tone, string> = {
  success: "var(--success)",
  caution: "var(--caution-solid)",
  critical: "var(--critical)",
  accent: "var(--accent-fill)",
  neutral: "var(--text-tertiary)",
};

/**
 * Status as colour + glyph + word, never colour alone. `dot` renders the quieter
 * inline variant (dot + label) used in dense rows.
 */
export default function ToneBadge({ tone, children, dot = false, pulse = false }: { tone: Tone; children: ReactNode; dot?: boolean; pulse?: boolean }) {
  if (dot) {
    return (
      <span className="inline-flex items-center gap-2 t-body text-fg whitespace-nowrap">
        <span className="status-dot" data-pulse={pulse} style={{ background: TONE_COLOR[tone], color: TONE_COLOR[tone] }} />
        {children}
      </span>
    );
  }
  return (
    <span className={BADGE[tone]}>
      <span className="status-dot" data-pulse={pulse} style={{ width: 6, height: 6, background: "currentColor", color: "currentColor" }} />
      {children}
    </span>
  );
}
