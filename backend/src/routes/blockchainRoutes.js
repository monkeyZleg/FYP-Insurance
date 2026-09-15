const express = require("express");
const router = express.Router();
const rbac = require("../middleware/rbacMiddleware");
const {
  submitToBlockchain,
  getAuditTrail,
  verifyDocumentHash,
  getBlockchainClaim,
} = require("../controllers/blockchainController");

router.post("/submit", rbac("policyholder"), submitToBlockchain);
router.get("/audit/:claimId", rbac("auditor"), getAuditTrail);
router.get("/verify/:claimId", rbac("auditor", "verifier"), verifyDocumentHash);
router.get(
  "/claim/:claimId",
  rbac("policyholder", "verifier", "admin", "auditor"),
  getBlockchainClaim
);

module.exports = router;
