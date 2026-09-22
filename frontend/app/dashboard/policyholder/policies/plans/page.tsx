"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listPlans } from "@/lib/policyApi";
import { POLICY_TYPE_CONFIG } from "@/constants/policyPlans";
import PlanCard from "@/components/policy/PlanCard";
import type { PolicyPlan, PolicyPlanType } from "@/types";

export default function PlansPage() {
  const router = useRouter();
  const [allPlans, setAllPlans] = useState<PolicyPlan[]>([]);
  const [typeFilter, setTypeFilter] = useState<PolicyPlanType | "All">("All");
  const [error, setError] = useState("");

  useEffect(() => {

    listPlans()
      .then(setAllPlans)
      .catch(() => setError("Could not load plans. Please try again later."));
  }, []);

  const plans = typeFilter === "All" ? allPlans : allPlans.filter((p) => p.type === typeFilter);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Preset Plans</h1>
      <p className="text-sm text-gray-500 mb-6">
        Sample plans for demonstration only — not real insurer products or pricing.
      </p>

      {error && <p className="text-sm text-failure mb-4">{error}</p>}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTypeFilter("All")}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
            typeFilter === "All" ? "bg-chain-indigo text-white" : "bg-white text-gray-600 hover:bg-cloud"
          }`}
        >
          All
        </button>
        {(Object.keys(POLICY_TYPE_CONFIG) as PolicyPlanType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
              typeFilter === t ? "bg-chain-indigo text-white" : "bg-white text-gray-600 hover:bg-cloud"
            }`}
          >
            {POLICY_TYPE_CONFIG[t].icon} {POLICY_TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.planId}
            plan={plan}
            onSelect={() => router.push(`/dashboard/policyholder/policies/purchase?planId=${plan.planId}`)}
          />
        ))}
      </div>
    </div>
  );
}
