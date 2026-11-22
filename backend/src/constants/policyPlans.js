// Preset plan catalogue (sample data, not real insurer products).
// planId is the on-chain uint32 planId passed to PolicyRegistry.createPolicy —
// keep these numbers in sync with frontend/constants/policyPlans.ts.
// PolicyType enum on-chain: Car = 0, Motor = 1, Travel = 2, Health = 3
// (Motor = motorcycle). Every policy runs for 12 months on-chain, so the
// travel plans are annual multi-trip plans.

const POLICY_TYPE_ENUM = { car: 0, motor: 1, travel: 2, health: 3 };
const PAYMENT_MODE_ENUM = { PayNow: 0, Instalment: 1, PayLater: 2 };

// Premiums are stored on-chain in "sen" (RM cents) per the spec, so
// multiply the RM amount by 100 when calling the contract.
const POLICY_PLANS = [
  { planId: 1, id: "car-basic", type: "car", name: "Car Basic", tier: "Basic", premiumRM: 480 },
  { planId: 2, id: "car-standard", type: "car", name: "Car Standard", tier: "Standard", premiumRM: 890 },
  { planId: 3, id: "car-comprehensive", type: "car", name: "Car Comprehensive", tier: "Comprehensive", premiumRM: 1450 },
  { planId: 4, id: "motor-basic", type: "motor", name: "Motor Basic", tier: "Basic", premiumRM: 120 },
  { planId: 5, id: "motor-standard", type: "motor", name: "Motor Standard", tier: "Standard", premiumRM: 220 },
  { planId: 6, id: "motor-comprehensive", type: "motor", name: "Motor Comprehensive", tier: "Comprehensive", premiumRM: 380 },
  { planId: 7, id: "travel-basic", type: "travel", name: "Travel Basic", tier: "Basic", premiumRM: 60 },
  { planId: 8, id: "travel-standard", type: "travel", name: "Travel Standard", tier: "Standard", premiumRM: 110 },
  { planId: 9, id: "travel-premium", type: "travel", name: "Travel Premium", tier: "Premium", premiumRM: 190 },
  { planId: 10, id: "health-basic", type: "health", name: "Health Basic", tier: "Basic", premiumRM: 620 },
  { planId: 11, id: "health-standard", type: "health", name: "Health Standard", tier: "Standard", premiumRM: 1180 },
  { planId: 12, id: "health-premium", type: "health", name: "Health Premium", tier: "Premium", premiumRM: 2350 },
];

function getPlan(planId) {
  return POLICY_PLANS.find((p) => p.planId === Number(planId));
}

module.exports = { POLICY_PLANS, POLICY_TYPE_ENUM, PAYMENT_MODE_ENUM, getPlan };
