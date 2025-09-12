const { ethers } = require("ethers");

// Your specific data
const SHA256_HASH = "0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715";
const OWNER_ADDRESS = "0x4B23da593596D94035c57Adf6C2454216449B1B2";
const CONTRACT_ADDRESS = "0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47";

// Alchemy RPC URL
const ALCHEMY_RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ";

// Contract ABI
const CONTRACT_ABI = [
  "function register(bytes32 hashPart1, bytes32 hashPart2, address owner) external",
  "event RevisionRegistered(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address indexed owner)"
];

async function deployWithAlchemy(privateKey) {
  try {
    console.log("🚀 Deploying via Alchemy to Sepolia...");
    console.log("=====================================");
    
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    
    console.log("🔗 Connected to Sepolia via Alchemy");
    console.log("👤 Wallet address:", wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);
    console.log("💰 Balance:", balanceInEth, "ETH");
    
    if (balance === 0n) {
      throw new Error("Insufficient balance. Please add Sepolia ETH to your wallet.");
    }
    
    // Convert SHA2-256 to contract format
    const hashPart1 = "0x" + "0".repeat(64); // 32 zero bytes
    const hashPart2 = SHA256_HASH; // The actual SHA2-256 hash
    
    console.log("\n📝 Transaction Details:");
    console.log("  SHA2-256 Hash:", SHA256_HASH);
    console.log("  Hash Part 1 (32 zero bytes):", hashPart1);
    console.log("  Hash Part 2 (SHA2-256):", hashPart2);
    console.log("  Owner Address:", OWNER_ADDRESS);
    console.log("  Contract Address:", CONTRACT_ADDRESS);
    
    // Estimate gas
    console.log("\n⛽ Estimating gas...");
    const gasEstimate = await contract.register.estimateGas(hashPart1, hashPart2, OWNER_ADDRESS);
    console.log("  Estimated gas:", gasEstimate.toString());
    
    // Set gas options
    const gasLimit = gasEstimate + 10000n; // Add buffer
    const gasPrice = ethers.parseUnits("20", "gwei"); // 20 gwei
    
    console.log("  Gas limit:", gasLimit.toString());
    console.log("  Gas price: 20 gwei");
    
    // Send transaction
    console.log("\n📤 Sending transaction...");
    const tx = await contract.register(hashPart1, hashPart2, OWNER_ADDRESS, {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    
    console.log("⏳ Transaction sent:", tx.hash);
    console.log("🔍 View on Etherscan: https://sepolia.etherscan.io/tx/" + tx.hash);
    
    // Wait for confirmation
    console.log("\n⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    
    console.log("\n✅ Transaction confirmed!");
    console.log("  Block number:", receipt.blockNumber);
    console.log("  Gas used:", receipt.gasUsed.toString());
    console.log("  Status:", receipt.status === 1 ? "Success" : "Failed");
    
    if (receipt.logs && receipt.logs.length > 0) {
      console.log("  Events emitted:", receipt.logs.length);
      
      // Parse events
      const iface = new ethers.Interface(CONTRACT_ABI);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "RevisionRegistered") {
            console.log("  📋 RevisionRegistered event:");
            console.log("    Hash Part 1:", parsed.args.hashPart1);
            console.log("    Hash Part 2:", parsed.args.hashPart2);
            console.log("    Owner:", parsed.args.owner);
          }
        } catch (e) {
          // Ignore parsing errors for non-contract logs
        }
      }
    }
    
    console.log("\n🎉 Registration successful!");
    console.log("Contract:", CONTRACT_ADDRESS);
    console.log("Transaction:", tx.hash);
    console.log("Etherscan:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.error("💡 Solution: Add Sepolia ETH to your wallet");
      console.error("   Faucets: https://sepoliafaucet.com/");
    } else if (error.message.includes("nonce")) {
      console.error("💡 Solution: Wait a moment and try again");
    } else if (error.message.includes("gas")) {
      console.error("💡 Solution: Try increasing gas limit or price");
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Main execution
async function main() {
  const privateKey = process.argv[2];
  
  if (!privateKey) {
    console.log("Usage: node scripts/deploy-sha256-alchemy.js <private-key>");
    console.log("");
    console.log("Example:");
    console.log("node scripts/deploy-sha256-alchemy.js 0x1234567890abcdef...");
    console.log("");
    console.log("Your specific transaction data:");
    console.log("SHA2-256 Hash:", SHA256_HASH);
    console.log("Owner Address:", OWNER_ADDRESS);
    console.log("Contract Address:", CONTRACT_ADDRESS);
    process.exit(1);
  }
  
  const result = await deployWithAlchemy(privateKey);
  process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deployWithAlchemy };
