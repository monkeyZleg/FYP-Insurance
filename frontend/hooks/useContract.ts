"use client";
import { ethers } from "ethers";
import { useMetaMask } from "./useMetaMask";

const CLAIM_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_CLAIM_REGISTRY_ADDRESS || ethers.ZeroAddress;

const ClaimRegistryABI = [
  "function assignVerifier(uint256 claimId, address verifier) external",
  "function decideClaim(uint256 claimId, bool approve, uint8 reasonCode, bytes32 remarkHash) external",
  "function settleClaim(uint256 claimId, bytes32 payoutRefHash) external",
  "function flagClaim(uint256 claimId, bytes32 findingHash) external",
  "function getClaim(uint256 claimId) external view returns (tuple(bytes32 holderId, uint256 policyId, uint8 claimType, uint64 incidentDate, uint64 submittedAt, bytes32 detailsHash, bytes32[] docHashes, address assignedVerifier, address decidedBy, uint64 decidedAt, bytes32 remarkHash, uint8 reasonCode, bool flagged, uint8 status))",
  "function verifyDocument(uint256 claimId, bytes32 docHash) external view returns (bool)",
  "event ClaimSubmitted(uint256 indexed claimId, uint256 indexed policyId, bytes32 indexed holderId, bytes32[] docHashes, bytes32 detailsHash)",
  "event VerifierAssigned(uint256 indexed claimId, address indexed verifier)",
  "event ClaimDecided(uint256 indexed claimId, bool approve, address indexed verifier, uint8 reasonCode, bytes32 remarkHash)",
  "event ClaimSettled(uint256 indexed claimId, bytes32 payoutRefHash)",
  "event ClaimFlagged(uint256 indexed claimId, address indexed auditor, bytes32 findingHash)",
];

/** Staff-only (verifier / admin / auditor): signs ClaimRegistry writes with their own MetaMask wallet. */
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

  function hashText(text: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(text));
  }

  function randomRefHash(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  async function assignVerifier(claimId: string | number, verifierAddress: string) {
    const contract = getContract();
    const tx = await contract.assignVerifier(claimId, verifierAddress);
    return await tx.wait();
  }

  async function decideClaim(
    claimId: string | number,
    approve: boolean,
    reasonCode: number,
    remark: string
  ) {
    const contract = getContract();
    const remarkHash = remark ? hashText(remark) : randomRefHash();
    const tx = await contract.decideClaim(claimId, approve, reasonCode, remarkHash);
    return { receipt: await tx.wait(), remarkHash };
  }

  async function settleClaim(claimId: string | number, payoutRefHash?: string) {
    const contract = getContract();
    const hash = payoutRefHash || randomRefHash();
    const tx = await contract.settleClaim(claimId, hash);
    return { receipt: await tx.wait(), payoutRefHash: hash };
  }

  async function flagClaim(claimId: string | number, findingText?: string) {
    const contract = getContract();
    const findingHash = findingText ? hashText(findingText) : randomRefHash();
    const tx = await contract.flagClaim(claimId, findingHash);
    return { receipt: await tx.wait(), findingHash };
  }

  async function getClaim(claimId: string | number) {
    const contract = getContract();
    return await contract.getClaim(claimId);
  }

  async function verifyDocument(claimId: string | number, docHash: string) {
    const contract = getContract();
    return await contract.verifyDocument(claimId, docHash);
  }

  return {
    assignVerifier,
    decideClaim,
    settleClaim,
    flagClaim,
    getClaim,
    verifyDocument,
    hashText,
    randomRefHash,
    getContract,
  };
}
