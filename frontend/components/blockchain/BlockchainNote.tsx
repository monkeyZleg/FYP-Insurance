export default function BlockchainNote({
  text = "Your document hash will be permanently recorded on the Ethereum blockchain. This action cannot be undone.",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
      <span className="text-lg leading-none">⛓️</span>
      <p>{text}</p>
    </div>
  );
}
