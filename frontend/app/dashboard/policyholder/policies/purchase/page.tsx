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
import Link from "next/link";
import {
  ArrowLeftRegular,
  ArrowRightRegular,
  CartRegular,
  CheckmarkRegular,
  LockClosedRegular,
  PaymentRegular,
} from "@fluentui/react-icons";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import InfoBar from "@/components/ui/InfoBar";
import Spinner from "@/components/ui/Spinner";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import Mascot from "@/components/mascot/Mascot";

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

  if (!token) return <EmptyState icon={LockClosedRegular} title="Please log in to continue." />;
  if (!loaded) return <PurchaseSkeleton />;

  if (!plan && !renewId && !payId) {
    return (
      <EmptyState
        icon={CartRegular}
        title="No plan selected"
        body="Go back to the preset plans and pick one to continue."
        action={
          <Link href="/dashboard/policyholder/policies/plans" className="btn btn-accent">
            Browse plans
          </Link>
        }
      />
    );
  }

  const planType = plan ? plan.type : existingPolicy ? existingPolicy.policy_type : null;
  const typeCfg = planType ? POLICY_TYPE_CONFIG[planType] : null;

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
  const flowSteps = ["Configure", "Review", "Payment"];
  const stepIndex = step === "configure" ? 0 : step === "review" ? 1 : step === "payment" ? 2 : 3;
  const modeLabel = mode === "PayLater" ? "Renew first, pay later" : mode === "Instalment" ? `Instalment (${instalmentCount}×)` : "Pay now";
  const dueNow =
    step === "payment" && displayPolicy?.payment_mode === "Instalment"
      ? Math.round((displayPolicy.premium / displayPolicy.total_instalments) * 100) / 100
      : mode === "Instalment" && step !== "payment"
        ? Math.round((premium / instalmentCount) * 100) / 100
        : mode === "PayLater"
          ? 0
          : (displayPolicy?.premium ?? premium);

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "My policies", href: "/dashboard/policyholder/policies" }, { label: renewId ? "Renew" : payId ? "Payment" : "Buy" }]}
        title={renewId ? "Renew policy" : payId ? "Settle payment" : "Buy a policy"}
      />

      {step !== "done" && (
        <ol className="enter mb-6 grid max-w-xl grid-cols-3 gap-2" aria-label="Steps">
          {flowSteps.map((label, i) => {
            const done = stepIndex > i;
            const current = stepIndex === i;
            return (
              <li key={label} aria-current={current ? "step" : undefined}>
                <div className="h-1 overflow-hidden rounded-full bg-[var(--control-stroke-secondary)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.1,0.9,0.2,1)]"
                    style={{ width: done || current ? "100%" : "0%", background: done ? "var(--success)" : "var(--accent-fill)" }}
                  />
                </div>
                <p className={`mt-2 flex items-center gap-1.5 t-caption ${current ? "font-semibold text-fg" : done ? "text-fg-2" : "text-fg-3"}`}>
                  {done ? <CheckmarkRegular fontSize={12} className="text-[var(--success)]" aria-hidden /> : <span>{i + 1}.</span>}
                  {label}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {step === "done" && resultPolicy ? (
        <div className="card pop-in mx-auto max-w-lg p-8 text-center sm:p-10">
          <Mascot mood="happy" className="mx-auto mb-4 h-20 w-20" />
          <h2 className="t-title text-fg">{resultPolicy.status === "Active" ? "You're covered" : "Renewal recorded"}</h2>
          <div className="mt-3 flex justify-center">
            <PolicyStatusBadge status={resultPolicy.status} />
          </div>
          <p className="mt-4 t-body text-fg-2">
            Policy <span className="font-mono text-fg">{resultPolicy.policy_number}</span> covers {resultPolicy.start_date} to {resultPolicy.end_date}.
            {resultPolicy.pay_deadline && ` Pay in full by ${resultPolicy.pay_deadline} to keep coverage active.`}
          </p>
          <button onClick={() => router.push("/dashboard/policyholder/policies")} className="btn btn-accent btn-lg nudge mt-8">
            View my policies <ArrowRightRegular />
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div key={step} className="enter min-w-0 space-y-5">
            {step === "configure" && (plan || existingPolicy) && (
              <>
                <section className="card p-5 sm:p-6">
                  <h2 className="t-subtitle text-fg">How would you like to pay?</h2>
                  {existingPolicy && (
                    <p className="mt-1 t-body text-fg-2">Current coverage ends {existingPolicy.end_date} — renewal starts from that date.</p>
                  )}
                  <div className="mt-5">
                    <PaymentOptionSelector
                      mode={mode}
                      onModeChange={setMode}
                      instalmentCount={instalmentCount}
                      onInstalmentCountChange={setInstalmentCount}
                      allowPayLater={Boolean(renewId)}
                    />
                  </div>
                </section>

                {mode === "Instalment" && (
                  <section className="card fade-in p-5 sm:p-6">
                    <h3 className="mb-4 t-body-strong text-fg">Instalment schedule preview</h3>
                    <InstalmentSchedule
                      premium={premium}
                      instalments={Array.from({ length: instalmentCount }, (_, i) => ({ index: i + 1, dueDate: "", paid: false }))}
                    />
                  </section>
                )}

                {error && <InfoBar severity="error">{error}</InfoBar>}

                <div className="flex justify-end">
                  <button onClick={confirmConfigure} className="btn btn-accent btn-lg nudge">
                    Continue <ArrowRightRegular />
                  </button>
                </div>
              </>
            )}

            {step === "review" && (
              <>
                <section className="card overflow-hidden">
                  <h2 className="border-b border-[var(--divider-stroke)] px-5 py-3.5 t-body-strong text-fg">Review</h2>
                  <dl className="divide-y divide-[var(--divider-stroke)]">
                    <Row label="Plan" value={plan?.name || existingPolicy?.plan_name || ""} />
                    <Row label="Premium" value={`RM ${premium.toLocaleString()}`} />
                    <Row label="Payment option" value={modeLabel} />
                  </dl>
                </section>
                {mode === "PayLater" && (
                  <InfoBar severity="warning" title="Pay within 14 days.">
                    Renewal will be recorded immediately and coverage stays continuous. Full premium must be paid within 14 days, or the
                    policy will lapse.
                  </InfoBar>
                )}
                {error && <InfoBar severity="error">{error}</InfoBar>}
                <div className="flex justify-between gap-3">
                  <button onClick={() => setStep("configure")} disabled={processing} className="btn btn-lg">
                    <ArrowLeftRegular /> Back
                  </button>
                  <button onClick={confirmReview} disabled={processing} className="btn btn-accent btn-lg">
                    {processing && <Spinner />}
                    {processing ? "Processing…" : mode === "PayLater" ? "Confirm renewal" : "Continue to payment"}
                  </button>
                </div>
              </>
            )}

            {step === "payment" && (
              <>
                <SimulatedPaymentNotice />
                <section className="card relative overflow-hidden p-6 sm:p-8">
                  <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-subtle-strong)] blur-2xl" />
                  <p className="t-body text-fg-2">Amount due</p>
                  <p className="mt-1 font-display text-[44px] font-semibold leading-none tracking-tight text-fg tabular-nums">
                    <span className="mr-1 t-body-large text-fg-2">RM</span>
                    {(displayPolicy?.premium ?? premium ?? 0).toLocaleString()}
                  </p>
                  {displayPolicy?.payment_mode === "Instalment" && (
                    <p className="mt-2 t-body text-fg-2">
                      Instalment {displayPolicy.paid_instalments + 1} of {displayPolicy.total_instalments}
                    </p>
                  )}
                </section>
                {error && <InfoBar severity="error">{error}</InfoBar>}
                <button onClick={simulatePayment} disabled={processing} className="btn btn-success btn-xl btn-block">
                  {processing ? <Spinner /> : <PaymentRegular />}
                  {processing ? "Processing simulated payment…" : "Simulate payment"}
                </button>
              </>
            )}
          </div>

          {/* order summary */}
          <aside className="enter enter-2 lg:sticky lg:top-20">
            <div className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[var(--divider-stroke)] p-5">
                <CategoryGlyph type={planType} variant="solid" size={44} />
                <div className="min-w-0">
                  <p className="t-body-strong text-fg truncate">{plan?.name || existingPolicy?.plan_name}</p>
                  <p className="t-caption text-fg-2">
                    {typeCfg?.label} insurance {plan ? `· ${plan.tier}` : existingPolicy ? `· ${existingPolicy.policy_number}` : ""}
                  </p>
                </div>
              </div>
              {plan && PLAN_META[plan.planId] && <p className="border-b border-[var(--divider-stroke)] px-5 py-4 t-body text-fg-2">{PLAN_META[plan.planId].coverageSummary}</p>}
              <dl className="space-y-2.5 px-5 py-4 t-body">
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-2">Premium (12 months)</dt>
                  <dd className="text-fg tabular-nums">RM {premium.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-2">Payment</dt>
                  <dd className="text-fg text-right">{step === "payment" && displayPolicy ? displayPolicy.payment_mode : modeLabel}</dd>
                </div>
              </dl>
              <div className="flex items-baseline justify-between border-t border-[var(--divider-stroke)] bg-[var(--card-fill-secondary)] px-5 py-4">
                <span className="t-body-strong text-fg">Due now</span>
                <span className="font-display text-[22px] font-semibold text-fg tabular-nums">RM {dueNow.toLocaleString()}</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-3 t-body">
      <dt className="text-fg-2">{label}</dt>
      <dd className="text-fg text-right">{value}</dd>
    </div>
  );
}

function PurchaseSkeleton() {
  return (
    <div aria-busy>
      <div className="skeleton mb-8 h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="skeleton h-80" />
        <div className="skeleton h-64" />
      </div>
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
