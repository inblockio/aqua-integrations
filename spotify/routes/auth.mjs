/* ======================== routes/auth.mjs ======================== */
import { Router } from 'express';
import { SiweMessage, generateNonce } from 'siwe';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db.mjs';
import { requireAuth } from '../middleware/auth.mjs';

const router = Router();

// Session status endpoint
router.get('/session-status', async (req, res) => {
  const sessionId = req.session.sessionId;
  if (!sessionId) {
    return res.json({ authenticated: false });
  }

  const sessionData = await db.getSession(sessionId);
  if (!sessionData) {
    return res.json({ authenticated: false });
  }

  // const phoneData = await db.getPhoneVerification(sessionId);
  // const emailData = await db.getEmailVerification(sessionId);

  return res.json({
    authenticated: true,
    address: sessionData.address,
    chainId: sessionData.chain_id,
    // phone: phoneData?.phone || null,
    // phoneVerified: phoneData?.verified || false,
    // email: emailData?.email || null,
    // emailVerified: emailData?.verified || false,
    expiresAt: new Date(sessionData.expires_at * 1000).toISOString()
  });
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  const sessionId = req.session.sessionId;
  if (sessionId) {
    await db.deleteSession(sessionId);
    req.session.destroy();
  }
  res.json({ ok: true, message: 'Logged out successfully' });
});

// 1️⃣  Nonce for SIWE
router.get('/nonce', (req, res) => {
  const nonce = generateNonce();
  req.session.nonce = nonce;
  res.type('text/plain').send(nonce);
});

// 2️⃣  Verify SIWE
router.post('/verify', async (req, res) => {
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


export default router;