# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a SIWE (Sign-In with Ethereum) + Twilio Verify SMS and Email OTP authentication system that integrates with AquaTree credential issuance. It provides both web and CLI interfaces for wallet-based authentication combined with phone number and email address verification.

## Development Commands

**Start development server:**
```bash
npm run serve
```

**Run CLI authentication test:**
```bash
node login.mjs
```

**Access web interface:**
- Visit http://localhost:3000

## Architecture

### Core Components

**Server Architecture (Modular):**
- **server.mjs** - Main Express server setup and configuration, route mounting
- **services/twilio.mjs** - Twilio Verify service integration for SMS and email OTP
- **middleware/auth.mjs** - Authentication middleware and session validation
- **routes/auth.mjs** - Authentication endpoints (SIWE, SMS/email verification)
- **routes/protected.mjs** - Protected endpoints (AquaTree generation, server signing)
- **routes/admin.mjs** - Administrative endpoints (database status)
- **db.mjs** - SQLite database layer with session, phone and email verification management

**Client Components:**
- **login.mjs** - Headless CLI client with cookie persistence for testing full auth workflow
- **public/index.html** - Complete web UI with MetaMask integration

### Database Schema

SQLite database (`sessions.db`) with three tables:
- **sessions**: `id`, `address`, `nonce`, `created_at`, `expires_at`, `chain_id`
- **phone_verifications**: `session_id`, `phone`, `verified`, `pending_phone`
- **email_verifications**: `session_id`, `email`, `verified`, `pending_email`

### Authentication Flow

Multi-step process: Wallet Connection → SIWE Authentication → SMS OTP Request → Phone Verification → Email OTP Request → Email Verification

Sessions are UUID-based with 24-hour expiry and automatic cleanup. Both phone and email verification are optional but recommended for complete credential issuance.

## Environment Configuration

Required variables in `.env` (see `.env.example`):
```bash
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_VERIFY_SERVICE_SID=VAxxx...
MNEMONIC="test test test test test test test test test test test junk"
SESSION_SECRET=super-secret
TEST_PHONE=+14151234567
TEST_EMAIL=test@example.com
```

## Key API Endpoints

**Authentication:**
- `GET /nonce` - Generate SIWE nonce
- `POST /verify` - Verify SIWE signature
- `POST /sms-request` - Initiate SMS verification
- `POST /sms-verify` - Verify SMS OTP
- `POST /email-request` - Initiate email verification
- `POST /email-verify` - Verify email OTP
- `GET /session-status` - Check auth status
- `POST /logout` - End session

**Protected:**
- `GET /me` - Generate AquaTree credentials (supports `?platform=cli|web`)
- `POST /server-sign` - Complete server-side AquaTree signing

## Platform-Specific Behavior

**CLI Platform (`?platform=cli`):**
- Server-side signing using MNEMONIC
- Generates signed AquaTree immediately
- Outputs timestamped JSON files

**Web Platform (default):**
- Client-side MetaMask signing initiation
- Server completion via `/server-sign` endpoint
- Download functionality for generated credentials

## Dependencies

**Core:**
- `aqua-js-sdk` (v3.2.1-41) - AquaTree credential system
- `siwe` (v3.0.0) - Ethereum sign-in
- `twilio` (v5.7.1) - SMS verification
- `ethers` (v6.14.4) - Ethereum interactions
- `sqlite3` (v5.1.7) - Session storage

## Modular Architecture Benefits

The refactored codebase provides:
- **Separation of concerns** - Each module has a single responsibility
- **Easier testing** - Individual components can be tested in isolation
- **Better maintainability** - Clear organization makes code easier to understand and modify
- **Reusability** - Services and middleware can be reused across different routes
- **Scalability** - New features can be added by creating new route modules

## File Generation

Successful authentication generates:
- `info_TIMESTAMP.json` - User data and verification details
- `info_TIMESTAMP.aqua.json` - Signed AquaTree credential

These files can be imported into `aquafier` or `cli` for further testing.

## Session Management

- Cookie-based sessions with SQLite persistence
- Automatic expiry handling and cleanup
- CLI client maintains session across runs via `.cookie-jar.json`
- Foreign key constraints ensure data integrity

## Debug Utilities

- `debug.mjs` - Twilio API testing and verification status checking
- `GET /admin/db-status` - Database inspection (development only)