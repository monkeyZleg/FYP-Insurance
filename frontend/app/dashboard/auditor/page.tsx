"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import WalletConnect from "@/components/WalletConnect";
import AuditTrailTable from "@/components/AuditTrailTable";
import type { Claim } from "@/types";

export default function AuditorDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [wallet, setWallet] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [verifyClaimId, setVerifyClaimId] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

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
      setClaims(data.claims || []);
    } catch {
      setClaims([]);
    }
  }

  async function handleVerify() {
    if (!verifyClaimId || !verifyHash) return;
    try {
      const data = await apiFetch(
        `/api/blockchain/verify/${verifyClaimId}?hash=${verifyHash}`,
        {},
        wallet
      );
      setVerifyResult(
        data.isValid
          ? "Document hash matches on-chain record."
          : "MISMATCH: Document hash does NOT match on-chain record."
      );
    } catch (err) {
      setVerifyResult(
        err instanceof Error ? err.message : "Verification failed"
      );
    }
  }

  function exportCSV() {
    const header = "ID,Type,Status,Submitted,TX Hash\n";
    const rows = claims
      .map(
        (c) =>
          `${c.id},${c.claim_type},${c.status},${c.submitted_at},${c.tx_hash || "N/A"}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-900">BEICVS — Auditor</h1>
        <WalletConnect />
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Audit Dashboard</h2>
          <button
            onClick={exportCSV}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900"
          >
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h3 className="font-semibold mb-4">Hash Integrity Check</h3>
          <div className="flex gap-3">
            <input
              value={verifyClaimId}
              onChange={(e) => setVerifyClaimId(e.target.value)}
              placeholder="Blockchain Claim ID (bytes32)"
              className="flex-1 border rounded px-3 py-2 text-sm font-mono"
            />
            <input
              value={verifyHash}
              onChange={(e) => setVerifyHash(e.target.value)}
              placeholder="Document Hash (0x...)"
              className="flex-1 border rounded px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={handleVerify}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Verify
            </button>
          </div>
          {verifyResult && (
            <p
              className={`text-sm mt-3 ${verifyResult.includes("MISMATCH") ? "text-red-600" : "text-green-600"}`}
            >
              {verifyResult}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3">Claim ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">TX Hash</th>
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
                  <td className="px-4 py-3">{claim.status}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">
                    {claim.tx_hash ? (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${claim.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {claim.tx_hash.slice(0, 10)}...
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(claim.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {claim.blockchain_claim_id && (
                      <button
                        onClick={() =>
                          setSelectedClaimId(
                            selectedClaimId === claim.blockchain_claim_id
                              ? null
                              : claim.blockchain_claim_id
                          )
                        }
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {selectedClaimId === claim.blockchain_claim_id
                          ? "Hide Trail"
                          : "Audit Trail"}
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

        {selectedClaimId && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">
              Blockchain Audit Trail — {selectedClaimId.slice(0, 10)}...
            </h3>
            <AuditTrailTable
              claimId={selectedClaimId}
              walletAddress={wallet}
            />
          </div>
        )}
      </div>
    </div>
  );
}
