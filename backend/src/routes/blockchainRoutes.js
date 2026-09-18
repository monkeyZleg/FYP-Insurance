const express = require("express");
const router = express.Router();
const flexibleAuth = require("../middleware/flexibleAuth");
const {
  getAuditTrail,
  verifyDocumentHash,
  getBlockchainClaim,
} = require("../controllers/blockchainController");

// effectiveStatus/isEligible/getClaim/verifyDocument are public reads
// on-chain (permission matrix, smart-contract-spec-hybrid.md Section 3);
// still gated behind login here so only signed-in app users hit RPC reads.
const anyRole = flexibleAuth("policyholder", "verifier", "admin", "auditor");

router.get("/audit/:claimId", anyRole, getAuditTrail);
router.get("/verify/:claimId", anyRole, verifyDocumentHash);
router.get("/claim/:claimId", anyRole, getBlockchainClaim);

module.exports = router;
