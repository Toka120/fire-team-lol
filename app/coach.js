// FIRE LoL - « Parole du coach » (processus principal).
// - Codes : le code d'équipe et le code coach sont vérifiés avec scrypt (empreinte lente, publiée dans joueurs.json).
// - Fiches : générées avec l'API Claude (recherche web), chiffrées en AES-256-GCM avec une clé tirée du code
//   d'équipe, puis publiées dans le dépôt GitHub (dossier coach/). Seuls ceux qui ont le code peuvent les lire.
// - Les clés du coach (API Claude, jeton GitHub) restent sur son ordinateur, chiffrées par Windows (safeStorage).
//   Elles ne sont jamais envoyées à l'interface.

const { app, net, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const REPO = 'Toka120/fire-team-lol';
const GH_API = 'https://api.github.com/repos/' + REPO + '/contents/';
const RAW = 'https://raw.githubusercontent.com/' + REPO + '/main/';
const MODEL = 'claude-sonnet-5-5';
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };

const dir = () => app.getPath('userData');
const file = (n) => path.join(dir(), n);
const norm = (code) => String(code || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

// ---------- Petits outils ----------

function scrypt(text, salt) {
  return new Promise((res, rej) => crypto.scrypt(text, Buffer.from(salt, 'hex'), 32, SCRYPT, (e, k) => (e ? rej(e) : res(k))));
}
async function matches(code, spec) {
  if (!spec || !spec.salt || !spec.hash) return false;
  const k = await scrypt(norm(code), spec.salt);
  const want = Buffer.from(spec.hash, 'hex');
  return want.length === k.length && crypto.timingSafeEqual(k, want);
}

// Chiffré par Windows quand c'est possible ; sinon (ou si le chiffrement échoue) en clair dans le dossier de l'application.
function writeSecret(name, obj) {
  const txt = JSON.stringify(obj);
  let buf = null;
  try { if (safeStorage.isEncryptionAvailable()) buf = safeStorage.encryptString(txt); } catch (e) { buf = null; }
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(file(name), buf || Buffer.from(txt, 'utf8'));
}
function readSecret(name) {
  let buf;
  try { buf = fs.readFileSync(file(name)); } catch (e) { return null; }
  if (buf[0] === 0x7b) { try { return JSON.parse(buf.toString('utf8')); } catch (e) { return null; } }
  try { return JSON.parse(safeStorage.decryptString(buf)); } catch (e) { return null; }
}
function removeFile(name) { try { fs.unlinkSync(file(name)); } catch (e) { /* déjà absent */ } }

async function http(url, opts = {}, ms = 30000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await net.fetch(url, { ...opts, signal: ctl.signal, cache: 'no-store' });
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('pas de réponse (délai dépassé)');
    throw new Error('connexion impossible : ' + ((e && e.message) || e));
  } finally { clearTimeout(t); }
}

// ---------- Code d'équipe et clé des fiches ----------

let getConfig = () => ({});
function init(configGetter) { getConfig = configGetter; }

function teamKey() {
  const s = readSecret('equipe.bin');
  return s && s.key && s.salt === (getConfig().fiches_salt || '') ? Buffer.from(s.key, 'hex') : null;
}

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');

function unwrapTeamKey(coachCode, w) {
  return scrypt(norm(coachCode), w.salt).then((k) => {
    const d = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(w.iv, 'base64'));
    d.setAAD(Buffer.from('fire-cle-equipe'));
    d.setAuthTag(Buffer.from(w.tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(w.data, 'base64')), d.final()]);
  });
}

// Accepte le code d'équipe ou le code coach. Le code coach ouvre aussi le mode coach.
async function unlock(code) {
  const cfg = getConfig();
  const n = norm(code);
  if (!n) return { ok: false };
  let team = false, isCoach = false, err = null;
  try { team = await matches(n, cfg.code_scrypt); } catch (e) { err = e; }
  if (!team && err && cfg.code_sha256) team = sha256(n) === cfg.code_sha256; // secours si scrypt est indisponible
  if (!team && cfg.coach_scrypt) { try { isCoach = await matches(n, cfg.coach_scrypt); } catch (e) { err = err || e; } }
  // Code remplaçant : accès limité, sans la clé de l'équipe (fiches, pools, planning et discussion restent illisibles).
  if (!team && !isCoach && cfg.remplacant_scrypt) {
    let sub = false;
    try { sub = await matches(n, cfg.remplacant_scrypt); } catch (e) { err = err || e; }
    if (sub) {
      try {
        const k = await scrypt(n, cfg.remplacant_salt);
        writeSecret('remp.bin', { key: k.toString('hex'), hash: cfg.remplacant_scrypt.hash });
        removeFile('equipe.bin'); removeFile('coach.bin'); removeFile('chef.bin');
      } catch (e) { return { ok: false, error: "impossible d'enregistrer le code sur cet ordinateur : " + ((e && e.message) || e) }; }
      return { ok: true, remplacant: true };
    }
  }
  if (!team && !isCoach) return { ok: false, error: err ? String((err && err.message) || err) : null };
  removeFile('remp.bin');
  let key = null;
  try {
    if (team && cfg.fiches_salt) key = await scrypt(n, cfg.fiches_salt);
    else if (isCoach && cfg.fiches_cle_coach) key = await unwrapTeamKey(n, cfg.fiches_cle_coach);
  } catch (e) { key = null; }
  try {
    writeSecret('equipe.bin', { key: key ? key.toString('hex') : '', salt: cfg.fiches_salt || '', hash: (cfg.code_scrypt && cfg.code_scrypt.hash) || '' });
    if (isCoach) writeSecret('coach.bin', { ...(readSecret('coach.bin') || {}), hash: cfg.coach_scrypt.hash });
  } catch (e) {
    return { ok: false, error: "impossible d'enregistrer le code sur cet ordinateur : " + ((e && e.message) || e) };
  }
  return { ok: true, coach: isCoach };
}

function rempOn() {
  const cfg = getConfig();
  const r = readSecret('remp.bin');
  return !!(r && cfg.remplacant_scrypt && r.hash === cfg.remplacant_scrypt.hash && r.key);
}
// Clé des remplaçants : les titulaires la retrouvent avec la clé de l'équipe, les remplaçants avec leur code.
function rempKey() {
  const cfg = getConfig();
  const tk = teamKey();
  if (tk && cfg.remplacant_cle) {
    try {
      const w = cfg.remplacant_cle;
      const d = crypto.createDecipheriv('aes-256-gcm', tk, Buffer.from(w.iv, 'base64'));
      d.setAAD(Buffer.from('fire-cle-remplacants'));
      d.setAuthTag(Buffer.from(w.tag, 'base64'));
      return Buffer.concat([d.update(Buffer.from(w.data, 'base64')), d.final()]);
    } catch (e) { return null; }
  }
  if (rempOn()) return Buffer.from(readSecret('remp.bin').key, 'hex');
  return null;
}
// Paquet pour les remplaçants (planning sans les coachs, salons autorisés), envoyé de PC à PC, chiffré avec leur clé.
function rempSeal(obj) {
  const key = rempKey(); if (!key || teamKey() == null) return null; // seuls les titulaires écrivent
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv); c.setAAD(Buffer.from('fire-remp'));
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function rempOpen(box) {
  const key = rempKey(); if (!key || !box) return null;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(String(box.iv), 'base64'));
    d.setAAD(Buffer.from('fire-remp')); d.setAuthTag(Buffer.from(String(box.tag), 'base64'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(String(box.data), 'base64')), d.final()]).toString('utf8'));
  } catch (e) { return null; }
}
function isUnlocked() {
  const cfg = getConfig();
  if (!cfg.code_scrypt) return true;
  if (rempOn()) return true;
  const s = readSecret('equipe.bin');
  return !!(s && s.hash === cfg.code_scrypt.hash && (!cfg.fiches_salt || s.salt === cfg.fiches_salt));
}

function seal(obj, id) {
  const key = teamKey();
  if (!key) throw new Error("code d'équipe manquant sur cet ordinateur");
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(id));
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { v: 1, id, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function open(box) {
  const key = teamKey();
  if (!key) throw new Error("code d'équipe manquant");
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAAD(Buffer.from(box.id));
  d.setAuthTag(Buffer.from(box.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(box.data, 'base64')), d.final()]).toString('utf8'));
}

// ---------- Mode coach ----------

