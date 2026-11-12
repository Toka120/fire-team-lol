// FIRE LoL - application de bureau (Electron).
// Lit les stats des joueurs sur dpm.lol dans une fenêtre cachée, puis les affiche.

const { app, BrowserWindow, ipcMain, session, shell, Notification, Tray, Menu, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const coach = require('./coach');
const jeux = require('./jeux');
const worlds = require('./worlds');
const { teamGrab } = require('./teamgrab');
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch (e) { /* module absent (développement) */ }

const CONFIG_URL = 'https://toka120.github.io/fire-team-lol/joueurs.json';
const GUIDES_URL = 'https://toka120.github.io/fire-team-lol/guides.json';
const PATCH_URL = 'https://toka120.github.io/fire-team-lol/patchnotes.json';
const DPM = 'https://dpm.lol/';
let mainWin = null;

// ---------- Arrière-plan et notifications de bureau ----------
// Réglages de l'ordinateur (pas de l'équipe) : garder FIRE ouvert près de l'horloge quand on ferme la fenêtre,
// et le lancer au démarrage de Windows, pour recevoir les notifications même fenêtre fermée.
let tray = null;
let quitting = false;
let trayHintShown = false;
const startHidden = process.argv.includes('--hidden');
const bgPath = () => path.join(app.getPath('userData'), 'arriere-plan.json');
function bgPrefs() {
  try { return { bg: false, ...JSON.parse(fs.readFileSync(bgPath(), 'utf8')) }; } catch (e) { return { bg: false }; }
}
const exePath = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
function startupOn() {
  try { return !!app.getLoginItemSettings({ path: exePath(), args: ['--hidden'] }).openAtLogin; } catch (e) { return false; }
}
function showMain() {
  if (!mainWin || mainWin.isDestroyed()) { createMainWindow(true); return; }
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}
function ensureTray() {
  if (tray) return;
  try {
    tray = new Tray(path.join(__dirname, 'assets', process.platform === 'win32' ? 'fire.ico' : 'fire.png'));
    tray.setToolTip('FIRE LoL');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Ouvrir FIRE LoL', click: showMain },
      { type: 'separator' },
      { label: 'Quitter FIRE LoL', click: () => { quitting = true; app.quit(); } }
    ]));
    tray.on('click', showMain);
  } catch (e) { tray = null; }
}
function dropTray() { if (tray) { tray.destroy(); tray = null; } }
function notify(title, body, section) {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, icon: path.join(__dirname, 'assets', 'fire.png'), silent: false });
  n.on('click', () => {
    showMain();
    if (section && mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('notify:go', section);
  });
  n.show();
  return true;
}

// Redémarrage après une mise à jour faite pendant que personne ne regardait FIRE : on revient caché près
// de l'horloge, sans jamais passer devant un jeu ou une autre fenêtre.
const quietPath = () => path.join(app.getPath('userData'), 'relance-discrete.json');
// Mode de la relance après une mise à jour : 'tray' (caché près de l'horloge), 'min' (réduit dans la barre des
// tâches, sans jamais passer devant une autre fenêtre) ou 'show' (le joueur a cliqué « Redémarrer maintenant »).
function relaunchMode() {
  try {
    const j = JSON.parse(fs.readFileSync(quietPath(), 'utf8'));
    fs.rmSync(quietPath(), { force: true });
    if (Date.now() - (j.t || 0) > 10 * 60 * 1000) return null;
    return j.mode || 'tray';
  } catch (e) { return null; }
}

