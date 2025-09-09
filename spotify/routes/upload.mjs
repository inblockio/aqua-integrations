// routes/upload.mjs
import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.mjs';
import fs from 'fs/promises';
import crypto from 'crypto';
import Aquafier, { Err } from 'aqua-js-sdk';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = join(__dirname, '..', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_randomhash_originalname
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString('hex');
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${randomHash}_${sanitizedName}`);
  }
});

// File filter to allow only MP3 files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'audio/mpeg' || file.originalname.toLowerCase().endsWith('.mp3')) {
    cb(null, true);
  } else {
    cb(new Error('Only MP3 files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Upload endpoint
router.post('/upload', requireAuth, upload.single('musicFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }


    // Get file info
    const fileInfo = {
      // originalName: req.file.originalname,
      file_name: req.file.filename,
      // size: req.file.size,
      // mimetype: req.file.mimetype,
      // uploadedAt: new Date().toISOString(),
      uploaded_by: req.siwe?.address
    };

    // Here you can add your notarization logic
    // For example, using Aqua or other blockchain services

    // Generate file hash for integrity verification

    // const fileBuffer = await fs.readFile(req.file.path);
    // const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    let aquafier = new Aquafier()
    let fileHash = aquafier.getFileHash(req.file.path)
    console.log("file hash", fileHash)
    fileInfo.file_hash = fileHash;


    //create a form revision on aqua
    let formRevisionContent = JSON.stringify({
      fileName: req.file.filename,
      size: req.file.size,
    })

    let formRevisionFile = {
      fileName: req.file.filename,
      fileContent: formRevisionContent,
      path: ""
    }

    let generatedAquaTree = await aquafier.createGenesisRevision(formRevisionFile, true, false)

    if (generatedAquaTree.isErr()) {
      return res.status(500).json({
        success: false,
        error: generatedAquaTree.error.message || 'Aqua tree generation failed'
      });
    }

    console.log(`File uploaded by ${req.siwe?.address}:`, fileInfo);


    if (!process.env.MNEMONIC) {
      console.error("MNEMONIC is not set in environment variables");
      return res.status(500).json({ error: "MNEMONIC is required for server-side signing" });
    }

    const credentials = {
      "mnemonic": process.env.MNEMONIC,
      "nostr_sk": process.env.NOSTR_SK,
      "did_key": process.env.DID_KEY,
      "alchemy_key": process.env.ALCHEMY_KEY,
      "witness_eth_network": "sepolia",
      "witness_eth_platform": "metamask",
      "witness_method": "cli",
      "p12_password": "123456"
    };

    const { data, fileObject } = req.body
    console.log("-- Received data for AquaTree signing:", JSON.stringify(data, null, 2));
    console.log("-- Received fileObject for signing:", JSON.stringify(fileObject, null, 2));
    const aquaTreeWrapper = {
      aquaTree: generatedAquaTree.data.aquaTree,
      revision: "",
      fileObject: fileObject
    }

    console.log("Signing AquaTree with CLI credentials");
    const signingResult = await aquafier.signAquaTree(aquaTreeWrapper, "cli", credentials, true);

    if (signingResult.isErr()) {
      return res.status(500).json({
        success: false,
        error: signingResult.error.message || 'Aqua tree signing failed'
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo,
      aquaTree: signingResult.data.aquaTree
    });

  } catch (error) {
    console.error('Upload error:', error);

    // Clean up file if error occurred
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// Get uploaded files for authenticated user
router.get('/uploads', requireAuth, async (req, res) => {
  try {
    // This is a simple implementation - in production you'd want to store file metadata in database
    const uploadsDir = join(__dirname, '..', 'uploads');

    try {
      const files = await fs.readdir(uploadsDir);
      const fileList = await Promise.all(
        files.map(async (filename) => {
          const filePath = join(uploadsDir, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            size: stats.size,
            uploadedAt: stats.birthtime,
            // You might want to extract uploader info from filename or database
          };
        })
      );

      res.json({
        success: true,
        files: fileList
      });
    } catch (error) {
      res.json({
        success: true,
        files: []
      });
    }
  } catch (error) {
    console.error('Error getting uploads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve uploads'
    });
  }
});

export default router;