function chefOn() {
  const c = readSecret('chef.bin') || {};
  const cfg = getConfig();
  return !!(c.hash && cfg.chef_scrypt && c.hash === cfg.chef_scrypt.hash);
}
// ---------- Créateur (admin) : tous les droits, seulement sur SON ordinateur ----------
// Une clé privée créée sur ce PC et gardée chiffrée par Windows (on ne peut pas la copier sur un autre PC).
// Sa clé publique est listée dans joueurs.json → « admins » : ce PC-là, et lui seul, a tous les droits.
function adminKey() {
  const k = readSecret('admin.bin');
  return k && k.priv && k.pub ? k : null;
}
let adminCache = null;
function adminOn() {
  if (adminCache && adminCache.at > Date.now() - 60000) return adminCache.on;
  let on = false;
  try {
    const k = adminKey();
    const list = (getConfig().admins || []).map((a) => String(a.pub || '')).filter(Boolean);
    if (k && list.includes(k.pub)) {
      // La clé privée de ce PC correspond bien à la clé publique déclarée.
      const msg = Buffer.from('FIRE-admin:' + Date.now());
      const sig = crypto.sign('sha256', msg, crypto.createPrivateKey(k.priv));
      on = crypto.verify('sha256', msg, crypto.createPublicKey({ key: Buffer.from(k.pub, 'base64'), format: 'der', type: 'spki' }), sig);
    }
  } catch (e) { on = false; }
  adminCache = { on, at: Date.now() };
  return on;
}
function adminSetup() {
  let k = adminKey();
  if (!k) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    k = { priv: privateKey.export({ type: 'pkcs8', format: 'pem' }), pub: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') };
    writeSecret('admin.bin', k);
    adminCache = null;
  }
  return { pub: k.pub, empreinte: crypto.createHash('sha256').update(k.pub).digest('hex').slice(0, 16).toUpperCase().match(/.{4}/g).join('-'), admin: adminOn() };
}
function coachState() {
  const c = readSecret('coach.bin') || {};
  const cfg = getConfig();
  const on = !!(c.hash && cfg.coach_scrypt && c.hash === cfg.coach_scrypt.hash);
  const admin = adminOn();
  // Le créateur a les droits du coach et du chef d'équipe (les clés Claude/GitHub restent celles du coach).
  const remplacant = !teamKey() && rempOn();
  if (remplacant) return { coach: false, claude: false, github: false, chef: false, admin: false, remplacant: true };
  return { coach: on || admin, claude: on && !!c.anthropic, github: on && !!c.github, chef: chefOn() || admin, admin, remplacant: false };
}

// ---------- Chef d'équipe : peut modifier le planning (code chef, donné par le coach) ----------
async function chefUnlock(code) {
  const cfg = getConfig();
  let ok = false;
  try { ok = await matches(code, cfg.chef_scrypt); } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  if (!ok) return { ok: false };
  writeSecret('chef.bin', { hash: cfg.chef_scrypt.hash });
  return { ok: true, ...coachState() };
}
function chefLeave() { removeFile('chef.bin'); return coachState(); }

async function coachUnlock(code) {
  const cfg = getConfig();
  let ok = false;
  try { ok = await matches(code, cfg.coach_scrypt); } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  if (!ok) return { ok: false };
  const c = readSecret('coach.bin') || {};
  writeSecret('coach.bin', { ...c, hash: cfg.coach_scrypt.hash });
  // Si la clé des fiches manque (ordinateur ouvert avec un ancien code), le code coach la retrouve.
  if (!teamKey() && cfg.fiches_cle_coach) {
    try {
      const key = await unwrapTeamKey(code, cfg.fiches_cle_coach);
      writeSecret('equipe.bin', { key: key.toString('hex'), salt: cfg.fiches_salt || '', hash: (cfg.code_scrypt && cfg.code_scrypt.hash) || '' });
    } catch (e) { /* facultatif */ }
  }
  return { ok: true, ...coachState() };
}

function coachLeave() { removeFile('coach.bin'); return coachState(); }

function ghHeaders(token) {
  return { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'FIRE-LoL' };
}

async function coachSave(keys) {
  if (!coachState().coach) return { ok: false, error: 'mode coach non activé' };
  const c = readSecret('coach.bin') || {};
  const out = { ok: true, messages: [] };
  if (keys.anthropic) {
    const k = String(keys.anthropic).trim();
    const r = await http('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01' } });
    if (r.ok) { c.anthropic = k; out.messages.push('Clé Claude enregistrée ✓'); } else { out.ok = false; out.messages.push(`Clé Claude refusée (erreur ${r.status}). Vérifie-la sur console.anthropic.com.`); }
  }
  if (keys.github) {
    const t = String(keys.github).trim();
    const r = await http('https://api.github.com/repos/' + REPO, { headers: ghHeaders(t) });
    let push = false;
    if (r.ok) { const j = await r.json(); push = !!(j.permissions && j.permissions.push); }
    // Les jetons « fine-grained » ne renvoient pas toujours « permissions » : on teste alors la lecture du dossier.
    if (r.ok && !push) push = true;
    if (r.ok && push) { c.github = t; out.messages.push('Jeton GitHub enregistré ✓'); } else { out.ok = false; out.messages.push(`Jeton GitHub refusé (erreur ${r.status}). Il doit donner accès en écriture (Contents) au dépôt ${REPO}.`); }
  }
  if (keys.equipe) {
    const dr = getConfig().data_repo;
    const t = String(keys.equipe).trim();
    if (!dr) { out.ok = false; out.messages.push("Aucun dépôt de données n'est configuré (data_repo)."); }
    else if (!c.github) { out.ok = false; out.messages.push("Enregistre d'abord ton jeton GitHub (il sert à publier le jeton d'équipe)."); }
    else {
      const r = await http('https://api.github.com/repos/' + dr, { headers: ghHeaders(t) });
      if (!r.ok) { out.ok = false; out.messages.push(`Jeton d'équipe refusé (erreur ${r.status}) : il doit donner accès en écriture (Contents) au dépôt ${dr}.`); }
      else {
        try {
          const cur = await ghGet(c.github, 'coach/acces.json');
          const w = await ghPut(c.github, 'coach/acces.json', seal({ token: t }, 'acces'), cur && cur.sha, "Accès d'écriture des joueurs aux tierlists");
          if (!w.ok) throw new Error('conflit, réessaie');
          teamTok = t;
          writeSecret('acces.bin', { token: t });
          out.messages.push("Jeton d'équipe publié ✓ Les joueurs peuvent maintenant modifier leur tierlist.");
        } catch (e) { out.ok = false; out.messages.push("Publication du jeton d'équipe impossible : " + ((e && e.message) || e)); }
      }
    }
  }
  writeSecret('coach.bin', c);
  return { ...out, ...coachState() };
}

// ---------- Génération d'une fiche avec Claude ----------

const SYSTEM = `Tu es l'assistant du coach de FIRE LoL, une équipe amateur de League of Legends (classé Solo/Duo, serveur EUW).
Le coach te donne un sujet ou une consigne. Fais d'abord une recherche web (guides récents, vidéos YouTube de coachs reconnus, patch en cours si c'est utile), puis rédige une fiche claire en français pour les joueurs : simple, concrète, compréhensible par tous, tutoiement, ton direct et encourageant. Reformule avec tes propres mots, sans longues citations.

Réponds UNIQUEMENT par un objet JSON valide, sans texte avant ni après et sans bloc de code, au format :
{
  "titre": "titre court",
  "accroche": "1 ou 2 phrases qui disent ce que le joueur va apprendre",
  "sections": [
    { "titre": "titre de la section", "texte": "40 à 150 mots. Paragraphes séparés par une ligne vide, listes avec des lignes qui commencent par « - », mots importants en **gras**.", "schema": { "svg": "<svg ...>...</svg>", "legende": "ce que montre le schéma" } }
  ],
  "a_retenir": ["3 à 5 points très courts"],
  "exercice": "un exercice concret à faire dans sa prochaine game",
  "videos": [{ "titre": "titre de la vidéo", "url": "https://...", "auteur": "chaîne" }],
  "sources": [{ "titre": "titre", "url": "https://..." }]
}

Règles :
- 2 à 6 sections. "schema" est facultatif (mets null sans schéma) : 1 à 4 schémas en tout, seulement quand ça aide à voir (positions, waves de sbires, trajets, zones, timings).
- Schémas : SVG autonome avec xmlns='http://www.w3.org/2000/svg' et viewBox='0 0 800 450', attributs entre apostrophes simples, fond rectangle '#14110f', police 'Segoe UI', textes d'au moins 16 px. Couleurs : alliés '#4aa3ff', ennemis '#ff5e3a', texte '#f5ede6', éléments secondaires '#a8988c', zone de danger en rouge transparent, bon placement en vert '#4cc38a'. Sbires = petits cercles, tours = carrés, champions = cercles plus grands avec une initiale, flèches avec un marker. Annotations courtes. Le schéma doit être juste sur le fond (ex. un freeze se fait près de sa propre tour).
- Interdit dans les SVG : <script>, <image>, <foreignObject>, <a>, attributs on*, liens ou ressources externes.
- "videos" (0 à 3) et "sources" (1 à 5) : uniquement des URL vues dans ta recherche, jamais inventées.`;

