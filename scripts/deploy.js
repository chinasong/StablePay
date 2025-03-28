const hre = require("hardhat");

async function main() {
  console.log("Deploying CollateralTokenFactory...");

  const CollateralTokenFactory = await hre.ethers.getContractFactory("CollateralTokenFactory");
  const factory = await CollateralTokenFactory.deploy();
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("CollateralTokenFactory deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 