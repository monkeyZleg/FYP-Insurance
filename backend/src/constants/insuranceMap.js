// Claims are filed under four insurance types (car/motor/travel/health) and
// the on-chain PolicyType enum has the same four (PolicyRegistry.sol), so a
// claim links to a policy of its own type and every claim type is recorded
// on-chain — see claimController.js.
const CLAIM_TO_POLICY_TYPE = {
  car: "car",
  motor: "motor",
  travel: "travel",
  health: "health",
};

// Claim form field that states the amount claimed (RM) for each type. It is
// sent on-chain as claimedAmount so the approved payout can never exceed it.
// Optional on the car/motor/travel forms — a blank value is sent as 0.
const CLAIM_AMOUNT_FIELD = {
  car: "estimatedRepairCost",
  motor: "estimatedRepairCost",
  travel: "estimatedLoss",
  health: "medicalBill",
};

module.exports = { CLAIM_TO_POLICY_TYPE, CLAIM_AMOUNT_FIELD };
