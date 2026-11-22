// Out-of-pocket calculator for the claim request page, following Part B of
// claim-request-checklist-and-calculator.md. Pure functions only. The data is
// simulated, so every result is an estimate and nothing here moves money.

export type ClaimKind = "motor" | "medical" | "life";

export interface ChargeSettings {
  model: "percent" | "flat";
  rate: number; // % of the approved insurer payout (percent model)
  flat: number; // RM per approved claim (flat model)
  min: number;
  max: number | null; // null = no cap
  payer: "policyholder" | "insurer";
}

// Admin-configurable in the full design; fixed here until that settings screen exists.
export const DEFAULT_CHARGE: ChargeSettings = { model: "percent", rate: 2, flat: 20, min: 10, max: 200, payer: "policyholder" };

export interface CalcInput {
  claimed: number; // C
  excluded: number; // E
  deductible: number; // D
  coinsurance: number; // P, 0-100
  limit: number | null; // L: coverage limit remaining, null when the policy has none
  charge: ChargeSettings;
  approved?: boolean; // false = rejected, so no service charge
}

export interface CalcResult {
  excluded: number;
  deductible: number;
  coinsurance: number;
  aboveLimit: number;
  payout: number; // insurer payout (gross)
  serviceCharge: number;
  net: number; // net payout to the policyholder
  outOfPocketBeforeCharge: number;
  totalUserPays: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateClaim(i: CalcInput): CalcResult {
  const claimable = Math.max(i.claimed - i.excluded, 0);
  const deductible = Math.min(i.deductible, claimable);
  const afterDeductible = claimable - deductible;
  const insurerShare = r2(afterDeductible * (1 - i.coinsurance / 100));
  const payout = i.limit === null ? insurerShare : Math.min(insurerShare, i.limit);

  const c = i.charge;
  const raw = c.model === "flat" ? c.flat : Math.min(Math.max((payout * c.rate) / 100, c.min), c.max ?? Infinity);
  // Charged only on an approved payout, and never more than that payout.
  const serviceCharge = payout > 0 && i.approved !== false ? r2(Math.min(Math.max(raw, 0), payout)) : 0;
  const net = r2(c.payer === "policyholder" ? payout - serviceCharge : payout);

  return {
    excluded: Math.min(i.excluded, i.claimed),
    deductible: r2(deductible),
    coinsurance: r2(afterDeductible - insurerShare),
    aboveLimit: r2(insurerShare - payout),
    payout: r2(payout),
    serviceCharge,
    net,
    outOfPocketBeforeCharge: r2(i.claimed - payout),
    totalUserPays: r2(i.claimed - net),
  };
}

export type CalcField = "claimed" | "excluded" | "deductible" | "coinsurance" | "limit" | "charge";

/** Validation rules from section B5. Returns one message per bad field. */
export function validateCalc(i: Omit<CalcInput, "approved">): Partial<Record<CalcField, string>> {
  const bad = (n: number) => !Number.isFinite(n);
  const c = i.charge;
  return {
    claimed: bad(i.claimed) || i.claimed <= 0 ? "Enter an amount greater than 0." : undefined,
    excluded: bad(i.excluded) || i.excluded < 0 ? "Enter 0 or more." : i.excluded > i.claimed ? "Excluded items can't exceed the amount claimed." : undefined,
    deductible: bad(i.deductible) || i.deductible < 0 ? "Enter 0 or more." : undefined,
    coinsurance: bad(i.coinsurance) || i.coinsurance < 0 || i.coinsurance > 100 ? "Enter a percentage from 0 to 100." : undefined,
    limit: i.limit !== null && (bad(i.limit) || i.limit < 0) ? "Your remaining limit can't be negative." : undefined,
    charge: c.rate < 0 || c.rate > 100 ? "Service charge rate must be 0 to 100%." : c.max !== null && c.min > c.max ? "Minimum fee can't exceed the maximum fee." : undefined,
  };
}

const rm0 = (n: number) => `RM ${n.toLocaleString("en-MY")}`;

/** One plain-language sentence for the service charge shown before submission. */
export function describeCharge(c: ChargeSettings) {
  const amount =
    c.model === "flat" ? `a flat ${rm0(c.flat)} per approved claim` : `${c.rate}% of the approved payout (minimum ${rm0(c.min)}${c.max !== null ? `, maximum ${rm0(c.max)}` : ""})`;
  const who = c.payer === "policyholder" ? "It is deducted from your payout." : "It is billed to the insurer, not to you.";
  return `Service charge: ${amount}. ${who} No charge applies if your claim is rejected.`;
}
