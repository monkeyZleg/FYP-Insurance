"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { INSURANCE_TYPES } from "@/constants/insurance";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import AuditTrailTable from "@/components/blockchain/AuditTrailTable";
import type { Claim, InsuranceType } from "@/types";

export default function AuditorDashboard() {
  const { wallet } = useRole();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [typeFilter, setTypeFilter] = useState<InsuranceType | "All">("All");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  useEffect(() => {
    if (wallet)
      apiFetch("/api/claims/all", {}, wallet)
        .then((d) => setClaims(d.claims || []))
        .catch(() => setClaims([]));
  }, [wallet]);

  const filtered = useMemo(
    () => (typeFilter === "All" ? claims : claims.filter((c) => c.insurance_type === typeFilter)),
    [claims, typeFilter]
  );

  function exportCSV() {
    const header = "Claim ID,Insurance Type,Status,TX Hash,Submitted\n";
    const rows = filtered
      .map((c) => `${c.id},${c.insurance_type || ""},${c.status},${c.tx_hash || "N/A"},${c.submitted_at}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Blockchain Audit Trail</h1>
        <button onClick={exportCSV} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900">
          Export CSV
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 mb-6">
        Read-only access — auditors cannot approve, reject, assign, or modify claim records.
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

      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3">Claim ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">TX Hash</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((claim) => (
              <tr key={claim.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{claim.id.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <InsuranceTypeBadge type={claim.insurance_type} />
                </td>
                <td className="px-4 py-3">{claim.status}</td>
                <td className="px-4 py-3 font-mono text-xs text-blue-600">
                  {claim.tx_hash ? (
                    <a href={`https://sepolia.etherscan.io/tx/${claim.tx_hash}`} target="_blank" rel="noreferrer">
                      {claim.tx_hash.slice(0, 10)}...
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{new Date(claim.submitted_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {claim.blockchain_claim_id && (
                    <button
                      onClick={() =>
                        setSelectedClaimId(selectedClaimId === claim.blockchain_claim_id ? null : claim.blockchain_claim_id)
                      }
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {selectedClaimId === claim.blockchain_claim_id ? "Hide Trail" : "Audit Trail"}
                    </button>
                  )}
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

      {selectedClaimId && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold mb-4">Blockchain Audit Trail — {selectedClaimId.slice(0, 10)}...</h3>
          <AuditTrailTable claimId={selectedClaimId} walletAddress={wallet} />
        </div>
      )}
    </div>
  );
}
