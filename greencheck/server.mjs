
/* ------------------------------------------------------------------
   Minimal SIWE + SMS‑OTP stack (Twilio Verify edition)
   ─────────────────────────────────────────────────────────────────
   server.mjs  – Express server: SIWE auth + Twilio Verify SMS OTP
   login.mjs   – Headless client that signs‑in, triggers Verify OTP

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
import * as fs from "fs"

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
    cookie: { secure: false }
  })
);

// Serve static files from the 'public' directory
app.use(express.static('public'));

/* ─────────────────────────  helpers  ───────────────────────── */
function requireAuth(req, res, next) {
  if (!req.session.siwe) return res.status(401).send('⛔  Not authenticated');
  next();
}

/* ─────────────────────────  routes  ───────────────────────── */
// Serve index.html at the root URL
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
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
    req.session.siwe = fields;
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

  // Stash phone in session so we know what to check later.
  req.session.pendingPhone = phone;
  res.json({ ok: true, message: 'Code sent via SMS' });
});

// 4️⃣  Check OTP
app.post('/sms-verify', requireAuth, async (req, res) => {
  const { code } = req.body; // code = OTP digits
  const phone = req.session.pendingPhone;
  if (!phone) return res.status(400).json({ ok: false, error: 'No verification in progress' });
  if (!code) return res.status(400).json({ ok: false, error: 'Code required' });

  try {
    const result = await checkSmsVerification(phone, code);
    if (result.status !== 'approved') throw new Error('Incorrect code');
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }

  req.session.phoneVerified = true;
  req.session.phone = phone;
  delete req.session.pendingPhone;
  res.json({ ok: true, phone });
});

// 5️⃣  Example protected endpoint
app.get('/me', requireAuth, async (req, res) => {
  const formObject = {
    address: req.session.siwe.address,
    chainId: req.session.siwe.chainId,
    phone: req.session.phone,
    phoneVerified: !!req.session.phoneVerified
  }

  const aquafier = new Aquafier();

  const fileObject = {
    fileName: "info.json",
    fileContent: JSON.stringify(formObject),
    path: "./info.json"
  };

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

  const result = await aquafier.createGenesisRevision(fileObject, true, true, false);

  let aquaTree = null;
  if (result.isOk()) {
    aquaTree = result.data.aquaTree;
    console.log("AquaTree: ", aquaTree)
    const aquaTreeWrapper = {
      aquaTree: aquaTree,
      revision: "",
      fileObject: fileObject
    }
    const signingResult = await aquafier.signAquaTree(aquaTreeWrapper, "cli", credentials, true);
    if (signingResult.isOk()) {
      aquaTree = signingResult.data.aquaTree;
      console.log("Signed AquaTree: ", aquaTree)
    }
  }

  // Write to a file
  // Write the form to a file 
  fs.writeFileSync("./info.json", JSON.stringify(formObject));
  // Write the aquaTree to a file
  fs.writeFileSync("./info.json.aqua.json", JSON.stringify(aquaTree));

  res.json({ formObject, aquaTree });
});

app.listen(3000, async () => {
  // TODO: Make sure fetching logs works
  // const verificationLogs = await getVerificationDetails("VE9ef6d135035084541f49c1938332f55a");
  // console.log("Verification logs: ", verificationLogs);
  console.log('🪄  SIWE + Twilio Verify server → http://localhost:3000');
});
