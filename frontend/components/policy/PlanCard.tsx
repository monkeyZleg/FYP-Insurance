"use client";
import { POLICY_TYPE_CONFIG, PLAN_META } from "@/constants/policyPlans";
import type { PolicyPlan } from "@/types";

export default function PlanCard({ plan, onSelect }: { plan: PolicyPlan; onSelect?: () => void }) {
  const cfg = POLICY_TYPE_CONFIG[plan.type];
  const meta = PLAN_META[plan.planId];
  return (
    <div className={`rounded-xl border p-5 ${cfg.bg} border-transparent`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{cfg.icon}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white ${cfg.text}`}>{plan.tier}</span>
      </div>
      <h3 className="font-semibold text-lg text-gray-900">{plan.name}</h3>
      {meta && <p className="text-sm text-gray-600 mt-1 mb-3">{meta.coverageSummary}</p>}
      <p className="text-xl font-bold text-gray-900 mb-3">
        RM {plan.premiumRM.toLocaleString()}
        <span className="text-xs font-normal text-gray-500"> / 12 months</span>
      </p>
      {meta && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Required documents</p>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5">
            {meta.documentChecklist.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {onSelect && (
        <button
          onClick={onSelect}
          className="text-sm font-medium px-4 py-2 rounded-lg w-full text-white"
          style={{ backgroundColor: cfg.color }}
        >
          Buy {plan.name}
        </button>
      )}
    </div>
  );
}
