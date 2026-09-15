"use client";
import { useEffect, useState } from "react";
import type { AuditEvent } from "@/types";
import { apiFetch } from "@/lib/api";

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

  if (loading) return <p className="text-gray-500">Loading audit trail...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-4">Action</th>
            <th className="pb-2 pr-4">By (Wallet)</th>
            <th className="pb-2 pr-4">Block</th>
            <th className="pb-2 pr-4">Timestamp</th>
            <th className="pb-2">TX Hash</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium">{e.action}</td>
              <td className="py-2 pr-4 font-mono text-xs">
                {e.performedBy.slice(0, 6)}...{e.performedBy.slice(-4)}
              </td>
              <td className="py-2 pr-4">{e.blockNumber}</td>
              <td className="py-2 pr-4">
                {new Date(e.timestamp).toLocaleString()}
              </td>
              <td className="py-2 font-mono text-xs text-blue-600">
                <a
                  href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {e.txHash.slice(0, 10)}...
                </a>
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-400">
                No events found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
