const { ethers } = require("ethers");
const supabase = require("../services/supabaseService");
const { generateDocumentHash } = require("../services/hashService");
const { submitClaimOnChain, ChainError } = require("../services/blockchainService");
const { CLAIM_TO_POLICY_TYPE } = require("../constants/insuranceMap");

/**
 * Policyholder claim submission (hybrid signing model). Accepts the claim
 * form and files in one multipart request: uploads documents, computes
 * per-file SHA-256 hashes (used directly as the on-chain bytes32
 * docHashes), and — for insurance types that map to an on-chain
 * PolicyType (health/life/transportation → medical/life/motor) — submits
 * the claim via the relayer against the policyholder's own policy.
 * Flight claims have no policy plan in this module's scope (see
 * constants/insuranceMap.js) and are recorded off-chain only.
 */
async function createClaim(req, res) {
  const { policyId, insuranceType, claimType, description, incidentDate } = req.body;
  let details = {};
  try {
    details = req.body.details ? JSON.parse(req.body.details) : {};
  } catch {
    return res.status(400).json({ error: "details must be valid JSON" });
  }

  if (!claimType || !incidentDate)
    return res.status(400).json({ error: "claimType and incidentDate are required" });

  const files = req.files || [];
  const docHashes = files.map((f) => generateDocumentHash(f.buffer));
  const detailsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(details)));

  const mappedPolicyType = CLAIM_TO_POLICY_TYPE[insuranceType];
  let onChain = null;

  if (mappedPolicyType) {
    if (!policyId) return res.status(400).json({ error: "policyId is required for this insurance type" });
    if (docHashes.length === 0) return res.status(400).json({ error: "At least one document is required" });

    const { data: policy, error: policyErr } = await supabase
      .from("policies")
      .select("on_chain_policy_id")
      .eq("id", policyId)
      .eq("holder_id", req.user.holderId)
      .single();

    if (policyErr || !policy) return res.status(404).json({ error: "Policy not found" });

    try {
      onChain = await submitClaimOnChain(
        req.user.holderId,
        policy.on_chain_policy_id,
        mappedPolicyType,
        incidentDate,
        docHashes,
        detailsHash
      );
    } catch (err) {
      if (err instanceof ChainError)
        return res.status(400).json({ error: err.code, message: err.message });
      return res.status(500).json({ error: err.message });
    }
  }

  const { data: claim, error } = await supabase
    .from("claims")
    .insert({
      on_chain_claim_id: onChain?.onChainClaimId || null,
      submit_tx_hash: onChain?.txHash || null,
      policy_id: policyId || null,
      policyholder_id: req.user.id,
      holder_id: req.user.holderId,
      insurance_type: insuranceType || null,
      claim_type: claimType,
      description,
      incident_date: incidentDate,
      details,
      details_hash: detailsHash,
      doc_hashes: docHashes,
      status: "Submitted",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const documents = [];
  for (const file of files) {
    const filePath = `claims/${claim.id}/${Date.now()}_${file.originalname}`;
    const { error: uploadErr } = await supabase.storage
      .from("claim-documents")
      .upload(filePath, file.buffer, { contentType: file.mimetype });
    if (uploadErr) continue;

    const { data: doc } = await supabase
      .from("documents")
      .insert({
        claim_id: claim.id,
        file_name: file.originalname,
        file_path: filePath,
        file_hash: generateDocumentHash(file.buffer),
      })
      .select()
      .single();
    if (doc) documents.push(doc);
  }

  res.status(201).json({ claim, documents, txHash: onChain?.txHash || null });
}

async function getClaimById(req, res) {
  const { id } = req.params;

  const { data: claim, error } = await supabase
    .from("claims")
    .select("*, policyholder:users!policyholder_id(*), verifier:users!assigned_verifier_id(*)")
    .eq("id", id)
    .single();

  if (error || !claim)
    return res.status(404).json({ error: "Claim not found" });

  if (req.user.role === "policyholder" && claim.holder_id !== req.user.holderId)
    return res.status(403).json({ error: "Not your claim" });

  res.json({ claim });
}

async function getMyClaims(req, res) {
  const { data: claims, error } = await supabase
    .from("claims")
    .select("*")
    .eq("holder_id", req.user.holderId)
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claims });
}

async function getPendingClaims(req, res) {
  const { data: claims, error } = await supabase
    .from("claims")
    .select("*, policyholder:users!policyholder_id(full_name, email)")
    .eq("status", "Submitted")
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claims });
}

async function getAllClaims(req, res) {
  const { data: claims, error } = await supabase
    .from("claims")
    .select("*, policyholder:users!policyholder_id(full_name, email)")
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claims });
}

/**
 * These mirror-update endpoints (assign/status/settle/flag) are called
 * AFTER the staff member's own MetaMask wallet has already signed and
 * confirmed the corresponding assignVerifier/decideClaim/settleClaim/
 * flagClaim transaction directly against ClaimRegistry from the frontend
 * (permission matrix, smart-contract-spec-hybrid.md Section 3) — the
 * backend never signs staff actions. Each endpoint just records the
 * resulting tx hash and off-chain mirror state.
 */

async function assignClaim(req, res) {
  const { id } = req.params;
  const { verifierId, txHash } = req.body;

  const { data, error } = await supabase
    .from("claims")
    .update({
      assigned_verifier_id: verifierId,
      assign_tx_hash: txHash || null,
      status: "UnderReview",
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claim: data });
}

async function updateClaimStatus(req, res) {
  const { id } = req.params;
  const { status, remark, reasonCode, txHash } = req.body;

  if (!["Approved", "Rejected"].includes(status))
    return res.status(400).json({ error: "Status must be Approved or Rejected" });

  const { data: claim, error: fetchErr } = await supabase
    .from("claims")
    .select("assigned_verifier_id")
    .eq("id", id)
    .single();

  if (fetchErr || !claim)
    return res.status(404).json({ error: "Claim not found" });
  if (claim.assigned_verifier_id !== req.user.id)
    return res.status(403).json({ error: "Not assigned to this claim" });

  const { data, error } = await supabase
    .from("claims")
    .update({
      status,
      verifier_remark: remark,
      reason_code: reasonCode ?? null,
      decided_by_wallet: req.user.wallet || null,
      decide_tx_hash: txHash || null,
      decided_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claim: data });
}

async function settleClaim(req, res) {
  const { id } = req.params;
  const { txHash } = req.body;

  const { data: claim, error: fetchErr } = await supabase.from("claims").select("status").eq("id", id).single();
  if (fetchErr || !claim) return res.status(404).json({ error: "Claim not found" });
  if (claim.status !== "Approved") return res.status(400).json({ error: "Only approved claims can be settled" });

  const { data, error } = await supabase
    .from("claims")
    .update({
      status: "Settled",
      settle_tx_hash: txHash || null,
      settled_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claim: data });
}

async function flagClaim(req, res) {
  const { id } = req.params;
  const { txHash } = req.body;

  const { data, error } = await supabase
    .from("claims")
    .update({ flagged: true, flag_tx_hash: txHash || null, last_updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claim: data });
}

module.exports = {
  createClaim,
  getClaimById,
  getMyClaims,
  getPendingClaims,
  getAllClaims,
  assignClaim,
  updateClaimStatus,
  settleClaim,
  flagClaim,
};
