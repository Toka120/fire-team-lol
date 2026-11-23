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
let getRaw = () => getConfig();
let onTeam = () => {};
// configGetter : la config de l'équipe active (Alpha, ou une autre équipe comme Bravo) ; rawGetter : joueurs.json tel quel.
function init(configGetter, rawGetter, teamChanged) { getConfig = configGetter; if (rawGetter) getRaw = rawGetter; if (teamChanged) onTeam = teamChanged; }

// ---------- Plusieurs équipes : Alpha (dossiers d'origine) et les autres (equipes/<id>/…) ----------
// L'équipe active de ce PC est choisie par le code d'équipe entré. Ses données sont rangées dans equipes/<id>/,
// chiffrées avec sa propre clé : une équipe ne voit jamais celles d'une autre.
let teamCache = null;
function activeTeam() { if (teamCache === null) { const s = readSecret('team.bin'); teamCache = (s && s.id) || ''; } const id = teamCache; return id && getRaw().equipes && getRaw().equipes[id] ? id : ''; }
function setTeam(id) { if (id) writeSecret('team.bin', { id }); else removeFile('team.bin'); teamCache = id || ''; teamTok = null; removeFile('acces.bin'); try { onTeam(); } catch (e) { /* */ } }
const GLOBAL_P = /^(apps|public|launcher|equipes)\//;
const nsPath = (p) => { const t = getConfig().team_id; return t && !GLOBAL_P.test(String(p)) ? 'equipes/' + t + '/' + p : p; };

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
  const n0 = norm(code);
  if (!n0) return { ok: false };
  // Le code d'une autre équipe (Bravo…) bascule ce PC sur elle ; un code d'Alpha le ramène sur Alpha.
  const raw = getRaw() || {};
  let target = null;
  for (const [id, t] of Object.entries(raw.equipes || {})) { try { if (await matches(n0, t.code_scrypt)) { target = id; break; } } catch (e) { /* */ } }
  if (target === null && activeTeam()) {
    for (const spec of [raw.code_scrypt, raw.coach_scrypt, raw.remplacant_scrypt]) { try { if (spec && await matches(n0, spec)) { target = ''; break; } } catch (e) { /* */ } }
  }
  if (target !== null && target !== activeTeam()) { removeFile('equipe.bin'); removeFile('coach.bin'); removeFile('chef.bin'); removeFile('remp.bin'); setTeam(target); }
  const cfg = getConfig();
  const n = n0;
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
function sealWith(key, obj, id) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(id));
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { v: 1, id, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function openWith(key, box) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAAD(Buffer.from(box.id)); d.setAuthTag(Buffer.from(box.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(box.data, 'base64')), d.final()]).toString('utf8'));
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

