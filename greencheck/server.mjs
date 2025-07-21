
/* ------------------------------------------------------------------
   Minimal SIWE + SMS‑OTP stack (Twilio Verify edition)
   ─────────────────────────────────────────────────────────────────
   server.mjs  – Express server: SIWE auth + Twilio Verify SMS OTP
   login.mjs   – Headless client that signs‑in, triggers Verify OTP
   db.mjs      - SQLite database for session management

   .env example (only two Twilio creds needed plus Verify Service):
     TWILIO_ACCOUNT_SID=ACxxx...
     TWILIO_AUTH_TOKEN=xxx...
     TWILIO_VERIFY_SERVICE_SID=VAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
------------------------------------------------------------------ */

/* =======================  server.mjs  ======================= */
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import cors from 'cors';
import twilio from 'twilio';
import { SiweMessage, generateNonce } from 'siwe';
import Aquafier from 'aqua-js-sdk';
import * as fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.mjs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

/* ───────────────  Twilio Verify config  ─────────────── */
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
  NODE_ENV = 'development',
  MNEMONIC
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  console.warn('⚠️  Twilio Verify env vars missing – SMS verification will fail');
}

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function startSmsVerification(to) {
  return twilioClient.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to, channel: 'sms' });
}

async function checkSmsVerification(to, code) {
  return twilioClient.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to, code });
}

async function startEmailVerification(to) {
  return twilioClient.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to, channel: 'email' });
}

async function checkEmailVerification(to, code) {
  return twilioClient.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to, code });
}

// async function fetchVerificationLogs(sid) {
//   // Using the Twilio API client to fetch logs for a specific verification SID
//   try {
//     // You'll need to replace ENVIRONMENT_SID with your actual environment SID
//     // This is typically 'development', 'production', etc.
//     const ENVIRONMENT_SID = 'VA7968c724b09573b9aeea5eae641d0ac5';

//     const response = await twilioClient.request({
//       method: 'GET',
//       uri: `https://serverless.twilio.com/v1/Services/${TWILIO_VERIFY_SERVICE_SID}/Environments/${ENVIRONMENT_SID}/Logs/${sid}`
//     });
//     twilioClient._serverless.v1.fetch({
//       data
//     })
//     return response;
//   } catch (error) {
//     console.error('Error fetching verification logs:', error);
//     throw error;
//   }
// }

async function getVerificationDetails(verificationSid) {
  const serviceID = "VA7968c724b09573b9aeea5eae641d0ac5" // TWILIO_VERIFY_SERVICE_SID
  try {
    // Use the existing twilioClient instead of creating a new one
    console.log("Using service SID:", serviceID);
    console.log("Fetching verification with SID:", verificationSid);

    // List all verifications to check if the one we're looking for exists
    const verifications = await twilioClient.verify.v2
      .services(serviceID)
      .fetch();
    // .list({limit: 20});

    console.log(`Found ${verifications.length} recent verifications`, verifications);

    // Check if our verification exists in the list
    const targetVerification = verifications.find(v => v.sid === verificationSid);

    if (targetVerification) {
      console.log("Found verification in list:", targetVerification.sid);
      // Now fetch the specific verification
      const verification = await twilioClient.verify.v2
        .services(serviceID)
        .verifications(verificationSid)
        .fetch();

      console.log("Verification Status:", verification.status);
      console.log("Verification Channel:", verification.channel);
      console.log("Verification Date Created:", verification.dateCreated);
      return verification;
    } else {
      console.log("Verification not found in recent verifications list");
      return null;
    }
  } catch (error) {
    console.error("Error fetching verification details:", error);
    return null;
  }
}

