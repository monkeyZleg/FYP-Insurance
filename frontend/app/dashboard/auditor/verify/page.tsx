"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import HashDisplay from "@/components/blockchain/HashDisplay";

export default function HashIntegrityCheckerPage() {
  const { wallet } = useRole();
  const [claimId, setClaimId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    offChainHash: string;
    onChainHash: string;
    match: boolean;
    recordedAt: string;
  } | null>(null);

  async function handleCheck() {
    if (!claimId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { claim } = await apiFetch(`/api/claims/${claimId.trim()}`, {}, wallet);
      if (!claim.on_chain_claim_id) throw new Error("This claim has not been recorded on-chain yet.");

      const onChain = await apiFetch(`/api/blockchain/claim/${claim.on_chain_claim_id}`, {}, wallet);
      const verify = await apiFetch(
        `/api/blockchain/verify/${claim.on_chain_claim_id}?hash=${claim.details_hash}`,
        {},
        wallet
      );

      setResult({
        offChainHash: claim.details_hash,
        onChainHash: onChain.detailsHash,
        match: verify.isValid,
        recordedAt: new Date(onChain.submittedAt * 1000).toLocaleString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Hash Integrity Checker</h1>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Claim ID</label>
        <div className="flex gap-3">
          <input
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            placeholder="Enter database claim ID..."
            className="flex-1 border rounded px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={handleCheck}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Verify"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div
            className={`text-center py-4 rounded-lg font-semibold ${
              result.match ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {result.match ? "✅ MATCH — Document has not been tampered with" : "❌ MISMATCH — Hash discrepancy detected — flag for investigation"}
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Off-Chain Hash (Supabase)</p>
            <HashDisplay hash={result.offChainHash} full />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">On-Chain Hash (Smart Contract)</p>
            <HashDisplay hash={result.onChainHash} full />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Recorded On-Chain At</p>
            <p className="text-sm font-medium">{result.recordedAt}</p>
          </div>
        </div>
      )}
    </div>
  );
}