const SYSTEM = `Tu es l'assistant du coach de FIRE Team, une équipe amateur de League of Legends (classé Solo/Duo, serveur EUW).
Le coach te donne un sujet ou une consigne. Fais d'abord une recherche web (guides récents, vidéos YouTube de coachs reconnus, patch en cours si c'est utile), puis rédige une fiche claire en français pour les joueurs : simple, concrète, compréhensible par tous, tutoiement, ton direct et encourageant. Reformule avec tes propres mots, sans longues citations. Vocabulaire : garde les mots de LoL que tous les joueurs utilisent (back, wave, lane, push, freeze, bounce, crash, drake, soul, Herald, scuttle, ward, pink, dive, gank, roam, fight, item, ult, cooldown), jamais leur traduction (rentrer, vague, voie, pousser, dragon, balise, plongée…).

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
  p = nsPath(p);
  const r = await http(apiOf(repo) + p + '?ref=main', { headers: ghHeaders(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub a refusé la lecture (${r.status})`);
  const j = await r.json();
  return { sha: j.sha, json: j.content ? JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')) : null };
}
async function ghPut(token, p, obj, sha, message, repo) {
  p = nsPath(p);
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

function cachePath(id) { const t = getConfig().team_id; return path.join(dir(), 'fiches', (t ? t + '-' : '') + id + '.json'); }
function saveCache(id, box) {
  try { fs.mkdirSync(path.join(dir(), 'fiches'), { recursive: true }); fs.writeFileSync(cachePath(id), JSON.stringify(box)); } catch (e) { /* cache facultatif */ }
}
function loadCache(id) { try { return JSON.parse(fs.readFileSync(cachePath(id), 'utf8')); } catch (e) { return null; } }

async function readPublic(p, repo, token, ref) {
  // API GitHub (toujours à jour), puis copie « raw » si la limite de l'API est atteinte.
  ref = ref || 'main';
  p = nsPath(p);
  try {
    const headers = { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'FIRE-LoL' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await http(apiOf(repo) + p + '?ref=' + ref, { headers });
    if (r.status === 404 && !token) return null;
    if (r.ok) return JSON.parse(await r.text());
    if (r.status === 404) return null;
  } catch (e) { /* on tente la copie raw */ }
  const r = await http('https://raw.githubusercontent.com/' + (repo || REPO) + '/' + ref + '/' + p + '?t=' + Date.now());
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
    const box = await readPublic('coach/acces.json', getConfig().team_id ? getConfig().data_repo : undefined);
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
        // Nouvelle semaine créée par un joueur : elle reprend les tierlists et l'objectif de la semaine d'avant (sinon les autres perdraient la leur).
        if (!w) { const prev = semaines.filter((x) => x.debut < action.debut).sort((a, b) => a.debut.localeCompare(b.debut)).pop();
          w = cleanWeek({ id: action.id, debut: action.debut, objectif: (prev && prev.objectif) || action.objectif || (cfg.objectif && cfg.objectif.games) || 20, note: prev ? prev.note : '', joueurs: prev ? prev.joueurs : {} }); semaines.push(w); }
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
//          { type: 'retrait', date, coach, heure, slug } (coach : supprime la demande d'un joueur qui a oublié de la retirer)
async function savePlanning(action) {
  const dr = getConfig().data_repo || null;
  const isCoach = coachState().coach;
  const c = readSecret('coach.bin') || {};
  const tok = dr ? await teamToken() : null;
  const coachPart = ['dispos', 'demande', 'decision', 'retrait'].includes(action.type);
  let repo, token, file, other;
  if (dr && tok) { repo = dr; token = tok; file = coachPart ? PLANNING_C_DATA : 'planning.json'; other = coachPart ? 'planning.json' : PLANNING_C_DATA; }
  else if (isCoach && c.github) { repo = REPO; token = c.github; file = coachPart ? PLANNING_C : PLANNING; other = coachPart ? PLANNING : PLANNING_C; }
  else return { ok: false, error: dr ? "le coach n'a pas encore activé les réponses des joueurs (jeton d'équipe)" : 'réservé au coach' };
  if (action.type === 'semaine' && !isCoach && !chefOn()) return { ok: false, error: "réservé au coach et au chef d'équipe" };
  if (['dispos', 'decision', 'retrait'].includes(action.type) && !isCoach) return { ok: false, error: 'réservé aux coachs (code coach)' };
  if (['dispos', 'demande', 'decision', 'retrait'].includes(action.type) && !coachSlugs().includes(action.coach)) return { ok: false, error: 'coach inconnu' };
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
      } else if (action.type === 'retrait') {
        // Le coach retire la demande d'un joueur (oubliée, plus d'actualité), même si le créneau n'est plus proposé.
        const slug = String(action.slug || '').slice(0, 80);
        const hr = parseInt(action.heure, 10);
        const slot = (((d.resas[action.date] || {})[action.coach]) || {})[hr];
        if (!slot || !slot[slug]) throw new Error("cette demande n'existe plus");
        delete slot[slug];
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
      const msg = { reponse: 'Planning : réponse', semaine: 'Planning : semaine', dispos: 'Planning coachs : dispos', demande: 'Planning coachs : demande', decision: 'Planning coachs : décision', retrait: 'Planning coachs : demande retirée par le coach' }[action.type];
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
    if (!voice && id === 'idees') return null; // la boîte à idées est toujours là
    const o = { id, name: str(x.name, 30) || id, ico: str(x.ico, 8) || (voice ? '🔊' : '💬'), desc: str(x.desc, 90) };
    if (voice) o.max = Math.max(0, Math.min(25, Math.round(Number(x.max) || 0)));
    // Type de salon : texte, forum, annonces (seul le staff écrit), boîte à idées ; vocal ou conférence.
    const types = voice ? ['vocal', 'conference'] : ['texte', 'forum', 'annonce', 'idees'];
    o.type = types.includes(x.type) ? x.type : types[0];
    // Salon privé : visible seulement par certains rôles ou membres (le staff voit tout).
    if (x.prive) {
      const a = x.acces || {};
      o.prive = true;
      o.acces = { roles: (Array.isArray(a.roles) ? a.roles : []).filter((r) => ['titulaires', 'remplacants', 'coachs'].includes(r)), membres: (Array.isArray(a.membres) ? a.membres : []).map((m) => String(m).slice(0, 80)).slice(0, 40) };
    }
    return o;
  };
  const uniq = (l) => { const seen = new Set(); return l.filter((x) => x && !seen.has(x.id) && seen.add(x.id)); };
  return {
    texte: uniq((Array.isArray(d && d.texte) ? d.texte : []).map((x) => one(x, false))).slice(0, 30),
    voix: uniq((Array.isArray(d && d.voix) ? d.voix : []).map((x) => one(x, true))).slice(0, 20),
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
// ---------- Forums et boîte à idées : un fichier par salon (posts, réponses, votes, statut des idées) ----------
const forumPath = (id) => 'forums/' + salonId(id) + '.json';
const IDEE_ST = ['nouvelle', 'etude', 'acceptee', 'faite', 'refusee'];
const fid = (x) => String(x || '').replace(/[^\w-]/g, '').slice(0, 40);
async function forumGet(id) {
  id = salonId(id);
  if (!id) return { ok: false, error: 'salon inconnu', posts: [] };
  try { const d = await teamRead(forumPath(id)); return { ok: true, posts: d && Array.isArray(d.posts) ? d.posts : [] }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e), posts: [] }; }
}
async function forumOp(id, op) {
  id = salonId(id); op = op || {};
  const by = str(op.by, 80), pid = fid(op.post);
  if (!id) return { ok: false, error: 'salon inconnu' };
  if (!by) return { ok: false, error: 'choisis d’abord qui tu es' };
  const staff = isStaffHere();
  try {
    const d = await teamWrite(forumPath(id), (cur) => {
      const posts = cur && Array.isArray(cur.posts) ? cur.posts : [];
      const p = posts.find((x) => x.id === pid);
      if (op.type === 'post') {
        const title = str(op.title, 100), text = str(op.text, 2000);
        if (!title) throw new Error('donne un titre');
        if (!pid) throw new Error('post sans identifiant');
        if (!p) posts.unshift({ id: pid, title, text, by, at: Date.now(), last: Date.now(), statut: 'nouvelle', votes: [by], replies: [] });
      } else if (!p) throw new Error('ce post n’existe plus');
      else if (op.type === 'reply') {
        const text = str(op.text, 2000), rid = fid(op.reply);
        if (!text || !rid) throw new Error('réponse vide');
        p.replies = Array.isArray(p.replies) ? p.replies : [];
        if (!p.replies.some((r) => r.id === rid)) p.replies.push({ id: rid, by, text, at: Date.now() });
        p.replies = p.replies.slice(-300); p.last = Date.now();
      } else if (op.type === 'vote') {
        p.votes = (Array.isArray(p.votes) ? p.votes : []).filter((x) => x !== by);
        if (op.on) p.votes.push(by);
      } else if (op.type === 'statut') {
        if (!staff) throw new Error('réservé au staff');
        if (IDEE_ST.includes(op.statut)) p.statut = op.statut;
        if (typeof op.reponse === 'string') p.reponse = str(op.reponse, 500);
        p.statutPar = by; p.last = Date.now();
      } else if (op.type === 'pin') {
        if (!staff) throw new Error('réservé au staff');
        p.pin = !!op.on;
      } else if (op.type === 'del') {
        if (op.reply) {
          const r = (p.replies || []).find((x) => x.id === fid(op.reply));
          if (!r) throw new Error('message introuvable');
          if (r.by !== by && !staff) throw new Error('tu ne peux supprimer que tes messages');
          p.replies = p.replies.filter((x) => x !== r);
        } else {
          if (p.by !== by && !staff) throw new Error('tu ne peux supprimer que tes posts');
          posts.splice(posts.indexOf(p), 1);
        }
      } else throw new Error('action inconnue');
      return { posts: posts.slice(0, 300), maj: Date.now() };
    }, 'Forum ' + id);
    return { ok: true, posts: d.posts };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// ---------- Clips partagés : la vidéo chiffrée en pièce jointe de la release « clips » du dépôt de données,
// la liste (titre, auteur, likes, commentaires, public ou privé) dans clips/partages.json, chiffrée comme le reste.
const CLIPS_FEED = 'clips/partages.json';
const clipThumbPath = (id) => 'clips/vignettes/' + fid(id) + '.json';
const CLIP_SHARE_MAX = 100 * 1024 * 1024;
function sealBuf(buf) {
  const key = teamKey(); if (!key) throw new Error("code d'équipe manquant");
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv); c.setAAD(Buffer.from('fire-clip'));
  const enc = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([Buffer.from('FC1'), iv, c.getAuthTag(), enc]);
}
function openBuf(buf) {
  const key = teamKey(); if (!key) throw new Error("code d'équipe manquant");
  if (buf.slice(0, 3).toString('latin1') !== 'FC1') throw new Error('clip illisible');
  const d = crypto.createDecipheriv('aes-256-gcm', key, buf.slice(3, 15)); d.setAAD(Buffer.from('fire-clip')); d.setAuthTag(buf.slice(15, 31));
  return Buffer.concat([d.update(buf.slice(31)), d.final()]);
}
async function clipRelease(tok, dr) {
  const base = 'https://api.github.com/repos/' + dr;
  let r = await http(base + '/releases/tags/clips', { headers: ghHeaders(tok) });
  if (r.ok) return r.json();
  if (r.status !== 404) throw new Error('GitHub a refusé la lecture des clips (' + r.status + ')');
  r = await http(base + '/releases', { method: 'POST', headers: { ...ghHeaders(tok), 'content-type': 'application/json' },
    body: JSON.stringify({ tag_name: 'clips', name: 'Clips de l’équipe (chiffrés)', body: 'Clips partagés dans FIRE LoL, chiffrés avec le code d’équipe.', prerelease: true }) });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 404 ? "le jeton d'équipe ne permet pas encore de publier des clips (il lui faut le droit « Contents : écriture »)" : 'GitHub a refusé la création de l’espace clips (' + r.status + ')');
  return r.json();
}
async function clipShare(o) {
  if (!teamKey()) return { ok: false, error: "entre à nouveau le code d'équipe" };
  const dr = getConfig().data_repo || null, tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "le coach n'a pas encore activé le jeton d'équipe" };
  const buf = Buffer.from(o.buf || []);
  if (!buf.length || buf.slice(4, 8).toString('latin1') !== 'ftyp') return { ok: false, error: 'clip invalide' };
  if (buf.length > CLIP_SHARE_MAX) return { ok: false, error: 'clip trop lourd pour être partagé (100 Mo au plus)' };
  const by = str(o.by, 80);
  if (!by) return { ok: false, error: 'choisis d’abord qui tu es' };
  const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  try {
    const rel = await clipRelease(tok, dr);
    const up = await http(`https://uploads.github.com/repos/${dr}/releases/${rel.id}/assets?name=${id}.bin`,
      { method: 'POST', headers: { ...ghHeaders(tok), 'content-type': 'application/octet-stream' }, body: sealBuf(buf) }, 600000);
    if (!up.ok) throw new Error('GitHub a refusé l’envoi du clip (' + up.status + ')');
    const asset = await up.json();
    const thumb = typeof o.thumb === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(o.thumb) && o.thumb.length < 90000 ? o.thumb : null;
    if (thumb) await teamWrite(clipThumbPath(id), () => ({ thumb }), 'Vignette de clip').catch(() => {});
    const vis = o.vis === 'prive' ? 'prive' : 'public';
    const entry = { id, by, at: Date.now(), title: str(o.title, 80) || 'Clip', champ: String(o.champ || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 30), mode: str(o.mode, 40), dur: Math.max(0, Math.min(600, Number(o.dur) || 0)),
      size: buf.length, asset: asset.id, file: asset.name, vis, to: vis === 'prive' ? (Array.isArray(o.to) ? o.to : []).map((x) => String(x).slice(0, 80)).slice(0, 30) : [], likes: [], comments: [] };
    const d = await teamWrite(CLIPS_FEED, (cur) => ({ clips: [entry].concat(cur && Array.isArray(cur.clips) ? cur.clips : []).slice(0, 300) }), 'Clip partagé');
    return { ok: true, clip: entry, clips: d.clips };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function clipFeed() {
  try { const d = await teamRead(CLIPS_FEED); return { ok: true, clips: d && Array.isArray(d.clips) ? d.clips : [] }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e), clips: [] }; }
}
async function clipThumb(id) { try { const d = await teamRead(clipThumbPath(id)); return (d && d.thumb) || null; } catch (e) { return null; } }
async function clipOp(op) {
  op = op || {};
  const by = str(op.by, 80), id = fid(op.id);
  if (!by || !id) return { ok: false, error: 'choisis d’abord qui tu es' };
  const staff = isStaffHere();
  let gone = null;
  try {
    const d = await teamWrite(CLIPS_FEED, (cur) => {
      const list = cur && Array.isArray(cur.clips) ? cur.clips : [];
      const c = list.find((x) => x.id === id);
      if (!c) throw new Error('ce clip n’existe plus');
      if (op.type === 'like') { c.likes = (c.likes || []).filter((x) => x !== by); if (op.on) c.likes.push(by); }
      else if (op.type === 'comment') { const text = str(op.text, 500); if (!text) throw new Error('commentaire vide'); c.comments = (c.comments || []).concat({ id: fid(op.cid) || crypto.randomBytes(4).toString('hex'), by, at: Date.now(), text }).slice(-200); }
      else if (op.type === 'uncomment') { const k = (c.comments || []).find((x) => x.id === fid(op.cid)); if (!k) throw new Error('commentaire introuvable'); if (k.by !== by && !staff) throw new Error('tu ne peux supprimer que tes commentaires'); c.comments = c.comments.filter((x) => x !== k); }
      else if (op.type === 'edit') { if (c.by !== by && !staff) throw new Error('seul l’auteur peut modifier ce clip'); if (op.title) c.title = str(op.title, 80); if (op.vis) { c.vis = op.vis === 'prive' ? 'prive' : 'public'; c.to = c.vis === 'prive' ? (Array.isArray(op.to) ? op.to : c.to || []).map((x) => String(x).slice(0, 80)).slice(0, 30) : []; } }
      else if (op.type === 'del') { if (c.by !== by && !staff) throw new Error('seul l’auteur ou le staff peut retirer ce clip'); gone = c; list.splice(list.indexOf(c), 1); }
      else throw new Error('action inconnue');
      return { clips: list };
    }, 'Clips partagés');
    if (gone && gone.asset) {
      const dr = getConfig().data_repo, tok = await teamToken();
      await http(`https://api.github.com/repos/${dr}/releases/assets/${Number(gone.asset)}`, { method: 'DELETE', headers: ghHeaders(tok) }).catch(() => {});
    }
    return { ok: true, clips: d.clips };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// Télécharge et déchiffre un clip partagé (gardé 14 jours dans le dossier de FIRE pour le revoir sans attendre).
async function clipFetch(id, file, asset) {
  id = fid(id); file = String(file || '').replace(/[^\w.-]/g, '').slice(0, 60);
  if (!id || !file) return { ok: false, error: 'clip inconnu' };
  const cdir = path.join(dir(), 'clips-equipe');
  const out = path.join(cdir, id + '.mp4');
  try {
    fs.mkdirSync(cdir, { recursive: true });
    for (const f of fs.readdirSync(cdir)) { const p = path.join(cdir, f); try { if (Date.now() - fs.statSync(p).mtimeMs > 14 * 86400000) fs.unlinkSync(p); } catch (e) { /* */ } }
    if (fs.existsSync(out)) return { ok: true, path: out };
    const dr = getConfig().data_repo;
    let r = await http(`https://github.com/${dr}/releases/download/clips/${file}`, {}, 300000);
    if (!r.ok && asset) { const tok = await teamToken(); r = await http(`https://api.github.com/repos/${dr}/releases/assets/${Number(asset)}`, { headers: { ...ghHeaders(tok), Accept: 'application/octet-stream' } }, 300000); }
    if (!r.ok) throw new Error('clip introuvable sur GitHub (' + r.status + ')');
    const mp4 = openBuf(Buffer.from(await r.arrayBuffer()));
    fs.writeFileSync(out, mp4);
    return { ok: true, path: out };
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
// ---------- Annonces du créateur : un message qui bloque tous les FIRE jusqu'à « Accepter et continuer » ----------
// Le fichier est dans le dépôt de données, chiffré deux fois : avec la clé de l'équipe (titulaires, coachs) et
// avec celle des remplaçants. Il est signé par la clé du créateur (gardée sur SON PC) : personne d'autre ne peut
// en publier une, même avec le code d'équipe. Chacun dit qu'il l'a lue dans son petit fichier (pas de conflit).
const ANN = 'annonces/annonce.json';
const annLuPath = (slug) => 'annonces/lu/' + crypto.createHash('sha256').update(String(slug)).digest('hex').slice(0, 24) + '.json';
// Annonce privée : « to » liste les destinataires ; il est signé avec le reste (absent = toute l'équipe, comme avant).
const annTo = (to) => [...new Set((Array.isArray(to) ? to : []).map((x) => String(x || '').slice(0, 80)).filter(Boolean))].slice(0, 30);
const annCanon = (a) => 'FIRE-annonce:' + JSON.stringify([String(a.id), Number(a.at), String(a.by || ''), String(a.texte || ''), Number(a.min) || 5].concat(annTo(a.to).length ? [annTo(a.to)] : []));
function annVerify(a) {
  if (!a || !a.sig) return false;
  for (const k of (getConfig().admins || [])) {
    try {
      if (k && k.pub && crypto.verify('sha256', Buffer.from(annCanon(a)), crypto.createPublicKey({ key: Buffer.from(String(k.pub), 'base64'), format: 'der', type: 'spki' }), Buffer.from(String(a.sig), 'base64'))) return true;
    } catch (e) { /* clé suivante */ }
  }
  return false;
}
const annClean = (a) => { const o = { id: String(a.id), at: Number(a.at), by: String(a.by || ''), texte: String(a.texte || ''), min: Number(a.min) || 5 }; const to = annTo(a.to); if (to.length) o.to = to; if (a.sig) o.sig = String(a.sig); return o; };
const annPub = (a) => { const o = annClean(a); delete o.sig; return o; };
// Lit l'annonce (fichier reçu de PC à PC, sinon le dépôt) ; null si elle n'est pas signée par le créateur.
// « moi » : les annonces privées ne sont rendues qu'à leurs destinataires (le créateur et le staff les voient toutes).
async function annonceGet(f, moi) {
  try {
    if (!f) {
      const dr = getConfig().data_repo || null;
      if (!dr) return { ok: true, annonce: null };
      const tok = teamKey() ? await teamToken().catch(() => null) : null;
      try { f = await readPublic(ANN, dr, tok); if (f) saveCache('annonce', f); } catch (e) { f = loadCache('annonce'); }
    }
    if (!f || typeof f !== 'object') return { ok: true, annonce: null };
    let cur = null, hist = [], priv = [];
    if (teamKey() && f.team) {
      try { const d = open(f.team); cur = d && d.cur; hist = (d && Array.isArray(d.hist) ? d.hist : []).map(annPub); priv = d && Array.isArray(d.priv) ? d.priv : []; } catch (e) { cur = null; }
    } else if (f.remp) { cur = rempOpen(f.remp); priv = (Array.isArray(f.rempPriv) ? f.rempPriv : []).map(rempOpen).filter(Boolean); }
    const all = adminOn() || isStaffHere();
    const me = String(moi || '');
    priv = priv.filter((a) => a && annTo(a.to).length && annVerify(a) && (all || (me && annTo(a.to).includes(me)))).map(annPub);
    const ok = cur && !annTo(cur.to).length && annVerify(cur);
    return { ok: true, annonce: ok ? annPub(cur) : null, priv, hist: all ? hist : [], file: f };
  } catch (e) { return { ok: false, error: String((e && e.message) || e), annonce: null }; }
}
// to : destinataires d'une annonce privée (vide = toute l'équipe). retirer : true (l'annonce d'équipe) ou l'id à retirer.
// subs : destinataires remplaçants (ils ne lisent que la partie « remp » du fichier).
async function annoncePost(texte, who, retirer, to, subs, also) {
  to = annTo(to); subs = annTo(subs).filter((x) => to.includes(x));
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  const k = adminKey();
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "le coach n'a pas encore activé le jeton d'équipe" };
  let a = null;
  if (!retirer) {
    texte = str(texte, 2000);
    if (!texte) return { ok: false, error: 'le message est vide' };
    a = { id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), at: Date.now(), by: String(who || '').slice(0, 80), texte, min: 5 };
    if (to.length) a.to = to;
    a.sig = crypto.sign('sha256', Buffer.from(annCanon(a)), crypto.createPrivateKey(k.priv)).toString('base64');
  }
  try {
    for (let i = 0; i < 4; i++) {
      const cur = await ghGet(tok, ANN, dr);
      let old = null;
      try { old = cur && cur.json && cur.json.team ? open(cur.json.team) : null; } catch (e) { old = null; }
      const hist = (old && Array.isArray(old.hist) ? old.hist : []);
      if (a) hist.unshift(annClean(a));
      // Les annonces privées des 14 derniers jours restent à côté de celle d'équipe, sans la remplacer.
      let pub = old && old.cur && !annTo(old.cur.to).length ? old.cur : null;
      let priv = (old && Array.isArray(old.priv) ? old.priv : []).filter((x) => x && Date.now() - Number(x.at) < 14 * 86400000);
      let rp = Array.isArray(cur && cur.json && cur.json.rempPriv) ? cur.json.rempPriv : [];
      if (a && to.length) { priv.unshift(annClean(a)); if (subs.length) rp = [rempSeal(a)].concat(rp); }
      else if (a) pub = a;
      else if (retirer === true || (pub && retirer === pub.id)) pub = null;
      else { const n = priv.length; priv = priv.filter((x) => x.id !== retirer); if (priv.length === n) return { ok: false, error: 'annonce introuvable' }; rp = rp.filter((b) => { const x = rempOpen(b); return x && x.id !== retirer; }); }
      priv = priv.slice(0, 30); rp = rp.filter(Boolean).slice(0, 15);
      const pubRemp = pub ? (pub === a ? rempSeal(a) : ((cur && cur.json && cur.json.remp) || rempSeal(pub))) : null;
      const file = { v: 1, id: a ? a.id : null, at: Date.now(), team: seal({ cur: pub, hist: hist.slice(0, 30), priv }, ANN), remp: pubRemp, rempPriv: rp };
      const r = await ghPut(tok, ANN, file, cur && cur.sha, a ? (to.length ? 'Annonce privée' : 'Annonce') : 'Annonce retirée', dr);
      if (r.ok) {
        saveCache('annonce', file);
        // Annonce d'équipe aussi envoyée aux autres équipes cochées (Bravo…), chiffrée avec leur clé.
        const others = (Array.isArray(also) ? also : []).map(String);
        if (a && !to.length && others.length) await otherTeamsWrite(tok, dr, ANN, (key, curJ) => {
          let o = null; try { o = curJ && curJ.team ? openWith(key, curJ.team) : null; } catch (e) { o = null; }
          const hh = (o && Array.isArray(o.hist) ? o.hist : []); hh.unshift(annClean(a));
          return { v: 1, id: a.id, at: Date.now(), team: sealWith(key, { cur: a, hist: hh.slice(0, 30), priv: (o && o.priv) || [] }, ANN), remp: null, rempPriv: [] };
        }, 'Annonce', others);
        return { ok: true, annonce: pub ? annPub(pub) : null, priv: priv.map(annPub), sent: a ? annPub(a) : null, hist: hist.slice(0, 30).map(annPub), file };
      }
    }
    throw new Error("l'annonce a changé pendant l'envoi, réessaie");
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// ---------- Personnalisation de FIRE par le créateur (menu Admin) ----------
// Rubriques masquées ou renommées, textes, messages de l'accueil, couleurs, nom de l'app, CSS : un seul fichier
// dans le dépôt de données, chiffré pour l'équipe et signé par la clé du créateur. Sans signature valide, ignoré.
const APPCFG = 'admin/app.json';
const sid = (x) => String(x || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 24);
function appCfgClean(c) {
  c = c && typeof c === 'object' ? c : {};
  const map = (o, n) => { const out = {}; for (const k of Object.keys(o && typeof o === 'object' ? o : {}).map(sid).filter(Boolean).sort().slice(0, 80)) { const v = str(o[k], n); if (v) out[k] = v; } return out; };
  const accent = /^#[0-9a-f]{6}$/i.test(String(c.accent || '')) ? String(c.accent).toLowerCase() : '';
  return {
    hide: [...new Set((Array.isArray(c.hide) ? c.hide : []).map(sid).filter(Boolean))].sort().slice(0, 60),
    rename: map(c.rename, 40),
    hero: map(c.hero, 400),
    fun: (Array.isArray(c.fun) ? c.fun : []).map((x) => str(x, 160)).filter(Boolean).slice(0, 80),
    accent,
    theme: sid(c.theme),
    brand: str(c.brand, 30),
    css: String(c.css || '').slice(0, 20000),
    font: sid(c.font),
    // Interrupteurs : anti capture (pour tous, ou autorisé pour certains membres), compagnons, fonds animés.
    capture: c.capture === 'off' ? 'off' : '',
    captureOk: [...new Set((Array.isArray(c.captureOk) ? c.captureOk : []).map((x) => str(x, 80)).filter(Boolean))].slice(0, 60),
    shopBasic: [...new Set((Array.isArray(c.shopBasic) ? c.shopBasic : []).map((x) => String(x || '').slice(0, 80)).filter((x) => /^(fx|font|grad|deco|plate|card):/.test(x)))].slice(0, 120),
    petsOff: !!c.petsOff,
    // Articles ajoutés dans la Boutique : compagnon (image) ou cadre d'avatar (image autour de l'avatar).
    shop: (Array.isArray(c.shop) ? c.shop : []).slice(0, 120).map((x) => {
      const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '');
      const kind = ['pet', 'deco', 'pfx', 'plate', 'card', 'banner', 'bubble', 'appbg', 'grad'].includes(x && x.kind) ? x.kind : 'pet';
      return { id: 's_' + sid(String(x && x.id || '').replace(/^s_/, '')).slice(0, 20), kind, name: str(x && x.name, 40) || 'Article', sha: /^[0-9a-f]{64}$/.test(String(x && x.sha)) ? x.sha : '', c1: hex(x && x.c1), c2: hex(x && x.c2) };
    }).filter((x) => x.id.length > 2 && (x.kind === 'grad' ? x.c1 && x.c2 : x.sha) && (x.kind !== 'card' || x.c1)),
    bans: (Array.isArray(c.bans) ? c.bans : []).slice(0, 100).map((b) => ({ slug: str(b && b.slug, 80), why: str(b && b.why, 200), at: Number(b && b.at) || 0 })).filter((b) => b.slug),
    fxOff: !!c.fxOff,
    // Catégories du menu : [[titre, [rubriques]]]
    groups: (Array.isArray(c.groups) ? c.groups : []).slice(0, 20).map((g) => [str(Array.isArray(g) ? g[0] : '', 40), (Array.isArray(g) && Array.isArray(g[1]) ? g[1] : []).map(sid).filter(Boolean).slice(0, 60)]),
    // Pages créées par le créateur : des blocs de contenu (titre, texte, liste, lien, image, vidéo, citation).
    pages: (Array.isArray(c.pages) ? c.pages : []).slice(0, 40).map((p) => ({
      id: 'p_' + sid(String(p && p.id || '').replace(/^p_/, '')).slice(0, 20),
      title: str(p && p.title, 60) || 'Page',
      ico: str(p && p.ico, 8),
      sub: str(p && p.sub, 300),
      blocks: (p && Array.isArray(p.blocks) ? p.blocks : []).slice(0, 80).map((b) => ({ t: ['h', 'p', 'list', 'link', 'img', 'yt', 'quote', 'sep'].includes(b && b.t) ? b.t : 'p', v: str(b && b.v, 4000), u: str(b && b.u, 2000) })),
    })).filter((p) => p.id.length > 2),
  };
}
const appCfgCanon = (a) => 'FIRE-appcfg:' + JSON.stringify([Number(a.at), String(a.by || ''), appCfgClean(a.cfg)]);
function appCfgVerify(a) {
  if (!a || !a.sig) return false;
  for (const k of (getConfig().admins || [])) {
    try { if (k && k.pub && crypto.verify('sha256', Buffer.from(appCfgCanon(a)), crypto.createPublicKey({ key: Buffer.from(String(k.pub), 'base64'), format: 'der', type: 'spki' }), Buffer.from(String(a.sig), 'base64'))) return true; } catch (e) { /* clé suivante */ }
  }
  return false;
}
async function appCfgGet() {
  try {
    const dr = getConfig().data_repo || null;
    if (!dr) return { ok: true, cfg: null };
    const tok = teamKey() ? await teamToken().catch(() => null) : null;
    let f = null;
    try { f = await readPublic(APPCFG, dr, tok); if (f) saveCache('appcfg', f); } catch (e) { f = loadCache('appcfg'); }
    if (!f || typeof f !== 'object') return { ok: true, cfg: null };
    let cur = null;
    if (teamKey() && f.team) { try { cur = open(f.team); } catch (e) { cur = null; } } else if (f.remp) cur = rempOpen(f.remp);
    if (!cur || !appCfgVerify(cur)) return { ok: true, cfg: null };
    return { ok: true, cfg: appCfgClean(cur.cfg), at: Number(cur.at), by: String(cur.by || '') };
  } catch (e) { return { ok: false, error: String((e && e.message) || e), cfg: null }; }
}
// Images des articles ajoutés par le créateur dans la Boutique : un fichier chiffré par image. L'empreinte est
// dans la personnalisation signée : une image modifiée par quelqu'un d'autre est refusée.
const assetPath = (id) => 'admin/assets/' + sid(id) + '.json';
async function appAssetPut(id, data) {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  id = sid(id); data = String(data || '');
  if (!id || !/^data:image\/(png|gif|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data)) return { ok: false, error: 'image PNG, GIF, WebP ou JPEG attendue' };
  if (data.length > 2200000) return { ok: false, error: 'image trop lourde (1,5 Mo au maximum)' };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "le coach n'a pas encore activé le jeton d'équipe" };
  try {
    const p = assetPath(id);
    for (let i = 0; i < 3; i++) {
      const cur = await ghGet(tok, p, dr).catch(() => null);
      const r = await ghPut(tok, p, { v: 1, team: seal({ d: data }, p) }, cur && cur.sha, 'Image de la Boutique', dr);
      if (r.ok) { saveCache('asset_' + id, { d: data }); return { ok: true, id, sha: sha256(data) }; }
    }
    throw new Error("l'image n'a pas pu être envoyée, réessaie");
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function appAssetGet(id, sum) {
  id = sid(id); if (!id) return { ok: false };
  const c = loadCache('asset_' + id);
  if (c && c.d && (!sum || sha256(c.d) === sum)) return { ok: true, data: c.d };
  try {
    const dr = getConfig().data_repo || null;
    const tok = teamKey() ? await teamToken().catch(() => null) : null;
    if (!dr || !teamKey()) return { ok: false };
    const f = await readPublic(assetPath(id), dr, tok);
    const d = f && f.team ? open(f.team) : null;
    if (!d || !d.d || (sum && sha256(d.d) !== sum)) return { ok: false, error: 'image refusée' };
    saveCache('asset_' + id, { d: d.d });
    return { ok: true, data: d.d };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function appCfgPost(cfg, who) {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  const k = adminKey();
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "le coach n'a pas encore activé le jeton d'équipe" };
  const a = { at: Date.now(), by: String(who || '').slice(0, 80), cfg: appCfgClean(cfg) };
  a.sig = crypto.sign('sha256', Buffer.from(appCfgCanon(a)), crypto.createPrivateKey(k.priv)).toString('base64');
  try {
    for (let i = 0; i < 4; i++) {
      const cur = await ghGet(tok, APPCFG, dr);
      const file = { v: 1, at: a.at, team: seal(a, APPCFG), remp: rempSeal(a) };
      const r = await ghPut(tok, APPCFG, file, cur && cur.sha, 'Personnalisation de FIRE', dr);
      if (r.ok) { saveCache('appcfg', file); await otherTeamsWrite(tok, dr, APPCFG, (key) => ({ v: 1, at: a.at, team: sealWith(key, a, APPCFG), remp: null }), 'Personnalisation de FIRE'); return { ok: true, cfg: a.cfg, at: a.at }; }
    }
    throw new Error('la personnalisation a changé pendant l’envoi, réessaie');
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// « J'ai lu » : chacun écrit son fichier ; un titulaire l'écrit aussi pour un remplaçant (reçu de PC à PC).
async function annonceLu(id, slug, at) {
  id = String(id || '').replace(/[^\w-]/g, '').slice(0, 30); slug = String(slug || '').slice(0, 80);
  const when = Math.min(Date.now(), Number(at) || Date.now());
  if (!id || !slug) return { ok: false, error: 'annonce ou pseudo manquant' };
  if (!teamKey()) return { ok: false, error: 'remplaçant : passe par un titulaire' };
  try {
    await teamWrite(annLuPath(slug), (d) => {
      const lus = (d && d.lus && typeof d.lus === 'object') ? d.lus : {};
      if (!lus[id]) lus[id] = when;
      const keep = Object.entries(lus).sort((x, y) => y[1] - x[1]).slice(0, 60);
      return { slug, lus: Object.fromEntries(keep) };
    }, 'Annonce lue');
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function annonceLus(slugs) {
  if (!adminOn() && !isStaffHere()) return { ok: false, error: 'réservé au staff' };
  const list = (Array.isArray(slugs) ? slugs : []).map(String).slice(0, 60);
  const out = {};
  await Promise.all(list.map(async (sl) => { try { const d = await teamRead(annLuPath(sl)); if (d && d.lus) out[sl] = d.lus; } catch (e) { /* illisible */ } }));
  return { ok: true, lus: out };
}
// ---------- Récompenses : les chiffres de la semaine de chacun, pour le classement de l'équipe (pour le plaisir) ----------
const rwPath = (slug) => 'recompenses/' + crypto.createHash('sha256').update(String(slug)).digest('hex').slice(0, 24) + '.json';
async function rwPush(slug, c) {
  slug = String(slug || '').slice(0, 80);
  if (!slug || !teamKey()) return { ok: false };
  const n = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  const card = { slug, wk: String((c && c.wk) || '').replace(/[^\d-]/g, '').slice(0, 10), b: n(c && c.b, 100000), d: n(c && c.d, 500), streak: n(c && c.streak, 10000), lvl: n(c && c.lvl, 1000), at: Date.now() };
  try { await teamWrite(rwPath(slug), () => card, 'Récompenses'); return { ok: true }; } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function rwBoard(slugs) {
  if (!teamKey()) return { ok: false };
  const list = [];
  await Promise.all((Array.isArray(slugs) ? slugs : []).map(String).slice(0, 40).map(async (sl) => { try { const d = await teamRead(rwPath(sl)); if (d && d.slug === sl) list.push(d); } catch (e) { /* illisible */ } }));
  return { ok: true, list };
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
  const rapport = { id, at: Date.now(), qui: str(b.qui, 60) || 'anonyme', slug: str(b.slug, 80), version: str(b.version, 20), section: str(b.section, 40), texte, images };
  // Réponse du joueur à une réponse du staff : on garde ce à quoi il répond.
  if (b.re) { rapport.re = str(b.re, 30); rapport.reTexte = str(b.reTexte, 400); rapport.reBy = str(b.reBy, 80); }
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
    const r = await http(apiOf(where.repo) + nsPath(where.dir).replace(/\/$/, '') + '?ref=main', { headers: ghHeaders(where.token) });
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
    const r = await http(apiOf(where.repo) + nsPath(where.dir + id + '.json') + '?ref=main', { headers: ghHeaders(where.token) });
    if (!r.ok) return { ok: true };
    const j = await r.json();
    const d = await http(apiOf(where.repo) + nsPath(where.dir + id + '.json'), { method: 'DELETE', headers: { ...ghHeaders(where.token), 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Bug réglé ' + id, sha: j.sha, branch: 'main' }) });
    if (!d.ok) throw new Error('GitHub a refusé la suppression (' + d.status + ')');
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

// Réponses aux rapports de bug : le coach répond, la personne reçoit une notification dans son FIRE.
// Un petit fichier par membre (chiffré avec le code d'équipe), écrit par le coach, lu par la personne.
const bugRepPath = (slug) => 'bugs/reponses/' + crypto.createHash('sha256').update(String(slug)).digest('hex').slice(0, 24) + '.json';
async function bugReply(o) {
  if (!coachState().coach) return { ok: false, error: 'réservé au coach' };
  o = o || {};
  const slug = str(o.slug, 80), texte = str(o.texte, 2000);
  if (!slug) return { ok: false, error: 'on ne sait pas qui a envoyé ce rapport' };
  if (!texte) return { ok: false, error: 'écris une réponse' };
  const statut = o.statut === 'info' ? 'info' : 'regle';
  const rep = { id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), bug: str(o.bug, 30), at: Date.now(), by: str(o.by, 80), texte, statut, extrait: str(o.extrait, 300), version: str(o.version, 20) };
  try {
    await teamWrite(bugRepPath(slug), (d) => ({ slug, list: [rep].concat(d && Array.isArray(d.list) ? d.list : []).slice(0, 30) }), 'Réponse à un rapport de bug');
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  if (statut === 'regle' && rep.bug) { const c = await closeBug(rep.bug); if (!c.ok) return { ok: true, rep, warn: 'réponse envoyée, mais le rapport n’a pas pu être retiré : ' + c.error }; }
  return { ok: true, rep };
}
async function bugReplies(slug) {
  slug = String(slug || '').slice(0, 80);
  if (!slug) return { ok: true, list: [] };
  try { const d = await teamRead(bugRepPath(slug)); return { ok: true, list: d && Array.isArray(d.list) ? d.list : [] }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e), list: [] }; }
}

// ---------- Revue de parties partagée avec l'équipe (dépôt de données, chiffré avec le code d'équipe) ----------
const REVUES = 'revues/index.json';
const revId = (x) => (/^\d{10,16}$/.test(String(x)) ? String(x) : null);
function cleanNote(n) {
  if (!n || typeof n !== 'object') return null;
  const strokes = Array.isArray(n.draw) ? n.draw.slice(0, 30).map((st) => (Array.isArray(st.p) ? { c: String(st.c || '#ff6b3d').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7), p: st.p.slice(0, 400).map((q) => [Math.max(0, Math.min(1, Number(q[0]) || 0)), Math.max(0, Math.min(1, Number(q[1]) || 0))].map((v) => Math.round(v * 1000) / 1000)) } : null)).filter(Boolean) : [];
  return { id: String(n.id || '').replace(/[^\w-]/g, '').slice(0, 24) || crypto.randomBytes(4).toString('hex'), t: Math.max(0, Math.min(7200, Number(n.t) || 0)), by: String(n.by || '').slice(0, 80), text: String(n.text || '').slice(0, 600), at: Number(n.at) || Date.now(), draw: strokes, ...(Number(n.fight) >= 0 && n.fight != null ? { fight: Math.round(Number(n.fight)) } : {}) };
}
async function revues() {
  try { const d = await teamRead(REVUES); return { ok: true, list: (d && Array.isArray(d.list) ? d.list : []).slice(0, 200) }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e), list: [] }; }
}
async function revueGet(id) {
  id = revId(id); if (!id) return null;
  try { return await teamRead('revues/' + id + '.json'); } catch (e) { return null; }
}
async function revueShare(game, who, shots) {
  const id = revId(game && game.id); if (!id) return { ok: false, error: 'partie invalide' };
  const txt = JSON.stringify(game); if (txt.length > 900000) return { ok: false, error: 'partie trop longue à partager' };
  try {
    const g = JSON.parse(txt); delete g.vod; g.notes = (g.notes || []).map(cleanNote).filter(Boolean).slice(-300); g.par = String(who || '').slice(0, 80);
    // Images de la vidéo aux moments clés (pour l'analyse IA du coach) : fichier à part, la vidéo reste sur le PC du joueur.
    const sh = cleanShots(shots);
    if (sh.length) { await teamWrite('revues/' + id + '-img.json', () => ({ shots: sh }), 'Images de revue'); g.shots = sh.length; }
    await teamWrite('revues/' + id + '.json', (cur) => ({ ...g, ia: (cur && cur.ia) || g.ia || null, notes: mergeNotes((cur && cur.notes) || [], g.notes) }), 'Revue partagée');
    const meP = (g.players || []).find((p) => p.n === g.me) || {};
    const item = { id, par: g.par, at: Date.now(), start: g.start, mode: g.mode, queue: g.queue, me: g.me, champ: meP.c || '', duration: g.duration, result: g.result, shots: g.shots || 0 };
    await teamWrite(REVUES, (cur) => { const old = ((cur && cur.list) || []).find((x) => x.id === id); return { list: [{ ...item, ...(old && old.ia ? { ia: old.ia } : {}) }].concat(((cur && cur.list) || []).filter((x) => x.id !== id)).slice(0, 200) }; }, 'Liste des revues');
    activityPush(who, [{ t: Date.now(), k: 'app', d: 'Revue de partie partagée' }]).catch(() => {});
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
function cleanShots(a) {
  if (!Array.isArray(a)) return [];
  let total = 0;
  const out = [];
  for (const x of a.slice(0, 10)) {
    const img = typeof (x && x.img) === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x.img) ? x.img : '';
    if (!img || img.length > 120000 || total + img.length > 650000) continue;
    total += img.length;
    out.push({ t: Math.max(0, Math.min(7200, Math.round(Number(x.t) || 0))), why: String(x.why || '').slice(0, 120), img });
  }
  return out;
}
async function revueShots(id) {
  id = revId(id); if (!id) return [];
  try { const d = await teamRead('revues/' + id + '-img.json'); return cleanShots(d && d.shots); } catch (e) { return []; }
}
// Analyse IA d'une partie (coach uniquement : c'est sa clé Claude). Le contexte texte vient de la Revue,
// les images de la vidéo de la game. Le résultat est rangé avec la revue, visible par toute l'équipe.
const IA_SYS = `Tu es l'analyste vidéo d'une équipe amateur de League of Legends (niveau visé : progresser vite). On te donne le déroulé d'une partie (joueurs, kills, objectifs, combats, positions, tableau aux moments clés) et des images de la vidéo de la partie à ces moments.
Analyse comme un coach pro qui fait une revue VOD avec le joueur indiqué (« moi ») : décisions, placement, timing des objectifs, vision, combats, macro. Sois concret, cite les instants (en secondes de jeu), explique le POURQUOI et ce qu'il fallait faire à la place. Ne juge que ce que les données et les images montrent ; si une image est floue ou ne montre pas la scène, dis-le plutôt que d'inventer. Pas de classement entre joueurs, ton bienveillant mais franc. Écris en français. Vocabulaire : garde les mots de LoL que tous les joueurs utilisent (back, wave, lane, push, freeze, bounce, crash, drake, soul, Herald, scuttle, ward, pink, dive, gank, roam, fight, item, ult, cooldown), jamais leur traduction (rentrer, vague, voie, pousser, dragon, balise, plongée…).
Réponds UNIQUEMENT avec un objet JSON :
{"resume":"3 à 5 phrases sur la partie et ce qui l'a décidée",
 "points_forts":["…", "…"],
 "moments":[{"t":secondes,"type":"erreur|bien|decision","titre":"court","analyse":"ce qui se passe et pourquoi","conseil":"ce qu'il fallait faire"}],
 "combats":[{"t":secondes,"verdict":"gagné|perdu|égal","pourquoi":"…"}],
 "a_travailler":[{"titre":"…","exercice":"exercice concret à faire en game ou en training"}]}
Entre 5 et 10 moments, 2 à 4 axes à travailler.`;
function cleanIa(j) {
  const s = (x, n) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
  const t = (x) => Math.max(0, Math.min(7200, Math.round(Number(x) || 0)));
  return {
    resume: s(j.resume, 1500),
    points_forts: (Array.isArray(j.points_forts) ? j.points_forts : []).map((x) => s(x, 300)).filter(Boolean).slice(0, 6),
    moments: (Array.isArray(j.moments) ? j.moments : []).map((m) => ({ t: t(m && m.t), type: ['erreur', 'bien', 'decision'].includes(m && m.type) ? m.type : 'decision', titre: s(m && m.titre, 120), analyse: s(m && m.analyse, 900), conseil: s(m && m.conseil, 600) })).filter((m) => m.titre || m.analyse).sort((a, b) => a.t - b.t).slice(0, 14),
    combats: (Array.isArray(j.combats) ? j.combats : []).map((c) => ({ t: t(c && c.t), verdict: s(c && c.verdict, 12), pourquoi: s(c && c.pourquoi, 600) })).filter((c) => c.pourquoi).slice(0, 14),
    a_travailler: (Array.isArray(j.a_travailler) ? j.a_travailler : []).map((x) => ({ titre: s(x && x.titre, 120), exercice: s(x && x.exercice, 600) })).filter((x) => x.titre).slice(0, 5),
  };
}
async function revueIa(req, who) {
  const c = readSecret('coach.bin') || {};
  if (!coachState().coach) return { ok: false, error: 'réservé au coach' };
  if (!c.anthropic) return { ok: false, error: "ajoute d'abord la clé de l'API Claude dans les réglages coach" };
  const ctx = str(req && req.ctx, 60000);
  if (!ctx) return { ok: false, error: 'partie vide' };
  let shots = cleanShots(req.shots);
  if (!shots.length && req.src === 'team') shots = await revueShots(req.id);
  const content = [{ type: 'text', text: ctx }];
  for (const x of shots) {
    content.push({ type: 'text', text: `Image de la vidéo à ${Math.floor(x.t / 60)}:${String(x.t % 60).padStart(2, '0')} (${x.t} s)${x.why ? ' — ' + x.why : ''} :` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: x.img.split(',')[1] } });
  }
  if (!shots.length) content.push({ type: 'text', text: '(Pas d\'images de la vidéo pour cette partie : analyse à partir des données seulement.)' });
  try {
    const j = await claude(c.anthropic, { model: MODEL, max_tokens: 8000, system: IA_SYS, messages: [{ role: 'user', content }] });
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const ia = { ...cleanIa(pickJson(text)), at: Date.now(), par: String(who || '').slice(0, 80), images: shots.length };
    if (req.src === 'team' && revId(req.id)) {
      const id = revId(req.id);
      await teamWrite('revues/' + id + '.json', (cur) => { if (!cur) throw new Error('revue introuvable'); return { ...cur, ia }; }, 'Analyse IA de revue');
      // Marquée « analysée » dans la liste : les PC des coachs savent ce qui reste à faire.
      await teamWrite(REVUES, (cur) => ({ list: ((cur && cur.list) || []).map((x) => (x.id === id ? { ...x, ia: ia.at } : x)) }), 'Liste des revues').catch(() => {});
    }
    return { ok: true, ia };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// ---------- Scrims : séances d'entraînement contre d'autres équipes (chiffré avec le code d'équipe) ----------
const SCRIMS = 'scrims.json';
function cleanScrim(x) {
  if (!x || typeof x !== 'object') return null;
  const t = (v, n) => String(v || '').trim().slice(0, n);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) ? String(x.date) : new Date().toISOString().slice(0, 10);
  const games = (Array.isArray(x.games) ? x.games : []).slice(0, 12).map((g) => ({
    rid: /^\d{10,16}$/.test(String(g && g.rid)) ? String(g.rid) : null,
    res: g && (g.res === 'win' || g.res === 'lose') ? g.res : '',
    side: g && (g.side === 'bleu' || g.side === 'rouge') ? g.side : '',
    notes: t(g && g.notes, 600),
  }));
  return { id: String(x.id || '').replace(/[^\w-]/g, '').slice(0, 24) || crypto.randomBytes(5).toString('hex'), date, adv: t(x.adv, 60) || 'Adversaire', format: t(x.format, 20), games, notes: t(x.notes, 2000), by: t(x.by, 80), at: Number(x.at) || Date.now() };
}
async function scrims() {
  try { const d = await teamRead(SCRIMS); return { ok: true, list: (d && Array.isArray(d.list) ? d.list : []).map(cleanScrim).filter(Boolean) }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e), list: [] }; }
}
async function scrimSave(op, who) {
  if (coachState().remplacant) return { ok: false, error: 'réservé à l’équipe principale' };
  try {
    const d = await teamWrite(SCRIMS, (cur) => {
      let list = (cur && Array.isArray(cur.list) ? cur.list : []).map(cleanScrim).filter(Boolean);
      if (op && op.del) list = list.filter((x) => x.id !== String(op.del));
      else { const sc = cleanScrim({ ...(op && op.scrim), by: (op && op.scrim && op.scrim.by) || who, at: Date.now() }); if (!sc) throw new Error('scrim invalide'); list = [sc].concat(list.filter((x) => x.id !== sc.id)); }
      list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.at - a.at);
      return { list: list.slice(0, 400) };
    }, op && op.del ? 'Scrim supprimé' : 'Scrim enregistré');
    return { ok: true, list: d.list };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// ---------- Stats de l'équipe partagées (pour la version téléphone, qui ne peut pas lire dpm.lol) ----------
// Les PC de l'équipe publient un instantané compressé et chiffré sur la branche « stats » du dépôt de données.
// Un seul commit sans historique (remplacé à chaque fois) : le dépôt ne grossit pas.
const zlib = require('zlib');
function sealGz(obj, id) {
  const key = teamKey();
  if (!key) throw new Error("code d'équipe manquant");
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(id));
  const data = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'))), c.final()]);
  return { v: 2, gz: 1, id, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function openGz(box) {
  const key = teamKey();
  if (!key) throw new Error("code d'équipe manquant");
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAAD(Buffer.from(box.id));
  d.setAuthTag(Buffer.from(box.tag, 'base64'));
  const raw = Buffer.concat([d.update(Buffer.from(box.data, 'base64')), d.final()]);
  return JSON.parse((box.gz ? zlib.gunzipSync(raw) : raw).toString('utf8'));
}
const gitApi = (repo) => 'https://api.github.com/repos/' + repo + '/git/';
async function statsAge() {
  const dr = getConfig().data_repo; const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return null;
  const r = await http(gitApi(dr) + 'ref/heads/stats', { headers: ghHeaders(tok) }, 15000);
  if (r.status === 404) return Infinity;
  if (!r.ok) return null;
  const c = await http(gitApi(dr) + 'commits/' + (await r.json()).object.sha, { headers: ghHeaders(tok) }, 15000);
  if (!c.ok) return null;
  return Date.now() - new Date((await c.json()).committer.date).getTime();
}
async function statsPush(payload, who, minAgeMs) {
  if (!teamKey() || coachState().remplacant) return { ok: false, error: 'réservé à l’équipe principale' };
  const dr = getConfig().data_repo; const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: 'jeton d’équipe absent' };
  try {
    const age = await statsAge();
    if (age != null && age < (Number(minAgeMs) || 45 * 60000)) return { ok: true, skipped: true };
    const box = sealGz({ ...payload, at: Date.now(), by: String(who || '').slice(0, 80) }, 'stats');
    const H = { ...ghHeaders(tok), 'content-type': 'application/json' };
    const post = async (what, body) => { const r = await http(gitApi(dr) + what, { method: 'POST', headers: H, body: JSON.stringify(body) }, 60000); if (!r.ok) throw new Error('GitHub a refusé (' + what + ' ' + r.status + ')'); return r.json(); };
    const blob = await post('blobs', { content: Buffer.from(JSON.stringify(box), 'utf8').toString('base64'), encoding: 'base64' });
    const tree = await post('trees', { tree: [{ path: 'stats.json', mode: '100644', type: 'blob', sha: blob.sha }] });
    const commit = await post('commits', { message: 'Stats de l’équipe (instantané)', tree: tree.sha, parents: [] });
    const up = await http(gitApi(dr) + 'refs/heads/stats', { method: 'PATCH', headers: H, body: JSON.stringify({ sha: commit.sha, force: true }) }, 20000);
    if (!up.ok) await post('refs', { ref: 'refs/heads/stats', sha: commit.sha });
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function statsGet() {
  const dr = getConfig().data_repo; const tok = dr ? await teamToken() : null;
  if (!dr || !teamKey()) return { ok: false, error: "code d'équipe manquant" };
  try {
    const box = await readPublic('stats.json', dr, tok, 'stats');
    if (!box) return { ok: false, error: 'aucune stat partagée pour l’instant : un PC de l’équipe doit ouvrir FIRE' };
    return { ok: true, ...openGz(box) };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
// ---------- Puzzle du jour : nouvelles situations créées par l'IA (PC d'un coach), partagées avec l'équipe ----------
// Les joueurs qui ont (presque) tout fait envoient une demande ; le PC d'un coach crée un lot de situations inédites,
// de plus en plus difficiles jusqu'au niveau 5 (Pro), puis continue au niveau 5.
const PUZ_BANK = 'puzzles/banque.json', PUZ_REQ = 'puzzles/demandes.json';
const PUZ_TH = ['macro', 'obj', 'jungle', 'lane', 'vision', 'fight', 'wave', 'mental'];
const PUZ_ROLES = ['all', 'top', 'jungle', 'mid', 'adc', 'support'];
const PUZ_STYLES = ['agressif', 'prudent', 'macro', 'equipe', 'tempo', 'scaling'];
const PUZ_SPOTS = ['baseB', 'baseR', 'topB1', 'topR1', 'topMid', 'topB2', 'topR2', 'midB1', 'midR1', 'mid', 'midB2', 'midR2', 'botB1', 'botR1', 'botMid', 'botB2', 'botR2', 'drag', 'baron',
  'bBlue', 'bRed', 'bRapt', 'bKrug', 'bGromp', 'bWolf', 'rBlue', 'rRed', 'rRapt', 'rKrug', 'rGromp', 'rWolf', 'rivTop', 'rivBot', 'tribB', 'tribR', 'pixTop', 'pixBot', 'scuttleTop', 'scuttleBot', 'bushBotRiv', 'bushTopRiv'];
function cleanPuzzle(x, champs) {
  if (!x || typeof x !== 'object') return null;
  const s = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const pos = (v) => (typeof v === 'string' && PUZ_SPOTS.includes(v) ? v : Array.isArray(v) && v.length === 2 ? [Math.max(0, Math.min(1000, Math.round(Number(v[0]) || 0))), Math.max(0, Math.min(1000, Math.round(Number(v[1]) || 0)))] : null);
  const ch = (c) => { const id = String(c || '').replace(/[^A-Za-z]/g, ''); return !champs || champs.has(id) ? id : null; };
  const a = (Array.isArray(x.a) ? x.a : []).slice(0, 5).map((r) => ({ txt: s(r && r.txt, 220), v: ['P', 'O', 'X'].includes(r && r.v) ? r.v : '', s: PUZ_STYLES.includes(r && r.s) ? r.s : 'macro', e: s(r && r.e, 700) })).filter((r) => r.txt && r.v && r.e);
  if (a.length < 3 || !a.some((r) => r.v === 'P') || !a.some((r) => r.v === 'X')) return null;
  let map = null;
  if (x.map && typeof x.map === 'object') {
    const side = (l) => (Array.isArray(l) ? l : []).slice(0, 5).map((e) => (Array.isArray(e) ? [ch(e[0]), pos(e[1]), e[2] ? 1 : 0] : null)).filter((e) => e && e[0] && e[1]).map((e) => (e[2] ? e : e.slice(0, 2)));
    map = { b: side(x.map.b), r: side(x.map.r), w: (Array.isArray(x.map.w) ? x.map.w : []).slice(0, 8).map((e) => (Array.isArray(e) ? [pos(e[0]), e[1] === 'r' ? 'r' : 'b'] : null)).filter((e) => e && e[0]) };
    if (!map.b.length && !map.r.length) map = null;
  }
  const out = { id: 'g' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), gen: 1, th: PUZ_TH.includes(x.th) ? x.th : 'macro', role: PUZ_ROLES.includes(x.role) ? x.role : 'all',
    d: Math.max(1, Math.min(5, Math.round(Number(x.d) || 3))), t: s(x.t, 8), titre: s(x.titre, 80), sit: s(x.sit, 900), map, q: s(x.q, 160) || 'Que fais-tu ?', a };
  return out.titre && out.sit ? out : null;
}
async function puzzleBank() {
  try { const d = await teamRead(PUZ_BANK); return { ok: true, list: (d && Array.isArray(d.list) ? d.list : []).slice(-2000) }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e), list: [] }; }
}
async function puzzleRequest(slug, level, have) {
  if (coachState().remplacant) return { ok: false };
  try {
    await teamWrite(PUZ_REQ, (cur) => {
      const list = ((cur && cur.list) || []).filter((r) => Date.now() - (r.at || 0) < 7 * 864e5);
      if (list.some((r) => !r.done && r.slug === slug && r.level >= level)) return { list };
      return { list: list.concat({ slug: String(slug || '').slice(0, 80), level: Math.max(1, Math.min(5, Number(level) || 3)), have: Number(have) || 0, at: Date.now(), done: 0 }).slice(-100) };
    }, 'Demande de puzzles');
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
const PUZ_SYS = `Tu crées des puzzles de décision League of Legends (Faille de l'invocateur) pour une équipe amateur qui veut progresser vite. Chaque puzzle : une situation de partie réaliste et précise, une question, 4 réponses.
Règles :
- Situations INÉDITES : jamais une reformulation des titres déjà existants qu'on te donne.
- Plusieurs réponses peuvent être « ce qu'un pro ferait » (verdict P) selon le style et la lecture de la partie (agressif, prudent, macro, jeu d'équipe, tempo, scaling) ; au moins UNE réponse mauvaise (verdict X) obligatoire ; « O » = jouable mais pas optimal.
- Chaque réponse a une explication « lecture pro » (e) : pourquoi, et quand ce choix est bon ou mauvais. Concret, 2 à 4 phrases, en français, tutoiement.
- Vocabulaire : garde les mots de LoL que tous les joueurs utilisent (back, wave, lane, push, freeze, bounce, crash, drake, soul, Herald, scuttle, ward, pink, dive, gank, roam, fight, item, ult, cooldown), jamais leur traduction (rentrer, vague, voie, pousser, dragon, balise, plongée…).
- Pas de chiffres de patch précis (dégâts, temps de réapparition exacts) : raisonne en principes (prio, tempo, vision, état des vagues, timers, nombre).
- Ne cite aucun joueur professionnel réel.
- Niveau de difficulté d (1 à 5) : 1 facile, 2 moyen, 3 difficile, 4 expert (nuances fines, plusieurs infos à croiser), 5 pro (lecture de niveau compétitif : tempo croisé, états de vagues sur plusieurs lanes, lignes de vision, timers d'objectifs et de sorts, gestion du nombre). Respecte le niveau demandé.
- Varie les rôles (top, jungle, mid, adc, support, all) et les thèmes (macro, obj, jungle, lane, vision, fight, wave, mental).
- Carte (facultative mais conseillée) : positions par nom de lieu (liste fournie) ou [x, y] de 0 à 1000 (x vers la droite, y vers le bas ; base bleue en bas à gauche). Champions par identifiant Data Dragon (ex. LeeSin, MonkeyKing, KSante). 3e valeur 1 = dernière position connue (pas vue). Balises w : [lieu, "b" ou "r"].
Réponds UNIQUEMENT avec un objet JSON : {"puzzles":[{"th":"macro","role":"jungle","d":4,"t":"14:20","titre":"court","sit":"situation détaillée (qui, où, PV, sorts, vagues, objectifs, timers)","q":"Que fais-tu ?","map":{"b":[["LeeSin","bRapt"]],"r":[["Viego","rRed",1]],"w":[["pixBot","b"]]},"a":[{"txt":"réponse","v":"P","s":"tempo","e":"lecture pro"}, ...]}]}`;
async function puzzleGenerate(who) {
  const c = readSecret('coach.bin') || {};
  if (!coachState().coach || !c.anthropic) return { ok: false, error: 'réservé au PC d’un coach avec la clé Claude' };
  try {
    const req = await teamRead(PUZ_REQ);
    const pending = ((req && req.list) || []).filter((r) => !r.done && Date.now() - (r.at || 0) < 7 * 864e5);
    if (!pending.length) return { ok: true, none: true };
    const level = Math.max(...pending.map((r) => r.level || 3));
    const bank = (await teamRead(PUZ_BANK)) || { list: [] };
    const titles = (Array.isArray(bank.list) ? bank.list : []).map((p) => p.titre).concat((Array.isArray(req.titres) ? req.titres : [])).slice(-400);
    const champs = await champions().catch(() => null);
    const set = champs && champs.list && champs.list.length ? new Set(champs.list.map((x) => x.id)) : null;
    const ask = `Crée 8 nouveaux puzzles de niveau ${level} sur 5 (au moins 6 de niveau exactement ${level}).\nLieux possibles sur la carte : ${PUZ_SPOTS.join(', ')}.\nTitres déjà utilisés (à ne pas refaire, même reformulés) :\n${titles.map((t) => '- ' + t).join('\n') || '—'}`;
    const j = await claude(c.anthropic, { model: MODEL, max_tokens: 16000, system: PUZ_SYS, messages: [{ role: 'user', content: ask }] });
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const got = ((pickJson(text) || {}).puzzles || []).map((x) => cleanPuzzle(x, set)).filter(Boolean)
      .filter((p) => !titles.some((t) => String(t).toLowerCase() === p.titre.toLowerCase()));
    if (!got.length) return { ok: false, error: 'aucun puzzle valide dans la réponse de Claude' };
    await teamWrite(PUZ_BANK, (cur) => ({ list: ((cur && cur.list) || []).concat(got.map((p) => ({ ...p, par: String(who || '').slice(0, 80), at: Date.now() }))).slice(-2000) }), 'Nouveaux puzzles');
    await teamWrite(PUZ_REQ, (cur) => ({ ...(cur || {}), list: ((cur && cur.list) || []).map((r) => (!r.done && r.level <= level ? { ...r, done: Date.now() } : r)) }), 'Demandes de puzzles traitées');
    return { ok: true, added: got.length, level };
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


// ---------- FIRE Kiting / FIRE Listen : clés admin données par le créateur, et publications de l'équipe ----------
// Une clé = certificat (qui, quelles apps, clé publique) signé par la clé de créateur + la clé privée de la personne.
// Les créations faites dans le menu admin de Kiting/Listen sont signées avec cette clé, déposées dans
// %LOCALAPPDATA%\FIRE\envois, puis FIRE Team (ouvert et connecté à l'équipe) les vérifie et les envoie dans apps/<app>.json.
const APPS = ['kiting', 'listen'];
const APPS_KEYS = 'apps/keys.json';
const b64u = (b) => Buffer.from(b).toString('base64url');
function canonJ(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canonJ).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonJ(v[k])).join(',') + '}';
}
const p1363 = (key) => ({ key, dsaEncoding: 'ieee-p1363' });
function byAdmin(sigB64u, data) {
  for (const a of (getConfig().admins || [])) {
    try { if (crypto.verify('sha256', Buffer.from(data), p1363(crypto.createPublicKey({ key: Buffer.from(String(a.pub), 'base64'), format: 'der', type: 'spki' })), Buffer.from(String(sigB64u), 'base64url'))) return true; } catch (e) { /* clé suivante */ }
  }
  return false;
}
function appCert(by) {
  const [c, s] = String(by || '').split('.');
  if (!c || !s || !byAdmin(s, c)) return null;
  try { const cert = JSON.parse(Buffer.from(c, 'base64url').toString('utf8')); return cert && cert.v === 1 && Array.isArray(cert.apps) && cert.pub ? cert : null; } catch (e) { return null; }
}
function appKeysLocal() { const d = readSecret('appkeys.bin') || {}; return { issued: Array.isArray(d.issued) ? d.issued : [], revoked: Array.isArray(d.revoked) ? d.revoked : [] }; }
async function appKeysPublish(d) {
  const k = adminKey();
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) throw new Error("le coach n'a pas encore activé le jeton d'équipe");
  const payload = { v: 1, at: Date.now(), revoked: d.revoked.slice(), issued: d.issued.map((x) => ({ id: x.id, who: x.who, apps: x.apps, at: x.at })) };
  const file = { payload, sig: b64u(crypto.sign('sha256', Buffer.from(canonJ(payload)), p1363(crypto.createPrivateKey(k.priv)))) };
  for (let i = 0; i < 4; i++) {
    const cur = await ghGet(tok, APPS_KEYS, dr);
    const r = await ghPut(tok, APPS_KEYS, file, cur && cur.sha, 'Clés admin de FIRE Kiting / FIRE Listen', dr);
    if (r.ok) return;
  }
  throw new Error('la liste des clés a changé pendant l’envoi, réessaie');
}
function appKeysList() {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  const d = appKeysLocal();
  return { ok: true, keys: d.issued.map((x) => ({ ...x, revoked: d.revoked.includes(x.id) })).reverse() };
}
async function appKeyMake(who, apps) {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  who = String(who || '').trim().slice(0, 40);
  apps = APPS.filter((a) => (Array.isArray(apps) ? apps : []).includes(a));
  if (!who || !apps.length) return { ok: false, error: 'choisis une personne et au moins une app' };
  const k = adminKey();
  const h = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const cert = { v: 1, id: 'k_' + crypto.randomBytes(5).toString('hex'), who, apps, pub: h.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'), at: Date.now() };
  const c = b64u(JSON.stringify(cert));
  const s = b64u(crypto.sign('sha256', Buffer.from(c), p1363(crypto.createPrivateKey(k.priv))));
  const key = 'FIREKEY1.' + c + '.' + s + '.' + b64u(h.privateKey.export({ type: 'pkcs8', format: 'der' }));
  const d = appKeysLocal();
  d.issued.push({ id: cert.id, who, apps, at: cert.at, key });
  writeSecret('appkeys.bin', d);
  let warn = null;
  try { await appKeysPublish(d); } catch (e) { warn = String((e && e.message) || e); }
  return { ok: true, id: cert.id, key, warn };
}
async function appKeyRevoke(id, on = true) {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  const d = appKeysLocal();
  if (!d.issued.some((x) => x.id === id)) return { ok: false, error: 'clé inconnue' };
  d.revoked = d.revoked.filter((x) => x !== id);
  if (on) d.revoked.push(id);
  writeSecret('appkeys.bin', d);
  try { await appKeysPublish(d); return { ok: true }; } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

// Dossier d'envoi partagé avec FIRE Kiting / FIRE Listen (lu seulement sur PC, jamais sur téléphone).
const outboxDir = () => path.join(process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || process.env.HOME || '.', 'AppData', 'Local'), 'FIRE', 'envois');
// ---------- Autres équipes, vues du PC du créateur ----------
// Le créateur active une équipe avec son code : FIRE Team calcule sa clé, y range le jeton d'équipe (chiffré avec
// cette clé) et garde la clé sur ce PC pour lui envoyer la personnalisation et les annonces.
const teamKeys = () => readSecret('equipes.bin') || {};
async function otherTeamsWrite(tok, dr, rel, make, label, only) {
  if (getConfig().team_id || !adminOn()) return;
  for (const [id, hex] of Object.entries(teamKeys())) {
    if (only && !only.includes(id)) continue;
    if (!(getRaw().equipes || {})[id]) continue;
    const p = 'equipes/' + id + '/' + rel;
    try { for (let i = 0; i < 4; i++) { const cur = await ghGet(tok, p, dr); const r = await ghPut(tok, p, make(Buffer.from(hex, 'hex'), cur && cur.json), cur && cur.sha, label + ' (' + id + ')', dr); if (r.ok) break; } } catch (e) { /* équipe suivante */ }
  }
}
async function teamsInfo() {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  const dr = getConfig().data_repo || null;
  const keys = teamKeys();
  const out = [];
  for (const [id, t] of Object.entries(getRaw().equipes || {})) {
    let active = false;
    try { active = !!(dr && await readPublic('equipes/' + id + '/coach/acces.json', dr, null)); } catch (e) { /* hors ligne */ }
    out.push({ id, name: t.equipe || id, players: (t.joueurs || []).length, active, key: !!keys[id] });
  }
  return { ok: true, teams: out, current: getConfig().team_id || '' };
}
async function teamActivate(id, code) {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  if (getConfig().team_id) return { ok: false, error: 'fais-le depuis ton FIRE en équipe Alpha' };
  const t = (getRaw().equipes || {})[id];
  if (!t) return { ok: false, error: 'équipe inconnue' };
  if (!(await matches(code, t.code_scrypt))) return { ok: false, error: 'ce n’est pas le code de cette équipe' };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "FIRE Team n'est pas connecté à l'équipe" };
  const key = await scrypt(norm(code), t.fiches_salt);
  const p = 'equipes/' + id + '/coach/acces.json';
  try {
    for (let i = 0; i < 4; i++) { const cur = await ghGet(tok, p, dr); const r = await ghPut(tok, p, sealWith(key, { token: tok }, 'coach/acces.json'), cur && cur.sha, 'Équipe ' + (t.equipe || id) + ' : accès', dr); if (r.ok) break; }
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  writeSecret('equipes.bin', { ...teamKeys(), [id]: key.toString('hex') });
  return { ok: true };
}
// ---------- Page publique des équipes (catégorie Fan) ----------
// Un fichier en clair, signé par le créateur : composition (seulement les joueurs d'accord), rangs, 3 champions,
// actus, matchs, résultats et clips choisis. Rien d'autre ne sort de l'équipe.
const PUBLIC_FILE = 'public/equipes.json', PUB_OPTIN = 'public-optin.json';
const PUB_ROLES = ['top', 'jungle', 'mid', 'adc', 'support', 'coach', ''];
function publicClean(p) {
  p = p && typeof p === 'object' ? p : {};
  const s2 = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const url = (v) => { const u = s2(v, 300); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; };
  const id = (v) => s2(v, 24).replace(/[^\w-]/g, '') || crypto.randomBytes(4).toString('hex');
  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : 0; };
  return { teams: (Array.isArray(p.teams) ? p.teams : []).slice(0, 4).map((t) => ({
    id: s2(t && t.id, 20).replace(/[^\w-]/g, '') || 'alpha', name: s2(t && t.name, 30) || 'Équipe', tag: s2(t && t.tag, 8), desc: s2(t && t.desc, 300),
    twitch: s2(t && t.twitch, 30).replace(/[^\w]/g, '').toLowerCase(),
    players: (Array.isArray(t && t.players) ? t.players : []).slice(0, 12).map((x) => ({ name: s2(x && x.name, 24).split('#')[0] || 'Joueur', role: PUB_ROLES.includes(x && x.role) ? x.role : '',
      rank: s2(x && x.rank, 40), champs: (Array.isArray(x && x.champs) ? x.champs : []).map((c) => s2(c, 24)).filter((c) => /^[A-Za-z]+$/.test(c)).slice(0, 3) })),
    coachs: (Array.isArray(t && t.coachs) ? t.coachs : []).map((c) => s2(c, 24).split('#')[0]).filter(Boolean).slice(0, 6),
    news: (Array.isArray(t && t.news) ? t.news : []).slice(0, 20).map((n) => ({ id: id(n && n.id), t: s2(n && n.t, 80), txt: s2(n && n.txt, 500), at: num(n && n.at) })).filter((n) => n.t || n.txt),
    matches: (Array.isArray(t && t.matches) ? t.matches : []).slice(0, 30).map((m) => ({ id: id(m && m.id), at: num(m && m.at), vs: s2(m && m.vs, 40), event: s2(m && m.event, 60),
      res: ['V', 'D'].includes(m && m.res) ? m.res : '', score: s2(m && m.score, 10) })).filter((m) => m.vs && m.at),
    clips: (Array.isArray(t && t.clips) ? t.clips : []).slice(0, 12).map((c) => ({ id: id(c && c.id), title: s2(c && c.title, 80), url: url(c && c.url) })).filter((c) => c.url),
  })) };
}
let pubCache = null;
async function publicGet() {
  const dr = getConfig().data_repo || null;
  let f = null;
  try { f = dr ? await readPublic(PUBLIC_FILE, dr, null) : null; if (f) saveCache('public', f); } catch (e) { f = loadCache('public'); }
  if (!f) f = loadCache('public');
  if (!f || !f.payload || !f.sig || !byAdmin(f.sig, canonJ(f.payload))) return { ok: true, page: null };
  pubCache = { ...publicClean(f.payload), at: Number(f.payload.at) || 0 };
  return { ok: true, page: pubCache };
}
async function publicPost(page) {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, error: "FIRE Team n'est pas connecté à l'équipe" };
  const payload = { v: 1, at: Date.now(), ...publicClean(page) };
  const file = { payload, sig: b64u(crypto.sign('sha256', Buffer.from(canonJ(payload)), p1363(crypto.createPrivateKey(adminKey().priv)))) };
  for (let i = 0; i < 4; i++) {
    const cur = await ghGet(tok, PUBLIC_FILE, dr);
    const r = await ghPut(tok, PUBLIC_FILE, file, cur && cur.sha, 'Page publique des équipes', dr);
    if (r.ok) { saveCache('public', file); return { ok: true, page: { ...publicClean(payload), at: payload.at } }; }
  }
  return { ok: false, error: 'la page a changé pendant l’envoi, réessaie' };
}
// Chaque joueur choisit d'apparaître (pseudo, rang, 3 champions) ou non : fichier chiffré de l'équipe.
async function publicOptin(slug, on) {
  slug = String(slug || '').slice(0, 80);
  if (!slug) return { ok: false, error: 'choisis d’abord qui tu es' };
  try { const d = await teamWrite(PUB_OPTIN, (x) => ({ ...(x && typeof x === 'object' ? x : {}), [slug]: !!on }), 'Page publique : choix d’un joueur'); return { ok: true, optin: d }; }
  catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
async function publicOptins() {
  try { const d = await teamRead(PUB_OPTIN); return { ok: true, optin: d && typeof d === 'object' ? d : {} }; } catch (e) { return { ok: false, optin: {} }; }
}
// ---------- Formules : clés Premium Joueur ----------
// « FIREPLAN1.<certificat>.<signature du créateur> » : le certificat dit qui et quelle formule. Pas de clé privée dedans :
// la clé ne sert qu'à prouver que le créateur l'a donnée. Elle se retire comme les clés des apps (liste apps/keys.json).
const PLANS = ['joueur'];
async function planKeyMake(who, plan) {
  if (!adminOn()) return { ok: false, error: 'réservé au créateur' };
  who = String(who || '').trim().slice(0, 40);
  if (!who) return { ok: false, error: 'indique pour qui est la clé' };
  if (!PLANS.includes(plan)) return { ok: false, error: 'formule inconnue' };
  const k = adminKey();
  const cert = { v: 1, id: 'pl_' + crypto.randomBytes(5).toString('hex'), who, plan, at: Date.now() };
  const c = b64u(JSON.stringify(cert));
  const key = 'FIREPLAN1.' + c + '.' + b64u(crypto.sign('sha256', Buffer.from(c), p1363(crypto.createPrivateKey(k.priv))));
  const d = appKeysLocal();
  d.issued.push({ id: cert.id, who, apps: [], plan, at: cert.at, key });
  writeSecret('appkeys.bin', d);
  let warn = null;
  try { await appKeysPublish(d); } catch (e) { warn = String((e && e.message) || e); }
  return { ok: true, id: cert.id, key, warn };
}
function planParse(str) {
  const m = /^FIREPLAN1\.([\w-]+)\.([\w-]+)$/.exec(String(str || '').replace(/\s+/g, ''));
  if (!m || !byAdmin(m[2], m[1])) return null;
  try { const c = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')); return c && c.v === 1 && PLANS.includes(c.plan) && /^pl_[0-9a-f]{10}$/.test(c.id) ? c : null; } catch (e) { return null; }
}
let planRevCache = { at: 0, set: null };
async function planRevoked() {
  if (planRevCache.set && Date.now() - planRevCache.at < 600000) return planRevCache.set;
  const dr = getConfig().data_repo || null;
  try {
    const kf = dr ? await readPublic(APPS_KEYS, dr, null) : null;
    if (kf && kf.payload && byAdmin(kf.sig, canonJ(kf.payload))) { planRevCache = { at: Date.now(), set: new Set((kf.payload.revoked || []).map(String)) }; saveCache('plan-revoked', [...planRevCache.set]); }
  } catch (e) { /* hors ligne : dernière liste connue */ }
  if (!planRevCache.set) planRevCache.set = new Set(loadCache('plan-revoked') || []);
  return planRevCache.set;
}
async function planGet() {
  const s0 = readSecret('plan.bin');
  if (!s0 || !s0.key) return { ok: true, plan: null };
  const c = planParse(s0.key);
  if (!c) return { ok: true, plan: null, error: 'clé invalide' };
  if ((await planRevoked()).has(c.id)) return { ok: true, plan: null, revoked: true, who: c.who };
  return { ok: true, plan: c.plan, who: c.who, id: c.id };
}
async function planSet(key) {
  const c = planParse(key);
  if (!c) return { ok: false, error: 'ce n’est pas une clé FIRE valide (elle commence par FIREPLAN1.)' };
  if ((await planRevoked()).has(c.id)) return { ok: false, error: 'cette clé a été retirée par le créateur' };
  writeSecret('plan.bin', { key: String(key).replace(/\s+/g, '') });
  return planGet();
}
function planClear() { removeFile('plan.bin'); return { ok: true }; }
// ---------- Mode admin sur le PC du créateur ----------
// Sur ton PC (et seulement là où ta clé de créateur existe), FIRE crée une fois ta propre clé Kiting + Listen et la pose
// dans les deux apps : leur menu 🔧 Admin s'ouvre sans rien coller. Un repère dit au launcher de passer en mode admin.
const localDir = () => process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || process.env.HOME || '.', 'AppData', 'Local');
const APP_DIRS = { kiting: 'FIRE Kiting', listen: 'FIRE Listen' };
const creatorMark = () => path.join(localDir(), 'FIRE', 'createur.json');
function keyIdOf(str) {
  const m = /^FIREKEY1\.([\w-]+)\./.exec(String(str || '').trim());
  if (!m) return '';
  try { return String(JSON.parse(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).id || ''); } catch (e) { return ''; }
}
async function appSelfKey(force) {
  if (!adminOn()) { try { fs.unlinkSync(creatorMark()); } catch (e) { /* pas de repère */ } return { ok: false, error: 'réservé au créateur' }; }
  let d = appKeysLocal();
  let mine = d.issued.find((x) => x.self && x.key && !d.revoked.includes(x.id));
  if (!mine || force) {
    const r = await appKeyMake('Créateur (ce PC)', APPS);
    if (!r.ok) return r;
    d = appKeysLocal(); mine = d.issued.find((x) => x.id === r.id); mine.self = true; writeSecret('appkeys.bin', d);
  }
  const done = {};
  for (const a of APPS) {
    const f = path.join(localDir(), APP_DIRS[a], 'cle-admin.txt');
    let cur = ''; try { cur = fs.readFileSync(f, 'utf8').trim(); } catch (e) { /* aucune clé */ }
    const id = keyIdOf(cur);
    // Une clé valable déjà posée (la tienne ou une autre non révoquée) est gardée.
    if (!force && id && !d.revoked.includes(id) && d.issued.some((x) => x.id === id)) { done[a] = 'déjà là'; continue; }
    try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, mine.key, 'utf8'); done[a] = 'posée'; } catch (e) { done[a] = 'erreur : ' + e.message; }
  }
  try { fs.mkdirSync(path.dirname(creatorMark()), { recursive: true }); fs.writeFileSync(creatorMark(), JSON.stringify({ v: 1, on: true, at: Date.now(), key: mine.id, apps: APPS })); } catch (e) { /* */ }
  return { ok: true, key: mine.id, apps: done };
}
// ---------- Launcher de l'équipe (mode admin du créateur) ----------
// Le launcher du créateur dépose sa configuration dans le dossier d'envois ; FIRE Team la nettoie, la signe avec la
// clé du créateur et la publie (launcher/config.json + images). Chaque launcher vérifie la signature avant d'afficher.
const LAUNCHER_CFG = 'launcher/config.json';
async function launcherRelay() {
  const OUTBOX = outboxDir();
  let files = [];
  try { files = fs.readdirSync(OUTBOX).filter((f) => /^launcher-[\w-]+\.json$/.test(f) && !f.endsWith('.resultat.json')); } catch (e) { return { ok: true, n: 0 }; }
  if (!files.length) return { ok: true, n: 0 };
  const done = (f, res) => { try { fs.writeFileSync(path.join(OUTBOX, f.replace(/\.json$/, '') + '.resultat.json'), JSON.stringify({ ...res, at: Date.now() })); fs.rmSync(path.join(OUTBOX, f), { force: true }); } catch (e) { /* */ } };
  if (!adminOn()) { for (const f of files) done(f, { ok: false, error: 'seul le créateur peut publier le launcher' }); return { ok: false, n: 0 }; }
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, n: files.length, error: 'FIRE Team n’est pas connecté à l’équipe' };
  const { launcherClean, launcherImages } = require('./launcher-clean');
  // Seul le plus récent compte : les envois plus anciens sont remplacés.
  files.sort();
  for (const f of files.slice(0, -1)) done(f, { ok: true, replaced: true });
  const f = files[files.length - 1];
  try {
    const box = JSON.parse(fs.readFileSync(path.join(OUTBOX, f), 'utf8'));
    const cfg = launcherClean(box && box.cfg);
    for (const name of launcherImages(cfg)) {
      const p = 'launcher/img/' + name;
      const exists = (await http(apiOf(dr) + p + '?ref=main', { method: 'HEAD', headers: ghHeaders(tok) }).catch(() => ({ status: 0 }))).status === 200;
      if (exists) continue;
      const buf = fs.readFileSync(path.join(OUTBOX, 'launcher-assets', name));
      if (buf.length > 3 * 1048576) throw new Error('image trop lourde (3 Mo au maximum)');
      if (crypto.createHash('sha256').update(buf).digest('hex') !== name.split('.')[0]) throw new Error('image abîmée');
      await ghPutRaw(tok, p, buf, null, 'FIRE Launcher : image ajoutée', dr);
    }
    const k = adminKey();
    const payload = { v: 1, at: Date.now(), cfg };
    const file = { payload, sig: b64u(crypto.sign('sha256', Buffer.from(canonJ(payload)), p1363(crypto.createPrivateKey(k.priv)))) };
    let ok = false;
    for (let i = 0; i < 4 && !ok; i++) { const cur = await ghGet(tok, LAUNCHER_CFG, dr); const r = await ghPut(tok, LAUNCHER_CFG, file, cur && cur.sha, 'FIRE Launcher : personnalisation', dr); ok = !!r.ok; }
    if (!ok) throw new Error('la configuration a changé pendant l’envoi, réessaie');
    done(f, { ok: true });
    return { ok: true, n: 1 };
  } catch (e) { done(f, { ok: false, error: String((e && e.message) || e) }); return { ok: false, n: 1 }; }
}
async function ghPutRaw(token, p, buf, sha, message, repo) {
  p = nsPath(p);
  const body = { message, content: Buffer.from(buf).toString('base64'), branch: 'main' };
  if (sha) body.sha = sha;
  const r = await http(apiOf(repo) + p, { method: 'PUT', headers: { ...ghHeaders(token), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) return { conflict: true };
  if (!r.ok) throw new Error(`GitHub a refusé l'envoi (${r.status})`);
  return { ok: true };
}
async function relayOne(box, revoked, dr, tok) {
  const app = box && box.app, it = box && box.item;
  if (!APPS.includes(app) || !it || it.app !== app) throw new Error('publication invalide');
  if (!/^(level|champ|spell|sound)$/.test(String(it.kind)) || !/^[\w-]{3,40}$/.test(String(it.id))) throw new Error('élément inconnu');
  const cert = appCert(it.by);
  if (!cert) throw new Error('clé admin non reconnue');
  if (!cert.apps.includes(app)) throw new Error('clé non valable pour cette app');
  if (revoked.has(cert.id)) throw new Error('clé retirée par le créateur');
  const msg = canonJ({ app, kind: it.kind, id: it.id, at: it.at, del: !!it.del, data: it.del ? null : it.data });
  const pub = crypto.createPublicKey({ key: Buffer.from(cert.pub, 'base64'), format: 'der', type: 'spki' });
  if (!crypto.verify('sha256', Buffer.from(msg), p1363(pub), Buffer.from(String(it.sig), 'base64url'))) throw new Error('signature invalide');
  if (!Number.isFinite(it.at) || Math.abs(Date.now() - it.at) > 7 * 864e5) throw new Error('publication trop ancienne : republie-la');
  if (JSON.stringify(it.data || null).length > 60000) throw new Error('élément trop lourd');
  const clean = { app, kind: it.kind, id: it.id, at: it.at, del: !!it.del, data: it.del ? null : it.data, by: it.by, sig: it.sig };
  // Un son de FIRE Listen : le fichier audio part à côté, son empreinte est signée dans l'élément.
  if (app === 'listen' && it.kind === 'sound' && !it.del) {
    const d = it.data || {};
    const buf = Buffer.from(String(it.blob || ''), 'base64');
    if (!/^[0-9a-f]{64}$/.test(String(d.sha)) || !/^(mp3|ogg|wav|m4a|webm)$/.test(String(d.ext))) throw new Error('son invalide');
    const p = `apps/listen/sons/${d.sha}.${d.ext}`;
    const exists = (await http(apiOf(dr) + p + '?ref=main', { method: 'HEAD', headers: ghHeaders(tok) }).catch(() => ({ status: 0 }))).status === 200;
    if (!exists) {
      if (!buf.length || buf.length > 2.5e6) throw new Error('son manquant ou trop lourd (2,5 Mo au maximum)');
      if (crypto.createHash('sha256').update(buf).digest('hex') !== d.sha) throw new Error('son abîmé pendant l’envoi');
      await ghPutRaw(tok, p, buf, null, 'FIRE Listen : son ajouté', dr);
    }
  }
  for (let i = 0; i < 4; i++) {
    const cur = await ghGet(tok, `apps/${app}.json`, dr);
    const doc = (cur && cur.json && Array.isArray(cur.json.items)) ? cur.json : { v: 1, items: [] };
    if (doc.items.some((x) => x.kind === clean.kind && x.id === clean.id && x.at >= clean.at)) return { ok: true, note: 'déjà à jour' };
    doc.items = doc.items.filter((x) => !(x.kind === clean.kind && x.id === clean.id)).concat([clean]).slice(-600);
    doc.v = 1; doc.at = Date.now();
    const r = await ghPut(tok, `apps/${app}.json`, doc, cur && cur.sha, `FIRE ${app === 'kiting' ? 'Kiting' : 'Listen'} : ${clean.del ? 'retrait' : 'publication'} (${clean.kind})`, dr);
    if (r.ok) return { ok: true };
  }
  throw new Error('les publications ont changé pendant l’envoi, réessaie');
}
let relayBusy = false;
async function appsRelay() {
  let files = [];
  const OUTBOX = outboxDir();
  try { files = fs.readdirSync(OUTBOX).filter((f) => /^(kiting|listen)-[\w-]+\.json$/.test(f) && !f.endsWith('.resultat.json')); } catch (e) { return { ok: true, n: 0 }; }
  // Nettoyage des vieux résultats (plus d'une journée).
  try { for (const f of fs.readdirSync(OUTBOX)) if (f.endsWith('.resultat.json') && Date.now() - fs.statSync(path.join(OUTBOX, f)).mtimeMs > 864e5) fs.rmSync(path.join(OUTBOX, f), { force: true }); } catch (e) { /* */ }
  if (!files.length || relayBusy) return { ok: true, n: 0 };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  if (!dr || !tok) return { ok: false, n: files.length, error: 'FIRE Team n’est pas connecté à l’équipe' };
  relayBusy = true;
  let n = 0;
  try {
    let revoked = new Set();
    try {
      const kf = await readPublic(APPS_KEYS, dr, tok);
      if (kf && kf.payload && byAdmin(kf.sig, canonJ(kf.payload))) revoked = new Set((kf.payload.revoked || []).map(String));
    } catch (e) { /* pas encore de liste */ }
    for (const f of files) {
      const name = f.replace(/\.json$/, '');
      let res;
      try { res = await relayOne(JSON.parse(fs.readFileSync(path.join(OUTBOX, f), 'utf8')), revoked, dr, tok); n++; } catch (e) { res = { ok: false, error: String((e && e.message) || e) }; }
      try { fs.writeFileSync(path.join(OUTBOX, name + '.resultat.json'), JSON.stringify({ ...res, at: Date.now() })); fs.rmSync(path.join(OUTBOX, f), { force: true }); } catch (e) { /* */ }
    }
  } finally { relayBusy = false; }
  return { ok: true, n };
}
// Les envois du launcher passent avec ceux de Kiting et Listen.
const appsRelay0 = appsRelay;
appsRelay = async function () { const r = await appsRelay0(); try { await launcherRelay(); } catch (e) { /* */ } return r; };

module.exports = { rwPush, rwBoard, teamsInfo, teamActivate, activeTeam, publicGet, publicPost, publicOptin, publicOptins, planKeyMake, planGet, planSet, planClear, appSelfKey, appKeysList, appKeyMake, appKeyRevoke, appsRelay, _apps: { canonJ, appCert, relayOne, outboxDir }, appCfgGet, appCfgPost, appAssetPut, appAssetGet, clipShare, clipFeed, clipThumb, clipOp, clipFetch, _clipCrypto: { sealBuf, openBuf }, forumGet, forumOp, bugReply, bugReplies, annonceGet, annoncePost, annonceLu, annonceLus, puzzleBank, puzzleRequest, puzzleGenerate, statsPush, statsGet, revues, revueGet, revueShare, revueNote, revueShots, revueIa, scrims, scrimSave, rempSeal, rempOpen, chat, chatSend, chatDelete, membres, membreDemande, membreDecision, salons, salonsSave, adminSetup, roles, rolesSave, activityPush, activityAll, staffNotes, staffNoteSave, sendBug, listBugs, closeBug, pools, savePools, planning, savePlanning, champions, init, unlock, isUnlocked, coachState, coachUnlock, coachLeave, chefUnlock, chefLeave, coachSave, generate, publish, unpublish, list, message, _test: { pickJson, cleanFiche, cleanSvg, scrypt, norm } };
