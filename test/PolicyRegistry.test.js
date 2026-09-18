const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const PolicyType = { Motor: 0, Medical: 1, Life: 2 };
const PaymentMode = { PayNow: 0, Instalment: 1, PayLater: 2 };
const PolicyStatus = {
  PendingPayment: 0,
  Active: 1,
  GracePeriod: 2,
  Lapsed: 3,
  Expired: 4,
};

const HOLDER_ID = ethers.keccak256(ethers.toUtf8Bytes("holder-1"));
const REF_HASH = ethers.keccak256(ethers.toUtf8Bytes("payment-ref-1"));

describe("PolicyRegistry", function () {
  let policyRegistry, deployer, relayer, other;
  let RELAYER_ROLE;

  beforeEach(async function () {
    [deployer, relayer, other] = await ethers.getSigners();

    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();

    RELAYER_ROLE = await policyRegistry.RELAYER_ROLE();
    await policyRegistry.grantRole(RELAYER_ROLE, relayer.address);
  });

  async function createPolicy({
    mode = PaymentMode.PayNow,
    instalments = 1,
    holderId = HOLDER_ID,
  } = {}) {
    const tx = await policyRegistry
      .connect(relayer)
      .createPolicy(holderId, PolicyType.Motor, 1, mode, instalments, 1000);
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
    return event.args.policyId;
  }

  it("Pay Now, record payment -> Active", async function () {
    const policyId = await createPolicy({ mode: PaymentMode.PayNow });
    await policyRegistry.connect(relayer).recordPayment(policyId, 1000, REF_HASH);
    expect(await policyRegistry.effectiveStatus(policyId)).to.equal(PolicyStatus.Active);
  });

  it("Instalment x3: pay first only -> Active, skip second past due -> GracePeriod, past grace -> Lapsed", async function () {
    const policyId = await createPolicy({ mode: PaymentMode.Instalment, instalments: 3 });
    await policyRegistry.connect(relayer).recordPayment(policyId, 400, REF_HASH);
    expect(await policyRegistry.effectiveStatus(policyId)).to.equal(PolicyStatus.Active);

    // Move past the first instalment period (30 days) without paying the 2nd.
    await time.increase(30 * 24 * 60 * 60 + 1);
    expect(await policyRegistry.effectiveStatus(policyId)).to.equal(PolicyStatus.GracePeriod);

    // Move past the grace period (14 days) as well.
    await time.increase(14 * 24 * 60 * 60 + 1);
    expect(await policyRegistry.effectiveStatus(policyId)).to.equal(PolicyStatus.Lapsed);
  });

  it("Pay inside grace period brings the policy back to Active", async function () {
    const policyId = await createPolicy({ mode: PaymentMode.Instalment, instalments: 3 });
    await policyRegistry.connect(relayer).recordPayment(policyId, 400, REF_HASH);

    await time.increase(30 * 24 * 60 * 60 + 1);
    expect(await policyRegistry.effectiveStatus(policyId)).to.equal(PolicyStatus.GracePeriod);

    await policyRegistry.connect(relayer).recordPayment(policyId, 400, REF_HASH);
    expect(await policyRegistry.effectiveStatus(policyId)).to.equal(PolicyStatus.Active);
  });

  it("recordPayment on a lapsed policy reverts", async function () {
    const policyId = await createPolicy({ mode: PaymentMode.Instalment, instalments: 3 });
    await policyRegistry.connect(relayer).recordPayment(policyId, 400, REF_HASH);

    await time.increase(30 * 24 * 60 * 60 + 1 + 14 * 24 * 60 * 60 + 1);
    expect(await policyRegistry.effectiveStatus(policyId)).to.equal(PolicyStatus.Lapsed);

    await expect(
      policyRegistry.connect(relayer).recordPayment(policyId, 400, REF_HASH)
    ).to.be.revertedWithCustomError(policyRegistry, "PolicyLapsedOrExpired");
  });

  it("createPolicy with PayLater reverts", async function () {
    await expect(
      policyRegistry
        .connect(relayer)
        .createPolicy(HOLDER_ID, PolicyType.Motor, 1, PaymentMode.PayLater, 1, 1000)
    ).to.be.revertedWithCustomError(policyRegistry, "PayLaterNotAllowedOnCreate");
  });

  it("Renew with PayLater, unpaid -> GracePeriod, then Lapsed after 14 days", async function () {
    const policyId = await createPolicy({ mode: PaymentMode.PayNow });
    await policyRegistry.connect(relayer).recordPayment(policyId, 1000, REF_HASH);

    // Fast forward close to the end date so renewal is within the 30-day window.
    await time.increase(365 * 24 * 60 * 60 - 10 * 24 * 60 * 60);

    const tx = await policyRegistry
      .connect(relayer)
      .renewPolicy(policyId, PaymentMode.PayLater, 1, 1000);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return policyRegistry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "PolicyRenewed");
    const newPolicyId = event.args.newPolicyId;

    expect(await policyRegistry.effectiveStatus(newPolicyId)).to.equal(PolicyStatus.GracePeriod);

    await time.increase(14 * 24 * 60 * 60 + 1);
    expect(await policyRegistry.effectiveStatus(newPolicyId)).to.equal(PolicyStatus.Lapsed);
  });

  it("Renewal start date equals old end date (no coverage gap)", async function () {
    const policyId = await createPolicy({ mode: PaymentMode.PayNow });
    await policyRegistry.connect(relayer).recordPayment(policyId, 1000, REF_HASH);

    const oldPolicy = await policyRegistry.getPolicy(policyId);

    await time.increase(365 * 24 * 60 * 60 - 10 * 24 * 60 * 60);

    const tx = await policyRegistry
      .connect(relayer)
      .renewPolicy(policyId, PaymentMode.PayNow, 1, 1000);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return policyRegistry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "PolicyRenewed");
    const newPolicyId = event.args.newPolicyId;

    const newPolicy = await policyRegistry.getPolicy(newPolicyId);
    expect(newPolicy.startDate).to.equal(oldPolicy.endDate);
  });

  it("Non-relayer calls createPolicy: reverts (access control)", async function () {
    await expect(
      policyRegistry
        .connect(other)
        .createPolicy(HOLDER_ID, PolicyType.Motor, 1, PaymentMode.PayNow, 1, 1000)
    ).to.be.reverted;
  });
});
