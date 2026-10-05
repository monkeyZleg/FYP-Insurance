"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { useClaimRegistry } from "@/hooks/useContract";
import InsuranceTypeBadge from "@/components/insurance/InsuranceTypeBadge";
import { ClipboardTaskListLtrRegular, MoneyHandRegular, PersonArrowRightRegular } from "@fluentui/react-icons";
import PageHeader from "@/components/ui/PageHeader";
import SelectorBar from "@/components/ui/SelectorBar";
import Select from "@/components/ui/Select";
import Dialog from "@/components/ui/Dialog";
import InfoBar from "@/components/ui/InfoBar";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import type { Claim, User } from "@/types";

export default function AssignClaimsPage() {
  const { wallet } = useRole();
  const { assignVerifier, settleClaim } = useClaimRegistry();
  const [view, setView] = useState<"assign" | "settle">("assign");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [approvedClaims, setApprovedClaims] = useState<Claim[]>([]);
  const [verifiers, setVerifiers] = useState<User[]>([]);
  const [modalClaim, setModalClaim] = useState<Claim | null>(null);
  const [selectedVerifier, setSelectedVerifier] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkVerifier, setBulkVerifier] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [settling, setSettling] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;
    loadClaims();
    apiFetch("/api/auth/users", {}, wallet)
      .then((d) => setVerifiers((d.users || []).filter((u: User) => u.role === "verifier" && u.is_active !== false)))
      .catch(() => setVerifiers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  async function loadClaims() {
    try {
      const data = await apiFetch("/api/claims/all", {}, wallet);
      setClaims((data.claims || []).filter((c: Claim) => c.status === "Submitted"));
      setApprovedClaims((data.claims || []).filter((c: Claim) => c.status === "Approved"));
    } catch {
      setClaims([]);
      setApprovedClaims([]);
    }
  }

  async function assignOne(claim: Claim, verifierId: string) {
    const verifier = verifiers.find((v) => v.id === verifierId);
    if (!verifier || !verifier.wallet_address) throw new Error("Verifier wallet address not found");
    if (!claim.on_chain_claim_id) throw new Error("This claim has not been recorded on-chain yet.");
    const receipt = await assignVerifier(claim.on_chain_claim_id, verifier.wallet_address);
    const txHash = receipt?.hash || receipt?.transactionHash || "";
    await apiFetch(
      `/api/claims/${claim.id}/assign`,
      { method: "PATCH", body: JSON.stringify({ verifierId, txHash }) },
      wallet
    );
  }

  async function handleAssign() {
    if (!modalClaim || !selectedVerifier) return;
    setProcessing(true);
    setError("");
    try {
      await assignOne(modalClaim, selectedVerifier);
      setModalClaim(null);
      setSelectedVerifier("");
      await loadClaims();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setProcessing(false);
    }
  }

  async function handleBulkAssign() {
    if (!bulkVerifier || selected.length === 0) return;
    setProcessing(true);
    setError("");
    try {
      for (const id of selected) {
        const claim = claims.find((c) => c.id === id);
        if (claim) await assignOne(claim, bulkVerifier);
      }
      setSelected([]);
      setBulkVerifier("");
      await loadClaims();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk assignment failed");
    } finally {
      setProcessing(false);
    }
  }

  async function handleSettle(claim: Claim) {
    setProcessing(true);
    setSettling(claim.id);
    setError("");
    try {
      if (!claim.on_chain_claim_id) throw new Error("This claim has not been recorded on-chain yet.");
      const { receipt, payoutRefHash } = await settleClaim(claim.on_chain_claim_id);
      const txHash = receipt?.hash || receipt?.transactionHash || "";
      await apiFetch(
        `/api/claims/${claim.id}/settle`,
        { method: "PATCH", body: JSON.stringify({ txHash, payoutRefHash }) },
        wallet
      );
      await loadClaims();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settlement failed");
    } finally {
      setProcessing(false);
      setSettling(null);
    }
  }

  const allSelected = selected.length === claims.length && claims.length > 0;
  const someSelected = selected.length > 0 && !allSelected;

  return (
    <div>
      <PageHeader
        title="Assign & settle"
        description={
          view === "assign"
            ? "Route new claims to a verifier. Each assignment is a transaction from your wallet."
            : "Record the payout for approved claims on-chain."
        }
      />

      <div className="enter enter-1 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SelectorBar
          variant="segmented"
          label="View"
          value={view}
          onChange={(v) => {
            setView(v);
            setError("");
          }}
          items={[
            { value: "assign" as const, label: "Assign", icon: PersonArrowRightRegular, count: claims.length },
            { value: "settle" as const, label: "Settle", icon: MoneyHandRegular, count: approvedClaims.length },
          ]}
        />
      </div>

      {error && (
        <InfoBar severity="error" className="mb-4" onDismiss={() => setError("")}>
          {error}
        </InfoBar>
      )}

      {view === "assign" && (
        <div className="card enter enter-2 overflow-hidden">
          {/* bulk command bar */}
          <div
            className={`flex flex-wrap items-center gap-3 border-b border-[var(--divider-stroke)] px-4 py-2.5 transition-colors duration-200 ${
              selected.length > 0 ? "bg-[var(--accent-subtle)]" : ""
            }`}
          >
            <span className="t-body text-fg tabular-nums">
              {selected.length > 0 ? <strong>{selected.length} selected</strong> : <span className="text-fg-2">Select claims to assign in bulk</span>}
            </span>
            {selected.length > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-2 fade-in">
                <Select value={bulkVerifier} onChange={(e) => setBulkVerifier(e.target.value)} aria-label="Verifier for selected claims" wrapClassName="w-[200px]">
                  <option value="">Select verifier…</option>
                  {verifiers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.full_name || v.wallet_address}
                    </option>
                  ))}
                </Select>
                <button onClick={handleBulkAssign} disabled={!bulkVerifier || processing} className="btn btn-accent">
                  {processing && <Spinner />} Assign {selected.length}
                </button>
                <button onClick={() => setSelected([])} className="btn btn-subtle">
                  Clear
                </button>
              </div>
            )}
          </div>

          {claims.length === 0 ? (
            <EmptyState compact icon={ClipboardTaskListLtrRegular} title="No pending claims to assign" body="New submissions will appear here." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-12">
                      <input
                        type="checkbox"
                        className="checkbox"
                        aria-label="Select all"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={(e) => setSelected(e.target.checked ? claims.map((c) => c.id) : [])}
                      />
                    </th>
                    <th>Claim</th>
                    <th>Type</th>
                    <th className="hidden sm:table-cell">Submitted</th>
                    <th className="hidden md:table-cell">Policyholder</th>
                    <th className="w-px" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="stagger">
                  {claims.map((c) => {
                    const isSel = selected.includes(c.id);
                    return (
                      <tr key={c.id} className={isSel ? "row-selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            className="checkbox"
                            aria-label={`Select claim ${c.id.slice(0, 8)}`}
                            checked={isSel}
                            onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((id) => id !== c.id)))}
                          />
                        </td>
                        <td>
                          <span className="block t-body-strong text-fg">{c.claim_type}</span>
                          <span className="block font-mono text-[12px] text-fg-3">#{c.id.slice(0, 8)}</span>
                        </td>
                        <td>
                          <InsuranceTypeBadge type={c.insurance_type} />
                        </td>
                        <td className="hidden whitespace-nowrap text-fg-2 tabular-nums sm:table-cell">{new Date(c.submitted_at).toLocaleDateString()}</td>
                        <td className="hidden text-fg md:table-cell">{c.policyholder?.full_name || c.policyholder_id.slice(0, 8)}</td>
                        <td className="text-right">
                          <button onClick={() => setModalClaim(c)} className="btn btn-sm">
                            <PersonArrowRightRegular /> Assign
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === "settle" && (
        <div className="card enter enter-2 overflow-hidden">
          {approvedClaims.length === 0 ? (
            <EmptyState icon={MoneyHandRegular} title="No approved claims awaiting settlement" body="Claims appear here once a verifier approves them." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Type</th>
                    <th className="hidden sm:table-cell">Decided</th>
                    <th className="hidden md:table-cell">Policyholder</th>
                    <th className="w-px" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="stagger">
                  {approvedClaims.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="block t-body-strong text-fg">{c.claim_type}</span>
                        <span className="block font-mono text-[12px] text-fg-3">#{c.id.slice(0, 8)}</span>
                      </td>
                      <td>
                        <InsuranceTypeBadge type={c.insurance_type} />
                      </td>
                      <td className="hidden whitespace-nowrap text-fg-2 tabular-nums sm:table-cell">
                        {c.decided_at ? new Date(c.decided_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="hidden text-fg md:table-cell">{c.policyholder?.full_name || c.policyholder_id.slice(0, 8)}</td>
                      <td className="text-right">
                        <button onClick={() => handleSettle(c)} disabled={processing} className="btn btn-sm btn-success">
                          {settling === c.id ? <Spinner size={14} /> : <MoneyHandRegular />}
                          {settling === c.id ? "Settling…" : "Settle"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalClaim && (
        <Dialog
          title="Assign to a verifier"
          onClose={() => {
            setModalClaim(null);
            setSelectedVerifier("");
          }}
          dismissible={!processing}
          footer={
            <>
              <button onClick={handleAssign} disabled={!selectedVerifier || processing} className="btn btn-accent">
                {processing && <Spinner />}
                {processing ? "Assigning…" : "Assign"}
              </button>
              <button
                onClick={() => {
                  setModalClaim(null);
                  setSelectedVerifier("");
                }}
                disabled={processing}
                className="btn"
              >
                Cancel
              </button>
            </>
          }
        >
          <p className="mb-4 text-fg-2">
            {modalClaim.claim_type} <span className="font-mono text-[13px] text-fg-3">#{modalClaim.id.slice(0, 8)}</span>
          </p>
          <label className="field-label" htmlFor="assign-verifier">
            Verifier
          </label>
          <Select id="assign-verifier" value={selectedVerifier} onChange={(e) => setSelectedVerifier(e.target.value)}>
            <option value="">Select verifier…</option>
            {verifiers.map((v) => (
              <option key={v.id} value={v.id}>
                {v.full_name || v.wallet_address}
              </option>
            ))}
          </Select>
          <p className="field-hint">You&apos;ll confirm the assignment in MetaMask.</p>
          {error && (
            <InfoBar severity="error" className="mt-4">
              {error}
            </InfoBar>
          )}
        </Dialog>
      )}
    </div>
  );
}
