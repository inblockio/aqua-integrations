# RevisionOwnership CLI Tool

A comprehensive command-line interface for interacting with the deployed RevisionOwnership contract on Sepolia.

## Contract Details
- **Address**: `0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47`
- **Network**: Sepolia Testnet
- **Explorer**: https://sepolia.etherscan.io/address/0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47

## Installation & Setup

```bash
# Install dependencies
npm install

# Make CLI executable
chmod +x scripts/revision-cli.js
```

## Quick Start

### Your Specific Transaction
For your SHA2-256 hash `0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715` and owner `0x4B23da593596D94035c57Adf6C2454216449B1B2`:

```bash
# Generate MetaMask transaction data
npm run register:sha256

# Or use the CLI directly
npm run revision metamask register 0x0000000000000000000000000000000000000000000000000000000000000000 0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715 0x4B23da593596D94035c57Adf6C2454216449B1B2
```

## CLI Commands

### 1. Hash Conversion
Convert SHA2-256 hash to contract format:

```bash
npm run revision hash <sha256-hash>
```

**Example:**
```bash
npm run revision hash 0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715
```

### 2. Register Revision
Register a new revision with an owner:

```bash
npm run revision register <hashPart1> <hashPart2> <owner> [options]
```

**Options:**
- `-p, --private-key <key>`: Private key for signing
- `-m, --metamask`: Generate MetaMask transaction data

**Examples:**
```bash
# Generate MetaMask data
npm run revision register 0x0000000000000000000000000000000000000000000000000000000000000000 0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715 0x4B23da593596D94035c57Adf6C2454216449B1B2 --metamask

# Execute with private key
npm run revision register 0x0000000000000000000000000000000000000000000000000000000000000000 0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715 0x4B23da593596D94035c57Adf6C2454216449B1B2 -p YOUR_PRIVATE_KEY
```

### 3. Transfer Ownership
Transfer ownership of a revision:

```bash
npm run revision transfer <hashPart1> <hashPart2> <newOwner> [options]
```

**Example:**
```bash
npm run revision transfer 0x0000000000000000000000000000000000000000000000000000000000000000 0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715 0xNEW_OWNER_ADDRESS --metamask
```

### 4. Renounce Ownership
Renounce ownership of a revision:

```bash
npm run revision renounce <hashPart1> <hashPart2> [options]
```

**Example:**
```bash
npm run revision renounce 0x0000000000000000000000000000000000000000000000000000000000000000 0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715 --metamask
```

### 5. Query Owner
Query the current owner of a revision:

```bash
npm run revision query <hashPart1> <hashPart2>
```

**Example:**
```bash
npm run revision query 0x0000000000000000000000000000000000000000000000000000000000000000 0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715
```

### 6. MetaMask Integration
Generate MetaMask transaction data:

```bash
npm run revision metamask <action> [args...]
```

**Actions:**
- `register <hashPart1> <hashPart2> <owner>`
- `transfer <hashPart1> <hashPart2> <newOwner>`
- `renounce <hashPart1> <hashPart2>`

## Frontend Integration

### JavaScript/TypeScript Example

```javascript
// MetaMask transaction data for your specific case
const transactionData = {
  to: "0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47",
  data: "0x15d7bf440000000000000000000000000000000000000000000000000000000000000000adf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a07537150000000000000000000000004b23da593596d94035c57adf6c2454216449b1b2",
  value: "0x0",
  gasLimit: "200000",
  gasPrice: "20000000000"
};

// Send transaction via MetaMask
async function sendTransaction() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionData]
      });
      console.log("Transaction sent:", txHash);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  }
}
```

### React Hook Example

```javascript
import { useState } from 'react';

function useRevisionContract() {
  const [loading, setLoading] = useState(false);

  const registerRevision = async (hashPart1, hashPart2, owner) => {
    setLoading(true);
    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          to: "0x6E41e8FE3CBB7A6d98723e2E0dB7EF4a1a820f47",
          data: generateRegisterData(hashPart1, hashPart2, owner),
          value: "0x0"
        }]
      });
      return txHash;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { registerRevision, loading };
}
```

## Hash Format Support

### SHA2-256 (32 bytes) - Your Case
For SHA2-256 hashes, use:
- `hashPart1`: `0x0000000000000000000000000000000000000000000000000000000000000000` (32 zero bytes)
- `hashPart2`: Your actual SHA2-256 hash

### SHA3-512 (64 bytes)
For SHA3-512 hashes, split into two 32-byte parts:
- `hashPart1`: First 32 bytes
- `hashPart2`: Second 32 bytes

## Environment Variables

Set up your `.env` file for direct contract interaction:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
SEPOLIA_PRIVATE_KEY=YOUR_PRIVATE_KEY
```

## Gas Estimation

Typical gas costs on Sepolia:
- **Registration**: ~50,000 gas
- **Transfer**: ~30,000 gas
- **Renounce**: ~25,000 gas
- **Query**: ~2,000 gas (view function)

## Error Handling

Common errors and solutions:

1. **"Not authorized: only current owner"**
   - Only the current owner can transfer/renounce ownership

2. **"Revision already registered"**
   - The revision hash combination already exists

3. **"Owner cannot be zero address"**
   - Cannot register or transfer to zero address

4. **"Empty string for network URL"**
   - Set `SEPOLIA_RPC_URL` in your `.env` file

## Security Notes

- Never commit private keys to version control
- Use testnet accounts for development
- Verify contract addresses before transactions
- Keep wallet details secure

## Troubleshooting

### CLI Not Working
```bash
# Check if dependencies are installed
npm install

# Make script executable
chmod +x scripts/revision-cli.js

# Test basic functionality
npm run revision --help
```

### Connection Issues
```bash
# Check RPC URL
echo $SEPOLIA_RPC_URL

# Test connection
npm run revision query 0x0000000000000000000000000000000000000000000000000000000000000000 0xadf63d3452addf2fea1249bd4cc500a1e7e107850b9ebdb443172a76a0753715
```

### MetaMask Integration
- Ensure MetaMask is connected to Sepolia
- Check that the account has sufficient ETH for gas
- Verify the contract address is correct
