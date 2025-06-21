
/* ========================  login.mjs  ======================== */
import 'dotenv/config';
import { Wallet } from 'ethers';
import { SiweMessage } from 'siwe';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const MNEMONIC = process.env.MNEMONIC || 'test test test test test test test test test test test junk';
const TEST_PHONE = process.env.TEST_PHONE || '+15005550006'; // Twilio Verify magic test number

const api = wrapper(axios.create({ baseURL: 'http://localhost:3000', withCredentials: true, jar: new CookieJar() }));
const wallet = Wallet.fromPhrase(MNEMONIC);

(async () => {
  try {
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
    await api.post('/verify', { message, signature });

    /* 2️⃣  Trigger SMS OTP */
    await api.post('/sms-request', { phone: TEST_PHONE });
    console.log('📲  Verification code sent to', TEST_PHONE);

    /* 3️⃣  Ask the user for the received code */
    const rl = readline.createInterface({ input, output });
    const code = (await rl.question('Enter the OTP you received: ')).trim();
    rl.close();

    /* 4️⃣  Submit OTP */
    await api.post('/sms-verify', { code });
    console.log('✅  OTP verified');

    /* 5️⃣  Fetch protected data */
    const { data: me } = await api.get('/me');
    console.log('👤  /me →', me);

  } catch (err) {
    console.error('Client error:', err.response?.data || err.message);
  }
})();

