const supabase = require("../services/supabaseService");
const { generateDocumentHash } = require("../services/hashService");
const crypto = require("crypto");

async function uploadDocuments(req, res) {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: "No files uploaded" });

  const { claimId } = req.body;
  const documents = [];
  const allBuffers = [];

  for (const file of req.files) {
    const fileHash = generateDocumentHash(file.buffer);
    const filePath = `claims/${claimId || "pending"}/${Date.now()}_${file.originalname}`;

    const { error: uploadErr } = await supabase.storage
      .from("claim-documents")
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadErr)
      return res.status(500).json({ error: `Upload failed: ${uploadErr.message}` });

    if (claimId) {
      const { data, error } = await supabase
        .from("documents")
        .insert({
          claim_id: claimId,
          file_name: file.originalname,
          file_path: filePath,
          file_hash: fileHash,
        })
        .select()
        .single();

      if (error)
        return res.status(500).json({ error: error.message });
      documents.push(data);
    }

    allBuffers.push(file.buffer);
  }

  const combinedHash =
    "0x" +
    crypto
      .createHash("sha256")
      .update(Buffer.concat(allBuffers))
      .digest("hex");

  res.status(201).json({ documents, documentHash: combinedHash });
}

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

module.exports = { uploadDocuments, getDocumentsByClaim };
