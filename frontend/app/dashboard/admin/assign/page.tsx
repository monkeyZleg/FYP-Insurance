"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { useClaimRegistry } from "@/hooks/useContract";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import type { Claim, User } from "@/types";

export default function AssignClaimsPage() {
  const { wallet } = useRole();
  const { assignClaimOnChain } = useClaimRegistry();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [verifiers, setVerifiers] = useState<User[]>([]);
  const [modalClaim, setModalClaim] = useState<Claim | null>(null);
  const [selectedVerifier, setSelectedVerifier] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkVerifier, setBulkVerifier] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    loadClaims();
    apiFetch("/api/auth/users", {}, wallet).then((d) =>
      setVerifiers((d.users || []).filter((u: User) => u.role === "verifier" && u.is_active !== false))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  async function loadClaims() {
    const data = await apiFetch("/api/claims/all", {}, wallet);
    setClaims((data.claims || []).filter((c: Claim) => c.status === "Pending"));
  }

  async function assignOne(claim: Claim, verifierId: string) {
    const verifier = verifiers.find((v) => v.id === verifierId);
    if (!verifier) return;
    if (claim.blockchain_claim_id) {
      await assignClaimOnChain(claim.blockchain_claim_id, verifier.wallet_address).catch(() => null);
    }
    await apiFetch(`/api/claims/${claim.id}/assign`, { method: "PATCH", body: JSON.stringify({ verifierId }) }, wallet);
  }

  async function handleAssign() {
    if (!modalClaim || !selectedVerifier) return;
    setProcessing(true);
    try {
      await assignOne(modalClaim, selectedVerifier);
      setModalClaim(null);
      setSelectedVerifier("");
      await loadClaims();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setProcessing(false);
    }
  }

  async function handleBulkAssign() {
    if (!bulkVerifier || selected.length === 0) return;
    setProcessing(true);
    try {
      for (const id of selected) {
        const claim = claims.find((c) => c.id === id);
        if (claim) await assignOne(claim, bulkVerifier);
      }
      setSelected([]);
      setBulkVerifier("");
      await loadClaims();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk assignment failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Assign Pending Claims</h1>

      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <select
            value={bulkVerifier}
            onChange={(e) => setBulkVerifier(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">Select verifier...</option>
            {verifiers.map((v) => (
              <option key={v.id} value={v.id}>
                {v.full_name || v.wallet_address}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={!bulkVerifier || processing}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
          >
            Bulk Assign
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.length === claims.length && claims.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? claims.map((c) => c.id) : [])}
                />
              </th>
              <th className="px-4 py-3">Claim ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Policyholder</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) =>
                      setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((id) => id !== c.id)))
                    }
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.id.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <InsuranceTypeBadge type={c.insurance_type} />
                </td>
                <td className="px-4 py-3 text-xs">{new Date(c.submitted_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {c.policyholder?.wallet_address?.slice(0, 10) || c.policyholder_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setModalClaim(c)} className="text-blue-600 hover:underline">
                    Assign
                  </button>
                </td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-12">
                  No pending claims to assign.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Assign to Verifier</h3>
            <p className="text-sm text-gray-500 mb-4">
              Claim: {modalClaim.claim_type} ({modalClaim.id.slice(0, 8)})
            </p>
            <select
              value={selectedVerifier}
              onChange={(e) => setSelectedVerifier(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
            >
              <option value="">Select verifier...</option>
              {verifiers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.full_name || v.wallet_address}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleAssign}
                disabled={!selectedVerifier || processing}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40"
              >
                {processing ? "Assigning..." : "Assign"}
              </button>
              <button
                onClick={() => {
                  setModalClaim(null);
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
  );
}
