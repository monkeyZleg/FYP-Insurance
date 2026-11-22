"use client";
import { useEffect, useMemo, useState } from "react";
import Field from "@/components/quote/Field";
import InfoBar from "@/components/ui/InfoBar";
import { DEFAULT_CHARGE, calculateClaim, describeCharge, validateCalc, type ClaimKind } from "@/constants/claimCalculator";
import { DECLARATIONS, DOCS, DOCS_COMMON, IDENTITY, INCIDENT_FLAGS, type CheckItem } from "@/constants/claimChecklist";
import { rm } from "@/constants/quotes";

export interface ClaimChecklistState {
  ready: boolean; // every required item is done and the numbers are valid: safe to enable Submit
  checked: string[];
  claimed: number;
  estimatedPayout: number; // net payout estimate, for display only
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const today = () => new Date().toLocaleDateString("en-CA");

function Group({ title, items, checked, toggle, note }: { title: string; items: CheckItem[]; checked: Set<string>; toggle: (id: string) => void; note?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="t-body-strong text-fg">{title}</legend>
      {note && <p className="t-caption text-fg-3">{note}</p>}
      {items.map((it) => (
        <label key={it.id} className="flex cursor-pointer items-start gap-3 py-1 t-body text-fg-2">
          <input type="checkbox" className="checkbox mt-0.5 shrink-0" checked={checked.has(it.id)} onChange={() => toggle(it.id)} />
          <span>
            {it.label}
            {it.required && <span className="ml-1.5 t-caption text-accent-text">Required</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Pre-submission checklist plus the live out-of-pocket calculator (spec parts A and B).
 * Drop it inside the claim form and disable Submit until onChange reports ready.
 * shortcut: charge settings are the fixed DEFAULT_CHARGE, wire them to the admin settings when that screen exists.
 */
export default function ClaimChecklist({
  kind,
  incidentDate,
  claimed = "",
  onChange,
}: {
  kind: ClaimKind;
  incidentDate: string; // already entered in the details step
  claimed?: string; // prefilled from the details step when it has an amount
  onChange?: (s: ClaimChecklistState) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [v, setV] = useState({ claimed, excluded: "0", deductible: "0", coinsurance: "0", limit: "" });
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  const toggle = (id: string) =>
    setChecked((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const input = {
    claimed: num(v.claimed),
    excluded: num(v.excluded),
    deductible: num(v.deductible),
    coinsurance: num(v.coinsurance),
    limit: v.limit.trim() === "" ? null : num(v.limit),
    charge: DEFAULT_CHARGE,
  };
  const errors = validateCalc(input);
  const numbersOk = !Object.values(errors).some(Boolean);

  const dateErr = !incidentDate ? "Enter the incident date in the details step." : incidentDate > today() ? "The incident date can't be in the future." : undefined;
  const result = useMemo(() => (numbersOk ? calculateClaim(input) : null), [numbersOk, v]); // eslint-disable-line react-hooks/exhaustive-deps

  const required = [...IDENTITY, ...DOCS_COMMON, ...DECLARATIONS].filter((i) => i.required);
  const missing = required.filter((i) => !checked.has(i.id)).length;
  const ready = missing === 0 && !dateErr && numbersOk;

  useEffect(() => {
    onChange?.({ ready, checked: [...checked], claimed: input.claimed, estimatedPayout: result?.net ?? 0 });
  }, [ready, checked, result]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="cl-identity">
        <h2 id="cl-identity" className="t-subtitle text-fg">Before you submit</h2>
        <Group title="Identity and eligibility" items={IDENTITY} checked={checked} toggle={toggle} />
        <Group title="Incident" items={INCIDENT_FLAGS} checked={checked} toggle={toggle} />
        <Group title="Documents" items={[...DOCS_COMMON, ...DOCS[kind]]} checked={checked} toggle={toggle} note="Tick what you will upload." />
      </section>

      <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="cl-calc">
        <h2 id="cl-calc" className="t-subtitle text-fg">What you may pay out of pocket</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total amount claimed (RM)" error={v.claimed ? errors.claimed : undefined}>
            <input className="textbox" inputMode="decimal" value={v.claimed} onChange={(e) => set("claimed", e.target.value)} />
          </Field>
          <Field label="Excluded items (RM)" hint="Items your policy does not cover." error={errors.excluded}>
            <input className="textbox" inputMode="decimal" value={v.excluded} onChange={(e) => set("excluded", e.target.value)} />
          </Field>
          <Field label="Deductible / excess (RM)" error={errors.deductible}>
            <input className="textbox" inputMode="decimal" value={v.deductible} onChange={(e) => set("deductible", e.target.value)} />
          </Field>
          <Field label="Co-insurance you pay (%)" error={errors.coinsurance}>
            <input className="textbox" inputMode="decimal" value={v.coinsurance} onChange={(e) => set("coinsurance", e.target.value)} />
          </Field>
          <Field label="Remaining coverage limit (RM)" hint="Leave blank if your policy has no limit." error={errors.limit}>
            <input className="textbox" inputMode="decimal" value={v.limit} onChange={(e) => set("limit", e.target.value)} />
          </Field>
        </div>
        {kind === "motor" && <p className="t-caption text-fg-3">No-claim discount (NCD) may change at renewal after a claim. This is information only and is not in the figures below.</p>}

        {dateErr && <InfoBar severity="warning">{dateErr}</InfoBar>}

        {result && (
          <div aria-live="polite" className="rounded-[var(--radius-control)] border border-[var(--divider-stroke)] p-4">
            <p className="t-caption text-fg-3">Estimate only. The claim verifier makes the final decision.</p>
            <dl className="mt-3 space-y-2 t-body">
              {(
                [
                  ["Excluded items", result.excluded],
                  ["Deductible", result.deductible],
                  ["Your co-insurance share", result.coinsurance],
                  ["Amount above your limit", result.aboveLimit],
                  ["Insurer gross payout", result.payout],
                  ["Service charge", result.serviceCharge],
                  ["Net payout to you", result.net],
                ] as [string, number][]
              ).map(([l, a]) => (
                <div key={l} className="flex justify-between gap-4">
                  <dt className="text-fg-2">{l}</dt>
                  <dd className="tabular-nums text-fg">{rm(a)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex justify-between gap-4 border-t border-[var(--divider-stroke)] pt-3 t-subtitle text-fg">
              <span>Total you pay</span>
              <span className="tabular-nums">{rm(result.totalUserPays)}</span>
            </p>
            <p className="mt-2 t-caption text-fg-3">{describeCharge(DEFAULT_CHARGE)}</p>
          </div>
        )}
      </section>

      <section className="card space-y-3 p-5 sm:p-6" aria-labelledby="cl-decl">
        <h2 id="cl-decl" className="sr-only">Declarations</h2>
        <Group title="Declarations and consent" items={DECLARATIONS} checked={checked} toggle={toggle} />
        <p className="t-caption text-fg-3" aria-live="polite">
          {ready ? "All required items are complete." : `${missing ? `${missing} required item${missing > 1 ? "s" : ""} left` : "Check the incident date and amounts above"} before you can submit.`}
        </p>
      </section>
    </div>
  );
}