/* ───────────────────────  middleware  ─────────────────────── */
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(
  session({
    name: 'siwe',
    secret: process.env.SESSION_SECRET || '🔒 change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Serve static files from the 'public' directory
app.use(express.static('public'));

/* ─────────────────────────  helpers  ───────────────────────── */
async function requireAuth(req, res, next) {
  // Get session ID from cookie
  const sessionId = req.session.sessionId;
  if (!sessionId) return res.status(401).send('⛔  Not authenticated');

  // Check if session exists in database
  const sessionData = await db.getSession(sessionId);
  if (!sessionData) return res.status(401).send('⛔  Session expired or invalid');

  // Add session data to request for use in route handlers
  req.siwe = {
    address: sessionData.address,
    chainId: sessionData.chain_id
  };

  next();
}

/* ─────────────────────────  routes  ───────────────────────── */
// Serve index.html at the root URL
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// Session status endpoint
app.get('/session-status', async (req, res) => {
  const sessionId = req.session.sessionId;
  if (!sessionId) {
    return res.json({ authenticated: false });
  }

  const sessionData = await db.getSession(sessionId);
  if (!sessionData) {
    return res.json({ authenticated: false });
  }

  const phoneData = await db.getPhoneVerification(sessionId);
  const emailData = await db.getEmailVerification(sessionId);

  return res.json({
    authenticated: true,
    address: sessionData.address,
    chainId: sessionData.chain_id,
    phone: phoneData?.phone || null,
    phoneVerified: phoneData?.verified || false,
    email: emailData?.email || null,
    emailVerified: emailData?.verified || false,
    expiresAt: new Date(sessionData.expires_at * 1000).toISOString()
  });
});

// Logout endpoint
app.post('/logout', async (req, res) => {
  const sessionId = req.session.sessionId;
  if (sessionId) {
    await db.deleteSession(sessionId);
    req.session.destroy();
  }
  res.json({ ok: true, message: 'Logged out successfully' });
});

// 1️⃣  Nonce for SIWE
app.get('/nonce', (req, res) => {
  const nonce = generateNonce();
  req.session.nonce = nonce;
  res.type('text/plain').send(nonce);
});

// 2️⃣  Verify SIWE
app.post('/verify', async (req, res) => {
  try {
    const { message, signature } = req.body;
    const siwe = new SiweMessage(message);
    const { data: fields, success } = await siwe.verify({
      signature,
      nonce: req.session.nonce,
      domain: 'localhost'
    });
    if (!success) throw new Error('SIWE verification failed');

    // Generate a unique session ID
    const sessionId = uuidv4();

    // Store session in database
    const created = await db.createSession(
      sessionId,
      fields.address,
      req.session.nonce,
      fields.chainId,
      24 * 60 * 60 // 24 hours expiry
    );

    if (!created) throw new Error('Failed to create session');

    // Store session ID in cookie
    req.session.sessionId = sessionId;

    res.json({ ok: true, address: fields.address });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 3️⃣  Initiate SMS Verify challenge
app.post('/sms-request', requireAuth, async (req, res) => {
  const { phone } = req.body; // E.164
  if (!phone) return res.status(400).json({ ok: false, error: 'Phone number required' });

  try {
    await startSmsVerification(phone);
  } catch (err) {
    console.error('🛑  Twilio Verify initiation failed', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to start verification' });
  }

  // Store pending phone in database
  await db.setPendingPhone(req.session.sessionId, phone);

  res.json({ ok: true, message: 'Code sent via SMS' });
});

// 4️⃣  Check OTP
app.post('/sms-verify', requireAuth, async (req, res) => {
  const { code } = req.body; // code = OTP digits

  // Get phone from database
  const phoneData = await db.getPhoneVerification(req.session.sessionId);
  if (!phoneData || !phoneData.pending_phone) {
    return res.status(400).json({ ok: false, error: 'No verification in progress' });
  }

  const phone = phoneData.pending_phone;
  if (!code) return res.status(400).json({ ok: false, error: 'Code required' });

  try {
    const result = await checkSmsVerification(phone, code);
    if (result.status !== 'approved') throw new Error('Incorrect code');
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }

  // Update phone verification in database
  await db.verifyPhone(req.session.sessionId);

  // Refresh session expiry
  await db.updateSessionExpiry(req.session.sessionId, 24 * 60 * 60);

  res.json({ ok: true, phone });
});

// 5️⃣  Initiate Email Verify challenge
app.post('/email-request', requireAuth, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ ok: false, error: 'Email address required' });

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email format' });
  }

  try {
    await startEmailVerification(email);
  } catch (err) {
    console.error('🛑  Twilio Email Verify initiation failed', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to start email verification' });
  }

  // Store pending email in database
  await db.setPendingEmail(req.session.sessionId, email);

  res.json({ ok: true, message: 'Verification code sent to email' });
});

// 6️⃣  Check Email OTP
app.post('/email-verify', requireAuth, async (req, res) => {
  const { code } = req.body;

  // Get email from database
  const emailData = await db.getEmailVerification(req.session.sessionId);
  if (!emailData || !emailData.pending_email) {
    return res.status(400).json({ ok: false, error: 'No email verification in progress' });
  }

  const email = emailData.pending_email;
  if (!code) return res.status(400).json({ ok: false, error: 'Code required' });

  try {
    const result = await checkEmailVerification(email, code);
    if (result.status !== 'approved') throw new Error('Incorrect code');
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }

  // Update email verification in database
  await db.verifyEmail(req.session.sessionId);

  // Refresh session expiry
  await db.updateSessionExpiry(req.session.sessionId, 24 * 60 * 60);

  res.json({ ok: true, email });
});

// 7️⃣  Example protected endpoint
app.get('/me', requireAuth, async (req, res) => {
  // Get verification data from database
  const phoneData = await db.getPhoneVerification(req.session.sessionId);
  const emailData = await db.getEmailVerification(req.session.sessionId);

  const nouwUnix = Math.floor(Date.now() / 1000)
  const exp = nouwUnix + 12 * 30 * 24 * 60 * 60 // 12 months from now
  const formObject = {
    address: req.siwe.address,
    // chainId: req.siwe.chainId,
    phone: phoneData?.phone || null,
    email: emailData?.email || null,
    verifier: "Twilio",
    issuing_date: nouwUnix,
    expiration_date: exp
    // phoneVerified: phoneData?.verified || false
    // emailVerified: emailData?.verified || false
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


app.post('/server-sign', async (req, res) => {


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

// Database maintenance endpoint (for admin use)
app.get('/admin/db-status', async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    // Get all sessions
    const sessions = await db.database.all('SELECT * FROM sessions', []);
    const phoneVerifications = await db.database.all('SELECT * FROM phone_verifications', []);

    res.json({
      sessions: sessions.map(s => ({
        ...s,
        created_at_date: new Date(s.created_at * 1000).toISOString(),
        expires_at_date: new Date(s.expires_at * 1000).toISOString()
      })),
      phoneVerifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, async () => {
  // Run initial cleanup of expired sessions
  const cleanedCount = await db.cleanupExpiredSessions();
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired sessions on startup`);
  }

  console.log('🪄  SIWE + Twilio Verify server with SQLite session storage → http://localhost:3000');
  console.log(`SQLite database initialized at ${join(__dirname, 'sessions.db')}`);
});
