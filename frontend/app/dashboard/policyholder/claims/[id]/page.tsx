"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import ClaimStatusTracker from "@/components/claims/ClaimStatusTracker";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import HashDisplay from "@/components/blockchain/HashDisplay";
import { getInsuranceConfig } from "@/constants/insurance";
import type { Claim, Document as ClaimDocument } from "@/types";

interface OnChainClaim {
  detailsHash: string;
  status: number;
  submittedAt: number;
  decidedAt: number;
}

export default function ClaimDetailPage() {
  const params = useParams();
  const claimId = params.id as string;
  const { token } = useRole();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [onChain, setOnChain] = useState<OnChainClaim | null>(null);

  useEffect(() => {
    if (!token || !claimId) return;
    apiFetchAuth(`/api/claims/${claimId}`, {}, token)
      .then((d) => setClaim(d.claim))
      .catch(() => setClaim(null));
    apiFetchAuth(`/api/documents/${claimId}`, {}, token)
      .then((d) => setDocuments(d.documents || []))
      .catch(() => setDocuments([]));
  }, [claimId, token]);

  useEffect(() => {
    if (!token || !claim?.on_chain_claim_id) return;
    apiFetchAuth(`/api/blockchain/claim/${claim.on_chain_claim_id}`, {}, token)
      .then(setOnChain)
      .catch(() => setOnChain(null));
  }, [claim?.on_chain_claim_id, token]);

  if (!claim) return <p className="text-gray-400">Loading claim...</p>;

  const config = getInsuranceConfig(claim.insurance_type);
  const hashMatch = onChain && claim.details_hash ? onChain.detailsHash === claim.details_hash : null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold">Claim Detail</h1>
        <InsuranceTypeBadge type={claim.insurance_type} />
        {claim.flagged && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            Flagged for audit
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 font-mono mb-6">{claim.id}</p>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <ClaimStatusTracker status={claim.status} />
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6 space-y-3">
        <h2 className="font-semibold mb-2">Claim Information</h2>
        <Row label="Policy Number" value={(claim.details?.policyNumber as string) || "—"} />
        <Row label="Claim Type" value={claim.claim_type} />
        <Row label="Incident Date" value={claim.incident_date} />
        <Row label="Description" value={claim.description} />
        <Row label="Submitted" value={new Date(claim.submitted_at).toLocaleString()} />
        {config &&
          config.fields
            .filter((f) => !["policyNumber", "date", "description", "claimType"].includes(f.role || ""))
            .map((f) => (
              <Row key={f.key} label={f.label} value={(claim.details?.[f.key] as string) || "—"} />
            ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-semibold mb-4">Documents</h2>
        {documents.length === 0 && <p className="text-sm text-gray-400">No documents uploaded.</p>}
        <ul className="space-y-3">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <div>
                <p className="text-sm font-medium">{d.file_name}</p>
                <p className="text-xs text-gray-400">{new Date(d.uploaded_at).toLocaleDateString()}</p>
                <HashDisplay hash={d.file_hash} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6 space-y-3">
        <h2 className="font-semibold mb-2">Blockchain Record</h2>
        <Row label="On-Chain Claim ID" value={claim.on_chain_claim_id || "Not yet recorded"} mono />
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Transaction Hash</span>
          <HashDisplay hash={claim.submit_tx_hash} etherscanTx />
        </div>
        {onChain && (
          <>
            <Row label="Block Recorded" value={new Date(onChain.submittedAt * 1000).toLocaleString()} />
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Hash Integrity Check</span>
              <span className={hashMatch ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {hashMatch ? "MATCH ✅" : "MISMATCH ❌"}
              </span>
            </div>
          </>
        )}
      </div>

      {claim.verifier_remark && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-2">Verifier Remark</h2>
          <p className="text-sm text-gray-600">{claim.verifier_remark}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</span>
    </div>
  );
}
