const { expect } = require("chai");
const { ethers } = require("hardhat");

const PolicyType = { Motor: 0, Medical: 1, Life: 2 };
const PaymentMode = { PayNow: 0, Instalment: 1, PayLater: 2 };
const ClaimStatus = {
  Submitted: 0,
  UnderReview: 1,
  Approved: 2,
  Rejected: 3,
  Settled: 4,
};

const HOLDER_ID = ethers.keccak256(ethers.toUtf8Bytes("integration-holder-1"));
const REF_HASH = ethers.keccak256(ethers.toUtf8Bytes("payment-ref-integration"));
const DETAILS_HASH = ethers.keccak256(ethers.toUtf8Bytes("claim-details-integration"));
const REMARK_HASH = ethers.keccak256(ethers.toUtf8Bytes("remark-integration"));
const PAYOUT_REF_HASH = ethers.keccak256(ethers.toUtf8Bytes("payout-ref-integration"));
const DOC_HASH = ethers.keccak256(ethers.toUtf8Bytes("integration-doc-1"));

function parseLogs(contract, receipt) {
  return receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

describe("Integration: full policy + claim lifecycle", function () {
  let policyRegistry, claimRegistry;
  let deployer, relayer, admin, verifier, auditor;

  beforeEach(async function () {
    [deployer, relayer, admin, verifier, auditor] = await ethers.getSigners();

    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();

    const ClaimRegistry = await ethers.getContractFactory("ClaimRegistry");
    claimRegistry = await ClaimRegistry.deploy(await policyRegistry.getAddress());

    const PR_RELAYER_ROLE = await policyRegistry.RELAYER_ROLE();
    await policyRegistry.grantRole(PR_RELAYER_ROLE, relayer.address);

    const CR_RELAYER_ROLE = await claimRegistry.RELAYER_ROLE();
    const ADMIN_ROLE = await claimRegistry.ADMIN_ROLE();
    const VERIFIER_ROLE = await claimRegistry.VERIFIER_ROLE();
    const AUDITOR_ROLE = await claimRegistry.AUDITOR_ROLE();

    await claimRegistry.grantRole(CR_RELAYER_ROLE, relayer.address);
    await claimRegistry.grantRole(ADMIN_ROLE, admin.address);
    await claimRegistry.grantRole(VERIFIER_ROLE, verifier.address);
    await claimRegistry.grantRole(AUDITOR_ROLE, auditor.address);
  });

  it("buy -> pay -> submit claim -> assign -> approve -> settle, then rebuild history from events only", async function () {
    // -------------------- Buy --------------------
    const createTx = await policyRegistry
      .connect(relayer)
      .createPolicy(HOLDER_ID, PolicyType.Motor, 1, PaymentMode.PayNow, 1, 5000);
    const createReceipt = await createTx.wait();
    const policyCreatedEvent = parseLogs(policyRegistry, createReceipt).find(
      (e) => e.name === "PolicyCreated"
    );
    const policyId = policyCreatedEvent.args.policyId;

    // -------------------- Pay --------------------
    const payTx = await policyRegistry
      .connect(relayer)
      .recordPayment(policyId, 5000, REF_HASH);
    const payReceipt = await payTx.wait();
    const paymentEvent = parseLogs(policyRegistry, payReceipt).find(
      (e) => e.name === "PaymentRecorded"
    );
    expect(paymentEvent.args.policyId).to.equal(policyId);

    expect(await policyRegistry.effectiveStatus(policyId)).to.equal(1); // Active

    // -------------------- Submit claim --------------------
    const block = await ethers.provider.getBlock("latest");
    const incidentDate = block.timestamp;

    const submitTx = await claimRegistry
      .connect(relayer)
      .submitClaim(HOLDER_ID, policyId, PolicyType.Motor, incidentDate, [DOC_HASH], DETAILS_HASH);
    const submitReceipt = await submitTx.wait();
    const submittedEvent = parseLogs(claimRegistry, submitReceipt).find(
      (e) => e.name === "ClaimSubmitted"
    );
    const claimId = submittedEvent.args.claimId;

    // -------------------- Assign --------------------
    const assignTx = await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);
    const assignReceipt = await assignTx.wait();
    const assignedEvent = parseLogs(claimRegistry, assignReceipt).find(
      (e) => e.name === "VerifierAssigned"
    );
    expect(assignedEvent.args.verifier).to.equal(verifier.address);

    // Verifier checks document integrity before deciding.
    expect(await claimRegistry.verifyDocument(claimId, DOC_HASH)).to.equal(true);

    // -------------------- Approve --------------------
    const decideTx = await claimRegistry
      .connect(verifier)
      .decideClaim(claimId, true, 0, REMARK_HASH);
    const decideReceipt = await decideTx.wait();
    const decidedEvent = parseLogs(claimRegistry, decideReceipt).find(
      (e) => e.name === "ClaimDecided"
    );
    expect(decidedEvent.args.verifier).to.equal(verifier.address);
    expect(decidedEvent.args.approve).to.equal(true);

    // -------------------- Settle --------------------
    const settleTx = await claimRegistry.connect(admin).settleClaim(claimId, PAYOUT_REF_HASH);
    const settleReceipt = await settleTx.wait();
    const settledEvent = parseLogs(claimRegistry, settleReceipt).find(
      (e) => e.name === "ClaimSettled"
    );
    expect(settledEvent.args.payoutRefHash).to.equal(PAYOUT_REF_HASH);

    const finalClaim = await claimRegistry.getClaim(claimId);
    expect(finalClaim.status).to.equal(ClaimStatus.Settled);

    // -------------------- Rebuild history from events only --------------------
    // An auditor (or anyone) should be able to reconstruct the whole claim
    // lifecycle by reading emitted events, without trusting any off-chain DB.
    const claimSubmittedFilter = claimRegistry.filters.ClaimSubmitted(claimId);
    const verifierAssignedFilter = claimRegistry.filters.VerifierAssigned(claimId);
    const claimDecidedFilter = claimRegistry.filters.ClaimDecided(claimId);
    const claimSettledFilter = claimRegistry.filters.ClaimSettled(claimId);

    const [submittedLogs, assignedLogs, decidedLogs, settledLogs] = await Promise.all([
      claimRegistry.queryFilter(claimSubmittedFilter),
      claimRegistry.queryFilter(verifierAssignedFilter),
      claimRegistry.queryFilter(claimDecidedFilter),
      claimRegistry.queryFilter(claimSettledFilter),
    ]);

    expect(submittedLogs).to.have.lengthOf(1);
    expect(assignedLogs).to.have.lengthOf(1);
    expect(decidedLogs).to.have.lengthOf(1);
    expect(settledLogs).to.have.lengthOf(1);

    // Rebuild a simplified history timeline purely from event data.
    const history = [];

    history.push({
      type: "ClaimSubmitted",
      policyId: submittedLogs[0].args.policyId,
      holderId: submittedLogs[0].args.holderId,
      docHashes: submittedLogs[0].args.docHashes,
      detailsHash: submittedLogs[0].args.detailsHash,
      blockNumber: submittedLogs[0].blockNumber,
    });
    history.push({
      type: "VerifierAssigned",
      verifier: assignedLogs[0].args.verifier,
      blockNumber: assignedLogs[0].blockNumber,
    });
    history.push({
      type: "ClaimDecided",
      approve: decidedLogs[0].args.approve,
      verifier: decidedLogs[0].args.verifier,
      reasonCode: decidedLogs[0].args.reasonCode,
      remarkHash: decidedLogs[0].args.remarkHash,
      blockNumber: decidedLogs[0].blockNumber,
    });
    history.push({
      type: "ClaimSettled",
      payoutRefHash: settledLogs[0].args.payoutRefHash,
      blockNumber: settledLogs[0].blockNumber,
    });

    // History should be chronologically ordered by block number.
    for (let i = 1; i < history.length; i++) {
      expect(history[i].blockNumber).to.be.at.least(history[i - 1].blockNumber);
    }

    expect(history[0].policyId).to.equal(policyId);
    expect(history[0].holderId).to.equal(HOLDER_ID);
    expect(history[0].docHashes).to.deep.equal([DOC_HASH]);
    expect(history[1].verifier).to.equal(verifier.address);
    expect(history[2].approve).to.equal(true);
    expect(history[2].verifier).to.equal(verifier.address);
    expect(history[3].payoutRefHash).to.equal(PAYOUT_REF_HASH);

    // The on-chain claim record matches what the rebuilt history implies.
    expect(finalClaim.assignedVerifier).to.equal(verifier.address);
    expect(finalClaim.decidedBy).to.equal(verifier.address);
  });
});
