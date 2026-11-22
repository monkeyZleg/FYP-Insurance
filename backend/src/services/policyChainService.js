const { ethers } = require("ethers");
const { getPolicyRegistry, getPolicyRegistryReadOnly, decodeContractError } = require("./relayerService");
const { PAYMENT_MODE_ENUM, POLICY_TYPE_ENUM } = require("../constants/policyPlans");

class ChainError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

async function callRelayer(contract, fn, args) {
  try {
    const tx = await contract[fn](...args);
    return await tx.wait();
  } catch (err) {
    const decoded = decodeContractError(err, contract);
    if (decoded) throw new ChainError(decoded.code, `${fn} reverted: ${decoded.code}`);
    throw err;
  }
}

const POLICY_STATUS_NAMES = ["PendingPayment", "Active", "GracePeriod", "Lapsed", "Expired"];
const REASON_NAMES = [
  "OK",
  "POLICY_NOT_FOUND",
  "WRONG_OWNER",
  "TYPE_MISMATCH",
  "OUTSIDE_COVERAGE_PERIOD",
  "INVALID_DATE",
  "POLICY_NOT_ACTIVE",
  "POLICY_LAPSED",
  "POLICY_EXPIRED",
];

// Claim forms send a calendar date (YYYY-MM-DD) with no time of day. Read it
// as midnight Malaysia time so "today" is never in the future for a local
// user, and so the same date always gives the same on-chain timestamp (the
// duplicate-claim key depends on it).
function toDateSeconds(dateStr) {
  return Math.floor(new Date(`${String(dateStr).slice(0, 10)}T00:00:00+08:00`).getTime() / 1000);
}

function randomRefHash() {
  return ethers.hexlify(ethers.randomBytes(32));
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

async function createPolicyOnChain(holderId, policyType, planId, paymentMode, instalments, premiumRM) {
  const contract = getPolicyRegistry();
  const receipt = await callRelayer(contract, "createPolicy", [
    holderId,
    POLICY_TYPE_ENUM[policyType],
    planId,
    PAYMENT_MODE_ENUM[paymentMode],
    instalments,
    Math.round(premiumRM * 100), // RM -> sen
  ]);
  const args = findEventArgs(receipt, contract, "PolicyCreated");
  return { onChainPolicyId: args?.policyId?.toString(), txHash: receipt.hash };
}

async function recordPaymentOnChain(onChainPolicyId, amountRM) {
  const contract = getPolicyRegistry();
  const refHash = randomRefHash();
  const receipt = await callRelayer(contract, "recordPayment", [onChainPolicyId, Math.round(amountRM * 100), refHash]);
  return { txHash: receipt.hash, refHash };
}

async function renewPolicyOnChain(oldOnChainPolicyId, paymentMode, instalments, premiumRM) {
  const contract = getPolicyRegistry();
  const receipt = await callRelayer(contract, "renewPolicy", [
    oldOnChainPolicyId,
    PAYMENT_MODE_ENUM[paymentMode],
    instalments,
    Math.round(premiumRM * 100),
  ]);
  const args = findEventArgs(receipt, contract, "PolicyRenewed");
  return { onChainPolicyId: args?.newPolicyId?.toString(), txHash: receipt.hash };
}

async function getEffectiveStatus(onChainPolicyId) {
  const contract = getPolicyRegistryReadOnly();
  const status = await contract.effectiveStatus(onChainPolicyId);
  return POLICY_STATUS_NAMES[Number(status)];
}

const POLICY_TYPE_NAMES = Object.keys(POLICY_TYPE_ENUM); // index = on-chain enum value
const PAYMENT_MODE_NAMES = Object.keys(PAYMENT_MODE_ENUM);

// Dates shown to users are calendar dates in Malaysia time (UTC+8), the same
// convention the claim form uses for incident dates.
function toMyDate(seconds) {
  return new Date((Number(seconds) + 8 * 3600) * 1000).toISOString().slice(0, 10);
}

/** One policy as the contract holds it, plus its status computed at read time. */
async function getPolicyOnChain(onChainPolicyId) {
  const contract = getPolicyRegistryReadOnly();
  const [p, status] = await Promise.all([contract.getPolicy(onChainPolicyId), contract.effectiveStatus(onChainPolicyId)]);
  return {
    onChainPolicyId: String(onChainPolicyId),
    holderId: p.holderId,
    policyType: POLICY_TYPE_NAMES[Number(p.policyType)],
    planId: Number(p.planId),
    startDate: toMyDate(p.startDate),
    endDate: toMyDate(p.endDate),
    paymentMode: PAYMENT_MODE_NAMES[Number(p.mode)],
    totalInstalments: Number(p.totalInstalments),
    paidInstalments: Number(p.paidInstalments),
    payDeadline: p.payDeadline > 0n ? toMyDate(p.payDeadline) : null,
    previousOnChainPolicyId: p.previousPolicyId > 0n ? p.previousPolicyId.toString() : null,
    premiumRM: Number(p.premium) / 100,
    status: POLICY_STATUS_NAMES[Number(status)],
  };
}

async function getPoliciesOnChain(ids) {
  return Promise.all(ids.map((id) => getPolicyOnChain(id)));
}

/**
 * Transaction that created each policy, from PolicyCreated (new purchases) and
 * PolicyRenewed (renewals) events. Returns Map(policyId -> txHash).
 */
async function getPolicyCreateTxHashes(ids) {
  const contract = getPolicyRegistryReadOnly();
  const wanted = ids && ids.length ? ids : null;
  const [created, renewed] = await Promise.all([
    contract.queryFilter(contract.filters.PolicyCreated(wanted)),
    contract.queryFilter(contract.filters.PolicyRenewed(null, wanted)),
  ]);
  const map = new Map();
  for (const e of created) map.set(e.args.policyId.toString(), e.transactionHash);
  for (const e of renewed) map.set(e.args.newPolicyId.toString(), e.transactionHash);
  return map;
}

/** Every payment recorded for a policy, read from PaymentRecorded events, oldest first. */
async function getPaymentHistory(onChainPolicyId) {
  const contract = getPolicyRegistryReadOnly();
  const events = await contract.queryFilter(contract.filters.PaymentRecorded(onChainPolicyId));
  const withTime = await Promise.all(
    events.map(async (e) => {
      const block = await e.getBlock();
      return {
        instalmentNumber: Number(e.args.instalmentNumber),
        amountRM: Number(e.args.amount) / 100,
        refHash: e.args.refHash,
        txHash: e.transactionHash,
        blockNumber: e.blockNumber,
        paidAt: new Date(block.timestamp * 1000).toISOString(),
      };
    })
  );
  return withTime.sort((a, b) => a.blockNumber - b.blockNumber);
}

async function checkEligibility(onChainPolicyId, holderId, insurancePolicyType, incidentDate) {
  const contract = getPolicyRegistryReadOnly();
  const [ok, reason] = await contract.isEligible(
    onChainPolicyId,
    holderId,
    POLICY_TYPE_ENUM[insurancePolicyType],
    toDateSeconds(incidentDate)
  );
  return { eligible: ok, reasonCode: REASON_NAMES[Number(reason)] };
}

module.exports = {
  createPolicyOnChain,
  recordPaymentOnChain,
  renewPolicyOnChain,
  getEffectiveStatus,
  getPolicyOnChain,
  getPoliciesOnChain,
  getPolicyCreateTxHashes,
  getPaymentHistory,
  checkEligibility,
  POLICY_STATUS_NAMES,
  REASON_NAMES,
  ChainError,
};