function pickJson(text) {
  const t = text.replace(/```(?:json)?/g, '');
  const first = t.indexOf('{');
  let last = t.lastIndexOf('}');
  while (first >= 0 && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)); } catch (e) { last = t.lastIndexOf('}', last - 1); }
  }
  throw new Error("la réponse de Claude n'était pas une fiche lisible, réessaie");
}

const isUrl = (u) => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) && u.length < 600;
const str = (x, n) => (typeof x === 'string' ? x.trim().slice(0, n) : '');

function cleanSvg(svg) {
  let s = str(svg, 80000);
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return null;
  // Défense en plus : le SVG est affiché dans une balise <img>, qui n'exécute aucun script et ne charge rien.
  s = s.replace(/<(script|foreignObject|image|a|iframe)[\s\S]*?<\/\1\s*>/gi, '').replace(/<(script|foreignObject|image|a|iframe)\b[^>]*\/?>/gi, '');
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
  if (!/xmlns=/.test(s)) s = s.replace(/^<svg/i, "<svg xmlns='http://www.w3.org/2000/svg'");
  return s;
}

function cleanFiche(f, meta) {
  const sections = (Array.isArray(f.sections) ? f.sections : []).slice(0, 8).map((x) => {
    const svg = x && x.schema && cleanSvg(x.schema.svg);
    return { titre: str(x && x.titre, 140), texte: str(x && x.texte, 4000), schema: svg ? { svg, legende: str(x.schema.legende, 300) } : null };
  }).filter((x) => x.titre || x.texte);
  if (!sections.length) throw new Error('la fiche reçue était vide, réessaie');
  const links = (arr, n) => (Array.isArray(arr) ? arr : []).filter((x) => x && isUrl(x.url)).slice(0, n)
    .map((x) => ({ titre: str(x.titre, 200) || x.url, url: x.url, auteur: str(x.auteur, 80) }));
  return {
    type: 'fiche', titre: str(f.titre, 140) || meta.sujet.slice(0, 80), accroche: str(f.accroche, 600), sections,
    a_retenir: (Array.isArray(f.a_retenir) ? f.a_retenir : []).map((x) => str(x, 240)).filter(Boolean).slice(0, 6),
    exercice: str(f.exercice, 800), videos: links(f.videos, 3), sources: links(f.sources, 6),
    sujet: str(meta.sujet, 2000), cible: str(meta.cible, 40) || 'Toute l\'équipe'
  };
}

async function claude(key, body) {
  const r = await http('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }, 300000);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j.error && j.error.message) || '';
    if (r.status === 401) throw new Error('clé Claude refusée : vérifie-la dans les réglages coach');
    if (r.status === 402 || /credit|billing/i.test(msg)) throw new Error("plus de crédit sur le compte de l'API Claude (console.anthropic.com → Billing)");
    if (r.status === 429) throw new Error('trop de demandes en même temps, réessaie dans une minute');
    if (r.status === 529 || r.status >= 500) throw new Error("l'API Claude est surchargée, réessaie dans quelques minutes");
    throw new Error(`erreur de l'API Claude (${r.status}) ${msg}`.trim());
  }
  return j;
}

async function generate(req) {
  const c = readSecret('coach.bin') || {};
  if (!coachState().coach) return { ok: false, error: 'mode coach non activé' };
  if (!c.anthropic) return { ok: false, error: "ajoute d'abord la clé de l'API Claude dans les réglages coach" };
  const sujet = str(req.sujet, 2000);
  if (!sujet) return { ok: false, error: 'écris un sujet' };
  const cible = str(req.cible, 40) || "Toute l'équipe";
  const roster = (getConfig().joueurs || []).filter((p) => p.pseudo).map((p) => `${p.role} : ${p.pseudo}${p.pool ? ' (pool imposé : ' + p.pool + ')' : ''}`).join('\n');
  const ask = `Sujet ou consigne du coach :\n${sujet}\n\nFiche destinée à : ${cible}\n\nJoueurs de l'équipe et champions imposés (pour choisir des exemples qui leur parlent) :\n${roster || '—'}`;
  const messages = [{ role: 'user', content: ask }];
  if (req.precedent && req.modif) {
    const prev = { ...req.precedent };
    delete prev.sujet; delete prev.cible; delete prev.type;
    messages.push({ role: 'assistant', content: JSON.stringify(prev) });
    messages.push({ role: 'user', content: `Modifie cette fiche selon la demande du coach : ${str(req.modif, 1500)}\nRenvoie la fiche complète, au même format JSON.` });
  }
  try {
    let text = '';
    let searches = 0;
    for (let turn = 0; turn < 5; turn++) {
      const j = await claude(c.anthropic, {
        model: MODEL, max_tokens: 16000, system: SYSTEM, messages,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: req.modif ? 3 : 6 }]
      });
      for (const b of j.content || []) {
        if (b.type === 'text') text += b.text;
        if (b.type === 'server_tool_use') searches++;
      }
      if (j.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: j.content }); continue; }
      if (j.stop_reason === 'max_tokens') throw new Error('la fiche était trop longue, demande un sujet plus précis');
      break;
    }
    const fiche = cleanFiche(pickJson(text), { sujet, cible });
    return { ok: true, fiche, recherches: searches };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

// ---------- Publication et lecture des fiches (dépôt GitHub, dossier coach/) ----------

