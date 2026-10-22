"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AirplaneTakeOffRegular, ArrowLeftRegular, BuildingMosqueRegular, GlobeRegular, MapRegular } from "@fluentui/react-icons";
import Field, { PhoneInput } from "@/components/quote/Field";
import Segmented from "@/components/quote/Segmented";
import Select from "@/components/ui/Select";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import {
  MAX_TRAVEL_AGE,
  MAX_TRIP_DAYS,
  SERVICE_TAX,
  TRAVELERS,
  TRAVEL_PLANS,
  ageOn,
  isMyMobile,
  rm,
  travelQuote,
  tripDays,
  type TravelPlan,
  type Traveler,
} from "@/constants/quotes";

const ICONS = { umrah: BuildingMosqueRegular, annual: MapRegular, round: GlobeRegular, oneway: AirplaneTakeOffRegular };
const PICKER_ORDER: TravelPlan[] = ["umrah", "annual", "round", "oneway"];
const TABS: { value: TravelPlan; label: string }[] = [
  { value: "umrah", label: "Umrah" },
  { value: "round", label: "Round Trip" },
  { value: "oneway", label: "One Way" },
  { value: "annual", label: "Annual" },
];

interface Form {
  dep: string;
  ret: string;
  phone: string;
  traveler: Traveler;
  dob: string;
}

const EMPTY: Form = { dep: "", ret: "", phone: "", traveler: "individual", dob: "" };

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the user's time zone

function validate(plan: TravelPlan, f: Form): Partial<Record<keyof Form, string>> {
  const needsReturn = plan === "umrah" || plan === "round";
  const max = MAX_TRIP_DAYS[plan];
  const dobOk = f.dob >= "1900-01-01" && f.dob <= today();
  return {
    dep: !f.dep ? "Choose your departure date." : f.dep < today() ? "Departure can't be in the past." : undefined,
    ret: !needsReturn
      ? undefined
      : !f.ret
        ? "Choose your return date."
        : f.dep && f.ret < f.dep
          ? "Return must be on or after departure."
          : f.dep && max && tripDays(f.dep, f.ret) > max
            ? `This plan covers trips up to ${max} days.`
            : undefined,
    phone: isMyMobile(f.phone) ? undefined : "Enter a Malaysian mobile number, e.g. 12 345 6789.",
    dob: !f.dob || !dobOk ? "Enter a valid date of birth." : ageOn(f.dob, f.dep || today()) > MAX_TRAVEL_AGE ? `We can't quote travellers over ${MAX_TRAVEL_AGE}.` : undefined,
  };
}

