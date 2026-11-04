// FIRE LoL - application de bureau (Electron).
// Lit les stats des joueurs sur dpm.lol dans une fenêtre cachée, puis les affiche.

const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const CONFIG_URL = 'https://toka120.github.io/fire-team-lol/joueurs.json';
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

const configCache = () => path.join(app.getPath('userData'), 'joueurs.json');

ipcMain.handle('config', async () => {
  try {
    const r = await fetch(CONFIG_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      try { fs.writeFileSync(configCache(), JSON.stringify(j)); } catch (e) { /* ignore */ }
      return { ...j, _source: 'en ligne' };
    }
  } catch (e) { /* hors ligne : on retombe sur la copie locale */ }
  for (const file of [configCache(), path.join(__dirname, 'renderer', 'joueurs.default.json')]) {
    try { return { ...JSON.parse(fs.readFileSync(file, 'utf8')), _source: 'copie locale' }; } catch (e) { /* suivant */ }
  }
  return { joueurs: [], _source: 'aucune' };
});

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
    const r = await fetch(`/v1/players/${puuid}/match-history?size=15&page=${page}`);
    if (!r.ok) throw new Error('historique indisponible (' + r.status + ')');
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
    const c = await fetch(`/v1/players/${puuid}/champions?currentSplit=true&queue=420`).then((r) => (r.ok ? r.json() : []));
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
    const clicked = await win.webContents.executeJavaScript(`(() => {
      const el = [...document.querySelectorAll('button, a, div, span')].find((e) => e.children.length === 0 && /^(update now|mettre à jour|actualiser)$/i.test((e.textContent || '').trim()));
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

// ---------- Démarrage ----------

const single = app.requestSingleInstanceLock();
if (!single) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
  });
  app.whenReady().then(createMainWindow);
  app.on('window-all-closed', () => app.quit());
}
