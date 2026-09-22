"use client";
import { useEffect, useState } from "react";
import { getProvider } from "@/lib/ethers";

const NETWORKS: Record<number, { label: string; color: string }> = {
  31337: { label: "Hardhat Local", color: "bg-gray-100 text-gray-600" },
  1337: { label: "Hardhat Local", color: "bg-gray-100 text-gray-600" },
  11155111: { label: "Sepolia Testnet", color: "bg-[#FFF6E5] text-[#B8760A]" },
  1: { label: "Ethereum Mainnet", color: "bg-[#E6F7F2] text-[#0F8F70]" },
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
  const net = NETWORKS[chainId] || { label: `Chain ${chainId}`, color: "bg-gray-100 text-gray-600" };

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${net.color}`}>
      ● {net.label}
    </span>
  );
}
