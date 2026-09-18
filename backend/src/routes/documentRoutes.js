const express = require("express");
const router = express.Router();
const flexibleAuth = require("../middleware/flexibleAuth");
const { getDocumentsByClaim } = require("../controllers/documentController");

// Document upload now happens inline with claim submission (POST /api/claims,
// multipart) so files, their hashes and the claim can be created in one
// relayer-signed transaction — see claimController.createClaim.
router.get("/:claimId", flexibleAuth("policyholder", "verifier", "admin", "auditor"), getDocumentsByClaim);

module.exports = router;
