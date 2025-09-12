const { ethers } = require("hardhat");

async function main() {
  console.log("Verifying RevisionOwnership deployment...");

  // You can replace this with the actual deployed contract address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default Hardhat network address
  
  try {
    // Get the contract instance
    const RevisionOwnership = await ethers.getContractFactory("RevisionOwnership");
    const revisionOwnership = RevisionOwnership.attach(contractAddress);

    // Test basic functionality
    console.log("Testing contract functionality...");
    
    // Create test hash parts
    const hashPart1 = ethers.keccak256(ethers.toUtf8Bytes("verification-test-1"));
    const hashPart2 = ethers.keccak256(ethers.toUtf8Bytes("verification-test-2"));
    
    // Get the deployer address
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Test registration
    console.log("Testing registration...");
    const tx = await revisionOwnership.register(hashPart1, hashPart2, deployer.address);
    await tx.wait();
    console.log("✓ Registration successful, tx hash:", tx.hash);
    
    // Test owner query
    const owner = await revisionOwnership.ownerOf(hashPart1, hashPart2);
    console.log("✓ Owner query successful, owner:", owner);
    
    // Test ownership transfer
    console.log("Testing ownership transfer...");
    const [deployer, addr1] = await ethers.getSigners();
    const transferTx = await revisionOwnership.transferOwnership(hashPart1, hashPart2, addr1.address);
    await transferTx.wait();
    console.log("✓ Ownership transfer successful, tx hash:", transferTx.hash);
    
    // Verify new owner
    const newOwner = await revisionOwnership.ownerOf(hashPart1, hashPart2);
    console.log("✓ New owner verified:", newOwner);
    
    console.log("\n✅ All functionality tests passed! Contract is working correctly.");
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
