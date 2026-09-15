const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const AccessControl = await hre.ethers.getContractFactory("AccessControl");
  const ac = await AccessControl.deploy();
  await ac.waitForDeployment();
  console.log("AccessControl deployed:", await ac.getAddress());

  const ClaimRegistry = await hre.ethers.getContractFactory("ClaimRegistry");
  const cr = await ClaimRegistry.deploy(await ac.getAddress());
  await cr.waitForDeployment();
  console.log("ClaimRegistry deployed:", await cr.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
