/* ======================== routes/protected.mjs ======================== */
import { Router } from 'express';
import Aquafier from 'aqua-js-sdk';
import * as fs from "fs";
import * as db from '../db.mjs';
import { requireAuth } from '../middleware/auth.mjs';

const { MNEMONIC } = process.env;

const router = Router();

// 7️⃣  Example protected endpoint - Generate AquaTree credentials
router.get('/me', requireAuth, async (req, res) => {
  // Get verification data from database
  const phoneData = await db.getPhoneVerification(req.session.sessionId);
  const emailData = await db.getEmailVerification(req.session.sessionId);

  const nouwUnix = Math.floor(Date.now() / 1000)
  const exp = nouwUnix + 12 * 30 * 24 * 60 * 60 // 12 months from now
  const formObject = {
    address: req.siwe.address,
    phone: phoneData?.phone || null,
    email: emailData?.email || null,
    verifier: "Twilio",
    issuing_date: nouwUnix,
    expiration_date: exp
  }

  const aquafier = new Aquafier();

  const fileObject = {
    fileName: "info.json",
    fileContent: JSON.stringify(formObject, null, 2), // this can cause file hash mismatch because of formatting
    path: "./info.json"
  };

  // Get platform from query parameter (default to 'web')
  const platform = req.query.platform || 'web';
  console.log(`Using platform: ${platform}`);

  // Create genesis revision
  const result = await aquafier.createGenesisRevision(fileObject, true, true, false);

  let aquaTree = null;
  if (result.isOk()) {
    aquaTree = result.data.aquaTree;
    console.log("Genesis AquaTree created");

    // Only sign if platform is 'cli'
    if (platform === 'cli') {
      const credentials = {
        "mnemonic": MNEMONIC,
        "nostr_sk": process.env.NOSTR_SK,
        "did_key": process.env.DID_KEY,
        "alchemy_key": process.env.ALCHEMY_KEY,
        "witness_eth_network": "sepolia",
        "witness_eth_platform": "metamask",
        "witness_method": "cli",
        "p12_password": "123456"
      };

      const aquaTreeWrapper = {
        aquaTree: aquaTree,
        revision: "",
        fileObject: fileObject
      }

      console.log("Signing AquaTree with CLI credentials");
      const signingResult = await aquafier.signAquaTree(aquaTreeWrapper, "cli", credentials, true);
      if (signingResult.isOk()) {
        aquaTree = signingResult.data.aquaTree;
        console.log("Signed AquaTree successfully");
      } else {
        console.error("Failed to sign AquaTree:", signingResult.error);
      }
    } else if (platform === 'web') {
      // For web, we don't sign automatically - the client will need to handle signing
      console.log("Web platform detected - returning unsigned AquaTree for client-side signing");
    }
  } else {
    console.error("Failed to create genesis revision:", result.error);
    return res.status(500).json({ error: "Failed to create genesis revision" });
  }

  // Write to files
  const timestamp = Date.now();
  const filePath = `./info_${timestamp}.json`;
  const aquaFilePath = `./info_${timestamp}.aqua.json`;

  // Write the form to a file 
  fs.writeFileSync(filePath, JSON.stringify(formObject));
  // Write the aquaTree to a file
  fs.writeFileSync(aquaFilePath, JSON.stringify(aquaTree));

  console.log(`Files written to ${filePath} and ${aquaFilePath}`);

  // Return appropriate response based on platform
  if (platform === 'cli') {
    res.json({
      formObject,
      aquaTree,
      signed: true,
      platform: 'cli'
    });
  } else {
    let fileObjectResponse = {
      fileName: fileObject.fileName,
      fileContent: formObject,
      path: fileObject.path
    }
    res.json({
      formObject,
      fileObject: fileObjectResponse,
      aquaTree,
      signed: false,
      platform: 'web',
      message: "AquaTree needs to be signed on the client side using MetaMask"
    });
  }
});

// Server-side AquaTree signing endpoint
router.post('/server-sign', async (req, res) => {
  if (!MNEMONIC) {
    console.error("MNEMONIC is not set in environment variables");
    return res.status(500).json({ error: "MNEMONIC is required for server-side signing" });
  }

  let aquafier = new Aquafier();
  let aquaTree = null;
  const credentials = {
    "mnemonic": MNEMONIC,
    "nostr_sk": process.env.NOSTR_SK,
    "did_key": process.env.DID_KEY,
    "alchemy_key": process.env.ALCHEMY_KEY,
    "witness_eth_network": "sepolia",
    "witness_eth_platform": "metamask",
    "witness_method": "cli",
    "p12_password": "123456"
  };

  const { data, fileObject } = req.body
  console.log("-- Received data for AquaTree signing:", JSON.stringify(data, null, 2));
  console.log("-- Received fileObject for signing:", JSON.stringify(fileObject, null, 2));
  const aquaTreeWrapper = {
    aquaTree: data,
    revision: "",
    fileObject: fileObject
  }

  console.log("Signing AquaTree with CLI credentials");
  const signingResult = await aquafier.signAquaTree(aquaTreeWrapper, "cli", credentials, true);
  if (signingResult.isOk()) {
    aquaTree = signingResult.data.aquaTree;
    console.log("Signed AquaTree successfully");

    res.json({
      ok: true,
      fileObject,
      aquaTree,
      signed: true,
      platform: 'web',
      message: "completed server-side signing",
    });
  } else {
    console.error("Failed to sign AquaTree:", signingResult.error);
    res.json({
      ok: false,
      fileObject,
      aquaTree,
      signed: false,
      platform: 'web',
      message: "error signing AquaTree: " + signingResult.error,
    });
  }
});

export default router;