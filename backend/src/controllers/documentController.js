const db = require("../services/db");

async function getDocumentsByClaim(req, res) {
  const { claimId } = req.params;

  // The file bytes stay in the database; only the listing goes to the page.
  const docs = await db.query(
    "SELECT id, claim_id, file_name, mime_type, file_hash, uploaded_at FROM documents WHERE claim_id = $1 ORDER BY uploaded_at DESC",
    [claimId]
  );
  res.json({ documents: docs });
}

module.exports = { getDocumentsByClaim };
