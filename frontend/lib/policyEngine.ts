import type {
  ClaimEligibilityResult,
  InsuranceType,
  InstalmentItem,
  PaymentMode,
  PolicyPaymentRecord,
  PolicyRecord,
} from "@/types";
import { CLAIM_TO_POLICY_TYPE, GRACE_PERIOD_DAYS, POLICY_TERM_MONTHS, getPlan } from "@/constants/policyPlans";

/*
 * Simulated policy engine (Policyholder Policy Module).
 * Environment: local Hardhat network, simulated payments — per the module
 * spec, no real payment gateway or on-chain PolicyManager contract exists
 * yet, so policy state is simulated client-side per wallet address and
 * persisted to localStorage, mirroring the lifecycle rules the eventual
 * smart contract (createPolicy / recordPayment / renewPolicy /
 * refreshStatus / isEligible) is expected to enforce.
 */

function storageKey(wallet: string): string {
  return `beicvs_policies_${wallet.toLowerCase()}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function genPolicyNumber(type: string): string {
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `POL-${type.toUpperCase()}-${new Date().getFullYear()}-${rand}`;
}

export function loadPolicies(wallet: string): PolicyRecord[] {
  if (typeof window === "undefined" || !wallet) return [];
  try {
    const raw = localStorage.getItem(storageKey(wallet));
    return raw ? (JSON.parse(raw) as PolicyRecord[]) : [];
  } catch {
    return [];
  }
}

export function getPolicy(wallet: string, policyId: string): PolicyRecord | null {
  return loadPolicies(wallet).find((p) => p.id === policyId) || null;
}

function savePolicies(wallet: string, policies: PolicyRecord[]) {
  localStorage.setItem(storageKey(wallet), JSON.stringify(policies));
}

export function previewInstalments(premium: number, count: number): InstalmentItem[] {
  return buildInstalments(premium, count, new Date());
}

function buildInstalments(premium: number, count: number, firstDueDate: Date): InstalmentItem[] {
  const per = Math.round((premium / count) * 100) / 100;
  return Array.from({ length: count }, (_, i) => ({
    index: i + 1,
    dueDate: iso(addMonths(firstDueDate, i)),
    amount: i === count - 1 ? Math.round((premium - per * (count - 1)) * 100) / 100 : per,
    paid: false,
  }));
}

export function createPolicy(
  wallet: string,
  planId: string,
  paymentMode: Exclude<PaymentMode, "PayLater">,
  instalmentCount = 3
): PolicyRecord {
  const plan = getPlan(planId);
  if (!plan) throw new Error("Unknown plan");

  const now = new Date();
  const start = now;
  const end = addMonths(start, POLICY_TERM_MONTHS);
  const instalments = paymentMode === "Instalment" ? buildInstalments(plan.premium, instalmentCount, start) : [];

  const policy: PolicyRecord = {
    id: crypto.randomUUID(),
    policyNumber: genPolicyNumber(plan.type),
    holderWallet: wallet,
    planId: plan.id,
    planName: plan.name,
    policyType: plan.type,
    tier: plan.tier,
    premium: plan.premium,
    startDate: iso(start),
    endDate: iso(end),
    paymentMode,
    totalInstalments: paymentMode === "Instalment" ? instalmentCount : 1,
    paidInstalments: 0,
    instalments,
    payments: [],
    status: "PendingPayment",
    nextDueDate: paymentMode === "Instalment" ? instalments[0].dueDate : iso(start),
    graceDeadline: null,
    createdAt: now.toISOString(),
    renewalOf: null,
    events: [{ action: "PolicyCreated", timestamp: now.toISOString(), detail: `${plan.name} (${paymentMode})` }],
  };

  const policies = loadPolicies(wallet);
  policies.push(policy);
  savePolicies(wallet, policies);
  return policy;
}

export function recordPayment(wallet: string, policyId: string): PolicyRecord {
  const policies = loadPolicies(wallet);
  const policy = policies.find((p) => p.id === policyId);
  if (!policy) throw new Error("Policy not found");

  const now = new Date();

  if (policy.paymentMode === "Instalment") {
    const next = policy.instalments.find((i) => !i.paid);
    if (!next) throw new Error("All instalments already paid");
    next.paid = true;
    next.paidDate = iso(now);
    policy.paidInstalments += 1;
    policy.payments.push(paymentRecord(next.amount, policy.paymentMode, `Instalment ${next.index}/${policy.totalInstalments}`));

    const remaining = policy.instalments.find((i) => !i.paid);
    policy.nextDueDate = remaining ? remaining.dueDate : null;
    policy.graceDeadline = null;
    policy.status = "Active";
  } else {
    // PayNow (new purchase) or PayLater (renewal grace-period settlement)
    policy.payments.push(paymentRecord(policy.premium, policy.paymentMode, "Full premium"));
    policy.paidInstalments = policy.totalInstalments;
    policy.instalments = policy.instalments.map((i) => ({ ...i, paid: true, paidDate: iso(now) }));
    policy.nextDueDate = null;
    policy.graceDeadline = null;
    policy.status = "Active";
  }

  policy.events.push({ action: "PaymentRecorded", timestamp: now.toISOString(), detail: `RM ${policy.premium}` });
  savePolicies(wallet, policies);
  return policy;
}

function paymentRecord(amount: number, mode: PaymentMode, note: string): PolicyPaymentRecord {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    amount,
    mode,
    reference: "0x" + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    note,
  };
}

export function canRenew(policy: PolicyRecord): boolean {
  return policy.status === "Active" || policy.status === "GracePeriod";
}

export function renewPolicy(
  wallet: string,
  policyId: string,
  paymentMode: PaymentMode,
  instalmentCount = 3
): PolicyRecord {
  const policies = loadPolicies(wallet);
  const policy = policies.find((p) => p.id === policyId);
  if (!policy) throw new Error("Policy not found");
  if (!canRenew(policy)) throw new Error("This policy is not eligible for renewal");

  const now = new Date();
  const newStart = new Date(policy.endDate) > now ? new Date(policy.endDate) : now;
  const newEnd = addMonths(newStart, POLICY_TERM_MONTHS);

  policy.startDate = iso(newStart);
  policy.endDate = iso(newEnd);
  policy.paymentMode = paymentMode;
  policy.paidInstalments = 0;
  policy.renewalOf = policy.renewalOf || policy.id;

  if (paymentMode === "PayLater") {
    // Renew first, pay later: coverage stays continuous, full premium due within the grace period.
    policy.totalInstalments = 1;
    policy.instalments = [];
    policy.status = "GracePeriod";
    policy.nextDueDate = null;
    policy.graceDeadline = iso(addDays(now, GRACE_PERIOD_DAYS));
    policy.events.push({ action: "PolicyRenewed", timestamp: now.toISOString(), detail: "Renew first, pay later" });
  } else if (paymentMode === "Instalment") {
    policy.totalInstalments = instalmentCount;
    policy.instalments = buildInstalments(policy.premium, instalmentCount, newStart);
    policy.status = "PendingPayment";
    policy.nextDueDate = policy.instalments[0].dueDate;
    policy.graceDeadline = null;
    policy.events.push({ action: "PolicyRenewed", timestamp: now.toISOString(), detail: "Instalment" });
  } else {
    policy.totalInstalments = 1;
    policy.instalments = [];
    policy.status = "PendingPayment";
    policy.nextDueDate = iso(newStart);
    policy.graceDeadline = null;
    policy.events.push({ action: "PolicyRenewed", timestamp: now.toISOString(), detail: "Pay now" });
  }

  savePolicies(wallet, policies);
  return policy;
}

export function refreshStatus(wallet: string, policyId: string): PolicyRecord | null {
  const policies = loadPolicies(wallet);
  const policy = policies.find((p) => p.id === policyId);
  if (!policy) return null;
  const changed = applyStatusRules(policy);
  if (changed) savePolicies(wallet, policies);
  return policy;
}

export function refreshAll(wallet: string): PolicyRecord[] {
  const policies = loadPolicies(wallet);
  let changed = false;
  for (const policy of policies) {
    if (applyStatusRules(policy)) changed = true;
  }
  if (changed) savePolicies(wallet, policies);
  return policies;
}

function applyStatusRules(policy: PolicyRecord): boolean {
  const now = new Date();
  const before = policy.status;

  if ((policy.status === "Active" || policy.status === "GracePeriod") && now > new Date(policy.endDate)) {
    policy.status = "Expired";
  } else if (policy.status === "Active" && policy.nextDueDate && now > new Date(policy.nextDueDate)) {
    policy.status = "GracePeriod";
    policy.graceDeadline = iso(addDays(new Date(policy.nextDueDate), GRACE_PERIOD_DAYS));
  } else if (policy.status === "GracePeriod" && policy.graceDeadline && now > new Date(policy.graceDeadline)) {
    policy.status = "Lapsed";
  }

  if (policy.status !== before) {
    policy.events.push({ action: "StatusChanged", timestamp: now.toISOString(), detail: `${before} → ${policy.status}` });
    return true;
  }
  return false;
}

const REASON_MESSAGES: Record<string, string> = {
  OK: "Policy is active and covers this claim.",
  NO_POLICY: "No matching policy was found for this wallet.",
  POLICY_LAPSED: "The policy has lapsed — the grace period ended without payment.",
  POLICY_EXPIRED: "The policy's coverage period has ended and it was not renewed.",
  POLICY_PENDING_PAYMENT: "The policy is awaiting its first payment and is not yet active.",
  OUTSIDE_COVERAGE_PERIOD: "The incident date falls outside the policy's coverage period.",
  WRONG_OWNER: "This policy does not belong to the connected wallet.",
  TYPE_MISMATCH: "The claim type does not match this policy's insurance type.",
};

export function isEligible(
  wallet: string,
  policyId: string,
  insuranceType: InsuranceType,
  incidentDate: string
): ClaimEligibilityResult {
  const policy = loadPolicies(wallet).find((p) => p.id === policyId);
  if (!policy) return { eligible: false, reasonCode: "NO_POLICY", message: REASON_MESSAGES.NO_POLICY };

  applyStatusRules(policy);

  if (policy.holderWallet.toLowerCase() !== wallet.toLowerCase())
    return { eligible: false, reasonCode: "WRONG_OWNER", message: REASON_MESSAGES.WRONG_OWNER };

  const mappedType = CLAIM_TO_POLICY_TYPE[insuranceType];
  if (!mappedType || policy.policyType !== mappedType)
    return { eligible: false, reasonCode: "TYPE_MISMATCH", message: REASON_MESSAGES.TYPE_MISMATCH };

  if (policy.status === "Lapsed")
    return { eligible: false, reasonCode: "POLICY_LAPSED", message: REASON_MESSAGES.POLICY_LAPSED };
  if (policy.status === "Expired")
    return { eligible: false, reasonCode: "POLICY_EXPIRED", message: REASON_MESSAGES.POLICY_EXPIRED };
  if (policy.status === "PendingPayment")
    return { eligible: false, reasonCode: "POLICY_PENDING_PAYMENT", message: REASON_MESSAGES.POLICY_PENDING_PAYMENT };

  if (incidentDate) {
    const incident = new Date(incidentDate);
    if (incident < new Date(policy.startDate) || incident > new Date(policy.endDate)) {
      return { eligible: false, reasonCode: "OUTSIDE_COVERAGE_PERIOD", message: REASON_MESSAGES.OUTSIDE_COVERAGE_PERIOD };
    }
  }

  return { eligible: true, reasonCode: "OK", message: REASON_MESSAGES.OK };
}

export function eligiblePoliciesForClaim(wallet: string, insuranceType: InsuranceType): PolicyRecord[] {
  const mappedType = CLAIM_TO_POLICY_TYPE[insuranceType];
  if (!mappedType) return [];
  return refreshAll(wallet).filter(
    (p) => p.policyType === mappedType && (p.status === "Active" || p.status === "GracePeriod")
  );
}
