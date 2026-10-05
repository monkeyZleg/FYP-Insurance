import type { InsuranceType, PolicyPlanType } from "@/types";
import type { Tone } from "@/constants/insurance";

export const GRACE_PERIOD_DAYS = 14;
export const POLICY_TERM_MONTHS = 12;
export const RENEWAL_WINDOW_DAYS = 30;
export const INSTALMENT_OPTIONS = [3, 6, 12] as const;
export const INSTALMENT_PERIOD_DAYS = 30;

export const POLICY_TYPE_CONFIG: Record<PolicyPlanType, { label: string; labelZh: string }> = {
  motor: { label: "Motor", labelZh: "车险" },
  medical: { label: "Medical", labelZh: "医疗险" },
  life: { label: "Life", labelZh: "寿险" },
};

// Claims are filed under the four FRONTEND_FEATURES.md insurance types, while
// this policy module only sells Motor / Medical / Life plans. Flight claims
// have no matching policy plan in scope, so they are excluded from linkage.
export const CLAIM_TO_POLICY_TYPE: Partial<Record<InsuranceType, PolicyPlanType>> = {
  health: "medical",
  life: "life",
  transportation: "motor",
};

// The backend's GET /api/policies/plans is the source of truth for planId,
// name, tier and premium (see lib/policyApi.ts). This static table only adds
// display-only extras the API doesn't return, keyed by the same numeric
// planId (1-9) the backend uses.
export const PLAN_META: Record<number, { coverageSummary: string; documentChecklist: string[] }> = {
  1: { coverageSummary: "Third-party liability up to RM 500,000", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  2: { coverageSummary: "Own damage + third-party liability up to RM 1,000,000", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  3: { coverageSummary: "Full comprehensive cover, windscreen and flood damage included", documentChecklist: ["Police report", "Repair estimate", "Photos of damage"] },
  4: { coverageSummary: "Inpatient hospitalisation up to RM 50,000/year", documentChecklist: ["Medical bills", "Doctor's report"] },
  5: { coverageSummary: "Inpatient + outpatient cover up to RM 150,000/year", documentChecklist: ["Medical bills", "Doctor's report"] },
  6: { coverageSummary: "Full inpatient, outpatient and surgery cover up to RM 500,000/year", documentChecklist: ["Medical bills", "Doctor's report"] },
  7: { coverageSummary: "Death benefit sum assured RM 100,000", documentChecklist: ["Death or disability certificate", "ID"] },
  8: { coverageSummary: "Death + critical illness sum assured RM 250,000", documentChecklist: ["Death or disability certificate", "ID"] },
  9: { coverageSummary: "Death, critical illness and total permanent disability, sum assured RM 500,000", documentChecklist: ["Death or disability certificate", "ID"] },
};

// Same tone vocabulary as STATUS_CONFIG in constants/insurance.ts.
export const POLICY_STATUS_CONFIG: Record<string, { label: string; labelZh: string; tone: Tone }> = {
  PendingPayment: { label: "Pending Payment", labelZh: "待付款", tone: "caution" },
  Active: { label: "Active", labelZh: "有效", tone: "success" },
  GracePeriod: { label: "Grace Period", labelZh: "宽限期", tone: "caution" },
  Lapsed: { label: "Lapsed", labelZh: "失效", tone: "critical" },
  Expired: { label: "Expired", labelZh: "已过期", tone: "neutral" },
};
