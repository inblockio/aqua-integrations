const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Test", function () {
  it("Should pass a basic test", async function () {
    expect(1 + 1).to.equal(2);
  });
});
