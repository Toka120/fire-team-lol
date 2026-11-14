// Crypto de Node (sous-ensemble utilisé par coach.js) avec @noble : AES-256-GCM, scrypt, SHA-256.
import { Buffer } from 'buffer';
import { gcm } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';
const u8 = (x) => (x instanceof Uint8Array ? x : Buffer.from(x));
export function randomBytes(n) { const b = Buffer.alloc(n); crypto.getRandomValues(b); return b; }
export function scrypt(text, salt, len, opts, cb) {
  scryptAsync(u8(Buffer.from(String(text), 'utf8')), u8(salt), { N: opts.N, r: opts.r, p: opts.p, dkLen: len, asyncTick: 20 })
    .then((k) => cb(null, Buffer.from(k)), (e) => cb(e));
}
export function timingSafeEqual(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
export function createHash(alg) {
  if (alg !== 'sha256') throw new Error('hash non géré : ' + alg);
  const parts = [];
  const o = { update(d) { parts.push(typeof d === 'string' ? Buffer.from(d, 'utf8') : Buffer.from(d)); return o; },
    digest(enc) { const out = Buffer.from(sha256(Buffer.concat(parts))); return enc ? out.toString(enc) : out; } };
  return o;
}
function gcmBox(key, iv, enc) {
  let aad = new Uint8Array(0), tag = null; const parts = [];
  const o = {
    setAAD(a) { aad = u8(a); return o; },
    setAuthTag(t) { tag = u8(t); return o; },
    update(d, inEnc) { parts.push(typeof d === 'string' ? Buffer.from(d, inEnc || 'utf8') : Buffer.from(d)); return Buffer.alloc(0); },
    final() {
      const data = Buffer.concat(parts);
      const c = gcm(u8(key), u8(iv), aad);
      if (enc) { const out = c.encrypt(data); o._tag = Buffer.from(out.slice(out.length - 16)); return Buffer.from(out.slice(0, out.length - 16)); }
      const both = new Uint8Array(data.length + 16); both.set(data); both.set(tag, data.length);
      return Buffer.from(c.decrypt(both));
    },
    getAuthTag() { return o._tag; },
  };
  return o;
}
export function createCipheriv(alg, key, iv) { if (alg !== 'aes-256-gcm') throw new Error(alg); return gcmBox(key, iv, true); }
export function createDecipheriv(alg, key, iv) { if (alg !== 'aes-256-gcm') throw new Error(alg); return gcmBox(key, iv, false); }
export default { randomBytes, scrypt, timingSafeEqual, createHash, createCipheriv, createDecipheriv };
