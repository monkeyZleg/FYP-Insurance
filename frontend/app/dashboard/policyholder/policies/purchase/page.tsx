"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { POLICY_TYPE_CONFIG, PLAN_META } from "@/constants/policyPlans";
import {
  canRenew,
  createPolicy,
  listPlans,
  myPolicies,
  payPolicy,
  renewPolicy,
} from "@/lib/policyApi";
import PaymentOptionSelector from "@/components/policy/PaymentOptionSelector";
import InstalmentSchedule from "@/components/policy/InstalmentSchedule";
import SimulatedPaymentNotice from "@/components/policy/SimulatedPaymentNotice";
import PolicyStatusBadge from "@/components/policy/PolicyStatusBadge";
import type { PaymentMode, PolicyPlan, PolicyRow } from "@/types";

function PurchaseFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { token } = useRole();

  const planId = params.get("planId") ? Number(params.get("planId")) : null;
  const renewId = params.get("renewId");
  const payId = params.get("payId");

  const [plan, setPlan] = useState<PolicyPlan | null>(null);
  const [existingPolicy, setExistingPolicy] = useState<PolicyRow | null>(null);
  const [activePolicy, setActivePolicy] = useState<PolicyRow | null>(null);
  const [step, setStep] = useState<"configure" | "review" | "payment" | "done">(payId ? "payment" : "configure");
  const [mode, setMode] = useState<PaymentMode>("PayNow");
  const [instalmentCount, setInstalmentCount] = useState(3);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [resultPolicy, setResultPolicy] = useState<PolicyRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        if (planId) {
          const plans = await listPlans();

          setPlan(plans.find((p) => p.planId === planId) || null);
        }
        const id = renewId || payId;
        if (id) {
          const list = await myPolicies(token);
          const found = list.find((p) => p.id === id) || null;

          setExistingPolicy(found);
          if (payId) setActivePolicy(found);
        }
      } finally {

        setLoaded(true);
      }
    })();
  }, [token, planId, renewId, payId]);

  if (!token) return <p className="text-gray-400">Please log in to continue.</p>;
  if (!loaded) return <p className="text-gray-400">Loading...</p>;

  if (!plan && !renewId && !payId) {
    return <p className="text-gray-400">No plan selected. Go back to Browse Plans.</p>;
  }

  const typeCfg = plan
    ? POLICY_TYPE_CONFIG[plan.type]
    : existingPolicy
      ? POLICY_TYPE_CONFIG[existingPolicy.policy_type]
      : null;

  function confirmConfigure() {
    setError("");
    if (renewId && !existingPolicy) {
      setError("Policy not found.");
      return;
    }
    if (renewId && existingPolicy && !canRenew(existingPolicy)) {
      setError("This policy is not eligible for renewal.");
      return;
    }
    setStep("review");
  }

  async function confirmReview() {
    setError("");
    setProcessing(true);
    try {
      if (renewId) {
        const { policy } = await renewPolicy(token, renewId, mode, mode === "Instalment" ? instalmentCount : undefined);
        if (mode === "PayLater") {
          setResultPolicy(policy);
          setStep("done");
        } else {
          setActivePolicy(policy);
          setStep("payment");
        }
      } else if (plan) {
        const { policy } = await createPolicy(
          token,
          plan.planId,
          mode as Exclude<PaymentMode, "PayLater">,
          mode === "Instalment" ? instalmentCount : undefined
        );
        setActivePolicy(policy);
        setStep("payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProcessing(false);
    }
  }

  async function simulatePayment() {
    const id = activePolicy?.id || payId;
    if (!id) return;
    setProcessing(true);
    setError("");
    try {
      const { policy } = await payPolicy(token, id);
      setResultPolicy(policy);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  const premium = plan?.premiumRM ?? existingPolicy?.premium ?? 0;
  const displayPolicy = activePolicy || existingPolicy;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">
        {renewId ? "Renew Policy" : payId ? "Settle Payment" : "Buy a Policy"}
      </h1>

      {step === "configure" && (plan || existingPolicy) && (
        <div>
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span>{typeCfg?.icon}</span>
              <h2 className="font-semibold text-lg">{plan?.name || existingPolicy?.plan_name}</h2>
            </div>
            {existingPolicy && (
              <p className="text-sm text-gray-500">
                Current coverage ends {existingPolicy.end_date} — renewal starts from that date.
              </p>
            )}
            {plan && PLAN_META[plan.planId] && <p className="text-sm text-gray-500">{PLAN_META[plan.planId].coverageSummary}</p>}
            <p className="text-lg font-bold mt-2">RM {premium.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Payment Option</h3>
            <PaymentOptionSelector
              mode={mode}
              onModeChange={setMode}
              instalmentCount={instalmentCount}
              onInstalmentCountChange={setInstalmentCount}
              allowPayLater={Boolean(renewId)}
            />
          </div>

          {mode === "Instalment" && (
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <h3 className="font-semibold mb-4">Instalment Schedule Preview</h3>
              <InstalmentSchedule
                premium={premium}
                instalments={Array.from({ length: instalmentCount }, (_, i) => ({
                  index: i + 1,
                  dueDate: "",
                  paid: false,
                }))}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button onClick={confirmConfigure} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">
            Continue
          </button>
        </div>
      )}

      {step === "review" && (
        <div>
          <div className="bg-white rounded-xl shadow p-6 mb-6 space-y-2">
            <h3 className="font-semibold mb-2">Review</h3>
            <Row label="Plan" value={plan?.name || existingPolicy?.plan_name || ""} />
            <Row label="Premium" value={`RM ${premium.toLocaleString()}`} />
            <Row
              label="Payment Option"
              value={
                mode === "PayLater"
                  ? "Renew first, pay later"
                  : mode === "Instalment"
                    ? `Instalment (${instalmentCount}x)`
                    : "Pay now"
              }
            />
          </div>
          {mode === "PayLater" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4 mb-6">
              Renewal will be recorded immediately and coverage stays continuous. Full premium must be paid within
              14 days, or the policy will lapse.
            </div>
          )}
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep("configure")} disabled={processing} className="px-4 py-2 border rounded-lg">
              Back
            </button>
            <button
              onClick={confirmReview}
              disabled={processing}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {processing ? "Processing..." : mode === "PayLater" ? "Confirm Renewal" : "Continue to Payment"}
            </button>
          </div>
        </div>
      )}

      {step === "payment" && (
        <div>
          <SimulatedPaymentNotice />
          <div className="bg-white rounded-xl shadow p-6 my-6">
            <h3 className="font-semibold mb-2">Amount Due</h3>
            <p className="text-3xl font-bold">RM {(displayPolicy?.premium ?? premium ?? 0).toLocaleString()}</p>
            {displayPolicy?.payment_mode === "Instalment" && (
              <p className="text-xs text-gray-400 mt-1">
                Instalment {displayPolicy.paid_instalments + 1} of {displayPolicy.total_instalments}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <button
            onClick={simulatePayment}
            disabled={processing}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {processing ? "Processing simulated payment..." : "Simulate Payment"}
          </button>
        </div>
      )}

      {step === "done" && resultPolicy && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-xl font-bold mb-2">
            {resultPolicy.status === "Active" ? "Policy Active" : "Renewal Recorded"}
          </h2>
          <div className="flex justify-center mb-4">
            <PolicyStatusBadge status={resultPolicy.status} />
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Policy {resultPolicy.policy_number} covers {resultPolicy.start_date} to {resultPolicy.end_date}.
            {resultPolicy.pay_deadline && ` Pay in full by ${resultPolicy.pay_deadline} to keep coverage active.`}
          </p>
          <button
            onClick={() => router.push("/dashboard/policyholder/policies")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
          >
            View My Policies
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function PurchasePage() {
  return (
    <Suspense fallback={null}>
      <PurchaseFlow />
    </Suspense>
  );
}
