"use client";
import { WalletRegular, WarningRegular } from "@fluentui/react-icons";
import { useMetaMask } from "@/hooks/useMetaMask";
import { useRole } from "@/hooks/useRole";

/**
 * Staff sign in with email + password; MetaMask is only for signing their
 * on-chain actions. Those actions must come from the wallet registered to the
 * account (the contract checks roles by address), so a different MetaMask
 * account is flagged here rather than failing later mid-transaction.
 */
export default function WalletConnect({ compact = false }: { compact?: boolean }) {
  const { address, connect } = useMetaMask();
  const { wallet: registered } = useRole();

  if (address) {
    const mismatch = !!registered && address.toLowerCase() !== registered.toLowerCase();
    if (mismatch) {
      return (
        <span
          className="badge badge-caution font-mono"
          title={`MetaMask is on ${address}, but this account's wallet is ${registered}. Switch accounts in MetaMask to sign actions.`}
        >
          <WarningRegular aria-hidden />
          <span className={compact ? "hidden sm:inline" : ""}>Wrong wallet</span>
          <span className="sr-only">
            MetaMask is on {address}, but this account&apos;s wallet is {registered}. Switch accounts in MetaMask to sign actions.
          </span>
        </span>
      );
    }
    return (
      <span className="badge badge-success font-mono" title={address}>
        <span className="status-dot" style={{ width: 6, height: 6, background: "currentColor" }} />
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
    );
  }

  return (
    <button type="button" onClick={connect} className="btn btn-sm" title="Connect MetaMask to sign on-chain actions">
      <WalletRegular />
      <span className={compact ? "hidden sm:inline" : ""}>Connect wallet</span>
    </button>
  );
}
