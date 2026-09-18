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
    color: "#EF4444",
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-600",
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
    color: "#7C3AED",
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-600",
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
    color: "#2563EB",
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-600",
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
    color: "#0EA5E9",
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-600",
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

export const STATUS_CONFIG: Record<string, { label: string; labelZh: string; bg: string; text: string }> = {
  Pending: { label: "Pending", labelZh: "待审核", bg: "bg-amber-100", text: "text-amber-700" },
  UnderReview: { label: "Under Review", labelZh: "审核中", bg: "bg-blue-100", text: "text-blue-700" },
  Approved: { label: "Approved", labelZh: "已批准", bg: "bg-green-100", text: "text-green-700" },
  Rejected: { label: "Rejected", labelZh: "已拒绝", bg: "bg-red-100", text: "text-red-700" },
};
