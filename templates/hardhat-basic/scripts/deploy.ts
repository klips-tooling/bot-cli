import { ethers } from "hardhat";

async function main() {
  if (!process.env.PRIVATE_KEY) {
    console.log("Warning: PRIVATE_KEY environment variable not set. Using default test account.");
  }
  const contract = await ethers.deployContract("{{contractName}}");
  await contract.waitForDeployment();
  console.log(`{{contractName}} deployed to ${contract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
