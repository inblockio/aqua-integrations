/* ======================== routes/admin.mjs ======================== */
import { Router } from 'express';
import * as db from '../db.mjs';

const router = Router();

// Database maintenance endpoint (for admin use)
router.get('/db-status', async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    // Get all sessions
    const sessions = await db.database.all('SELECT * FROM sessions', []);
    const phoneVerifications = await db.database.all('SELECT * FROM phone_verifications', []);
    const emailVerifications = await db.database.all('SELECT * FROM email_verifications', []);

    res.json({
      sessions: sessions.map(s => ({
        ...s,
        created_at_date: new Date(s.created_at * 1000).toISOString(),
        expires_at_date: new Date(s.expires_at * 1000).toISOString()
      })),
      phoneVerifications,
      emailVerifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;