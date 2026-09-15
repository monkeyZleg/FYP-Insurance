const { ethers } = require("ethers");
const path = require("path");

let ClaimRegistryABI;
try {
  ClaimRegistryABI = require(
    path.resolve(
      __dirname,
      "../../../artifacts/contracts/ClaimRegistry.sol/ClaimRegistry.json"
    )
  );
} catch {
  console.warn("ClaimRegistry ABI not found — compile contracts first");
  ClaimRegistryABI = { abi: [] };
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

const claimRegistry = new ethers.Contract(
  process.env.CLAIM_REGISTRY_ADDRESS || ethers.ZeroAddress,
  ClaimRegistryABI.abi,
  signer
);

async function submitClaimOnChain(documentHash, claimType) {
  const tx = await claimRegistry.submitClaim(documentHash, claimType);
  const receipt = await tx.wait();
  const event = receipt.logs
    .map((log) => {
      try {
        return claimRegistry.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e?.name === "ClaimSubmitted");
  return {
    txHash: receipt.hash,
    claimId: event?.args.claimId,
  };
}

async function getClaimAuditTrail(claimId) {
  const submitted = await claimRegistry.queryFilter(
    claimRegistry.filters.ClaimSubmitted(claimId)
  );
  const assigned = await claimRegistry.queryFilter(
    claimRegistry.filters.ClaimAssigned(claimId)
  );
  const updated = await claimRegistry.queryFilter(
    claimRegistry.filters.ClaimStatusUpdated(claimId)
  );
  return [...submitted, ...assigned, ...updated].sort(
    (a, b) => a.blockNumber - b.blockNumber
  );
}

async function verifyHash(claimId, hashToCheck) {
  return await claimRegistry.verifyDocumentHash(claimId, hashToCheck);
}

async function getClaimOnChain(claimId) {
  return await claimRegistry.getClaim(claimId);
}

module.exports = {
  submitClaimOnChain,
  getClaimAuditTrail,
  verifyHash,
  getClaimOnChain,
};
