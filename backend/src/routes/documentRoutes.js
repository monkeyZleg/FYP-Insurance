const express = require("express");
const router = express.Router();
const multer = require("multer");
const rbac = require("../middleware/rbacMiddleware");
const {
  uploadDocuments,
  getDocumentsByClaim,
} = require("../controllers/documentController");

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload",
  rbac("policyholder"),
  upload.array("files", 10),
  uploadDocuments
);
router.get(
  "/:claimId",
  rbac("policyholder", "verifier", "admin", "auditor"),
  getDocumentsByClaim
);

module.exports = router;
