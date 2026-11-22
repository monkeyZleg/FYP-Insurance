// Checklist items from Part A of claim-request-checklist-and-calculator.md.
// Items marked required must be ticked or filled before a claim can be submitted.
import type { ClaimKind } from "./claimCalculator";

export interface CheckItem {
  id: string;
  label: string;
  required?: boolean;
}

export const IDENTITY: CheckItem[] = [
  { id: "holder", label: "I am the policyholder named on the policy", required: true },
  { id: "behalf", label: "I am submitting on behalf of the policyholder (e.g., family member / workshop)" },
  { id: "kyc", label: "My wallet is connected and my identity (eKYC) is verified", required: true },
  { id: "active", label: "Policy is active on the incident date", required: true },
  { id: "paid", label: "Premiums are fully paid up to date" },
];

export const KINDS: { id: ClaimKind; label: string; hint: string }[] = [
  { id: "motor", label: "Motor", hint: "accident / damage / theft" },
  { id: "medical", label: "Medical", hint: "hospitalisation / outpatient / surgery" },
  { id: "life", label: "Life", hint: "death / critical illness / disability" },
];
export const FUTURE_KINDS = ["Property", "Travel"];

export const INCIDENT_FLAGS: CheckItem[] = [
  { id: "authorities", label: "Incident reported to authorities (e.g., police report for motor accident or theft)" },
  { id: "thirdparty", label: "Third party involved" },
  { id: "duplicate", label: "Previous claim for the same incident submitted before" },
];

// Ids of the kind-specific documents start with "kdoc-" so they can be cleared when the claim type changes.
export const DOCS_COMMON: CheckItem[] = [
  { id: "doc-id", label: "Copy of ID", required: true },
  { id: "doc-form", label: "Completed claim description or form", required: true },
];

export const DOCS: Record<ClaimKind, CheckItem[]> = {
  motor: [
    { id: "kdoc-photos", label: "Photos of damage" },
    { id: "kdoc-repair", label: "Repair estimate or invoice from workshop" },
    { id: "kdoc-police", label: "Police report" },
    { id: "kdoc-reg", label: "Vehicle registration document" },
    { id: "kdoc-licence", label: "Driving licence" },
  ],
  medical: [
    { id: "kdoc-invoice", label: "Hospital or clinic invoice / itemised bill" },
    { id: "kdoc-report", label: "Medical report or discharge summary" },
    { id: "kdoc-referral", label: "Doctor's referral letter (if applicable)" },
    { id: "kdoc-receipts", label: "Payment receipts" },
  ],
  life: [
    { id: "kdoc-death", label: "Death certificate / medical diagnosis report" },
    { id: "kdoc-beneficiary", label: "Beneficiary identification" },
    { id: "kdoc-relationship", label: "Relationship proof of the claimant to the policyholder" },
  ],
};

export const DECLARATIONS: CheckItem[] = [
  { id: "d-true", label: "I confirm the information and documents submitted are true", required: true },
  { id: "d-chain", label: "I understand that verification activities are recorded on the blockchain and cannot be altered", required: true },
  { id: "d-privacy", label: "I consent to my data being processed per the Participant/Privacy notice", required: true },
  { id: "d-estimate", label: "I understand the calculated amount is an estimate, and the final decision rests with the claim verifier" },
  { id: "d-charge", label: "I have read the service charge (rate, minimum fee, cap) shown above and understand how it affects the amount I receive", required: true },
  { id: "d-reject", label: "I understand no service charge applies if my claim is rejected" },
];
