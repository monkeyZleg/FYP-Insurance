import type { InsuranceType, PolicyPlan, PolicyPlanType } from "@/types";

export const GRACE_PERIOD_DAYS = 14;
export const POLICY_TERM_MONTHS = 12;
export const RENEWAL_WINDOW_DAYS = 30;
export const INSTALMENT_OPTIONS = [3, 6, 12] as const;

export const POLICY_TYPE_CONFIG: Record<
  PolicyPlanType,
  { label: string; labelZh: string; icon: string; bg: string; border: string; text: string; color: string }
> = {
  motor: { label: "Motor", labelZh: "车险", icon: "🚗", bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-600", color: "#2563EB" },
  medical: { label: "Medical", labelZh: "医疗险", icon: "❤️", bg: "bg-red-50", border: "border-red-300", text: "text-red-600", color: "#EF4444" },
  life: { label: "Life", labelZh: "寿险", icon: "🛡️", bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-600", color: "#7C3AED" },
};

// Claims are filed under the four FRONTEND_FEATURES.md insurance types, while
// this policy module only sells Motor / Medical / Life plans. Flight claims
// have no matching policy plan in scope, so they are excluded from linkage.
export const CLAIM_TO_POLICY_TYPE: Partial<Record<InsuranceType, PolicyPlanType>> = {
  health: "medical",
  life: "life",
  transportation: "motor",
};

export const POLICY_PLANS: PolicyPlan[] = [
  {
    id: "motor-basic",
    type: "motor",
    name: "Motor Basic",
    tier: "Basic",
    premium: 480,
    coverageSummary: "Third-party liability up to RM 500,000",
    documentChecklist: ["Police report", "Repair estimate", "Photos of damage"],
  },
  {
    id: "motor-standard",
    type: "motor",
    name: "Motor Standard",
    tier: "Standard",
    premium: 890,
    coverageSummary: "Own damage + third-party liability up to RM 1,000,000",
    documentChecklist: ["Police report", "Repair estimate", "Photos of damage"],
  },
  {
    id: "motor-comprehensive",
    type: "motor",
    name: "Motor Comprehensive",
    tier: "Comprehensive",
    premium: 1450,
    coverageSummary: "Full comprehensive cover, windscreen and flood damage included",
    documentChecklist: ["Police report", "Repair estimate", "Photos of damage"],
  },
  {
    id: "medical-basic",
    type: "medical",
    name: "Medical Basic",
    tier: "Basic",
    premium: 620,
    coverageSummary: "Inpatient hospitalisation up to RM 50,000/year",
    documentChecklist: ["Medical bills", "Doctor's report"],
  },
  {
    id: "medical-standard",
    type: "medical",
    name: "Medical Standard",
    tier: "Standard",
    premium: 1180,
    coverageSummary: "Inpatient + outpatient cover up to RM 150,000/year",
    documentChecklist: ["Medical bills", "Doctor's report"],
  },
  {
    id: "medical-premium",
    type: "medical",
    name: "Medical Premium",
    tier: "Premium",
    premium: 2350,
    coverageSummary: "Full inpatient, outpatient and surgery cover up to RM 500,000/year",
    documentChecklist: ["Medical bills", "Doctor's report"],
  },
  {
    id: "life-basic",
    type: "life",
    name: "Life Basic",
    tier: "Basic",
    premium: 540,
    coverageSummary: "Death benefit sum assured RM 100,000",
    documentChecklist: ["Death or disability certificate", "ID"],
  },
  {
    id: "life-standard",
    type: "life",
    name: "Life Standard",
    tier: "Standard",
    premium: 980,
    coverageSummary: "Death + critical illness sum assured RM 250,000",
    documentChecklist: ["Death or disability certificate", "ID"],
  },
  {
    id: "life-premium",
    type: "life",
    name: "Life Premium",
    tier: "Premium",
    premium: 1920,
    coverageSummary: "Death, critical illness and total permanent disability, sum assured RM 500,000",
    documentChecklist: ["Death or disability certificate", "ID"],
  },
];

export function getPlan(planId: string): PolicyPlan | undefined {
  return POLICY_PLANS.find((p) => p.id === planId);
}

export function getPlansByType(type?: PolicyPlanType): PolicyPlan[] {
  return type ? POLICY_PLANS.filter((p) => p.type === type) : POLICY_PLANS;
}

export const POLICY_STATUS_CONFIG: Record<string, { label: string; labelZh: string; bg: string; text: string }> = {
  PendingPayment: { label: "Pending Payment", labelZh: "待付款", bg: "bg-gray-100", text: "text-gray-600" },
  Active: { label: "Active", labelZh: "有效", bg: "bg-green-100", text: "text-green-700" },
  GracePeriod: { label: "Grace Period", labelZh: "宽限期", bg: "bg-amber-100", text: "text-amber-700" },
  Lapsed: { label: "Lapsed", labelZh: "失效", bg: "bg-red-100", text: "text-red-700" },
  Expired: { label: "Expired", labelZh: "已过期", bg: "bg-gray-200", text: "text-gray-500" },
};
