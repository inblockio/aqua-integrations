
/* ------------------------------------------------------------------
   SIWE + SMS/Email OTP Authentication Server (Modular Edition)
   ─────────────────────────────────────────────────────────────────
   server.mjs       – Main Express server setup and configuration
   services/        – External service integrations (Twilio)
   middleware/      – Authentication middleware
   routes/          – Route handlers organized by functionality
   db.mjs           – SQLite database for session management

   .env example:
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
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.mjs';

// Import route modules
import authRoutes from './routes/auth.mjs';
import protectedRoutes from './routes/protected.mjs';
import adminRoutes from './routes/admin.mjs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

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

/* ─────────────────────────  routes  ───────────────────────── */
// Serve index.html at the root URL
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// Mount route modules
app.use('/', authRoutes);
app.use('/', protectedRoutes);
app.use('/admin', adminRoutes);

app.listen(3000, async () => {
  // Run initial cleanup of expired sessions
  const cleanedCount = await db.cleanupExpiredSessions();
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired sessions on startup`);
  }

  console.log('🪄  SIWE + Twilio Verify server with SQLite session storage → http://localhost:3000');
  console.log(`SQLite database initialized at ${join(__dirname, 'sessions.db')}`);
});
