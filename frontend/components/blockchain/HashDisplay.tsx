"use client";
import { useState } from "react";
import { truncateHash } from "@/lib/hash";

export default function HashDisplay({
  hash,
  label,
  etherscanTx,
  full = false,
}: {
  hash: string | null | undefined;
  label?: string;
  etherscanTx?: boolean;
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!hash) {
    return <span className="text-xs text-gray-400 font-mono">N/A</span>;
  }

  function copy() {
    navigator.clipboard.writeText(hash!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      {label && <span className="text-xs text-gray-500">{label}</span>}
      <code className="text-xs font-mono bg-cloud border border-border px-2 py-1 rounded break-all">
        {full ? hash : truncateHash(hash)}
      </code>
      <button
        onClick={copy}
        title="Copy hash"
        className="text-xs text-gray-400 hover:text-gray-700"
      >
        {copied ? "✓" : "⧉"}
      </button>
      {etherscanTx && (
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-chain-indigo hover:underline"
        >
          Etherscan ↗
        </a>
      )}
    </div>
  );
}
