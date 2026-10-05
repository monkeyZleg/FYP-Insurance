"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AddRegular,
  ArrowRepeatAllRegular,
  CheckmarkCircleFilled,
  ChevronDownRegular,
  CircleRegular,
  DocumentBulletListRegular,
  PaymentRegular,
  WarningFilled,
} from "@fluentui/react-icons";
import { useRole } from "@/hooks/useRole";
import { buildInstalmentSchedule, canRenew, myPolicies } from "@/lib/policyApi";
import { POLICY_TYPE_CONFIG } from "@/constants/policyPlans";
import PolicyStatusBadge from "@/components/policy/PolicyStatusBadge";
import HashDisplay from "@/components/blockchain/HashDisplay";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import type { PolicyRow } from "@/types";

function coverageProgress(p: PolicyRow) {
  const start = new Date(p.start_date).getTime();
  const end = new Date(p.end_date).getTime();
  if (!start || !end || end <= start) return 0;
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
}

export default function MyPoliciesPage() {
  const { token } = useRole();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    myPolicies(token)
      .then(setPolicies)
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <PageHeader
        title="My policies"
        description="Your cover, what's paid and what's due."
        actions={
          <Link href="/dashboard/policyholder/policies/plans" className="btn btn-accent">
            <AddRegular /> Buy a policy
          </Link>
        }
      />

      {loading && !!token ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={DocumentBulletListRegular}
            title="You don't have any policies yet"
            body="Pick a preset plan to get covered — claims need an active policy."
            action={
              <Link href="/dashboard/policyholder/policies/plans" className="btn btn-accent">
                Browse preset plans
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="stagger space-y-3">
          {policies.map((p) => {
            const cfg = POLICY_TYPE_CONFIG[p.policy_type];
            const isOpen = expanded === p.id;
            const instalments = buildInstalmentSchedule(p);
            const progress = coverageProgress(p);
            const paidShare = p.total_instalments ? p.paid_instalments / p.total_instalments : 0;
            return (
              <li key={p.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <CategoryGlyph type={p.policy_type} variant="solid" size={44} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-2 t-body-large font-semibold text-fg">
                        {p.plan_name}
                        <span className="t-caption font-normal text-fg-3">{cfg.label} · {cfg.labelZh}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 t-body text-fg-2">
                        <span className="font-mono text-[13px]">{p.policy_number}</span>
                        <PolicyStatusBadge status={p.status} dot />
                      </p>
                    </div>
                  </div>

                  <div className="hidden w-48 md:block">
                    <div className="flex justify-between t-caption text-fg-2">
                      <span>Coverage</span>
                      <span className="tabular-nums">ends {p.end_date}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--subtle-fill-secondary)]">
                      <div className="h-full rounded-full bg-[var(--accent-fill)]" style={{ width: `${progress * 100}%` }} />
                    </div>
                    <p className="mt-1.5 t-caption text-fg-2 tabular-nums">
                      {p.paid_instalments}/{p.total_instalments} paid
                      <span className="ml-2 inline-block h-1 w-12 overflow-hidden rounded-full bg-[var(--subtle-fill-secondary)] align-middle">
                        <span className="block h-full rounded-full bg-[var(--success)]" style={{ width: `${paidShare * 100}%` }} />
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-display text-[22px] font-semibold leading-7 text-fg tabular-nums">RM {p.premium.toLocaleString()}</p>
                    <p className="t-caption text-fg-2">{p.payment_mode === "PayNow" ? "Paid in full" : p.payment_mode === "Instalment" ? "Instalments" : "Pay later"}</p>
                  </div>

                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    {p.status === "PendingPayment" && (
                      <Link href={`/dashboard/policyholder/policies/purchase?payId=${p.id}`} className="btn btn-accent">
                        <PaymentRegular /> Pay now
                      </Link>
                    )}
                    {p.status === "GracePeriod" && (
                      <Link href={`/dashboard/policyholder/policies/purchase?payId=${p.id}`} className="btn btn-accent">
                        <PaymentRegular /> Settle payment
                      </Link>
                    )}
                    {canRenew(p) && (
                      <Link href={`/dashboard/policyholder/policies/purchase?renewId=${p.id}`} className="btn">
                        <ArrowRepeatAllRegular /> Renew
                      </Link>
                    )}
                    <button
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                      className="btn btn-subtle"
                      aria-expanded={isOpen}
                      aria-controls={`policy-${p.id}`}
                    >
                      Details
                      <ChevronDownRegular className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {p.pay_deadline && (
                  <div className="flex items-start gap-2 border-t border-[var(--divider-stroke)] bg-[var(--caution-bg)] px-5 py-2.5 t-body text-fg">
                    <WarningFilled fontSize={16} className="mt-0.5 shrink-0 text-[var(--caution)]" aria-hidden />
                    <p>
                      Payment due by <span className="font-semibold tabular-nums">{p.pay_deadline}</span> to keep coverage active.
                    </p>
                  </div>
                )}

                <div
                  id={`policy-${p.id}`}
                  className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.1,0.9,0.2,1)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-6 border-t border-[var(--divider-stroke)] bg-[var(--card-fill-secondary)] p-5 md:grid-cols-2">
                      <div>
                        <p className="mb-2 t-caption font-semibold text-fg-2">Payment schedule (approximate)</p>
                        {instalments.length > 0 ? (
                          <ol className="space-y-1.5">
                            {instalments.map((i) => (
                              <li key={i.index} className="flex items-center gap-3 t-body tabular-nums">
                                {i.paid ? (
                                  <CheckmarkCircleFilled fontSize={16} className="text-[var(--success)]" aria-hidden />
                                ) : (
                                  <CircleRegular fontSize={16} className="text-fg-3" aria-hidden />
                                )}
                                <span className="w-8 text-fg-2">#{i.index}</span>
                                <span className="text-fg">{i.dueDate}</span>
                                <span className={`ml-auto t-caption ${i.paid ? "text-[var(--success)]" : "text-fg-2"}`}>{i.paid ? "Paid" : "Due"}</span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="t-body text-fg-3">No schedule for this payment option.</p>
                        )}
                      </div>
                      <dl className="space-y-3 t-body">
                        <div className="flex justify-between gap-4">
                          <dt className="text-fg-2">Premium</dt>
                          <dd className="text-fg tabular-nums">RM {p.premium.toLocaleString()} — {p.payment_mode}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-fg-2">Coverage</dt>
                          <dd className="text-fg tabular-nums">
                            {p.start_date} → {p.end_date}
                          </dd>
                        </div>
                        {p.create_tx_hash && (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-fg-2">Transaction</dt>
                            <dd>
                              <HashDisplay hash={p.create_tx_hash} />
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
