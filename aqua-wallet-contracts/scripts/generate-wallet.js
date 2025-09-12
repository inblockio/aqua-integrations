const { ethers } = require("ethers");
const fs = require("fs");

async function generateWallet() {
  console.log("🔐 Generating new deployment wallet...");
  
  // Generate a new random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("\n📋 Wallet Details:");
  console.log("==================");
  console.log("Address:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  console.log("Mnemonic:", wallet.mnemonic.phrase);
  
  console.log("\n💰 Funding Instructions:");
  console.log("========================");
  console.log("1. Copy the address above:", wallet.address);
  console.log("2. Visit one of these Sepolia faucets:");
  console.log("   - https://sepoliafaucet.com/");
  console.log("   - https://faucets.chain.link/sepolia");
  console.log("   - https://sepolia-faucet.pk910.de/");
  console.log("3. Paste the address and request Sepolia ETH");
  console.log("4. Wait for the transaction to confirm");
  
  console.log("\n🔧 Next Steps:");
  console.log("==============");
  console.log("1. Add the private key to your .env file:");
  console.log(`   SEPOLIA_PRIVATE_KEY=${wallet.privateKey}`);
  console.log("2. Add your Sepolia RPC URL to .env file:");
  console.log("   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID");
  console.log("3. Run: npm run deploy:revision -- --network sepolia");
  
  // Save wallet details to a secure file (not committed to git)
  const walletData = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync("deployment-wallet.json", JSON.stringify(walletData, null, 2));
  console.log("\n💾 Wallet details saved to deployment-wallet.json");
  console.log("⚠️  Keep this file secure and delete it after deployment!");
  
  return wallet;
}

generateWallet()
  .then(() => {
    console.log("\n✅ Wallet generation complete!");
  })
  .catch((error) => {
    console.error("❌ Error generating wallet:", error);
    process.exit(1);
  });
