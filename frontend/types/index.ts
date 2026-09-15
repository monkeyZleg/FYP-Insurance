export type UserRole = "policyholder" | "verifier" | "admin" | "auditor";

export interface User {
  id: string;
  wallet_address: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Claim {
  id: string;
  blockchain_claim_id: string | null;
  tx_hash: string | null;
  policy_id: string | null;
  policyholder_id: string;
  claim_type: string;
  description: string;
  incident_date: string;
  status: "Pending" | "UnderReview" | "Approved" | "Rejected";
  assigned_verifier_id: string | null;
  verifier_remark: string | null;
  document_hash: string | null;
  submitted_at: string;
  last_updated_at: string;
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
