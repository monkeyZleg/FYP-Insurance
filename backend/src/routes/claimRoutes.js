const express = require("express");
const router = express.Router();
const multer = require("multer");
const rbac = require("../middleware/rbacMiddleware");
const policyholderAuth = require("../middleware/policyholderAuth");
const flexibleAuth = require("../middleware/flexibleAuth");
const {
  createClaim,
  getClaimById,
  getMyClaims,
  getPendingClaims,
  getAllClaims,
  saveRemark,
} = require("../controllers/claimController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", policyholderAuth, upload.array("files", 10), createClaim);
router.get("/pending", rbac("admin"), getPendingClaims);
router.get("/all", rbac("admin", "verifier", "auditor"), getAllClaims);
router.get("/my", policyholderAuth, getMyClaims);
router.get("/:id", flexibleAuth("policyholder", "verifier", "admin", "auditor"), getClaimById);
// Assign / decide / settle / flag are signed on-chain by staff wallets and read
// back from the chain, so they have no endpoints here. Only the verifier's
// written remark (whose hash is on-chain) is stored in the database.
router.patch("/:id/remark", rbac("verifier"), saveRemark);

module.exports = router;
