const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessControl", function () {
  let accessControl, owner, user1, user2;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const AC = await ethers.getContractFactory("AccessControl");
    accessControl = await AC.deploy();
  });

  it("should set deployer as admin", async function () {
    const ADMIN = ethers.keccak256(ethers.toUtf8Bytes("ADMIN"));
    const role = await accessControl.getRole(owner.address);
    expect(role).to.equal(ADMIN);
  });

  it("should allow owner to assign roles", async function () {
    const POLICYHOLDER = ethers.keccak256(ethers.toUtf8Bytes("POLICYHOLDER"));
    await accessControl.assignRole(user1.address, POLICYHOLDER);
    const hasRole = await accessControl.hasRole(user1.address, POLICYHOLDER);
    expect(hasRole).to.be.true;
  });

  it("should reject role assignment from non-owner", async function () {
    const VERIFIER = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER"));
    await expect(
      accessControl.connect(user1).assignRole(user2.address, VERIFIER)
    ).to.be.revertedWith("Not contract owner");
  });

  it("should return false for incorrect role check", async function () {
    const VERIFIER = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER"));
    const hasRole = await accessControl.hasRole(user1.address, VERIFIER);
    expect(hasRole).to.be.false;
  });
});
