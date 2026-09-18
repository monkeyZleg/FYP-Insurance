export type UserRole = "policyholder" | "verifier" | "admin" | "auditor";

export type InsuranceType = "health" | "life" | "transportation" | "flight";

export interface User {
  id: string;
  wallet_address: string | null;
  holder_id?: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  created_at: string;
}

export type ClaimStatus = "Submitted" | "UnderReview" | "Approved" | "Rejected" | "Settled";

export interface Claim {
  id: string;
  on_chain_claim_id: string | null;
  submit_tx_hash: string | null;
  policy_id: string | null;
  policyholder_id: string;
  holder_id: string;
  insurance_type: InsuranceType | null;
  claim_type: string;
  description: string;
  incident_date: string;
  details: Record<string, string | number>;
  details_hash: string | null;
  doc_hashes: string[];
  status: ClaimStatus;
  assigned_verifier_id: string | null;
  assign_tx_hash: string | null;
  decided_by_wallet: string | null;
  decide_tx_hash: string | null;
  decided_at: string | null;
  verifier_remark: string | null;
  reason_code: number | null;
  settle_tx_hash: string | null;
  settled_at: string | null;
  flagged: boolean;
  flag_tx_hash: string | null;
  document_hash: string | null;
  submitted_at: string;
  last_updated_at: string;
  policyholder?: { full_name: string; email: string };
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

/* ---- Policyholder Policy Module (buy / renew / pay, backed by the real API) ---- */

export type PolicyPlanType = "motor" | "medical" | "life";

export type PaymentMode = "PayNow" | "Instalment" | "PayLater";

export type PolicyRecordStatus = "PendingPayment" | "Active" | "GracePeriod" | "Lapsed" | "Expired";

export interface PolicyPlan {
  planId: number;
  id: string;
  type: PolicyPlanType;
  name: string;
  tier: "Basic" | "Standard" | "Comprehensive" | "Premium";
  premiumRM: number;
}

export interface InstalmentItem {
  index: number;
  dueDate: string;
  paid: boolean;
}

export interface PolicyRow {
  id: string;
  on_chain_policy_id: string | null;
  policyholder_id: string;
  holder_id: string;
  policy_number: string;
  policy_type: PolicyPlanType;
  plan_id: number;
  plan_name: string;
  premium: number;
  payment_mode: PaymentMode;
  total_instalments: number;
  paid_instalments: number;
  start_date: string;
  end_date: string;
  pay_deadline: string | null;
  status: PolicyRecordStatus;
  previous_policy_id: string | null;
  create_tx_hash: string | null;
  created_at: string;
  last_synced_at: string;
}

export type ClaimEligibilityReason =
  | "OK"
  | "POLICY_NOT_FOUND"
  | "WRONG_OWNER"
  | "TYPE_MISMATCH"
  | "OUTSIDE_COVERAGE_PERIOD"
  | "INVALID_DATE"
  | "POLICY_NOT_ACTIVE"
  | "POLICY_LAPSED"
  | "POLICY_EXPIRED";

export interface ClaimEligibilityResult {
  eligible: boolean;
  reasonCode: ClaimEligibilityReason;
  message?: string;
}
