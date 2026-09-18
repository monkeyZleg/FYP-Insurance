const supabase = require("../services/supabaseService");

async function getDocumentsByClaim(req, res) {
  const { claimId } = req.params;

  const { data: docs, error } = await supabase
    .from("documents")
    .select("*")
    .eq("claim_id", claimId)
    .order("uploaded_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ documents: docs });
}

module.exports = { getDocumentsByClaim };
