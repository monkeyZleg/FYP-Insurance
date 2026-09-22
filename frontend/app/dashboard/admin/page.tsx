"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { INSURANCE_TYPES } from "@/constants/insurance";
import type { Claim, User } from "@/types";

export default function AdminOverview() {
  const { wallet } = useRole();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!wallet) return;
    apiFetch("/api/claims/all", {}, wallet).then((d) => setClaims(d.claims || []));
    apiFetch("/api/auth/users", {}, wallet).then((d) => setUsers(d.users || []));
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 mb-2">Users by Role</p>
          {Object.entries(usersByRole).map(([role, n]) => (
            <div key={role} className="flex justify-between text-sm">
              <span className="capitalize text-gray-600">{role}</span>
              <span className="font-medium">{n}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 mb-2">Claims by Status</p>
          {Object.entries(claimsByStatus).map(([status, n]) => (
            <div key={status} className="flex justify-between text-sm">
              <span className="text-gray-600">{status}</span>
              <span className="font-medium">{n}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 mb-2">Claims by Insurance Type</p>
          {INSURANCE_TYPES.map((t) => (
            <div key={t.id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {t.icon} {t.label}
              </span>
              <span className="font-medium">{claimsByType[t.id] || 0}</span>
            </div>
          ))}
        </div>
        <div className={`rounded-xl shadow p-5 ${unassignedPending > 0 ? "bg-[#FFF6E5] border border-[#FFB020]/40" : "bg-white"}`}>
          <p className="text-xs text-gray-500 mb-1">Unassigned Pending Claims</p>
          <p className={`text-2xl font-bold ${unassignedPending > 0 ? "text-[#B8760A]" : "text-ink"}`}>
            {unassignedPending}
          </p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Link
          href="/dashboard/admin/assign"
          className="bg-chain-indigo text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2F3FC0]"
        >
          Assign Pending Claims
        </Link>
        <Link
          href="/dashboard/admin/users"
          className="bg-white border px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-cloud"
        >
          + Add New User
        </Link>
        <Link
          href="/dashboard/admin/assign"
          className="bg-white border px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-cloud"
        >
          View All Claims
        </Link>
      </div>
    </div>
  );
}
