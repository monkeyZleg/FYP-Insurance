const db = require("../services/db");
const { generateDocumentHash, hashDetails, hashText } = require("../services/hashService");
const { submitClaimOnChain, getClaimOnChain, ChainError } = require("../services/blockchainService");
const { buildClaimViews, checkIntegrity } = require("../services/claimView");
const { CLAIM_TO_POLICY_TYPE, CLAIM_AMOUNT_FIELD } = require("../constants/insuranceMap");

/*
 * Where claim data lives
 *   blockchain  ClaimRegistry: status, assigned verifier, decision, approved
 *               payout, service charge, net payout, document and form hashes,
 *               flags, and the event history. Staff sign these steps with
 *               their own wallets in the browser, so the backend has nothing
 *               to mirror after them.
 *   database    the case file only: who filed it, the form the policyholder
 *               filled in, the uploaded files, and the verifier's written
 *               remark (the chain keeps its hash). Personal details stay here
 *               because a public chain can't delete them.
 * Reads join the two in services/claimView.js.
 */

const CLAIM_SELECT = `
  SELECT c.id, c.on_chain_claim_id, c.policy_id, c.policyholder_id, c.holder_id, c.insurance_type, c.claim_type,
         c.description, c.incident_date, c.details, c.verifier_remark,
         json_build_object('full_name', u.full_name, 'email', u.email) AS policyholder
  FROM claims c LEFT JOIN users u ON u.id = c.policyholder_id`;

function chainReadFailed(res, err) {
  return res.status(503).json({ error: `Could not read the blockchain: ${err.shortMessage || err.message}` });
}

