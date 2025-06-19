
import express from 'express';
import crypto from 'crypto';
import session from 'express-session';
import bodyParser from 'body-parser';
import cors from 'cors';
import { SiweMessage, generateNonce } from 'siwe';

const app = express();

/* ─────────────── middleware ─────────────── */
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(
  session({
    name: 'siwe',
    secret: process.env.SESSION_SECRET || '🔒 change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // set true behind TLS
  })
);

/* ─────────────── routes ─────────────── */
// 1️⃣  Provide a SIWE‑compliant nonce (alphanumeric, 8‑32 chars)
app.get('/nonce', (_req, res) => {
  const nonce = generateNonce(); // spec‑compliant helper from `siwe`
  _req.session.nonce = nonce;
  res.type('text/plain').send(nonce);
});

// 2️⃣  Verify the signed SIWE message
app.post('/verify', async (req, res) => {
  try {
    const { message, signature } = req.body;
    const siwe = new SiweMessage(message);
    // `siwe.validate` was removed in v3 → use `verify` instead
    const { data: fields, success } = await siwe.verify({
      signature,
      nonce: req.session.nonce,
      domain: 'localhost'
    });
    if (!success) throw new Error('SIWE verification failed');

    if (fields.nonce !== req.session.nonce) throw new Error('Bad nonce');

    req.session.siwe = fields; // 🎉 logged‑in
    res.json({ ok: true, address: fields.address });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 3️⃣  An authenticated example endpoint
app.get('/me', (req, res) => {
  if (!req.session.siwe)
    return res.status(401).send('⛔ Not authenticated');
  res.json({ address: req.session.siwe.address, chainId: req.session.siwe.chainId });
});

/* ─────────────── go ─────────────── */
app.listen(3000, () =>
  console.log('🪄  SIWE server running at http://localhost:3000')
);

