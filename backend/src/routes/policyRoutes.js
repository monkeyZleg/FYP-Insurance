const express = require("express");
const router = express.Router();
const policyholderAuth = require("../middleware/policyholderAuth");
const {
  listPlans,
  createPolicy,
  recordPayment,
  renewPolicy,
  getMyPolicies,
  getEligibility,
} = require("../controllers/policyController");

router.get("/plans", listPlans);
router.get("/my", policyholderAuth, getMyPolicies);
router.post("/", policyholderAuth, createPolicy);
router.post("/:id/pay", policyholderAuth, recordPayment);
router.post("/:id/renew", policyholderAuth, renewPolicy);
router.get("/:id/eligibility", policyholderAuth, getEligibility);

module.exports = router;
