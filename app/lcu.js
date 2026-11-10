// FIRE LoL - draft en direct : lecture du client League of Legends ouvert sur ce PC (API locale du client)
// et de la partie en cours (API « Live Client Data » de Riot, port 2999). Rien ne sort du PC.
// Les runes recommandées viennent du client lui-même (celles que Riot propose pour le champion et le poste).
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

let creds = null;          // { port, auth }
let lastLook = 0;
let champs = null;         // clé numérique -> { id, name }
let perks = null;          // id -> { name, icon }

const POS = { top: 'top', jungle: 'jungle', middle: 'middle', mid: 'middle', bottom: 'bottom', bot: 'bottom', utility: 'utility', support: 'utility' };

// ---------- Trouver le client ----------
function lockfileCreds() {
  const dirs = [];
  try {
    const j = JSON.parse(fs.readFileSync('C:\\ProgramData\\Riot Games\\RiotClientInstalls.json', 'utf8'));
    for (const k of Object.keys(j.associated_client || {})) if (/league of legends/i.test(k)) dirs.push(k);
  } catch (e) { /* pas d'installation connue */ }
  for (const d of ['C', 'D', 'E', 'F']) dirs.push(`${d}:\\Riot Games\\League of Legends`);
  for (const d of dirs) {
    try {
      const [, , port, pw] = fs.readFileSync(path.join(d, 'lockfile'), 'utf8').split(':');
      if (port && pw) return { port: Number(port), auth: 'Basic ' + Buffer.from('riot:' + pw).toString('base64') };
    } catch (e) { /* client fermé ou autre dossier */ }
  }
  return null;
}
function processCreds() {
  return new Promise((ok) => {
    if (process.platform !== 'win32') return ok(null);
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      "Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine"],
    { windowsHide: true, timeout: 8000 }, (err, out) => {
      const s = String(out || '');
      const port = (s.match(/--app-port=(\d+)/) || [])[1];
      const pw = (s.match(/--remoting-auth-token=([\w-]+)/) || [])[1];
      ok(port && pw ? { port: Number(port), auth: 'Basic ' + Buffer.from('riot:' + pw).toString('base64') } : null);
    });
  });
}
let lastPs = 0;
async function findClient() {
  if (creds) return creds;
  if (Date.now() - lastLook < 4000) return null; // on ne cherche pas le client plus d'une fois toutes les 4 s
  lastLook = Date.now();
  creds = lockfileCreds();
  // Plan B (client installé ailleurs) : on lit la ligne de commande du client, au plus une fois par minute.
  if (!creds && Date.now() - lastPs > 60000) { lastPs = Date.now(); creds = await processCreds(); }
  return creds;
}

