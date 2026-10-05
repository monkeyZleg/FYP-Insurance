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
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import InfoBar from "@/components/ui/InfoBar";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import {
  ArrowLeftRegular,
  ArrowRightRegular,
  CheckmarkRegular,
  DocumentMultipleRegular,
  SendRegular,
} from "@fluentui/react-icons";

const STEPS = ["Type", "Details", "Documents", "Review"];

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

  const filledCount = config ? config.fields.filter((f) => values[f.key] && values[f.key].trim() !== "").length : 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {/* step indicator */}
        <ol className="enter mb-6 grid grid-cols-4 gap-2" aria-label="Steps">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const current = step === n;
            return (
              <li key={label} aria-current={current ? "step" : undefined}>
                <div className="h-1 overflow-hidden rounded-full bg-[var(--control-stroke-secondary)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.1,0.9,0.2,1)]"
                    style={{ width: done || current ? "100%" : "0%", background: done ? "var(--success)" : "var(--accent-fill)" }}
                  />
                </div>
                <p className={`mt-2 flex items-center gap-1.5 t-caption ${current ? "text-fg font-semibold" : done ? "text-fg-2" : "text-fg-3"}`}>
                  {done ? <CheckmarkRegular fontSize={12} className="text-[var(--success)]" aria-hidden /> : <span className="tabular-nums">{n}.</span>}
                  {label}
                </p>
              </li>
            );
          })}
        </ol>

        <div key={step} className="card enter p-5 sm:p-7">
          {step === 1 && (
            <div>
              <h2 className="t-subtitle text-fg">What kind of claim is this?</h2>
              <p className="mt-1 mb-5 t-body text-fg-2">Choose the cover your claim falls under.</p>
              <div role="radiogroup" aria-label="Insurance type" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div className="mt-7 flex justify-end border-t border-[var(--divider-stroke)] pt-5">
                <button disabled={!insuranceType} onClick={() => setStep(2)} className="btn btn-accent nudge">
                  Continue <ArrowRightRegular />
                </button>
              </div>
            </div>
          )}

          {step === 2 && config && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <CategoryGlyph type={config.id} variant="solid" size={40} />
                <div>
                  <h2 className="t-subtitle text-fg">{config.label} claim details</h2>
                  <p className="t-body text-fg-2">Fields marked * are required.</p>
                </div>
              </div>
              {linksToPolicyModule && (
                <div className="mb-5">
                  <label className="field-label" htmlFor="policy-select">
                    Policy {policyNumberField?.required && <span className="text-[var(--critical)]">*</span>}
                  </label>
                  {myEligiblePolicies.length === 0 ? (
                    <InfoBar
                      severity="warning"
                      title="No eligible policy."
                      action={
                        <Link href="/dashboard/policyholder/policies/plans" className="btn btn-sm">
                          Buy a policy
                        </Link>
                      }
                    >
                      No active or grace-period {config.label.toLowerCase()} policy found for your account. Buy a policy before filing
                      this claim.
                    </InfoBar>
                  ) : (
                    <Select
                      id="policy-select"
                      value={selectedPolicyId}
                      onChange={(e) => {
                        const policy = myEligiblePolicies.find((p) => p.id === e.target.value);
                        if (policy) selectPolicy(policy);
                      }}
                    >
                      <option value="">Select a policy…</option>
                      {myEligiblePolicies.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.policy_number} — {p.plan_name} ({p.status})
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                {config.fields.map((f) => (
                  <div
                    key={f.key}
                    className={`${f.role === "policyNumber" && linksToPolicyModule ? "hidden" : ""} ${f.type === "textarea" ? "sm:col-span-2" : ""}`}
                  >
                    <label className="field-label" htmlFor={`f-${f.key}`}>
                      {f.label} {f.required && <span className="text-[var(--critical)]">*</span>}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea
                        id={`f-${f.key}`}
                        value={values[f.key] || ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className="textbox"
                        placeholder={f.placeholder}
                        required={f.required}
                      />
                    ) : f.type === "select" ? (
                      <Select id={`f-${f.key}`} value={values[f.key] || ""} onChange={(e) => setField(f.key, e.target.value)} required={f.required}>
                        <option value="">Select…</option>
                        {f.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <input
                        id={`f-${f.key}`}
                        type={f.type}
                        value={values[f.key] || ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className={`textbox ${f.type === "number" ? "tabular-nums" : ""}`}
                        placeholder={f.placeholder}
                        required={f.required}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-7 flex justify-between gap-3 border-t border-[var(--divider-stroke)] pt-5">
                <button onClick={() => setStep(1)} className="btn">
                  <ArrowLeftRegular /> Back
                </button>
                <button disabled={!fieldsComplete()} onClick={() => setStep(3)} className="btn btn-accent nudge">
                  Continue <ArrowRightRegular />
                </button>
              </div>
            </div>
          )}

          {step === 3 && config && (
            <div>
              <h2 className="t-subtitle text-fg">Upload documents</h2>
              <p className="mt-1 mb-5 t-body text-fg-2">
                Suggested: <span className="text-fg">{config.documentHint}</span>
              </p>
              <DocumentUploader files={files} onChange={setFiles} combinedHash={combinedHash} onCombinedHashChange={setCombinedHash} />
              <div className="mt-7 flex justify-between gap-3 border-t border-[var(--divider-stroke)] pt-5">
                <button onClick={() => setStep(2)} className="btn">
                  <ArrowLeftRegular /> Back
                </button>
                <button onClick={() => setStep(4)} className="btn btn-accent nudge">
                  Continue <ArrowRightRegular />
                </button>
              </div>
            </div>
          )}

          {step === 4 && config && (
            <div>
              <h2 className="t-subtitle text-fg">Review &amp; submit</h2>
              <p className="mt-1 mb-5 t-body text-fg-2">Check everything once more — submitted details are fingerprinted and can&apos;t be edited.</p>
              <dl className="divide-y divide-[var(--divider-stroke)] rounded-[var(--radius-overlay)] border border-[var(--card-stroke)] bg-[var(--card-fill-secondary)]">
                <ReviewRow label="Insurance type">
                  <span className="inline-flex items-center gap-2">
                    <CategoryGlyph type={config.id} size={20} /> {config.label}
                  </span>
                </ReviewRow>
                {config.fields.map((f) => (
                  <ReviewRow key={f.key} label={f.label}>
                    {values[f.key] || <span className="text-fg-3">—</span>}
                  </ReviewRow>
                ))}
                <ReviewRow label="Documents">
                  {files.length} file{files.length === 1 ? "" : "s"}
                </ReviewRow>
                {combinedHash && (
                  <div className="px-4 py-3">
                    <dt className="t-caption text-fg-2 mb-1.5">Combined document hash</dt>
                    <dd>
                      <HashDisplay hash={combinedHash} full />
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-5">
                <BlockchainNote text="Your claim will be recorded off-chain and, for policy-linked claim types, verified for eligibility and recorded on the blockchain by the platform's relayer wallet on your behalf." />
              </div>

              {status && !status.startsWith("Error") && (
                <InfoBar severity="success" className="mt-4" title="Submitted.">
                  {status}
                </InfoBar>
              )}
              {rejectReason && (
                <InfoBar severity="error" className="mt-4" title="Not eligible.">
                  This claim was not eligible: {rejectReason.message}
                </InfoBar>
              )}
              {txHash && (
                <div className="mt-3">
                  <HashDisplay hash={txHash} label="Transaction" etherscanTx full />
                </div>
              )}

              <div className="mt-7 flex justify-between gap-3 border-t border-[var(--divider-stroke)] pt-5">
                <button onClick={() => setStep(3)} disabled={loading} className="btn">
                  <ArrowLeftRegular /> Back
                </button>
                <button onClick={handleSubmit} disabled={loading || !token} className="btn btn-accent btn-lg">
                  {loading ? <Spinner /> : <SendRegular />}
                  {loading ? "Submitting…" : "Submit claim"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* live summary */}
      <aside className="enter enter-3 hidden lg:block lg:sticky lg:top-20">
        <div className="card p-5">
          <p className="t-caption font-semibold text-fg-2">Your claim so far</p>
          {config ? (
            <div className="mt-4 flex items-center gap-3">
              <CategoryGlyph type={config.id} variant="solid" size={36} />
              <div>
                <p className="t-body-strong text-fg">{config.label}</p>
                <p className="t-caption text-fg-2">{config.labelZh}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 t-body text-fg-3">No cover type chosen yet.</p>
          )}
          <dl className="mt-5 space-y-3 t-body">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-2">Details</dt>
              <dd className="text-fg tabular-nums">{config ? `${filledCount} / ${config.fields.length}` : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-2">Documents</dt>
              <dd className="flex items-center gap-1.5 text-fg tabular-nums">
                <DocumentMultipleRegular fontSize={14} className="text-fg-3" aria-hidden />
                {files.length}
              </dd>
            </div>
          </dl>
          {combinedHash && (
            <div className="mt-5 border-t border-[var(--divider-stroke)] pt-4">
              <p className="t-caption text-fg-2">Fingerprint</p>
              <p className="mt-1 break-all font-mono text-[11.5px] leading-4 text-fg">{combinedHash}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-3 t-body">
      <dt className="text-fg-2">{label}</dt>
      <dd className="text-fg text-right break-words max-w-[60%]">{children}</dd>
    </div>
  );
}
