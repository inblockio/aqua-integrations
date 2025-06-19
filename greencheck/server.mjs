
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
import crypto from 'crypto';
import session from 'express-session';
import bodyParser from 'body-parser';
import cors from 'cors';
import twilio from 'twilio';
import { SiweMessage, generateNonce } from 'siwe';

const app = express();

/* ───────────────  Twilio Verify config  ─────────────── */
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
  NODE_ENV = 'development'
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

/* ─────────────────────────  helpers  ───────────────────────── */
function requireAuth(req, res, next) {
  if (!req.session.siwe) return res.status(401).send('⛔  Not authenticated');
  next();
}

/* ─────────────────────────  routes  ───────────────────────── */
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
app.get('/me', requireAuth, (req, res) => {
  res.json({
    address: req.session.siwe.address,
    chainId: req.session.siwe.chainId,
    phone: req.session.phone,
    phoneVerified: !!req.session.phoneVerified
  });
});

app.listen(3000, () => console.log('🪄  SIWE + Twilio Verify server → http://localhost:3000'));
