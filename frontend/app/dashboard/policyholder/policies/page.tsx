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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Buy a Policy
        </Link>
      </div>

      {policies.length === 0 && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          <p className="mb-4">You don&apos;t have any policies yet.</p>
          <Link href="/dashboard/policyholder/policies/plans" className="text-blue-600 hover:underline text-sm">
            Browse preset plans →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {policies.map((p) => {
          const cfg = POLICY_TYPE_CONFIG[p.policy_type];
          const isOpen = expanded === p.id;
          const instalments = buildInstalmentSchedule(p);
          return (
            <div key={p.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{cfg.icon}</span>
                    <span className="font-mono text-xs text-gray-400">{p.policy_number}</span>
                    <PolicyStatusBadge status={p.status} />
                  </div>
                  <h3 className="font-semibold text-lg">{p.plan_name}</h3>
                  <p className="text-xs text-gray-400">
                    {p.start_date} → {p.end_date}
                  </p>
                  {p.pay_deadline && (
                    <p className="text-xs text-red-600 mt-1">Payment due by: {p.pay_deadline}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {p.paid_instalments} of {p.total_instalments} instalment(s) paid
                  </p>
                </div>
                <div className="flex gap-2">
                  {p.status === "PendingPayment" && (
                    <Link
                      href={`/dashboard/policyholder/policies/purchase?payId=${p.id}`}
                      className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Pay Now
                    </Link>
                  )}
                  {p.status === "GracePeriod" && (
                    <Link
                      href={`/dashboard/policyholder/policies/purchase?payId=${p.id}`}
                      className="text-sm bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600"
                    >
                      Settle Payment
                    </Link>
                  )}
                  {canRenew(p) && (
                    <Link
                      href={`/dashboard/policyholder/policies/purchase?renewId=${p.id}`}
                      className="text-sm border px-4 py-2 rounded-lg hover:bg-gray-50"
                    >
                      Renew
                    </Link>
                  )}
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="text-sm border px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    {isOpen ? "Hide" : "Details"}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t bg-gray-50 p-6 space-y-4">
                  {instalments.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Payment Schedule (approximate)</p>
                      <div className="bg-white rounded-lg overflow-hidden border">
                        <table className="w-full text-sm">
                          <tbody>
                            {instalments.map((i) => (
                              <tr key={i.index} className="border-b last:border-0">
                                <td className="px-3 py-2">#{i.index}</td>
                                <td className="px-3 py-2">{i.dueDate}</td>
                                <td className="px-3 py-2">
                                  {i.paid ? (
                                    <span className="text-green-600 font-medium">Paid</span>
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
    </div>
  );
}
