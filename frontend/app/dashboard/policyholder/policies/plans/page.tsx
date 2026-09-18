"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { POLICY_PLANS, POLICY_TYPE_CONFIG, getPlansByType } from "@/constants/policyPlans";
import PlanCard from "@/components/policy/PlanCard";
import type { PolicyPlanType } from "@/types";

export default function PlansPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<PolicyPlanType | "All">("All");
  const plans = typeFilter === "All" ? POLICY_PLANS : getPlansByType(typeFilter);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Preset Plans</h1>
      <p className="text-sm text-gray-500 mb-6">
        Sample plans for demonstration only — not real insurer products or pricing.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTypeFilter("All")}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
            typeFilter === "All" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          All
        </button>
        {(Object.keys(POLICY_TYPE_CONFIG) as PolicyPlanType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
              typeFilter === t ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {POLICY_TYPE_CONFIG[t].icon} {POLICY_TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={() => router.push(`/dashboard/policyholder/policies/purchase?planId=${plan.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
