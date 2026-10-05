"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddRegular,
  ArrowDownloadRegular,
  ArrowSortDownLinesRegular,
  ArrowSortUpLinesRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { INSURANCE_TYPES } from "@/constants/insurance";
import ClaimsTable from "@/components/claims/ClaimsTable";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import type { Claim, ClaimStatus, InsuranceType } from "@/types";

const PAGE_SIZE = 10;

export default function MyClaimsPage() {
  const { token } = useRole();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<InsuranceType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (token)
      apiFetchAuth("/api/claims/my", {}, token)
        .then((d) => setClaims(d.claims || []))
        .catch(() => setClaims([]))
        .finally(() => setLoading(false));
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

  const SortIcon = sortAsc ? ArrowSortUpLinesRegular : ArrowSortDownLinesRegular;

  return (
    <div>
      <PageHeader
        title="My claims"
        description="Every claim you've filed, with its on-chain fingerprint."
        actions={
          <>
            <button onClick={exportCSV} className="btn" disabled={filtered.length === 0}>
              <ArrowDownloadRegular /> Export CSV
            </button>
            <Link href="/dashboard/policyholder/claims/new" className="btn btn-accent">
              <AddRegular /> New claim
            </Link>
          </>
        }
      />

      <div className="card enter enter-2 overflow-hidden">
        {/* command bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--divider-stroke)] p-3">
          <div className="relative min-w-[200px] flex-1">
            <SearchRegular fontSize={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-2" aria-hidden />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by claim ID"
              aria-label="Search by claim ID"
              className="textbox pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            aria-label="Insurance type"
            onChange={(e) => {
              setTypeFilter(e.target.value as InsuranceType | "All");
              setPage(1);
            }}
            wrapClassName="w-[150px]"
          >
            <option value="All">All types</option>
            {INSURANCE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            aria-label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value as ClaimStatus | "All");
              setPage(1);
            }}
            wrapClassName="w-[150px]"
          >
            <option value="All">All statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="UnderReview">Under review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Settled">Settled</option>
          </Select>
          <button onClick={() => setSortAsc((s) => !s)} className="btn btn-subtle" aria-label={`Sort by date, ${sortAsc ? "oldest" : "newest"} first`}>
            <SortIcon /> {sortAsc ? "Oldest first" : "Newest first"}
          </button>
        </div>

        <ClaimsTable claims={pageItems} loading={loading && !!token} />

        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--divider-stroke)] px-4 py-2.5">
            <p className="t-caption text-fg-2 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-subtle btn-icon" aria-label="Previous page">
                  <ChevronLeftRegular />
                </button>
                <span className="px-2 t-caption text-fg-2 tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn-subtle btn-icon" aria-label="Next page">
                  <ChevronRightRegular />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
