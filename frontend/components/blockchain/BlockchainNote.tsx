import { CubeTreeRegular } from "@fluentui/react-icons";

export default function BlockchainNote({
  text = "Your document hash will be permanently recorded on the Ethereum blockchain. This action cannot be undone.",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-overlay)] border border-[var(--card-stroke)] p-4 t-body text-fg" style={{ background: "var(--accent-subtle)" }}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-[var(--accent-fill)] text-[var(--text-on-accent)]">
        <CubeTreeRegular fontSize={18} aria-hidden />
      </span>
      <p className="pt-1.5">{text}</p>
    </div>
  );
}
