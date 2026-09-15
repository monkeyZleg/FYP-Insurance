"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import WalletConnect from "@/components/WalletConnect";
import type { Claim } from "@/types";

export default function VerifierDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [wallet, setWallet] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [remark, setRemark] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const w = localStorage.getItem("wallet") || "";
    setWallet(w);
  }, []);

  useEffect(() => {
    if (wallet) loadClaims();
  }, [wallet]);

  async function loadClaims() {
    try {
      const data = await apiFetch("/api/claims/all", {}, wallet);
      const assigned = (data.claims || []).filter(
        (c: Claim) =>
          c.status === "UnderReview" && c.assigned_verifier_id !== null
      );
      setClaims(assigned);
    } catch {
      setClaims([]);
    }
  }

  async function handleDecision(approved: boolean) {
    if (!selectedClaim) return;
    setProcessing(true);
    try {
      await apiFetch(
        `/api/claims/${selectedClaim.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: approved ? "Approved" : "Rejected",
            remark,
          }),
        },
        wallet
      );
      setSelectedClaim(null);
      setRemark("");
      loadClaims();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-900">
          BEICVS — Claim Verifier
        </h1>
        <WalletConnect />
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-6">Assigned Claims</h2>

        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-gray-400 font-mono">
                    {claim.id.slice(0, 8)}
                  </span>
                  <h3 className="font-semibold text-lg">{claim.claim_type}</h3>
                  <p className="text-sm text-gray-500">{claim.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Incident: {claim.incident_date} | Submitted:{" "}
                    {new Date(claim.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedClaim(claim)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
          {claims.length === 0 && (
            <p className="text-center text-gray-400 py-12">
              No claims assigned for review.
            </p>
          )}
        </div>

        {selectedClaim && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Review Claim</h3>
              <div className="space-y-2 mb-4">
                <p>
                  <span className="font-medium">Type:</span>{" "}
                  {selectedClaim.claim_type}
                </p>
                <p>
                  <span className="font-medium">Description:</span>{" "}
                  {selectedClaim.description}
                </p>
                <p>
                  <span className="font-medium">Incident Date:</span>{" "}
                  {selectedClaim.incident_date}
                </p>
              </div>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter your review remarks..."
                className="w-full border rounded px-3 py-2 h-24 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleDecision(true)}
                  disabled={processing}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleDecision(false)}
                  disabled={processing}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setSelectedClaim(null);
                    setRemark("");
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
