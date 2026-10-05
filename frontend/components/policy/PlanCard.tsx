"use client";
import { ArrowRightRegular, CheckmarkRegular, StarFilled } from "@fluentui/react-icons";
import { POLICY_TYPE_CONFIG, PLAN_META } from "@/constants/policyPlans";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import type { PolicyPlan } from "@/types";

export default function PlanCard({ plan, onSelect, highlight = false }: { plan: PolicyPlan; onSelect?: () => void; highlight?: boolean }) {
  const cfg = POLICY_TYPE_CONFIG[plan.type];
  const meta = PLAN_META[plan.planId];
  return (
    <article
      className={`card reveal group relative flex h-full flex-col p-5 transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.1,0.9,0.2,1)] hover:-translate-y-0.5 hover:shadow-flyout ${
        highlight ? "shadow-[inset_0_0_0_1px_var(--accent-fill)]" : ""
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <CategoryGlyph type={plan.type} variant="solid" size={44} />
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {highlight && (
            <span className="badge badge-accent">
              <StarFilled aria-hidden /> Widest cover
            </span>
          )}
          <span className="badge badge-outline">{plan.tier}</span>
        </div>
      </div>
      <p className="t-caption text-fg-2">
        {cfg.label} insurance <span className="text-fg-3">· {cfg.labelZh}</span>
      </p>
      <h3 className="t-subtitle text-fg mt-0.5">{plan.name}</h3>
      {meta && <p className="t-body text-fg-2 mt-2 min-h-10">{meta.coverageSummary}</p>}

      <p className="mt-5 flex items-baseline gap-1.5 tabular-nums">
        <span className="t-body text-fg-2">RM</span>
        <span className="font-display text-[34px] leading-none font-semibold tracking-tight text-fg">{plan.premiumRM.toLocaleString()}</span>
        <span className="t-caption text-fg-2">/ 12 months</span>
      </p>

      {meta && (
        <div className="mt-5 flex-1 border-t border-[var(--divider-stroke)] pt-4">
          <p className="t-caption font-semibold text-fg-2 mb-2">Documents you&apos;ll need for a claim</p>
          <ul className="space-y-1.5">
            {meta.documentChecklist.map((d) => (
              <li key={d} className="flex items-center gap-2 t-body text-fg">
                <CheckmarkRegular fontSize={14} className="text-[var(--success)] shrink-0" aria-hidden />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
      {onSelect && (
        <button type="button" onClick={onSelect} className={`btn nudge mt-6 w-full ${highlight ? "btn-accent" : ""}`}>
          Choose {plan.tier}
          <ArrowRightRegular />
        </button>
      )}
    </article>
  );
}