const apiOf = (repo) => 'https://api.github.com/repos/' + (repo || REPO) + '/contents/';
async function ghGet(token, p, repo) {
  const r = await http(apiOf(repo) + p + '?ref=main', { headers: ghHeaders(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub a refusé la lecture (${r.status})`);
  const j = await r.json();
  return { sha: j.sha, json: j.content ? JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')) : null };
}
async function ghPut(token, p, obj, sha, message, repo) {
  const body = { message, content: Buffer.from(JSON.stringify(obj, null, 1), 'utf8').toString('base64'), branch: 'main' };
  if (sha) body.sha = sha;
  const r = await http(apiOf(repo) + p, { method: 'PUT', headers: { ...ghHeaders(token), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) return { conflict: true };
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'jeton GitHub refusé : vérifie-le dans les réglages coach' : `GitHub a refusé l'envoi (${r.status})`);
  return { ok: true };
}
async function ghDelete(token, p, sha, message) {
  const r = await http(GH_API + p, { method: 'DELETE', headers: { ...ghHeaders(token), 'content-type': 'application/json' }, body: JSON.stringify({ message, sha, branch: 'main' }) });
  if (!r.ok && r.status !== 404) throw new Error(`GitHub a refusé la suppression (${r.status})`);
}

async function updateIndex(token, change) {
  for (let i = 0; i < 3; i++) {
    const cur = await ghGet(token, 'coach/index.json');
    const idx = (cur && cur.json) || { v: 1, fiches: [] };
    change(idx);
    const r = await ghPut(token, 'coach/index.json', idx, cur && cur.sha, 'Parole du coach : liste des fiches');
    if (r.ok) return;
  }
  throw new Error('la liste des fiches a changé pendant l\'envoi, réessaie');
}

async function publish(fiche) {
  const c = readSecret('coach.bin') || {};
  if (!coachState().coach) return { ok: false, error: 'mode coach non activé' };
  if (!c.github) return { ok: false, error: "ajoute d'abord le jeton GitHub dans les réglages coach" };
  try {
    const id = Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
    const at = Date.now();
    const box = seal({ ...fiche, at }, id);
    const r = await ghPut(c.github, `coach/${id}.json`, box, null, 'Parole du coach : nouvelle fiche');
    if (!r.ok) throw new Error("GitHub a refusé l'envoi");
    await updateIndex(c.github, (idx) => { idx.fiches = (idx.fiches || []).filter((x) => x.id !== id).concat([{ id, at }]); });
    saveCache(id, box);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

async function unpublish(id) {
  const c = readSecret('coach.bin') || {};
  if (!coachState().coach || !c.github) return { ok: false, error: 'réservé au coach (jeton GitHub manquant)' };
  if (!/^[a-z0-9-]{4,40}$/.test(String(id))) return { ok: false, error: 'fiche inconnue' };
  try {
    await updateIndex(c.github, (idx) => { idx.fiches = (idx.fiches || []).filter((x) => x.id !== id); });
    const cur = await ghGet(c.github, `coach/${id}.json`);
    if (cur) await ghDelete(c.github, `coach/${id}.json`, cur.sha, 'Parole du coach : fiche retirée');
    removeFile(path.join('fiches', id + '.json'));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

function cachePath(id) { return path.join(dir(), 'fiches', id + '.json'); }
function saveCache(id, box) {
  try { fs.mkdirSync(path.join(dir(), 'fiches'), { recursive: true }); fs.writeFileSync(cachePath(id), JSON.stringify(box)); } catch (e) { /* cache facultatif */ }
}
function loadCache(id) { try { return JSON.parse(fs.readFileSync(cachePath(id), 'utf8')); } catch (e) { return null; } }

async function readPublic(p, repo, token) {
  // API GitHub (toujours à jour), puis copie « raw » si la limite de l'API est atteinte.
  try {
    const headers = { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'FIRE-LoL' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await http(apiOf(repo) + p + '?ref=main', { headers });
    if (r.status === 404 && !token) return null;
    if (r.ok) return JSON.parse(await r.text());
    if (r.status === 404) return null;
  } catch (e) { /* on tente la copie raw */ }
  const r = await http('https://raw.githubusercontent.com/' + (repo || REPO) + '/main/' + p + '?t=' + Date.now());
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('fiches du coach injoignables (' + r.status + ')');
  return JSON.parse(await r.text());
}

async function list() {
  if (!teamKey()) return { ok: false, error: "entre à nouveau le code d'équipe pour lire les fiches" };
  let idx;
  let offline = false;
  try { idx = await readPublic('coach/index.json'); } catch (e) { offline = true; }
  if (offline) {
    // Hors ligne : on affiche les fiches déjà téléchargées.
    let ids = [];
    try { ids = fs.readdirSync(path.join(dir(), 'fiches')).filter((n) => n.endsWith('.json') && n !== 'pools.json').map((n) => n.slice(0, -5)); } catch (e) { /* aucune */ }
    idx = { fiches: ids.map((id) => ({ id })) };
  }
  const out = [];
  for (const it of (idx && idx.fiches) || []) {
    if (!/^[a-z0-9-]{4,40}$/.test(String(it.id))) continue;
    let box = loadCache(it.id);
    if (!box && !offline) {
      try { box = await readPublic(`coach/${it.id}.json`); if (box) saveCache(it.id, box); } catch (e) { /* suivante */ }
    }
    if (!box) continue;
    try { out.push({ id: it.id, ...open(box) }); } catch (e) { /* fiche chiffrée avec un autre code : ignorée */ }
  }
  out.sort((a, b) => (b.at || 0) - (a.at || 0));
  return { ok: true, fiches: out, offline };
}

// ---------- Tierlists des champion pools (une par semaine), chiffrées comme les fiches ----------
// Ligne O : OBLIGATOIRE (comptée pour l'objectif). Ligne M : MAÎTRISÉS. Un champion peut être dans les deux.
// Les tierlists vont dans un dépôt de données à part (joueurs.json → data_repo), où les joueurs peuvent écrire
// avec le jeton d'équipe (chiffré avec le code d'équipe). Ce jeton ne donne aucun accès au code de l'application.

const POOLS = 'coach/pools.json';
const cleanIds = (a) => { const seen = new Set(); return (Array.isArray(a) ? a : []).map((x) => String(x).replace(/[^A-Za-z0-9]/g, '').slice(0, 30)).filter((x) => x && !seen.has(x) && seen.add(x)).slice(0, 15); };

function cleanTiers(t, par) {
  t = t || {};
  const legacy = ['S', 'A', 'B', 'C'].flatMap((k) => (Array.isArray(t[k]) ? t[k] : []));
  return { O: cleanIds(Array.isArray(t.O) ? t.O : legacy), M: cleanIds(t.M), T: cleanIds(t.T), par: par || (t.par === 'joueur' ? 'joueur' : 'coach'), maj: Number(t.maj) || Date.now() };
}

function cleanWeek(w) {
  const debut = /^\d{4}-\d{2}-\d{2}$/.test(String(w && w.debut)) ? w.debut : null;
  if (!debut) throw new Error('date de début invalide');
  const joueurs = {};
  for (const [slug, t] of Object.entries((w && w.joueurs) || {})) {
    if (typeof slug !== 'string' || slug.length > 80) continue;
    joueurs[slug] = cleanTiers(t);
  }
  return {
    id: typeof w.id === 'string' && /^[a-z0-9-]{4,40}$/.test(w.id) ? w.id : Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex'),
    debut, objectif: Math.max(0, Math.min(200, parseInt(w.objectif, 10) || 0)), note: str(w.note, 600), joueurs, at: Date.now()
  };
}

// Jeton d'écriture de l'équipe : publié chiffré par le coach dans coach/acces.json.
let teamTok = null;
async function teamToken() {
  try {
    const box = await readPublic('coach/acces.json');
    if (box) { const d = open(box); teamTok = d.token || null; if (teamTok) writeSecret('acces.bin', { token: teamTok }); }
    else { teamTok = null; removeFile('acces.bin'); }
  } catch (e) {
    if (!teamTok) { const c = readSecret('acces.bin'); teamTok = (c && c.token) || null; } // hors ligne
  }
  return teamTok;
}

async function pools() {
  if (!teamKey()) return { ok: false, error: "entre à nouveau le code d'équipe pour lire les pools" };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  let box = null, offline = false;
  try {
    if (dr) box = await readPublic('pools.json', dr, tok);
    if (!box) box = await readPublic(POOLS);
    if (box) saveCache('pools', box);
  } catch (e) { offline = true; box = loadCache('pools'); }
  const base = { peutEcrire: !!(dr && tok), depot: dr, offline };
  if (!box) return { ok: true, semaines: [], ...base };
  try {
    const d = open(box);
    return { ok: true, semaines: (d.semaines || []).sort((a, b) => a.debut.localeCompare(b.debut)), bonus: cleanBonus(d.bonus), ...base };
  } catch (e) { return { ok: false, error: 'pools illisibles avec ce code', ...base }; }
}

// Games obligatoires ajoutées (ou retirées) par le coach à un joueur, pour une semaine : { 'lundi YYYY-MM-DD': { slug: n } }.
function cleanBonus(b) {
  const out = {};
  for (const [wk, m] of Object.entries(b || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(wk) || !m || typeof m !== 'object') continue;
    const o = {};
    for (const [slug, n] of Object.entries(m)) { const v = parseInt(n, 10); if (typeof slug === 'string' && slug.length <= 80 && v) o[slug] = Math.max(-200, Math.min(200, v)); }
    if (Object.keys(o).length) out[wk] = o;
  }
  return out;
}

// action : { type: 'save', semaine } ou { type: 'delete', id } (coach), { type: 'joueur', slug, debut, objectif, tiers } (joueur ou coach),
// { type: 'bonus', semaine: 'lundi', slug, delta, base } (coach : games obligatoires en plus ou en moins pour la semaine)
async function savePools(action) {
  const cfg = getConfig();
  const dr = cfg.data_repo || null;
  const isCoach = coachState().coach;
  const c = readSecret('coach.bin') || {};
  const tok = dr ? await teamToken() : null;
  let repo, token, file;
  if (dr && tok) { repo = dr; token = tok; file = 'pools.json'; }
  else if (isCoach && c.github) { repo = REPO; token = c.github; file = POOLS; }
  else return { ok: false, error: dr ? "le coach n'a pas encore activé l'écriture des tierlists pour les joueurs" : 'réservé au coach' };
  if (action.type !== 'joueur' && !isCoach) return { ok: false, error: 'réservé au coach' };
  try {
    for (let i = 0; i < 4; i++) {
      const cur = await ghGet(token, file, repo);
      let semaines = [], bonus = {};
      if (cur && cur.json) { const d0 = open(cur.json); semaines = d0.semaines || []; bonus = cleanBonus(d0.bonus); }
      else if (repo !== REPO) { try { const old = await readPublic(POOLS); if (old) semaines = open(old).semaines || []; } catch (e) { /* rien à reprendre */ } }
      if (action.type === 'bonus') {
        const wk = String(action.semaine || ''), slug = String(action.slug || '').slice(0, 80), delta = parseInt(action.delta, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(wk) || !slug || ![-10, -1, 1, 10].includes(delta)) throw new Error('demande invalide');
        const base = Math.max(0, parseInt(action.base, 10) || 0);
        const m = bonus[wk] || {};
        const v = Math.max(-base, Math.min(200, (m[slug] || 0) + delta));
        if (v) m[slug] = v; else delete m[slug];
        bonus[wk] = m;
        // On ne garde que les 8 dernières semaines.
        Object.keys(bonus).sort().slice(0, -8).forEach((k) => delete bonus[k]);
      } else if (action.type === 'delete') semaines = semaines.filter((w) => w.id !== action.id);
      else if (action.type === 'joueur') {
        const slug = String(action.slug || '').slice(0, 80);
        if (!slug) throw new Error('joueur inconnu');
        let w = semaines.find((x) => x.debut === action.debut);
        if (!w) { w = cleanWeek({ debut: action.debut, objectif: action.objectif || (cfg.objectif && cfg.objectif.games) || 20, joueurs: {} }); semaines.push(w); }
        w.joueurs = w.joueurs || {};
        w.joueurs[slug] = cleanTiers(action.tiers, isCoach && action.par !== 'joueur' ? 'coach' : 'joueur');
        w.joueurs[slug].maj = Date.now();
      } else {
        const w = cleanWeek(action.semaine || {});
        semaines = semaines.filter((x) => x.id !== w.id && x.debut !== w.debut).concat([w]);
      }
      semaines.sort((a, b) => a.debut.localeCompare(b.debut));
      bonus = cleanBonus(bonus);
      const box = seal({ semaines, bonus }, 'pools');
      const r = await ghPut(token, file, box, cur && cur.sha, action.type === 'bonus' ? 'Pools : games obligatoires ajoutées par le coach' : 'Pools : tierlists de la semaine', repo);
      if (r.ok) { saveCache('pools', box); return { ok: true, semaines, bonus }; }
    }
    throw new Error('les pools ont changé pendant l\'envoi, réessaie');
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

// ---------- Planning : le coach coche les jours et heures de jeu, chaque joueur répond présent / absent / incertain ----------
// Même stockage que les pools : planning.json dans le dépôt de données (jeton d'équipe), sinon coach/planning.json (jeton du coach).
const PLANNING = 'coach/planning.json';
// Les dispos des coachs et les demandes sont dans un fichier à part : les anciennes versions de FIRE
// réécrivent planning.json sans connaître ces données (c'est ce qui les avait effacées le 12/11).
const PLANNING_C = 'coach/planning-coachs.json';
const PLANNING_C_DATA = 'planning-coachs.json';
// Avant la 1.10.64, les dispos étaient dans planning.json : on les reprend tant que le fichier des coachs n'existe pas.
function mergePlanning(d, dc) {
  const src = dc || d || {};
  return prunePlanning({ jours: (d && d.jours) || {}, reponses: (d && d.reponses) || {}, coachs: src.coachs || {}, resas: src.resas || {} });
}
const isYmd = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const STATUTS = ['present', 'absent', 'incertain'];

function cleanJour(j) {
  const heures = [...new Set((Array.isArray(j && j.heures) ? j.heures : []).map((x) => parseInt(x, 10)).filter((x) => x >= 0 && x <= 23))].sort((a, b) => a - b);
  const type = ['flex', '5c5', 'scrim', 'review', 'autre'].includes(j && j.type) ? j.type : 'flex';
  return { heures, type, note: str(j && j.note, 200), maj: Date.now() };
}

// Second panel : chaque coach coche ses dispos (heure par heure), un joueur demande un créneau, le coach valide ou refuse.
// coachs : { 'AAAA-MM-JJ': { slugCoach: { heures, note, maj } } }
// resas  : { 'AAAA-MM-JJ': { slugCoach: { 'heure': { slugJoueur: { statut: attente|ok|refus, note, at } } } } }
const RESA = ['attente', 'ok', 'refus'];
const coachSlugs = () => (Array.isArray(getConfig().coachs) ? getConfig().coachs : []).map((c) => c && c.slug).filter(Boolean);
function prunePlanning(d) {
  const lim = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const jours = {}, reponses = {}, coachs = {}, resas = {};
  for (const [k, v] of Object.entries(d.jours || {})) if (isYmd(k) && k >= lim && v && v.heures && v.heures.length) jours[k] = v;
  for (const [k, v] of Object.entries(d.reponses || {})) if (isYmd(k) && k >= lim && v) reponses[k] = v;
  for (const [k, byCoach] of Object.entries(d.coachs || {})) {
    if (!isYmd(k) || k < lim || !byCoach) continue;
    for (const [c, v] of Object.entries(byCoach)) if (v && v.heures && v.heures.length) (coachs[k] = coachs[k] || {})[c] = v;
  }
  // Une demande ne survit que si le coach propose toujours cette heure.
  for (const [k, byCoach] of Object.entries(d.resas || {})) {
    for (const [c, byHour] of Object.entries(byCoach || {})) {
      const offer = coachs[k] && coachs[k][c];
      for (const [hr, who] of Object.entries(byHour || {})) {
        if (!offer || !offer.heures.includes(Number(hr)) || !who || !Object.keys(who).length) continue;
        ((resas[k] = resas[k] || {})[c] = resas[k][c] || {})[hr] = who;
      }
    }
  }
  return { jours, reponses, coachs, resas };
}

async function planning() {
  if (!teamKey()) return { ok: false, error: "entre à nouveau le code d'équipe pour lire le planning" };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  let box = null, boxC = null, offline = false;
  try {
    if (dr) box = await readPublic('planning.json', dr, tok);
    if (!box) box = await readPublic(PLANNING);
    if (dr) boxC = await readPublic(PLANNING_C_DATA, dr, tok);
    if (!boxC) boxC = await readPublic(PLANNING_C);
    if (box) saveCache('planning', box);
    if (boxC) saveCache('planning-coachs', boxC);
  } catch (e) { offline = true; box = loadCache('planning'); boxC = loadCache('planning-coachs'); }
  const base = { peutEcrire: !!(dr && tok), depot: dr, offline };
  try { return { ok: true, ...mergePlanning(box ? open(box) : {}, boxC ? open(boxC) : null), ...base }; }
  catch (e) { return { ok: false, error: 'planning illisible avec ce code', ...base }; }
}

// action : { type: 'semaine', debut, jours: { 'AAAA-MM-JJ': { heures, type, note } } } (coach : remplace les 7 jours à partir de debut)
//          { type: 'reponse', date, slug, statut, note } (joueur ou coach)
//          { type: 'dispos', coach, debut, jours: { 'AAAA-MM-JJ': { heures, note } } } (coach : ses dispos sur 7 jours)
//          { type: 'demande', date, coach, heure, slug, on, note } (joueur : demande ou retire sa demande d'un créneau)
//          { type: 'decision', date, coach, heure, slug, statut } (coach : ok / refus / attente)
async function savePlanning(action) {
  const dr = getConfig().data_repo || null;
  const isCoach = coachState().coach;
  const c = readSecret('coach.bin') || {};
  const tok = dr ? await teamToken() : null;
  const coachPart = ['dispos', 'demande', 'decision'].includes(action.type);
  let repo, token, file, other;
  if (dr && tok) { repo = dr; token = tok; file = coachPart ? PLANNING_C_DATA : 'planning.json'; other = coachPart ? 'planning.json' : PLANNING_C_DATA; }
  else if (isCoach && c.github) { repo = REPO; token = c.github; file = coachPart ? PLANNING_C : PLANNING; other = coachPart ? PLANNING : PLANNING_C; }
  else return { ok: false, error: dr ? "le coach n'a pas encore activé les réponses des joueurs (jeton d'équipe)" : 'réservé au coach' };
  if (action.type === 'semaine' && !isCoach && !chefOn()) return { ok: false, error: "réservé au coach et au chef d'équipe" };
  if ((action.type === 'dispos' || action.type === 'decision') && !isCoach) return { ok: false, error: 'réservé aux coachs (code coach)' };
  if (['dispos', 'demande', 'decision'].includes(action.type) && !coachSlugs().includes(action.coach)) return { ok: false, error: 'coach inconnu' };
  try {
    for (let i = 0; i < 4; i++) {
      const cur = await ghGet(token, file, repo);
      const oth = await ghGet(token, other, repo).catch(() => null);
      const othD = oth && oth.json ? open(oth.json) : {};
      let d = { jours: {}, reponses: {} };
      if (cur && cur.json) d = open(cur.json);
      else if (coachPart) d = { coachs: othD.coachs || {}, resas: othD.resas || {} }; // 1re écriture : reprise depuis planning.json
      else if (repo !== REPO) { try { const old = await readPublic(PLANNING); if (old) d = open(old); } catch (e) { /* rien à reprendre */ } }
      if (!coachPart) { d.jours = d.jours || {}; d.reponses = d.reponses || {}; Object.assign(d, { coachs: othD.coachs || {}, resas: othD.resas || {} }); }
      else { d.jours = othD.jours || {}; d.reponses = othD.reponses || {}; }
      d.jours = d.jours || {}; d.reponses = d.reponses || {}; d.coachs = d.coachs || {}; d.resas = d.resas || {};
      if (action.type === 'semaine') {
        if (!isYmd(action.debut)) throw new Error('semaine invalide');
        const t0 = new Date(action.debut + 'T12:00:00Z').getTime();
        for (let k = 0; k < 7; k++) {
          const day = new Date(t0 + k * 864e5).toISOString().slice(0, 10);
          const j = action.jours && action.jours[day];
          const cj = j ? cleanJour(j) : null;
          if (cj && cj.heures.length) d.jours[day] = cj; else delete d.jours[day];
        }
      } else if (action.type === 'reponse') {
        const slug = String(action.slug || '').slice(0, 80);
        if (!slug || !isYmd(action.date)) throw new Error('réponse invalide');
        if (!d.jours[action.date]) throw new Error("ce jour n'est plus au planning");
        d.reponses[action.date] = d.reponses[action.date] || {};
        if (STATUTS.includes(action.statut)) d.reponses[action.date][slug] = { statut: action.statut, note: str(action.note, 120), at: Date.now() };
        else delete d.reponses[action.date][slug];
      } else if (action.type === 'dispos') {
        if (!isYmd(action.debut)) throw new Error('semaine invalide');
        const t0 = new Date(action.debut + 'T12:00:00Z').getTime();
        for (let k = 0; k < 7; k++) {
          const day = new Date(t0 + k * 864e5).toISOString().slice(0, 10);
          const j = action.jours && action.jours[day];
          const cj = j ? cleanJour(j) : null;
          d.coachs[day] = d.coachs[day] || {};
          if (cj && cj.heures.length) d.coachs[day][action.coach] = { heures: cj.heures, note: cj.note, maj: cj.maj };
          else delete d.coachs[day][action.coach];
        }
      } else if (action.type === 'demande' || action.type === 'decision') {
        const slug = String(action.slug || '').slice(0, 80);
        const hr = parseInt(action.heure, 10);
        if (!slug || !isYmd(action.date) || !(hr >= 0 && hr <= 23)) throw new Error('demande invalide');
        const offer = d.coachs[action.date] && d.coachs[action.date][action.coach];
        if (!offer || !offer.heures.includes(hr)) throw new Error("ce créneau n'est plus proposé par le coach");
        const slot = (((d.resas[action.date] = d.resas[action.date] || {})[action.coach] = d.resas[action.date][action.coach] || {})[hr] = d.resas[action.date][action.coach][hr] || {});
        if (action.type === 'demande') {
          if (!action.on) delete slot[slug];
          else {
            if (!slot[slug] || slot[slug].statut === 'refus') slot[slug] = { statut: 'attente', note: str(action.note, 120), at: Date.now() };
          }
        } else {
          if (!slot[slug] || !RESA.includes(action.statut)) throw new Error("cette demande n'existe plus");
          // Plusieurs joueurs peuvent être acceptés sur le même créneau (coaching à plusieurs) : chaque demande est traitée à part.
          slot[slug] = { statut: action.statut, note: slot[slug].note || '', at: Date.now() };
        }
      } else throw new Error('action inconnue');
      d = prunePlanning(d);
      const box = coachPart ? seal({ coachs: d.coachs, resas: d.resas }, 'planning-coachs') : seal({ jours: d.jours, reponses: d.reponses }, 'planning');
      const msg = { reponse: 'Planning : réponse', semaine: 'Planning : semaine', dispos: 'Planning coachs : dispos', demande: 'Planning coachs : demande', decision: 'Planning coachs : décision' }[action.type];
      const r = await ghPut(token, file, box, cur && cur.sha, msg, repo);
      if (r.ok) { saveCache(coachPart ? 'planning-coachs' : 'planning', box); return { ok: true, ...d }; }
    }
    throw new Error("le planning a changé pendant l'envoi, réessaie");
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

// ---------- Discussion écrite de l'équipe : historique chiffré (300 derniers messages) dans le dépôt de données ----------
const CHAT = 'chat.json';
// to : message privé pour un seul membre (absent = toute l'équipe). Le fichier reste chiffré avec le code d'équipe.
const cleanMsg = (m) => {
  const o = { id: String((m && m.id) || '').replace(/[^\w-]/g, '').slice(0, 40), from: String((m && m.from) || '').slice(0, 80), text: str(m && m.text, 500), at: Math.min(Number(m && m.at) || Date.now(), Date.now() + 60000) };
  if (m && m.to) o.to = String(m.to).slice(0, 80);
  // Salon de la discussion d'équipe (absent = #général).
  if (m && !m.to && /^[a-z0-9-]{2,20}$/.test(String(m.ch || ''))) o.ch = m.ch;
  return o;
};
async function chat() {
  if (!teamKey()) return { ok: false, error: "entre à nouveau le code d'équipe" };
  const dr = getConfig().data_repo || null;
  if (!dr) return { ok: true, msgs: [], peutEcrire: false };
  const tok = await teamToken();
  let box = null, offline = false;
  try { box = await readPublic(CHAT, dr, tok); if (box) saveCache('chat', box); } catch (e) { offline = true; box = loadCache('chat'); }
  try { return { ok: true, msgs: box ? (open(box).msgs || []) : [], offline, peutEcrire: !!tok }; }
  catch (e) { return { ok: false, error: 'discussion illisible avec ce code' }; }
}
// ---------- Salons de l'équipe (texte et vocal), créés par le coach ou le chef d'équipe ----------
// salons.json dans le dépôt de données, chiffré avec le code d'équipe comme la discussion.
const SALONS = 'salons.json';
const salonId = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
function cleanSalons(d) {
  const one = (x, voice) => {
    const id = salonId(x && (x.id || x.name));
    if (!id || id.length < 2 || ['team', 'equipe', 'general'].includes(id)) return null;
    const o = { id, name: str(x.name, 30) || id, ico: str(x.ico, 8) || (voice ? '🔊' : '💬'), desc: str(x.desc, 90) };
    if (voice) o.max = Math.max(0, Math.min(10, Math.round(Number(x.max) || 0)));
    return o;
  };
  const uniq = (l) => { const seen = new Set(); return l.filter((x) => x && !seen.has(x.id) && seen.add(x.id)); };
  return {
    texte: uniq((Array.isArray(d && d.texte) ? d.texte : []).map((x) => one(x, false))).slice(0, 15),
    voix: uniq((Array.isArray(d && d.voix) ? d.voix : []).map((x) => one(x, true))).slice(0, 12),
  };
}
async function salons() {
  if (!teamKey()) return { ok: false, error: "entre à nouveau le code d'équipe" };
  const dr = getConfig().data_repo || null;
  if (!dr) return { ok: true, salons: null };
  const tok = await teamToken();
  let box = null, offline = false;
  try { box = await readPublic(SALONS, dr, tok); if (box) saveCache('salons', box); } catch (e) { offline = true; box = loadCache('salons'); }
  try { return { ok: true, salons: box ? cleanSalons(open(box)) : null, offline, gerer: coachState().coach || chefOn() }; }
  catch (e) { return { ok: false, error: 'salons illisibles avec ce code' }; }
}
async function salonsSave(d) {
  if (!coachState().coach && !chefOn()) return { ok: false, error: "réservé au coach et au chef d'équipe" };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "le coach n'a pas encore activé le jeton d'équipe" };
  const clean = cleanSalons(d);
  try {
    for (let i = 0; i < 4; i++) {
      const cur = await ghGet(tok, SALONS, dr);
      const box = seal({ ...clean, maj: Date.now() }, 'salons');
      const r = await ghPut(tok, SALONS, box, cur && cur.sha, 'Salons', dr);
      if (r.ok) { saveCache('salons', box); return { ok: true, salons: clean }; }
    }
    throw new Error("les salons ont changé pendant l'enregistrement, réessaie");
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// ---------- Carnet de bord (staff) : rôles, activité de chacun, notes du staff, modération ----------
// Fichiers chiffrés avec le code d'équipe dans le dépôt de données. L'activité : un fichier par membre,
// écrit seulement par son FIRE (pas de conflit), lu par le carnet de bord du staff.
const ROLES = 'roles.json', STAFF = 'staff.json';
const actPath = (slug) => 'activite/' + crypto.createHash('sha256').update(String(slug)).digest('hex').slice(0, 24) + '.json';
async function teamRead(p) {
  const dr = getConfig().data_repo || null;
  if (!dr || !teamKey()) return null;
  const tok = await teamToken();
  let box = null;
  try { box = await readPublic(p, dr, tok); if (box) saveCache('t-' + p.replace(/\W/g, '_'), box); } catch (e) { box = loadCache('t-' + p.replace(/\W/g, '_')); }
  return box ? open(box) : null;
}
async function teamWrite(p, fn, label) {
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) throw new Error("le coach n'a pas encore activé le jeton d'équipe");
  for (let i = 0; i < 4; i++) {
    const cur = await ghGet(tok, p, dr);
    let d = null;
    try { d = cur && cur.json ? open(cur.json) : null; } catch (e) { d = null; }
    const next = fn(d);
    const r = await ghPut(tok, p, seal(next, p), cur && cur.sha, label, dr);
    if (r.ok) return next;
  }
  throw new Error("le fichier a changé pendant l'enregistrement, réessaie");
}
const isStaffHere = () => { const st = coachState(); return st.coach || st.chef || st.admin; };
async function roles() {
  try { const d = await teamRead(ROLES); return { ok: true, modos: (d && Array.isArray(d.modos) ? d.modos : []).map(String).slice(0, 20) }; }
  catch (e) { return { ok: false, error: 'rôles illisibles avec ce code', modos: [] }; }
}
async function rolesSave(modos, who) {
  const st = coachState();
  if (!st.coach && !st.admin) return { ok: false, error: 'réservé au coach et au créateur' };
  try {
    const d = await teamWrite(ROLES, () => ({ modos: (Array.isArray(modos) ? modos : []).map((x) => String(x).slice(0, 80)).slice(0, 20), maj: Date.now() }), 'Rôles');
    activityPush(who, [{ t: Date.now(), k: 'roles', d: 'Modérateurs : ' + (d.modos.length ? d.modos.length : 'aucun') }]).catch(() => {});
    return { ok: true, modos: d.modos };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
const cleanEvt = (e) => ({ t: Math.min(Number(e && e.t) || Date.now(), Date.now() + 60000), k: str(e && e.k, 20), d: str(e && e.d, 160) });
// Mon activité (envoyée par mon FIRE toutes les quelques minutes) : 600 dernières actions, plus la dernière présence.
async function activityPush(slug, evts) {
  slug = String(slug || '').slice(0, 80);
  if (!slug) return { ok: false };
  const list = (Array.isArray(evts) ? evts : []).map(cleanEvt).filter((x) => x.k);
  try {
    await teamWrite(actPath(slug), (d) => {
      const old = d && Array.isArray(d.evts) ? d.evts : [];
      const keys = new Set(old.map((x) => x.t + x.k + x.d));
      const all = old.concat(list.filter((x) => !keys.has(x.t + x.k + x.d))).sort((a, b) => a.t - b.t).slice(-600);
      return { slug, evts: all, vu: Date.now(), v: app.getVersion() };
    }, 'Activité');
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function activityAll(slugs) {
  if (!isStaffHere() && !(slugs && slugs.modo)) return { ok: false, error: 'réservé au staff' };
  const list = (Array.isArray(slugs) ? slugs : (slugs && slugs.list) || []).map(String).slice(0, 40);
  const out = {};
  await Promise.all(list.map(async (sl) => { try { const d = await teamRead(actPath(sl)); if (d) out[sl] = { evts: d.evts || [], vu: d.vu || 0, v: d.v || '' }; } catch (e) { /* illisible */ } }));
  return { ok: true, act: out };
}
async function staffNotes() {
  try { const d = await teamRead(STAFF); return { ok: true, notes: (d && Array.isArray(d.notes) ? d.notes : []) }; }
  catch (e) { return { ok: false, error: 'notes illisibles avec ce code', notes: [] }; }
}
async function staffNoteSave(note, who) {
  const n = { id: String((note && note.id) || Date.now().toString(36) + crypto.randomBytes(3).toString('hex')).replace(/[^\w-]/g, '').slice(0, 30),
    by: String(who || '').slice(0, 80), at: Date.now(), titre: str(note && note.titre, 80), texte: str(note && note.texte, 3000), tag: str(note && note.tag, 30), del: !!(note && note.del) };
  try {
    const d = await teamWrite(STAFF, (cur) => {
      let notes = cur && Array.isArray(cur.notes) ? cur.notes : [];
      notes = notes.filter((x) => x.id !== n.id);
      if (!n.del) notes.push(n);
      return { notes: notes.sort((a, b) => b.at - a.at).slice(0, 300) };
    }, 'Notes du staff');
    activityPush(who, [{ t: Date.now(), k: 'staff', d: (n.del ? 'Note supprimée : ' : 'Note du staff : ') + (n.titre || 'sans titre') }]).catch(() => {});
    return { ok: true, notes: d.notes };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// Modération : supprimer un message de la discussion (salons ou messages privés).
async function chatDelete(id, who) {
  id = String(id || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (!id) return { ok: false, error: 'message inconnu' };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "le coach n'a pas encore activé le jeton d'équipe" };
  try {
    let gone = null;
    for (let i = 0; i < 5; i++) {
      const cur = await ghGet(tok, CHAT, dr);
      const d = cur && cur.json ? open(cur.json) : { msgs: [] };
      gone = (d.msgs || []).find((x) => x.id === id) || null;
      d.msgs = (d.msgs || []).filter((x) => x.id !== id);
      const box = seal(d, 'chat');
      const r = await ghPut(tok, CHAT, box, cur && cur.sha, 'Discussion (modération)', dr);
      if (r.ok) { saveCache('chat', box); break; }
    }
    activityPush(who, [{ t: Date.now(), k: 'modo', d: 'Message supprimé' + (gone ? ` de ${gone.from} : « ${String(gone.text).slice(0, 60)} »` : '') }]).catch(() => {});
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// ---------- Nouveaux membres : demande d'entrée (lien dpm.lol), validée par le créateur, un coach ou le chef d'équipe ----------
const MEMBRES = 'membres.json';
const ROLE_RE = /^(Top|Jungle|Mid|ADC|Support)( \(Remplaçant\))?$/;
function cleanMembre(m) {
  const slug = String((m && m.slug) || '').replace(/[^\w%.~-]/g, '').slice(0, 80);
  if (!slug || slug.length < 3) return null;
  return { slug, pseudo: str(m.pseudo, 40) || slug, role: ROLE_RE.test(String(m.role || '')) ? m.role : 'Mid (Remplaçant)', note: str(m.note, 140),
    statut: ['attente', 'ok', 'refus'].includes(m.statut) ? m.statut : 'attente', at: Number(m.at) || Date.now(), par: str(m.par, 80) };
}
async function membres() {
  try { const d = await teamRead(MEMBRES); return { ok: true, membres: (d && Array.isArray(d.membres) ? d.membres : []).map(cleanMembre).filter(Boolean), gerer: isStaffHere() }; }
  catch (e) { return { ok: false, error: 'liste des membres illisible avec ce code', membres: [] }; }
}
async function membreDemande(m) {
  const n = cleanMembre({ ...m, statut: 'attente', at: Date.now(), par: '' });
  if (!n) return { ok: false, error: 'lien dpm.lol invalide' };
  try {
    const d = await teamWrite(MEMBRES, (cur) => {
      // Lien corrigé : l'ancienne demande (encore en attente) est remplacée.
      const old = String((m && m.old) || '');
      const l = (cur && Array.isArray(cur.membres) ? cur.membres : []).filter((x) => (x.slug !== n.slug || x.statut === 'ok') && !(old && x.slug === old && x.statut === 'attente'));
      if (!l.some((x) => x.slug === n.slug)) l.push(n);
      return { membres: l.slice(-100) };
    }, 'Demande d\'entrée');
    activityPush(n.slug, [{ t: Date.now(), k: 'app', d: `Demande à rejoindre l'équipe (${n.role})` }]).catch(() => {});
    return { ok: true, membres: d.membres };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function membreDecision(slug, ok, role, who, fix) {
  if (!isStaffHere()) return { ok: false, error: "réservé au créateur, aux coachs et au chef d'équipe" };
  try {
    const d = await teamWrite(MEMBRES, (cur) => {
      const l = cur && Array.isArray(cur.membres) ? cur.membres : [];
      const x = l.find((y) => y.slug === slug);
      // Correction du lien dpm.lol par le staff (sans changer le statut).
      if (x && fix && fix.slug) { const c = cleanMembre({ ...x, slug: fix.slug, pseudo: fix.pseudo || x.pseudo }); if (c && !l.some((y) => y !== x && y.slug === c.slug)) { x.slug = c.slug; x.pseudo = c.pseudo; } return { membres: l }; }
      if (x) { x.statut = ok ? 'ok' : 'refus'; if (ROLE_RE.test(String(role || ''))) x.role = role; x.par = String(who || '').slice(0, 80); x.decide = Date.now(); }
      return { membres: l.filter((y) => y.statut !== 'refus' || Date.now() - (y.decide || 0) < 30 * 86400000) };
    }, fix ? 'Lien dpm.lol corrigé' : ok ? 'Membre accepté' : 'Membre refusé');
    if (fix) return { ok: true, membres: d.membres };
    activityPush(who, [{ t: Date.now(), k: 'roles', d: (ok ? 'Membre accepté : ' : 'Demande refusée : ') + decodeURIComponent(String(slug)) }]).catch(() => {});
    return { ok: true, membres: d.membres };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function chatSend(m) {
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "le coach n'a pas encore activé le jeton d'équipe" };
  const msg = cleanMsg(m);
  if (!msg.id || !msg.from || !msg.text) return { ok: false, error: 'message vide' };
  try {
    for (let i = 0; i < 5; i++) {
      const cur = await ghGet(tok, CHAT, dr);
      const d = cur && cur.json ? open(cur.json) : { msgs: [] };
      d.msgs = Array.isArray(d.msgs) ? d.msgs : [];
      if (!d.msgs.some((x) => x.id === msg.id)) d.msgs.push(msg);
      d.msgs.sort((a, b) => a.at - b.at);
      // 300 messages d'équipe et 600 messages privés au plus : les privés ne chassent pas ceux de l'équipe.
      // 300 messages par salon et 600 messages privés au plus : un salon très actif ne chasse pas les autres.
      const byCh = {};
      d.msgs.filter((x) => !x.to).forEach((x) => { (byCh[x.ch || ''] = byCh[x.ch || ''] || []).push(x); });
      const team = Object.values(byCh).flatMap((l) => l.slice(-300)), dm = d.msgs.filter((x) => x.to).slice(-600);
      d.msgs = team.concat(dm).sort((a, b) => a.at - b.at);
      const box = seal(d, 'chat');
      const r = await ghPut(tok, CHAT, box, cur && cur.sha, 'Discussion', dr);
      if (r.ok) { saveCache('chat', box); return { ok: true, msgs: d.msgs }; }
    }
    throw new Error("la discussion a changé pendant l'envoi, réessaie");
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

// Liste des champions (Data Dragon de Riot), gardée en cache pour le mode hors ligne.
async function champions() {
  try {
    const v = (await (await http('https://ddragon.leagueoflegends.com/api/versions.json', {}, 15000)).json())[0];
    const j = await (await http(`https://ddragon.leagueoflegends.com/cdn/${v}/data/fr_FR/champion.json`, {}, 20000)).json();
    const list = Object.values(j.data || {}).map((x) => ({ id: x.id, name: x.name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const out = { ok: true, version: v, list };
    try { fs.writeFileSync(path.join(dir(), 'champions.json'), JSON.stringify(out)); } catch (e) { /* cache facultatif */ }
    return out;
  } catch (e) {
    try { return JSON.parse(fs.readFileSync(path.join(dir(), 'champions.json'), 'utf8')); } catch (e2) { return { ok: false, list: [], version: null }; }
  }
}

function message(m) {
  const texte = str(m.texte, 6000);
  if (!texte) return { ok: false, error: 'écris ta note' };
  return { ok: true, fiche: { type: 'message', titre: str(m.titre, 140) || 'Note du coach', accroche: '', sections: [{ titre: '', texte, schema: null }], a_retenir: [], exercice: '', videos: [], sources: [], sujet: '', cible: str(m.cible, 40) || "Toute l'équipe" } };
}


// ---------- Rapports de bug (texte + captures), chiffrés avec la clé d'équipe ----------
// Rangés dans le dépôt de données de l'équipe (bugs/<id>.json) avec le jeton d'équipe,
// ou à défaut dans le dépôt de l'application (coach/bugs/) avec le jeton GitHub du coach.
function bugTarget() {
  const dr = getConfig().data_repo || null;
  const c = readSecret('coach.bin') || {};
  return { dr, coach: coachState().coach, coachTok: c.github || null };
}
async function bugRepo() {
  const t = bugTarget();
  const tok = t.dr ? await teamToken() : null;
  if (t.dr && tok) return { repo: t.dr, token: tok, dir: 'bugs/' };
  if (t.coach && t.coachTok) return { repo: REPO, token: t.coachTok, dir: 'coach/bugs/' };
  return null;
}
async function sendBug(b) {
  if (!teamKey()) return { ok: false, error: "entre à nouveau le code d'équipe" };
  const texte = str(b.texte, 4000);
  if (!texte || texte.length < 5) return { ok: false, error: 'décris le problème en quelques mots' };
  const images = (Array.isArray(b.images) ? b.images : []).slice(0, 3)
    .filter((x) => typeof x === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x) && x.length < 3.5e6);
  const where = await bugRepo();
  if (!where) return { ok: false, error: "le coach doit d'abord activer le jeton d'équipe (Paramètres › Réglages coach)" };
  const id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + crypto.randomBytes(3).toString('hex');
  const rapport = { id, at: Date.now(), qui: str(b.qui, 60) || 'anonyme', version: str(b.version, 20), section: str(b.section, 40), texte, images };
  try {
    const r = await ghPut(where.token, where.dir + id + '.json', seal(rapport, id), null, 'Rapport de bug ' + id, where.repo);
    if (!r.ok) return { ok: false, error: "GitHub n'a pas accepté l'envoi, réessaie" };
    return { ok: true, id };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}
async function listBugs() {
  if (!coachState().coach) return { ok: false, error: 'réservé au coach' };
  const where = await bugRepo();
  if (!where) return { ok: true, bugs: [], info: "jeton d'équipe pas encore activé" };
  try {
    const r = await http(apiOf(where.repo) + where.dir.replace(/\/$/, '') + '?ref=main', { headers: ghHeaders(where.token) });
    if (r.status === 404) return { ok: true, bugs: [] };
    if (!r.ok) throw new Error('GitHub a refusé la lecture (' + r.status + ')');
    const files = (await r.json()).filter((f) => /\.json$/.test(f.name)).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 40);
    const bugs = [];
    for (const f of files) {
      try { const box = await readPublic(where.dir + f.name, where.repo, where.token); if (box) bugs.push(open(box)); } catch (e) { /* illisible : ignoré */ }
    }
    return { ok: true, bugs };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}
async function closeBug(id) {
  if (!coachState().coach) return { ok: false, error: 'réservé au coach' };
  if (!/^[0-9]{14}-[a-f0-9]{6}$/.test(String(id || ''))) return { ok: false, error: 'rapport inconnu' };
  const where = await bugRepo();
  if (!where) return { ok: false, error: "jeton d'équipe pas encore activé" };
  try {
    const r = await http(apiOf(where.repo) + where.dir + id + '.json?ref=main', { headers: ghHeaders(where.token) });
    if (!r.ok) return { ok: true };
    const j = await r.json();
    const d = await http(apiOf(where.repo) + where.dir + id + '.json', { method: 'DELETE', headers: { ...ghHeaders(where.token), 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Bug réglé ' + id, sha: j.sha, branch: 'main' }) });
    if (!d.ok) throw new Error('GitHub a refusé la suppression (' + d.status + ')');
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

// ---------- Revue de parties partagée avec l'équipe (dépôt de données, chiffré avec le code d'équipe) ----------
const REVUES = 'revues/index.json';
const revId = (x) => (/^\d{10,16}$/.test(String(x)) ? String(x) : null);
function cleanNote(n) {
  if (!n || typeof n !== 'object') return null;
  const strokes = Array.isArray(n.draw) ? n.draw.slice(0, 30).map((st) => (Array.isArray(st.p) ? { c: String(st.c || '#ff6b3d').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7), p: st.p.slice(0, 400).map((q) => [Math.max(0, Math.min(1, Number(q[0]) || 0)), Math.max(0, Math.min(1, Number(q[1]) || 0))].map((v) => Math.round(v * 1000) / 1000)) } : null)).filter(Boolean) : [];
  return { id: String(n.id || '').replace(/[^\w-]/g, '').slice(0, 24) || crypto.randomBytes(4).toString('hex'), t: Math.max(0, Math.min(7200, Number(n.t) || 0)), by: String(n.by || '').slice(0, 80), text: String(n.text || '').slice(0, 600), at: Number(n.at) || Date.now(), draw: strokes };
}
async function revues() {
  try { const d = await teamRead(REVUES); return { ok: true, list: (d && Array.isArray(d.list) ? d.list : []).slice(0, 200) }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e), list: [] }; }
}
async function revueGet(id) {
  id = revId(id); if (!id) return null;
  try { return await teamRead('revues/' + id + '.json'); } catch (e) { return null; }
}
async function revueShare(game, who) {
  const id = revId(game && game.id); if (!id) return { ok: false, error: 'partie invalide' };
  const txt = JSON.stringify(game); if (txt.length > 900000) return { ok: false, error: 'partie trop longue à partager' };
  try {
    const g = JSON.parse(txt); g.notes = (g.notes || []).map(cleanNote).filter(Boolean).slice(-300); g.par = String(who || '').slice(0, 80);
    await teamWrite('revues/' + id + '.json', (cur) => ({ ...g, notes: mergeNotes((cur && cur.notes) || [], g.notes) }), 'Revue partagée');
    const meP = (g.players || []).find((p) => p.n === g.me) || {};
    const item = { id, par: g.par, at: Date.now(), start: g.start, mode: g.mode, queue: g.queue, me: g.me, champ: meP.c || '', duration: g.duration, result: g.result };
    await teamWrite(REVUES, (cur) => ({ list: [item].concat(((cur && cur.list) || []).filter((x) => x.id !== id)).slice(0, 200) }), 'Liste des revues');
    activityPush(who, [{ t: Date.now(), k: 'app', d: 'Revue de partie partagée' }]).catch(() => {});
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
function mergeNotes(a, b) { const m = new Map(); for (const n of a.concat(b)) if (n && n.id) m.set(n.id, n); return [...m.values()].sort((x, y) => x.t - y.t).slice(-300); }
async function revueNote(id, note, del) {
  id = revId(id); if (!id) return { ok: false, error: 'partie invalide' };
  const n = cleanNote(note); if (!n) return { ok: false, error: 'note vide' };
  try {
    const d = await teamWrite('revues/' + id + '.json', (cur) => {
      if (!cur) throw new Error('revue introuvable');
      const notes = del ? (cur.notes || []).filter((x) => x.id !== n.id) : mergeNotes(cur.notes || [], [n]);
      return { ...cur, notes };
    }, del ? 'Note retirée' : 'Note de revue');
    return { ok: true, notes: d.notes };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

module.exports = { revues, revueGet, revueShare, revueNote, rempSeal, rempOpen, chat, chatSend, chatDelete, membres, membreDemande, membreDecision, salons, salonsSave, adminSetup, roles, rolesSave, activityPush, activityAll, staffNotes, staffNoteSave, sendBug, listBugs, closeBug, pools, savePools, planning, savePlanning, champions, init, unlock, isUnlocked, coachState, coachUnlock, coachLeave, chefUnlock, chefLeave, coachSave, generate, publish, unpublish, list, message, _test: { pickJson, cleanFiche, cleanSvg, scrypt, norm } };
