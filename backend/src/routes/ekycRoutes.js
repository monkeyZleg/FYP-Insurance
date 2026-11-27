const express = require("express");
const router = express.Router();
const multer = require("multer");
const rbac = require("../middleware/rbacMiddleware");
const policyholderAuth = require("../middleware/policyholderAuth");
const { MAX_FILE_BYTES } = require("../services/ekycService");
const { submitEkyc, getMyEkyc, listEkyc, getEkycFile, reviewEkyc } = require("../controllers/ekycController");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 3 } });
const ekycFiles = upload.fields([
  { name: "icFront", maxCount: 1 },
  { name: "icBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

// Policyholder
router.post("/", policyholderAuth, (req, res, next) =>
  ekycFiles(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Each image must be 5 MB or smaller" : err.message });
    next();
  }),
  submitEkyc
);
router.get("/me", policyholderAuth, getMyEkyc);

// Admin review
router.get("/", rbac("admin"), listEkyc);
router.get("/:id/file/:kind", rbac("admin"), getEkycFile);
router.patch("/:id/review", rbac("admin"), reviewEkyc);

module.exports = router;
