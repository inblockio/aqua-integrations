## File Descriptions

### server.mjs
Express server that provides SIWE (Sign-In with Ethereum) authentication combined with Twilio Verify SMS and Email OTP verification. Features include:
- SIWE authentication with nonce generation and signature verification
- SMS verification using Twilio Verify service
- Email verification using Twilio Verify service
- SQLite session management with expiry handling
- AquaTree creation and signing for credential issuance
- Protected endpoints requiring authentication
- Phone and email verification workflow with pending/verified states
- Support for both web and CLI platforms with different signing methods

### login.mjs
Headless CLI client for testing the authentication flow. Capabilities include:
- Wallet creation from mnemonic for SIWE signing
- Cookie-based session persistence across runs
- Automatic session status checking and reuse
- Interactive OTP entry for SMS and email verification
- Full authentication workflow testing including both phone and email verification
- AquaTree generation with CLI platform credentials
- Persistent cookie storage for maintaining sessions

## How to run

1. Intall the dependencies - `npm i`
2. Run the server

```bash
npm run serve
```

3. CLI Login

Here you will test the full workflow with generation of aqua files

```bash
node login.mjs
```

This will generate `info_NUMBER.json` and `info_NUMBER.json.aqua.json` files which you can now import to `aquafier` or `cli` for testing

4. Web login

Visit http://localhost:3000 to use the web interface
