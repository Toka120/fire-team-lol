// Petit système de fichiers dans le stockage du navigateur (localStorage) : seulement ce que coach.js / jeux.js utilisent.
import { Buffer } from 'buffer';
const K = (p) => 'fire.fs:' + String(p);
export function readFileSync(p, enc) {
  const v = localStorage.getItem(K(p));
  if (v == null) { const e = new Error('ENOENT: ' + p); e.code = 'ENOENT'; throw e; }
  const b = v.startsWith('b64:') ? Buffer.from(v.slice(4), 'base64') : Buffer.from(v, 'utf8');
  return enc ? b.toString(enc) : b;
}
export function writeFileSync(p, data) {
  const v = typeof data === 'string' ? data : 'b64:' + Buffer.from(data).toString('base64');
  try { localStorage.setItem(K(p), v); } catch (e) { throw new Error('stockage du téléphone plein'); }
}
export function existsSync(p) { if (localStorage.getItem(K(p)) != null) return true; const pre = K(p) + '/'; for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).startsWith(pre)) return true; return false; }
export function unlinkSync(p) { localStorage.removeItem(K(p)); }
export function mkdirSync() {}
export function readdirSync(p) {
  const pre = K(p) + '/'; const out = new Set();
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(pre)) out.add(k.slice(pre.length).split('/')[0]); }
  return [...out];
}
export function statSync(p) { const v = localStorage.getItem(K(p)); if (v == null) throw new Error('ENOENT'); return { size: v.length, mtimeMs: Date.now(), isFile: () => true }; }
export default { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, readdirSync, statSync };
