"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeftRegular, CalculatorRegular } from "@fluentui/react-icons";
import Field, { PhoneInput } from "@/components/quote/Field";
import Segmented from "@/components/quote/Segmented";
import Select from "@/components/ui/Select";
import InfoBar from "@/components/ui/InfoBar";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import { INSTALMENT_OPTIONS } from "@/constants/policyPlans";
import {
  ADD_ONS,
  NCD_OPTIONS,
  SERVICE_TAX,
  VEHICLE,
  fmtNric,
  isEastMalaysia,
  isEmail,
  isMyMobile,
  isNric,
  isPostcode,
  isRegNo,
  ncdLabel,
  promoRate,
  rm,
  vehicleQuote,
  type AddOn,
  type CoverType,
  type VehicleKind,
} from "@/constants/quotes";

const COPY: Record<VehicleKind, { noun: string; title: string; glyph: "car" | "motorcycle" }> = {
  car: { noun: "car", title: "Car insurance", glyph: "car" },
  motor: { noun: "motorcycle", title: "Motor insurance", glyph: "motorcycle" },
};

interface Form {
  reg: string;
  nric: string;
  cc: string;
  value: string;
  age: string;
  ncd: string;
  cover: CoverType;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  promo: string;
}

const EMPTY: Form = { reg: "", nric: "", cc: "", value: "", age: "", ncd: "0", cover: "comprehensive", name: "", email: "", phone: "", postcode: "", promo: "" };

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const inRange = (n: number, [lo, hi]: [number, number]) => Number.isFinite(n) && n >= lo && n <= hi;
const signed = (n: number) => (n < 0 ? `− ${rm(-n)}` : rm(n));

function validate(kind: VehicleKind, f: Form): Partial<Record<keyof Form, string>> {
  const v = VEHICLE[kind];
  const age = num(f.age);
  return {
    reg: isRegNo(f.reg) ? undefined : "Enter a valid registration number, e.g. WXY 1234.",
    nric: isNric(f.nric) ? undefined : "Enter your NRIC as 900101-14-5678.",
    cc: inRange(num(f.cc), v.cc) ? undefined : `Enter ${v.cc[0].toLocaleString()} to ${v.cc[1].toLocaleString()} cc.`,
    value: inRange(num(f.value), v.sumInsured) ? undefined : `Enter ${rm(v.sumInsured[0])} to ${rm(v.sumInsured[1])}.`,
    age: Number.isInteger(age) && age >= 0 && age <= 30 ? undefined : "Enter 0 to 30 years.",
    name: f.name.trim().length >= 2 ? undefined : "Enter the owner's name.",
    email: isEmail(f.email) ? undefined : "Enter a valid email address.",
    phone: isMyMobile(f.phone) ? undefined : "Enter a Malaysian mobile number, e.g. 12 345 6789.",
    postcode: isPostcode(f.postcode) ? undefined : "Enter a 5-digit postcode.",
    promo: !f.promo.trim() || promoRate(f.promo) !== undefined ? undefined : "Promo code not recognised.",
  };
}

