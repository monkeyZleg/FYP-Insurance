"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheckmarkRegular } from "@fluentui/react-icons";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import PageHeader from "@/components/ui/PageHeader";
import InfoBar from "@/components/ui/InfoBar";

type EkycStatus = "pending" | "verified" | "rejected";

interface EkycSubmission {
  id: string;
  full_name: string;
  ic_number_masked: string;
  date_of_birth: string;
  gender: "male" | "female";
  status: EkycStatus;
  reject_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

type FileKey = "icFront" | "icBack" | "selfie";

const FILE_FIELDS: { key: FileKey; label: string; hint: string; required: boolean; capture?: "user" | "environment" }[] = [
  { key: "icFront", label: "MyKad — front", hint: "All four corners visible, no glare.", required: true, capture: "environment" },
  { key: "icBack", label: "MyKad — back (optional)", hint: "Helps the reviewer confirm the card.", required: false, capture: "environment" },
  { key: "selfie", label: "Selfie", hint: "Face the camera in good light, no hat or sunglasses.", required: true, capture: "user" },
];

/** Formats digits as YYMMDD-PB-####. */
function formatIc(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 12);
  return [d.slice(0, 6), d.slice(6, 8), d.slice(8)].filter(Boolean).join("-");
}

export default function EkycPage() {
  const { token, userName } = useRole();
  const [submission, setSubmission] = useState<EkycSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  // null until the user edits it: prefill from the account name.
  const [nameInput, setFullName] = useState<string | null>(null);
  const fullName = nameInput ?? userName ?? "";
  const [icNumber, setIcNumber] = useState("");
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<FileKey, string>>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetchAuth("/api/ekyc/me", {}, token)
      .then((d) => setSubmission(d.submission))
      .catch(() => setSubmission(null))
      .finally(() => setLoading(false));
  }, [token]);

  // Free the preview URLs when they change or the page closes.
  useEffect(() => () => Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  function pickFile(key: FileKey, file?: File) {
    setFiles((f) => ({ ...f, [key]: file }));
    setPreviews((p) => ({ ...p, [key]: file ? URL.createObjectURL(file) : undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const missing = FILE_FIELDS.filter((f) => f.required && !files[f.key]).map((f) => `${f.label} is required`);
    if (icNumber.replace(/\D/g, "").length !== 12) missing.unshift("IC number must be 12 digits");
    if (missing.length) return setErrors(missing);

    const body = new FormData();
    body.append("fullName", fullName);
    body.append("icNumber", icNumber);
    (Object.keys(files) as FileKey[]).forEach((k) => files[k] && body.append(k, files[k]!));

    setSubmitting(true);
    setErrors([]);
    try {
      await apiFetchAuth("/api/ekyc", { method: "POST", body }, token || undefined);
      const d = await apiFetchAuth("/api/ekyc/me", {}, token || undefined);
      setSubmission(d.submission);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Submission failed"]);
    } finally {
      setSubmitting(false);
    }
  }

  const showForm = !loading && (!submission || submission.status === "rejected");

  return (
    <div className="max-w-[720px]">
      <PageHeader
        title="Identity verification (eKYC)"
        description="Verify your identity with your MyKad and a selfie before buying a policy or making a claim. Your IC number is stored masked and never written to the blockchain."
      />

      {loading && <div className="skeleton h-32" aria-busy />}

      {submission && (
        <div className="card enter enter-2 mb-6 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheckmarkRegular fontSize={24} aria-hidden />
            <div>
              <p className="t-body-strong text-fg">{submission.full_name}</p>
              <p className="t-caption text-fg-2 tabular-nums">
                IC {submission.ic_number_masked} · born {submission.date_of_birth} · submitted{" "}
                {new Date(submission.submitted_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            {submission.status === "verified" && (
              <InfoBar severity="success" title="Verified">
                Your identity is verified. You can buy policies and submit claims.
              </InfoBar>
            )}
            {submission.status === "pending" && (
              <InfoBar severity="info" title="Under review">
                Automatic checks passed. An admin is comparing your selfie with your IC photo.
              </InfoBar>
            )}
            {submission.status === "rejected" && (
              <InfoBar severity="error" title="Rejected">
                {submission.reject_reason || "Your submission was rejected."} Please submit again below.
              </InfoBar>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="card enter enter-2 space-y-5 p-5">
          {errors.length > 0 && (
            <InfoBar severity="error" title="Please fix the following">
              <ul className="list-disc pl-5">
                {errors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </InfoBar>
          )}

          <div>
            <label htmlFor="fullName" className="field-label">
              Full name (as on MyKad)
            </label>
            <input id="fullName" className="textbox" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>

          <div>
            <label htmlFor="icNumber" className="field-label">
              MyKad number
            </label>
            <input
              id="icNumber"
              className="textbox tabular-nums"
              inputMode="numeric"
              placeholder="990101-14-5678"
              value={icNumber}
              onChange={(e) => setIcNumber(formatIc(e.target.value))}
              autoComplete="off"
            />
            <p className="field-hint">Your date of birth is read from the first six digits. You must be 18 or older.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {FILE_FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={f.key} className="field-label">
                  {f.label}
                </label>
                <label
                  htmlFor={f.key}
                  className="card-interactive grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-[var(--radius-control)] border border-dashed"
                >
                  {previews[f.key] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[f.key]} alt={`${f.label} preview`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="t-caption text-fg-2">Tap to upload</span>
                  )}
                </label>
                <input
                  id={f.key}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture={f.capture}
                  className="sr-only"
                  onChange={(e) => pickFile(f.key, e.target.files?.[0])}
                />
                <p className="field-hint">{f.hint}</p>
              </div>
            ))}
          </div>

          <button type="submit" disabled={submitting} className="btn btn-accent btn-lg btn-block">
            {submitting ? "Submitting…" : "Submit for verification"}
          </button>
        </form>
      )}
    </div>
  );
}
