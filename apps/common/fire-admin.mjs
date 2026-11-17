// FIRE — menu admin de FIRE Kiting et FIRE Listen : clé donnée par le créateur, contenu publié pour toute l'équipe.
//
// Clé : « FIREKEY1.<certificat>.<signature du créateur>.<clé privée> ». Le certificat (qui, quelles applications, clé publique)
// est signé par la clé de créateur de FIRE Team (ECDSA P-256) : impossible à fabriquer sans elle. La clé privée signe ensuite
// chaque publication. Tout le monde vérifie les signatures avant d'utiliser un niveau, un personnage, un sort ou un son.
// Le créateur peut révoquer une clé (liste signée apps/keys.json dans les données de l'équipe).

export const CREATORS = ['MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5Z236SzaO0W7oSRQlg2TSoR9CQMLmHNg+tIdgtxLR8n02SI73y2nj7cFi7EAOvIXumzgj3z2t6RY5C1Uz5Bf3A=='];
const te = new TextEncoder(), td = new TextDecoder();
const EC = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };

export const b64 = {
  dec: (s) => Uint8Array.from(atob(String(s)), (c) => c.charCodeAt(0)),
  enc: (bytes) => { let s = ''; const u = new Uint8Array(bytes); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); },
};
export const b64u = {
  dec: (s) => b64.dec(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)),
  enc: (bytes) => b64.enc(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
};
// JSON canonique (clés triées) : la même chaîne est signée ici et vérifiée par FIRE Team.
export function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
export async function sha256Hex(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const api = () => (window.pywebview && window.pywebview.api) || null;
export const hasBridge = () => !!api();
// pywebview prépare window.pywebview.api un peu après le chargement de la page.
export function bridgeReady(timeout = 8000) {
  return new Promise((ok) => {
    if (api()) return ok(true);
    const t0 = Date.now();
    const on = () => { window.removeEventListener('pywebviewready', on); ok(!!api()); };
    window.addEventListener('pywebviewready', on);
    const poll = setInterval(() => { if (api() || Date.now() - t0 > timeout) { clearInterval(poll); ok(!!api()); } }, 150);
  });
}

let creatorKeys = null;
const creators = () => (creatorKeys ??= Promise.all(CREATORS.map((k) => crypto.subtle.importKey('spki', b64.dec(k), EC, false, ['verify']))));
async function byCreator(sig, data) {
  for (const k of await creators()) { try { if (await crypto.subtle.verify(SIG, k, sig, data)) return true; } catch { /* clé suivante */ } }
  return false;
}
const certCache = new Map();
// « by » = certificat + signature du créateur. Renvoie le certificat s'il est authentique, sinon null.
export function readCert(by) {
  by = String(by || '');
  if (!certCache.has(by)) certCache.set(by, (async () => {
    const [c, s] = by.split('.');
    if (!c || !s) return null;
    try {
      if (!(await byCreator(b64u.dec(s), te.encode(c)))) return null;
      const cert = JSON.parse(td.decode(b64u.dec(c)));
      return cert && cert.v === 1 && Array.isArray(cert.apps) && cert.pub ? cert : null;
    } catch { return null; }
  })());
  return certCache.get(by);
}
export function parseKey(str) {
  const m = /^FIREKEY1\.([\w-]+)\.([\w-]+)\.([\w-]+)$/.exec(String(str || '').replace(/\s+/g, ''));
  return m ? { by: m[1] + '.' + m[2], priv: m[3], raw: m[0] } : null;
}

let revoked = new Set();
async function useKeysFile(k) {
  try {
    if (k && k.payload && k.sig && (await byCreator(b64u.dec(k.sig), te.encode(canon(k.payload))))) revoked = new Set((k.payload.revoked || []).map(String));
  } catch { /* fichier abîmé : on garde la liste précédente */ }
}
export const isRevoked = (id) => revoked.has(String(id));

// État de la clé de ce PC pour cette application.
export async function myKey(app) {
  const a = api();
  if (!a) return { state: 'none' };
  const parsed = parseKey(await a.key_get());
  if (!parsed) return { state: 'none' };
  const cert = await readCert(parsed.by);
  if (!cert) return { state: 'invalid' };
  if (isRevoked(cert.id)) return { state: 'revoked', cert };
  if (!cert.apps.includes(app)) return { state: 'other-app', cert };
  return { state: 'ok', cert, by: parsed.by, priv: parsed.priv };
}
export async function saveKey(str) {
  const parsed = parseKey(str);
  if (!parsed) return { ok: false, error: 'Ce n’est pas une clé FIRE (elle commence par FIREKEY1.).' };
  const cert = await readCert(parsed.by);
  if (!cert) return { ok: false, error: 'Clé invalide : elle n’a pas été créée par le créateur de FIRE.' };
  if (isRevoked(cert.id)) return { ok: false, error: 'Cette clé a été retirée par le créateur.' };
  await api().key_set(parsed.raw);
  return { ok: true, cert };
}
export const clearKey = () => api() && api().key_clear();

const message = (it) => canon({ app: it.app, kind: it.kind, id: it.id, at: it.at, del: !!it.del, data: it.del ? null : it.data });
export async function signItem(key, app, kind, id, data, del = false) {
  const it = { app, kind, id: String(id), at: Date.now(), del: !!del, data: del ? null : data, by: key.by };
  const pk = await crypto.subtle.importKey('pkcs8', b64u.dec(key.priv), EC, false, ['sign']);
  it.sig = b64u.enc(await crypto.subtle.sign(SIG, pk, te.encode(message(it))));
  return it;
}
const pubCache = new Map();
export async function verifyItem(app, it) {
  try {
    if (!it || it.app !== app || !it.kind || !it.id || !it.sig) return false;
    const cert = await readCert(it.by);
    if (!cert || !cert.apps.includes(app) || isRevoked(cert.id)) return false;
    if (!pubCache.has(cert.pub)) pubCache.set(cert.pub, crypto.subtle.importKey('spki', b64.dec(cert.pub), EC, false, ['verify']));
    return await crypto.subtle.verify(SIG, await pubCache.get(cert.pub), b64u.dec(it.sig), te.encode(message(it)));
  } catch { return false; }
}
// Contenu publié pour l'équipe : seuls les éléments correctement signés sont gardés ; le plus récent l'emporte.
export async function teamContent(app) {
  const a = api();
  if (!a) return { items: [], offline: true };
  const r = (await a.team_get(app)) || {};
  await useKeysFile(r.keys);
  const latest = new Map();
  for (const it of ((r.content && r.content.items) || [])) {
    if (!(await verifyItem(app, it))) continue;
    const k = it.kind + ':' + it.id, cur = latest.get(k);
    if (!cur || it.at > cur.at) latest.set(k, it);
  }
  return { items: [...latest.values()].filter((it) => !it.del), offline: !!r.offline };
}
export async function publish(app, item) {
  const a = api();
  if (!a) return { ok: false, error: 'pont indisponible' };
  return a.publish(app, JSON.stringify(item));
}
export async function publishStatus(name) { const a = api(); return a ? a.publish_status(name) : { missing: true }; }
export async function teamFile(path, sha, ext) { const a = api(); return a ? a.team_file(path, sha, ext) : ''; }

// ---------- Petits outils d'interface ----------
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
let toastBox = null;
export function toast(text, bad) {
  if (!toastBox) { toastBox = h('div', { class: 'fa-toasts' }); document.body.append(toastBox); }
  const t = h('div', { class: 'fa-toast' + (bad ? ' bad' : '') }, text);
  toastBox.append(t);
  setTimeout(() => t.remove(), 6000);
}
export function modal(title, body, opts = {}) {
  const close = () => { wrap.remove(); document.removeEventListener('keydown', esc, true); opts.onClose && opts.onClose(); };
  const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const wrap = h('div', { class: 'fa-modal', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'fa-box' + (opts.wide ? ' wide' : '') },
      h('div', { class: 'fa-head' }, h('b', null, title), h('button', { class: 'fa-x', type: 'button', 'aria-label': 'Fermer', onclick: close }, '×')),
      h('div', { class: 'fa-body' }, body)));
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', esc, true);
  document.body.append(wrap);
  return { close, wrap, body: wrap.querySelector('.fa-body') };
}
export const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Attend le résultat d'une publication (FIRE Team doit être ouvert pour l'envoyer).
export async function waitPublish(name, onState) {
  for (let i = 0; i < 90; i++) {
    const s = await publishStatus(name);
    if (s && s.ok) { onState && onState('ok'); return { ok: true }; }
    if (s && s.ok === false) { onState && onState('error', s.error); return { ok: false, error: s.error }; }
    onState && onState('pending');
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { ok: false, pending: true };
}

// Écran « Clé admin » commun aux deux applications.
export function keyScreen(app, appName, onUnlocked) {
  const st = h('p', { class: 'fa-muted' });
  const inp = h('textarea', { class: 'fa-key', rows: 4, placeholder: 'Colle ici la clé donnée par le créateur (FIREKEY1.…)', spellcheck: 'false' });
  const go = async () => {
    st.textContent = 'Vérification…';
    const r = await saveKey(inp.value);
    if (!r.ok) { st.textContent = '⚠ ' + r.error; st.className = 'fa-muted bad'; return; }
    if (!r.cert.apps.includes(app)) { st.textContent = `⚠ Cette clé est valable pour ${r.cert.apps.join(' et ')}, pas pour ${appName}.`; st.className = 'fa-muted bad'; return; }
    m.close(); toast(`Clé acceptée : bienvenue ${r.cert.who} 🔧`); onUnlocked && onUnlocked();
  };
  const m = modal('🔧 Menu admin de ' + appName, [
    h('p', null, 'Le menu admin permet de créer des contenus pour toute l’équipe. Il s’ouvre avec une clé personnelle donnée par le créateur de FIRE (FIRE Team › Admin › Clés des apps).'),
    inp, h('div', { class: 'fa-row' }, h('button', { class: 'fa-btn primary', type: 'button', onclick: go }, 'Déverrouiller')), st]);
  setTimeout(() => inp.focus(), 50);
}
