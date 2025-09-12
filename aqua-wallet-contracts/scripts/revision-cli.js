#!/usr/bin/env node

const { ethers } = require("ethers");
const { Command } = require("commander");
const fs = require("fs");
const path = require("path");

// Contract ABI
const CONTRACT_ABI = [
  "function register(bytes32 hashPart1, bytes32 hashPart2, address owner) external",
  "function transferOwnership(bytes32 hashPart1, bytes32 hashPart2, address newOwner) external",
  "function renounceOwnership(bytes32 hashPart1, bytes32 hashPart2) external",
  "function ownerOf(bytes32 hashPart1, bytes32 hashPart2) external view returns (address)",
  "function owners(bytes32, bytes32) external view returns (address)",
  "event RevisionRegistered(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address indexed owner)",
  "event OwnershipTransferred(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address oldOwner, address newOwner)",
  "event OwnershipRenounced(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address oldOwner)"
];

// Contract address on Sepolia
const CONTRACT_ADDRESS = "0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47";

// Sepolia RPC URL (you can override with environment variable)
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ";

class RevisionCLI {
  constructor() {
    this.program = new Command();
    this.provider = null;
    this.contract = null;
    this.setupCommands();
  }

  async connect() {
    try {
      this.provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
      
      // Test connection
      const network = await this.provider.getNetwork();
      console.log(`🔗 Connected to ${network.name} (Chain ID: ${network.chainId})`);
      console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
      
      return true;
    } catch (error) {
      console.error("❌ Connection failed:", error.message);
      return false;
    }
  }

  setupCommands() {
    this.program
      .name("revision-cli")
      .description("CLI tool for interacting with RevisionOwnership contract")
      .version("1.0.0");

    // Register command
    this.program
      .command("register")
      .description("Register a new revision with an owner")
      .argument("<hashPart1>", "First 32 bytes of the hash (0x... or hex string)")
      .argument("<hashPart2>", "Second 32 bytes of the hash (0x... or hex string)")
      .argument("<owner>", "Owner address")
      .option("-p, --private-key <key>", "Private key for signing (optional)")
      .option("-m, --metamask", "Generate MetaMask transaction data")
      .action(async (hashPart1, hashPart2, owner, options) => {
        await this.handleRegister(hashPart1, hashPart2, owner, options);
      });

    // Transfer command
    this.program
      .command("transfer")
      .description("Transfer ownership of a revision")
      .argument("<hashPart1>", "First 32 bytes of the hash")
      .argument("<hashPart2>", "Second 32 bytes of the hash")
      .argument("<newOwner>", "New owner address")
      .option("-p, --private-key <key>", "Private key for signing")
      .option("-m, --metamask", "Generate MetaMask transaction data")
      .action(async (hashPart1, hashPart2, newOwner, options) => {
        await this.handleTransfer(hashPart1, hashPart2, newOwner, options);
      });

    // Renounce command
    this.program
      .command("renounce")
      .description("Renounce ownership of a revision")
      .argument("<hashPart1>", "First 32 bytes of the hash")
      .argument("<hashPart2>", "Second 32 bytes of the hash")
      .option("-p, --private-key <key>", "Private key for signing")
      .option("-m, --metamask", "Generate MetaMask transaction data")
      .action(async (hashPart1, hashPart2, options) => {
        await this.handleRenounce(hashPart1, hashPart2, options);
      });

    // Query command
    this.program
      .command("query")
      .description("Query the owner of a revision")
      .argument("<hashPart1>", "First 32 bytes of the hash")
      .argument("<hashPart2>", "Second 32 bytes of the hash")
      .action(async (hashPart1, hashPart2) => {
        await this.handleQuery(hashPart1, hashPart2);
      });

    // Hash command for SHA2-256
    this.program
      .command("hash")
      .description("Convert SHA2-256 hash to contract format")
      .argument("<sha256Hash>", "SHA2-256 hash (32 bytes)")
      .action(async (sha256Hash) => {
        this.handleHashConversion(sha256Hash);
      });

    // MetaMask command
    this.program
      .command("metamask")
      .description("Generate MetaMask transaction data")
      .argument("<action>", "Action: register, transfer, renounce")
      .argument("[args...]", "Arguments for the action")
      .action(async (action, args) => {
        await this.handleMetaMask(action, args);
      });

    // Deploy command for direct execution
    this.program
      .command("deploy")
      .description("Deploy/execute transaction directly via Alchemy")
      .argument("<action>", "Action: register, transfer, renounce")
      .argument("[args...]", "Arguments for the action")
      .option("-p, --private-key <key>", "Private key for signing (required)")
      .option("-g, --gas-limit <limit>", "Gas limit (default: 200000)", "200000")
      .option("-w, --gas-price <price>", "Gas price in gwei (default: 20)", "20")
      .action(async (action, args, options) => {
        await this.handleDeploy(action, args, options);
      });
  }

