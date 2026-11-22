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
  description: string;
  documentHint: string;
  fields: ClaimFieldConfig[];
}

export const INSURANCE_TYPES: InsuranceConfig[] = [
  {
    id: "car",
    label: "Car",
    labelZh: "汽车保险",
    description: "Car accident, theft, third-party damage, windscreen, flood",
    documentHint: "Police report, photos, repair estimate",
    fields: [
      { key: "policyNumber", label: "Policy Number", type: "text", required: true, role: "policyNumber" },
      { key: "vehicleRegistration", label: "Car Registration", type: "text", required: true, placeholder: "WXY 1234" },
      { key: "claimType", label: "Claim Type", type: "select", required: true, options: ["Accident", "Theft", "Third-party", "Windscreen", "Flood"], role: "claimType" },
      { key: "incidentDate", label: "Incident Date", type: "date", required: true, role: "date" },
      { key: "incidentLocation", label: "Incident Location", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true, role: "description" },
      { key: "policeReportNumber", label: "Police Report Number", type: "text", required: false },
      { key: "estimatedRepairCost", label: "Estimated Repair Cost (RM)", type: "number", required: false },
    ],
  },
  {
    id: "motor",
    label: "Motor",
    labelZh: "摩托车保险",
    description: "Motorcycle accident, theft, third-party damage, flood",
    documentHint: "Police report, photos, repair estimate",
    fields: [
      { key: "policyNumber", label: "Policy Number", type: "text", required: true, role: "policyNumber" },
      { key: "vehicleRegistration", label: "Motorcycle Registration", type: "text", required: true, placeholder: "WXY 1234" },
      { key: "claimType", label: "Claim Type", type: "select", required: true, options: ["Accident", "Theft", "Third-party", "Flood"], role: "claimType" },
      { key: "incidentDate", label: "Incident Date", type: "date", required: true, role: "date" },
      { key: "incidentLocation", label: "Incident Location", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true, role: "description" },
      { key: "policeReportNumber", label: "Police Report Number", type: "text", required: false },
      { key: "estimatedRepairCost", label: "Estimated Repair Cost (RM)", type: "number", required: false },
    ],
  },
  {
    id: "travel",
    label: "Travel",
    labelZh: "旅游保险",
    description: "Trip cancellation, flight delay, baggage loss, medical emergency abroad",
    documentHint: "Itinerary, boarding pass, airline or hotel notice, receipts",
    fields: [
      { key: "policyNumber", label: "Policy Number", type: "text", required: true, role: "policyNumber" },
      { key: "claimType", label: "Claim Type", type: "select", required: true, options: ["Trip Cancellation", "Flight Delay", "Baggage Loss", "Medical Emergency Abroad"], role: "claimType" },
      { key: "destination", label: "Destination", type: "text", required: true, placeholder: "Tokyo, Japan" },
      { key: "departureDate", label: "Departure Date", type: "date", required: true, role: "date" },
      { key: "description", label: "Description", type: "textarea", required: true, role: "description" },
      { key: "estimatedLoss", label: "Estimated Loss (RM)", type: "number", required: false },
    ],
  },
  {
    id: "health",
    label: "Health",
    labelZh: "健康保险",
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
];

export function getInsuranceConfig(type: string | null | undefined): InsuranceConfig | undefined {
  return INSURANCE_TYPES.find((t) => t.id === type);
}

export type Tone = "success" | "caution" | "critical" | "accent" | "neutral";

// Status tones follow the WinUI system colors: success (green) for a positive
// outcome, caution (amber) for work in progress, critical (red) for a negative
// outcome, accent for "received, nothing has happened yet".
export const STATUS_CONFIG: Record<string, { label: string; labelZh: string; tone: Tone }> = {
  Submitted: { label: "Submitted", labelZh: "已提交", tone: "accent" },
  UnderReview: { label: "Under Review", labelZh: "审核中", tone: "caution" },
  Approved: { label: "Approved", labelZh: "已批准", tone: "success" },
  Rejected: { label: "Rejected", labelZh: "已拒绝", tone: "critical" },
  Settled: { label: "Settled", labelZh: "已结算", tone: "success" },
};
