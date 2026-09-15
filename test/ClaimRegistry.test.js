const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ClaimRegistry", function () {
  let accessControl, claimRegistry, owner, policyholder, verifier;

  before(async function () {
    [owner, policyholder, verifier] = await ethers.getSigners();

    const AC = await ethers.getContractFactory("AccessControl");
    accessControl = await AC.deploy();

    const CR = await ethers.getContractFactory("ClaimRegistry");
    claimRegistry = await CR.deploy(await accessControl.getAddress());

    const POLICYHOLDER = ethers.keccak256(ethers.toUtf8Bytes("POLICYHOLDER"));
    const VERIFIER = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER"));
    await accessControl.assignRole(policyholder.address, POLICYHOLDER);
    await accessControl.assignRole(verifier.address, VERIFIER);
  });

  it("should allow a policyholder to submit a claim", async function () {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
    const tx = await claimRegistry
      .connect(policyholder)
      .submitClaim(documentHash, "Motor");
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it("should reject submission from non-policyholder", async function () {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
    await expect(
      claimRegistry.connect(verifier).submitClaim(documentHash, "Motor")
    ).to.be.revertedWith("Only policyholders can submit claims");
  });

  it("should return the correct claim status after submission", async function () {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc-2"));
    const tx = await claimRegistry
      .connect(policyholder)
      .submitClaim(documentHash, "Medical");
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

    const claim = await claimRegistry.getClaim(event.args.claimId);
    expect(claim.status).to.equal(0n);
  });

  it("should allow admin to assign a claim to a verifier", async function () {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc-assign"));
    const tx = await claimRegistry
      .connect(policyholder)
      .submitClaim(documentHash, "Property");
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

    const claimId = event.args.claimId;
    await claimRegistry.connect(owner).assignClaim(claimId, verifier.address);

    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.assignedVerifier).to.equal(verifier.address);
    expect(claim.status).to.equal(1n);
  });

  it("should allow assigned verifier to approve a claim", async function () {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc-approve"));
    const tx = await claimRegistry
      .connect(policyholder)
      .submitClaim(documentHash, "Motor");
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

    const claimId = event.args.claimId;
    await claimRegistry.connect(owner).assignClaim(claimId, verifier.address);
    await claimRegistry
      .connect(verifier)
      .updateClaimStatus(claimId, true, "Valid claim with proper documentation");

    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.status).to.equal(2n);
    expect(claim.verifierRemark).to.equal(
      "Valid claim with proper documentation"
    );
  });

  it("should reject status update from non-assigned verifier", async function () {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc-reject-test"));
    const tx = await claimRegistry
      .connect(policyholder)
      .submitClaim(documentHash, "Life");
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

    const claimId = event.args.claimId;

    await expect(
      claimRegistry
        .connect(verifier)
        .updateClaimStatus(claimId, true, "Trying to approve")
    ).to.be.revertedWith("Not assigned to this claim");
  });

  it("should verify document hash correctly", async function () {
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes("doc-verify"));
    const tx = await claimRegistry
      .connect(policyholder)
      .submitClaim(documentHash, "Medical");
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

    const claimId = event.args.claimId;
    const isValid = await claimRegistry.verifyDocumentHash(
      claimId,
      documentHash
    );
    expect(isValid).to.be.true;

    const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong-doc"));
    const isInvalid = await claimRegistry.verifyDocumentHash(
      claimId,
      wrongHash
    );
    expect(isInvalid).to.be.false;
  });
});
