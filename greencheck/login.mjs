import { Wallet } from 'ethers';
import { SiweMessage } from 'siwe';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const MNEMONIC =
  process.env.MNEMONIC ||
  'test test test test test test test test test test test junk'; // dev only — replace in prod

/* ───────── axios client with cookie jar ───────── */
const jar = new CookieJar();
const api = wrapper(
  axios.create({
    baseURL: 'http://localhost:3000',
    withCredentials: true,
    jar
  })
);

/* ───────── derive wallet (ethers v6) ───────── */
const wallet = Wallet.fromPhrase(MNEMONIC);

(async () => {
  try {
    /* 1️⃣ Fetch nonce */
    const { data: nonce } = await api.get('/nonce');

    /* 2️⃣ Craft SIWE message object */
    const siwe = new SiweMessage({
      domain: 'localhost',
      address: wallet.address,
      statement: 'Sign in with Ethereum to the minimalist SIWE server',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 1,
      nonce
    });

    /* 3️⃣ Turn it into the canonical string & sign */
    const messageString = siwe.prepareMessage();
    const signature = await wallet.signMessage(messageString);

    /* 4️⃣ Verify (cookie gets set) */
    const { data: result } = await api.post('/verify', {
      message: messageString,
      signature
    });
    console.log('🔑  /verify →', result);

    /* 5️⃣ Access protected route */
    const { data: me } = await api.get('/me');
    console.log('👤  /me →', me);
  } catch (err) {
    console.error('⚠️  Client error:', err.response?.data || err.message);
  }
})();
