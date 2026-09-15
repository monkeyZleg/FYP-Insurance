const {
  submitClaimOnChain,
  getClaimAuditTrail,
  verifyHash,
  getClaimOnChain,
} = require("../services/blockchainService");

async function submitToBlockchain(req, res) {
  const { documentHash, claimType } = req.body;

  try {
    const result = await submitClaimOnChain(documentHash, claimType);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAuditTrail(req, res) {
  const { claimId } = req.params;

  try {
    const events = await getClaimAuditTrail(claimId);
    const formatted = events.map((e) => {
      const parsed = e.fragment ? e : null;
      return {
        action: parsed?.eventName || "Unknown",
        txHash: e.transactionHash,
        blockNumber: e.blockNumber,
        timestamp: new Date().toISOString(),
        performedBy: parsed?.args?.[1] || "unknown",
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function verifyDocumentHash(req, res) {
  const { claimId } = req.params;
  const { hash } = req.query;

  try {
    const isValid = await verifyHash(claimId, hash);
    res.json({ claimId, hash, isValid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBlockchainClaim(req, res) {
  const { claimId } = req.params;

  try {
    const claim = await getClaimOnChain(claimId);
    res.json({
      claimId: claim.claimId,
      policyHolder: claim.policyHolder,
      documentHash: claim.documentHash,
      claimType: claim.claimType,
      submittedAt: Number(claim.submittedAt),
      status: Number(claim.status),
      assignedVerifier: claim.assignedVerifier,
      verifierRemark: claim.verifierRemark,
      lastUpdatedAt: Number(claim.lastUpdatedAt),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  submitToBlockchain,
  getAuditTrail,
  verifyDocumentHash,
  getBlockchainClaim,
};
