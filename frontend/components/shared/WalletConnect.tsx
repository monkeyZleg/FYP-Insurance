"use client";
import { WalletRegular } from "@fluentui/react-icons";
import { useMetaMask } from "@/hooks/useMetaMask";

export default function WalletConnect({ compact = false }: { compact?: boolean }) {
  const { address, connect } = useMetaMask();

  if (address) {
    return (
      <span className="badge badge-success font-mono" title={address}>
        <span className="status-dot" style={{ width: 6, height: 6, background: "currentColor" }} />
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
    );
  }

  return (
    <button type="button" onClick={connect} className="btn btn-sm" title="Connect MetaMask">
      <WalletRegular />
      <span className={compact ? "hidden sm:inline" : ""}>Connect wallet</span>
    </button>
  );
}
