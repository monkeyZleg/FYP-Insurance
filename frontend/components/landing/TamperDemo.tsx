"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowCounterclockwiseRegular,
  CubeRegular,
  EditRegular,
  ShieldCheckmarkFilled,
  ShieldErrorFilled,
} from "@fluentui/react-icons";

const ORIGINAL = {
  claimant: "Leong Seng Khuan",
  amount: "8450.00",
  incidentDate: "2026-09-12",
  diagnosis: "Acute appendicitis, laparoscopic appendectomy",
};
type Record_ = typeof ORIGINAL;

const FIELDS: { key: keyof Record_; label: string; type?: string; mono?: boolean }[] = [
  { key: "claimant", label: "Claimant" },
  { key: "amount", label: "Amount claimed (RM)", mono: true },
  { key: "incidentDate", label: "Incident date", type: "date" },
  { key: "diagnosis", label: "Diagnosis" },
];

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return "0x" + Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const canonical = (r: Record_) => JSON.stringify(r, Object.keys(r).sort());

/**
 * Interactive proof of the core idea: edit any field of a "recorded" claim and
 * watch its SHA-256 fingerprint diverge from the one anchored on-chain.
 */
export default function TamperDemo() {
  const [record, setRecord] = useState<Record_>(ORIGINAL);
  const [anchored, setAnchored] = useState("");
  const [live, setLive] = useState("");

  useEffect(() => {
    sha256(canonical(ORIGINAL)).then(setAnchored);
  }, []);
  useEffect(() => {
    let cancelled = false;
    sha256(canonical(record)).then((h) => !cancelled && setLive(h));
    return () => {
      cancelled = true;
    };
  }, [record]);

  const ready = anchored && live;
  const match = !ready || anchored === live;
  const changed = useMemo(() => FIELDS.filter((f) => record[f.key] !== ORIGINAL[f.key]).map((f) => f.key), [record]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      {/* editable record */}
      <div className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <EditRegular fontSize={18} className="text-accent-text" aria-hidden />
            <p className="t-body-strong text-fg">Claim CLM-0042 — off-chain copy</p>
          </div>
          <button
            type="button"
            onClick={() => setRecord(ORIGINAL)}
            disabled={changed.length === 0}
            className="btn btn-sm btn-subtle"
          >
            <ArrowCounterclockwiseRegular /> Restore
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => {
            const dirty = changed.includes(f.key);
            return (
              <label key={f.key} className={f.key === "diagnosis" ? "sm:col-span-2" : ""}>
                <span className="field-label flex items-center justify-between">
                  {f.label}
                  {dirty && <span className="badge badge-caution !h-5 fade-in">edited</span>}
                </span>
                <input
                  type={f.type || "text"}
                  value={record[f.key]}
                  onChange={(e) => setRecord((r) => ({ ...r, [f.key]: e.target.value }))}
                  className={`textbox ${f.mono ? "textbox-mono" : ""}`}
                  aria-invalid={dirty || undefined}
                />
              </label>
            );
          })}
        </div>
        <p className="field-hint mt-4">Try it: change one character anywhere — even a space.</p>
      </div>

      {/* hash comparison */}
      <div className="card relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl transition-colors duration-500"
          style={{ background: match ? "color-mix(in srgb, var(--success) 22%, transparent)" : "color-mix(in srgb, var(--critical) 22%, transparent)" }}
        />
        <div className="relative space-y-5">
          <div>
            <p className="flex items-center gap-2 t-caption font-semibold text-fg-2">
              <CubeRegular fontSize={14} aria-hidden /> Anchored on-chain · block #1042
            </p>
            <code className="mt-1.5 block break-all font-mono text-[13px] leading-5 text-fg">{anchored || "…"}</code>
          </div>
          <div>
            <p className="t-caption font-semibold text-fg-2">SHA-256 of what you see now</p>
            <code className="mt-1.5 block break-all font-mono text-[13px] leading-5" aria-live="polite">
              {live
                ? Array.from(live).map((ch, i) => (
                    <span
                      key={i}
                      style={{
                        color: anchored[i] === ch ? "var(--text-primary)" : "var(--critical)",
                        fontWeight: anchored[i] === ch ? 400 : 700,
                      }}
                    >
                      {ch}
                    </span>
                  ))
                : "…"}
            </code>
          </div>

          <div
            className={`flex items-center gap-4 rounded-[var(--radius-overlay)] border border-[var(--card-stroke)] p-4 transition-colors duration-300 ${
              match ? "bg-[var(--success-bg)]" : "bg-[var(--critical-bg)]"
            }`}
            role="status"
          >
            <span key={String(match)} className="pop-in">
              {match ? (
                <ShieldCheckmarkFilled fontSize={36} className="text-[var(--success)]" aria-hidden />
              ) : (
                <ShieldErrorFilled fontSize={36} className="text-[var(--critical)]" aria-hidden />
              )}
            </span>
            <div>
              <p className="t-subtitle text-fg">{match ? "Match — untouched" : "Mismatch — tampering detected"}</p>
              <p className="t-body text-fg-2">
                {match
                  ? "The record is byte-for-byte what was anchored on-chain."
                  : `${changed.length || "A"} field${changed.length === 1 ? "" : "s"} changed after recording. An auditor would flag this claim.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
