// Claims are filed under four insurance types (health/life/transportation/
// flight); the policy module only covers three on-chain PolicyTypes
// (motor/medical/life). Flight has no matching policy type and is never
// submitted on-chain — see claimController.js.
const CLAIM_TO_POLICY_TYPE = {
  health: "medical",
  life: "life",
  transportation: "motor",
};

module.exports = { CLAIM_TO_POLICY_TYPE };
