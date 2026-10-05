"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { useClaimRegistry } from "@/hooks/useContract";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import AuditTrailTable from "@/components/blockchain/AuditTrailTable";
import type { Claim, InsuranceType } from "@/types";
import {
  ArrowDownloadRegular,
  ChevronDownRegular,
  CubeRegular,
  FlagFilled,
  FlagRegular,
  OpenRegular,
  ReceiptSearchRegular,
} from "@fluentui/react-icons";
import PageHeader from "@/components/ui/PageHeader";
import InfoBar from "@/components/ui/InfoBar";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/shared/StatusPill";
import TypeFilter from "@/components/insurance/TypeFilter";
import { Fragment } from "react";

export default function AuditorDashboard() {
  const { wallet } = useRole();
  const { flagClaim } = useClaimRegistry();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [typeFilter, setTypeFilter] = useState<InsuranceType | "All">("All");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  async function loadClaims() {
    try {
      const d = await apiFetch("/api/claims/all", {}, wallet);
      setClaims(d.claims || []);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () => (typeFilter === "All" ? claims : claims.filter((c) => c.insurance_type === typeFilter)),
    [claims, typeFilter]
  );

  function exportCSV() {
    const header = "Claim ID,Insurance Type,Status,TX Hash,Submitted\n";
    const rows = filtered
      .map((c) => `${c.id},${c.insurance_type || ""},${c.status},${c.submit_tx_hash || "N/A"},${c.submitted_at}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFlag(claim: Claim) {
    if (!claim.on_chain_claim_id) return;
    setFlagging(claim.id);
    setError("");
    try {
      const { receipt, findingHash } = await flagClaim(claim.on_chain_claim_id, `Flagged claim ${claim.id}`);
      const txHash = receipt?.hash || receipt?.transactionHash || "";
      await apiFetch(
        `/api/claims/${claim.id}/flag`,
        { method: "PATCH", body: JSON.stringify({ txHash, findingHash }) },
        wallet
      );
      await loadClaims();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to flag claim");
    } finally {
      setFlagging(null);
    }
  }

  const counts: Record<string, number> = { All: claims.length };
  claims.forEach((c) => c.insurance_type && (counts[c.insurance_type] = (counts[c.insurance_type] || 0) + 1));

  return (
    <div>
      <PageHeader
        title="Blockchain audit trail"
        description="Every claim and the transaction that recorded it. Expand a row to see its on-chain history."
        actions={
          <button onClick={exportCSV} className="btn" disabled={filtered.length === 0}>
            <ArrowDownloadRegular /> Export CSV
          </button>
        }
      />

      <InfoBar severity="info" title="Read-only access." className="enter enter-1 mb-5">
        Auditors cannot approve, reject, assign, or settle claims, but may flag a claim for investigation.
      </InfoBar>

      {error && (
        <InfoBar severity="error" className="mb-4" onDismiss={() => setError("")}>
          {error}
        </InfoBar>
      )}

      <div className="enter enter-2 mb-4">
        <TypeFilter value={typeFilter} onChange={setTypeFilter} counts={counts} />
      </div>

      <div className="card enter enter-3 overflow-hidden">
        {loading && !!wallet ? (
          <div className="space-y-2 p-4" aria-busy>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={ReceiptSearchRegular} title="No claims found" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Status</th>
                  <th className="hidden md:table-cell">Submit tx</th>
                  <th className="hidden sm:table-cell">Submitted</th>
                  <th>Flag</th>
                  <th className="w-px" aria-label="Audit trail" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((claim) => {
                  const open = !!claim.on_chain_claim_id && selectedClaimId === claim.on_chain_claim_id;
                  return (
                    <Fragment key={claim.id}>
                      <tr className={open ? "row-selected" : ""}>
                        <td>
                          <span className="flex items-center gap-3">
                            <CategoryGlyph type={claim.insurance_type} size={32} />
                            <span className="min-w-0">
                              <span className="block t-body-strong text-fg">{claim.claim_type}</span>
                              <span className="block font-mono text-[12px] text-fg-3">#{claim.id.slice(0, 8)}</span>
                            </span>
                          </span>
                        </td>
                        <td>
                          <StatusPill status={claim.status} dot />
                        </td>
                        <td className="hidden md:table-cell">
                          {claim.submit_tx_hash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${claim.submit_tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="link inline-flex items-center gap-1 font-mono text-[12.5px]"
                              title={claim.submit_tx_hash}
                            >
                              {claim.submit_tx_hash.slice(0, 10)}…
                              <OpenRegular fontSize={12} aria-hidden />
                            </a>
                          ) : (
                            <span className="t-caption text-fg-3">Not recorded</span>
                          )}
                        </td>
                        <td className="hidden whitespace-nowrap text-fg-2 tabular-nums sm:table-cell">{new Date(claim.submitted_at).toLocaleDateString()}</td>
                        <td>
                          {claim.flagged ? (
                            <span className="badge badge-critical">
                              <FlagFilled aria-hidden /> Flagged
                            </span>
                          ) : claim.on_chain_claim_id ? (
                            <button
                              onClick={() => handleFlag(claim)}
                              disabled={flagging === claim.id}
                              className="btn btn-sm btn-subtle text-fg-2 hover:!text-[var(--critical)]"
                            >
                              {flagging === claim.id ? <Spinner size={14} /> : <FlagRegular />}
                              {flagging === claim.id ? "Flagging…" : "Flag"}
                            </button>
                          ) : (
                            <span className="t-caption text-fg-3">—</span>
                          )}
                        </td>
                        <td className="text-right">
                          {claim.on_chain_claim_id && (
                            <button
                              onClick={() => setSelectedClaimId(open ? null : claim.on_chain_claim_id)}
                              className="btn btn-sm btn-subtle whitespace-nowrap"
                              aria-expanded={open}
                            >
                              <CubeRegular /> Trail
                              <ChevronDownRegular className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="!bg-transparent">
                          <td colSpan={6} className="!border-b !border-[var(--divider-stroke)] bg-[var(--card-fill-secondary)] !px-6 !py-5">
                            <p className="mb-4 t-caption font-semibold text-fg-2">On-chain history — claim #{selectedClaimId}</p>
                            <AuditTrailTable claimId={selectedClaimId!} walletAddress={wallet} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
