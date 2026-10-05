import InfoBar from "@/components/ui/InfoBar";

export default function SimulatedPaymentNotice() {
  return (
    <InfoBar severity="warning" title="Simulated payment.">
      No real money is charged. This runs against a local Hardhat network for demonstration purposes only.
    </InfoBar>
  );
}