/**
 * Policyholder claim submission (hybrid signing model). Accepts the claim
 * form and files in one multipart request: uploads documents, computes
 * per-file SHA-256 hashes (used directly as the on-chain bytes32
 * docHashes), and submits the claim via the relayer against the
 * policyholder's own policy. All four insurance types (car/motor/travel/
 * health) have a matching on-chain PolicyType (constants/insuranceMap.js).
 * The amount stated on the form goes on-chain as claimedAmount, which caps
 * the payout a verifier can later approve.
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

  const mappedPolicyType = CLAIM_TO_POLICY_TYPE[insuranceType];
  if (!mappedPolicyType) return res.status(400).json({ error: "Unknown insurance type" });
  if (!policyId) return res.status(400).json({ error: "policyId is required" });

  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: "At least one document is required" });

  const docHashes = files.map((f) => generateDocumentHash(f.buffer));
  const detailsHash = hashDetails(details);

  const claimedAmount = Number(details[CLAIM_AMOUNT_FIELD[insuranceType]]) || 0;
  if (claimedAmount < 0) return res.status(400).json({ error: "The amount claimed can't be negative" });

  const policy = await db.one("SELECT on_chain_policy_id FROM policies WHERE id = $1 AND holder_id = $2", [
    policyId,
    req.user.holderId,
  ]);

  if (!policy) return res.status(404).json({ error: "Policy not found" });

  let onChain;
  try {
    onChain = await submitClaimOnChain(
      req.user.holderId,
      policy.on_chain_policy_id,
      mappedPolicyType,
      incidentDate,
      docHashes,
      detailsHash,
      claimedAmount
    );
  } catch (err) {
    if (err instanceof ChainError) return res.status(400).json({ error: err.code, message: err.message });
    return res.status(500).json({ error: err.message });
  }

  let row;
  const documents = [];
  try {
    row = await db.one(
      `INSERT INTO claims (on_chain_claim_id, policy_id, policyholder_id, holder_id, insurance_type, claim_type, description, incident_date, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [onChain.onChainClaimId, policyId, req.user.userId, req.user.holderId, insuranceType, claimType, description, incidentDate, details]
    );
    // The files themselves are stored in the database next to their hash.
    for (const file of files) {
      documents.push(
        await db.one(
          `INSERT INTO documents (claim_id, file_name, mime_type, file_hash, file_data) VALUES ($1, $2, $3, $4, $5)
           RETURNING id, claim_id, file_name, mime_type, file_hash, uploaded_at`,
          [row.id, file.originalname, file.mimetype, generateDocumentHash(file.buffer), file.buffer]
        )
      );
    }
  } catch (err) {
    return res.status(500).json({
      error: `Claim #${onChain.onChainClaimId} was recorded on-chain, but saving its case file failed: ${err.message}`,
    });
  }

  try {
    const [claim] = await buildClaimViews([row]);
    return res.status(201).json({ claim, documents, txHash: onChain.txHash });
  } catch {
    // The claim is safely on-chain; only the read-back failed.
    return res.status(201).json({ claim: { ...row, status: "Submitted" }, documents, txHash: onChain.txHash });
  }
}

async function getClaimById(req, res) {
  const { id } = req.params;

  const row = await db.one(`${CLAIM_SELECT} WHERE c.id = $1`, [id]);
  if (!row) return res.status(404).json({ error: "Claim not found" });

  if (req.user.role === "policyholder" && row.holder_id !== req.user.holderId)
    return res.status(403).json({ error: "Not your claim" });

  try {
    const [claim] = await buildClaimViews([row]);
    if (!claim) return res.status(404).json({ error: "This claim has no blockchain record" });
    claim.integrity = await checkIntegrity(claim);
    res.json({ claim });
  } catch (err) {
    chainReadFailed(res, err);
  }
}

async function listClaims(res, query, filter) {
  let rows;
  try {
    rows = await query;
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  try {
    const claims = await buildClaimViews(rows);
    res.json({ claims: filter ? claims.filter(filter) : claims });
  } catch (err) {
    chainReadFailed(res, err);
  }
}

async function getMyClaims(req, res) {
  return listClaims(res, db.query(`${CLAIM_SELECT} WHERE c.holder_id = $1`, [req.user.holderId]));
}

async function getPendingClaims(req, res) {
  return listClaims(res, db.query(CLAIM_SELECT), (c) => c.status === "Submitted");
}

async function getAllClaims(req, res) {
  return listClaims(res, db.query(CLAIM_SELECT));
}

/**
 * Assigning, deciding, settling and flagging are signed by staff wallets
 * straight against ClaimRegistry (permission matrix,
 * smart-contract-spec-hybrid.md Section 3), and the claim's status is read
 * back from the chain, so none of them has a database endpoint.
 *
 * The one thing the chain can't hold is the verifier's written remark: only
 * its hash is on-chain. After deciding, the verifier's page sends the text
 * here. It is stored only if it hashes to exactly what the contract
 * recorded, and only from the verifier who made the decision.
 */
async function saveRemark(req, res) {
  const { id } = req.params;
  const remark = typeof req.body.remark === "string" ? req.body.remark : "";
  if (!remark.trim()) return res.status(400).json({ error: "remark is required" });

  const row = await db.one("SELECT id, on_chain_claim_id FROM claims WHERE id = $1", [id]);
  if (!row || row.on_chain_claim_id == null) return res.status(404).json({ error: "Claim not found" });

  let chain;
  try {
    chain = await getClaimOnChain(row.on_chain_claim_id);
  } catch (err) {
    return chainReadFailed(res, err);
  }

  if (!["Approved", "Rejected", "Settled"].includes(chain.status))
    return res.status(400).json({ error: "This claim has not been decided on-chain yet" });
  if (chain.decidedBy.toLowerCase() !== req.user.wallet)
    return res.status(403).json({ error: "Only the verifier who made the decision can add its remark" });
  if (hashText(remark) !== chain.remarkHash)
    return res.status(400).json({ error: "This remark does not match the hash recorded on-chain" });

  try {
    const data = await db.one("UPDATE claims SET verifier_remark = $2 WHERE id = $1 RETURNING id, verifier_remark", [id, remark]);
    res.json({ claim: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createClaim,
  getClaimById,
  getMyClaims,
  getPendingClaims,
  getAllClaims,
  saveRemark,
};
