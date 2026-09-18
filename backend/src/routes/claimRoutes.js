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
  assignClaim,
  updateClaimStatus,
  settleClaim,
  flagClaim,
} = require("../controllers/claimController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", policyholderAuth, upload.array("files", 10), createClaim);
router.get("/pending", rbac("admin"), getPendingClaims);
router.get("/all", rbac("admin", "verifier", "auditor"), getAllClaims);
router.get("/my", policyholderAuth, getMyClaims);
router.get("/:id", flexibleAuth("policyholder", "verifier", "admin", "auditor"), getClaimById);
router.patch("/:id/assign", rbac("admin"), assignClaim);
router.patch("/:id/status", rbac("verifier"), updateClaimStatus);
router.patch("/:id/settle", rbac("admin"), settleClaim);
router.patch("/:id/flag", rbac("auditor"), flagClaim);

module.exports = router;
