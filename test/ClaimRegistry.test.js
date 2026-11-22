const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const PolicyType = { Car: 0, Motor: 1, Travel: 2, Health: 3 };
const PaymentMode = { PayNow: 0, Instalment: 1, PayLater: 2 };
const ClaimStatus = {
  Submitted: 0,
  UnderReview: 1,
  Approved: 2,
  Rejected: 3,
  Settled: 4,
};

const HOLDER_ID = ethers.keccak256(ethers.toUtf8Bytes("holder-1"));
const OTHER_HOLDER_ID = ethers.keccak256(ethers.toUtf8Bytes("holder-2"));
const REF_HASH = ethers.keccak256(ethers.toUtf8Bytes("payment-ref-1"));
const DETAILS_HASH = ethers.keccak256(ethers.toUtf8Bytes("claim-details-1"));
const REMARK_HASH = ethers.keccak256(ethers.toUtf8Bytes("remark-1"));
const PAYOUT = 710000; // RM 7,100.00 in sen

function docHash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

describe("ClaimRegistry", function () {
  let policyRegistry, claimRegistry;
  let deployer, relayer, admin, verifier, verifier2, auditor, other;

  beforeEach(async function () {
    [deployer, relayer, admin, verifier, verifier2, auditor, other] =
      await ethers.getSigners();

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
    await claimRegistry.grantRole(VERIFIER_ROLE, verifier2.address);
    await claimRegistry.grantRole(AUDITOR_ROLE, auditor.address);
  });

  async function createActivePolicy(holderId = HOLDER_ID, policyType = PolicyType.Motor) {
    const tx = await policyRegistry
      .connect(relayer)
      .createPolicy(holderId, policyType, 1, PaymentMode.PayNow, 1, 1000);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return policyRegistry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "PolicyCreated");
    const policyId = event.args.policyId;
    await policyRegistry.connect(relayer).recordPayment(policyId, 1000, REF_HASH);
    return policyId;
  }

  async function currentIncidentDate() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  async function submitClaimAndGetId(overrides = {}) {
    const policyId = overrides.policyId ?? (await createActivePolicy());
    const incidentDate = overrides.incidentDate ?? (await currentIncidentDate());
    const holderId = overrides.holderId ?? HOLDER_ID;
    const claimType = overrides.claimType ?? PolicyType.Motor;
    const hashes = overrides.docHashes ?? [docHash("doc-" + Math.random())];
    const detailsHash = overrides.detailsHash ?? DETAILS_HASH;
    const claimedAmount = overrides.claimedAmount ?? 0;

    const tx = await claimRegistry
      .connect(relayer)
      .submitClaim(holderId, policyId, claimType, incidentDate, hashes, detailsHash, claimedAmount);
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
    return { claimId: event.args.claimId, policyId, incidentDate };
  }

  it("Valid claim on active policy: stored, ClaimSubmitted emitted", async function () {
    const policyId = await createActivePolicy();
    const incidentDate = await currentIncidentDate();
    const hashes = [docHash("valid-doc-1")];

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(HOLDER_ID, policyId, PolicyType.Motor, incidentDate, hashes, DETAILS_HASH, 0)
    ).to.emit(claimRegistry, "ClaimSubmitted");

    const claim = await claimRegistry.getClaim(1);
    expect(claim.status).to.equal(ClaimStatus.Submitted);
    expect(claim.holderId).to.equal(HOLDER_ID);
  });

  it("Claim on lapsed policy reverts with POLICY_LAPSED", async function () {
    const tx = await policyRegistry
      .connect(relayer)
      .createPolicy(HOLDER_ID, PolicyType.Motor, 1, PaymentMode.Instalment, 3, 1000);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return policyRegistry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "PolicyCreated");
    const policyId = event.args.policyId;
    await policyRegistry.connect(relayer).recordPayment(policyId, 400, REF_HASH);

    // Push past first instalment period + grace so the policy lapses.
    await time.increase(30 * 24 * 60 * 60 + 1 + 14 * 24 * 60 * 60 + 1);

    const incidentDate = await currentIncidentDate();
    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [docHash("lapsed-doc")],
          DETAILS_HASH, 0
        )
    )
      .to.be.revertedWithCustomError(claimRegistry, "NotEligible")
      .withArgs(7); // Reason.POLICY_LAPSED
  });

  it("Incident date outside coverage: OUTSIDE_COVERAGE_PERIOD", async function () {
    const policyId = await createActivePolicy();
    const policy = await policyRegistry.getPolicy(policyId);
    const outsideDate = policy.endDate + 1n;

    // Move time forward so block.timestamp >= outsideDate to keep INVALID_DATE from firing first.
    await time.increaseTo(outsideDate + 10n);

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          outsideDate,
          [docHash("outside-doc")],
          DETAILS_HASH, 0
        )
    )
      .to.be.revertedWithCustomError(claimRegistry, "NotEligible")
      .withArgs(4); // Reason.OUTSIDE_COVERAGE_PERIOD (policy already Expired too, but coverage check runs first)
  });

  it("Incident dated on the day the policy starts is covered", async function () {
    const policyId = await createActivePolicy();
    const policy = await policyRegistry.getPolicy(policyId);
    const sameDay = policy.startDate - 23n * 3600n; // midnight of a start day, up to 24h earlier

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(HOLDER_ID, policyId, PolicyType.Motor, sameDay, [docHash("same-day-doc")], DETAILS_HASH, 0)
    ).to.emit(claimRegistry, "ClaimSubmitted");
  });

  it("Incident a full day before the policy starts: OUTSIDE_COVERAGE_PERIOD", async function () {
    const policyId = await createActivePolicy();
    const policy = await policyRegistry.getPolicy(policyId);
    const dayBefore = policy.startDate - 24n * 3600n;

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(HOLDER_ID, policyId, PolicyType.Motor, dayBefore, [docHash("day-before-doc")], DETAILS_HASH, 0)
    )
      .to.be.revertedWithCustomError(claimRegistry, "NotEligible")
      .withArgs(4); // Reason.OUTSIDE_COVERAGE_PERIOD
  });

  it("Wrong holderId: WRONG_OWNER", async function () {
    const policyId = await createActivePolicy(HOLDER_ID);
    const incidentDate = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          OTHER_HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [docHash("wrong-owner-doc")],
          DETAILS_HASH, 0
        )
    )
      .to.be.revertedWithCustomError(claimRegistry, "NotEligible")
      .withArgs(2); // Reason.WRONG_OWNER
  });

  it("Motor claim on a health policy: TYPE_MISMATCH", async function () {
    const policyId = await createActivePolicy(HOLDER_ID, PolicyType.Health);
    const incidentDate = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [docHash("type-mismatch-doc")],
          DETAILS_HASH, 0
        )
    )
      .to.be.revertedWithCustomError(claimRegistry, "NotEligible")
      .withArgs(3); // Reason.TYPE_MISMATCH
  });

  it("Same document hash in a second claim reverts DuplicateDocument", async function () {
    const hash = docHash("shared-doc");
    const { policyId } = await submitClaimAndGetId({ docHashes: [hash] });

    const policyId2 = await createActivePolicy();
    const incidentDate2 = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(HOLDER_ID, policyId2, PolicyType.Motor, incidentDate2, [hash], DETAILS_HASH, 0)
    ).to.be.revertedWithCustomError(claimRegistry, "DuplicateDocument");
  });

  it("Same hash twice in one array reverts", async function () {
    const policyId = await createActivePolicy();
    const incidentDate = await currentIncidentDate();
    const hash = docHash("dup-in-array");

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [hash, hash],
          DETAILS_HASH, 0
        )
    ).to.be.revertedWithCustomError(claimRegistry, "DuplicateDocument");
  });

  it("Same policy, type and incident date again reverts (duplicate key)", async function () {
    const { policyId, incidentDate } = await submitClaimAndGetId();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [docHash("second-submission-doc")],
          DETAILS_HASH, 0
        )
    ).to.be.revertedWithCustomError(claimRegistry, "DuplicateClaimKey");
  });

  it("Resubmission after rejection, same holder: allowed, DocumentReused emitted", async function () {
    const hash = docHash("reusable-doc");
    const { claimId, policyId, incidentDate } = await submitClaimAndGetId({ docHashes: [hash] });

    await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);
    await claimRegistry
      .connect(verifier)
      .decideClaim(claimId, false, 1, REMARK_HASH, 0);

    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.status).to.equal(ClaimStatus.Rejected);

    // Same policy/type/incidentDate key is now reusable because prior claim is Rejected.
    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(HOLDER_ID, policyId, PolicyType.Motor, incidentDate, [hash], DETAILS_HASH, 0)
    ).to.emit(claimRegistry, "DocumentReused");
  });

  it("Resubmission of another holder's rejected hash reverts", async function () {
    const hash = docHash("other-holder-doc");
    const { claimId } = await submitClaimAndGetId({ docHashes: [hash] });

    await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);
    await claimRegistry.connect(verifier).decideClaim(claimId, false, 1, REMARK_HASH, 0);

    const policyId2 = await createActivePolicy(OTHER_HOLDER_ID);
    // Incident date must fall inside the second policy's own coverage period.
    const incidentDate = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          OTHER_HOLDER_ID,
          policyId2,
          PolicyType.Motor,
          incidentDate,
          [hash],
          DETAILS_HASH, 0
        )
    ).to.be.revertedWithCustomError(claimRegistry, "DuplicateDocument");
  });

  it("Admin tries to decideClaim: reverts", async function () {
    const { claimId } = await submitClaimAndGetId();
    await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);

    await expect(
      claimRegistry.connect(admin).decideClaim(claimId, true, 0, REMARK_HASH, PAYOUT)
    ).to.be.revertedWithCustomError(claimRegistry, "NotAssignedVerifier");
  });

  it("Unassigned verifier tries to decide: reverts", async function () {
    const { claimId } = await submitClaimAndGetId();
    await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);

    await expect(
      claimRegistry.connect(verifier2).decideClaim(claimId, true, 0, REMARK_HASH, PAYOUT)
    ).to.be.revertedWithCustomError(claimRegistry, "NotAssignedVerifier");
  });

  it("Decide an already decided claim reverts", async function () {
    const { claimId } = await submitClaimAndGetId();
    await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);
    await claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, PAYOUT);

    await expect(
      claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, PAYOUT)
    ).to.be.revertedWithCustomError(claimRegistry, "InvalidStatus");
  });

  it("Settle before approval reverts", async function () {
    const { claimId } = await submitClaimAndGetId();
    await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);

    await expect(
      claimRegistry.connect(admin).settleClaim(claimId, REF_HASH)
    ).to.be.revertedWithCustomError(claimRegistry, "InvalidStatus");
  });

  it("Auditor flagClaim: sets flag, status unchanged", async function () {
    const { claimId } = await submitClaimAndGetId();
    const before = await claimRegistry.getClaim(claimId);

    await expect(claimRegistry.connect(auditor).flagClaim(claimId, docHash("finding")))
      .to.emit(claimRegistry, "ClaimFlagged")
      .withArgs(claimId, auditor.address, docHash("finding"));

    const after = await claimRegistry.getClaim(claimId);
    expect(after.flagged).to.equal(true);
    expect(after.status).to.equal(before.status);
  });

  it("verifyDocument with a changed file hash returns false", async function () {
    const hash = docHash("verify-doc");
    const { claimId } = await submitClaimAndGetId({ docHashes: [hash] });

    expect(await claimRegistry.verifyDocument(claimId, hash)).to.equal(true);
    expect(await claimRegistry.verifyDocument(claimId, docHash("tampered-doc"))).to.equal(false);
  });

  it("Empty docHashes array reverts", async function () {
    const policyId = await createActivePolicy();
    const incidentDate = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(HOLDER_ID, policyId, PolicyType.Motor, incidentDate, [], DETAILS_HASH, 0)
    ).to.be.revertedWithCustomError(claimRegistry, "EmptyDocHashes");
  });

  it("More than 10 docHashes reverts", async function () {
    const policyId = await createActivePolicy();
    const incidentDate = await currentIncidentDate();
    const hashes = Array.from({ length: 11 }, (_, i) => docHash("many-" + i));

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(HOLDER_ID, policyId, PolicyType.Motor, incidentDate, hashes, DETAILS_HASH, 0)
    ).to.be.revertedWithCustomError(claimRegistry, "TooManyDocHashes");
  });

  it("A zero-value hash entry reverts", async function () {
    const policyId = await createActivePolicy();
    const incidentDate = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [ethers.ZeroHash],
          DETAILS_HASH, 0
        )
    ).to.be.revertedWithCustomError(claimRegistry, "EmptyHash");
  });

  it("Non-relayer calling submitClaim reverts (access control)", async function () {
    const policyId = await createActivePolicy();
    const incidentDate = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(other)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [docHash("no-access-doc")],
          DETAILS_HASH, 0
        )
    ).to.be.reverted;
  });

  it("assignVerifier rejects an address without VERIFIER_ROLE", async function () {
    const { claimId } = await submitClaimAndGetId();

    await expect(
      claimRegistry.connect(admin).assignVerifier(claimId, other.address)
    ).to.be.revertedWithCustomError(claimRegistry, "InvalidVerifier");
  });

  it("Paused contract blocks submitClaim", async function () {
    const ADMIN_ROLE = await claimRegistry.ADMIN_ROLE();
    expect(await claimRegistry.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);

    await claimRegistry.connect(admin).pause();

    const policyId = await createActivePolicy();
    const incidentDate = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [docHash("paused-doc")],
          DETAILS_HASH, 0
        )
    ).to.be.revertedWithCustomError(claimRegistry, "EnforcedPause");

    await claimRegistry.connect(admin).unpause();
    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(
          HOLDER_ID,
          policyId,
          PolicyType.Motor,
          incidentDate,
          [docHash("unpaused-doc")],
          DETAILS_HASH, 0
        )
    ).to.emit(claimRegistry, "ClaimSubmitted");
  });

  it("Full approve/settle flow updates status correctly", async function () {
    const { claimId } = await submitClaimAndGetId();

    await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);
    let claim = await claimRegistry.getClaim(claimId);
    expect(claim.status).to.equal(ClaimStatus.UnderReview);

    await claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, PAYOUT);
    claim = await claimRegistry.getClaim(claimId);
    expect(claim.status).to.equal(ClaimStatus.Approved);
    expect(claim.decidedBy).to.equal(verifier.address);

    await claimRegistry.connect(admin).settleClaim(claimId, REF_HASH);
    claim = await claimRegistry.getClaim(claimId);
    expect(claim.status).to.equal(ClaimStatus.Settled);
  });

  // ---------------------------------------------------------------
  // Four insurance types
  // ---------------------------------------------------------------

  it("Car, Motor, Travel and Health claims are all accepted on a matching policy", async function () {
    for (const type of [PolicyType.Car, PolicyType.Motor, PolicyType.Travel, PolicyType.Health]) {
      const policyId = await createActivePolicy(HOLDER_ID, type);
      const { claimId } = await submitClaimAndGetId({ policyId, claimType: type });
      const claim = await claimRegistry.getClaim(claimId);
      expect(claim.claimType).to.equal(type);
    }
    expect(await claimRegistry.claimCount()).to.equal(4);
  });

  it("Car claim on a motorcycle (Motor) policy: TYPE_MISMATCH", async function () {
    const policyId = await createActivePolicy(HOLDER_ID, PolicyType.Motor);
    const incidentDate = await currentIncidentDate();

    await expect(
      claimRegistry
        .connect(relayer)
        .submitClaim(HOLDER_ID, policyId, PolicyType.Car, incidentDate, [docHash("car-on-motor")], DETAILS_HASH, 0)
    )
      .to.be.revertedWithCustomError(claimRegistry, "NotEligible")
      .withArgs(3); // Reason.TYPE_MISMATCH
  });

  // ---------------------------------------------------------------
  // Approved payout
  // ---------------------------------------------------------------

  async function underReviewClaim(overrides = {}) {
    const { claimId } = await submitClaimAndGetId(overrides);
    await claimRegistry.connect(admin).assignVerifier(claimId, verifier.address);
    return claimId;
  }

  it("Approving stores the approved payout and emits it", async function () {
    const claimId = await underReviewClaim({ claimedAmount: 800000 });

    await expect(claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, PAYOUT))
      .to.emit(claimRegistry, "ClaimDecided")
      .withArgs(claimId, true, verifier.address, 0, REMARK_HASH, PAYOUT);

    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.claimedAmount).to.equal(800000);
    expect(claim.approvedPayout).to.equal(PAYOUT);
  });

  it("Approving with a zero payout reverts", async function () {
    const claimId = await underReviewClaim();
    await expect(
      claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, 0)
    ).to.be.revertedWithCustomError(claimRegistry, "InvalidPayout");
  });

  it("Rejecting with a payout reverts", async function () {
    const claimId = await underReviewClaim();
    await expect(
      claimRegistry.connect(verifier).decideClaim(claimId, false, 1, REMARK_HASH, 100)
    ).to.be.revertedWithCustomError(claimRegistry, "InvalidPayout");
  });

  it("Approved payout above the claimed amount reverts", async function () {
    const claimId = await underReviewClaim({ claimedAmount: 500000 });
    await expect(claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, 500001))
      .to.be.revertedWithCustomError(claimRegistry, "PayoutExceedsClaim")
      .withArgs(500001, 500000);
  });

  it("No claimed amount stated: any positive payout is accepted", async function () {
    const claimId = await underReviewClaim({ claimedAmount: 0 });
    await claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, 123456);
    expect((await claimRegistry.getClaim(claimId)).approvedPayout).to.equal(123456);
  });

  // ---------------------------------------------------------------
  // Service charge (same worked examples as the frontend calculator:
  // 2%, minimum RM 10, maximum RM 200, policyholder pays)
  // ---------------------------------------------------------------

  async function settle(payout) {
    const claimId = await underReviewClaim();
    await claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, payout);
    await claimRegistry.connect(admin).settleClaim(claimId, REF_HASH);
    return claimId;
  }

  it("quoteServiceCharge matches the calculator's worked examples", async function () {
    const cases = [
      [710000, 14200, 695800],   // RM 7,100 -> RM 142 -> RM 6,958
      [945000, 18900, 926100],   // RM 9,450 -> RM 189 -> RM 9,261
      [1500000, 20000, 1480000], // capped at RM 200
      [5000, 1000, 4000],        // minimum RM 10
      [500, 500, 0],             // charge never above the payout
      [0, 0, 0],                 // no payout, no charge
    ];
    for (const [payout, charge, net] of cases) {
      const [c, n] = await claimRegistry.quoteServiceCharge(payout);
      expect(c).to.equal(charge);
      expect(n).to.equal(net);
    }
  });

  it("Settlement stores payout, service charge and net, and emits them", async function () {
    const claimId = await underReviewClaim();
    await claimRegistry.connect(verifier).decideClaim(claimId, true, 0, REMARK_HASH, PAYOUT);

    await expect(claimRegistry.connect(admin).settleClaim(claimId, REF_HASH))
      .to.emit(claimRegistry, "ClaimSettled")
      .withArgs(claimId, REF_HASH, PAYOUT, 14200, 695800);

    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.status).to.equal(ClaimStatus.Settled);
    expect(claim.serviceCharge).to.equal(14200);
    expect(claim.netPayout).to.equal(695800);
  });

  it("totalServiceCharges adds up across settled claims", async function () {
    await settle(710000);
    await settle(945000);
    expect(await claimRegistry.totalServiceCharges()).to.equal(14200 + 18900);
  });

  it("Rejected claim carries no payout and cannot be settled", async function () {
    const claimId = await underReviewClaim();
    await claimRegistry.connect(verifier).decideClaim(claimId, false, 1, REMARK_HASH, 0);

    await expect(
      claimRegistry.connect(admin).settleClaim(claimId, REF_HASH)
    ).to.be.revertedWithCustomError(claimRegistry, "InvalidStatus");

    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.serviceCharge).to.equal(0);
    expect(await claimRegistry.totalServiceCharges()).to.equal(0);
  });

  it("Admin can switch to a flat fee; non-admin cannot", async function () {
    await expect(
      claimRegistry.connect(other).setServiceCharge(true, 0, 2000, 0, 0, true)
    ).to.be.reverted;

    await expect(claimRegistry.connect(admin).setServiceCharge(true, 0, 2000, 0, 0, true))
      .to.emit(claimRegistry, "ServiceChargeUpdated")
      .withArgs(true, 0, 2000, 0, 0, true, admin.address);

    const claimId = await settle(710000);
    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.serviceCharge).to.equal(2000);
    expect(claim.netPayout).to.equal(708000);
  });

  it("Insurer-pays setting: policyholder receives the full payout", async function () {
    await claimRegistry.connect(admin).setServiceCharge(false, 200, 2000, 1000, 20000, false);
    const claimId = await settle(710000);
    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.serviceCharge).to.equal(14200);
    expect(claim.netPayout).to.equal(710000);
  });

  it("No cap when maxFee is 0", async function () {
    await claimRegistry.connect(admin).setServiceCharge(false, 200, 2000, 1000, 0, true);
    const [charge] = await claimRegistry.quoteServiceCharge(1500000);
    expect(charge).to.equal(30000);
  });

  it("Invalid service charge settings revert", async function () {
    await expect(
      claimRegistry.connect(admin).setServiceCharge(false, 10001, 0, 0, 0, true)
    ).to.be.revertedWithCustomError(claimRegistry, "InvalidServiceCharge");
    await expect(
      claimRegistry.connect(admin).setServiceCharge(false, 200, 0, 30000, 20000, true)
    ).to.be.revertedWithCustomError(claimRegistry, "InvalidServiceCharge");
  });

  it("A settled claim keeps its figures when the charge changes later", async function () {
    const claimId = await settle(710000);
    await claimRegistry.connect(admin).setServiceCharge(false, 500, 2000, 1000, 0, true);
    const claim = await claimRegistry.getClaim(claimId);
    expect(claim.serviceCharge).to.equal(14200);
  });
});
