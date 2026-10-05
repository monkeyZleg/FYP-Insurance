"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AddRegular,
  ArrowRightRegular,
  CartRegular,
  CheckmarkCircleRegular,
  ClipboardTaskListLtrRegular,
  DismissCircleRegular,
  HourglassHalfRegular,
} from "@fluentui/react-icons";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { INSURANCE_TYPES } from "@/constants/insurance";
import InsuranceTypeCard from "@/components/insurance/InsuranceTypeCard";
import ClaimsTable from "@/components/claims/ClaimsTable";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import SelectorBar from "@/components/ui/SelectorBar";
import EmptyState from "@/components/ui/EmptyState";
import Mascot from "@/components/mascot/Mascot";
import type { Claim, ClaimStatus } from "@/types";

type Filter = "All" | ClaimStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Submitted", label: "Submitted" },
  { value: "UnderReview", label: "Under review" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Settled", label: "Settled" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function PolicyholderHome() {
  const { token, userName } = useRole();
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");

  async function loadClaims(t: string) {
    try {
      const data = await apiFetchAuth("/api/claims/my", {}, t);
      setClaims(data.claims || []);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) loadClaims(token);
  }, [token]);

  const stats = useMemo(
    () => ({
      total: claims.length,
      pending: claims.filter((c) => c.status === "Submitted" || c.status === "UnderReview").length,
      approved: claims.filter((c) => c.status === "Approved" || c.status === "Settled").length,
      rejected: claims.filter((c) => c.status === "Rejected").length,
    }),
    [claims]
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: claims.length };
    claims.forEach((c) => (m[c.status] = (m[c.status] || 0) + 1));
    return m;
  }, [claims]);

  const filtered = useMemo(() => {
    const list = filter === "All" ? claims : claims.filter((c) => c.status === filter);
    return list.slice(0, 5);
  }, [claims, filter]);

  const firstName = userName ? userName.split(" ")[0] : "";
  const share = (n: number) => (stats.total ? n / stats.total : 0);

  return (
    <div>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Here's where your claims stand, and everything you need to file a new one."
        actions={
          <>
            <Link href="/dashboard/policyholder/policies/plans" className="btn">
              <CartRegular /> Buy a policy
            </Link>
            <Link href="/dashboard/policyholder/claims/new" className="btn btn-accent">
              <AddRegular /> New claim
            </Link>
          </>
        }
      />

      <section aria-label="Claim summary" className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total claims" value={stats.total} icon={ClipboardTaskListLtrRegular} />
        <StatCard label="Pending review" value={stats.pending} icon={HourglassHalfRegular} tone="var(--caution-solid)" share={share(stats.pending)} />
        <StatCard label="Approved" value={stats.approved} icon={CheckmarkCircleRegular} tone="var(--success)" share={share(stats.approved)} />
        <StatCard label="Rejected" value={stats.rejected} icon={DismissCircleRegular} tone="var(--critical)" share={share(stats.rejected)} />
      </section>

      <section className="mt-10" aria-labelledby="file-claim">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="file-claim" className="t-subtitle text-fg">
              File a new claim
            </h2>
            <p className="t-body text-fg-2">Pick the cover your claim falls under.</p>
          </div>
        </div>
        <div className="stagger -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-4 [&>*]:w-[78%] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-auto">
          {INSURANCE_TYPES.map((t) => (
            <InsuranceTypeCard
              key={t.id}
              config={t}
              onFileClaim={() => router.push(`/dashboard/policyholder/claims/new?type=${t.id}`)}
            />
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="recent-claims">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="recent-claims" className="t-subtitle text-fg">
            Recent claims
          </h2>
          <Link href="/dashboard/policyholder/claims" className="btn btn-subtle nudge text-accent-text">
            View all <ArrowRightRegular />
          </Link>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--divider-stroke)] px-3 pt-2">
            <SelectorBar
              label="Filter claims by status"
              value={filter}
              onChange={setFilter}
              items={FILTERS.map((f) => ({ ...f, count: counts[f.value] || 0 }))}
            />
          </div>
          <ClaimsTable
            claims={filtered}
            loading={loading && !!token}
            empty={
              claims.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-14 text-center fade-in">
                  <Mascot mood="happy" className="mb-4 h-16 w-16" />
                  <p className="t-body-strong text-fg">No claims yet</p>
                  <p className="mt-1 max-w-sm t-body text-fg-2">When you file a claim, you&apos;ll be able to follow every step of it here.</p>
                  <Link href="/dashboard/policyholder/claims/new" className="btn btn-accent mt-5">
                    <AddRegular /> File your first claim
                  </Link>
                </div>
              ) : (
                <EmptyState compact icon={ClipboardTaskListLtrRegular} title="Nothing here" body="No claims match this status." />
              )
            }
          />
        </div>
      </section>
    </div>
  );
}
