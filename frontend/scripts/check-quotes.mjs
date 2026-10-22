// Run with: npm run check:quotes. Asserts the quote engine against hand-worked numbers.
import assert from "node:assert/strict";
import { benefits, fmtNric, fromMonthly, isEastMalaysia, isMyMobile, isNric, monthlyPremium, periodPrice, tripDays, travelQuote, vehicleQuote } from "../constants/quotes.ts";

// Car, 1,498cc, RM 50k, 3 years old, 25% NCD, comprehensive, West Malaysia:
// basic 372.80 + 50 x 26 = 1,672.80; NCD -418.20; tax 8% = 100.37; stamp 10.
const car = { kind: "car", cc: 1498, sumInsured: 50000, age: 3, ncd: 0.25, cover: "comprehensive", east: false, addOns: [], promo: 0 };
assert.equal(vehicleQuote(car).total, 1364.97);
assert.equal(vehicleQuote({ ...car, east: true }).basic, 372.8 + 50 * 20.3);
assert.equal(vehicleQuote({ ...car, cover: "tpft" }).tpftAdj, -418.2); // 75% of comprehensive
assert.equal(vehicleQuote({ ...car, cover: "tpft", addOns: ["windscreen"] }).addOns.length, 0); // add-ons need comprehensive
assert.equal(vehicleQuote({ ...car, kind: "motor", cc: 125, sumInsured: 6000, addOns: ["windscreen"] }).addOns.length, 0); // no windscreen on a motorcycle
assert.ok(vehicleQuote({ ...car, promo: 0.1 }).total < vehicleQuote(car).total);

// Health: the three anchors for a 25-year-old male add up to RM 68.20 / month.
const m25 = { age: 25, gender: "male" };
const sum = monthlyPremium("life", { ...m25, coverage: 100000 }) + monthlyPremium("medical", { ...m25, coverage: 60000 }) + monthlyPremium("critical", { ...m25, coverage: 100000 });
assert.equal(Math.round(sum * 100) / 100, 68.2);
assert.equal(periodPrice(68.2, "annual"), 762.75); // 68.20 x 12 x (1 - 6.8%)
assert.equal(fromMonthly("life").toFixed(2), "9.61");
assert.deepEqual(benefits("life", 500000)[2], ["Additional accidental death", "RM 250,000"]);

// Travel: flat plans ignore the trip length; round-trip has a minimum.
assert.equal(travelQuote({ plan: "annual", days: 1, traveler: "individual", age: 30 }).premium, 195);
assert.equal(travelQuote({ plan: "round", days: 2, traveler: "individual", age: 30 }).premium, 25);
assert.equal(tripDays("2026-03-01", "2026-03-10"), 10);

// Validators
assert.ok(isNric("900101-14-5678") && isNric("900101145678") && !isNric("901301-14-5678"));
assert.equal(fmtNric("9001011456"), "900101-14-56");
assert.ok(isMyMobile("12 345 6789") && isMyMobile("012-3456789") && isMyMobile("+60 12 3456789") && !isMyMobile("23456789"));
assert.ok(isEastMalaysia("88000") && isEastMalaysia("93000") && !isEastMalaysia("50050"));

console.log("quote checks passed");
