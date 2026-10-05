"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listPlans } from "@/lib/policyApi";
import { POLICY_TYPE_CONFIG } from "@/constants/policyPlans";
import PlanCard from "@/components/policy/PlanCard";
import PageHeader from "@/components/ui/PageHeader";
import SelectorBar from "@/components/ui/SelectorBar";
import InfoBar from "@/components/ui/InfoBar";
import type { PolicyPlan, PolicyPlanType } from "@/types";

export default function PlansPage() {
  const router = useRouter();
  const [allPlans, setAllPlans] = useState<PolicyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<PolicyPlanType | "All">("All");
  const [error, setError] = useState("");

  useEffect(() => {
    listPlans()
      .then(setAllPlans)
      .catch(() => setError("Could not load plans. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  const plans = typeFilter === "All" ? allPlans : allPlans.filter((p) => p.type === typeFilter);

  // the most expensive plan of each type offers the widest cover
  const widest = useMemo(() => {
    const best: Record<string, PolicyPlan> = {};
    allPlans.forEach((p) => {
      if (!best[p.type] || p.premiumRM > best[p.type].premiumRM) best[p.type] = p;
    });
    return new Set(Object.values(best).map((p) => p.planId));
  }, [allPlans]);

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "My policies", href: "/dashboard/policyholder/policies" }, { label: "Preset plans" }]}
        title="Preset plans"
        description="Sample plans for demonstration only — not real insurer products or pricing."
      />

      {error && <InfoBar severity="error" className="mb-4">{error}</InfoBar>}

      <div className="enter enter-1 mb-6">
        <SelectorBar
          variant="segmented"
          label="Filter plans by type"
          value={typeFilter}
          onChange={setTypeFilter}
          items={[
            { value: "All" as const, label: "All plans" },
            ...(Object.keys(POLICY_TYPE_CONFIG) as PolicyPlanType[]).map((t) => ({ value: t, label: POLICY_TYPE_CONFIG[t].label })),
          ]}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-96" />
          ))}
        </div>
      ) : (
        <div key={typeFilter} className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.planId}
              plan={plan}
              highlight={widest.has(plan.planId)}
              onSelect={() => router.push(`/dashboard/policyholder/policies/purchase?planId=${plan.planId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
