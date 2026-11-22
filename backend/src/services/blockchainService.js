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

// Claim forms send a calendar date (YYYY-MM-DD) with no time of day. Read it
// as midnight Malaysia time so "today" is never in the future for a local
// user, and so the same date always gives the same on-chain timestamp (the
// duplicate-claim key depends on it).
function toDateSeconds(dateStr) {
  return Math.floor(new Date(`${String(dateStr).slice(0, 10)}T00:00:00+08:00`).getTime() / 1000);
}

// Amounts live on-chain in sen (RM x 100).
function toSen(amountRM) {
  const n = Number(amountRM);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

function toRM(sen) {
  return Number(sen) / 100;
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
 * `policyType` is one of the four on-chain PolicyTypes (car, motor, travel,
 * health). `claimedAmountRM` is the amount stated on the claim form (0 when
 * the form leaves it blank); it is stored in sen and caps the payout the
 * verifier can approve.
 */
async function submitClaimOnChain(holderId, onChainPolicyId, policyType, incidentDate, docHashes, detailsHash, claimedAmountRM = 0) {
  const contract = getClaimRegistry();
  let receipt;
  try {
    const tx = await contract.submitClaim(
      holderId,
      onChainPolicyId,
      POLICY_TYPE_ENUM[policyType],
      toDateSeconds(incidentDate),
      docHashes,
      detailsHash,
      toSen(claimedAmountRM)
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
    claimId: String(onChainClaimId),
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
    claimedAmountRM: toRM(c.claimedAmount),
    approvedPayoutRM: toRM(c.approvedPayout),
    serviceChargeRM: toRM(c.serviceCharge),
    netPayoutRM: toRM(c.netPayout),
  };
}

/** Current on-chain service charge settings, amounts in RM. */
async function getServiceChargeOnChain() {
  const contract = getClaimRegistryReadOnly();
  const [s, total] = await Promise.all([contract.serviceCharge(), contract.totalServiceCharges()]);
  // Read by position: `s.flat` would be Array.prototype.flat, not the field.
  const [flat, rateBps, flatFee, minFee, maxFee, policyholderPays] = s;
  return {
    model: flat ? "flat" : "percent",
    rate: Number(rateBps) / 100,
    flat: toRM(flatFee),
    min: toRM(minFee),
    max: maxFee === 0n ? null : toRM(maxFee),
    payer: policyholderPays ? "policyholder" : "insurer",
    totalCollectedRM: toRM(total),
  };
}

/** Several claims at once, in the same order as `ids`. */
async function getClaimsOnChain(ids) {
  return Promise.all(ids.map((id) => getClaimOnChain(id)));
}

/**
 * Transaction hash of each claim's submission, read from ClaimSubmitted
 * events (one RPC call for any number of claims). Returns Map(claimId -> txHash).
 */
async function getSubmitTxHashes(ids) {
  const contract = getClaimRegistryReadOnly();
  const filter = contract.filters.ClaimSubmitted(ids && ids.length ? ids : null);
  const events = await contract.queryFilter(filter);
  return new Map(events.map((e) => [e.args.claimId.toString(), e.transactionHash]));
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
  getClaimsOnChain,
  getSubmitTxHashes,
  verifyDocumentOnChain,
  getClaimAuditTrail,
  getServiceChargeOnChain,
  CLAIM_STATUS_NAMES,
  ChainError,
};