function createMainWindow(forceShow) {
  // Lancement avec Windows ou relance discrète : FIRE démarre caché (icône près de l'horloge),
  // pour ne jamais s'afficher par-dessus une partie en cours.
  const mode = forceShow ? null : relaunchMode();
  const hidden = !forceShow && (startHidden || mode === 'tray');
  const minimized = !hidden && mode === 'min';
  mainWin = new BrowserWindow({
    show: !hidden && !minimized,
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
      sandbox: true,
      // Les vérifications (planning, messages, mises à jour) continuent quand la fenêtre est cachée.
      backgroundThrottling: false
    }
  });
  if (hidden) ensureTray();
  // Relance après une mise à jour automatique : la fenêtre revient réduite dans la barre des tâches,
  // sans prendre la main (on ne passe jamais devant un jeu).
  if (minimized) { ensureTray(); mainWin.once('ready-to-show', () => { try { mainWin.minimize(); } catch (e) { /* */ } }); }
  // Avec l'arrière-plan activé, fermer la fenêtre la cache seulement : FIRE reste près de l'horloge.
  // Arrêt ou redémarrage de Windows : FIRE se ferme normalement.
  mainWin.on('session-end', () => { quitting = true; });
  mainWin.on('close', (e) => {
    if (quitting || !bgPrefs().bg) return;
    // Fenêtre déjà cachée : la demande de fermeture vient de Windows ou de l'installeur, pas du joueur.
    // On quitte vraiment, sinon l'installeur ne peut pas remplacer les fichiers.
    if (!mainWin.isVisible()) { quitting = true; dropTray(); setImmediate(() => app.quit()); return; }
    e.preventDefault();
    mainWin.hide();
    ensureTray();
    if (!trayHintShown) { trayHintShown = true; notify('FIRE LoL reste ouvert', "Tu recevras les notifications ici. Clic droit sur l'icône FIRE près de l'horloge pour quitter."); }
  });
  hideAdSlots(mainWin.webContents);
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

// Les jeux intégrés (loldodgegame.com, lynge.tv…) n'ont droit qu'au plein écran et au verrouillage de la souris :
// pas de caméra, micro, position ou notifications. L'app elle-même (fichiers locaux) garde tout.
function lockPermissions() {
  const ok = (perm, url) => /^file:\/\//.test(url || '') || perm === 'fullscreen' || perm === 'pointerLock';
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) => cb(ok(perm, details && details.requestingUrl)));
  session.defaultSession.setPermissionCheckHandler((wc, perm, origin, details) => ok(perm, (details && details.requestingUrl) || origin));
}

// Pas de pubs dans les jeux intégrés (onglet Micro, League of Listen) : les régies publicitaires sont bloquées
// et les emplacements vides masqués. Le reste du site (le jeu) se charge normalement.
const AD_HOSTS = ['googlesyndication.com', 'doubleclick.net', 'googleadservices.com', 'adservice.google.com', 'adservice.google.fr',
  'googletagservices.com', 'imasdk.googleapis.com', 'pagead2.googlesyndication.com', 'tpc.googlesyndication.com', 'fundingchoicesmessages.google.com',
  'adinplay.com', 'amazon-adsystem.com', 'adnxs.com', 'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'pubmatic.com',
  'rubiconproject.com', 'openx.net', 'casalemedia.com', 'smartadserver.com', 'teads.tv', 'moatads.com', '2mdn.net', 'adsrvr.org',
  'yieldmo.com', 'sharethrough.com', 'media.net', 'lijit.com', 'sovrn.com', '33across.com', 'id5-sync.com', 'quantserve.com',
  'cookielaw.org', 'quantcast.com', 'consensu.org', 'snigelweb.com', 'ezoic.net', 'venatusmedia.com', 'playwire.com', 'nitropay.com'];
