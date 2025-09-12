// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RevisionOwnership
 * @dev A secure contract to manage ownership of genesis revisions (identified by their full SHA3-512 hash)
 * in the context of Aqua Protocol schema v3. It allows registering a genesis revision with an explicitly specified owner
 * and transferring ownership to a new address. Ownership is enforced on-chain for off-chain data management.
 * 
 * Note: The full 64-byte SHA3-512 hash is used for uniqueness. For SHA2-256 hashes (32 bytes), 
 * the input is padded with 32 leading zero bytes to match the 64-byte key format (i.e., hashPart1 = 0x00...00, hashPart2 = sha256_hash).
 * 
 * Security Considerations: 
 * - Registration is permissionless to allow flexible off-chain coordination, but includes anti-front-running checks via block.timestamp if needed (not implemented here as it's optional).
 * - Only current owners can transfer; no multi-sig or timelocks for simplicity.
 * - Uses OpenZeppelin-inspired patterns for ownership without inheritance to keep it lightweight.
 */
contract RevisionOwnership {

    // Mapping from revision hash (64 bytes) to owner address
    mapping(bytes32 => mapping(bytes32 => address)) public owners;

    // Events for logging
    event RevisionRegistered(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address indexed owner);
    event OwnershipTransferred(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address oldOwner, address newOwner);
    event OwnershipRenounced(bytes32 indexed hashPart1, bytes32 indexed hashPart2, address oldOwner);

    /**
     * @dev Modifier to check if msg.sender is the current owner of the specified revision.
     */
    modifier onlyOwner(bytes32 hashPart1, bytes32 hashPart2) {
        require(msg.sender == owners[hashPart1][hashPart2], "Not authorized: only current owner");
        _;
    }

    /**
     * @dev Register a new genesis revision with the specified owner address.
     * Can only be called if the revision is not already registered.
     * The caller (msg.sender) can be anyone, but the owner is explicitly provided.
     * @param hashPart1 The first 32 bytes of the full 64-byte hash (SHA3-512 or padded SHA2-256).
     * @param hashPart2 The second 32 bytes of the full 64-byte hash.
     * @param owner The address of the owner to register for this revision.
     */
    function register(bytes32 hashPart1, bytes32 hashPart2, address owner) external {
        require(owner != address(0), "Owner cannot be zero address");
        require(owners[hashPart1][hashPart2] == address(0), "Revision already registered");
        owners[hashPart1][hashPart2] = owner;
        emit RevisionRegistered(hashPart1, hashPart2, owner);
    }

    /**
     * @dev Transfer ownership of a registered revision to a new owner.
     * Only callable by the current owner.
     * @param hashPart1 The first 32 bytes of the full 64-byte hash.
     * @param hashPart2 The second 32 bytes of the full 64-byte hash.
     * @param newOwner The address of the new owner.
     */
    function transferOwnership(bytes32 hashPart1, bytes32 hashPart2, address newOwner) external onlyOwner(hashPart1, hashPart2) {
        require(newOwner != address(0), "New owner cannot be zero address");
        
        address oldOwner = owners[hashPart1][hashPart2];
        owners[hashPart1][hashPart2] = newOwner;
        emit OwnershipTransferred(hashPart1, hashPart2, oldOwner, newOwner);
    }

    /**
     * @dev Renounce ownership of a registered revision (sets owner to zero address).
     * Only callable by the current owner. Use with caution, as it is irreversible.
     * @param hashPart1 The first 32 bytes of the full 64-byte hash.
     * @param hashPart2 The second 32 bytes of the full 64-byte hash.
     */
    function renounceOwnership(bytes32 hashPart1, bytes32 hashPart2) external onlyOwner(hashPart1, hashPart2) {
        address oldOwner = owners[hashPart1][hashPart2];
        delete owners[hashPart1][hashPart2];
        emit OwnershipRenounced(hashPart1, hashPart2, oldOwner);
    }

    /**
     * @dev Retrieve the current owner of a revision (alias for clarity).
     * @param hashPart1 The first 32 bytes of the full 64-byte hash.
     * @param hashPart2 The second 32 bytes of the full 64-byte hash.
     * @return owner The address of the current owner, or address(0) if not registered/renounced.
     */
    function ownerOf(bytes32 hashPart1, bytes32 hashPart2) external view returns (address owner) {
        owner = owners[hashPart1][hashPart2];
    }
}
