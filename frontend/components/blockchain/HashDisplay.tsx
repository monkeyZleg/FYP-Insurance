import { OpenRegular } from "@fluentui/react-icons";
import { truncateHash } from "@/lib/hash";
import CopyButton from "@/components/ui/CopyButton";

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
  if (!hash) {
    return <span className="t-caption text-fg-3">Not recorded</span>;
  }

  return (
    <span className={`inline-flex max-w-full items-center gap-1 ${full ? "flex-wrap" : ""}`}>
      {label && <span className="mr-1 t-caption text-fg-2">{label}</span>}
      <code className="hash-chip" title={hash}>
        {full ? hash : truncateHash(hash)}
      </code>
      <CopyButton value={hash} label="Copy hash" />
      {etherscanTx && (
        <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="link ml-1 inline-flex items-center gap-1 t-caption">
          Etherscan
          <OpenRegular fontSize={12} aria-hidden />
        </a>
      )}
    </span>
  );
}
