# RevisionOwnership Contract Deployment Guide

## Overview
The `RevisionOwnership` contract manages ownership of genesis revisions using 64-byte hashes (SHA3-512 or padded SHA2-256) in the Aqua Protocol schema v3.

## Contract Features
- **Registration**: Anyone can register a revision with a specified owner
- **Ownership Transfer**: Only current owners can transfer ownership
- **Ownership Renunciation**: Owners can renounce ownership (irreversible)
- **Owner Query**: Check current owner of any revision
- **Hash Support**: Supports both SHA3-512 (64 bytes) and SHA2-256 (32 bytes padded to 64)

## Testing

### Run All Tests
```bash
npm run test:revision
```

### Run Specific Test Categories
```bash
# Test registration functionality
npx hardhat test test/RevisionOwnership.ts --grep "Registration"

# Test ownership transfer
npx hardhat test test/RevisionOwnership.ts --grep "Ownership Transfer"

# Test edge cases
npx hardhat test test/RevisionOwnership.ts --grep "Edge Cases"
```

## Deployment

### Local Development (Hardhat Network)
```bash
# Deploy to local Hardhat network
npm run deploy:revision
```

### Testnet Deployment (Sepolia)
```bash
# Set environment variables
export SEPOLIA_RPC_URL="your_sepolia_rpc_url"
export SEPOLIA_PRIVATE_KEY="your_private_key"

# Deploy to Sepolia
npx hardhat run scripts/deploy-revision-ownership.ts --network sepolia
```

### Mainnet Deployment
```bash
# Set environment variables
export MAINNET_RPC_URL="your_mainnet_rpc_url"
export MAINNET_PRIVATE_KEY="your_private_key"

# Deploy to mainnet
npx hardhat run scripts/deploy-revision-ownership.ts --network mainnet
```

## Contract Usage Examples

### Registration
```javascript
const { ethers } = require("hardhat");

// Create hash parts (64 bytes total)
const hashPart1 = ethers.keccak256(ethers.toUtf8Bytes("first-32-bytes"));
const hashPart2 = ethers.keccak256(ethers.toUtf8Bytes("second-32-bytes"));

// Register with specified owner
await revisionOwnership.register(hashPart1, hashPart2, ownerAddress);
```

### Ownership Transfer
```javascript
// Only current owner can transfer
await revisionOwnership.connect(currentOwner).transferOwnership(
  hashPart1, 
  hashPart2, 
  newOwnerAddress
);
```

### Ownership Renunciation
```javascript
// Only current owner can renounce
await revisionOwnership.connect(currentOwner).renounceOwnership(
  hashPart1, 
  hashPart2
);
```

### Query Owner
```javascript
const owner = await revisionOwnership.ownerOf(hashPart1, hashPart2);
// Returns address(0) if not registered or renounced
```

## Hash Format Support

### SHA3-512 (64 bytes)
```javascript
const fullHash = ethers.keccak256(ethers.toUtf8Bytes("content"));
const hashPart1 = fullHash.slice(0, 66); // First 32 bytes
const hashPart2 = fullHash.slice(66);    // Second 32 bytes
```

### SHA2-256 (32 bytes padded to 64)
```javascript
const sha256Hash = ethers.keccak256(ethers.toUtf8Bytes("content"));
const hashPart1 = ethers.ZeroHash; // 32 zero bytes
const hashPart2 = sha256Hash;      // 32 bytes of actual hash
```

## Security Considerations

1. **Permissionless Registration**: Anyone can register revisions, allowing flexible off-chain coordination
2. **Owner-Only Transfers**: Only current owners can transfer or renounce ownership
3. **Irreversible Renunciation**: Once ownership is renounced, it cannot be recovered
4. **Zero Address Protection**: Cannot register or transfer to zero address
5. **Unique Registration**: Each revision can only be registered once

## Events

- `RevisionRegistered(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address indexed owner)`
- `OwnershipTransferred(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address oldOwner, address newOwner)`
- `OwnershipRenounced(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address oldOwner)`

## Verification

After deployment, verify the contract works correctly:

```bash
npm run verify:deployment
```

This will test:
- Contract deployment
- Registration functionality
- Ownership transfer
- Owner queries

## Gas Costs (Estimated)

- Registration: ~50,000 gas
- Ownership Transfer: ~30,000 gas
- Ownership Renunciation: ~25,000 gas
- Owner Query: ~2,000 gas (view function)

## Troubleshooting

### Common Issues

1. **"Revision already registered"**: The revision hash combination already exists
2. **"Not authorized: only current owner"**: Trying to transfer/renounce without being the owner
3. **"Owner cannot be zero address"**: Attempting to register/transfer to zero address

### Debug Commands

```bash
# Check contract code at address
npx hardhat console
> await ethers.provider.getCode("CONTRACT_ADDRESS")

# Check owner of specific revision
> const contract = await ethers.getContractAt("RevisionOwnership", "CONTRACT_ADDRESS");
> await contract.ownerOf(hashPart1, hashPart2);
```
