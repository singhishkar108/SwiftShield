// backend/src/crypto/encryptAtRest.js
import crypto from 'crypto';

// 32-byte base64 key in env, e.g. OPENSSL: `openssl rand -base64 32`
const KEY = Buffer.from(process.env.AT_REST_KEY_B64 || '', 'base64');
if (!KEY || KEY.length !== 32) {
  console.warn('⚠️ AT_REST_KEY_B64 missing or wrong length; encryption will throw');
}

export function encryptString(plaintext) {
  if (!KEY || KEY.length !== 32) throw new Error('AT_REST_KEY_B64 not configured');
  const iv = crypto.randomBytes(12); // GCM 96-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // single base64 blob (compact)
  return Buffer.concat([iv, tag, ct]).toString('base64');
}
