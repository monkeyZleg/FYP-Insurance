import type { InsuranceType } from "@/types";

export type FieldType = "text" | "date" | "textarea" | "number" | "select";

export interface ClaimFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  role?: "policyNumber" | "date" | "description" | "claimType";
}

export interface InsuranceConfig {
  id: InsuranceType;
  label: string;
  labelZh: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
  description: string;
  documentHint: string;
  fields: ClaimFieldConfig[];
}

export const INSURANCE_TYPES: InsuranceConfig[] = [
  {
    id: "health",
    label: "Health",
    labelZh: "健康保险",
    color: "#3D4FE0",
    bg: "bg-[#EEF0FC]",
    border: "border-[#3D4FE0]",
    text: "text-[#3D4FE0]",
    icon: "❤️",
    description: "Hospitalisation, outpatient, medical bills, surgery",
    documentHint: "Medical report, bills, receipts, discharge summary",
    fields: [
      { key: "policyNumber", label: "Policy Number", type: "text", required: true, placeholder: "POL-2024-00123", role: "policyNumber" },
      { key: "incidentDate", label: "Incident Date", type: "date", required: true, role: "date" },
      { key: "hospitalName", label: "Hospital / Clinic Name", type: "text", required: true },
      { key: "diagnosis", label: "Diagnosis / Reason", type: "textarea", required: true, role: "description" },
      { key: "medicalBill", label: "Total Medical Bill (RM)", type: "number", required: true },
      { key: "treatmentType", label: "Type of Treatment", type: "select", required: true, options: ["Inpatient", "Outpatient", "Surgery", "Emergency"], role: "claimType" },
    ],
  },
  {
    id: "life",
    label: "Life",
    labelZh: "人寿保险",
    color: "#3D4FE0",
    bg: "bg-[#EEF0FC]",
    border: "border-[#3D4FE0]",
    text: "text-[#3D4FE0]",
    icon: "🛡️",
    description: "Death benefit, critical illness, total permanent disability",
    documentHint: "Death certificate, medical diagnosis, legal documents",
    fields: [
      { key: "policyNumber", label: "Policy Number", type: "text", required: true, role: "policyNumber" },
      { key: "claimType", label: "Claim Type", type: "select", required: true, options: ["Death Benefit", "Critical Illness", "Total Disability"], role: "claimType" },
      { key: "dateOfEvent", label: "Date of Event", type: "date", required: true, role: "date" },
      { key: "description", label: "Description", type: "textarea", required: true, role: "description" },
      { key: "claimantRelationship", label: "Claimant Relationship", type: "select", required: true, options: ["Self", "Spouse", "Child", "Parent", "Other"] },
    ],
  },
  {
    id: "transportation",
    label: "Transportation",
    labelZh: "交通保险",
    color: "#3D4FE0",
    bg: "bg-[#EEF0FC]",
    border: "border-[#3D4FE0]",
    text: "text-[#3D4FE0]",
    icon: "🚗",
    description: "Motor accident, vehicle theft, third-party damage, windscreen",
    documentHint: "Police report, photos, repair estimate",
    fields: [
      { key: "policyNumber", label: "Policy Number", type: "text", required: true, role: "policyNumber" },
      { key: "vehicleRegistration", label: "Vehicle Registration", type: "text", required: true, placeholder: "WXY 1234" },
      { key: "claimType", label: "Claim Type", type: "select", required: true, options: ["Accident", "Theft", "Third-party", "Windscreen", "Flood"], role: "claimType" },
      { key: "incidentDate", label: "Incident Date", type: "date", required: true, role: "date" },
      { key: "incidentLocation", label: "Incident Location", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true, role: "description" },
      { key: "policeReportNumber", label: "Police Report Number", type: "text", required: false },
      { key: "estimatedRepairCost", label: "Estimated Repair Cost (RM)", type: "number", required: false },
    ],
  },
  {
    id: "flight",
    label: "Flight",
    labelZh: "航空保险",
    color: "#3D4FE0",
    bg: "bg-[#EEF0FC]",
    border: "border-[#3D4FE0]",
    text: "text-[#3D4FE0]",
    icon: "✈️",
    description: "Flight delay, cancellation, missed connection, baggage loss",
    documentHint: "Boarding pass, airline notice, baggage receipt",
    fields: [
      { key: "policyNumber", label: "Policy Number", type: "text", required: true, role: "policyNumber" },
      { key: "claimType", label: "Claim Type", type: "select", required: true, options: ["Flight Delay", "Cancellation", "Missed Connection", "Baggage"], role: "claimType" },
      { key: "flightNumber", label: "Flight Number", type: "text", required: true, placeholder: "AK 1234" },
      { key: "departureDate", label: "Departure Date", type: "date", required: true, role: "date" },
      { key: "originAirport", label: "Origin Airport", type: "text", required: true, placeholder: "KUL" },
      { key: "destinationAirport", label: "Destination Airport", type: "text", required: true, placeholder: "SIN" },
      { key: "delayDuration", label: "Delay Duration (hours)", type: "number", required: false },
      { key: "description", label: "Description", type: "textarea", required: true, role: "description" },
    ],
  },
];

export function getInsuranceConfig(type: string | null | undefined): InsuranceConfig | undefined {
  return INSURANCE_TYPES.find((t) => t.id === type);
}

// Status color mapping per design spec Part 1.2:
// Active/Approved/Settled -> ledger-mint, Pending/Grace/UnderReview/Submitted -> amber-spark,
// Lapsed/Rejected/Expired -> failure red. Dot color (`dot`) drives the row-based status
// displays; bg/text remain for pill-shaped badges.
export const STATUS_CONFIG: Record<
  string,
  { label: string; labelZh: string; bg: string; text: string; dot: string }
> = {
  Submitted: { label: "Submitted", labelZh: "已提交", bg: "bg-[#FFF6E5]", text: "text-[#B8760A]", dot: "#FFB020" },
  UnderReview: { label: "Under Review", labelZh: "审核中", bg: "bg-[#FFF6E5]", text: "text-[#B8760A]", dot: "#FFB020" },
  Approved: { label: "Approved", labelZh: "已批准", bg: "bg-[#E6F7F2]", text: "text-[#0F8F70]", dot: "#17B890" },
  Rejected: { label: "Rejected", labelZh: "已拒绝", bg: "bg-[#FDECEC]", text: "text-[#C93338]", dot: "#E5484D" },
  Settled: { label: "Settled", labelZh: "已结算", bg: "bg-[#E6F7F2]", text: "text-[#0F8F70]", dot: "#17B890" },
};
