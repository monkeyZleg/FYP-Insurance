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

function toDateSeconds(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
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

async function getPolicyDetails(onChainPolicyId) {
  const contract = getPolicyRegistryReadOnly();
  const p = await contract.getPolicy(onChainPolicyId);
  return {
    holderId: p.holderId,
    policyType: p.policyType,
    planId: Number(p.planId),
    startDate: new Date(Number(p.startDate) * 1000).toISOString(),
    endDate: new Date(Number(p.endDate) * 1000).toISOString(),
    mode: Number(p.mode),
    totalInstalments: Number(p.totalInstalments),
    paidInstalments: Number(p.paidInstalments),
    payDeadline: p.payDeadline > 0n ? new Date(Number(p.payDeadline) * 1000).toISOString() : null,
    previousPolicyId: p.previousPolicyId.toString(),
    premiumRM: Number(p.premium) / 100,
  };
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
  getPolicyDetails,
  checkEligibility,
  POLICY_STATUS_NAMES,
  REASON_NAMES,
  ChainError,
};
