// FIRE LoL - application de bureau (Electron).
// Lit les stats des joueurs sur dpm.lol dans une fenêtre cachée, puis les affiche.

const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const coach = require('./coach');
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch (e) { /* module absent (développement) */ }

const CONFIG_URL = 'https://toka120.github.io/fire-team-lol/joueurs.json';
const GUIDES_URL = 'https://toka120.github.io/fire-team-lol/guides.json';
const DPM = 'https://dpm.lol/';
let mainWin = null;

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#0f0d0c',
    title: 'FIRE LoL',
    icon: path.join(__dirname, 'assets', 'fire.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Les liens externes (dpm.lol, GitHub) s'ouvrent dans le navigateur par défaut.
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWin.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); }
  });
}

// ---------- Configuration (liste des joueurs, code d'équipe) ----------

const cachePath = (name) => path.join(app.getPath('userData'), name);
let lastCfg = null;

// Lit un fichier JSON en ligne (GitHub Pages), garde une copie locale, et retombe dessus hors ligne.
async function remoteJson(url, name) {
  try {
    const r = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      try { fs.writeFileSync(cachePath(name), JSON.stringify(j)); } catch (e) { /* ignore */ }
      return { ...j, _source: 'en ligne' };
    }
  } catch (e) { /* hors ligne : on retombe sur la copie locale */ }
  for (const f of [cachePath(name), path.join(__dirname, 'renderer', name.replace('.json', '.default.json'))]) {
    try { return { ...JSON.parse(fs.readFileSync(f, 'utf8')), _source: 'copie locale' }; } catch (e) { /* suivant */ }
  }
  return null;
}

ipcMain.handle('config', async () => {
  const j = (await remoteJson(CONFIG_URL, 'joueurs.json')) || { joueurs: [], _source: 'aucune' };
  lastCfg = j;
  return j;
});
ipcMain.handle('guides', async () => (await remoteJson(GUIDES_URL, 'guides.json')) || { themes: [] });

coach.init(() => lastCfg || {});
ipcMain.handle('unlock', (e, code) => coach.unlock(code));
ipcMain.handle('unlocked', () => coach.isUnlocked());
ipcMain.handle('coach:state', () => coach.coachState());
ipcMain.handle('coach:unlock', (e, code) => coach.coachUnlock(code));
ipcMain.handle('coach:leave', () => coach.coachLeave());
ipcMain.handle('coach:save', (e, keys) => coach.coachSave(keys || {}));
ipcMain.handle('coach:generate', (e, req) => coach.generate(req || {}));
ipcMain.handle('coach:message', (e, m) => coach.message(m || {}));
ipcMain.handle('coach:publish', (e, fiche) => coach.publish(fiche));
ipcMain.handle('coach:unpublish', (e, id) => coach.unpublish(id));
ipcMain.handle('fiches', () => coach.list());
ipcMain.handle('pools', () => coach.pools());
ipcMain.handle('coach:savePools', (e, action) => coach.savePools(action || {}));
ipcMain.handle('champions', () => coach.champions());

ipcMain.handle('hash', (e, text) => crypto.createHash('sha256').update(String(text)).digest('hex'));
ipcMain.handle('version', () => app.getVersion());

// ---------- Lecture des stats sur dpm.lol ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const captured = new Map(); // id de la fenêtre cachée -> puuid vu dans les requêtes de dpm.lol
let hooked = false;

function dpmSession() {
  const s = session.fromPartition('persist:dpm');
  if (!hooked) {
    hooked = true;
    s.webRequest.onBeforeRequest({ urls: ['https://dpm.lol/v1/players/*'] }, (details, callback) => {
      const m = details.url.match(/\/v1\/players\/([^/?]+)\//);
      if (m && details.webContentsId) captured.set(details.webContentsId, decodeURIComponent(m[1]));
      callback({});
    });
  }
  return s;
}

// Exécutée DANS la page dpm.lol (même origine que son API). Doit rester autonome.
async function grab(puuid, cutoff) {
  const F = ['championName', 'win', 'opponentChampionName', 'lane', 'kills', 'deaths', 'assists', 'killParticipation',
    'totalMinionsKilled', 'neutralMinionsKilled', 'goldPerMinute', 'damagePerMinute', 'teamDamagePercentage',
    'visionScorePerMinute', 'controlWardsPlaced', 'stealthWardsPlaced', 'wardTakedowns', 'csDiffAt15', 'goldDiffAt15',
    'xpDiffAt15', 'jungleCsBefore10Minutes', 'laneMinionsFirst10Minutes', 'scuttleCrabKills', 'soloKills',
    'turretPlatesTaken', 'dragon', 'horde', 'dpmScore'];
  const matches = [];
  for (let page = 1; page <= 14; page++) {
    // Pas de paramètre en plus dans l'URL : dpm.lol refuse toute propriété inconnue (erreur 422).
    // cache: 'no-store' suffit pour avoir les dernières games.
    const r = await fetch(`/v1/players/${puuid}/match-history?size=15&page=${page}`, { cache: 'no-store' });
    if (!r.ok) {
      let why = '';
      try { const e = await r.json(); why = [].concat(e.message || []).join(', '); } catch (x) { /* corps vide */ }
      throw new Error('historique indisponible (' + r.status + (why ? ' : ' + why : '') + ')');
    }
    const j = await r.json();
    if (!j.matches || !j.matches.length) break;
    for (const m of j.matches) {
      const p = (m.participants || []).find((x) => x.puuid === puuid);
      if (!p) continue;
      const o = { id: m.gameId, t: m.gameCreation, d: m.gameDuration, q: m.queueId };
      for (const k of F) o[k] = p[k];
      matches.push(o);
    }
    if (j.matches[j.matches.length - 1].gameCreation < cutoff) break;
  }
  let champs = [];
  try {
    const c = await fetch(`/v1/players/${puuid}/champions?currentSplit=true&queue=420`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : []));
    champs = (Array.isArray(c) ? c : []).map((x) => ({
      id: x.championName, games: x.gamesPlayed, wins: x.win, kda: x.kda, kills: x.kills, deaths: x.deaths,
      assists: x.assists, csm: x.csm, gpm: x.gpm, dpm: x.dpm, kp: x.kp, goldDiff: x.goldDiff, recent: x.recentResults
    }));
  } catch (e) { /* stats du split facultatives */ }
  const txt = (document.querySelector('main') || document.body).innerText || '';
  const m = txt.match(/(?:CLASS[ÉE] SOLO|RANKED SOLO)\s*\n([^\n]+)\n([^\n]+)/i);
  return { matches, champs, rank: m ? m[1].trim() : '', record: m ? m[2].trim() : '' };
}