// Les deux API locales de Riot utilisent un certificat à elles : on l'accepte, mais uniquement pour 127.0.0.1.
function local(port, p, { method = 'GET', body, auth, timeout = 4000 } = {}) {
  return new Promise((ok, ko) => {
    const data = body == null ? null : JSON.stringify(body);
    const req = https.request({ host: '127.0.0.1', port, path: p, method, rejectUnauthorized: false, timeout,
      headers: Object.assign({ Accept: 'application/json' }, auth ? { Authorization: auth } : {}, data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) },
    (res) => {
      let t = ''; res.setEncoding('utf8');
      res.on('data', (c) => { t += c; });
      res.on('end', () => { let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; } ok({ status: res.statusCode, json: j }); });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', ko);
    if (data) req.write(data);
    req.end();
  });
}
async function lcu(p, opts = {}) {
  const c = await findClient();
  if (!c) return null;
  try { return await local(c.port, p, Object.assign({ auth: c.auth }, opts)); } catch (e) { creds = null; return null; }
}

// ---------- Données de jeu (noms des champions, des runes) ----------
async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'FIRE-LoL' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function champMap() {
  if (champs) return champs;
  const v = (await getJSON('https://ddragon.leagueoflegends.com/api/versions.json'))[0];
  const j = await getJSON(`https://ddragon.leagueoflegends.com/cdn/${v}/data/fr_FR/champion.json`);
  const m = { version: v, byKey: {}, byId: {} };
  for (const x of Object.values(j.data || {})) { m.byKey[x.key] = { id: x.id, name: x.name }; m.byId[x.id.toLowerCase()] = { id: x.id, name: x.name }; }
  champs = m;
  return m;
}
const CD = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/';
const cdIcon = (p) => p ? CD + 'default/' + String(p).replace(/^\/lol-game-data\/assets\//i, '').toLowerCase() : '';
async function perkMap() {
  if (perks) return perks;
  const [list, styles] = await Promise.all([getJSON(CD + 'fr_fr/v1/perks.json'), getJSON(CD + 'fr_fr/v1/perkstyles.json')]);
  const m = {};
  for (const p of list || []) m[p.id] = { name: p.name, icon: cdIcon(p.iconPath) };
  for (const s of (styles && styles.styles) || []) m[s.id] = { name: s.name, icon: cdIcon(s.iconPath) };
  perks = m;
  return m;
}

// ---------- Draft (sélection des champions) et partie en cours ----------
async function liveGame() {
  try {
    const r = await local(2999, '/liveclientdata/allgamedata', { timeout: 2500 });
    if (!r || r.status !== 200 || !r.json || !r.json.allPlayers) return null;
    const g = r.json;
    const me = g.activePlayer && (g.activePlayer.riotId || g.activePlayer.summonerName);
    const mine = g.allPlayers.find((p) => (p.riotId || p.summonerName) === me) || null;
    const team = mine ? mine.team : 'ORDER';
    const champOf = (p) => String(p.rawChampionName || '').replace(/^game_character_displayname_/, '');
    const map = (p) => ({ champ: champOf(p), name: p.championName, pos: POS[String(p.position || '').toLowerCase()] || '', me: p === mine });
    return { time: Math.round((g.gameData && g.gameData.gameTime) || 0), allies: g.allPlayers.filter((p) => p.team === team).map(map), enemies: g.allPlayers.filter((p) => p.team !== team).map(map) };
  } catch (e) { return null; }
}

async function draft() {
  const out = { client: false, phase: 'None', allies: [], enemies: [], me: null, game: null };
  const game = await liveGame();
  if (game) {
    out.phase = 'InProgress'; out.game = { time: game.time };
    out.allies = game.allies; out.enemies = game.enemies; out.me = game.allies.find((x) => x.me) || null;
    out.client = true;
    return out;
  }
  const ph = await lcu('/lol-gameflow/v1/gameflow-phase');
  if (!ph) return out;
  out.client = true;
  out.phase = typeof ph.json === 'string' ? ph.json : 'None';
  if (out.phase !== 'ChampSelect') return out;
  const s = await lcu('/lol-champ-select/v1/session');
  if (!s || s.status !== 200 || !s.json) return out;
  let m = { byKey: {} };
  try { m = await champMap(); } catch (e) { /* noms facultatifs */ }
  const cid = (p) => p.championId || p.championPickIntent || 0;
  const map = (p, mine) => {
    const k = cid(p); const c = m.byKey[String(k)];
    return { champ: c ? c.id : '', name: c ? c.name : '', pos: POS[String(p.assignedPosition || '').toLowerCase()] || '', key: k, locked: !!p.championId, me: mine, hover: !p.championId && !!p.championPickIntent };
  };
  const me = s.json.localPlayerCellId;
  out.allies = (s.json.myTeam || []).map((p) => map(p, p.cellId === me));
  out.enemies = (s.json.theirTeam || []).map((p) => map(p, false));
  out.me = out.allies.find((x) => x.me) || null;
  const t = s.json.timer || {};
  out.timer = { phase: t.phase || '', left: Math.max(0, Math.round((t.adjustedTimeLeftInPhase || 0) / 1000)) };
  return out;
}

// ---------- Runes recommandées par Riot et import dans le client ----------
async function recommended(key, pos) {
  const variants = pos ? [pos.toUpperCase(), pos, 'NONE'] : ['NONE'];
  for (const v of variants) {
    const r = await lcu(`/lol-perks/v1/recommended-pages/champion/${Number(key)}/position/${encodeURIComponent(v)}/map/11`);
    if (r && r.status === 200 && Array.isArray(r.json) && r.json.length) return r.json;
  }
  return [];
}
function pageOf(rec) {
  const ids = (rec.perks || []).map((p) => (typeof p === 'object' ? p.id : p)).filter(Boolean);
  return { primaryStyleId: rec.primaryPerkStyleId, subStyleId: rec.secondaryPerkStyleId, selectedPerkIds: ids };
}
async function runes(key, pos) {
  if (!(await findClient())) return { ok: false, error: 'client League of Legends fermé' };
  const recs = await recommended(key, pos);
  let names = {};
  try { names = await perkMap(); } catch (e) { /* noms facultatifs */ }
  const pages = recs.slice(0, 3).map((r) => {
    const p = pageOf(r);
    const nm = (id) => Object.assign({ id }, names[id] || { name: String(id), icon: '' });
    return { primary: nm(p.primaryStyleId), sub: nm(p.subStyleId), perks: p.selectedPerkIds.map(nm), raw: p, spells: r.summonerSpellIds || [] };
  });
  return { ok: true, pages };
}
// Écrit la page dans le client : on réutilise la page « FIRE » si elle existe, sinon on en crée une.
// Si toutes les places sont prises, on ne touche à rien sans l'accord du joueur (replaceId).
async function importPage(raw, label, replaceId) {
  if (!(await findClient())) return { ok: false, error: 'client League of Legends fermé' };
  if (!raw || !raw.primaryStyleId || !Array.isArray(raw.selectedPerkIds) || raw.selectedPerkIds.length < 6) return { ok: false, error: 'page de runes incomplète' };
  const body = { name: ('FIRE · ' + String(label || '')).slice(0, 25), primaryStyleId: raw.primaryStyleId, subStyleId: raw.subStyleId, selectedPerkIds: raw.selectedPerkIds, current: true };
  const list = await lcu('/lol-perks/v1/pages');
  const all = (list && Array.isArray(list.json)) ? list.json : [];
  const mineP = all.find((p) => p.isEditable && /^FIRE/.test(p.name || '')) || (replaceId ? all.find((p) => p.id === replaceId && p.isEditable) : null);
  if (mineP) {
    const r = await lcu(`/lol-perks/v1/pages/${mineP.id}`, { method: 'PUT', body: Object.assign({}, body, { id: mineP.id }) });
    if (r && r.status >= 200 && r.status < 300) return { ok: true, name: body.name };
    // Certains clients refusent la modification : on supprime notre page et on la recrée.
    await lcu(`/lol-perks/v1/pages/${mineP.id}`, { method: 'DELETE' });
  }
  const c = await lcu('/lol-perks/v1/pages', { method: 'POST', body });
  if (c && c.status >= 200 && c.status < 300) return { ok: true, name: body.name };
  const cur = all.find((p) => p.current && p.isEditable) || all.find((p) => p.isEditable);
  return { ok: false, full: true, error: 'plus de place pour une nouvelle page de runes', replace: cur ? { id: cur.id, name: cur.name } : null };
}

module.exports = { draft, runes, importPage, champMap };
