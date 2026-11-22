import type { InsuranceType, PolicyPlanType } from "@/types";
import type { Tone } from "@/constants/insurance";

export const GRACE_PERIOD_DAYS = 14;
export const POLICY_TERM_MONTHS = 12;
export const RENEWAL_WINDOW_DAYS = 30;
export const INSTALMENT_OPTIONS = [3, 6, 12] as const;
export const INSTALMENT_PERIOD_DAYS = 30;

export const POLICY_TYPE_CONFIG: Record<PolicyPlanType, { label: string; labelZh: string }> = {
  car: { label: "Car", labelZh: "汽车保险" },
  motor: { label: "Motor", labelZh: "摩托车保险" },
  travel: { label: "Travel", labelZh: "旅游保险" },
  health: { label: "Health", labelZh: "健康保险" },
};

// Claims are filed under four insurance types (car, motor, travel, health) and
// the policy module sells plans of the same four types, which are also the
// on-chain PolicyType values. A claim links to a policy of its own type.
export const CLAIM_TO_POLICY_TYPE: Record<InsuranceType, PolicyPlanType> = {
  car: "car",
  motor: "motor",
  travel: "travel",
  health: "health",
};

// The backend's GET /api/policies/plans is the source of truth for planId,
// name, tier and premium (see lib/policyApi.ts). This static table only adds
// display-only extras the API doesn't return, keyed by the same numeric
// planId (1-12) the backend uses. Travel plans are annual multi-trip plans,
// because every policy runs for 12 months on-chain.
export const PLAN_META: Record<number, { coverageSummary: string; documentChecklist: string[] }> = {
  1: { coverageSummary: "Third-party liability up to RM 500,000", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  2: { coverageSummary: "Own damage + third-party liability up to RM 1,000,000", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  3: { coverageSummary: "Full comprehensive cover, windscreen and flood damage included", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  4: { coverageSummary: "Motorcycle third-party liability up to RM 100,000", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  5: { coverageSummary: "Motorcycle theft + third-party liability up to RM 250,000", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  6: { coverageSummary: "Full comprehensive motorcycle cover, flood damage included", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  7: { coverageSummary: "Annual multi-trip: flight delay and baggage loss up to RM 3,000", documentChecklist: ["Itinerary or boarding pass", "Airline or hotel notice", "Receipts"] },
  8: { coverageSummary: "Annual multi-trip: trip cancellation, delay and baggage up to RM 10,000", documentChecklist: ["Itinerary or boarding pass", "Airline or hotel notice", "Receipts"] },
  9: { coverageSummary: "Annual multi-trip: full cover plus medical emergency abroad up to RM 300,000", documentChecklist: ["Itinerary or boarding pass", "Airline or hotel notice", "Receipts"] },
  10: { coverageSummary: "Inpatient hospitalisation up to RM 50,000/year", documentChecklist: ["Medical bills", "Doctor's report"] },
  11: { coverageSummary: "Inpatient + outpatient cover up to RM 150,000/year", documentChecklist: ["Medical bills", "Doctor's report"] },
  12: { coverageSummary: "Full inpatient, outpatient and surgery cover up to RM 500,000/year", documentChecklist: ["Medical bills", "Doctor's report"] },
};

// Same tone vocabulary as STATUS_CONFIG in constants/insurance.ts.
export const POLICY_STATUS_CONFIG: Record<string, { label: string; labelZh: string; tone: Tone }> = {
  PendingPayment: { label: "Pending Payment", labelZh: "待付款", tone: "caution" },
  Active: { label: "Active", labelZh: "有效", tone: "success" },
  GracePeriod: { label: "Grace Period", labelZh: "宽限期", tone: "caution" },
  Lapsed: { label: "Lapsed", labelZh: "失效", tone: "critical" },
  Expired: { label: "Expired", labelZh: "已过期", tone: "neutral" },
};
