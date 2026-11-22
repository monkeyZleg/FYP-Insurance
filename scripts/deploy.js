const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  console.log("Deploying with:", deployer.address);

  // ---------------------------------------------------------------
  // 1. Deploy PolicyRegistry
  // ---------------------------------------------------------------
  const PolicyRegistry = await hre.ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  const policyRegistryAddress = await policyRegistry.getAddress();
  console.log("PolicyRegistry deployed:", policyRegistryAddress);

  // ---------------------------------------------------------------
  // 2. Deploy ClaimRegistry(policyRegistryAddress)
  // ---------------------------------------------------------------
  const ClaimRegistry = await hre.ethers.getContractFactory("ClaimRegistry");
  const claimRegistry = await ClaimRegistry.deploy(policyRegistryAddress);
  await claimRegistry.waitForDeployment();
  const claimRegistryAddress = await claimRegistry.getAddress();
  console.log("ClaimRegistry deployed:", claimRegistryAddress);

  // ---------------------------------------------------------------
  // 3. Grant RELAYER_ROLE to the relayer wallet on both contracts
  // ---------------------------------------------------------------
  let relayerAddress = process.env.RELAYER_ADDRESS;
  if (!relayerAddress) {
    relayerAddress = signers[1].address;
    console.warn(
      "WARNING: RELAYER_ADDRESS env var not set. Falling back to signers[1] " +
        `(${relayerAddress}) for local/dev use only. Set RELAYER_ADDRESS in ` +
        "production."
    );
  }

  const PR_RELAYER_ROLE = await policyRegistry.RELAYER_ROLE();
  const CR_RELAYER_ROLE = await claimRegistry.RELAYER_ROLE();

  await (await policyRegistry.grantRole(PR_RELAYER_ROLE, relayerAddress)).wait();
  await (await claimRegistry.grantRole(CR_RELAYER_ROLE, relayerAddress)).wait();
  console.log("Granted RELAYER_ROLE to:", relayerAddress);

  // ---------------------------------------------------------------
  // 4. Grant ADMIN_ROLE / VERIFIER_ROLE / AUDITOR_ROLE to Hardhat test
  //    accounts, for local demo purposes only.
  // ---------------------------------------------------------------
  const ADMIN_ROLE = await claimRegistry.ADMIN_ROLE();
  const VERIFIER_ROLE = await claimRegistry.VERIFIER_ROLE();
  const AUDITOR_ROLE = await claimRegistry.AUDITOR_ROLE();

  const adminSigner = signers[2] || deployer;
  const verifierSigner = signers[3] || deployer;
  const auditorSigner = signers[4] || deployer;

  await (await claimRegistry.grantRole(ADMIN_ROLE, adminSigner.address)).wait();
  await (await claimRegistry.grantRole(VERIFIER_ROLE, verifierSigner.address)).wait();
  await (await claimRegistry.grantRole(AUDITOR_ROLE, auditorSigner.address)).wait();

  console.log("Granted ADMIN_ROLE (ClaimRegistry) to:", adminSigner.address);
  console.log("Granted VERIFIER_ROLE (ClaimRegistry) to:", verifierSigner.address);
  console.log("Granted AUDITOR_ROLE (ClaimRegistry) to:", auditorSigner.address);

  // ---------------------------------------------------------------
  // 5. Summary
  // ---------------------------------------------------------------
  console.log("\n================ Deployment summary ================");
  console.log("PolicyRegistry: ", policyRegistryAddress);
  console.log("ClaimRegistry:  ", claimRegistryAddress);
  console.log("------------------------------------------------------");
  console.log("Deployer (DEFAULT_ADMIN_ROLE on both contracts):", deployer.address);
  console.log("Relayer (RELAYER_ROLE on both contracts):       ", relayerAddress);
  console.log("Admin (ADMIN_ROLE on ClaimRegistry):             ", adminSigner.address);
  console.log("Verifier (VERIFIER_ROLE on ClaimRegistry):       ", verifierSigner.address);
  console.log("Auditor (AUDITOR_ROLE on ClaimRegistry):         ", auditorSigner.address);
  console.log("======================================================");

  const charge = await claimRegistry.serviceCharge();
  console.log(
    `Service charge: ${Number(charge.rateBps) / 100}% of the approved payout, ` +
      `min RM ${Number(charge.minFee) / 100}, max RM ${Number(charge.maxFee) / 100}`
  );

  // ---------------------------------------------------------------
  // 6. Save the addresses and print ready-to-paste env lines
  // ---------------------------------------------------------------
  const out = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    PolicyRegistry: policyRegistryAddress,
    ClaimRegistry: claimRegistryAddress,
    accounts: {
      deployer: deployer.address,
      relayer: relayerAddress,
      admin: adminSigner.address,
      verifier: verifierSigner.address,
      auditor: auditorSigner.address,
    },
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${hre.network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log("\nSaved to", path.relative(process.cwd(), file));

  console.log("\n--- backend/.env ---");
  console.log(`POLICY_REGISTRY_ADDRESS=${policyRegistryAddress}`);
  console.log(`CLAIM_REGISTRY_ADDRESS=${claimRegistryAddress}`);
  console.log("\n--- frontend/.env.local ---");
  console.log(`NEXT_PUBLIC_POLICY_REGISTRY_ADDRESS=${policyRegistryAddress}`);
  console.log(`NEXT_PUBLIC_CLAIM_REGISTRY_ADDRESS=${claimRegistryAddress}`);

  if (hre.network.name === "hardhat") {
    console.warn(
      "\nNOTE: the in-process 'hardhat' network disappears when this script ends. " +
        "For the demo, run `npm run node` in one terminal and `npm run deploy:local` in another."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