/** Car and motorcycle quote: the form on the left, a live premium calculator on the right. */
export default function VehicleQuote({ kind }: { kind: VehicleKind }) {
  const copy = COPY[kind];
  const [f, setF] = useState<Form>(EMPTY);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof Form, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setDone(false);
  };
  const errors = validate(kind, f);
  // Calculator fields show their error as soon as they hold something; the rest wait for the first submit.
  const err = (k: keyof Form) => (attempted || f[k] ? errors[k] : undefined);

  const east = isEastMalaysia(f.postcode);
  const quote =
    !errors.cc && !errors.value && !errors.age && !errors.promo
      ? vehicleQuote({
          kind,
          cc: Number(f.cc),
          sumInsured: Number(f.value),
          age: Number(f.age),
          ncd: Number(f.ncd),
          cover: f.cover,
          east,
          addOns,
          promo: promoRate(f.promo) ?? 0,
        })
      : null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    if (Object.values(errors).some(Boolean)) {
      const form = e.currentTarget;
      setTimeout(() => form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0);
      return;
    }
    setDone(true);
  }

  const rows: [string, number][] = [];
  if (quote) {
    rows.push(["Basic premium", quote.basic]);
    if (quote.loading) rows.push(["Older-vehicle loading", quote.loading]);
    if (quote.tpftAdj) rows.push(["Third-party, fire & theft (75%)", quote.tpftAdj]);
    if (quote.ncd) rows.push([`No-claims discount ${ncdLabel(Number(f.ncd))}`, quote.ncd]);
    quote.addOns.forEach((a) => rows.push([ADD_ONS[a.id].label, a.amount]));
    if (quote.promo) rows.push([`Promo ${f.promo.trim().toUpperCase()}`, quote.promo]);
    rows.push([`Service tax (${SERVICE_TAX * 100}%)`, quote.tax], ["Stamp duty", quote.stamp]);
  }

  const availableAddOns = (Object.keys(ADD_ONS) as AddOn[]).filter((a) => ADD_ONS[a].kinds.includes(kind));

  return (
    <div>
      <Link href="/" className="btn btn-sm btn-subtle -ml-2">
        <ArrowLeftRegular />
        Back
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <CategoryGlyph type={copy.glyph} variant="solid" size={52} />
        <div>
          <h1 className="t-title-large text-fg">Get a free {copy.noun} insurance quote</h1>
          <p className="mt-1 t-body text-fg-2">Tell us about your {copy.noun} and see what you would pay, before you buy.</p>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="about-vehicle">
            <h2 id="about-vehicle" className="t-subtitle text-fg">
              About your {copy.noun}
            </h2>
            <Field label="Vehicle registration number" error={err("reg")}>
              <input className="textbox" placeholder="WXY 1234" autoComplete="off" value={f.reg} onChange={(e) => set("reg", e.target.value.toUpperCase())} />
            </Field>
            <Field label="Vehicle owner's NRIC" error={err("nric")}>
              <input className="textbox" inputMode="numeric" placeholder="XXXXXX-XX-XXXX" autoComplete="off" value={f.nric} onChange={(e) => set("nric", fmtNric(e.target.value))} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Engine capacity (cc)" error={err("cc")}>
                <input className="textbox" type="number" inputMode="numeric" placeholder={kind === "car" ? "1498" : "125"} value={f.cc} onChange={(e) => set("cc", e.target.value)} />
              </Field>
              <Field label="Vehicle age (years)" error={err("age")}>
                <input className="textbox" type="number" inputMode="numeric" placeholder="3" value={f.age} onChange={(e) => set("age", e.target.value)} />
              </Field>
            </div>
            <Field label="Market value to insure (RM)" hint="The sum insured. Use its current market value." error={err("value")}>
              <input className="textbox" type="number" inputMode="numeric" placeholder={kind === "car" ? "50000" : "6000"} value={f.value} onChange={(e) => set("value", e.target.value)} />
            </Field>
            <div>
              <span className="field-label">Type of cover</span>
              <Segmented
                label="Type of cover"
                value={f.cover}
                onChange={(v) => set("cover", v)}
                options={[
                  { value: "comprehensive", label: "Comprehensive" },
                  { value: "tpft", label: "Third-party, fire & theft" },
                ]}
              />
            </div>
            <Field label="No-claims discount (NCD)">
              <Select value={f.ncd} onChange={(e) => set("ncd", e.target.value)}>
                {NCD_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {ncdLabel(n)}
                  </option>
                ))}
              </Select>
            </Field>
            {f.cover === "comprehensive" && (
              <fieldset className="space-y-3">
                <legend className="field-label">Optional add-ons</legend>
                {availableAddOns.map((a) => (
                  <label key={a} className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox mt-0.5"
                      checked={addOns.includes(a)}
                      onChange={(e) => setAddOns((p) => (e.target.checked ? [...p, a] : p.filter((x) => x !== a)))}
                    />
                    <span className="t-body text-fg">
                      {ADD_ONS[a].label}
                      {inRange(num(f.value), VEHICLE[kind].sumInsured) && <span className="ml-2 text-fg-3">+ {rm(ADD_ONS[a].amount(Number(f.value)))}</span>}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
          </section>

          <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="send-quote">
            <h2 id="send-quote" className="t-subtitle text-fg">
              We will send you a quote.
            </h2>
            <Field label="Owner's name" error={err("name")}>
              <input className="textbox" autoComplete="name" placeholder="Mohammad Ali bin Ahmad" value={f.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Email" error={err("email")}>
              <input className="textbox" type="email" autoComplete="email" placeholder="ali@example.com" value={f.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="WhatsApp number" error={err("phone")}>
              <PhoneInput value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field
              label="Postcode for cover note"
              hint={east ? "East Malaysia rate applied." : "Sabah, Sarawak and Labuan postcodes get the East Malaysia rate."}
              error={err("postcode")}
            >
              <input className="textbox" inputMode="numeric" maxLength={5} placeholder="50050" autoComplete="postal-code" value={f.postcode} onChange={(e) => set("postcode", e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Promo code (optional)" hint="Try CHAINS10 for 10% off in this demo." error={err("promo")}>
              <input className="textbox" autoComplete="off" placeholder="XXX" value={f.promo} onChange={(e) => set("promo", e.target.value)} />
            </Field>

            <p className="t-caption text-fg-3">By getting a quote you agree that ChainIns may use these details to prepare it. This demo keeps everything in your browser.</p>
            <button type="submit" className="btn btn-accent btn-xl btn-block !rounded-full">
              Get Quote
            </button>

            {done && quote && (
              <InfoBar
                severity="success"
                title={`Your quote is ready, ${f.name.trim().split(" ")[0]}.`}
                action={
                  <Link href="/register" className="btn btn-accent">
                    Create an account to buy
                  </Link>
                }
              >
                {rm(quote.total)} a year. This demo does not send WhatsApp messages or save your details.
              </InfoBar>
            )}
          </section>
        </form>

        <aside aria-live="polite" className="card p-5 sm:p-6 lg:sticky lg:top-6">
          <h2 className="flex items-center gap-2 t-subtitle text-fg">
            <CalculatorRegular fontSize={22} className="text-accent-text" aria-hidden />
            Your estimate
          </h2>
          {!quote ? (
            <p className="mt-3 t-body text-fg-2">Enter your engine capacity, vehicle age and market value to see what you would pay.</p>
          ) : (
            <>
              <p className="mt-4 font-display text-[40px] font-semibold leading-none tracking-tight text-fg tabular-nums">{rm(quote.total)}</p>
              <p className="mt-1 t-caption text-fg-3">per year, including tax and stamp duty</p>

              <dl className="mt-5 space-y-2 border-t border-[var(--divider-stroke)] pt-4 t-body">
                {rows.map(([label, amount]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-fg-2">{label}</dt>
                    <dd className={`shrink-0 tabular-nums ${amount < 0 ? "text-[var(--success)]" : "text-fg"}`}>{signed(amount)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-[var(--divider-stroke)] pt-3 font-semibold text-fg">
                  <dt>Total to pay</dt>
                  <dd className="tabular-nums">{rm(quote.total)}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-[var(--radius-control)] bg-[var(--subtle-fill-tertiary)] p-3">
                <p className="t-body-strong text-fg">Prefer to pay in parts?</p>
                <ul className="mt-1 space-y-0.5 t-body text-fg-2">
                  {INSTALMENT_OPTIONS.map((n) => (
                    <li key={n} className="flex justify-between tabular-nums">
                      <span>{n} instalments</span>
                      <span>{rm(quote.total / n)} each</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 t-caption text-fg-3">Estimate only. The final premium is confirmed after the insurer verifies your details.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
