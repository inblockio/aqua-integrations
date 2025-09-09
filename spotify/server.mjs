/* ------------------------------------------------------------------
   Updated server.mjs with upload functionality
------------------------------------------------------------------ */

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
import uploadRoutes from './routes/upload.mjs'; // New upload routes

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

/* ───────────────────────  middleware  ─────────────────────── */
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Increase payload limits for file uploads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(
  session({
    name: 'siwe',
    secret: process.env.SESSION_SECRET || '🔒 change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost'
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
app.use('/', uploadRoutes); // Mount upload routes

// Error handling middleware for multer errors
app.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 50MB.'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field.'
    });
  }
  
  if (error.message === 'Only MP3 files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only MP3 files are allowed.'
    });
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error.'
  });
});

app.listen(3000, async () => {
  // Run initial cleanup of expired sessions
  const cleanedCount = await db.cleanupExpiredSessions();
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired sessions on startup`);
  }

  // Create uploads directory if it doesn't exist
  const uploadsDir = join(__dirname, 'uploads');
  try {
    await import('fs/promises').then(fs => fs.mkdir(uploadsDir, { recursive: true }));
    console.log(`📁 Uploads directory ready at ${uploadsDir}`);
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }

  console.log('🪄  SIWE + File Upload server → http://localhost:3000');
  console.log(`SQLite database initialized at ${join(__dirname, 'sessions.db')}`);
});