// Preset plan catalogue (sample data, not real insurer products).
// planId is the on-chain uint32 planId passed to PolicyRegistry.createPolicy —
// keep these numbers in sync with frontend/constants/policyPlans.ts.
// PolicyType enum on-chain: Motor = 0, Medical = 1, Life = 2.

const POLICY_TYPE_ENUM = { motor: 0, medical: 1, life: 2 };
const PAYMENT_MODE_ENUM = { PayNow: 0, Instalment: 1, PayLater: 2 };

// Premiums are stored on-chain in "sen" (RM cents) per the spec, so
// multiply the RM amount by 100 when calling the contract.
const POLICY_PLANS = [
  { planId: 1, id: "motor-basic", type: "motor", name: "Motor Basic", tier: "Basic", premiumRM: 480 },
  { planId: 2, id: "motor-standard", type: "motor", name: "Motor Standard", tier: "Standard", premiumRM: 890 },
  { planId: 3, id: "motor-comprehensive", type: "motor", name: "Motor Comprehensive", tier: "Comprehensive", premiumRM: 1450 },
  { planId: 4, id: "medical-basic", type: "medical", name: "Medical Basic", tier: "Basic", premiumRM: 620 },
  { planId: 5, id: "medical-standard", type: "medical", name: "Medical Standard", tier: "Standard", premiumRM: 1180 },
  { planId: 6, id: "medical-premium", type: "medical", name: "Medical Premium", tier: "Premium", premiumRM: 2350 },
  { planId: 7, id: "life-basic", type: "life", name: "Life Basic", tier: "Basic", premiumRM: 540 },
  { planId: 8, id: "life-standard", type: "life", name: "Life Standard", tier: "Standard", premiumRM: 980 },
  { planId: 9, id: "life-premium", type: "life", name: "Life Premium", tier: "Premium", premiumRM: 1920 },
];

function getPlan(planId) {
  return POLICY_PLANS.find((p) => p.planId === Number(planId));
}

module.exports = { POLICY_PLANS, POLICY_TYPE_ENUM, PAYMENT_MODE_ENUM, getPlan };
