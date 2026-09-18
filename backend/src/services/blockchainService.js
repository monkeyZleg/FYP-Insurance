const { ethers } = require("ethers");
const { getClaimRegistry, getClaimRegistryReadOnly, decodeContractError } = require("./relayerService");
const { POLICY_TYPE_ENUM } = require("../constants/policyPlans");
const { REASON_NAMES } = require("./policyChainService");

const CLAIM_STATUS_NAMES = ["Submitted", "UnderReview", "Approved", "Rejected", "Settled"];

class ChainError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

function toDateSeconds(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function findEventArgs(receipt, contract, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === eventName) return parsed.args;
    } catch {
      // log from a different contract/event — ignore
    }
  }
  return null;
}

/**
 * Relayer-signed claim submission (smart-contract-spec-hybrid.md Section 5.2).
 * `policyType` must be one of the three PolicyType-mapped types (motor,
 * medical, life) — Flight has no on-chain PolicyType and no policy plan
 * in this module's scope, so flight claims are never submitted on-chain
 * and are recorded off-chain only (see claimController.js).
 */
async function submitClaimOnChain(holderId, onChainPolicyId, policyType, incidentDate, docHashes, detailsHash) {
  const contract = getClaimRegistry();
  let receipt;
  try {
    const tx = await contract.submitClaim(
      holderId,
      onChainPolicyId,
      POLICY_TYPE_ENUM[policyType],
      toDateSeconds(incidentDate),
      docHashes,
      detailsHash
    );
    receipt = await tx.wait();
  } catch (err) {
    const decoded = decodeContractError(err, contract);
    if (decoded?.code === "NotEligible") {
      const reasonCode = REASON_NAMES[Number(decoded.args[0])] || "UNKNOWN";
      throw new ChainError(reasonCode, `Claim not eligible: ${reasonCode}`);
    }
    if (decoded) throw new ChainError(decoded.code, `submitClaim reverted: ${decoded.code}`);
    throw err;
  }
  const args = findEventArgs(receipt, contract, "ClaimSubmitted");
  return { onChainClaimId: args?.claimId?.toString(), txHash: receipt.hash };
}

async function getClaimOnChain(onChainClaimId) {
  const contract = getClaimRegistryReadOnly();
  const c = await contract.getClaim(onChainClaimId);
  return {
    holderId: c.holderId,
    policyId: c.policyId.toString(),
    claimType: Number(c.claimType),
    incidentDate: new Date(Number(c.incidentDate) * 1000).toISOString(),
    submittedAt: new Date(Number(c.submittedAt) * 1000).toISOString(),
    detailsHash: c.detailsHash,
    docHashes: c.docHashes,
    assignedVerifier: c.assignedVerifier,
    decidedBy: c.decidedBy,
    decidedAt: c.decidedAt > 0n ? new Date(Number(c.decidedAt) * 1000).toISOString() : null,
    remarkHash: c.remarkHash,
    reasonCode: Number(c.reasonCode),
    flagged: c.flagged,
    status: CLAIM_STATUS_NAMES[Number(c.status)],
  };
}

async function verifyDocumentOnChain(onChainClaimId, docHash) {
  const contract = getClaimRegistryReadOnly();
  return await contract.verifyDocument(onChainClaimId, docHash);
}

/** Rebuilds a claim's full audit trail from emitted events only (no DB trust needed). */
async function getClaimAuditTrail(onChainClaimId) {
  const contract = getClaimRegistryReadOnly();
  const filters = [
    contract.filters.ClaimSubmitted(onChainClaimId),
    contract.filters.VerifierAssigned(onChainClaimId),
    contract.filters.ClaimDecided(onChainClaimId),
    contract.filters.ClaimSettled(onChainClaimId),
    contract.filters.ClaimFlagged(onChainClaimId),
  ];
  const results = await Promise.all(filters.map((f) => contract.queryFilter(f)));
  const events = results.flat();

  const withBlocks = await Promise.all(
    events.map(async (e) => {
      const block = await e.getBlock();
      return {
        action: e.fragment?.name || "Unknown",
        txHash: e.transactionHash,
        blockNumber: e.blockNumber,
        timestamp: new Date(block.timestamp * 1000).toISOString(),
        performedBy:
          e.args?.verifier || e.args?.auditor || e.args?.holderId || ethers.ZeroAddress,
      };
    })
  );

  return withBlocks.sort((a, b) => a.blockNumber - b.blockNumber);
}

module.exports = {
  submitClaimOnChain,
  getClaimOnChain,
  verifyDocumentOnChain,
  getClaimAuditTrail,
  CLAIM_STATUS_NAMES,
  ChainError,
};
