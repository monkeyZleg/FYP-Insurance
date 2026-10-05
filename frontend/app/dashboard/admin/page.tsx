"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightRegular,
  ClipboardTaskListLtrRegular,
  MoneyHandRegular,
  PeopleRegular,
  PersonAddRegular,
  PersonArrowRightRegular,
  WarningRegular,
} from "@fluentui/react-icons";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { INSURANCE_TYPES, STATUS_CONFIG } from "@/constants/insurance";
import { CategoryIcon, categoryTint } from "@/components/ui/CategoryGlyph";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { TONE_COLOR } from "@/components/ui/ToneBadge";
import { ROLE_LABELS } from "@/components/shared/RoleBadge";
import type { Claim, User } from "@/types";

const STATUS_ORDER = ["Submitted", "UnderReview", "Approved", "Settled", "Rejected"] as const;
// Approved and Settled share the success tone; settled is drawn as its deeper shade.
const STATUS_FILL: Record<string, string> = {
  Submitted: TONE_COLOR.accent,
  UnderReview: TONE_COLOR.caution,
  Approved: "color-mix(in srgb, var(--success) 55%, transparent)",
  Settled: TONE_COLOR.success,
  Rejected: TONE_COLOR.critical,
};

export default function AdminOverview() {
  const { wallet } = useRole();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!wallet) return;
    apiFetch("/api/claims/all", {}, wallet)
      .then((d) => setClaims(d.claims || []))
      .catch(() => setClaims([]));
    apiFetch("/api/auth/users", {}, wallet)
      .then((d) => setUsers(d.users || []))
      .catch(() => setUsers([]));
  }, [wallet]);

  const usersByRole = useMemo(() => {
    const counts: Record<string, number> = { policyholder: 0, verifier: 0, admin: 0, auditor: 0 };
    users.forEach((u) => (counts[u.role] = (counts[u.role] || 0) + 1));
    return counts;
  }, [users]);

  const claimsByStatus = useMemo(() => {
    const counts: Record<string, number> = { Submitted: 0, UnderReview: 0, Approved: 0, Rejected: 0, Settled: 0 };
    claims.forEach((c) => (counts[c.status] = (counts[c.status] || 0) + 1));
    return counts;
  }, [claims]);

  const claimsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    INSURANCE_TYPES.forEach((t) => (counts[t.id] = 0));
    claims.forEach((c) => {
      if (c.insurance_type) counts[c.insurance_type] = (counts[c.insurance_type] || 0) + 1;
    });
    return counts;
  }, [claims]);

  const unassignedPending = claims.filter((c) => c.status === "Submitted").length;
  const awaitingSettlement = claimsByStatus.Approved || 0;
  const maxType = Math.max(1, ...Object.values(claimsByType));
  const maxRole = Math.max(1, ...Object.values(usersByRole));

  return (
    <div>
      <PageHeader
        title="System overview"
        description="Where every claim sits in the pipeline, and who can act on it."
        actions={
          <>
            <Link href="/dashboard/admin/users" className="btn">
              <PersonAddRegular /> Add user
            </Link>
            <Link href="/dashboard/admin/assign" className="btn btn-accent">
              <PersonArrowRightRegular /> Assign claims
            </Link>
          </>
        }
      />

      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Total claims" value={claims.length} icon={ClipboardTaskListLtrRegular} />
        <StatCard
          label="Unassigned pending"
          value={unassignedPending}
          icon={WarningRegular}
          tone={unassignedPending > 0 ? "var(--caution-solid)" : "var(--success)"}
          hint={
            unassignedPending > 0 ? (
              <Link href="/dashboard/admin/assign" className="link nudge inline-flex items-center gap-1">
                Assign now <ArrowRightRegular fontSize={12} />
              </Link>
            ) : (
              "Nothing waiting"
            )
          }
        />
        <StatCard
          label="Approved, awaiting payout"
          value={awaitingSettlement}
          icon={MoneyHandRegular}
          tone="var(--success)"
          hint={awaitingSettlement > 0 ? "Settle from Assign & settle" : "Nothing to settle"}
        />
      </div>

      {/* pipeline */}
      <section className="card enter enter-3 mt-6 p-5 sm:p-6" aria-labelledby="pipeline">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pipeline" className="t-subtitle text-fg">
            Claims pipeline
          </h2>
          <p className="t-caption text-fg-2 tabular-nums">{claims.length} claims</p>
        </div>
        <div className="mt-5 flex h-3 gap-[2px] overflow-hidden rounded-full bg-[var(--subtle-fill-secondary)]" role="img" aria-label="Claims by status">
          {STATUS_ORDER.map((s) =>
            claimsByStatus[s] ? (
              <div
                key={s}
                className="h-full transition-[flex-grow] duration-700 ease-[cubic-bezier(0.1,0.9,0.2,1)] first:rounded-l-full last:rounded-r-full"
                style={{ flexGrow: claimsByStatus[s], background: STATUS_FILL[s] }}
                title={`${STATUS_CONFIG[s].label}: ${claimsByStatus[s]}`}
              />
            ) : null
          )}
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {STATUS_ORDER.map((s) => (
            <li key={s}>
              <p className="flex items-center gap-2 t-caption text-fg-2">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_FILL[s] }} />
                {STATUS_CONFIG[s].label}
              </p>
              <p className="mt-1 font-display text-[24px] font-semibold leading-8 text-fg tabular-nums">{claimsByStatus[s] || 0}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card enter enter-4 p-5 sm:p-6" aria-labelledby="by-type">
          <h2 id="by-type" className="t-subtitle text-fg">
            Claims by insurance type
          </h2>
          <ul className="mt-5 space-y-4">
            {INSURANCE_TYPES.map((t) => (
              <li key={t.id} className="grid grid-cols-[140px_1fr_32px] items-center gap-3 t-body">
                <span className="flex items-center gap-2 text-fg">
                  <CategoryIcon type={t.id} filled fontSize={16} /> {t.label}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-[var(--subtle-fill-secondary)]">
                  <span
                    className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.1,0.9,0.2,1)]"
                    style={{ width: `${((claimsByType[t.id] || 0) / maxType) * 100}%`, background: categoryTint(t.id) }}
                  />
                </span>
                <span className="text-right text-fg tabular-nums">{claimsByType[t.id] || 0}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card enter enter-5 p-5 sm:p-6" aria-labelledby="by-role">
          <div className="flex items-center justify-between gap-3">
            <h2 id="by-role" className="t-subtitle text-fg">
              Users by role
            </h2>
            <Link href="/dashboard/admin/users" className="btn btn-subtle btn-sm nudge text-accent-text">
              Manage <ArrowRightRegular />
            </Link>
          </div>
          <ul className="mt-5 space-y-4">
            {Object.entries(usersByRole).map(([role, n]) => (
              <li key={role} className="grid grid-cols-[140px_1fr_32px] items-center gap-3 t-body">
                <span className="flex items-center gap-2 text-fg">
                  <PeopleRegular fontSize={16} className="text-fg-2" aria-hidden /> {ROLE_LABELS[role] || role}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-[var(--subtle-fill-secondary)]">
                  <span
                    className="block h-full rounded-full bg-[var(--accent-fill)] transition-[width] duration-700 ease-[cubic-bezier(0.1,0.9,0.2,1)]"
                    style={{ width: `${(n / maxRole) * 100}%` }}
                  />
                </span>
                <span className="text-right text-fg tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
