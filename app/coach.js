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
  if (!team && !isCoach) return { ok: false, error: err ? String((err && err.message) || err) : null };
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

function isUnlocked() {
  const cfg = getConfig();
  if (!cfg.code_scrypt) return true;
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

function coachState() {
  const c = readSecret('coach.bin') || {};
  const cfg = getConfig();
  const on = !!(c.hash && cfg.coach_scrypt && c.hash === cfg.coach_scrypt.hash);
  return { coach: on, claude: on && !!c.anthropic, github: on && !!c.github };
}

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
  return { O: cleanIds(Array.isArray(t.O) ? t.O : legacy), M: cleanIds(t.M), par: par || (t.par === 'joueur' ? 'joueur' : 'coach'), maj: Number(t.maj) || Date.now() };
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
    return { ok: true, semaines: (d.semaines || []).sort((a, b) => a.debut.localeCompare(b.debut)), ...base };
  } catch (e) { return { ok: false, error: 'pools illisibles avec ce code', ...base }; }
}

// action : { type: 'save', semaine } ou { type: 'delete', id } (coach), { type: 'joueur', slug, debut, objectif, tiers } (joueur ou coach)
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
      let semaines = [];
      if (cur && cur.json) semaines = open(cur.json).semaines || [];
      else if (repo !== REPO) { try { const old = await readPublic(POOLS); if (old) semaines = open(old).semaines || []; } catch (e) { /* rien à reprendre */ } }
      if (action.type === 'delete') semaines = semaines.filter((w) => w.id !== action.id);
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
      const box = seal({ semaines }, 'pools');
      const r = await ghPut(token, file, box, cur && cur.sha, 'Pools : tierlists de la semaine', repo);
      if (r.ok) { saveCache('pools', box); return { ok: true, semaines }; }
    }
    throw new Error('les pools ont changé pendant l\'envoi, réessaie');
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

// ---------- Planning : le coach coche les jours et heures de jeu, chaque joueur répond présent / absent / incertain ----------
// Même stockage que les pools : planning.json dans le dépôt de données (jeton d'équipe), sinon coach/planning.json (jeton du coach).
const PLANNING = 'coach/planning.json';
const isYmd = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const STATUTS = ['present', 'absent', 'incertain'];

function cleanJour(j) {
  const heures = [...new Set((Array.isArray(j && j.heures) ? j.heures : []).map((x) => parseInt(x, 10)).filter((x) => x >= 0 && x <= 23))].sort((a, b) => a - b);
  const type = ['flex', '5c5', 'scrim', 'review', 'autre'].includes(j && j.type) ? j.type : 'flex';
  return { heures, type, note: str(j && j.note, 200), maj: Date.now() };
}

function prunePlanning(d) {
  const lim = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const jours = {}, reponses = {};
  for (const [k, v] of Object.entries(d.jours || {})) if (isYmd(k) && k >= lim && v && v.heures && v.heures.length) jours[k] = v;
  for (const [k, v] of Object.entries(d.reponses || {})) if (isYmd(k) && k >= lim && v) reponses[k] = v;
  return { jours, reponses };
}

async function planning() {
  if (!teamKey()) return { ok: false, error: "entre à nouveau le code d'équipe pour lire le planning" };
  const dr = getConfig().data_repo || null;
  const tok = dr ? await teamToken() : null;
  let box = null, offline = false;
  try {
    if (dr) box = await readPublic('planning.json', dr, tok);
    if (!box) box = await readPublic(PLANNING);
    if (box) saveCache('planning', box);
  } catch (e) { offline = true; box = loadCache('planning'); }
  const base = { peutEcrire: !!(dr && tok), depot: dr, offline };
  if (!box) return { ok: true, jours: {}, reponses: {}, ...base };
  try { return { ok: true, ...prunePlanning(open(box)), ...base }; }
  catch (e) { return { ok: false, error: 'planning illisible avec ce code', ...base }; }
}

// action : { type: 'semaine', debut, jours: { 'AAAA-MM-JJ': { heures, type, note } } } (coach : remplace les 7 jours à partir de debut)
//          { type: 'reponse', date, slug, statut, note } (joueur ou coach)
async function savePlanning(action) {
  const dr = getConfig().data_repo || null;
  const isCoach = coachState().coach;
  const c = readSecret('coach.bin') || {};
  const tok = dr ? await teamToken() : null;
  let repo, token, file;
  if (dr && tok) { repo = dr; token = tok; file = 'planning.json'; }
  else if (isCoach && c.github) { repo = REPO; token = c.github; file = PLANNING; }
  else return { ok: false, error: dr ? "le coach n'a pas encore activé les réponses des joueurs (jeton d'équipe)" : 'réservé au coach' };
  if (action.type !== 'reponse' && !isCoach) return { ok: false, error: 'réservé au coach' };
  try {
    for (let i = 0; i < 4; i++) {
      const cur = await ghGet(token, file, repo);
      let d = { jours: {}, reponses: {} };
      if (cur && cur.json) d = open(cur.json);
      else if (repo !== REPO) { try { const old = await readPublic(PLANNING); if (old) d = open(old); } catch (e) { /* rien à reprendre */ } }
      d.jours = d.jours || {}; d.reponses = d.reponses || {};
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
      } else throw new Error('action inconnue');
      d = prunePlanning(d);
      const box = seal(d, 'planning');
      const r = await ghPut(token, file, box, cur && cur.sha, action.type === 'reponse' ? 'Planning : réponse' : 'Planning : semaine', repo);
      if (r.ok) { saveCache('planning', box); return { ok: true, ...d }; }
    }
    throw new Error("le planning a changé pendant l'envoi, réessaie");
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
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
  if (!texte) return { ok: false, error: 'écris ton message' };
  return { ok: true, fiche: { type: 'message', titre: str(m.titre, 140) || 'Message du coach', accroche: '', sections: [{ titre: '', texte, schema: null }], a_retenir: [], exercice: '', videos: [], sources: [], sujet: '', cible: str(m.cible, 40) || "Toute l'équipe" } };
}

module.exports = { pools, savePools, planning, savePlanning, champions, init, unlock, isUnlocked, coachState, coachUnlock, coachLeave, coachSave, generate, publish, unpublish, list, message, _test: { pickJson, cleanFiche, cleanSvg, scrypt, norm } };
