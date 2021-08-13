// We require the Hardhat Runtime Environment explicitly here. This is optional but useful for running the
// script in a standalone fashion through `node <script>`. When running the script with `hardhat run <script>`,
// you'll find the Hardhat Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { RitzIco, RitzIco__factory } from "../typechain";

async function main(): Promise<void> {
  const RitzIco: RitzIco__factory = await ethers.getContractFactory("RitzIco");
  const ico: RitzIco = await RitzIco.deploy("0x48F91fbC86679e14f481DD3C3381f0e07F93A711");
  await ico.deployed();

  console.log("RitzIco deployed to: ", ico.address);
}

// We recommend this pattern to be able to use async/await everywhere and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
