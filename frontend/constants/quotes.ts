// Indicative pricing for the public quote pages (car, motor, travel, health).
// ChainIns is a student project: every figure here is an illustrative estimate,
// not a tariff or a binding premium. Pure functions only, so they can be checked
// without a browser (see scripts/check-quotes.mjs).

export const SERVICE_TAX = 0.08;
export const STAMP_DUTY = 10;

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const rm = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rmWhole = (n: number) => `RM ${n.toLocaleString("en-MY")}`;

/* ------------------------------------------------------------ validators */

export const isRegNo = (s: string) => /^(?=.*[A-Z])(?=.*\d)[A-Z0-9 ]{3,10}$/i.test(s.trim());

export function isNric(s: string) {
  const m = /^\d{2}(\d{2})(\d{2})-?\d{2}-?\d{4}$/.exec(s.trim());
  return !!m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31;
}

export const fmtNric = (raw: string) => raw.replace(/\D/g, "").slice(0, 12).replace(/^(\d{6})(\d{1,2})/, "$1-$2").replace(/^(\d{6}-\d{2})(\d{1,4})/, "$1-$2");

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// The +60 prefix is shown next to the box, so accept "12 345 6789", "012-3456789" or "+60 12 3456789".
export const isMyMobile = (s: string) => /^1\d{8,9}$/.test(s.replace(/[\s-]/g, "").replace(/^(\+?60|0)/, ""));

export const isPostcode = (s: string) => /^\d{5}$/.test(s.trim());

// Labuan + Sabah (87000-91999) and Sarawak (93000-98999) use the East Malaysia rate.
export const isEastMalaysia = (postcode: string) => {
  const n = Number(postcode);
  return isPostcode(postcode) && ((n >= 87000 && n <= 91999) || (n >= 93000 && n <= 98999));
};

/* --------------------------------------------------------- car and motor */

export type VehicleKind = "car" | "motor";
export type CoverType = "comprehensive" | "tpft";
export type AddOn = "windscreen" | "perils" | "srcc";

export const NCD_OPTIONS = [0, 0.25, 0.3, 0.3833, 0.45, 0.55];
export const ncdLabel = (n: number) => `${+(n * 100).toFixed(2)}%`;

// Same ceiling the policy module already offers (constants/policyPlans.ts).
const PROMO_CODES = new Map([["CHAINS10", 0.1]]);
export const promoRate = (code: string) => PROMO_CODES.get(code.trim().toUpperCase());

interface VehicleRates {
  base: [maxCc: number, premium: number][];
  rate: { west: number; east: number }; // RM per RM1,000 sum insured
  cc: [number, number];
  sumInsured: [number, number];
}

// Car figures follow the published West/East Malaysia tariff shape (basic premium by
// engine size + a rate per RM1,000). Motorcycle figures are placeholders sized to market
// ranges. shortcut: values are approximate, replace with the insurer's rating table.
export const VEHICLE: Record<VehicleKind, VehicleRates> = {
  car: {
    base: [[1000, 273.8], [1200, 305.5], [1400, 339.1], [1650, 372.8], [1800, 406.5], [2000, 440.3], [2200, 474], [2400, 507.7], [Infinity, 541.5]],
    rate: { west: 26, east: 20.3 },
    cc: [600, 6000],
    sumInsured: [10000, 500000],
  },
  motor: {
    base: [[150, 70], [200, 90], [250, 110], [500, 160], [Infinity, 230]],
    rate: { west: 16, east: 12.5 },
    cc: [50, 2000],
    sumInsured: [1000, 60000],
  },
};

export const ADD_ONS: Record<AddOn, { label: string; kinds: VehicleKind[]; amount: (sumInsured: number) => number }> = {
  windscreen: { label: "Windscreen cover up to RM 1,000", kinds: ["car"], amount: () => 150 },
  perils: { label: "Special perils: flood, storm, landslide", kinds: ["car", "motor"], amount: (si) => si * 0.005 },
  srcc: { label: "Strike, riot & civil commotion", kinds: ["car", "motor"], amount: (si) => si * 0.003 },
};

const ageLoading = (years: number) => (years > 15 ? 0.2 : years > 10 ? 0.1 : 0);

