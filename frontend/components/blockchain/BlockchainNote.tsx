export default function BlockchainNote({
  text = "Your document hash will be permanently recorded on the Ethereum blockchain. This action cannot be undone.",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-[#EEF0FC] border border-[#3D4FE0]/25 rounded-lg p-4 text-sm text-ink">
      <span className="text-lg leading-none">⛓️</span>
      <p>{text}</p>
    </div>
  );
}
