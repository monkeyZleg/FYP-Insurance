"use client";
import { useMetaMask } from "@/hooks/useMetaMask";

export default function WalletConnect() {
  const { address, connect } = useMetaMask();

  if (address) {
    return (
      <div className="flex items-center gap-2 bg-[#E6F7F2] border border-[#17B890]/30 rounded-lg px-4 py-2">
        <div className="w-2 h-2 bg-[#17B890] rounded-full" />
        <span className="text-sm font-mono tabular-nums">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="bg-[#FFB020] hover:bg-[#E89D14] text-ink font-medium px-6 py-2 rounded-lg transition-colors"
    >
      Connect MetaMask
    </button>
  );
}
