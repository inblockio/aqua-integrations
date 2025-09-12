const { ethers } = require("ethers");

// Your specific data
const SHA256_HASH = "0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715";
const OWNER_ADDRESS = "0x4B23da593596D94035c57Adf6C2454216449B1B2";
const CONTRACT_ADDRESS = "0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47";

// Contract ABI
const CONTRACT_ABI = [
  "function register(bytes32 hashPart1, bytes32 hashPart2, address owner) external",
  "event RevisionRegistered(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address indexed owner)"
];

async function generateRegistrationData() {
  console.log("🔐 Generating registration data for SHA2-256 hash");
  console.log("=================================================");
  
  // Convert SHA2-256 to contract format
  const hashPart1 = "0x" + "0".repeat(64); // 32 zero bytes for SHA2-256 padding
  const hashPart2 = SHA256_HASH; // The actual SHA2-256 hash
  
  console.log("SHA2-256 Hash:", SHA256_HASH);
  console.log("Hash Part 1 (32 zero bytes):", hashPart1);
  console.log("Hash Part 2 (SHA2-256):", hashPart2);
  console.log("Owner Address:", OWNER_ADDRESS);
  console.log("Contract Address:", CONTRACT_ADDRESS);
  
  // Generate the transaction data
  const iface = new ethers.Interface(CONTRACT_ABI);
  const data = iface.encodeFunctionData("register", [hashPart1, hashPart2, OWNER_ADDRESS]);
  
  console.log("\n🦊 MetaMask Transaction Data:");
  console.log("=============================");
  console.log("To:", CONTRACT_ADDRESS);
  console.log("Data:", data);
  console.log("Value: 0x0");
  
  console.log("\n📋 JSON for Frontend:");
  console.log("=====================");
  const transactionData = {
    to: CONTRACT_ADDRESS,
    data: data,
    value: "0x0",
    gasLimit: "200000", // Estimated gas limit
    gasPrice: "20000000000" // 20 gwei (adjust as needed)
  };
  
  console.log(JSON.stringify(transactionData, null, 2));
  
  console.log("\n🔧 CLI Commands:");
  console.log("================");
  console.log("# Register using CLI:");
  console.log(`node scripts/revision-cli.js register ${hashPart1} ${hashPart2} ${OWNER_ADDRESS} --metamask`);
  console.log("");
  console.log("# Query owner after registration:");
  console.log(`node scripts/revision-cli.js query ${hashPart1} ${hashPart2}`);
  
  return transactionData;
}

// Run the script
generateRegistrationData().catch(console.error);