const isAdHost = (h) => AD_HOSTS.some((d) => h === d || h.endsWith('.' + d));
const AD_CSS = 'ins.adsbygoogle,.adsbygoogle,[id*="-com_300x250"],[id*="-com_728x90"],[id*="-com_160x600"],[id*="_300x250"],[id*="_728x90"],[id*="_160x600"],[class*="ad-container"],[id^="aip_"],iframe[src*="googlesyndication"],iframe[src*="doubleclick"]{display:none!important}';
function blockAds() {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => {
    let host = '';
    try { host = new URL(d.url).hostname; } catch (e) { /* adresse illisible */ }
    cb({ cancel: !!host && isAdHost(host) });
  });
}
function hideAdSlots(wc) {
  wc.on('did-frame-finish-load', (e, isMain, pid, rid) => {
    if (isMain) return;
    try {
      const { webFrameMain } = require('electron');
      const f = webFrameMain.fromId(pid, rid);
      if (f && /^https:\/\//.test(f.url)) f.executeJavaScript(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(AD_CSS)}; (document.head || document.documentElement).append(s); })()`).catch(() => {});
    } catch (e) { /* cadre fermé entre-temps */ }
  });
}

// Partage d'écran du salon vocal : l'app affiche ses propres vignettes (écrans et fenêtres),
// puis le choix est donné ici au navigateur. Seule l'app elle-même peut demander une capture.
let screenPick = null;
const screenSources = () => desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 }, fetchWindowIcons: false });
ipcMain.handle('screen:sources', async () => {
  try {
    const list = await screenSources();
    return list.filter((x) => x.name && !x.thumbnail.isEmpty()).map((x) => ({ id: x.id, name: x.name, screen: x.id.startsWith('screen:'), thumb: x.thumbnail.toDataURL() }));
  } catch (e) { return []; }
});
// Son du PC sans le son de FIRE (voix du salon, sons, streams regardés), comme Discord : Windows sait
// capter « tout sauf une application » depuis Windows 10 22H2 (build 19045) et Windows 11.
// La page le demande (restrictOwnAudio) et Electron choisit alors cette capture à la place de « tout le son ».
const winBuild = () => { const b = Number(String(require('os').release()).split('.')[2]); return Number.isFinite(b) ? b : 0; };
ipcMain.handle('screen:ownAudio', () => process.platform === 'win32' && winBuild() >= 19045);
ipcMain.handle('screen:pick', (e, id, audio) => { screenPick = typeof id === 'string' ? { id, audio: !!audio } : null; return true; });
function screenShare() {
  session.defaultSession.setDisplayMediaRequestHandler((req, cb) => {
    const fromApp = /^file:\/\//.test((req.frame && req.frame.url) || req.securityOrigin || '');
    const pick = screenPick; screenPick = null;
    const id = pick && pick.id;
    if (!fromApp || !id) return cb({});
    // Son du PC (« loopback ») seulement si le joueur l'a coché et que la page l'a demandé.
    screenSources().then((list) => { const src = list.find((x) => x.id === id); cb(src ? (pick.audio && req.audioRequested ? { video: src, audio: 'loopback' } : { video: src }) : {}); }).catch(() => cb({}));
  });
}

