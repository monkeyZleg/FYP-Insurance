"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMetaMask } from "@/hooks/useMetaMask";
import { useClaimRegistry } from "@/hooks/useContract";
import { apiFetch } from "@/lib/api";
import { INSURANCE_TYPES, type InsuranceConfig } from "@/constants/insurance";
import { CLAIM_TO_POLICY_TYPE } from "@/constants/policyPlans";
import { eligiblePoliciesForClaim, isEligible } from "@/lib/policyEngine";
import type { InsuranceType, PolicyRecord } from "@/types";
import InsuranceTypeCard from "@/components/insurance/InsuranceTypeCard";
import DocumentUploader, { type UploadedFile } from "@/components/documents/DocumentUploader";
import BlockchainNote from "@/components/blockchain/BlockchainNote";
import HashDisplay from "@/components/blockchain/HashDisplay";

type Step = 1 | 2 | 3 | 4;

export default function ClaimForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useMetaMask();
  const { submitClaim } = useClaimRegistry();

  const preselected = searchParams.get("type") as InsuranceType | null;
  const [step, setStep] = useState<Step>(preselected ? 2 : 1);
  const [insuranceType, setInsuranceType] = useState<InsuranceType | null>(preselected);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [combinedHash, setCombinedHash] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  const config: InsuranceConfig | undefined = INSURANCE_TYPES.find((t) => t.id === insuranceType);
  const policyNumberField = config?.fields.find((f) => f.role === "policyNumber");
  const dateFieldConfig = config?.fields.find((f) => f.role === "date");
  const linksToPolicyModule = insuranceType ? Boolean(CLAIM_TO_POLICY_TYPE[insuranceType]) : false;
  const myPolicies = address && insuranceType ? eligiblePoliciesForClaim(address, insuranceType) : [];

  const eligibility =
    address && insuranceType && selectedPolicyId
      ? isEligible(address, selectedPolicyId, insuranceType, (dateFieldConfig && values[dateFieldConfig.key]) || "")
      : null;

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function selectPolicy(policy: PolicyRecord) {
    setSelectedPolicyId(policy.id);
    if (policyNumberField) setField(policyNumberField.key, policy.policyNumber);
  }

  function fieldsComplete() {
    if (!config) return false;
    return config.fields.every((f) => !f.required || (values[f.key] && values[f.key].trim() !== ""));
  }

  async function handleSubmit() {
    if (!config || !address) return;
    setLoading(true);
    setStatus("Uploading documents...");

    try {
      const policyNumberField = config.fields.find((f) => f.role === "policyNumber");
      const dateField = config.fields.find((f) => f.role === "date");
      const descriptionField = config.fields.find((f) => f.role === "description");
      const claimTypeField = config.fields.find((f) => f.role === "claimType");

      const details: Record<string, string> = { ...values };
      const claimTypeLabel = claimTypeField
        ? `${config.label} — ${values[claimTypeField.key]}`
        : config.label;

      const created = await apiFetch(
        "/api/claims",
        {
          method: "POST",
          body: JSON.stringify({
            insuranceType: config.id,
            claimType: claimTypeLabel,
            description: descriptionField ? values[descriptionField.key] : "",
            incidentDate: dateField ? values[dateField.key] : null,
            documentHash: combinedHash || null,
            details: {
              ...details,
              policyNumber: policyNumberField ? values[policyNumberField.key] : "",
            },
          }),
        },
        address
      );

      const claim = created.claim;

      if (files.length > 0) {
        const formData = new FormData();
        formData.append("claimId", claim.id);
        files.forEach((f) => formData.append("files", f.file));

        const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        await fetch(`${apiUrl}/api/documents/upload`, {
          method: "POST",
          headers: { "x-wallet-address": address },
          body: formData,
        });
      }

      setStatus("Confirm the transaction in MetaMask...");
      const receipt = await submitClaim(combinedHash || "0x" + "0".repeat(64), claimTypeLabel);
      const hash = receipt?.hash || receipt?.transactionHash || "";
      setTxHash(hash);

      await apiFetch(
        `/api/claims/${claim.id}/tx`,
        {
          method: "PATCH",
          body: JSON.stringify({ txHash: hash, blockchainClaimId: null }),
        },
        address
      );

      setStatus("Claim submitted successfully!");
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
        else router.push(`/dashboard/policyholder/claims/${claim.id}`);
      }, 1200);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Submission failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-8 text-xs font-medium">
        {["Type", "Details", "Documents", "Review"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                step === i + 1
                  ? "bg-blue-600 text-white"
                  : step > i + 1
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > i + 1 ? "✓" : i + 1}
            </span>
            <span className={step === i + 1 ? "text-gray-900" : "text-gray-400"}>{label}</span>
            {i < 3 && <span className="w-6 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Insurance Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INSURANCE_TYPES.map((t) => (
              <InsuranceTypeCard
                key={t.id}
                config={t}
                selected={insuranceType === t.id}
                onSelect={() => {
                  setInsuranceType(t.id);
                  setSelectedPolicyId("");
                }}
              />
            ))}
          </div>
          <button
            disabled={!insuranceType}
            onClick={() => setStep(2)}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && config && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {config.icon} {config.label} Claim Details
          </h2>
          {linksToPolicyModule && (
            <div className="mb-4">
              <label className="block text-sm mb-1 font-medium">
                Policy {policyNumberField?.required && <span className="text-red-500">*</span>}
              </label>
              {myPolicies.length === 0 ? (
                <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                  No active or grace-period {config.label.toLowerCase()} policy found for this wallet.{" "}
                  <Link href="/dashboard/policyholder/policies/plans" className="underline font-medium">
                    Buy a policy
                  </Link>{" "}
                  before filing this claim, or enter a policy number manually below.
                </p>
              ) : (
                <select
                  value={selectedPolicyId}
                  onChange={(e) => {
                    const policy = myPolicies.find((p) => p.id === e.target.value);
                    if (policy) selectPolicy(policy);
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select a policy...</option>
                  {myPolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.policyNumber} — {p.planName} ({p.status})
                    </option>
                  ))}
                </select>
              )}
              {eligibility && (
                <p
                  className={`text-sm mt-2 px-3 py-2 rounded-lg ${
                    eligibility.eligible ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {eligibility.eligible ? "✅ " : "❌ "}
                  {eligibility.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {config.fields.map((f) => (
              <div key={f.key} className={f.role === "policyNumber" && linksToPolicyModule && myPolicies.length > 0 ? "hidden" : ""}>
                <label className="block text-sm mb-1 font-medium">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    value={values[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="w-full border rounded px-3 py-2 h-24"
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                ) : f.type === "select" ? (
                  <select
                    value={values[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required={f.required}
                  >
                    <option value="">Select...</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={values[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg">
              Back
            </button>
            <button
              disabled={!fieldsComplete()}
              onClick={() => setStep(3)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && config && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Upload Documents</h2>
          <p className="text-sm text-gray-500 mb-4">{config.documentHint}</p>
          <DocumentUploader
            files={files}
            onChange={setFiles}
            combinedHash={combinedHash}
            onCombinedHashChange={setCombinedHash}
          />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg">
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && config && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Review &amp; Submit</h2>
          <div className="bg-white border rounded-xl p-5 space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Insurance Type</span>
              <span className="font-medium">
                {config.icon} {config.label}
              </span>
            </div>
            {config.fields.map((f) => (
              <div key={f.key} className="flex justify-between text-sm gap-4">
                <span className="text-gray-500">{f.label}</span>
                <span className="font-medium text-right break-words">{values[f.key] || "—"}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Documents</span>
              <span className="font-medium">{files.length} file(s)</span>
            </div>
            {combinedHash && (
              <div>
                <span className="text-gray-500 text-sm">Document Hash</span>
                <HashDisplay hash={combinedHash} full />
              </div>
            )}
          </div>

          <BlockchainNote />

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(3)} disabled={loading} className="px-4 py-2 border rounded-lg">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !address}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Claim"}
            </button>
          </div>

          {status && (
            <p className={`text-sm mt-4 ${status.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
              {status}
            </p>
          )}
          {txHash && <HashDisplay hash={txHash} label="Transaction" etherscanTx full />}
        </div>
      )}
    </div>
  );
}
