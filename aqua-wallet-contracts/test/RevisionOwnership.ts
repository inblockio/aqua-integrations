const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RevisionOwnership", function () {
  let revisionOwnership;
  let owner, addr1, addr2, addr3;
  let hashPart1, hashPart2;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const RevisionOwnership = await ethers.getContractFactory("RevisionOwnership");
    revisionOwnership = await RevisionOwnership.deploy();
    await revisionOwnership.waitForDeployment();

    // Create sample hash parts for testing
    hashPart1 = ethers.keccak256(ethers.toUtf8Bytes("test-hash-part-1"));
    hashPart2 = ethers.keccak256(ethers.toUtf8Bytes("test-hash-part-2"));
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await revisionOwnership.getAddress()).to.be.properAddress;
    });
  });

  describe("Registration", function () {
    it("Should allow anyone to register a revision with a specified owner", async function () {
      await expect(revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address))
        .to.emit(revisionOwnership, "RevisionRegistered")
        .withArgs(hashPart1, hashPart2, addr2.address);

      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(addr2.address);
    });

    it("Should not allow registering with zero address", async function () {
      await expect(
        revisionOwnership.connect(addr1).register(hashPart1, hashPart2, ethers.ZeroAddress)
      ).to.be.revertedWith("Owner cannot be zero address");
    });

    it("Should not allow registering the same revision twice", async function () {
      await revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address);
      
      await expect(
        revisionOwnership.connect(addr3).register(hashPart1, hashPart2, addr3.address)
      ).to.be.revertedWith("Revision already registered");
    });

    it("Should allow different revisions to be registered", async function () {
      const hashPart1_2 = ethers.keccak256(ethers.toUtf8Bytes("different-hash-1"));
      const hashPart2_2 = ethers.keccak256(ethers.toUtf8Bytes("different-hash-2"));

      await revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address);
      await revisionOwnership.connect(addr1).register(hashPart1_2, hashPart2_2, addr3.address);

      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(addr2.address);
      expect(await revisionOwnership.ownerOf(hashPart1_2, hashPart2_2)).to.equal(addr3.address);
    });
  });

  describe("Ownership Transfer", function () {
    beforeEach(async function () {
      // Register a revision with addr2 as owner
      await revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address);
    });

    it("Should allow current owner to transfer ownership", async function () {
      await expect(revisionOwnership.connect(addr2).transferOwnership(hashPart1, hashPart2, addr3.address))
        .to.emit(revisionOwnership, "OwnershipTransferred")
        .withArgs(hashPart1, hashPart2, addr2.address, addr3.address);

      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(addr3.address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      await expect(
        revisionOwnership.connect(addr1).transferOwnership(hashPart1, hashPart2, addr3.address)
      ).to.be.revertedWith("Not authorized: only current owner");
    });

    it("Should not allow transferring to zero address", async function () {
      await expect(
        revisionOwnership.connect(addr2).transferOwnership(hashPart1, hashPart2, ethers.ZeroAddress)
      ).to.be.revertedWith("New owner cannot be zero address");
    });

    it("Should not allow transferring unregistered revision", async function () {
      const unregisteredHash1 = ethers.keccak256(ethers.toUtf8Bytes("unregistered-1"));
      const unregisteredHash2 = ethers.keccak256(ethers.toUtf8Bytes("unregistered-2"));

      await expect(
        revisionOwnership.connect(addr2).transferOwnership(unregisteredHash1, unregisteredHash2, addr3.address)
      ).to.be.revertedWith("Not authorized: only current owner");
    });
  });

  describe("Ownership Renunciation", function () {
    beforeEach(async function () {
      // Register a revision with addr2 as owner
      await revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address);
    });

    it("Should allow current owner to renounce ownership", async function () {
      await expect(revisionOwnership.connect(addr2).renounceOwnership(hashPart1, hashPart2))
        .to.emit(revisionOwnership, "OwnershipRenounced")
        .withArgs(hashPart1, hashPart2, addr2.address);

      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(ethers.ZeroAddress);
    });

    it("Should not allow non-owner to renounce ownership", async function () {
      await expect(
        revisionOwnership.connect(addr1).renounceOwnership(hashPart1, hashPart2)
      ).to.be.revertedWith("Not authorized: only current owner");
    });

    it("Should not allow renouncing unregistered revision", async function () {
      const unregisteredHash1 = ethers.keccak256(ethers.toUtf8Bytes("unregistered-1"));
      const unregisteredHash2 = ethers.keccak256(ethers.toUtf8Bytes("unregistered-2"));

      await expect(
        revisionOwnership.connect(addr2).renounceOwnership(unregisteredHash1, unregisteredHash2)
      ).to.be.revertedWith("Not authorized: only current owner");
    });
  });

  describe("Owner Query", function () {
    it("Should return zero address for unregistered revision", async function () {
      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(ethers.ZeroAddress);
    });

    it("Should return correct owner for registered revision", async function () {
      await revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address);
      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(addr2.address);
    });

    it("Should return zero address for renounced revision", async function () {
      await revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address);
      await revisionOwnership.connect(addr2).renounceOwnership(hashPart1, hashPart2);
      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle SHA2-256 hash padding correctly", async function () {
      // Simulate SHA2-256 hash padded with 32 zero bytes
      const sha256Hash = ethers.keccak256(ethers.toUtf8Bytes("sha256-content"));
      const paddedHashPart1 = ethers.ZeroHash; // 32 zero bytes
      const paddedHashPart2 = sha256Hash;

      await revisionOwnership.connect(addr1).register(paddedHashPart1, paddedHashPart2, addr2.address);
      expect(await revisionOwnership.ownerOf(paddedHashPart1, paddedHashPart2)).to.equal(addr2.address);
    });

    it("Should handle multiple ownership transfers", async function () {
      await revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address);
      
      // Transfer from addr2 to addr3
      await revisionOwnership.connect(addr2).transferOwnership(hashPart1, hashPart2, addr3.address);
      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(addr3.address);

      // Transfer from addr3 to owner
      await revisionOwnership.connect(addr3).transferOwnership(hashPart1, hashPart2, owner.address);
      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(owner.address);
    });

    it("Should allow re-registration after renunciation", async function () {
      await revisionOwnership.connect(addr1).register(hashPart1, hashPart2, addr2.address);
      await revisionOwnership.connect(addr2).renounceOwnership(hashPart1, hashPart2);
      
      // Should be able to register again
      await revisionOwnership.connect(addr3).register(hashPart1, hashPart2, addr3.address);
      expect(await revisionOwnership.ownerOf(hashPart1, hashPart2)).to.equal(addr3.address);
    });
  });
});
