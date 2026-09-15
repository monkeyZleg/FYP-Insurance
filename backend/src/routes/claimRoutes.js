const express = require("express");
const router = express.Router();
const rbac = require("../middleware/rbacMiddleware");
const {
  createClaim,
  getClaimById,
  getClaimsByWallet,
  getPendingClaims,
  getAllClaims,
  updateClaimStatus,
  assignClaim,
  saveTransactionHash,
} = require("../controllers/claimController");

router.post("/", rbac("policyholder"), createClaim);
router.get("/pending", rbac("admin"), getPendingClaims);
router.get("/all", rbac("admin"), getAllClaims);
router.get("/my", rbac("policyholder"), getClaimsByWallet);
router.get(
  "/:id",
  rbac("policyholder", "verifier", "admin", "auditor"),
  getClaimById
);
router.patch("/:id/status", rbac("verifier"), updateClaimStatus);
router.patch("/:id/assign", rbac("admin"), assignClaim);
router.patch("/:id/tx", saveTransactionHash);

module.exports = router;
