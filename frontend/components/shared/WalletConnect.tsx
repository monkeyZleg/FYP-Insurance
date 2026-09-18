"use client";
import { useMetaMask } from "@/hooks/useMetaMask";

export default function WalletConnect() {
  const { address, connect } = useMetaMask();

  if (address) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-sm font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
    >
      Connect MetaMask
    </button>
  );
}
