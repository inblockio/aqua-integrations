/* ======================== middleware/auth.mjs ======================== */
import * as db from '../db.mjs';


export async function requireAuth(req, res, next) {
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