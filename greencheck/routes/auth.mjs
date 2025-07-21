/* ======================== routes/auth.mjs ======================== */
import { Router } from 'express';
import { SiweMessage, generateNonce } from 'siwe';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { 
  startSmsVerification, 
  checkSmsVerification,
  startEmailVerification,
  checkEmailVerification 
} from '../services/twilio.mjs';

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

// 3️⃣  Initiate SMS Verify challenge
router.post('/sms-request', requireAuth, async (req, res) => {
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

// 4️⃣  Check SMS OTP
router.post('/sms-verify', requireAuth, async (req, res) => {
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
router.post('/email-request', requireAuth, async (req, res) => {
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
router.post('/email-verify', requireAuth, async (req, res) => {
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

export default router;