"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import WalletConnect from "@/components/WalletConnect";
import type { Claim, User } from "@/types";

export default function AdminDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [wallet, setWallet] = useState("");
  const [activeTab, setActiveTab] = useState<"claims" | "users">("claims");
  const [users, setUsers] = useState<User[]>([]);
  const [assignModal, setAssignModal] = useState<Claim | null>(null);
  const [selectedVerifier, setSelectedVerifier] = useState("");

  useEffect(() => {
    const w = localStorage.getItem("wallet") || "";
    setWallet(w);
  }, []);

  useEffect(() => {
    if (wallet) {
      loadClaims();
    }
  }, [wallet]);

  async function loadClaims() {
    try {
      const data = await apiFetch("/api/claims/all", {}, wallet);
      setClaims(data.claims || []);
    } catch {
      setClaims([]);
    }
  }

  async function handleAssign() {
    if (!assignModal || !selectedVerifier) return;
    try {
      await apiFetch(
        `/api/claims/${assignModal.id}/assign`,
        {
          method: "PATCH",
          body: JSON.stringify({ verifierId: selectedVerifier }),
        },
        wallet
      );
      setAssignModal(null);
      setSelectedVerifier("");
      loadClaims();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Assignment failed");
    }
  }

  const statusColors: Record<string, string> = {
    Pending: "bg-gray-100 text-gray-600",
    UnderReview: "bg-yellow-100 text-yellow-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-900">
          BEICVS — Admin
        </h1>
        <WalletConnect />
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("claims")}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === "claims" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            All Claims
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === "users" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            Users
          </button>
        </div>

        {activeTab === "claims" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Policyholder</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      {claim.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">{claim.claim_type}</td>
                    <td className="px-4 py-3 text-xs">
                      {claim.policyholder_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[claim.status] || ""}`}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(claim.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {claim.status === "Pending" && (
                        <button
                          onClick={() => setAssignModal(claim)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {claims.length === 0 && (
              <p className="text-center text-gray-400 py-12">No claims found.</p>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">
              User management is available through the Supabase dashboard and
              the /api/auth/register endpoint.
            </p>
          </div>
        )}

        {assignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Assign to Verifier</h3>
              <p className="text-sm text-gray-500 mb-4">
                Claim: {assignModal.claim_type} ({assignModal.id.slice(0, 8)})
              </p>
              <input
                value={selectedVerifier}
                onChange={(e) => setSelectedVerifier(e.target.value)}
                placeholder="Enter verifier user ID"
                className="w-full border rounded px-3 py-2 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleAssign}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  Assign
                </button>
                <button
                  onClick={() => {
                    setAssignModal(null);
                    setSelectedVerifier("");
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
