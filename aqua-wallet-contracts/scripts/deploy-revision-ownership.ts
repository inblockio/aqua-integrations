const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying RevisionOwnership contract...");

  // Get the contract factory
  const RevisionOwnership = await ethers.getContractFactory("RevisionOwnership");

  // Deploy the contract
  const revisionOwnership = await RevisionOwnership.deploy();
  await revisionOwnership.waitForDeployment();

  const contractAddress = await revisionOwnership.getAddress();
  console.log("RevisionOwnership deployed to:", contractAddress);

  // Verify deployment by checking the contract address
  const code = await ethers.provider.getCode(contractAddress);
  if (code === "0x") {
    throw new Error("Contract deployment failed - no code at address");
  }

  console.log("Contract deployment verified successfully!");
  console.log("Contract address:", contractAddress);
  
  // Optional: Test basic functionality
  console.log("\nTesting basic functionality...");
  
  // Create test hash parts
  const hashPart1 = ethers.keccak256(ethers.toUtf8Bytes("test-deployment-hash-1"));
  const hashPart2 = ethers.keccak256(ethers.toUtf8Bytes("test-deployment-hash-2"));
  
  // Get the deployer address
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Test registration
  console.log("Testing registration...");
  await revisionOwnership.register(hashPart1, hashPart2, deployer.address);
  console.log("✓ Registration successful");
  
  // Test owner query
  const owner = await revisionOwnership.ownerOf(hashPart1, hashPart2);
  console.log("✓ Owner query successful, owner:", owner);
  
  console.log("\nDeployment and basic functionality test completed successfully!");
  
  return {
    contractAddress,
    contract: revisionOwnership
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