export interface VehicleInput {
  kind: VehicleKind;
  cc: number;
  sumInsured: number;
  age: number; // vehicle age in years
  ncd: number; // fraction, one of NCD_OPTIONS
  cover: CoverType;
  east: boolean;
  addOns: AddOn[];
  promo: number; // discount fraction, 0 when none
}

export interface VehicleQuote {
  basic: number;
  loading: number;
  tpftAdj: number; // negative
  ncd: number; // negative
  addOns: { id: AddOn; amount: number }[];
  promo: number; // negative
  tax: number;
  stamp: number;
  total: number;
}

export function vehicleQuote(i: VehicleInput): VehicleQuote {
  const c = VEHICLE[i.kind];
  const base = (c.base.find(([max]) => i.cc <= max) ?? c.base[c.base.length - 1])[1];
  const basic = r2(base + (i.sumInsured / 1000) * c.rate[i.east ? "east" : "west"]);
  const loading = r2(basic * ageLoading(i.age));
  const gross = basic + loading;
  // Third-party, fire & theft is priced at 75% of the comprehensive premium.
  const tpftAdj = i.cover === "tpft" ? -r2(gross * 0.25) : 0;
  const ncd = -r2((gross + tpftAdj) * i.ncd);
  // Add-ons are own-damage extras, so they only apply to comprehensive cover.
  const addOns =
    i.cover === "comprehensive"
      ? i.addOns.filter((a) => ADD_ONS[a].kinds.includes(i.kind)).map((id) => ({ id, amount: r2(ADD_ONS[id].amount(i.sumInsured)) }))
      : [];
  const subtotal = r2(gross + tpftAdj + ncd + addOns.reduce((s, a) => s + a.amount, 0));
  const promo = -r2(subtotal * i.promo);
  const taxable = subtotal + promo;
  const tax = r2(taxable * SERVICE_TAX);
  return { basic, loading, tpftAdj, ncd, addOns, promo, tax, stamp: STAMP_DUTY, total: r2(taxable + tax + STAMP_DUTY) };
}

/* ---------------------------------------------------------------- travel */

export type TravelPlan = "umrah" | "round" | "oneway" | "annual";
export type Traveler = "individual" | "couple" | "family";

export const TRAVEL_PLANS: Record<TravelPlan, { label: string; blurb: string }> = {
  umrah: { label: "Umrah", blurb: "For Muslims completing Umrah and returning home with peace of mind." },
  annual: { label: "Annual", blurb: "For frequent travellers: covers unlimited trips for a year." },
  round: { label: "Round-trip", blurb: "For travellers with confirmed return dates, covers the whole trip." },
  oneway: { label: "One-way", blurb: "For open travel or relocations, up to 365 days from departure." },
};

export const TRAVELERS: Record<Traveler, { label: string; factor: number }> = {
  individual: { label: "Individual", factor: 1 },
  couple: { label: "Couple", factor: 1.8 },
  family: { label: "Family", factor: 2.6 },
};

export const MAX_TRAVEL_AGE = 85;
export const MAX_TRIP_DAYS: Partial<Record<TravelPlan, number>> = { umrah: 60, round: 180 };

const TRAVEL_RATES: Record<TravelPlan, { perDay?: number; min?: number; flat?: number }> = {
  umrah: { perDay: 4.8, min: 60 },
  round: { perDay: 3.5, min: 25 },
  oneway: { flat: 280 },
  annual: { flat: 195 },
};

const travelAgeFactor = (age: number) => (age >= 70 ? 1.8 : age >= 60 ? 1.4 : age < 18 ? 0.6 : 1);

const utc = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Days from departure to return, both included. Dates are "YYYY-MM-DD". */
export const tripDays = (dep: string, ret: string) => Math.round((utc(ret) - utc(dep)) / 864e5) + 1;

export function ageOn(dob: string, on: string) {
  const [y1, m1, d1] = dob.split("-").map(Number);
  const [y2, m2, d2] = on.split("-").map(Number);
  return y2 - y1 - (m2 < m1 || (m2 === m1 && d2 < d1) ? 1 : 0);
}

export interface TravelInput {
  plan: TravelPlan;
  days: number; // ignored by the flat-rate plans
  traveler: Traveler;
  age: number;
}

