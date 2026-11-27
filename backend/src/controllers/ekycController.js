const db = require("../services/db");
const { runChecks, maskIc, hashIc } = require("../services/ekycService");

// Never send the image bytes in a listing.
const SUMMARY = `
  SELECT e.id, e.user_id, e.full_name, e.ic_number_masked, e.date_of_birth, e.gender,
         e.ic_back IS NOT NULL AS has_ic_back, e.ic_front_hash, e.ic_back_hash, e.selfie_hash,
         e.checks, e.status, e.reject_reason, e.reviewed_at, e.submitted_at,
         json_build_object('full_name', u.full_name, 'email', u.email) AS account
  FROM ekyc_submissions e JOIN users u ON u.id = e.user_id`;

/** POST /api/ekyc — policyholder submits IC details + photos (multipart). */
async function submitEkyc(req, res) {
  const { fullName, icNumber } = req.body;
  const f = req.files || {};
  const files = { icFront: f.icFront?.[0], icBack: f.icBack?.[0], selfie: f.selfie?.[0] };

  const live = await db.one(
    "SELECT status FROM ekyc_submissions WHERE user_id = $1 AND status IN ('pending','verified')",
    [req.user.userId]
  );
  if (live) return res.status(409).json({ error: `Your eKYC is already ${live.status}` });

  const account = await db.one("SELECT full_name FROM users WHERE id = $1", [req.user.userId]);
  const { errors, checks, parsed, hashes } = runChecks({
    fullName,
    icNumber,
    accountName: account?.full_name,
    files,
  });
  if (errors.length) return res.status(400).json({ error: errors[0], errors, checks });

  // Demo shortcut: with EKYC_AUTO_APPROVE=true a submission that passes every
  // automatic check (including the name match) is verified straight away.
  const autoApprove = process.env.EKYC_AUTO_APPROVE === "true" && checks.nameMatchesAccount;

  try {
    const row = await db.one(
      `INSERT INTO ekyc_submissions
         (user_id, full_name, ic_number_masked, ic_hash, date_of_birth, gender,
          ic_front, ic_front_mime, ic_front_hash, ic_back, ic_back_mime, ic_back_hash,
          selfie, selfie_mime, selfie_hash, checks, status, reviewed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id, status`,
      [
        req.user.userId,
        fullName.trim(),
        maskIc(parsed.digits),
        hashIc(parsed.digits),
        parsed.dob,
        parsed.gender,
        files.icFront.buffer,
        files.icFront.mimetype,
        hashes.icFront,
        files.icBack?.buffer ?? null,
        files.icBack?.mimetype ?? null,
        hashes.icBack ?? null,
        files.selfie.buffer,
        files.selfie.mimetype,
        hashes.selfie,
        checks,
        autoApprove ? "verified" : "pending",
        autoApprove ? new Date() : null,
      ]
    );
    res.status(201).json({ submission: row, checks });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "This IC number is already linked to another account" });
    throw err;
  }
}

/** GET /api/ekyc/me — the policyholder's latest submission (or null). */
async function getMyEkyc(req, res) {
  const row = await db.one(`${SUMMARY} WHERE e.user_id = $1 ORDER BY e.submitted_at DESC LIMIT 1`, [req.user.userId]);
  res.json({ submission: row, verified: row?.status === "verified" });
}

/** GET /api/ekyc?status=pending — admin review queue. */
async function listEkyc(req, res) {
  const { status } = req.query;
  const rows = status
    ? await db.query(`${SUMMARY} WHERE e.status = $1 ORDER BY e.submitted_at`, [status])
    : await db.query(`${SUMMARY} ORDER BY e.submitted_at DESC`);
  res.json({ submissions: rows });
}

const FILE_COLUMNS = { "ic-front": "ic_front", "ic-back": "ic_back", selfie: "selfie" };

/** GET /api/ekyc/:id/file/:kind — admin views one image (ic-front | ic-back | selfie). */
async function getEkycFile(req, res) {
  const col = FILE_COLUMNS[req.params.kind];
  if (!col) return res.status(400).json({ error: "kind must be ic-front, ic-back or selfie" });
  const row = await db.one(`SELECT ${col} AS data, ${col}_mime AS mime FROM ekyc_submissions WHERE id = $1`, [req.params.id]);
  if (!row?.data) return res.status(404).json({ error: "File not found" });
  res.set("Content-Type", row.mime).set("Cache-Control", "no-store").send(row.data);
}

/** PATCH /api/ekyc/:id/review — admin verifies or rejects. Body: { decision, reason? } */
async function reviewEkyc(req, res) {
  const { decision, reason } = req.body;
  if (!["verified", "rejected"].includes(decision))
    return res.status(400).json({ error: "decision must be 'verified' or 'rejected'" });
  if (decision === "rejected" && !String(reason || "").trim())
    return res.status(400).json({ error: "A reason is required when rejecting" });

  const row = await db.one(
    `UPDATE ekyc_submissions
       SET status = $2, reject_reason = $3, reviewed_by = $4, reviewed_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status, reject_reason, reviewed_at`,
    [req.params.id, decision, decision === "rejected" ? reason.trim() : null, req.user.id]
  );
  if (!row) return res.status(404).json({ error: "No pending submission with that id" });
  res.json({ submission: row });
}

/**
 * Middleware: only let verified policyholders through. Put it after
 * policyholderAuth on any route that should need eKYC, e.g.
 *   router.post("/", policyholderAuth, requireEkyc, createPolicy);
 */
async function requireEkyc(req, res, next) {
  const row = await db.one("SELECT 1 FROM ekyc_submissions WHERE user_id = $1 AND status = 'verified'", [req.user.userId]);
  if (!row) return res.status(403).json({ error: "Please complete eKYC identity verification first", code: "EKYC_REQUIRED" });
  next();
}

module.exports = { submitEkyc, getMyEkyc, listEkyc, getEkycFile, reviewEkyc, requireEkyc };
