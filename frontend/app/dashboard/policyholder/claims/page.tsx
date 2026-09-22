"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { INSURANCE_TYPES } from "@/constants/insurance";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import StatusPill from "@/components/shared/StatusPill";
import HashDisplay from "@/components/blockchain/HashDisplay";
import type { Claim, ClaimStatus, InsuranceType } from "@/types";

const PAGE_SIZE = 10;

export default function MyClaimsPage() {
  const { token } = useRole();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [typeFilter, setTypeFilter] = useState<InsuranceType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (token)
      apiFetchAuth("/api/claims/my", {}, token)
        .then((d) => setClaims(d.claims || []))
        .catch(() => setClaims([]));
  }, [token]);

  const filtered = useMemo(() => {
    let list = [...claims];
    if (typeFilter !== "All") list = list.filter((c) => c.insurance_type === typeFilter);
    if (statusFilter !== "All") list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) list = list.filter((c) => c.id.toLowerCase().includes(search.trim().toLowerCase()));
    list.sort((a, b) => {
      const diff = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [claims, typeFilter, statusFilter, search, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCSV() {
    const header = "Claim ID,Insurance Type,Claim Type,Status,Submitted,Document Hash\n";
    const rows = filtered
      .map((c) => `${c.id},${c.insurance_type || ""},${c.claim_type},${c.status},${c.submitted_at},${c.document_hash || ""}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my_claims.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">My Claims</h1>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900">
            Export CSV
          </button>
          <Link
            href="/dashboard/policyholder/claims/new"
            className="bg-chain-indigo text-white px-4 py-2 rounded-lg text-sm hover:bg-[#2F3FC0]"
          >
            + New Claim
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by Claim ID..."
          className="border border-border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as InsuranceType | "All");
            setPage(1);
          }}
          className="border border-border rounded-lg px-3 py-2 text-sm"
        >
          <option value="All">All Types</option>
          {INSURANCE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ClaimStatus | "All");
            setPage(1);
          }}
          className="border border-border rounded-lg px-3 py-2 text-sm"
        >
          <option value="All">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="UnderReview">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Settled">Settled</option>
        </select>
        <button
          onClick={() => setSortAsc((s) => !s)}
          className="text-sm text-gray-600 border border-border rounded-lg px-3 py-2 hover:bg-cloud"
        >
          Date {sortAsc ? "↑ Oldest" : "↓ Newest"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-cloud text-left text-gray-500">
              <th className="px-4 py-3">Claim ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Hash</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => (
              <tr key={c.id} className="border-b hover:bg-cloud">
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
                  <Link href={`/dashboard/policyholder/claims/${c.id}`} className="text-chain-indigo hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-12">
                  No claims found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