/** Travel quote: pick a plan, then a short form. Umrah, round-trip, one-way and annual cover. */
export default function TravelQuote() {
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  if (!plan) return <PlanPicker onPick={setPlan} />;

  const needsReturn = plan === "umrah" || plan === "round";
  const set = (k: keyof Form, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setDone(false);
  };
  const errors = validate(plan, f);
  const err = (k: keyof Form) => (attempted ? errors[k] : undefined);
  const invalid = Object.values(errors).some(Boolean);

  const days = needsReturn && !invalid ? tripDays(f.dep, f.ret) : 0;
  const quote = done && !invalid ? travelQuote({ plan, days, traveler: f.traveler, age: ageOn(f.dob, f.dep) }) : null;
  const scope =
    plan === "annual" ? "Unlimited trips for 12 months from departure" : plan === "oneway" ? "One-way travel, covered up to 365 days from departure" : `${days}-day ${plan === "umrah" ? "Umrah " : ""}trip`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    const form = e.currentTarget;
    if (invalid) {
      setTimeout(() => form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0);
      return;
    }
    setDone(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 0);
  }

  return (
    <div>
      <button type="button" onClick={() => setPlan(null)} className="btn btn-sm btn-subtle -ml-2">
        <ArrowLeftRegular />
        Back
      </button>

      <div className="mx-auto mt-4 max-w-[460px]">
        <div className="flex items-center justify-center gap-3">
          <CategoryGlyph type="travel" variant="solid" size={44} />
          <h1 className="t-title text-fg">General Travel</h1>
        </div>

        <form onSubmit={onSubmit} noValidate className="card mt-6 space-y-5 p-5 sm:p-6">
          <Segmented
            label="Travel plan"
            value={plan}
            onChange={(p) => {
              setPlan(p);
              setDone(false);
            }}
            options={TABS}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Departure date" error={err("dep")}>
              <input className="textbox" type="date" value={f.dep} onChange={(e) => set("dep", e.target.value)} />
            </Field>
            <Field label="Return date" error={err("ret")}>
              <input className="textbox" type="date" disabled={!needsReturn} value={needsReturn ? f.ret : ""} onChange={(e) => set("ret", e.target.value)} />
            </Field>
          </div>

          <Field label="Mobile number" error={err("phone")}>
            <PhoneInput value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>

          <Field label="Traveller type">
            <Select value={f.traveler} onChange={(e) => set("traveler", e.target.value)}>
              {(Object.keys(TRAVELERS) as Traveler[]).map((t) => (
                <option key={t} value={t}>
                  {TRAVELERS[t].label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Traveller 1 date of birth" error={err("dob")}>
            <input className="textbox" type="date" value={f.dob} onChange={(e) => set("dob", e.target.value)} />
          </Field>

          <button type="submit" className="btn btn-accent btn-xl btn-block !rounded-full">
            Get Quote Now
          </button>
        </form>

        <div ref={resultRef} aria-live="polite">
          {quote && (
            <section className="card enter mt-6 p-5 sm:p-6" aria-label="Your travel quote">
              <h2 className="t-subtitle text-fg">Your estimate</h2>
              <p className="mt-3 font-display text-[40px] font-semibold leading-none tracking-tight text-fg tabular-nums">{rm(quote.total)}</p>
              <p className="mt-1 t-caption text-fg-3">{scope}</p>
              <dl className="mt-5 space-y-2 border-t border-[var(--divider-stroke)] pt-4 t-body">
                {[
                  ["Premium", quote.premium],
                  [`Service tax (${SERVICE_TAX * 100}%)`, quote.tax],
                  ["Stamp duty", quote.stamp],
                ].map(([label, amount]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-fg-2">{label}</dt>
                    <dd className="tabular-nums text-fg">{rm(amount as number)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 t-caption text-fg-3">
                Estimate only. This demo does not send messages or save your details, and the final premium is confirmed by the insurer.
              </p>
              <Link href="/register" className="btn btn-accent btn-lg mt-4 !rounded-full">
                Create an account to buy
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanPicker({ onPick }: { onPick: (p: TravelPlan) => void }) {
  return (
    <div>
      <Link href="/" className="btn btn-sm btn-subtle -ml-2">
        <ArrowLeftRegular />
        Back
      </Link>
      <div className="mt-6 text-center">
        <h1 className="t-title-large text-fg">Choose Your Plan</h1>
        <p className="mt-2 t-body text-fg-2">We offer Umrah and travel plans for different preferences.</p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PICKER_ORDER.map((id) => {
          const Icon = ICONS[id];
          return (
            <li key={id} className="card relative flex min-h-[220px] flex-col overflow-hidden p-5">
              <Icon aria-hidden fontSize={104} className="pointer-events-none absolute -bottom-5 -right-4 text-accent-text opacity-[0.12]" />
              <h2 className="t-subtitle text-fg">{TRAVEL_PLANS[id].label}</h2>
              <p className="mt-2 t-body text-fg-2">{TRAVEL_PLANS[id].blurb}</p>
              <button type="button" onClick={() => onPick(id)} className="btn btn-accent btn-lg relative mt-auto w-fit !rounded-full">
                I want this
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-10 text-center t-caption text-fg-3">Not sure which plan is right for you? Round-trip fits most holidays; choose Annual if you travel several times a year.</p>
    </div>
  );
}
