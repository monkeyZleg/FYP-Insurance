"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import ClaimStatusTracker from "@/components/claims/ClaimStatusTracker";
import HashDisplay from "@/components/blockchain/HashDisplay";
import Mascot from "@/components/mascot/Mascot";
import { getInsuranceConfig } from "@/constants/insurance";
import { safeTimeline } from "@/lib/motion";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/shared/StatusPill";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import EmptyState from "@/components/ui/EmptyState";
import {
  CubeRegular,
  DocumentMultipleRegular,
  FlagFilled,
  PersonFeedbackRegular,
  ShieldCheckmarkFilled,
  ShieldErrorFilled,
} from "@fluentui/react-icons";
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

  if (!claim) return <DetailSkeleton />;

  const config = getInsuranceConfig(claim.insurance_type);
  const hashMatch = onChain && claim.details_hash ? onChain.detailsHash === claim.details_hash : null;
  const isOutcome = ["Approved", "Settled", "Rejected"].includes(claim.status);
  const isHappyOutcome = claim.status === "Approved" || claim.status === "Settled";

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "My claims", href: "/dashboard/policyholder/claims" }, { label: `#${claim.id.slice(0, 8)}` }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <CategoryGlyph type={claim.insurance_type} variant="solid" size={36} />
            {claim.claim_type}
          </span>
        }
        actions={
          <>
            {claim.flagged && (
              <span className="badge badge-critical">
                <FlagFilled aria-hidden /> Flagged for audit
              </span>
            )}
            <StatusPill status={claim.status} />
          </>
        }
      />

      {isOutcome && (
        <div
          ref={bannerRef}
          className="outcome-banner relative mb-6 flex items-center gap-4 overflow-hidden rounded-[var(--radius-overlay)] border border-[var(--card-stroke)] p-5"
          style={{ background: isHappyOutcome ? "var(--success-bg)" : "var(--critical-bg)" }}
        >
          <Mascot id="claim-outcome-mascot" mood={isHappyOutcome ? "happy" : "neutral"} className="h-14 w-14 shrink-0" />
          <div>
            <p className="t-body-large font-semibold" style={{ color: isHappyOutcome ? "var(--success)" : "var(--critical)" }}>
              {claim.status === "Settled"
                ? "Your claim has been settled"
                : claim.status === "Approved"
                  ? "Your claim was approved"
                  : "Your claim was not approved this time"}
            </p>
            <p className="mt-0.5 t-body text-fg-2">
              {isHappyOutcome
                ? "The payout has been recorded and verified on-chain."
                : "See the verifier remark below for the reason and what to do next."}
            </p>
          </div>
        </div>
      )}

      <section className="card enter enter-1 mb-6 p-6 sm:px-8" aria-label="Progress">
        <ClaimStatusTracker status={claim.status} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="card enter enter-2 overflow-hidden">
            <h2 className="border-b border-[var(--divider-stroke)] px-5 py-3.5 t-body-strong text-fg">Claim information</h2>
            <dl className="divide-y divide-[var(--divider-stroke)]">
              <Row label="Policy number" value={(claim.details?.policyNumber as string) || "—"} mono />
              <Row label="Claim type" value={claim.claim_type} />
              <Row label="Incident date" value={claim.incident_date} />
              <Row label="Description" value={claim.description} />
              <Row label="Submitted" value={new Date(claim.submitted_at).toLocaleString()} />
              {config &&
                config.fields
                  .filter((f) => !["policyNumber", "date", "description", "claimType"].includes(f.role || ""))
                  .map((f) => <Row key={f.key} label={f.label} value={(claim.details?.[f.key] as string) || "—"} />)}
            </dl>
          </section>

          {claim.verifier_remark && (
            <section className="card enter enter-3 p-5">
              <h2 className="mb-3 flex items-center gap-2 t-body-strong text-fg">
                <PersonFeedbackRegular fontSize={18} className="text-fg-2" aria-hidden /> Verifier remark
              </h2>
              <blockquote className="border-l-[3px] border-[var(--accent-fill)] pl-4 t-body text-fg">{claim.verifier_remark}</blockquote>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card enter enter-3 overflow-hidden">
            <h2 className="flex items-center gap-2 border-b border-[var(--divider-stroke)] px-5 py-3.5 t-body-strong text-fg">
              <CubeRegular fontSize={18} className="text-fg-2" aria-hidden /> Blockchain record
            </h2>
            {hashMatch !== null && (
              <div
                className="m-4 mb-0 flex items-center gap-3 rounded-[var(--radius-control)] p-3"
                style={{ background: hashMatch ? "var(--success-bg)" : "var(--critical-bg)" }}
              >
                {hashMatch ? (
                  <ShieldCheckmarkFilled fontSize={24} className="shrink-0 text-[var(--success)]" aria-hidden />
                ) : (
                  <ShieldErrorFilled fontSize={24} className="shrink-0 text-[var(--critical)]" aria-hidden />
                )}
                <div>
                  <p className="t-body-strong text-fg">{hashMatch ? "Integrity check: match" : "Integrity check: mismatch"}</p>
                  <p className="t-caption text-fg-2">
                    {hashMatch ? "Your details are exactly as recorded on-chain." : "The stored details differ from the on-chain record."}
                  </p>
                </div>
              </div>
            )}
            <dl className="divide-y divide-[var(--divider-stroke)]">
              <Row label="On-chain claim ID" value={claim.on_chain_claim_id || "Not yet recorded"} mono />
              <div className="grid grid-cols-[minmax(110px,40%)_1fr] items-center gap-4 px-5 py-3 t-body">
                <dt className="text-fg-2">Transaction</dt>
                <dd className="min-w-0">
                  <HashDisplay hash={claim.submit_tx_hash} etherscanTx />
                </dd>
              </div>
              {onChain && <Row label="Block recorded" value={new Date(onChain.submittedAt * 1000).toLocaleString()} />}
            </dl>
          </section>

          <section className="card enter enter-4 overflow-hidden">
            <h2 className="flex items-center gap-2 border-b border-[var(--divider-stroke)] px-5 py-3.5 t-body-strong text-fg">
              <DocumentMultipleRegular fontSize={18} className="text-fg-2" aria-hidden /> Documents
              <span className="badge ml-auto !h-5 tabular-nums">{documents.length}</span>
            </h2>
            {documents.length === 0 ? (
              <EmptyState compact title="No documents uploaded" />
            ) : (
              <ul className="divide-y divide-[var(--divider-stroke)]">
                {documents.map((d) => (
                  <li key={d.id} className="px-5 py-3">
                    <p className="t-body-strong text-fg break-all">{d.file_name}</p>
                    <p className="mb-1.5 t-caption text-fg-2">Uploaded {new Date(d.uploaded_at).toLocaleDateString()}</p>
                    <HashDisplay hash={d.file_hash} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(110px,40%)_1fr] gap-4 px-5 py-3 t-body">
      <dt className="text-fg-2">{label}</dt>
      <dd className={`text-fg break-words ${mono ? "font-mono text-[13px]" : ""}`}>{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy aria-label="Loading claim">
      <div className="skeleton mb-2 h-4 w-40" />
      <div className="skeleton mb-8 h-9 w-80" />
      <div className="skeleton mb-6 h-28" />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="skeleton h-72" />
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}
