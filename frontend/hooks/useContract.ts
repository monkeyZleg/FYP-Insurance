"use client";
import { ethers } from "ethers";
import { useMetaMask } from "./useMetaMask";

const CLAIM_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_CLAIM_REGISTRY_ADDRESS || ethers.ZeroAddress;

const ClaimRegistryABI = [
  "function submitClaim(bytes32 documentHash, string calldata claimType) external returns (bytes32)",
  "function assignClaim(bytes32 claimId, address verifier) external",
  "function updateClaimStatus(bytes32 claimId, uint8 newStatus, string calldata remark) external",
  "function getClaim(bytes32 claimId) external view returns (tuple(bytes32 claimId, address policyHolder, bytes32 documentHash, string claimType, uint256 submittedAt, uint8 status, address assignedVerifier, string verifierRemark, uint256 lastUpdatedAt))",
  "function verifyDocumentHash(bytes32 claimId, bytes32 hashToCheck) external view returns (bool)",
  "function getClaimsByPolicyholder(address wallet) external view returns (bytes32[])",
  "function getAllClaimIds() external view returns (bytes32[])",
  "event ClaimSubmitted(bytes32 indexed claimId, address indexed policyHolder, bytes32 documentHash, string claimType, uint256 timestamp)",
  "event ClaimAssigned(bytes32 indexed claimId, address indexed verifier, uint256 timestamp)",
  "event ClaimStatusUpdated(bytes32 indexed claimId, uint8 newStatus, address indexed updatedBy, string remark, uint256 timestamp)",
];

export function useClaimRegistry() {
  const { signer } = useMetaMask();

  function getContract() {
    if (!signer) throw new Error("Wallet not connected");
    return new ethers.Contract(
      CLAIM_REGISTRY_ADDRESS,
      ClaimRegistryABI,
      signer
    );
  }

  async function submitClaim(documentHashHex: string, claimType: string) {
    const contract = getContract();
    const tx = await contract.submitClaim(documentHashHex, claimType);
    return await tx.wait();
  }

  async function getClaim(claimId: string) {
    const contract = getContract();
    return await contract.getClaim(claimId);
  }

  async function verifyDocumentHash(claimId: string, hash: string) {
    const contract = getContract();
    return await contract.verifyDocumentHash(claimId, hash);
  }

  async function assignClaimOnChain(claimId: string, verifierAddress: string) {
    const contract = getContract();
    const tx = await contract.assignClaim(claimId, verifierAddress);
    return await tx.wait();
  }

  async function updateClaimStatus(
    claimId: string,
    newStatus: 1 | 2 | 3,
    remark: string
  ) {
    const contract = getContract();
    const tx = await contract.updateClaimStatus(claimId, newStatus, remark);
    return await tx.wait();
  }

  return {
    submitClaim,
    getClaim,
    verifyDocumentHash,
    assignClaimOnChain,
    updateClaimStatus,
    getContract,
  };
}
