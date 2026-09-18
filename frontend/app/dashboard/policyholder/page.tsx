"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { INSURANCE_TYPES } from "@/constants/insurance";
import InsuranceTypeCard from "@/components/insurance/InsuranceTypeCard";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import StatusPill from "@/components/shared/StatusPill";
import HashDisplay from "@/components/blockchain/HashDisplay";
import type { Claim, ClaimStatus } from "@/types";
import { useRouter } from "next/navigation";

type Filter = "All" | ClaimStatus;

export default function PolicyholderHome() {
  const { wallet } = useRole();
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<Filter>("All");

  async function loadClaims(w: string) {
    try {
      const data = await apiFetch("/api/claims/my", {}, w);
      setClaims(data.claims || []);
    } catch {
      setClaims([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wallet) loadClaims(wallet);
  }, [wallet]);

  const stats = useMemo(
    () => ({
      total: claims.length,
      pending: claims.filter((c) => c.status === "Pending" || c.status === "UnderReview").length,
      approved: claims.filter((c) => c.status === "Approved").length,
      rejected: claims.filter((c) => c.status === "Rejected").length,
    }),
    [claims]
  );

  const filtered = useMemo(() => {
    const list = filter === "All" ? claims : claims.filter((c) => c.status === filter);
    return list.slice(0, 5);
  }, [claims, filter]);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Claims", value: stats.total, color: "text-gray-900" },
          { label: "Pending Review", value: stats.pending, color: "text-amber-600" },
          { label: "Approved", value: stats.approved, color: "text-green-600" },
          { label: "Rejected", value: stats.rejected, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">File a New Claim</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {INSURANCE_TYPES.map((t) => (
          <InsuranceTypeCard
            key={t.id}
            config={t}
            onFileClaim={() => router.push(`/dashboard/policyholder/claims/new?type=${t.id}`)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Claims</h2>
        <Link href="/dashboard/policyholder/claims" className="text-sm text-blue-600 hover:underline">
          View all →
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(["All", "Pending", "Approved", "Rejected"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
              filter === f ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3">Claim ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">On-Chain Hash</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{c.id.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <InsuranceTypeBadge type={c.insurance_type} />
                </td>
                <td className="px-4 py-3 text-xs">{new Date(c.submitted_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-4 py-3">
                  <HashDisplay hash={c.document_hash} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/policyholder/claims/${c.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-12">
                  No claims found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
