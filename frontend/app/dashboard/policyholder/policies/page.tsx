"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRole } from "@/hooks/useRole";
import { buildInstalmentSchedule, canRenew, myPolicies } from "@/lib/policyApi";
import { POLICY_TYPE_CONFIG } from "@/constants/policyPlans";
import PolicyStatusBadge from "@/components/policy/PolicyStatusBadge";
import type { PolicyRow } from "@/types";

export default function MyPoliciesPage() {
  const { token } = useRole();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    myPolicies(token).then(setPolicies).catch(() => setPolicies([]));
  }, [token]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">My Policies</h1>
        <Link
          href="/dashboard/policyholder/policies/plans"
          className="bg-chain-indigo text-white px-4 py-2 rounded-lg text-sm hover:bg-[#2F3FC0]"
        >
          + Buy a Policy
        </Link>
      </div>

      {policies.length === 0 && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          <p className="mb-4">You don&apos;t have any policies yet.</p>
          <Link href="/dashboard/policyholder/policies/plans" className="text-chain-indigo hover:underline text-sm">
            Browse preset plans →
          </Link>
        </div>
      )}

      {policies.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
          {policies.map((p) => {
            const cfg = POLICY_TYPE_CONFIG[p.policy_type];
            const isOpen = expanded === p.id;
            const instalments = buildInstalmentSchedule(p);
            return (
              <div key={p.id}>
                <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span>{cfg.icon}</span>
                      <span className="font-medium text-ink">
                        {cfg.label} · {p.plan_name}
                      </span>
                      <span className="font-mono text-xs text-gray-400">{p.policy_number}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <PolicyStatusBadge status={p.status} dot />
                      <span className="text-xs text-gray-500">
                        ends {p.end_date} · {p.paid_instalments}/{p.total_instalments} paid
                      </span>
                    </div>
                    {p.pay_deadline && (
                      <p className="text-xs text-failure mt-1">Payment due by: {p.pay_deadline}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-bold text-ink tabular-nums">
                      RM {p.premium.toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      {p.status === "PendingPayment" && (
                        <Link
                          href={`/dashboard/policyholder/policies/purchase?payId=${p.id}`}
                          className="text-sm bg-chain-indigo text-white px-4 py-2 rounded-lg hover:bg-[#2F3FC0] transition-colors"
                        >
                          Pay Now
                        </Link>
                      )}
                      {p.status === "GracePeriod" && (
                        <Link
                          href={`/dashboard/policyholder/policies/purchase?payId=${p.id}`}
                          className="text-sm bg-amber-spark text-ink px-4 py-2 rounded-lg hover:bg-[#E89D14] transition-colors"
                        >
                          Settle Payment
                        </Link>
                      )}
                      {canRenew(p) && (
                        <Link
                          href={`/dashboard/policyholder/policies/purchase?renewId=${p.id}`}
                          className="text-sm border border-border px-4 py-2 rounded-lg hover:bg-cloud transition-colors"
                        >
                          Renew
                        </Link>
                      )}
                      <button
                        onClick={() => setExpanded(isOpen ? null : p.id)}
                        className="text-sm border border-border px-4 py-2 rounded-lg hover:bg-cloud transition-colors"
                      >
                        {isOpen ? "Hide" : "Details"}
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-cloud p-5 space-y-4">
                    {instalments.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Payment Schedule (approximate)</p>
                        <div className="bg-white rounded-lg overflow-hidden border border-border">
                          <table className="w-full text-sm tabular-nums">
                            <tbody>
                              {instalments.map((i) => (
                                <tr key={i.index} className="border-b border-border last:border-0">
                                  <td className="px-3 py-2">#{i.index}</td>
                                  <td className="px-3 py-2">{i.dueDate}</td>
                                  <td className="px-3 py-2">
                                    {i.paid ? (
                                      <span className="text-[#0F8F70] font-medium">Paid</span>
                                    ) : (
                                      <span className="text-gray-400">Due</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-500">
                      Premium RM {p.premium.toLocaleString()} — {p.payment_mode}
                      {p.create_tx_hash && (
                        <span className="block font-mono text-xs mt-1 truncate">Tx: {p.create_tx_hash}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
