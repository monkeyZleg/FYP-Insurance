"use client";
import { useEffect, useState } from "react";
import { CubeRegular, OpenRegular } from "@fluentui/react-icons";
import type { AuditEvent } from "@/types";
import { apiFetch } from "@/lib/api";
import EmptyState from "@/components/ui/EmptyState";

/** On-chain events for one claim, drawn as a vertical ledger of blocks. */
export default function AuditTrailTable({
  claimId,
  walletAddress,
}: {
  claimId: string;
  walletAddress: string;
}) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/blockchain/audit/${claimId}`, {}, walletAddress)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [claimId, walletAddress]);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-14" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <EmptyState compact icon={CubeRegular} title="No on-chain events yet" body="Events appear here once the claim's transactions are mined." />;
  }

  return (
    <ol className="relative stagger">
      {events.map((e, i) => (
        <li key={i} className="relative grid grid-cols-[32px_1fr] gap-x-4 pb-5 last:pb-0">
          {i < events.length - 1 && <span aria-hidden className="absolute left-[15px] top-9 bottom-0 w-[2px] rounded-full bg-[var(--control-stroke-secondary)]" />}
          <span className="grid h-8 w-8 place-items-center rounded-[6px] bg-[var(--accent-subtle-strong)] text-accent-text">
            <CubeRegular fontSize={16} aria-hidden />
          </span>
          <div className="min-w-0 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <div className="min-w-0">
              <p className="t-body-strong text-fg">{e.action}</p>
              <p className="t-caption text-fg-2 font-mono">
                by {e.performedBy.slice(0, 6)}…{e.performedBy.slice(-4)} · block <span className="tabular-nums">#{e.blockNumber}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 t-caption text-fg-2">
              <time className="tabular-nums" dateTime={e.timestamp}>
                {new Date(e.timestamp).toLocaleString()}
              </time>
              <a
                href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="link inline-flex items-center gap-1 font-mono"
                title={e.txHash}
              >
                {e.txHash.slice(0, 10)}…
                <OpenRegular fontSize={12} aria-hidden />
              </a>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
