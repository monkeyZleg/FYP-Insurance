const supabase = require("../services/supabaseService");
const { submitClaimOnChain } = require("../services/blockchainService");

async function createClaim(req, res) {
  const {
    policyId,
    insuranceType,
    claimType,
    description,
    incidentDate,
    documentHash,
    details,
  } = req.body;

  const { data: claim, error } = await supabase
    .from("claims")
    .insert({
      policy_id: policyId || null,
      policyholder_id: req.user.id,
      insurance_type: insuranceType || null,
      claim_type: claimType,
      description,
      incident_date: incidentDate,
      document_hash: documentHash,
      details: details || {},
      status: "Pending",
    })
    .select()
    .single();

  if (error)
    return res.status(400).json({ error: error.message });

  res.status(201).json({ claim });
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

  res.json({ claim });
}

async function getClaimsByWallet(req, res) {
  const { data: claims, error } = await supabase
    .from("claims")
    .select("*")
    .eq("policyholder_id", req.user.id)
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claims });
}

async function getPendingClaims(req, res) {
  const { data: claims, error } = await supabase
    .from("claims")
    .select("*, policyholder:users!policyholder_id(full_name, wallet_address)")
    .eq("status", "Pending")
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claims });
}

async function getAllClaims(req, res) {
  const { data: claims, error } = await supabase
    .from("claims")
    .select("*, policyholder:users!policyholder_id(full_name, wallet_address)")
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claims });
}

async function updateClaimStatus(req, res) {
  const { id } = req.params;
  const { status, remark } = req.body;

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
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claim: data });
}

async function assignClaim(req, res) {
  const { id } = req.params;
  const { verifierId } = req.body;

  const { data, error } = await supabase
    .from("claims")
    .update({
      assigned_verifier_id: verifierId,
      status: "UnderReview",
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claim: data });
}

async function saveTransactionHash(req, res) {
  const { id } = req.params;
  const { txHash, blockchainClaimId } = req.body;

  const { data, error } = await supabase
    .from("claims")
    .update({ tx_hash: txHash, blockchain_claim_id: blockchainClaimId })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ claim: data });
}

module.exports = {
  createClaim,
  getClaimById,
  getClaimsByWallet,
  getPendingClaims,
  getAllClaims,
  updateClaimStatus,
  assignClaim,
  saveTransactionHash,
};
