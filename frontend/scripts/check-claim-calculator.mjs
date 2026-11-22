// Worked examples from claim-request-checklist-and-calculator.md (R=2%, min RM10, max RM200, policyholder pays).
import assert from "node:assert/strict";
import { calculateClaim, validateCalc, DEFAULT_CHARGE as charge } from "../constants/claimCalculator.ts";

const row = (r) => [r.payout, r.serviceCharge, r.net, r.totalUserPays];
assert.deepEqual(row(calculateClaim({ claimed: 8000, excluded: 500, deductible: 400, coinsurance: 0, limit: 50000, charge })), [7100, 142, 6958, 1042]);
const med = calculateClaim({ claimed: 12000, excluded: 1000, deductible: 500, coinsurance: 10, limit: 100000, charge });
assert.deepEqual(row(med), [9450, 189, 9261, 2739]);
const cap = calculateClaim({ claimed: 20000, excluded: 0, deductible: 500, coinsurance: 0, limit: 15000, charge });
assert.deepEqual(row(cap), [15000, 200, 14800, 5200]);
assert.equal(cap.aboveLimit, 4500);
// rejected or zero payout: no charge; insurer-pays: net == payout; charge never above payout
assert.equal(calculateClaim({ claimed: 8000, excluded: 0, deductible: 0, coinsurance: 0, limit: null, charge, approved: false }).serviceCharge, 0);
assert.equal(calculateClaim({ claimed: 300, excluded: 0, deductible: 500, coinsurance: 0, limit: null, charge }).serviceCharge, 0);
assert.equal(calculateClaim({ claimed: 8000, excluded: 0, deductible: 0, coinsurance: 0, limit: null, charge: { ...charge, payer: "insurer" } }).net, 8000);
assert.equal(calculateClaim({ claimed: 50, excluded: 0, deductible: 0, coinsurance: 0, limit: null, charge }).serviceCharge, 10);
assert.equal(calculateClaim({ claimed: 5, excluded: 0, deductible: 0, coinsurance: 0, limit: null, charge }).serviceCharge, 5);
// validation (B5)
const ok = { claimed: 100, excluded: 0, deductible: 0, coinsurance: 0, limit: null, charge };
assert.ok(Object.values(validateCalc(ok)).every((v) => !v));
assert.ok(validateCalc({ ...ok, claimed: 0 }).claimed);
assert.ok(validateCalc({ ...ok, excluded: 101 }).excluded);
assert.ok(validateCalc({ ...ok, coinsurance: 101 }).coinsurance);
assert.ok(validateCalc({ ...ok, limit: -1 }).limit);
assert.ok(validateCalc({ ...ok, charge: { ...charge, min: 300 } }).charge);
console.log("claim calculator checks passed");
