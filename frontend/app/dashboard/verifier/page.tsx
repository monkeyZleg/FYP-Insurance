"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightRegular,
  CalendarClockRegular,
  CheckmarkCircleRegular,
  ClockAlarmRegular,
  TaskListSquareLtrRegular,
} from "@fluentui/react-icons";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import TypeFilter from "@/components/insurance/TypeFilter";
import type { Claim, InsuranceType } from "@/types";

function ageLabel(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

export default function VerifierQueue() {
  const { wallet, userName } = useRole();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
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

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: claims.length };
    claims.forEach((c) => c.insurance_type && (m[c.insurance_type] = (m[c.insurance_type] || 0) + 1));
    return m;
  }, [claims]);

  const reviewedToday = useMemo(() => {
    const today = new Date().toDateString();
    return claims.filter((c) => new Date(c.last_updated_at).toDateString() === today && c.status !== "UnderReview").length;
  }, [claims]);

  return (
    <div>
      <PageHeader
        title="Claims queue"
        description={userName ? `Reviewer: ${userName}. Oldest claims are listed first.` : "Oldest claims are listed first."}
      />

      <div className="stagger mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Claims assigned" value={claims.length} icon={TaskListSquareLtrRegular} />
        <StatCard label="Reviewed today" value={reviewedToday} icon={CheckmarkCircleRegular} tone="var(--success)" />
        <StatCard label="Pending action" value={claims.length} icon={ClockAlarmRegular} tone="var(--caution-solid)" />
      </div>

      <div className="mb-4">
        <TypeFilter value={typeFilter} onChange={setTypeFilter} counts={counts} />
      </div>

      {loading && !!wallet ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={TaskListSquareLtrRegular} title="You're all caught up" body="No claims are assigned to you for review right now." />
        </div>
      ) : (
        <ul className="stagger space-y-2">
          {filtered.map((claim, i) => (
            <li key={claim.id}>
              <Link
                href={`/dashboard/verifier/claims/${claim.id}`}
                className="card card-interactive reveal group flex flex-wrap items-center gap-x-5 gap-y-3 p-4 sm:p-5"
              >
                <CategoryGlyph type={claim.insurance_type} variant="solid" size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="t-body-strong text-fg">{claim.claim_type}</p>
                    {i === 0 && typeFilter === "All" && (
                      <span className="badge badge-critical !h-5">
                        <ClockAlarmRegular aria-hidden /> Oldest
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 t-body text-fg-2">
                    <span>{claim.policyholder?.full_name || claim.policyholder_id.slice(0, 8)}</span>
                    <span className="font-mono text-[12.5px] text-fg-3">#{claim.id.slice(0, 8)}</span>
                  </p>
                </div>
                <p className="flex items-center gap-1.5 t-body text-fg-2 tabular-nums">
                  <CalendarClockRegular fontSize={16} aria-hidden />
                  Submitted {ageLabel(claim.submitted_at)}
                </p>
                <span className="btn btn-accent nudge pointer-events-none">
                  Review <ArrowRightRegular />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
