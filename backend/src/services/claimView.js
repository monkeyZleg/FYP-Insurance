const db = require("./db");
const { getClaimsOnChain, getSubmitTxHashes } = require("./blockchainService");
const { hashDetails, generateDocumentHash } = require("./hashService");

/*
 * The blockchain is the record of a claim's transactions: status, assigned
 * verifier, decision, payout, service charge and net payout all live only in
 * ClaimRegistry. The database holds the case file (who filed it, the form
 * the policyholder filled in, uploaded files, the verifier's written remark).
 * This module joins the two into the claim object the frontend uses, so
 * nothing about a claim's progress is ever read from the database.
 */

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function loadVerifiers() {
  const data = await db.query("SELECT id, full_name, wallet_address FROM users WHERE role = 'verifier'");
  return new Map(data.map((u) => [String(u.wallet_address).toLowerCase(), u]));
}

function merge(row, chain, submitTx, verifiers) {
  const verifier = chain.assignedVerifier !== ZERO_ADDRESS ? verifiers.get(chain.assignedVerifier.toLowerCase()) : null;
  const decided = chain.status === "Approved" || chain.status === "Rejected" || chain.status === "Settled";
  return {
    // case file (database)
    id: row.id,
    on_chain_claim_id: row.on_chain_claim_id,
    policy_id: row.policy_id,
    policyholder_id: row.policyholder_id,
    holder_id: row.holder_id,
    insurance_type: row.insurance_type,
    claim_type: row.claim_type,
    description: row.description,
    incident_date: row.incident_date,
    details: row.details || {},
    verifier_remark: row.verifier_remark || null,
    policyholder: row.policyholder,
    // transaction record (blockchain)
    status: chain.status,
    submitted_at: chain.submittedAt,
    decided_at: chain.decidedAt,
    reason_code: decided ? chain.reasonCode : null,
    assigned_verifier_id: verifier?.id ?? null,
    verifier: verifier ? { full_name: verifier.full_name, wallet_address: verifier.wallet_address } : undefined,
    flagged: chain.flagged,
    details_hash: chain.detailsHash,
    doc_hashes: chain.docHashes,
    document_hash: chain.docHashes[0] ?? null,
    claimed_amount: chain.claimedAmountRM || null,
    approved_payout: chain.approvedPayoutRM || null,
    service_charge: chain.status === "Settled" ? chain.serviceChargeRM : null,
    net_payout: chain.status === "Settled" ? chain.netPayoutRM : null,
    submit_tx_hash: submitTx ?? null,
  };
}

/** Joins database claim rows with their on-chain records, newest first. */
async function buildClaimViews(rows) {
  const live = rows.filter((r) => r.on_chain_claim_id != null);
  if (live.length === 0) return [];
  const ids = live.map((r) => r.on_chain_claim_id);
  const [chains, txHashes, verifiers] = await Promise.all([getClaimsOnChain(ids), getSubmitTxHashes(ids), loadVerifiers()]);
  return live
    .map((row, i) => merge(row, chains[i], txHashes.get(String(row.on_chain_claim_id)), verifiers))
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
}

/**
 * Tamper check: recompute the hash of the stored form details and of the
 * stored files and compare them with what the contract recorded at submission.
 * The files are re-hashed from their bytes, so editing a stored file is caught.
 */
async function checkIntegrity(view) {
  const docs = await db.query("SELECT file_data FROM documents WHERE claim_id = $1", [view.id]);
  const stored = new Set(docs.map((d) => generateDocumentHash(d.file_data).toLowerCase()));
  const recorded = new Set(view.doc_hashes.map((h) => h.toLowerCase()));

  const offChainDetailsHash = hashDetails(view.details);
  const detailsMatch = offChainDetailsHash === view.details_hash;
  const documentsMatch = stored.size === recorded.size && [...recorded].every((h) => stored.has(h));

  return {
    detailsMatch,
    documentsMatch,
    offChainDetailsHash,
    onChainDetailsHash: view.details_hash,
    documentCount: stored.size,
    onChainDocumentCount: recorded.size,
  };
}

module.exports = { buildClaimViews, checkIntegrity };
