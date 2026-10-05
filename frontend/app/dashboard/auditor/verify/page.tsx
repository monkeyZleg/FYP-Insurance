"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import CopyButton from "@/components/ui/CopyButton";
import {
  CubeRegular,
  DatabaseRegular,
  FingerprintRegular,
  ShieldCheckmarkFilled,
  ShieldErrorFilled,
} from "@fluentui/react-icons";
import PageHeader from "@/components/ui/PageHeader";
import InfoBar from "@/components/ui/InfoBar";
import Spinner from "@/components/ui/Spinner";

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

  async function handleCheck(e?: React.FormEvent) {
    e?.preventDefault();
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
    <div className="max-w-3xl">
      <PageHeader
        title="Hash integrity checker"
        description="Compare a claim's off-chain details hash with the one its smart contract recorded."
      />

      <form onSubmit={handleCheck} className="card enter enter-2 p-5 sm:p-6">
        <label htmlFor="claim-id" className="field-label">
          Claim ID
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <FingerprintRegular fontSize={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-2" aria-hidden />
            <input
              id="claim-id"
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              placeholder="Paste a database claim ID"
              className="textbox textbox-mono pl-10"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button type="submit" disabled={loading || !claimId.trim()} className="btn btn-accent sm:w-32">
            {loading && <Spinner />}
            {loading ? "Checking…" : "Verify"}
          </button>
        </div>
        {error && (
          <InfoBar severity="error" className="mt-4">
            {error}
          </InfoBar>
        )}
      </form>

      {result && (
        <section className="card pop-in mt-6 overflow-hidden" aria-live="polite">
          <div
            className="flex items-center gap-4 p-5 sm:p-6"
            style={{ background: result.match ? "var(--success-bg)" : "var(--critical-bg)" }}
          >
            {result.match ? (
              <ShieldCheckmarkFilled fontSize={40} className="shrink-0 text-[var(--success)]" aria-hidden />
            ) : (
              <ShieldErrorFilled fontSize={40} className="shrink-0 text-[var(--critical)]" aria-hidden />
            )}
            <div>
              <p className="t-subtitle text-fg">{result.match ? "Match" : "Mismatch"}</p>
              <p className="t-body text-fg-2">
                {result.match ? "Document has not been tampered with." : "Hash discrepancy detected — flag for investigation."}
              </p>
            </div>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <HashRow icon={DatabaseRegular} label="Off-chain hash (Supabase)" hash={result.offChainHash} other={result.onChainHash} />
            <HashRow icon={CubeRegular} label="On-chain hash (smart contract)" hash={result.onChainHash} other={result.offChainHash} />
            <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--divider-stroke)] pt-4 t-body">
              <span className="text-fg-2">Recorded on-chain at</span>
              <span className="text-fg tabular-nums">{result.recordedAt}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function HashRow({
  icon: Icon,
  label,
  hash,
  other,
}: {
  icon: typeof CubeRegular;
  label: string;
  hash: string;
  other: string;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 t-caption font-semibold text-fg-2">
        <Icon fontSize={14} aria-hidden /> {label}
      </p>
      <div className="flex items-start gap-2">
        <code className="hash-chip flex-1 !block !py-2 !text-[12.5px]">
          {hash
            ? Array.from(hash).map((ch, i) => (
                <span key={i} style={other && other[i] !== ch ? { color: "var(--critical)", fontWeight: 700 } : undefined}>
                  {ch}
                </span>
              ))
            : "—"}
        </code>
        {hash && (
          <span className="pt-1">
            <CopyButton value={hash} label="Copy hash" />
          </span>
        )}
      </div>
    </div>
  );
}
