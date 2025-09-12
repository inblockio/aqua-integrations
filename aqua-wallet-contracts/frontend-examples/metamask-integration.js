// Frontend Integration Example for RevisionOwnership Contract
// Contract: 0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47

class RevisionContract {
  constructor() {
    this.contractAddress = "0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47";
    this.contractABI = [
      "function register(bytes32 hashPart1, bytes32 hashPart2, address owner) external",
      "function transferOwnership(bytes32 hashPart1, bytes32 hashPart2, address newOwner) external",
      "function renounceOwnership(bytes32 hashPart1, bytes32 hashPart2) external",
      "function ownerOf(bytes32 hashPart1, bytes32 hashPart2) external view returns (address)",
      "event RevisionRegistered(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address indexed owner)",
      "event OwnershipTransferred(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address oldOwner, address newOwner)",
      "event OwnershipRenounced(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address oldOwner)"
    ];
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled() {
    return typeof window.ethereum !== "undefined";
  }

  // Request account access
  async requestAccount() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      return accounts[0];
    } catch (error) {
      throw new Error("User denied account access");
    }
  }

  // Convert SHA2-256 hash to contract format
  convertSHA256ToContractFormat(sha256Hash) {
    // Remove 0x prefix if present
    if (sha256Hash.startsWith("0x")) {
      sha256Hash = sha256Hash.slice(2);
    }

    // Ensure it's 64 characters (32 bytes)
    if (sha256Hash.length !== 64) {
      throw new Error("Hash must be 32 bytes (64 hex characters)");
    }

    return {
      hashPart1: "0x" + "0".repeat(64), // 32 zero bytes
      hashPart2: "0x" + sha256Hash      // Actual SHA2-256 hash
    };
  }

  // Generate transaction data for registration
  generateRegisterData(hashPart1, hashPart2, owner) {
    // Function selector for register(bytes32,bytes32,address)
    const functionSelector = "0x15d7bf44";
    
    // Pad parameters to 32 bytes each
    const paddedHash1 = hashPart1.slice(2).padStart(64, "0");
    const paddedHash2 = hashPart2.slice(2).padStart(64, "0");
    const paddedOwner = owner.slice(2).padStart(64, "0");
    
    return functionSelector + paddedHash1 + paddedHash2 + paddedOwner;
  }

  // Register a revision
  async registerRevision(sha256Hash, owner) {
    try {
      const { hashPart1, hashPart2 } = this.convertSHA256ToContractFormat(sha256Hash);
      const data = this.generateRegisterData(hashPart1, hashPart2, owner);

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          to: this.contractAddress,
          data: data,
          value: "0x0",
          gasLimit: "0x30d40", // 200,000 gas
          gasPrice: "0x4a817c800" // 20 gwei
        }]
      });

      return txHash;
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  // Query owner of a revision
  async queryOwner(sha256Hash) {
    try {
      const { hashPart1, hashPart2 } = this.convertSHA256ToContractFormat(sha256Hash);
      
      // This would require a provider like ethers.js for view functions
      // For now, return the transaction data for manual query
      return {
        hashPart1,
        hashPart2,
        contractAddress: this.contractAddress
      };
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  // Generate MetaMask transaction data (for manual sending)
  generateMetaMaskData(action, sha256Hash, ...args) {
    const { hashPart1, hashPart2 } = this.convertSHA256ToContractFormat(sha256Hash);
    
    let data;
    switch (action) {
      case "register":
        data = this.generateRegisterData(hashPart1, hashPart2, args[0]);
        break;
      case "transfer":
        // Function selector for transferOwnership(bytes32,bytes32,address)
        const transferSelector = "0x8f4ffcb1";
        const paddedNewOwner = args[0].slice(2).padStart(64, "0");
        data = transferSelector + hashPart1.slice(2).padStart(64, "0") + 
               hashPart2.slice(2).padStart(64, "0") + paddedNewOwner;
        break;
      case "renounce":
        // Function selector for renounceOwnership(bytes32,bytes32)
        const renounceSelector = "0x715018a6";
        data = renounceSelector + hashPart1.slice(2).padStart(64, "0") + 
               hashPart2.slice(2).padStart(64, "0");
        break;
      default:
        throw new Error("Unknown action");
    }

    return {
      to: this.contractAddress,
      data: data,
      value: "0x0",
      gasLimit: "0x30d40",
      gasPrice: "0x4a817c800"
    };
  }
}

// Usage Examples
const revisionContract = new RevisionContract();

// Example 1: Register your specific revision
async function registerYourRevision() {
  try {
    const account = await revisionContract.requestAccount();
    console.log("Connected account:", account);

    const sha256Hash = "0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715";
    const owner = "0x4B23da593596D94035c57Adf6C2454216449B1B2";

    const txHash = await revisionContract.registerRevision(sha256Hash, owner);
    console.log("Transaction sent:", txHash);
    
    // Wait for confirmation
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });
    
    console.log("Transaction confirmed:", receipt);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Example 2: Generate MetaMask data for manual sending
function generateMetaMaskData() {
  const sha256Hash = "0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715";
  const owner = "0x4B23da593596D94035c57Adf6C2454216449B1B2";

  const txData = revisionContract.generateMetaMaskData("register", sha256Hash, owner);
  console.log("MetaMask Transaction Data:", txData);
  
  return txData;
}

// Example 3: React Hook
function useRevisionContract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const registerRevision = async (sha256Hash, owner) => {
    setLoading(true);
    setError(null);
    
    try {
      const txHash = await revisionContract.registerRevision(sha256Hash, owner);
      return txHash;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { registerRevision, loading, error };
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RevisionContract, useRevisionContract };
}
