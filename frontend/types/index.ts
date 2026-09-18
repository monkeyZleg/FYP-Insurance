export type UserRole = "policyholder" | "verifier" | "admin" | "auditor";

export type InsuranceType = "health" | "life" | "transportation" | "flight";

export interface User {
  id: string;
  wallet_address: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  created_at: string;
}

export type ClaimStatus = "Pending" | "UnderReview" | "Approved" | "Rejected";

export interface Claim {
  id: string;
  blockchain_claim_id: string | null;
  tx_hash: string | null;
  policy_id: string | null;
  policyholder_id: string;
  insurance_type: InsuranceType | null;
  claim_type: string;
  description: string;
  incident_date: string;
  details?: Record<string, string | number>;
  status: ClaimStatus;
  assigned_verifier_id: string | null;
  verifier_remark: string | null;
  document_hash: string | null;
  submitted_at: string;
  last_updated_at: string;
  policyholder?: { full_name: string; wallet_address: string };
  verifier?: { full_name: string; wallet_address: string };
}

export interface Document {
  id: string;
  claim_id: string;
  file_name: string;
  file_path: string;
  file_hash: string;
  uploaded_at: string;
}

export interface AuditEvent {
  action: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  performedBy: string;
}

export interface Policy {
  id: string;
  policyholder_id: string;
  policy_number: string;
  policy_type: string;
  coverage_amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

/* ---- Policyholder Policy Module (buy / renew / pay, simulated) ---- */

export type PolicyPlanType = "motor" | "medical" | "life";

export type PaymentMode = "PayNow" | "Instalment" | "PayLater";

export type PolicyRecordStatus = "PendingPayment" | "Active" | "GracePeriod" | "Lapsed" | "Expired";

export interface PolicyPlan {
  id: string;
  type: PolicyPlanType;
  name: string;
  tier: "Basic" | "Standard" | "Comprehensive" | "Premium";
  premium: number;
  coverageSummary: string;
  documentChecklist: string[];
}

export interface InstalmentItem {
  index: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
}

export interface PolicyPaymentRecord {
  id: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  note: string;
}

export interface PolicyRecord {
  id: string;
  policyNumber: string;
  holderWallet: string;
  planId: string;
  planName: string;
  policyType: PolicyPlanType;
  tier: string;
  premium: number;
  startDate: string;
  endDate: string;
  paymentMode: PaymentMode;
  totalInstalments: number;
  paidInstalments: number;
  instalments: InstalmentItem[];
  payments: PolicyPaymentRecord[];
  status: PolicyRecordStatus;
  nextDueDate: string | null;
  graceDeadline: string | null;
  createdAt: string;
  renewalOf: string | null;
  events: { action: string; timestamp: string; detail: string }[];
}

export type ClaimEligibilityReason =
  | "OK"
  | "NO_POLICY"
  | "POLICY_LAPSED"
  | "POLICY_EXPIRED"
  | "POLICY_PENDING_PAYMENT"
  | "OUTSIDE_COVERAGE_PERIOD"
  | "WRONG_OWNER"
  | "TYPE_MISMATCH";

export interface ClaimEligibilityResult {
  eligible: boolean;
  reasonCode: ClaimEligibilityReason;
  message: string;
}
