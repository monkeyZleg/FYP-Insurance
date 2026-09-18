const {
  getClaimAuditTrail,
  verifyDocumentOnChain,
  getClaimOnChain,
} = require("../services/blockchainService");

async function getAuditTrail(req, res) {
  const { claimId } = req.params;

  try {
    const events = await getClaimAuditTrail(claimId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function verifyDocumentHash(req, res) {
  const { claimId } = req.params;
  const { hash } = req.query;

  try {
    const isValid = await verifyDocumentOnChain(claimId, hash);
    res.json({ claimId, hash, isValid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBlockchainClaim(req, res) {
  const { claimId } = req.params;

  try {
    const claim = await getClaimOnChain(claimId);
    res.json(claim);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAuditTrail,
  verifyDocumentHash,
  getBlockchainClaim,
};