export function travelQuote({ plan, days, traveler, age }: TravelInput) {
  const t = TRAVEL_RATES[plan];
  const base = t.flat ?? Math.max(t.min ?? 0, (t.perDay ?? 0) * days);
  const premium = r2(base * TRAVELERS[traveler].factor * travelAgeFactor(age));
  const tax = r2(premium * SERVICE_TAX);
  return { premium, tax, stamp: STAMP_DUTY, total: r2(premium + tax + STAMP_DUTY) };
}

/* ---------------------------------------------------------------- health */

export type Gender = "male" | "female";
export type HealthProduct = "life" | "medical" | "critical";
export type Tier = "basic" | "premium";
export type Period = "monthly" | "annual";

export const ANNUAL_DISCOUNT = 0.068;
export const HEALTH_MIN_AGE = 18;
export const HEALTH_MAX_AGE = 60;

export const HEALTH: Record<HealthProduct, { label: string; minAge: number; maxAge: number; coverages: number[] }> = {
  life: { label: "Life Insurance", minAge: 18, maxAge: 60, coverages: [100000, 300000, 500000] },
  medical: { label: "Medical Card", minAge: 18, maxAge: 45, coverages: [60000, 90000] },
  critical: { label: "Critical Illness", minAge: 18, maxAge: 60, coverages: [100000, 300000, 500000] },
};

export const eligible = (p: HealthProduct, age: number) => age >= HEALTH[p].minAge && age <= HEALTH[p].maxAge;

// Each curve is 1.0 at age 25; premiums are anchored on a 25-year-old male.
const lifeAge = (a: number) => (a >= 25 ? 1 + 0.045 * (a - 25) : 1 - 0.03 * (25 - a));
const medicalAge = (a: number) => (a >= 25 ? 1 + 0.012 * (a - 25) : 1 - 0.008 * (25 - a));
const criticalAge = (a: number) => (a >= 25 ? 1 + 0.05 * (a - 25) : 1 - 0.01 * (25 - a));

export function monthlyPremium(p: HealthProduct, o: { age: number; gender: Gender; coverage: number; tier?: Tier }) {
  const f = o.gender === "female";
  switch (p) {
    case "life":
      return r2(15.4 * (o.coverage / 100000) * lifeAge(o.age) * (f ? 0.79 : 1));
    case "medical":
      return r2(44.7 * (o.coverage === 60000 ? 1 : 1.45) * medicalAge(o.age) * (f ? 1.1 : 1));
    case "critical":
      return r2(8.1 * (o.coverage / 100000) * (o.tier === "premium" ? 1.6 : 1) * criticalAge(o.age));
  }
}

export const periodPrice = (monthly: number, period: Period) => (period === "monthly" ? monthly : r2(monthly * 12 * (1 - ANNUAL_DISCOUNT)));

/** Cheapest monthly price at the lowest cover: for one person, or across every age and gender. */
export function fromMonthly(p: HealthProduct, who?: { age: number; gender: Gender }) {
  const coverage = HEALTH[p].coverages[0];
  if (who) return monthlyPremium(p, { ...who, coverage });
  let best = Infinity;
  for (let age = HEALTH[p].minAge; age <= HEALTH[p].maxAge; age++)
    for (const gender of ["male", "female"] as const) best = Math.min(best, monthlyPremium(p, { age, gender, coverage }));
  return best;
}

export const perDay = (monthly: number) => (monthly * 12) / 365;

const CRITICAL_COVERED: Record<Tier, string> = {
  basic: "Cancer, Stroke, Heart attack",
  premium: "Cancer, Stroke, Heart attack, Kidney failure, Organ transplant",
};
export const CRITICAL_COUNT: Record<Tier, number> = { basic: 3, premium: 5 };

export function benefits(p: HealthProduct, coverage: number, tier: Tier = "basic"): [string, string][] {
  switch (p) {
    case "life":
      return [["Death benefit", rmWhole(coverage)], ["Total & permanent disability", rmWhole(coverage)], ["Additional accidental death", rmWhole(coverage / 2)]];
    case "medical":
      return [["Overall annual limit", rmWhole(coverage)], ["Overall lifetime limit", "Unlimited"], ["Hospital benefits", `${rmWhole(coverage === 60000 ? 150 : 200)}/day`]];
    case "critical":
      return [["Coverage amount", rmWhole(coverage)], ["Covers", CRITICAL_COVERED[tier]]];
  }
}