async function fetchPlayer(player, days) {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: { session: dpmSession(), backgroundThrottling: false, contextIsolation: true, sandbox: true }
  });
  win.webContents.setAudioMuted(true);
  const id = win.webContents.id;
  try {
    await win.loadURL(DPM + player.slug).catch(() => { /* la page peut se recharger (protection anti-robot) */ });
    // On attend que dpm.lol interroge son API : ça prouve que la page est prête et donne l'identifiant du joueur.
    let puuid = null;
    for (let i = 0; i < 50 && !puuid; i++) {
      puuid = captured.get(id) || null;
      if (!puuid) await sleep(400);
    }
    puuid = puuid || player.puuid;
    if (!puuid) throw new Error('profil introuvable sur dpm.lol');
    // Demande à dpm.lol de rafraîchir le profil (bouton « Update now »), puis laisse-lui le temps.
    // Le texte du bouton est dans un <div> avec un point animé : on cherche donc le <button> par son texte complet.
    const clicked = await win.webContents.executeJavaScript(`(() => {
      const re = /^(update now|mettre à jour|actualiser|mise à jour)$/i;
      const el = [...document.querySelectorAll('button')].find((e) => re.test((e.textContent || '').trim()))
        || [...document.querySelectorAll('a, div, span')].find((e) => re.test((e.textContent || '').trim()));
      if (el) { el.click(); return true; }
      return false;
    })()`).catch(() => false);
    if (clicked) await sleep(9000);
    const cutoff = Date.now() - days * 86400000;
    const data = await win.webContents.executeJavaScript(`(${grab.toString()})(${JSON.stringify(puuid)}, ${cutoff})`);
    return { ok: true, puuid, at: Date.now(), ...data };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  } finally {
    captured.delete(id);
    if (!win.isDestroyed()) win.destroy();
  }
}

ipcMain.handle('dpm:fetch', (e, player, days) => fetchPlayer(player, days || 31));

// ---------- Mise à jour automatique de l'application ----------
// La version installée (FIRE-LoL-Setup.exe) vérifie les Releases GitHub au lancement puis toutes les 30 minutes,
// télécharge la nouvelle version en arrière-plan et l'installe en redémarrant. La version portable ne peut pas
// se mettre à jour seule : elle affiche un lien de téléchargement.

const portable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const canAutoUpdate = () => !!autoUpdater && app.isPackaged && !portable;
let updateState = { state: 'idle' };
function sendUpdate(m) {
  updateState = { ...updateState, ...m };
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('update', updateState);
}
function setupUpdater() {
  if (!canAutoUpdate()) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'none' }));
  autoUpdater.on('update-available', (i) => sendUpdate({ state: 'available', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => sendUpdate({ state: 'progress', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => sendUpdate({ state: 'ready', version: i.version }));
  autoUpdater.on('error', (e) => sendUpdate({ state: 'error', error: String((e && e.message) || e).slice(0, 200) }));
  const check = () => { if (updateState.state !== 'ready') autoUpdater.checkForUpdates().catch(() => { /* hors ligne */ }); };
  setTimeout(check, 1500);
  setInterval(check, 30 * 60 * 1000);
}
// Pour la version portable : on lit le numéro de la dernière version publiée, pour proposer le téléchargement.
async function latestTag() {
  try {
    const r = await fetch('https://api.github.com/repos/Toka120/fire-team-lol/releases/latest', { headers: { 'User-Agent': 'FIRE-LoL', Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    const j = await r.json();
    return String(j.tag_name || '').replace(/^v/, '') || null;
  } catch (e) { return null; }
}
ipcMain.handle('update:state', async () => ({ ...updateState, auto: canAutoUpdate(), portable, latest: await latestTag() }));
ipcMain.handle('update:install', () => {
  if (canAutoUpdate() && updateState.state === 'ready') { setImmediate(() => autoUpdater.quitAndInstall(true, true)); return true; }
  return false;
});
// Bouton « Installer la dernière version » de l'onglet Paramètres.
ipcMain.handle('update:check', async () => {
  const latest = await latestTag();
  if (!canAutoUpdate()) return { ok: true, auto: false, latest };
  if (updateState.state === 'ready' || updateState.state === 'progress' || updateState.state === 'available') return { ok: true, auto: true, latest, state: updateState.state };
  try {
    const r = await autoUpdater.checkForUpdates();
    return { ok: true, auto: true, latest, found: r && r.updateInfo ? r.updateInfo.version : null };
  } catch (e) {
    return { ok: false, auto: true, latest, error: String((e && e.message) || e).slice(0, 200) };
  }
});

// ---------- Démarrage ----------

const single = app.requestSingleInstanceLock();
if (!single) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
  });
  app.whenReady().then(() => { createMainWindow(); setupUpdater(); });
  app.on('window-all-closed', () => app.quit());
}