// ---------- Draft en direct (voir lcu.js) ----------
const lcu = require('./lcu');
ipcMain.handle('lcu:draft', () => lcu.draft().catch(() => ({ client: false, phase: 'None', allies: [], enemies: [] })));
ipcMain.handle('lcu:runes', (e, key, pos) => lcu.runes(key, pos).catch((err) => ({ ok: false, error: String(err && err.message || err) })));
ipcMain.handle('lcu:import', (e, raw, label, replaceId) => lcu.importPage(raw, label, replaceId).catch((err) => ({ ok: false, error: String(err && err.message || err) })));
// Les stats du matchup s'ouvrent dans une fenêtre FIRE à part (le site ne se laisse pas intégrer dans une page).
let statsWin = null;
const STATS_OK = /^https:\/\/(www\.)?lolalytics\.com\//;
ipcMain.handle('lcu:stats', (e, url) => {
  if (!STATS_OK.test(String(url || ''))) return false;
  if (!statsWin || statsWin.isDestroyed()) {
    statsWin = new BrowserWindow({ width: 1240, height: 900, title: 'FIRE LoL · Stats du matchup', backgroundColor: '#0f0d0c', autoHideMenuBar: true,
      icon: path.join(__dirname, 'assets', 'fire.ico'), webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    statsWin.webContents.setWindowOpenHandler(({ url: u }) => { if (/^https:\/\//.test(u)) shell.openExternal(u); return { action: 'deny' }; });
    statsWin.webContents.on('will-navigate', (ev, u) => { if (!STATS_OK.test(u)) { ev.preventDefault(); if (/^https:\/\//.test(u)) shell.openExternal(u); } });
    statsWin.on('closed', () => { statsWin = null; });
  }
  statsWin.loadURL(url).catch(() => {});
  statsWin.show(); statsWin.focus();
  return true;
});

// Raccourcis clavier du salon vocal : enregistrés auprès de Windows, ils marchent aussi en pleine partie.
// L'app ne les réserve que pendant un appel (sauf « rejoindre »), pour ne pas bloquer ces touches ailleurs.
ipcMain.handle('keys:set', (e, map) => {
  globalShortcut.unregisterAll();
  const bad = [];
  for (const [act, acc] of Object.entries(map || {})) {
    if (!acc || typeof acc !== 'string' || !/^[A-Za-z0-9+]{1,40}$/.test(acc)) continue;
    try {
      const ok = globalShortcut.register(acc, () => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('keys:hit', act); });
      if (!ok) bad.push(act);
    } catch (err) { bad.push(act); }
  }
  return { ok: true, bad };
});
app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch (e) { /* déjà fermé */ } });

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
const PUZ_URL = 'https://toka120.github.io/fire-team-lol/puzzles-draft.json';
ipcMain.handle('puzzles:draft', async () => (await remoteJson(PUZ_URL, 'puzzles-draft.json')) || { puzzles: [] });
ipcMain.handle('guides', async () => (await remoteJson(GUIDES_URL, 'guides.json')) || { themes: [] });
// Patch notes : version en ligne (à jour même avant d'installer), sinon la copie livrée avec l'application.
ipcMain.handle('patchnotes', async () => {
  const r = await remoteJson(PATCH_URL, 'patchnotes.json');
  if (r && Array.isArray(r.versions)) return r;
  try { return require('./patchnotes.json'); } catch (e) { return { versions: [] }; }
});

// ---------- Patch notes officiels de League of Legends (leagueoflegends.com, en français) ----------
// La page publique contient ses données en JSON (__NEXT_DATA__) : on en tire la liste des patchs et le texte de chaque patch.
const RIOT_SITE = 'https://www.leagueoflegends.com';
async function riotPage(p) {
  const r = await fetch(RIOT_SITE + p, { headers: { 'User-Agent': 'Mozilla/5.0 (FIRE LoL)', 'Accept-Language': 'fr-FR,fr;q=0.9' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const m = (await r.text()).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('page illisible');
  return JSON.parse(m[1]);
}
ipcMain.handle('lolpatch:list', async () => {
  try {
    const j = await riotPage('/fr-fr/news/tags/patch-notes/');
    const out = [], seen = new Set();
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(walk); return; }
      const url = o.action && o.action.payload && o.action.payload.url;
      if (typeof o.title === 'string' && typeof url === 'string' && /^\/fr-fr\/news\/game-updates\/[a-z0-9-]+\/?$/.test(url) && /patch/i.test(o.title) && !seen.has(url)) {
        seen.add(url);
        out.push({ title: o.title, url, date: (o.analytics && o.analytics.publishDate) || o.publishedAt || '',
          img: (o.media && o.media.url) || '', desc: (o.description && o.description.body) || '' });
      }
      for (const k of Object.keys(o)) walk(o[k]);
    };
    walk(j);
    out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const items = out.slice(0, 30);
    if (items.length) { try { fs.writeFileSync(cachePath('lolpatch.json'), JSON.stringify(items)); } catch (e) { /* ignore */ } }
    return { ok: true, items };
  } catch (e) {
    let items = [];
    try { items = JSON.parse(fs.readFileSync(cachePath('lolpatch.json'), 'utf8')); } catch (err) { /* rien en cache */ }
    return { ok: false, error: String((e && e.message) || e).slice(0, 120), items };
  }
});
ipcMain.handle('lolpatch:get', async (e, url) => {
  if (typeof url !== 'string' || !/^\/fr-fr\/news\/game-updates\/[a-z0-9-]+\/?$/.test(url)) return { ok: false, error: 'lien invalide' };
  try {
    const j = await riotPage(url);
    const blades = (((j.props || {}).pageProps || {}).page || {}).blades || [];
    const head = blades.find((b) => b.type === 'articleMasthead') || {};
    const rich = blades.find((b) => b.richText && b.richText.body);
    if (!rich) return { ok: false, error: 'contenu introuvable', link: RIOT_SITE + url };
    return { ok: true, title: head.title || '', date: head.publishDate || '', desc: (head.description && head.description.body) || '',
      banner: (head.banner && head.banner.url) || '', html: rich.richText.body, link: RIOT_SITE + url };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err).slice(0, 120), link: RIOT_SITE + url };
  }
});

coach.init(() => lastCfg || {});
ipcMain.handle('unlock', (e, code) => coach.unlock(code));
ipcMain.handle('unlocked', () => coach.isUnlocked());
ipcMain.handle('coach:state', () => coach.coachState());
ipcMain.handle('coach:unlock', (e, code) => coach.coachUnlock(code));
ipcMain.handle('coach:leave', () => coach.coachLeave());
ipcMain.handle('chef:unlock', (e, code) => coach.chefUnlock(code));
ipcMain.handle('chef:leave', () => coach.chefLeave());
ipcMain.handle('coach:save', (e, keys) => coach.coachSave(keys || {}));
ipcMain.handle('coach:generate', (e, req) => coach.generate(req || {}));
ipcMain.handle('coach:message', (e, m) => coach.message(m || {}));
ipcMain.handle('coach:publish', (e, fiche) => coach.publish(fiche));
ipcMain.handle('coach:unpublish', (e, id) => coach.unpublish(id));
ipcMain.handle('fiches', () => coach.list());
ipcMain.handle('pools', () => coach.pools());
ipcMain.handle('coach:savePools', (e, action) => coach.savePools(action || {}));
ipcMain.handle('planning', () => coach.planning());
ipcMain.handle('chat', () => coach.chat());
ipcMain.handle('chat:send', (e, m) => coach.chatSend(m || {}));
ipcMain.handle('planning:save', (e, action) => coach.savePlanning(action || {}));
ipcMain.handle('bug:send', (e, b) => coach.sendBug(b || {}));
ipcMain.handle('bug:list', () => coach.listBugs());
ipcMain.handle('bug:close', (e, id) => coach.closeBug(id));
ipcMain.handle('champions', () => coach.champions());
ipcMain.handle('jeux:data', () => jeux.data());
ipcMain.handle('jeux:lore', (e, slug) => jeux.lore(slug));
ipcMain.handle('worlds:season', (e, y, force) => worlds.season(y, !!force));

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
async function grab(puuid, cutoff, maxPages) {
  const F = ['championName', 'win', 'opponentChampionName', 'lane', 'kills', 'deaths', 'assists', 'killParticipation',
    'totalMinionsKilled', 'neutralMinionsKilled', 'goldPerMinute', 'damagePerMinute', 'teamDamagePercentage',
    'visionScorePerMinute', 'controlWardsPlaced', 'stealthWardsPlaced', 'wardTakedowns', 'csDiffAt15', 'goldDiffAt15',
    'xpDiffAt15', 'jungleCsBefore10Minutes', 'laneMinionsFirst10Minutes', 'scuttleCrabKills', 'soloKills',
    'turretPlatesTaken', 'dragon', 'horde', 'dpmScore'];
  const matches = [];
  for (let page = 1; page <= (maxPages || 14); page++) {
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
    // Jusqu'à 70 pages de 15 games pour un joueur dont on veut toute l'année (stats_depuis), 14 sinon.
    const pages = Math.max(1, Math.min(70, Number(player.pages) || 14));
    const data = await win.webContents.executeJavaScript(`(${grab.toString()})(${JSON.stringify(puuid)}, ${cutoff}, ${pages})`);
    return { ok: true, puuid, at: Date.now(), ...data };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  } finally {
    captured.delete(id);
    if (!win.isDestroyed()) win.destroy();
  }
}

ipcMain.handle('dpm:fetch', (e, player, days) => fetchPlayer(player, days || 31));

// ---------- Stats de l'équipe : détail des flex jouées ensemble ----------
// Une partie terminée ne change plus : on garde chaque résumé dans team.json et on ne relit que les nouvelles.
const TEAM_CACHE = 'team.json';
let teamBusy = null;
function readTeamCache() {
  try { return JSON.parse(fs.readFileSync(cachePath(TEAM_CACHE), 'utf8')) || {}; } catch (e) { return {}; }
}

async function fetchTeam(reqs) {
  const cache = readTeamCache();
  const todo = (reqs || []).filter((r) => r && r.id && r.puuid && !(cache[r.id] && !cache[r.id].err)).slice(0, 40);
  if (todo.length) {
    const win = new BrowserWindow({ show: false, width: 1280, height: 900,
      webPreferences: { session: dpmSession(), backgroundThrottling: false, contextIsolation: true, sandbox: true } });
    win.webContents.setAudioMuted(true);
    try {
      await win.loadURL(DPM).catch(() => { /* la page peut se recharger (protection anti-robot) */ });
      await sleep(2500);
      // Le détail d'une partie se demande avec l'identifiant d'un joueur qui l'a jouée.
      const byPuuid = {};
      for (const r of todo) (byPuuid[r.puuid] = byPuuid[r.puuid] || []).push(String(r.id));
      for (const [puuid, ids] of Object.entries(byPuuid)) {
        const got = await win.webContents.executeJavaScript(`(${teamGrab.toString()})(${JSON.stringify(puuid)}, ${JSON.stringify(ids)}, 'EUW1')`).catch(() => ({}));
        for (const [id, g] of Object.entries(got || {})) if (g && !g.err) cache[id] = g;
      }
      try { fs.writeFileSync(cachePath(TEAM_CACHE), JSON.stringify(cache)); } catch (e) { /* ignore */ }
    } finally {
      if (!win.isDestroyed()) win.destroy();
    }
  }
  return { ok: true, games: cache, read: todo.length };
}

ipcMain.handle('dpm:team', async (e, reqs) => {
  if (teamBusy) await teamBusy.catch(() => {});
  teamBusy = fetchTeam(reqs).catch((err) => ({ ok: false, error: String((err && err.message) || err), games: readTeamCache() }));
  return teamBusy;
});

// ---------- Mise à jour automatique de l'application ----------
// La version installée (FIRE-LoL-Setup.exe) vérifie les Releases GitHub au lancement puis toutes les 30 minutes,
// télécharge la nouvelle version en arrière-plan et l'installe en redémarrant. La version portable ne peut pas
// se mettre à jour seule : elle affiche un lien de téléchargement.

const portable = !!process.env.PORTABLE_EXECUTABLE_DIR;
// Version Microsoft Store : c'est le Store qui installe les mises à jour (règle du Store), FIRE ne se met pas à jour tout seul.
const store = !!process.windowsStore;
const canAutoUpdate = () => !!autoUpdater && app.isPackaged && !portable && !store;
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
  autoUpdater.on('error', (e) => onUpdateError(e));
  setTimeout(safeCheck, 1500);
  setInterval(safeCheck, 30 * 60 * 1000);
}

// Une seule recherche de mise à jour à la fois : deux téléchargements en parallèle se disputent le même fichier
// (« EPERM: operation not permitted, rename … FIRE-LoL-Setup.exe »).
let checking = false;
let fileRetries = 0;
async function safeCheck() {
  if (!canAutoUpdate() || checking) return null;
  if (['checking', 'available', 'progress', 'ready'].includes(updateState.state)) return null;
  checking = true;
  try { return await autoUpdater.checkForUpdates(); } catch (e) { return null; /* l'erreur passe par onUpdateError */ } finally { checking = false; }
}
// Dossier où electron-updater prépare l'installeur : %LOCALAPPDATA%\fire-lol-updater\pending
function pendingDir() {
  const local = process.env.LOCALAPPDATA || path.join(require('os').homedir(), 'AppData', 'Local');
  return path.join(local, 'fire-lol-updater', 'pending');
}
function onUpdateError(e) {
  const raw = String((e && e.message) || e);
  // Fichier bloqué (antivirus qui analyse l'installeur, ancien téléchargement encore ouvert) : on vide le dossier
  // de préparation et on recommence tout seul, jusqu'à 3 fois.
  if (/EPERM|EBUSY|EACCES|operation not permitted|resource busy/i.test(raw) && fileRetries < 3) {
    fileRetries++;
    sendUpdate({ state: 'retry', error: `Windows ou l'antivirus bloque le fichier de mise à jour : nouvel essai automatique (${fileRetries}/3)…`, raw: raw.slice(0, 200) });
    setTimeout(() => {
      try { fs.rmSync(pendingDir(), { recursive: true, force: true }); } catch (err) { /* encore bloqué : on réessaiera */ }
      updateState.state = 'idle';
      safeCheck();
    }, 8000 * fileRetries);
    return;
  }
  const blocked = /EPERM|EBUSY|EACCES|operation not permitted/i.test(raw);
  const offline = /ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|net::ERR/i.test(raw);
  sendUpdate({
    state: 'error',
    error: blocked ? "La mise à jour automatique n'a pas pu se préparer (fichier bloqué par Windows ou l'antivirus). Télécharge l'installeur avec le bouton ci-dessous, ou redémarre l'ordinateur puis réessaie."
      : offline ? 'Pas de connexion à GitHub pour le moment : nouvel essai automatique plus tard.'
        : 'La vérification a échoué : nouvel essai automatique plus tard.',
    raw: raw.slice(0, 200)
  });
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
ipcMain.handle('update:state', async () => ({ ...updateState, auto: canAutoUpdate(), portable, store, latest: store ? null : await latestTag() }));
ipcMain.handle('notify', (e, m) => notify(String((m && m.title) || 'FIRE LoL').slice(0, 120), String((m && m.body) || '').slice(0, 300), m && m.section));
ipcMain.handle('bg:get', () => ({ ...bgPrefs(), startup: startupOn(), canStartup: app.isPackaged && process.platform !== 'linux' && !store, notif: Notification.isSupported() }));
ipcMain.handle('bg:set', (e, m) => {
  const cur = bgPrefs();
  if (m && typeof m.bg === 'boolean') {
    cur.bg = m.bg;
    try { fs.writeFileSync(bgPath(), JSON.stringify(cur)); } catch (err) { /* ignore */ }
    if (!cur.bg) dropTray();
  }
  if (m && typeof m.startup === 'boolean' && app.isPackaged) {
    try { app.setLoginItemSettings({ openAtLogin: m.startup, path: exePath(), args: ['--hidden'] }); } catch (err) { /* ignore */ }
  }
  return { ...bgPrefs(), startup: startupOn(), canStartup: app.isPackaged && process.platform !== 'linux' && !store, notif: Notification.isSupported() };
});
app.on('before-quit', () => { quitting = true; });

// Partie de LoL (ou sélection des champions) en cours sur ce PC : jamais de mise à jour automatique à ce moment-là.
let lolBusyAt = 0, lolBusyVal = false;
async function lolBusy() {
  if (Date.now() - lolBusyAt < 10000) return lolBusyVal;
  lolBusyAt = Date.now();
  try { const d = await lcu.draft(); lolBusyVal = ['ChampSelect', 'InProgress', 'GameStart', 'ReadyCheck', 'Reconnect'].includes(d.phase); } catch (e) { lolBusyVal = false; }
  return lolBusyVal;
}
ipcMain.handle('update:install', async (e, opts) => {
  if (!(canAutoUpdate() && updateState.state === 'ready')) return false;
  const user = !!(opts && opts.user);
  if (!user && await lolBusy()) return false;
  // « quiet » : l'app est cachée ou réduite. On installe, et la nouvelle version revient cachée.
  if (opts && opts.quiet && mainWin && !mainWin.isDestroyed() && mainWin.isVisible() && !mainWin.isMinimized()) return false;
  const mode = user ? 'show' : opts && opts.quiet ? 'tray' : 'min';
  try { fs.writeFileSync(quietPath(), JSON.stringify({ t: Date.now(), mode })); } catch (err) { /* ignore */ }
  quitting = true; setImmediate(() => autoUpdater.quitAndInstall(true, true)); return true;
});
// Bouton « Installer la dernière version » de l'onglet Paramètres.
ipcMain.handle('update:check', async () => {
  const latest = await latestTag();
  if (store) return { ok: true, auto: false, store: true, latest: null };
  if (!canAutoUpdate()) return { ok: true, auto: false, latest };
  if (['ready', 'progress', 'available', 'checking', 'retry'].includes(updateState.state) || checking) return { ok: true, auto: true, latest, state: updateState.state };
  // Le bouton relance aussi après une erreur de fichier bloqué : on repart d'un dossier de préparation vide.
  if (updateState.state === 'error') { fileRetries = 0; try { fs.rmSync(pendingDir(), { recursive: true, force: true }); } catch (e) { /* ignore */ } updateState.state = 'idle'; }
  const r = await safeCheck();
  if (updateState.state === 'error') return { ok: false, auto: true, latest, error: updateState.error };
  return { ok: true, auto: true, latest, found: r && r.updateInfo ? r.updateInfo.version : null };
});

// ---------- Démarrage ----------

const single = app.requestSingleInstanceLock();
if (!single) {
  app.quit();
} else {
  // Windows n'affiche les notifications que si l'application a un identifiant (le même que l'installeur).
  // La version Store a déjà son identité Windows (notifications) : on ne la remplace pas.
  if (process.platform === 'win32' && !store) app.setAppUserModelId('lol.fire.team');
  // Un 2e lancement par Windows (démarrage auto) ne doit pas afficher la fenêtre : seulement un double-clic du joueur.
  app.on('second-instance', (e, argv) => { if (!(argv || []).includes('--hidden')) showMain(); });
  app.whenReady().then(() => { lockPermissions(); blockAds(); screenShare(); createMainWindow(); setupUpdater(); });
  app.on('window-all-closed', () => { if (!bgPrefs().bg || quitting) app.quit(); });
}
