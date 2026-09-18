export default function SimulatedPaymentNotice() {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
      <span className="text-lg leading-none">🧪</span>
      <p>
        <span className="font-medium">Simulated payment.</span> No real money is charged. This runs against a local
        Hardhat network for demonstration purposes only.
      </p>
    </div>
  );
}
