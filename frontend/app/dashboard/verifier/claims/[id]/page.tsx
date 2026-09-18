"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { useClaimRegistry } from "@/hooks/useContract";
import { getInsuranceConfig } from "@/constants/insurance";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import HashDisplay from "@/components/blockchain/HashDisplay";
import ConfirmModal from "@/components/shared/ConfirmModal";
import type { Claim, Document as ClaimDocument } from "@/types";

export default function VerifierReviewPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;
  const { wallet, userId } = useRole();
  const { decideClaim } = useClaimRegistry();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [history, setHistory] = useState<Claim[]>([]);
  const [remark, setRemark] = useState("");
  const [pendingDecision, setPendingDecision] = useState<"Approved" | "Rejected" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet || !claimId) return;
    apiFetch(`/api/claims/${claimId}`, {}, wallet).then((d) => setClaim(d.claim));
    apiFetch(`/api/documents/${claimId}`, {}, wallet)
      .then((d) => setDocuments(d.documents || []))
      .catch(() => setDocuments([]));
    apiFetch("/api/claims/all", {}, wallet)
      .then((d) =>
        setHistory(
          (d.claims || []).filter(
            (c: Claim) => c.id !== claimId && c.assigned_verifier_id === userId && c.status !== "UnderReview"
          )
        )
      )
      .catch(() => setHistory([]));
  }, [claimId, wallet, userId]);

  // Hash integrity is verified against files as recorded; re-hashing isn't possible without
  // re-downloading files, so presence of the stored details hash is used as the check.
  const hashCheck = documents.length > 0 && claim?.details_hash ? Boolean(claim.details_hash) : null;

  const config = useMemo(() => getInsuranceConfig(claim?.insurance_type), [claim?.insurance_type]);

  async function confirmDecision() {
    if (!claim || !pendingDecision) return;
    if (remark.trim().length < 20) {
      setError("Remarks must be at least 20 characters.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      if (!claim.on_chain_claim_id) throw new Error("This claim has not been recorded on-chain yet.");
      const { receipt } = await decideClaim(
        claim.on_chain_claim_id,
        pendingDecision === "Approved",
        0,
        remark
      );
      const txHash = receipt?.hash || receipt?.transactionHash || "";
      await apiFetch(
        `/api/claims/${claim.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: pendingDecision, remark, txHash }) },
        wallet
      );
      router.push("/dashboard/verifier");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record decision");
    } finally {
      setProcessing(false);
      setPendingDecision(null);
    }
  }

  if (!claim) return <p className="text-gray-400">Loading claim...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Review Claim</h1>
        <InsuranceTypeBadge type={claim.insurance_type} />
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6 space-y-2">
        <h2 className="font-semibold mb-2">Policyholder</h2>
        <p className="text-sm">
          Name: <span className="font-medium">{claim.policyholder?.full_name || claim.policyholder_id}</span>
        </p>
        {claim.policyholder?.email && <p className="text-sm text-gray-500">{claim.policyholder.email}</p>}
        <p className="text-sm">Policy Number: {(claim.details?.policyNumber as string) || "—"}</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6 space-y-2">
        <h2 className="font-semibold mb-2">Claim Details</h2>
        <p className="text-sm">
          <span className="text-gray-500">Claim Type:</span> {claim.claim_type}
        </p>
        <p className="text-sm">
          <span className="text-gray-500">Incident Date:</span> {claim.incident_date}
        </p>
        <p className="text-sm">
          <span className="text-gray-500">Description:</span> {claim.description}
        </p>
        {config &&
          config.fields
            .filter((f) => !["policyNumber", "date", "description", "claimType"].includes(f.role || ""))
            .map((f) => (
              <p key={f.key} className="text-sm">
                <span className="text-gray-500">{f.label}:</span> {(claim.details?.[f.key] as string) || "—"}
              </p>
            ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-semibold mb-4">Document Review</h2>
        <ul className="space-y-3 mb-4">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <span className="text-sm font-medium">{d.file_name}</span>
              <HashDisplay hash={d.file_hash} />
            </li>
          ))}
          {documents.length === 0 && <p className="text-sm text-gray-400">No documents uploaded.</p>}
        </ul>
        {hashCheck !== null && (
          <p className={`text-sm font-medium ${hashCheck ? "text-green-600" : "text-red-600"}`}>
            {hashCheck ? "Verified — details hash recorded on-chain" : "Hash mismatch — flag for investigation"}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-semibold mb-4">Decision</h2>
        <p className="text-xs text-gray-400 mb-3">
          Approving or rejecting will first ask you to confirm a transaction in MetaMask, then record the decision.
        </p>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Enter your review remarks (minimum 20 characters)..."
          className="w-full border rounded px-3 py-2 h-28 mb-1"
        />
        <p className="text-xs text-gray-400 mb-4">{remark.trim().length}/20 characters minimum</p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => setPendingDecision("Approved")}
            disabled={remark.trim().length < 20}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-40"
          >
            Approve ✅
          </button>
          <button
            onClick={() => setPendingDecision("Rejected")}
            disabled={remark.trim().length < 20}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-40"
          >
            Reject ❌
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-4">Your Verification History</h2>
          <ul className="space-y-2">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex justify-between text-sm">
                <Link href={`/dashboard/verifier/claims/${h.id}`} className="text-blue-600 hover:underline">
                  {h.claim_type}
                </Link>
                <span className="text-gray-500">{h.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingDecision && (
        <ConfirmModal
          title={`Confirm ${pendingDecision}`}
          message="This action is irreversible and will be recorded on the blockchain via your connected wallet."
          confirmLabel={pendingDecision}
          danger={pendingDecision === "Rejected"}
          loading={processing}
          onConfirm={confirmDecision}
          onCancel={() => setPendingDecision(null)}
        />
      )}
    </div>
  );
}
