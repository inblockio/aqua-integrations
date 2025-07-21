/* ========================  db.mjs  ======================== */
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const DB_PATH = join(__dirname, 'sessions.db');

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log(`Connected to SQLite database at ${DB_PATH}`);
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      nonce TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      chain_id INTEGER NOT NULL
    )
  `);

  // Create phone_verifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS phone_verifications (
      session_id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      verified BOOLEAN DEFAULT 0,
      pending_phone TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  // Create email_verifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      session_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      verified BOOLEAN DEFAULT 0,
      pending_email TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  console.log('Database tables initialized');
}

// Promise wrapper for database operations
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Session management functions
export async function createSession(sessionId, address, nonce, chainId, expiresInSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + expiresInSeconds;
  
  try {
    await runAsync(
      'INSERT INTO sessions (id, address, nonce, created_at, expires_at, chain_id) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, address, nonce, now, expiresAt, chainId]
    );
    return true;
  } catch (err) {
    console.error('Error creating session:', err.message);
    return false;
  }
}

export async function getSession(sessionId) {
  try {
    const session = await getAsync('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return null;
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at < now) {
      // Session expired, delete it
      await deleteSession(sessionId);
      return null;
    }
    
    return session;
  } catch (err) {
    console.error('Error getting session:', err.message);
    return null;
  }
}

export async function updateSessionExpiry(sessionId, expiresInSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + expiresInSeconds;
  
  try {
    await runAsync(
      'UPDATE sessions SET expires_at = ? WHERE id = ?',
      [expiresAt, sessionId]
    );
    return true;
  } catch (err) {
    console.error('Error updating session expiry:', err.message);
    return false;
  }
}

export async function deleteSession(sessionId) {
  try {
    // Delete verifications first due to foreign key constraint
    await runAsync('DELETE FROM phone_verifications WHERE session_id = ?', [sessionId]);
    await runAsync('DELETE FROM email_verifications WHERE session_id = ?', [sessionId]);
    // Then delete the session
    await runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
    return true;
  } catch (err) {
    console.error('Error deleting session:', err.message);
    return false;
  }
}

// Phone verification functions
export async function setPendingPhone(sessionId, phone) {
  try {
    const exists = await getAsync('SELECT 1 FROM phone_verifications WHERE session_id = ?', [sessionId]);
    
    if (exists) {
      await runAsync(
        'UPDATE phone_verifications SET pending_phone = ? WHERE session_id = ?',
        [phone, sessionId]
      );
    } else {
      await runAsync(
        'INSERT INTO phone_verifications (session_id, phone, pending_phone) VALUES (?, ?, ?)',
        [sessionId, phone, phone]
      );
    }
    return true;
  } catch (err) {
    console.error('Error setting pending phone:', err.message);
    return false;
  }
}

export async function verifyPhone(sessionId) {
  try {
    const verification = await getAsync(
      'SELECT pending_phone FROM phone_verifications WHERE session_id = ?',
      [sessionId]
    );
    
    if (!verification) return false;
    
    await runAsync(
      'UPDATE phone_verifications SET phone = pending_phone, verified = 1, pending_phone = NULL WHERE session_id = ?',
      [sessionId]
    );
    return true;
  } catch (err) {
    console.error('Error verifying phone:', err.message);
    return false;
  }
}

export async function getPhoneVerification(sessionId) {
  try {
    return await getAsync(
      'SELECT phone, verified, pending_phone FROM phone_verifications WHERE session_id = ?',
      [sessionId]
    );
  } catch (err) {
    console.error('Error getting phone verification:', err.message);
    return null;
  }
}

// Email verification functions
export async function setPendingEmail(sessionId, email) {
  try {
    const exists = await getAsync('SELECT 1 FROM email_verifications WHERE session_id = ?', [sessionId]);
    
    if (exists) {
      await runAsync(
        'UPDATE email_verifications SET pending_email = ? WHERE session_id = ?',
        [email, sessionId]
      );
    } else {
      await runAsync(
        'INSERT INTO email_verifications (session_id, email, pending_email) VALUES (?, ?, ?)',
        [sessionId, email, email]
      );
    }
    return true;
  } catch (err) {
    console.error('Error setting pending email:', err.message);
    return false;
  }
}

export async function verifyEmail(sessionId) {
  try {
    const verification = await getAsync(
      'SELECT pending_email FROM email_verifications WHERE session_id = ?',
      [sessionId]
    );
    
    if (!verification) return false;
    
    await runAsync(
      'UPDATE email_verifications SET email = pending_email, verified = 1, pending_email = NULL WHERE session_id = ?',
      [sessionId]
    );
    return true;
  } catch (err) {
    console.error('Error verifying email:', err.message);
    return false;
  }
}

export async function getEmailVerification(sessionId) {
  try {
    return await getAsync(
      'SELECT email, verified, pending_email FROM email_verifications WHERE session_id = ?',
      [sessionId]
    );
  } catch (err) {
    console.error('Error getting email verification:', err.message);
    return null;
  }
}

// Cleanup function to remove expired sessions
export async function cleanupExpiredSessions() {
  const now = Math.floor(Date.now() / 1000);
  try {
    // Get expired session IDs
    const expiredSessions = await allAsync(
      'SELECT id FROM sessions WHERE expires_at < ?',
      [now]
    );
    
    // Delete each expired session
    for (const session of expiredSessions) {
      await deleteSession(session.id);
    }
    
    console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    return expiredSessions.length;
  } catch (err) {
    console.error('Error cleaning up expired sessions:', err.message);
    return 0;
  }
}

// Schedule cleanup to run periodically (every hour)
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Export the database instance for direct access if needed
export const database = db;

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
