import { apiFetchAuth } from "@/lib/api";
import { INSTALMENT_PERIOD_DAYS } from "@/constants/policyPlans";
import type {
  ClaimEligibilityResult,
  InsuranceType,
  InstalmentItem,
  PaymentMode,
  PolicyPlan,
  PolicyRow,
} from "@/types";

export async function listPlans(): Promise<PolicyPlan[]> {
  const data = await apiFetchAuth("/api/policies/plans");
  return data.plans || [];
}

export async function myPolicies(token: string): Promise<PolicyRow[]> {
  const data = await apiFetchAuth("/api/policies/my", {}, token);
  return data.policies || [];
}

export async function createPolicy(
  token: string,
  planId: number,
  paymentMode: Exclude<PaymentMode, "PayLater">,
  instalmentCount?: number
): Promise<{ policy: PolicyRow; txHash: string }> {
  return apiFetchAuth(
    "/api/policies",
    {
      method: "POST",
      body: JSON.stringify({ planId, paymentMode, instalmentCount }),
    },
    token
  );
}

export async function payPolicy(
  token: string,
  policyId: string
): Promise<{ policy: PolicyRow; txHash: string }> {
  return apiFetchAuth(`/api/policies/${policyId}/pay`, { method: "POST", body: JSON.stringify({}) }, token);
}

export async function renewPolicy(
  token: string,
  policyId: string,
  paymentMode: PaymentMode,
  instalmentCount?: number
): Promise<{ policy: PolicyRow }> {
  return apiFetchAuth(
    `/api/policies/${policyId}/renew`,
    { method: "POST", body: JSON.stringify({ paymentMode, instalmentCount }) },
    token
  );
}

export async function checkEligibility(
  token: string,
  policyId: string,
  insuranceType: InsuranceType,
  incidentDate: string
): Promise<ClaimEligibilityResult> {
  return apiFetchAuth(
    `/api/policies/${policyId}/eligibility?insuranceType=${insuranceType}&incidentDate=${incidentDate}`,
    {},
    token
  );
}

export function canRenew(policy: PolicyRow): boolean {
  return policy.status === "Active" || policy.status === "GracePeriod";
}

/*
 * The backend only stores total_instalments / paid_instalments counts — no
 * individual instalment due dates or a payment history array (the on-chain
 * contract doesn't track that either). This derives an approximate display
 * schedule client-side: one instalment every INSTALMENT_PERIOD_DAYS days
 * starting at start_date, with the first paid_instalments marked paid. It is
 * a display approximation only, not authoritative stored data.
 */
export function buildInstalmentSchedule(policy: PolicyRow): InstalmentItem[] {
  if (policy.payment_mode !== "Instalment" || policy.total_instalments <= 1) return [];
  const start = new Date(policy.start_date);
  return Array.from({ length: policy.total_instalments }, (_, i) => {
    const due = new Date(start);
    due.setDate(due.getDate() + i * INSTALMENT_PERIOD_DAYS);
    return {
      index: i + 1,
      dueDate: due.toISOString().slice(0, 10),
      paid: i < policy.paid_instalments,
    };
  });
}
