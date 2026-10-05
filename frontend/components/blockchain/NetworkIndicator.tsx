"use client";
import { useEffect, useState } from "react";
import { getProvider } from "@/lib/ethers";

const NETWORKS: Record<number, { label: string; color: string }> = {
  31337: { label: "Hardhat Local", color: "var(--text-tertiary)" },
  1337: { label: "Hardhat Local", color: "var(--text-tertiary)" },
  11155111: { label: "Sepolia", color: "var(--caution-solid)" },
  1: { label: "Mainnet", color: "var(--success)" },
};

export default function NetworkIndicator() {
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;
    provider
      .getNetwork()
      .then((n) => setChainId(Number(n.chainId)))
      .catch(() => setChainId(null));
  }, []);

  if (chainId === null) return null;
  const net = NETWORKS[chainId] || { label: `Chain ${chainId}`, color: "var(--text-tertiary)" };

  return (
    <span className="badge badge-outline" title="Connected network">
      <span className="status-dot" data-pulse="true" style={{ width: 6, height: 6, background: net.color, color: net.color }} />
      {net.label}
    </span>
  );
}
