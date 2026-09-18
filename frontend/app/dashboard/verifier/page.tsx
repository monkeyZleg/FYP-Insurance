"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { INSURANCE_TYPES } from "@/constants/insurance";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import type { Claim, InsuranceType } from "@/types";

export default function VerifierQueue() {
  const { wallet, userName } = useRole();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [typeFilter, setTypeFilter] = useState<InsuranceType | "All">("All");

  async function loadClaims() {
    try {
      const data = await apiFetch("/api/claims/all", {}, wallet);
      const assigned = (data.claims || []).filter(
        (c: Claim) => c.status === "UnderReview" && c.assigned_verifier_id !== null
      );
      assigned.sort(
        (a: Claim, b: Claim) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      );
      setClaims(assigned);
    } catch {
      setClaims([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wallet) loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const filtered = useMemo(
    () => (typeFilter === "All" ? claims : claims.filter((c) => c.insurance_type === typeFilter)),
    [claims, typeFilter]
  );

  const reviewedToday = useMemo(() => {
    const today = new Date().toDateString();
    return claims.filter((c) => new Date(c.last_updated_at).toDateString() === today && c.status !== "UnderReview").length;
  }, [claims]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat label="Claims Assigned" value={claims.length} />
        <Stat label="Reviewed Today" value={reviewedToday} />
        <Stat label="Pending Action" value={claims.length} />
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Claims Queue</h1>
        {userName && <span className="text-sm text-gray-500">Reviewer: {userName}</span>}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTypeFilter("All")}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
            typeFilter === "All" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          All
        </button>
        {INSURANCE_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
              typeFilter === t.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((claim, i) => (
          <div key={claim.id} className="bg-white rounded-xl shadow p-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-mono">{claim.id.slice(0, 8)}</span>
                <InsuranceTypeBadge type={claim.insurance_type} />
                {i === 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                    Oldest
                  </span>
                )}
              </div>
              <h3 className="font-semibold">{claim.claim_type}</h3>
              <p className="text-xs text-gray-400 mt-1">
                {claim.policyholder?.full_name || claim.policyholder_id.slice(0, 8)}
              </p>
              <p className="text-xs text-gray-400">
                Submitted {new Date(claim.submitted_at).toLocaleDateString()}
              </p>
            </div>
            <Link
              href={`/dashboard/verifier/claims/${claim.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 shrink-0"
            >
              Review
            </Link>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">No claims assigned for review.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