  parseHash(hash) {
    // Remove 0x prefix if present
    if (hash.startsWith("0x")) {
      hash = hash.slice(2);
    }
    
    // Ensure it's 64 characters (32 bytes)
    if (hash.length !== 64) {
      throw new Error("Hash must be 32 bytes (64 hex characters)");
    }
    
    return "0x" + hash;
  }

  handleHashConversion(sha256Hash) {
    try {
      const hash = this.parseHash(sha256Hash);
      const hashPart1 = "0x" + "0".repeat(64); // 32 zero bytes
      const hashPart2 = hash;
      
      console.log("🔐 SHA2-256 Hash Conversion:");
      console.log("============================");
      console.log("Original SHA2-256:", hash);
      console.log("Hash Part 1 (32 zero bytes):", hashPart1);
      console.log("Hash Part 2 (SHA2-256):", hashPart2);
      console.log("");
      console.log("Use these values with the contract:");
      console.log(`revision-cli register ${hashPart1} ${hashPart2} <owner-address>`);
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  async handleRegister(hashPart1, hashPart2, owner, options) {
    try {
      await this.connect();
      
      const hash1 = this.parseHash(hashPart1);
      const hash2 = this.parseHash(hashPart2);
      
      if (options.metamask) {
        this.generateMetaMaskData("register", [hash1, hash2, owner]);
        return;
      }
      
      if (options.privateKey) {
        const wallet = new ethers.Wallet(options.privateKey, this.provider);
        const contract = this.contract.connect(wallet);
        
        console.log("📝 Registering revision...");
        const tx = await contract.register(hash1, hash2, owner);
        console.log("⏳ Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      } else {
        console.log("📝 Register transaction data:");
        console.log("Function: register(bytes32,bytes32,address)");
        console.log("Parameters:");
        console.log(`  hashPart1: ${hash1}`);
        console.log(`  hashPart2: ${hash2}`);
        console.log(`  owner: ${owner}`);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  async handleTransfer(hashPart1, hashPart2, newOwner, options) {
    try {
      await this.connect();
      
      const hash1 = this.parseHash(hashPart1);
      const hash2 = this.parseHash(hashPart2);
      
      if (options.metamask) {
        this.generateMetaMaskData("transferOwnership", [hash1, hash2, newOwner]);
        return;
      }
      
      if (options.privateKey) {
        const wallet = new ethers.Wallet(options.privateKey, this.provider);
        const contract = this.contract.connect(wallet);
        
        console.log("📝 Transferring ownership...");
        const tx = await contract.transferOwnership(hash1, hash2, newOwner);
        console.log("⏳ Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      } else {
        console.log("📝 Transfer ownership transaction data:");
        console.log("Function: transferOwnership(bytes32,bytes32,address)");
        console.log("Parameters:");
        console.log(`  hashPart1: ${hash1}`);
        console.log(`  hashPart2: ${hash2}`);
        console.log(`  newOwner: ${newOwner}`);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  async handleRenounce(hashPart1, hashPart2, options) {
    try {
      await this.connect();
      
      const hash1 = this.parseHash(hashPart1);
      const hash2 = this.parseHash(hashPart2);
      
      if (options.metamask) {
        this.generateMetaMaskData("renounceOwnership", [hash1, hash2]);
        return;
      }
      
      if (options.privateKey) {
        const wallet = new ethers.Wallet(options.privateKey, this.provider);
        const contract = this.contract.connect(wallet);
        
        console.log("📝 Renouncing ownership...");
        const tx = await contract.renounceOwnership(hash1, hash2);
        console.log("⏳ Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      } else {
        console.log("📝 Renounce ownership transaction data:");
        console.log("Function: renounceOwnership(bytes32,bytes32)");
        console.log("Parameters:");
        console.log(`  hashPart1: ${hash1}`);
        console.log(`  hashPart2: ${hash2}`);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  async handleQuery(hashPart1, hashPart2) {
    try {
      await this.connect();
      
      const hash1 = this.parseHash(hashPart1);
      const hash2 = this.parseHash(hashPart2);
      
      console.log("🔍 Querying owner...");
      const owner = await this.contract.ownerOf(hash1, hash2);
      
      if (owner === ethers.ZeroAddress) {
        console.log("❌ No owner found (not registered or renounced)");
      } else {
        console.log("✅ Owner:", owner);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  generateMetaMaskData(functionName, params) {
    const iface = new ethers.Interface(CONTRACT_ABI);
    const data = iface.encodeFunctionData(functionName, params);
    
    console.log("🦊 MetaMask Transaction Data:");
    console.log("=============================");
    console.log("To:", CONTRACT_ADDRESS);
    console.log("Data:", data);
    console.log("");
    console.log("Copy this data to send via MetaMask or use in your frontend:");
    console.log(JSON.stringify({
      to: CONTRACT_ADDRESS,
      data: data,
      value: "0x0"
    }, null, 2));
  }

  async handleMetaMask(action, args) {
    switch (action) {
      case "register":
        if (args.length < 3) {
          console.error("❌ Usage: revision-cli metamask register <hashPart1> <hashPart2> <owner>");
          return;
        }
        await this.handleRegister(args[0], args[1], args[2], { metamask: true });
        break;
      case "transfer":
        if (args.length < 3) {
          console.error("❌ Usage: revision-cli metamask transfer <hashPart1> <hashPart2> <newOwner>");
          return;
        }
        await this.handleTransfer(args[0], args[1], args[2], { metamask: true });
        break;
      case "renounce":
        if (args.length < 2) {
          console.error("❌ Usage: revision-cli metamask renounce <hashPart1> <hashPart2>");
          return;
        }
        await this.handleRenounce(args[0], args[1], { metamask: true });
        break;
      default:
        console.error("❌ Unknown action. Use: register, transfer, or renounce");
    }
  }

  async handleDeploy(action, args, options) {
    if (!options.privateKey) {
      console.error("❌ Private key is required for deployment. Use -p or --private-key");
      return;
    }

    try {
      await this.connect();
      
      const wallet = new ethers.Wallet(options.privateKey, this.provider);
      const contract = this.contract.connect(wallet);
      
      console.log("🔗 Connected to Sepolia via Alchemy");
      console.log("👤 Wallet address:", wallet.address);
      
      // Check balance
      const balance = await this.provider.getBalance(wallet.address);
      const balanceInEth = ethers.formatEther(balance);
      console.log("💰 Balance:", balanceInEth, "ETH");
      
      if (balance === 0n) {
        console.error("❌ Insufficient balance. Please add Sepolia ETH to your wallet.");
        return;
      }

      // Set gas options
      const gasLimit = parseInt(options.gasLimit);
      const gasPrice = ethers.parseUnits(options.gasPrice, "gwei");
      
      console.log("⛽ Gas limit:", gasLimit);
      console.log("⛽ Gas price:", options.gasPrice, "gwei");

      switch (action) {
        case "register":
          if (args.length < 3) {
            console.error("❌ Usage: revision-cli deploy register <hashPart1> <hashPart2> <owner> -p <private-key>");
            return;
          }
          await this.executeRegister(contract, args[0], args[1], args[2], gasLimit, gasPrice);
          break;
        case "transfer":
          if (args.length < 3) {
            console.error("❌ Usage: revision-cli deploy transfer <hashPart1> <hashPart2> <newOwner> -p <private-key>");
            return;
          }
          await this.executeTransfer(contract, args[0], args[1], args[2], gasLimit, gasPrice);
          break;
        case "renounce":
          if (args.length < 2) {
            console.error("❌ Usage: revision-cli deploy renounce <hashPart1> <hashPart2> -p <private-key>");
            return;
          }
          await this.executeRenounce(contract, args[0], args[1], gasLimit, gasPrice);
          break;
        default:
          console.error("❌ Unknown action. Use: register, transfer, or renounce");
      }
    } catch (error) {
      console.error("❌ Deployment failed:", error.message);
    }
  }

  async executeRegister(contract, hashPart1, hashPart2, owner, gasLimit, gasPrice) {
    try {
      const hash1 = this.parseHash(hashPart1);
      const hash2 = this.parseHash(hashPart2);
      
      console.log("📝 Registering revision...");
      console.log("  Hash Part 1:", hash1);
      console.log("  Hash Part 2:", hash2);
      console.log("  Owner:", owner);
      
      const tx = await contract.register(hash1, hash2, owner, {
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });
      
      console.log("⏳ Transaction sent:", tx.hash);
      console.log("🔍 View on Etherscan: https://sepolia.etherscan.io/tx/" + tx.hash);
      
      console.log("⏳ Waiting for confirmation...");
      const receipt = await tx.wait();
      
      console.log("✅ Transaction confirmed!");
      console.log("  Block number:", receipt.blockNumber);
      console.log("  Gas used:", receipt.gasUsed.toString());
      console.log("  Status:", receipt.status === 1 ? "Success" : "Failed");
      
      if (receipt.logs && receipt.logs.length > 0) {
        console.log("📋 Events emitted:", receipt.logs.length);
      }
      
    } catch (error) {
      console.error("❌ Registration failed:", error.message);
      throw error;
    }
  }

  async executeTransfer(contract, hashPart1, hashPart2, newOwner, gasLimit, gasPrice) {
    try {
      const hash1 = this.parseHash(hashPart1);
      const hash2 = this.parseHash(hashPart2);
      
      console.log("📝 Transferring ownership...");
      console.log("  Hash Part 1:", hash1);
      console.log("  Hash Part 2:", hash2);
      console.log("  New Owner:", newOwner);
      
      const tx = await contract.transferOwnership(hash1, hash2, newOwner, {
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });
      
      console.log("⏳ Transaction sent:", tx.hash);
      console.log("🔍 View on Etherscan: https://sepolia.etherscan.io/tx/" + tx.hash);
      
      console.log("⏳ Waiting for confirmation...");
      const receipt = await tx.wait();
      
      console.log("✅ Transaction confirmed!");
      console.log("  Block number:", receipt.blockNumber);
      console.log("  Gas used:", receipt.gasUsed.toString());
      console.log("  Status:", receipt.status === 1 ? "Success" : "Failed");
      
    } catch (error) {
      console.error("❌ Transfer failed:", error.message);
      throw error;
    }
  }

  async executeRenounce(contract, hashPart1, hashPart2, gasLimit, gasPrice) {
    try {
      const hash1 = this.parseHash(hashPart1);
      const hash2 = this.parseHash(hashPart2);
      
      console.log("📝 Renouncing ownership...");
      console.log("  Hash Part 1:", hash1);
      console.log("  Hash Part 2:", hash2);
      
      const tx = await contract.renounceOwnership(hash1, hash2, {
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });
      
      console.log("⏳ Transaction sent:", tx.hash);
      console.log("🔍 View on Etherscan: https://sepolia.etherscan.io/tx/" + tx.hash);
      
      console.log("⏳ Waiting for confirmation...");
      const receipt = await tx.wait();
      
      console.log("✅ Transaction confirmed!");
      console.log("  Block number:", receipt.blockNumber);
      console.log("  Gas used:", receipt.gasUsed.toString());
      console.log("  Status:", receipt.status === 1 ? "Success" : "Failed");
      
    } catch (error) {
      console.error("❌ Renounce failed:", error.message);
      throw error;
    }
  }

  async run() {
    await this.program.parseAsync();
  }
}

// Run the CLI
const cli = new RevisionCLI();
cli.run().catch(console.error);
