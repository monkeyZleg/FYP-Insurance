const { ethers } = require("ethers");

/*
 * Backend relayer wallet (smart-contract-spec-hybrid.md Section 1).
 * Policyholders never hold a wallet in this model — every on-chain write
 * that would otherwise be "signed by the policyholder" is instead signed
 * by this server-held key and attributed to the caller's pseudonymous
 * holderId. Keep RELAYER_PRIVATE_KEY secret (env var only, never committed).
 */

const POLICY_REGISTRY_ABI = [
  "function createPolicy(bytes32 holderId, uint8 policyType, uint32 planId, uint8 mode, uint8 instalments, uint256 premium) external returns (uint256)",
  "function recordPayment(uint256 policyId, uint256 amount, bytes32 refHash) external",
  "function renewPolicy(uint256 oldPolicyId, uint8 mode, uint8 instalments, uint256 premium) external returns (uint256)",
  "function effectiveStatus(uint256 policyId) external view returns (uint8)",
  "function isEligible(uint256 policyId, bytes32 holderId, uint8 claimType, uint64 incidentDate) external view returns (bool ok, uint8 reason)",
  "function getPolicy(uint256 policyId) external view returns (tuple(bytes32 holderId, uint8 policyType, uint32 planId, uint64 startDate, uint64 endDate, uint8 mode, uint8 totalInstalments, uint8 paidInstalments, uint64 payDeadline, uint256 previousPolicyId, uint256 premium) policy)",
  "function grantRole(bytes32 role, address account) external",
  "event PolicyCreated(uint256 indexed policyId, bytes32 indexed holderId, uint8 policyType, uint8 mode)",
  "event PaymentRecorded(uint256 indexed policyId, uint256 amount, bytes32 refHash, uint8 instalmentNumber)",
  "event PolicyRenewed(uint256 indexed oldPolicyId, uint256 indexed newPolicyId, uint8 mode)",
  "error PolicyNotFound()",
  "error PayLaterNotAllowedOnCreate()",
  "error PolicyLapsedOrExpired()",
  "error RenewalNotEligible()",
  "error InvalidInstalmentCount()",
];

const CLAIM_REGISTRY_ABI = [
  "function submitClaim(bytes32 holderId, uint256 policyId, uint8 claimType, uint64 incidentDate, bytes32[] docHashes, bytes32 detailsHash) external returns (uint256)",
  "function getClaim(uint256 claimId) external view returns (tuple(bytes32 holderId, uint256 policyId, uint8 claimType, uint64 incidentDate, uint64 submittedAt, bytes32 detailsHash, bytes32[] docHashes, address assignedVerifier, address decidedBy, uint64 decidedAt, bytes32 remarkHash, uint8 reasonCode, bool flagged, uint8 status) claim)",
  "function verifyDocument(uint256 claimId, bytes32 docHash) external view returns (bool)",
  "event ClaimSubmitted(uint256 indexed claimId, uint256 indexed policyId, bytes32 indexed holderId, bytes32[] docHashes, bytes32 detailsHash)",
  "event VerifierAssigned(uint256 indexed claimId, address indexed verifier)",
  "event ClaimDecided(uint256 indexed claimId, bool approve, address indexed verifier, uint8 reasonCode, bytes32 remarkHash)",
  "event ClaimSettled(uint256 indexed claimId, bytes32 payoutRefHash)",
  "event ClaimFlagged(uint256 indexed claimId, address indexed auditor, bytes32 findingHash)",
  "event DocumentReused(bytes32 indexed docHash, uint256 oldClaimId, uint256 newClaimId)",
  "error EmptyDocHashes()",
  "error TooManyDocHashes()",
  "error EmptyHash()",
  "error DuplicateDocument(bytes32 docHash, uint256 existingClaimId)",
  "error DuplicateClaimKey(bytes32 claimKey, uint256 existingClaimId)",
  "error NotEligible(uint8 reason)",
  "error ClaimNotFound()",
  "error NotAssignedVerifier()",
  "error InvalidVerifier()",
  "error InvalidStatus()",
];

/**
 * Decodes a thrown ethers ContractError against a contract's interface into
 * {code, args} (e.g. {code: "NotEligible", args: [3]}), or null if the
 * revert reason couldn't be decoded (a plain require() string, network
 * error, etc.) — callers fall back to err.message in that case.
 */
function decodeContractError(err, contract) {
  const data = err?.data || err?.error?.data || err?.info?.error?.data;
  if (!data) return null;
  try {
    const parsed = contract.interface.parseError(data);
    if (!parsed) return null;
    return { code: parsed.name, args: parsed.args };
  } catch {
    return null;
  }
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);

function getPolicyRegistry() {
  return new ethers.Contract(
    process.env.POLICY_REGISTRY_ADDRESS || ethers.ZeroAddress,
    POLICY_REGISTRY_ABI,
    relayerWallet
  );
}

function getClaimRegistry() {
  return new ethers.Contract(
    process.env.CLAIM_REGISTRY_ADDRESS || ethers.ZeroAddress,
    CLAIM_REGISTRY_ABI,
    relayerWallet
  );
}

/** Read-only instance for anyone (no relayer signer needed) — used by public reads. */
function getPolicyRegistryReadOnly() {
  return new ethers.Contract(process.env.POLICY_REGISTRY_ADDRESS || ethers.ZeroAddress, POLICY_REGISTRY_ABI, provider);
}

function getClaimRegistryReadOnly() {
  return new ethers.Contract(process.env.CLAIM_REGISTRY_ADDRESS || ethers.ZeroAddress, CLAIM_REGISTRY_ABI, provider);
}

module.exports = {
  provider,
  relayerWallet,
  getPolicyRegistry,
  getClaimRegistry,
  getPolicyRegistryReadOnly,
  getClaimRegistryReadOnly,
  decodeContractError,
};
