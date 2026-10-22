"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftRegular, CheckmarkRegular, ChevronRightRegular, DeleteRegular, PersonRegular } from "@fluentui/react-icons";
import Segmented from "@/components/quote/Segmented";
import Select from "@/components/ui/Select";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import {
  ANNUAL_DISCOUNT,
  CRITICAL_COUNT,
  HEALTH,
  HEALTH_MAX_AGE,
  HEALTH_MIN_AGE,
  benefits,
  eligible,
  fromMonthly,
  monthlyPremium,
  perDay,
  periodPrice,
  rm,
  type Gender,
  type HealthProduct,
  type Period,
  type Tier,
} from "@/constants/quotes";

const ORDER: HealthProduct[] = ["life", "medical", "critical"];
const GLYPH = { life: "life", medical: "medical", critical: "health" } as const;
const AGES = Array.from({ length: HEALTH_MAX_AGE - HEALTH_MIN_AGE + 1 }, (_, i) => HEALTH_MIN_AGE + i);
const SAVE = `${(ANNUAL_DISCOUNT * 100).toFixed(1)}%`;

/** Health quote: check a price by age and gender, pick products, then tune the coverage amount of each. */
export default function HealthQuote() {
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState(25);
  const [checked, setChecked] = useState(false); // after "Check price" the cards show this person's price
  const [step, setStep] = useState<"overview" | "coverage">("overview");
  const [picked, setPicked] = useState<HealthProduct[]>([]);
  const [coverage, setCoverage] = useState<Record<HealthProduct, number>>({ life: 100000, medical: 60000, critical: 100000 });
  const [tier, setTier] = useState<Tier>("basic");
  const [period, setPeriod] = useState<Period>("monthly");

  const who = { age, gender };
  // A pick stops counting if the age changes to one the product doesn't cover.
  const active = ORDER.filter((p) => picked.includes(p) && eligible(p, age));
  const price = (p: HealthProduct) => periodPrice(monthlyPremium(p, { ...who, coverage: coverage[p], tier: p === "critical" ? tier : undefined }), period);
  const total = Math.round(active.reduce((s, p) => s + price(p), 0) * 100) / 100;
  const cheapest = Math.min(...ORDER.map((p) => fromMonthly(p)));
  const unit = period === "monthly" ? "/month" : "/year";

  const toggle = (p: HealthProduct) => setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const go = (s: "overview" | "coverage") => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  if (step === "coverage") {
    return (
      <div className="pb-24">
        <button type="button" onClick={() => go("overview")} className="btn btn-sm btn-subtle -ml-2">
          <ArrowLeftRegular />
          Back
        </button>
        <div className="mx-auto mt-4 max-w-[560px]">
          <h1 className="t-title-large text-fg">Choose your coverage</h1>
          <div className="mt-4">
            <Segmented
              label="Billing period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "annual", label: <>Annually · save {SAVE}</> },
              ]}
            />
          </div>

          <div className="mt-6 space-y-5">
            {active.map((p) => {
              const amounts = HEALTH[p].coverages;
              const idx = amounts.indexOf(coverage[p]);
              return (
                <section key={p} className="card p-5" aria-label={HEALTH[p].label}>
                  <div className="flex items-center gap-3">
                    <CategoryGlyph type={GLYPH[p]} size={32} />
                    <h2 className="t-subtitle text-fg">{HEALTH[p].label}</h2>
                  </div>

                  {p === "critical" && (
                    <div className="mt-4">
                      <Segmented
                        label="Critical illness plan"
                        value={tier}
                        onChange={setTier}
                        options={[
                          { value: "basic", label: <>Basic ({CRITICAL_COUNT.basic} illnesses)</> },
                          { value: "premium", label: <>Premium ({CRITICAL_COUNT.premium} illnesses)</> },
                        ]}
                      />
                    </div>
                  )}

                  <p className="mt-5 t-body-strong text-fg">Choose your coverage amount</p>
                  <input
                    type="range"
                    min={0}
                    max={amounts.length - 1}
                    step={1}
                    value={idx}
                    onChange={(e) => setCoverage((c) => ({ ...c, [p]: amounts[Number(e.target.value)] }))}
                    aria-label={`${HEALTH[p].label} coverage amount`}
                    aria-valuetext={rm(coverage[p])}
                    className="mt-3 w-full accent-[var(--accent-fill)]"
                  />
                  <div className="mt-1 flex justify-between t-caption">
                    {amounts.map((a) => (
                      <span key={a} className={a === coverage[p] ? "font-semibold text-fg" : "text-fg-3"}>
                        RM {a.toLocaleString("en-MY")}
                      </span>
                    ))}
                  </div>

                  <dl className="mt-4 space-y-1.5 rounded-[var(--radius-control)] bg-[var(--subtle-fill-tertiary)] p-3 t-body">
                    {benefits(p, coverage[p], tier).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-fg-2">{k}</dt>
                        <dd className="text-right font-semibold text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="t-body-strong text-fg">Premium</span>
                    <span className="tabular-nums">
                      <span className="font-display text-[22px] font-semibold text-accent-text">{rm(price(p))}</span>
                      <span className="t-caption text-fg-3">{unit}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      toggle(p);
                      if (active.length === 1) go("overview");
                    }}
                    className="btn btn-sm btn-subtle -ml-2 mt-3 text-[var(--critical)]"
                  >
                    <DeleteRegular />
                    I don&apos;t want this
                  </button>
                </section>
              );
            })}
          </div>
        </div>

        <Bar
          action={
            <Link href="/register" className="btn btn-accent btn-lg !rounded-full">
              Continue
            </Link>
          }
        >
          <span className="t-body-strong text-fg">
            Total <span className="font-display text-[22px] tabular-nums">{rm(total)}</span>
            <span className="t-caption font-normal text-fg-3">
              {unit} ({active.length} plan{active.length === 1 ? "" : "s"})
            </span>
          </span>
        </Bar>
      </div>
    );
  }

  return (
    <div className={picked.length ? "pb-24" : ""}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 t-body text-fg-2">
        <Link href="/" className="rounded px-0.5 hover:text-fg">
          Home
        </Link>
        <ChevronRightRegular fontSize={12} className="text-fg-3" aria-hidden />
        <span>Health insurance</span>
      </nav>

      <div className="mt-6 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="flex items-center gap-4">
            <CategoryGlyph type="health" variant="solid" size={56} />
            <h1 className="t-title-large text-fg">Health Insurance</h1>
          </div>
          <p className="mt-4 t-body-large text-fg-2">Life, medical card and critical illness cover. Instant estimates, no sign-up needed.</p>
          <p className="mt-1 t-body-large text-fg">
            From as low as <span className="font-semibold text-accent-text tabular-nums">{rm(cheapest)}</span>/month
          </p>
        </div>

        <div className="card space-y-4 p-5">
          <div>
            <span className="field-label">Gender</span>
            <Segmented
              label="Gender"
              value={gender}
              onChange={setGender}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </div>
          <div>
            <label htmlFor="health-age" className="field-label">
              Age
            </label>
            <Select id="health-age" value={age} onChange={(e) => setAge(Number(e.target.value))}>
              {AGES.map((a) => (
                <option key={a} value={a}>
                  {a} years old
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            className="btn btn-accent btn-xl btn-block !rounded-full"
            onClick={() => {
              setChecked(true);
              document.getElementById("health-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Check price
          </button>
        </div>
      </div>

      <section id="health-products" className="mt-16 scroll-mt-6">
        <h2 className="text-center t-subtitle text-accent-text">Product Overview</h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {ORDER.map((p) => {
            const ok = eligible(p, age);
            const monthly = checked ? fromMonthly(p, who) : fromMonthly(p);
            const on = picked.includes(p);
            return (
              <li key={p} className="card flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <CategoryGlyph type={GLYPH[p]} size={32} />
                  <h3 className="t-subtitle text-fg">{HEALTH[p].label}</h3>
                </div>
                <p className="mt-3 t-body text-fg-2">
                  {checked ? "For you" : "From"}{" "}
                  <span className="font-display text-[22px] font-semibold text-accent-text tabular-nums">RM{perDay(monthly).toFixed(2)}</span>/day
                </p>
                <span className="badge badge-outline mt-2 w-fit">
                  <PersonRegular aria-hidden />
                  {HEALTH[p].minAge}-{HEALTH[p].maxAge} years old
                </span>
                <dl className="mt-4 space-y-1.5 rounded-[var(--radius-control)] bg-[var(--subtle-fill-tertiary)] p-3 t-body">
                  {benefits(p, HEALTH[p].coverages[0]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-fg-2">{k}</dt>
                      <dd className="text-right font-semibold text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto pt-5">
                  {ok ? (
                    <button type="button" aria-pressed={on} onClick={() => toggle(p)} className={`btn btn-lg !rounded-full ${on ? "" : "btn-accent"}`}>
                      {on ? (
                        <>
                          <CheckmarkRegular />
                          Added
                        </>
                      ) : (
                        "I want this"
                      )}
                    </button>
                  ) : (
                    <p className="t-caption text-fg-3">Not available at age {age}. Covers {HEALTH[p].minAge}-{HEALTH[p].maxAge}.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-center t-caption text-fg-3">Illustrative prices based on age and gender. Cards show the lowest cover; you choose the amount next.</p>
      </section>

      {picked.length > 0 && (
        <Bar
          action={
            <button type="button" onClick={() => go("coverage")} className="btn btn-accent btn-lg !rounded-full">
              Continue
            </button>
          }
        >
          <span className="t-body-strong text-fg">
            {picked.length} plan{picked.length === 1 ? "" : "s"} selected
          </span>
        </Bar>
      )}
    </div>
  );
}

/** Sticky bottom bar: running summary on the left, the next step on the right. */
function Bar({ children, action }: { children: ReactNode; action: ReactNode }) {
  return (
    <div className="acrylic fixed inset-x-0 bottom-0 z-30 border-t border-[var(--surface-stroke-flyout)]">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
        {children}
        {action}
      </div>
    </div>
  );
}
