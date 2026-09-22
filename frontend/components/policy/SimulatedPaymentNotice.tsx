export default function SimulatedPaymentNotice() {
  return (
    <div className="flex items-start gap-3 bg-[#FFF6E5] border border-[#FFB020]/40 rounded-lg p-4 text-sm text-[#B8760A]">
      <span className="text-lg leading-none">🧪</span>
      <p>
        <span className="font-medium">Simulated payment.</span> No real money is charged. This runs against a local
        Hardhat network for demonstration purposes only.
      </p>
    </div>
  );
}
