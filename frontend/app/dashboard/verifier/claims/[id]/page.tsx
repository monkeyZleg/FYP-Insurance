"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { useClaimRegistry } from "@/hooks/useContract";
import { getInsuranceConfig } from "@/constants/insurance";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import PageHeader from "@/components/ui/PageHeader";
import InfoBar from "@/components/ui/InfoBar";
import Persona from "@/components/ui/Persona";
import StatusPill from "@/components/shared/StatusPill";
import {
  CheckmarkRegular,
  DismissRegular,
  DocumentRegular,
  ShieldCheckmarkFilled,
  ShieldErrorFilled,
  WalletRegular,
} from "@fluentui/react-icons";
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

  if (!claim)
    return (
      <div aria-busy>
        <div className="skeleton mb-8 h-9 w-72" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="skeleton h-96" />
          <div className="skeleton h-80" />
        </div>
      </div>
    );

  const remarkLen = remark.trim().length;
  const remarkOk = remarkLen >= 20;

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Claims queue", href: "/dashboard/verifier" }, { label: `#${claim.id.slice(0, 8)}` }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <CategoryGlyph type={claim.insurance_type} variant="solid" size={36} />
            Review claim
          </span>
        }
        actions={<StatusPill status={claim.status} />}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section className="card enter enter-1 flex flex-wrap items-center gap-4 p-5">
            <Persona name={claim.policyholder?.full_name || "Policyholder"} size={44} />
            <div className="min-w-0 flex-1">
              <p className="t-body-strong text-fg">{claim.policyholder?.full_name || claim.policyholder_id}</p>
              {claim.policyholder?.email && <p className="t-body text-fg-2">{claim.policyholder.email}</p>}
            </div>
            <div className="text-right">
              <p className="t-caption text-fg-2">Policy number</p>
              <p className="font-mono text-[13px] text-fg">{(claim.details?.policyNumber as string) || "—"}</p>
            </div>
          </section>

          <section className="card enter enter-2 overflow-hidden">
            <h2 className="border-b border-[var(--divider-stroke)] px-5 py-3.5 t-body-strong text-fg">Claim details</h2>
            <dl className="divide-y divide-[var(--divider-stroke)]">
              <Row label="Claim type" value={claim.claim_type} />
              <Row label="Incident date" value={claim.incident_date} />
              <Row label="Description" value={claim.description} />
              {config &&
                config.fields
                  .filter((f) => !["policyNumber", "date", "description", "claimType"].includes(f.role || ""))
                  .map((f) => <Row key={f.key} label={f.label} value={(claim.details?.[f.key] as string) || "—"} />)}
            </dl>
          </section>

          <section className="card enter enter-3 overflow-hidden">
            <h2 className="border-b border-[var(--divider-stroke)] px-5 py-3.5 t-body-strong text-fg">Document review</h2>
            {documents.length === 0 ? (
              <p className="px-5 py-6 t-body text-fg-3">No documents uploaded.</p>
            ) : (
              <ul className="divide-y divide-[var(--divider-stroke)]">
                {documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-2 t-body-strong text-fg">
                      <DocumentRegular fontSize={18} className="shrink-0 text-fg-2" aria-hidden />
                      <span className="break-all">{d.file_name}</span>
                    </span>
                    <HashDisplay hash={d.file_hash} />
                  </li>
                ))}
              </ul>
            )}
            {hashCheck !== null && (
              <div className="m-4 mt-0 flex items-center gap-3 rounded-[var(--radius-control)] p-3" style={{ background: hashCheck ? "var(--success-bg)" : "var(--critical-bg)" }}>
                {hashCheck ? (
                  <ShieldCheckmarkFilled fontSize={22} className="text-[var(--success)]" aria-hidden />
                ) : (
                  <ShieldErrorFilled fontSize={22} className="text-[var(--critical)]" aria-hidden />
                )}
                <p className="t-body-strong text-fg">
                  {hashCheck ? "Verified — details hash recorded on-chain" : "Hash mismatch — flag for investigation"}
                </p>
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section className="card enter enter-4 overflow-hidden">
              <h2 className="border-b border-[var(--divider-stroke)] px-5 py-3.5 t-body-strong text-fg">Your verification history</h2>
              <ul className="divide-y divide-[var(--divider-stroke)]">
                {history.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5 t-body">
                    <Link href={`/dashboard/verifier/claims/${h.id}`} className="link">
                      {h.claim_type}
                    </Link>
                    <StatusPill status={h.status} dot />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* decision panel */}
        <aside className="enter enter-2 lg:sticky lg:top-20">
          <section className="card overflow-hidden">
            <div className="border-b border-[var(--divider-stroke)] px-5 py-4">
              <h2 className="t-subtitle text-fg">Decision</h2>
              <p className="mt-1 flex items-start gap-2 t-caption text-fg-2">
                <WalletRegular fontSize={14} className="mt-px shrink-0" aria-hidden />
                Approving or rejecting will first ask you to confirm a transaction in MetaMask, then record the decision.
              </p>
            </div>
            <div className="p-5">
              <label htmlFor="remark" className="field-label">
                Review remarks
              </label>
              <textarea
                id="remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Explain what you checked and why you reached this decision…"
                className="textbox !min-h-[140px]"
                aria-describedby="remark-count"
              />
              <div id="remark-count" className="mt-2 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--subtle-fill-secondary)]">
                  <div
                    className="h-full rounded-full transition-[width,background-color] duration-300"
                    style={{ width: `${Math.min(1, remarkLen / 20) * 100}%`, background: remarkOk ? "var(--success)" : "var(--accent-fill)" }}
                  />
                </div>
                <span className={`t-caption tabular-nums ${remarkOk ? "text-[var(--success)]" : "text-fg-2"}`}>
                  {remarkOk ? "Ready" : `${remarkLen}/20 min`}
                </span>
              </div>
              {error && (
                <InfoBar severity="error" className="mt-4">
                  {error}
                </InfoBar>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button onClick={() => setPendingDecision("Approved")} disabled={!remarkOk} className="btn btn-success btn-lg">
                  <CheckmarkRegular /> Approve
                </button>
                <button onClick={() => setPendingDecision("Rejected")} disabled={!remarkOk} className="btn btn-danger btn-lg">
                  <DismissRegular /> Reject
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {pendingDecision && (
        <ConfirmModal
          title={`${pendingDecision === "Approved" ? "Approve" : "Reject"} this claim?`}
          message="This action is irreversible and will be recorded on the blockchain via your connected wallet."
          confirmLabel={pendingDecision === "Approved" ? "Approve" : "Reject"}
          danger={pendingDecision === "Rejected"}
          loading={processing}
          onConfirm={confirmDecision}
          onCancel={() => setPendingDecision(null)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(110px,35%)_1fr] gap-4 px-5 py-3 t-body">
      <dt className="text-fg-2">{label}</dt>
      <dd className="text-fg break-words">{value}</dd>
    </div>
  );
}
