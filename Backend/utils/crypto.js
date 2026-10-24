// Reversible encryption for values Areli must see again (download PIN, gallery password —
// database/handoff.md D3). AES-256-GCM; the key comes from GALLERY_ENC_KEY in .env (any long
// random string). In development it falls back to a key derived from JWT_SECRET so the app
// works out of the box; set GALLERY_ENC_KEY in production and never change it afterwards.
import crypto from 'node:crypto';
import { JWT_SECRET } from '../config/main.js';

const key = crypto.createHash('sha256').update(process.env.GALLERY_ENC_KEY || `dev:${JWT_SECRET}`).digest();

/** text → "iv.tag.ciphertext" (base64url). */
export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

/** The inverse of encrypt(); null when the value is empty or can't be decrypted. */
export function decrypt(value) {
  if (!value) return null;
  try {
    const [iv, tag, data] = value.split('.').map((p) => Buffer.from(p, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** A random 4-digit PIN ("0042" is possible). */
export const randomPin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');
