
// server.js  —  Node 18+  (ES‑modules syntax)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

/* -------------------------------------------------- */
/* basic Express + static file serving                */
/* -------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

/* ① serve index.html + any JS/CSS in this directory */
app.use(express.static(__dirname));

/* ② JSON body parser for our API endpoints */
app.use(express.json({ limit: '2mb' }));

/* -------------------------------------------------- */
/* in‑memory session store (demo only)                */
/* -------------------------------------------------- */
const sessions = new Map();

/* -------------------------------------------------- */
/*  /prepare  — step 1 (send pubKeyCred options)      */
/* -------------------------------------------------- */
app.post('/prepare', async (req, res) => {
  const { payloadB64 } = req.body;                    // base64 file
  const payload       = Buffer.from(payloadB64, 'base64');
  const challengeBuf  = crypto.createHash('sha256').update(payload).digest();

  const options = await generateRegistrationOptions({
    rpName: 'Android Blob Signer',
    rpID  : req.hostname,             // e.g. 127.0.0.1
    userID: crypto.randomBytes(16),
    userName: 'blob',
    userDisplayName: 'blob',
    challenge: isoBase64URL.fromBuffer(challengeBuf), // <- SHA‑256(blob)
    attestationType: 'direct',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
  });

  sessions.set(options.challenge, payloadB64);        // stash for /complete
  res.json(options);
});

/* -------------------------------------------------- */
/*  /complete — step 2 (verify and return result)     */
/* -------------------------------------------------- */
app.post('/complete', async (req, res) => {
  const { credential } = req.body;
  const clientData = JSON.parse(Buffer
                     .from(credential.response.clientDataJSON, 'base64')
                     .toString('utf8'));
  const expectedChallenge = clientData.challenge;
  const payloadB64 = sessions.get(expectedChallenge);
  if (!payloadB64)
    return res.status(400).json({ error: 'unknown challenge' });

  const verification = await verifyRegistrationResponse({
    credential,
    expectedChallenge,
    expectedOrigin: `https://${req.hostname}`,
    expectedRPID  : req.hostname,
    requireUserVerification: true,
  });

  console.log(verification)
  if (!verification.verified)
    return res.status(400).json({ error: 'attestation failed' });

  res.json({
    blobBase64        : payloadB64,
    clientDataJSON    : credential.response.clientDataJSON,
    attestationObject : credential.response.attestationObject,
  });
});

/* -------------------------------------------------- */
app.listen(3000, () =>
  console.log('▶  Open https://localhost:3000 (or http://127.0.0.1:3000)'));

