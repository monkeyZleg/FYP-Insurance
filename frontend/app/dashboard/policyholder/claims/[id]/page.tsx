"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import ClaimStatusTracker from "@/components/claims/ClaimStatusTracker";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import HashDisplay from "@/components/blockchain/HashDisplay";
import Mascot from "@/components/mascot/Mascot";
import { getInsuranceConfig } from "@/constants/insurance";
import { safeTimeline } from "@/lib/motion";
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
  const bannerRef = useRef<HTMLDivElement>(null);
  const animatedStatus = useRef<string | null>(null);

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

  // Moment D: claim outcome (design spec Part 3.3.D). Plays once per status,
  // when the claim has settled into Approved/Settled/Rejected. A rejected
  // claim gets the same calm animation as an approval — never a "sad" one.
  useEffect(() => {
    if (!claim) return;
    const outcome = ["Approved", "Settled", "Rejected"].includes(claim.status);
    if (!outcome || animatedStatus.current === claim.status) return;
    animatedStatus.current = claim.status;
    safeTimeline((tl) => {
      tl.to("#claim-outcome-mascot-body", { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1 });
      if (bannerRef.current) {
        tl.from(bannerRef.current, { opacity: 0, y: 10, duration: 0.3 }, "-=0.1");
      }
    });
  }, [claim]);

  if (!claim) return <p className="text-gray-400">Loading claim...</p>;

  const config = getInsuranceConfig(claim.insurance_type);
  const hashMatch = onChain && claim.details_hash ? onChain.detailsHash === claim.details_hash : null;
  const isOutcome = ["Approved", "Settled", "Rejected"].includes(claim.status);
  const isHappyOutcome = claim.status === "Approved" || claim.status === "Settled";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold">Claim Detail</h1>
        <InsuranceTypeBadge type={claim.insurance_type} />
        {claim.flagged && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#FDECEC] text-failure">
            Flagged for audit
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 font-mono mb-6">{claim.id}</p>

      {isOutcome && (
        <div
          ref={bannerRef}
          className={`outcome-banner flex items-center gap-4 rounded-xl border p-5 mb-6 ${
            isHappyOutcome ? "bg-[#E6F7F2] border-ledger-mint/30" : "bg-[#FDECEC] border-failure/25"
          }`}
        >
          <Mascot id="claim-outcome-mascot" mood={isHappyOutcome ? "happy" : "neutral"} className="w-14 h-14 shrink-0" />
          <div>
            <p className={`font-semibold ${isHappyOutcome ? "text-[#0F8F70]" : "text-failure"}`}>
              {claim.status === "Settled"
                ? "Your claim has been settled"
                : claim.status === "Approved"
                  ? "Your claim was approved"
                  : "Your claim was not approved this time"}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {isHappyOutcome
                ? "The payout has been recorded and verified on-chain."
                : "See the verifier remark below for the reason and what to do next."}
            </p>
          </div>
        </div>
      )}

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
              <span className={hashMatch ? "text-[#0F8F70] font-medium" : "text-failure font-medium"}>
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
