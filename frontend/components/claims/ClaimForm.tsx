"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { apiFetchAuth } from "@/lib/api";
import { myPolicies } from "@/lib/policyApi";
import { INSURANCE_TYPES, type InsuranceConfig } from "@/constants/insurance";
import { CLAIM_TO_POLICY_TYPE } from "@/constants/policyPlans";
import type { InsuranceType, PolicyRow } from "@/types";
import InsuranceTypeCard from "@/components/insurance/InsuranceTypeCard";
import DocumentUploader, { type UploadedFile } from "@/components/documents/DocumentUploader";
import BlockchainNote from "@/components/blockchain/BlockchainNote";
import HashDisplay from "@/components/blockchain/HashDisplay";

type Step = 1 | 2 | 3 | 4;

export default function ClaimForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useRole();

  const preselected = searchParams.get("type") as InsuranceType | null;
  const [step, setStep] = useState<Step>(preselected ? 2 : 1);
  const [insuranceType, setInsuranceType] = useState<InsuranceType | null>(preselected);
  const [values, setValues] = useState<Record<string, string>>({});
  const [myEligiblePolicies, setMyEligiblePolicies] = useState<PolicyRow[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [combinedHash, setCombinedHash] = useState("");
  const [status, setStatus] = useState("");
  const [rejectReason, setRejectReason] = useState<{ reasonCode: string; message: string } | null>(null);
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  const config: InsuranceConfig | undefined = INSURANCE_TYPES.find((t) => t.id === insuranceType);
  const policyNumberField = config?.fields.find((f) => f.role === "policyNumber");
  const dateFieldConfig = config?.fields.find((f) => f.role === "date");
  const descriptionField = config?.fields.find((f) => f.role === "description");
  const claimTypeField = config?.fields.find((f) => f.role === "claimType");
  const linksToPolicyModule = insuranceType ? Boolean(CLAIM_TO_POLICY_TYPE[insuranceType]) : false;

  useEffect(() => {
    if (!token || !insuranceType || !linksToPolicyModule) return;
    const mappedType = CLAIM_TO_POLICY_TYPE[insuranceType];

    myPolicies(token)
      .then((list) =>
        setMyEligiblePolicies(
          list.filter((p) => p.policy_type === mappedType && (p.status === "Active" || p.status === "GracePeriod"))
        )
      )
      .catch(() => setMyEligiblePolicies([]));

  }, [token, insuranceType, linksToPolicyModule]);

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function selectPolicy(policy: PolicyRow) {
    setSelectedPolicyId(policy.id);
    if (policyNumberField) setField(policyNumberField.key, policy.policy_number);
  }

  function fieldsComplete() {
    if (!config) return false;
    if (linksToPolicyModule && myEligiblePolicies.length > 0 && !selectedPolicyId) return false;
    return config.fields.every((f) => !f.required || (values[f.key] && values[f.key].trim() !== ""));
  }

  async function handleSubmit() {
    if (!config || !token) return;
    setLoading(true);
    setStatus("Submitting claim...");
    setRejectReason(null);

    try {
      const details: Record<string, string> = { ...values };
      const claimTypeLabel = claimTypeField ? `${config.label} — ${values[claimTypeField.key]}` : config.label;

      const formData = new FormData();
      if (selectedPolicyId) formData.append("policyId", selectedPolicyId);
      formData.append("insuranceType", config.id);
      formData.append("claimType", claimTypeLabel);
      formData.append("description", descriptionField ? values[descriptionField.key] : "");
      formData.append("incidentDate", dateFieldConfig ? values[dateFieldConfig.key] : "");
      formData.append(
        "details",
        JSON.stringify({
          ...details,
          policyNumber: policyNumberField ? values[policyNumberField.key] : "",
        })
      );
      files.forEach((f) => formData.append("files", f.file));

      const created = await apiFetchAuth("/api/claims", { method: "POST", body: formData }, token);

      const claim = created.claim;
      setTxHash(created.txHash || "");
      setStatus("Claim submitted successfully!");
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
        else router.push(`/dashboard/policyholder/claims/${claim.id}`);
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed";
      setRejectReason({ reasonCode: message, message });
      setStatus(`Error: ${message}`);
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
                  ? "bg-chain-indigo text-white"
                  : step > i + 1
                    ? "bg-ledger-mint text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > i + 1 ? "✓" : i + 1}
            </span>
            <span className={step === i + 1 ? "text-ink" : "text-gray-400"}>{label}</span>
            {i < 3 && <span className="w-6 h-px bg-border mx-1" />}
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
            className="mt-6 bg-amber-spark text-ink px-6 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-[#E89D14] transition-colors"
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
                Policy {policyNumberField?.required && <span className="text-failure">*</span>}
              </label>
              {myEligiblePolicies.length === 0 ? (
                <p className="text-sm bg-[#FFF6E5] border border-[#FFB020]/40 text-[#B8760A] rounded-lg px-3 py-2">
                  No active or grace-period {config.label.toLowerCase()} policy found for your account.{" "}
                  <Link href="/dashboard/policyholder/policies/plans" className="underline font-medium">
                    Buy a policy
                  </Link>{" "}
                  before filing this claim.
                </p>
              ) : (
                <select
                  value={selectedPolicyId}
                  onChange={(e) => {
                    const policy = myEligiblePolicies.find((p) => p.id === e.target.value);
                    if (policy) selectPolicy(policy);
                  }}
                  className="w-full border border-border rounded-lg px-3 py-2"
                >
                  <option value="">Select a policy...</option>
                  {myEligiblePolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.policy_number} — {p.plan_name} ({p.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="space-y-4">
            {config.fields.map((f) => (
              <div key={f.key} className={f.role === "policyNumber" && linksToPolicyModule ? "hidden" : ""}>
                <label className="block text-sm mb-1 font-medium">
                  {f.label} {f.required && <span className="text-failure">*</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    value={values[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 h-24"
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                ) : f.type === "select" ? (
                  <select
                    value={values[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2"
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
                    className="w-full border border-border rounded-lg px-3 py-2"
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-border rounded-lg hover:bg-cloud transition-colors">
              Back
            </button>
            <button
              disabled={!fieldsComplete()}
              onClick={() => setStep(3)}
              className="bg-amber-spark text-ink px-6 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-[#E89D14] transition-colors"
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
            <button onClick={() => setStep(2)} className="px-4 py-2 border border-border rounded-lg hover:bg-cloud transition-colors">
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="bg-amber-spark text-ink px-6 py-2 rounded-lg font-medium hover:bg-[#E89D14] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && config && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Review &amp; Submit</h2>
          <div className="bg-white border border-border rounded-xl p-5 space-y-3 mb-4">
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

          <BlockchainNote text="Your claim will be recorded off-chain and, for policy-linked claim types, verified for eligibility and recorded on the blockchain by the platform's relayer wallet on your behalf." />

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(3)} disabled={loading} className="px-4 py-2 border border-border rounded-lg hover:bg-cloud transition-colors">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !token}
              className="flex-1 bg-amber-spark text-ink py-2 rounded-lg font-medium hover:bg-[#E89D14] disabled:opacity-50 transition-colors"
            >
              {loading ? "Submitting..." : "Submit Claim"}
            </button>
          </div>

          {status && (
            <p className={`text-sm mt-4 ${status.startsWith("Error") ? "text-failure" : "text-[#0F8F70]"}`}>
              {status}
            </p>
          )}
          {rejectReason && (
            <p className="text-sm mt-2 bg-[#FDECEC] border border-failure/30 text-failure rounded-lg px-3 py-2">
              This claim was not eligible: {rejectReason.message}
            </p>
          )}
          {txHash && <HashDisplay hash={txHash} label="Transaction" etherscanTx full />}
        </div>
      )}
    </div>
  );
}
