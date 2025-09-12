const { ethers } = require("ethers");
require("dotenv").config();

async function checkBalance() {
  try {
    console.log("🔍 Checking wallet balance...");
    
    // Create provider for Sepolia
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Get wallet from private key
    const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
    
    console.log("Wallet Address:", wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log("Balance:", balanceInEth, "ETH");
    
    if (balance > 0) {
      console.log("✅ Wallet has funds! Ready for deployment.");
      return true;
    } else {
      console.log("❌ Wallet has no funds. Please add Sepolia ETH first.");
      console.log("\n💰 Fund this address:", wallet.address);
      console.log("Faucets:");
      console.log("- https://sepoliafaucet.com/");
      console.log("- https://faucets.chain.link/sepolia");
      return false;
    }
    
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
    
    if (error.message.includes("Empty string")) {
      console.log("\n🔧 Please update your .env file with a valid Sepolia RPC URL:");
      console.log("SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID");
    }
    
    return false;
  }
}

checkBalance();
