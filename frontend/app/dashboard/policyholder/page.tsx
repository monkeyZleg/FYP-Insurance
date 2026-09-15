"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import WalletConnect from "@/components/WalletConnect";
import ClaimForm from "@/components/ClaimForm";
import ClaimStatusTracker from "@/components/ClaimStatusTracker";
import type { Claim } from "@/types";

export default function PolicyholderDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [wallet, setWallet] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const w = localStorage.getItem("wallet") || "";
    setWallet(w);
    if (w) loadClaims(w);
  }, []);

  async function loadClaims(w: string) {
    try {
      const data = await apiFetch("/api/claims/my", {}, w);
      setClaims(data.claims || []);
    } catch {
      setClaims([]);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-900">
          BEICVS — Policyholder
        </h1>
        <WalletConnect />
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">My Claims</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "+ New Claim"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <ClaimForm
              onSubmitted={() => {
                setShowForm(false);
                loadClaims(wallet);
              }}
            />
          </div>
        )}

        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs text-gray-400 font-mono">
                    {claim.id.slice(0, 8)}
                  </span>
                  <h3 className="font-semibold text-lg">{claim.claim_type}</h3>
                  <p className="text-sm text-gray-500">{claim.description}</p>
                </div>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    claim.status === "Approved"
                      ? "bg-green-100 text-green-700"
                      : claim.status === "Rejected"
                        ? "bg-red-100 text-red-700"
                        : claim.status === "UnderReview"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {claim.status}
                </span>
              </div>
              <ClaimStatusTracker status={claim.status} />
              {claim.verifier_remark && (
                <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3">
                  <span className="font-medium">Verifier remark:</span>{" "}
                  {claim.verifier_remark}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Submitted: {new Date(claim.submitted_at).toLocaleDateString()}
              </p>
            </div>
          ))}
          {claims.length === 0 && (
            <p className="text-center text-gray-400 py-12">
              No claims yet. Click &quot;+ New Claim&quot; to submit one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
