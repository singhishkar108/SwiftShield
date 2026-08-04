//backend/src/utils/crypto.js
import crypto from "crypto";
import { getDataKeyBytes } from "../config/env.js";

const KEY = getDataKeyBytes();               //32 bytes for AES-256
if (KEY.length !== 32) throw new Error("DATA_KEY must decode to exactly 32 bytes");

//Encrypt -> returns ONE base64 string:  iv(12) | tag(16) | ciphertext
export function encrypt(plain) {
  const iv = crypto.randomBytes(12);         // GCM nonce
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

//Decrypt <- expects the same base64 blob as above
export function decrypt(b64) {
  const buf = Buffer.from(b64, "base64");
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct  = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
