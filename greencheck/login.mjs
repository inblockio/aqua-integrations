
/* ========================  login.mjs  ======================== */
import 'dotenv/config';
import { Wallet } from 'ethers';
import { SiweMessage } from 'siwe';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MNEMONIC = process.env.MNEMONIC || 'test test test test test test test test test test test junk';
const TEST_PHONE = process.env.TEST_PHONE || '+15005550006'; // Twilio Verify magic test number
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

const wallet = Wallet.fromPhrase(MNEMONIC);

// Save cookies between runs to maintain session
const COOKIE_PATH = path.join(__dirname, '.cookie-jar.json');

// Load cookies if they exist
let cookieJar = new CookieJar();
try {
  if (fs.existsSync(COOKIE_PATH)) {
    const cookieData = fs.readFileSync(COOKIE_PATH, 'utf8');
    cookieJar = CookieJar.fromJSON(cookieData);
    console.log('📝 Loaded existing session cookies');
  }
} catch (err) {
  console.warn('⚠️  Could not load cookies:', err.message);
}

// Create API client with cookie support
const api = wrapper(axios.create({ 
  baseURL: 'http://localhost:3000', 
  withCredentials: true, 
  jar: cookieJar 
}));

// Save cookies after each request
api.interceptors.response.use(response => {
  try {
    fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookieJar.toJSON()));
  } catch (err) {
    console.warn('⚠️  Could not save cookies:', err.message);
  }
  return response;
});

// Check if we're already authenticated
async function checkSession() {
  try {
    const { data } = await api.get('/session-status');
    if (data.authenticated) {
      return data;
    }
  } catch (err) {
    // Ignore errors, we'll just authenticate
  }
  return null;
}

(async () => {
  try {
    // Check if we already have a valid session
    const session = await checkSession();
    if (session) {
      console.log('🔑 Already authenticated as', session.address);
      console.log('📱 Phone status:', session.phoneVerified ? `Verified (${session.phone})` : 'Not verified');
      console.log('📧 Email status:', session.emailVerified ? `Verified (${session.email})` : 'Not verified');
      console.log('⏱️  Session expires at:', session.expiresAt);
      
      // If phone or email is not verified, ask if user wants to verify
      if (!session.phoneVerified || !session.emailVerified) {
        const rl = readline.createInterface({ input, output });
        const verifyOptions = [];
        if (!session.phoneVerified) verifyOptions.push('phone');
        if (!session.emailVerified) verifyOptions.push('email');
        
        const verify = await rl.question(`${verifyOptions.join(' and/or ')} not verified. Do you want to verify now? (y/n): `);
        rl.close();
        
        if (verify.toLowerCase() === 'y') {
          // Handle phone verification if needed
          if (!session.phoneVerified) {
            await api.post('/sms-request', { phone: TEST_PHONE });
            console.log('📲 SMS verification code sent to', TEST_PHONE);

            const rl2 = readline.createInterface({ input, output });
            const smsCode = (await rl2.question('Enter the SMS OTP you received: ')).trim();
            rl2.close();

            await api.post('/sms-verify', { code: smsCode });
            console.log('✅ SMS OTP verified');
          }

          // Handle email verification if needed
          if (!session.emailVerified) {
            await api.post('/email-request', { email: TEST_EMAIL });
            console.log('📧 Email verification code sent to', TEST_EMAIL);

            const rl3 = readline.createInterface({ input, output });
            const emailCode = (await rl3.question('Enter the Email OTP you received: ')).trim();
            rl3.close();

            await api.post('/email-verify', { code: emailCode });
            console.log('✅ Email OTP verified');
          }

          // Fetch protected data after verification
          const { data: me } = await api.get('/me?platform=cli');
          console.log('👤 /me →', me);
          return;
        } else {
          console.log('❌ Verification skipped');
          return;
        }
      } else {
        // If already authenticated and both verified, fetch protected data
        const { data: me } = await api.get('/me');
        console.log('👤 /me →', me);
        return;
      }
    }

    /* 1️⃣  Obtain nonce & sign‑in with SIWE */
    const { data: nonce } = await api.get('/nonce');
    const siwe = new SiweMessage({
      domain: 'localhost',
      address: wallet.address,
      statement: 'Sign in with Ethereum (Twilio Verify OTP)',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 1,
      nonce
    });
    const message = siwe.prepareMessage();
    const signature = await wallet.signMessage(message);
    const verifyResponse = await api.post('/verify', { message, signature });
    console.log('✅ SIWE verified for', verifyResponse.data.address);

    /* 2️⃣  Trigger SMS OTP */
    await api.post('/sms-request', { phone: TEST_PHONE });
    console.log('📲 SMS verification code sent to', TEST_PHONE);

    /* 3️⃣  Ask the user for the SMS code */
    let rl = readline.createInterface({ input, output });
    const smsCode = (await rl.question('Enter the SMS OTP you received: ')).trim();
    rl.close();

    /* 4️⃣  Submit SMS OTP */
    await api.post('/sms-verify', { code: smsCode });
    console.log('✅ SMS OTP verified');

    /* 5️⃣  Trigger Email OTP */
    await api.post('/email-request', { email: TEST_EMAIL });
    console.log('📧 Email verification code sent to', TEST_EMAIL);

    /* 6️⃣  Ask the user for the Email code */
    rl = readline.createInterface({ input, output });
    const emailCode = (await rl.question('Enter the Email OTP you received: ')).trim();
    rl.close();

    /* 7️⃣  Submit Email OTP */
    await api.post('/email-verify', { code: emailCode });
    console.log('✅ Email OTP verified');

    /* 8️⃣  Fetch protected data */
    // Specify 'cli' as the platform for the /me endpoint
    const { data: me } = await api.get('/me?platform=cli');
    console.log('👤 /me →', me);

  } catch (err) {
    console.error('Client error:', err.response?.data || err.message);
  }
})();

