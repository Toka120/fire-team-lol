// FIRE LoL - application de bureau (Electron).
// Lit les stats des joueurs sur dpm.lol dans une fenêtre cachée, puis les affiche.

const { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Notification, Tray, Menu, desktopCapturer, globalShortcut, screen } = require('electron');
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
    tray.setContextMenu(trayMenu());
    if (inVoice) tray.setToolTip('FIRE LoL · en vocal');
    tray.on('click', showMain);
  } catch (e) { tray = null; }
}
function dropTray() { if (tray) { tray.destroy(); tray = null; } }
// En vocal, fermer la fenêtre ne coupe pas l'appel (comme Discord) : FIRE se range près de l'horloge.
let inVoice = false;
ipcMain.on('vocal:on', (e, on) => {
  inVoice = !!on;
  if (tray) tray.setToolTip(inVoice ? 'FIRE LoL · en vocal' : 'FIRE LoL');
  if (tray) tray.setContextMenu(trayMenu());
});
function trayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Ouvrir FIRE LoL', click: showMain },
    ...(inVoice ? [{ label: 'Quitter le vocal', click: () => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('vocal:leave'); } }] : []),
    { type: 'separator' },
    { label: 'Quitter FIRE LoL', click: () => { quitting = true; app.quit(); } }
  ]);
}
function notify(title, body, section, silent) {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, icon: path.join(__dirname, 'assets', 'fire.png'), silent: !!silent });
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

// Écran (moniteur) où FIRE s'ouvre : 'last' (là où il était fermé, par défaut), 'primary' (écran principal) ou l'id d'un écran.
const winPath = () => path.join(app.getPath('userData'), 'fenetre.json');
function winPrefs() { try { return { display: 'last', ...JSON.parse(fs.readFileSync(winPath(), 'utf8')) }; } catch (e) { return { display: 'last' }; } }
function saveWinPrefs(p) { try { fs.writeFileSync(winPath(), JSON.stringify(p)); } catch (e) { /* facultatif */ } }
function displayList() {
  const prim = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d, i) => ({ id: String(d.id), n: i + 1, primary: d.id === prim, w: d.size.width, h: d.size.height, label: d.label || '' }));
}
// Fenêtre centrée sur un écran donné (taille d'origine, réduite si l'écran est petit).
function boundsOn(d) {
  const a = d.workArea;
  const w = Math.min(1320, a.width - 40), h = Math.min(880, a.height - 40);
  return { x: Math.round(a.x + (a.width - w) / 2), y: Math.round(a.y + (a.height - h) / 2), width: w, height: h };
}
function startBounds() {
  const p = winPrefs();
  const all = screen.getAllDisplays();
  if (p.display === 'primary') return { b: boundsOn(screen.getPrimaryDisplay()) };
  if (p.display && p.display !== 'last') { const d = all.find((x) => String(x.id) === String(p.display)); if (d) return { b: boundsOn(d) }; }
  // Dernière position, si elle est encore visible sur un écran branché.
  const b = p.bounds;
  if (b && all.some((d) => { const a = d.workArea; return b.x + 100 < a.x + a.width && b.x + b.width - 100 > a.x && b.y + 40 < a.y + a.height && b.y >= a.y - 20; })) return { b: { x: b.x, y: b.y, width: b.width, height: b.height }, max: !!b.max };
  return { b: null };
}
function trackBounds(win) {
  let t = null;
  const keep = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (!win || win.isDestroyed() || win.isMinimized() || !win.isVisible()) return;
      const max = win.isMaximized();
      const b = max ? (winPrefs().bounds || win.getNormalBounds()) : win.getBounds();
      saveWinPrefs({ ...winPrefs(), bounds: { ...(max ? win.getNormalBounds() : b), max } });
    }, 600);
  };
  win.on('move', keep); win.on('resize', keep); win.on('maximize', keep); win.on('unmaximize', keep);
}
ipcMain.handle('window:displays', () => ({ list: displayList(), current: winPrefs().display || 'last',
  here: mainWin && !mainWin.isDestroyed() ? String(screen.getDisplayMatching(mainWin.getBounds()).id) : null }));
ipcMain.handle('window:setDisplay', (e, id) => {
  const v = id === 'primary' || id === 'last' ? id : String(id || 'last');
  saveWinPrefs({ ...winPrefs(), display: v });
  // On y va tout de suite (sauf « dernière position » : la fenêtre reste où elle est).
  if (v !== 'last' && mainWin && !mainWin.isDestroyed()) {
    const d = v === 'primary' ? screen.getPrimaryDisplay() : screen.getAllDisplays().find((x) => String(x.id) === v);
    if (d) { if (mainWin.isMaximized()) mainWin.unmaximize(); mainWin.setBounds(boundsOn(d)); }
  }
  return true;
});

function createMainWindow(forceShow) {
  // Lancement avec Windows ou relance discrète : FIRE démarre caché (icône près de l'horloge),
  // pour ne jamais s'afficher par-dessus une partie en cours.
  const mode = forceShow ? null : relaunchMode();
  const hidden = !forceShow && (startHidden || mode === 'tray');
  const minimized = !hidden && mode === 'min';
  const sb = startBounds();
  mainWin = new BrowserWindow({
    show: !hidden && !minimized,
    width: 1320,
    height: 880,
    ...(sb.b || {}),
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#0B0D10',
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
  // Agrandie en plein écran si elle l'était, sans jamais faire apparaître une fenêtre censée rester cachée.
  // « Ne répond pas » : on note quand et combien de temps (diagnostic.log), et si l'affichage reste bloqué 20 s,
  // FIRE le recharge tout seul plutôt que de laisser une fenêtre figée.
  let hangAt = 0, hangTimer = null;
  const diag = (line) => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'diagnostic.log'), `${new Date().toISOString()} ${line}\n`); } catch (e) { /* */ } };
  mainWin.on('unresponsive', () => {
    hangAt = Date.now(); diag('affichage bloqué');
    clearTimeout(hangTimer);
    hangTimer = setTimeout(() => { if (hangAt && mainWin && !mainWin.isDestroyed()) { diag('rechargement après 20 s bloqué'); mainWin.webContents.forcefullyCrashRenderer(); mainWin.webContents.reload(); } }, 20000);
  });
  mainWin.on('responsive', () => { if (hangAt) diag(`débloqué après ${Math.round((Date.now() - hangAt) / 1000)} s`); hangAt = 0; clearTimeout(hangTimer); });
  mainWin.webContents.on('render-process-gone', (e, d) => { diag('affichage arrêté : ' + (d && d.reason)); if (d && d.reason !== 'clean-exit' && mainWin && !mainWin.isDestroyed()) setTimeout(() => { try { mainWin.webContents.reload(); } catch (err) { /* */ } }, 1500); });
  if (sb.max) { if (!hidden && !minimized) mainWin.maximize(); else mainWin.once('show', () => { try { mainWin.maximize(); } catch (e) { /* */ } }); }
  trackBounds(mainWin);
  if (hidden) ensureTray();
  // Relance après une mise à jour automatique : la fenêtre revient réduite dans la barre des tâches,
  // sans prendre la main (on ne passe jamais devant un jeu).
  if (minimized) { ensureTray(); mainWin.once('ready-to-show', () => { try { mainWin.minimize(); } catch (e) { /* */ } }); }
  // Avec l'arrière-plan activé, fermer la fenêtre la cache seulement : FIRE reste près de l'horloge.
  // Arrêt ou redémarrage de Windows : FIRE se ferme normalement.
  mainWin.on('session-end', () => { quitting = true; });
  mainWin.on('close', (e) => {
    if (quitting || (!bgPrefs().bg && !inVoice)) return;
    // Fenêtre déjà cachée : la demande de fermeture vient de Windows ou de l'installeur, pas du joueur.
    // On quitte vraiment, sinon l'installeur ne peut pas remplacer les fichiers.
    if (!mainWin.isVisible()) { quitting = true; dropTray(); setImmediate(() => app.quit()); return; }
    e.preventDefault();
    mainWin.hide();
    ensureTray();
    if (inVoice) { notify('Tu es toujours en vocal', 'FIRE est rangé près de l’horloge : l’appel continue. Clic droit sur l’icône FIRE pour quitter le vocal ou FIRE.', null, true); return; }
    if (!trayHintShown) { trayHintShown = true; notify('FIRE LoL reste ouvert', "Tu recevras les notifications ici. Clic droit sur l'icône FIRE près de l'horloge pour quitter."); }
  });
  hideAdSlots(mainWin.webContents);
  mainWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Les liens (op.gg, YouTube, dpm.lol, mid.gg…) s'ouvrent DANS FIRE, dans le navigateur intégré : on reste sur l'application.
  // Seuls les téléchargements d'installeur passent par le navigateur de Windows.
  mainWin.webContents.setWindowOpenHandler(({ url }) => { openLink(url); return { action: 'deny' }; });
  mainWin.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); openLink(url); }
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
  'cookielaw.org', 'quantcast.com', 'consensu.org', 'snigelweb.com', 'ezoic.net', 'venatusmedia.com', 'playwire.com', 'nitropay.com',
  // Régies des sites de stats LoL (one-tricks, builds, tier lists…) et des grands réseaux vidéo/natifs.
  'adthrive.com', 'cafemedia.com', 'raptive.com', 'mediavine.com', 'freestar.com', 'freestar.io', 'pbxai.com', 'aniview.com', 'primis.tech',
  'connatix.com', 'vidazoo.com', 'seedtag.com', 'indexww.com', 'adform.net', 'bidswitch.net', '3lift.com', 'triplelift.com', 'gumgum.com',
  'kargo.com', 'undertone.com', 'richaudience.com', 'onetag-sys.com', 'smilewanted.com', 'adyoulike.com', 'e-planning.net', 'adkernel.com',
  'betweendigital.com', 'improvedigital.com', '360yield.com', 'unrulymedia.com', 'spotxchange.com', 'springserve.com', 'stickyadstv.com',
  'mgid.com', 'revcontent.com', 'nativo.com', 'zergnet.com', 'adpushup.com', 'setupad.net', 'adscale.de', 'yieldlove.com', 'yieldlove-ad-serving.net',
  'adalliance.io', 'asadcdn.com', 'ad-delivery.net', 'admixer.net', 'adtelligent.com', 'sonobi.com', 'emxdgt.com', 'contextweb.com', 'lkqd.net',
  'adition.com', 'ogury.io', 'presage.io', 'tremorhub.com', 'adrta.com', 'doubleverify.com', 'adsafeprotected.com', 'confiant-integrations.net',
  'fwmrm.net', 'adsco.re', 'ad-score.com', 'enthusiastgaming.net', 'pubnation.com', 'adnuntius.com', 'sascdn.com', 'servedbyadbutler.com',
  'adbutler.com', 'carbonads.com', 'carbonads.net', 'buysellads.com', 'buysellads.net', 'ads.yahoo.com', 'advertising.com', 'yieldmanager.com',
  'pubfuture-ad.com', 'adsterra.com', 'propellerads.com', 'popads.net', 'popcash.net', 'exoclick.com', 'juicyads.com', 'hilltopads.net',
  'a-ads.com', 'coinzilla.com', 'bidvertiser.com', 'clickadu.com', 'adcash.com', 'monetag.com', 'galaksion.com', 'trafficjunky.net',
  'snack-media.com', 'snackmedia.net', 'bannerflow.com', 'adsby.bidtheatre.com', 'bidtheatre.com', 'admanmedia.com', 'adagio.io', 'minutemedia-prebid.com',
  'aps.amazon-adsystem.com', 'c.amazon-adsystem.com', 'ads.pubmatic.com', 'cdn.adsafeprotected.com', 'micro.rubiconproject.com', 'prebid.org'];
const isAdHost = (h) => AD_HOSTS.some((d) => h === d || h.endsWith('.' + d));
const AD_CSS = '[id^="div-gpt-ad"],[id*="google_ads_iframe"],[class*="adthrive"],[id*="adthrive"],[class*="ad-slot"],[class*="AdSlot"],[class*="ad_slot"],[class*="adSlot"],[id*="ad-slot"],[class*="ad-banner"],[class*="AdBanner"],[class*="ad-wrapper"],[class*="AdWrapper"],[class*="ads-wrapper"],[class*="ad-unit"],[class*="adunit"],[class*="sponsored-ad"],[data-ad-slot],[data-ad-unit],[data-adunit],[data-google-query-id],[aria-label="Advertisement"],[aria-label="Publicité"],[id^="nitropay"],[class*="nitropay"],[id^="nn_"],[class*="venatus"],[id*="venatus"],[class*="vm-placement"],[id^="pw-"],[class*="playwire"],[class*="fs-sticky"],[class*="freestar"],[id*="freestar"],[class*="mv-ad"],[class*="ezoic"],[id^="ezoic"],[class*="sticky-ad"],[class*="StickyAd"],[class*="video-ad"],[class*="primis"],[id*="primis"],[class*="aniview"],[class*="connatix"],[class*="ad-placeholder"],[class*="adPlaceholder"],' + 'ins.adsbygoogle,.adsbygoogle,[id*="-com_300x250"],[id*="-com_728x90"],[id*="-com_160x600"],[id*="_300x250"],[id*="_728x90"],[id*="_160x600"],[class*="ad-container"],[id^="aip_"],iframe[src*="googlesyndication"],iframe[src*="doubleclick"]{display:none!important}';
// Navigateur intégré (liens, outils) : aucune pub. Bloqueur Ghostery (listes EasyList, EasyPrivacy, uBlock et
// « gênes » comme les bandeaux de cookies), mis à jour au lancement et gardé en cache ; nos régies en plus.
// Sans connexion la première fois : on se rabat sur notre propre liste de régies.
let adWebOn = false;
function adFallback(s) {
  s.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => {
    let host = '';
    try { host = new URL(d.url).hostname; } catch (e) { /* */ }
    cb({ cancel: !!host && isAdHost(host) && d.resourceType !== 'mainFrame' });
  });
}
async function adblockWeb() {
  if (adWebOn) return; adWebOn = true;
  const s = session.fromPartition('persist:fire-web');
  try {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron');
    const cache = path.join(app.getPath('userData'), 'adblock-engine.bin');
    let blocker = null;
    try { blocker = await ElectronBlocker.fromPrebuiltFull(fetch, { path: cache, read: fs.promises.readFile, write: fs.promises.writeFile }); }
    catch (e) { const buf = await fs.promises.readFile(cache).catch(() => null); if (buf) blocker = ElectronBlocker.deserialize(new Uint8Array(buf)); }
    if (!blocker) throw new Error('listes indisponibles');
    try { blocker.updateFromDiff({ added: AD_HOSTS.map((h) => '||' + h + '^$third-party') }); } catch (e) { /* */ }
    blocker.enableBlockingInSession(s);
  } catch (e) {
    try { adFallback(s); } catch (x) { /* */ }
  }
}
function blockAdsWeb(wc) {
  const css = AD_CSS;
  wc.on('dom-ready', () => { wc.insertCSS(css, { cssOrigin: 'user' }).catch(() => {}); });
  hideAdSlots(wc);
}
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
// Les stats LoLalytics s'ouvrent aussi dans le navigateur intégré de FIRE.
ipcMain.handle('lcu:stats', (e, url) => openLink(url));

// ---------- Navigateur intégré : les pages web s'affichent dans FIRE, sous la barre de FIRE ----------
// Une vue web posée sur la zone de contenu de la fenêtre (le renderer donne la place exacte et la barre d'outils).
// Pas d'accès à FIRE ni au PC depuis ces pages : bac à sable, session séparée, aucune autorisation sauf le plein écran.
let webView = null;
const WEB_OK = /^https?:\/\//i;
const isInstaller = (u) => /\.(exe|msi|msix|appx|zip)(\?|#|$)/i.test(u) || /\/releases\/(latest\/)?download\//.test(u);
function webState() {
  if (!webView || !mainWin || mainWin.isDestroyed()) return;
  const wc = webView.webContents;
  mainWin.webContents.send('web:state', { url: wc.getURL(), title: wc.getTitle(), loading: wc.isLoading(),
    back: wc.navigationHistory.canGoBack(), fwd: wc.navigationHistory.canGoForward() });
}
function ensureWebView() {
  if (webView && !webView.webContents.isDestroyed()) return webView;
  const ses = session.fromPartition('persist:fire-web');
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'fullscreen'));
  webView = new WebContentsView({ webPreferences: { partition: 'persist:fire-web', sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: true } });
  webView.setBackgroundColor('#0B0D10');
  const wc = webView.webContents;
  blockAdsWeb(wc);
  wc.setWindowOpenHandler(({ url }) => { if (isInstaller(url)) shell.openExternal(url); else if (WEB_OK.test(url)) wc.loadURL(url).catch(() => {}); return { action: 'deny' }; });
  wc.on('will-navigate', (e, url) => { if (!WEB_OK.test(url)) e.preventDefault(); });
  ['did-start-loading', 'did-stop-loading', 'page-title-updated', 'did-navigate', 'did-navigate-in-page'].forEach((ev) => wc.on(ev, webState));
  wc.on('did-fail-load', (e, code, desc, url, main) => { if (main && code !== -3 && mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('web:state', { url, title: '', loading: false, error: desc || 'page introuvable' }); });
  return webView;
}
function openLink(url) {
  url = String(url || '');
  if (!WEB_OK.test(url)) return false;
  if (isInstaller(url)) { shell.openExternal(url); return true; }
  if (!mainWin || mainWin.isDestroyed()) return false;
  mainWin.webContents.send('web:open', url);
  return true;
}
ipcMain.handle('web:load', (e, url, rect) => {
  if (!WEB_OK.test(String(url || '')) || !mainWin || mainWin.isDestroyed()) return false;
  const v = ensureWebView();
  if (!mainWin.contentView.children.includes(v)) mainWin.contentView.addChildView(v);
  if (rect) v.setBounds(rect);
  v.webContents.loadURL(url).catch(() => {});
  return true;
});
ipcMain.handle('web:bounds', (e, rect) => {
  if (!webView || !rect) return;
  const r = { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.max(0, Math.round(rect.width)), height: Math.max(0, Math.round(rect.height)) };
  webView.setBounds(r);
});
ipcMain.handle('web:nav', (e, a) => {
  if (!webView) return;
  const wc = webView.webContents, h = wc.navigationHistory;
  if (a === 'back' && h.canGoBack()) h.goBack();
  if (a === 'fwd' && h.canGoForward()) h.goForward();
  if (a === 'reload') wc.reload();
  if (a === 'stop') wc.stop();
});
// Cacher la page (une fenêtre de FIRE passe par-dessus) ou la fermer (retour à FIRE).
ipcMain.handle('web:hide', (e, on) => { if (!webView || !mainWin || mainWin.isDestroyed()) return; if (on) mainWin.contentView.removeChildView(webView); else if (!mainWin.contentView.children.includes(webView)) mainWin.contentView.addChildView(webView); });
ipcMain.handle('web:close', () => {
  if (!webView) return;
  try { if (mainWin && !mainWin.isDestroyed()) mainWin.contentView.removeChildView(webView); } catch (err) { /* */ }
  try { webView.webContents.close(); } catch (err) { /* */ }
  webView = null;
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
const TIER_URL = 'https://toka120.github.io/fire-team-lol/tierlist.json';
// ---------- Partie en direct : API locale officielle de Riot (Live Client Data, port 2999, seulement pendant une partie) ----------
// Lecture seule, sur ce PC uniquement : aucune lecture de la mémoire du jeu, rien d'injecté (compatible Vanguard).
// Le certificat de cette API est auto-signé par Riot : on l'accepte seulement pour 127.0.0.1:2999.
function liveClient() {
  return new Promise((ok) => {
    const req = require('https').get({ host: '127.0.0.1', port: 2999, path: '/liveclientdata/allgamedata', rejectUnauthorized: false, timeout: 2500 }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c) => { b += c; if (b.length > 2e6) req.destroy(); });
      res.on('end', () => { try { ok(res.statusCode === 200 ? JSON.parse(b) : null); } catch (e) { ok(null); } });
    });
    req.on('timeout', () => req.destroy()); req.on('error', () => ok(null));
  });
}
// Le mode exact (Classée Solo/Duo, Flex, Normale, ARAM…) vient du client League sur ce PC (API locale, fichier « lockfile »).
// Lecture seule, comme Porofessor ou Blitz : rien d'injecté, rien lu dans la mémoire du jeu.
const LCU = { port: 0, pass: '', at: 0, queue: null, qAt: 0 };
function lcuFind() {
  if (process.platform !== 'win32') return null;
  const tries = [];
  for (const d of ['C', 'D', 'E', 'F']) tries.push(`${d}:\\Riot Games\\League of Legends\\lockfile`, `${d}:\\Program Files\\Riot Games\\League of Legends\\lockfile`, `${d}:\\Jeux\\Riot Games\\League of Legends\\lockfile`, `${d}:\\Games\\Riot Games\\League of Legends\\lockfile`);
  for (const f of tries) { try { const t = fs.readFileSync(f, 'utf8').split(':'); if (t.length >= 5) return { port: Number(t[2]), pass: t[3] }; } catch (e) { /* */ } }
  return null;
}
function lcuFromProcess() {
  return new Promise((ok) => {
    if (process.platform !== 'win32') return ok(null);
    const cmd = "Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine";
    require('child_process').execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true, timeout: 8000 }, (err, out) => {
      const s = String(out || ''); const port = (s.match(/--app-port=(\d+)/) || [])[1]; const pass = (s.match(/--remoting-auth-token=([\w-]+)/) || [])[1];
      ok(port && pass ? { port: Number(port), pass } : null);
    });
  });
}
function lcuReq(method, p, body) {
  return new Promise((ok) => {
    if (!LCU.port) return ok({ status: 0, data: null });
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = require('https').request({ method, host: '127.0.0.1', port: LCU.port, path: p, rejectUnauthorized: false, timeout: 4000,
      headers: { Authorization: 'Basic ' + Buffer.from('riot:' + LCU.pass).toString('base64'), Accept: 'application/json', ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}) } }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c) => { b += c; if (b.length > 2e6) req.destroy(); });
      res.on('end', () => { let j = null; try { j = b ? JSON.parse(b) : null; } catch (e) { /* */ } ok({ status: res.statusCode, data: j }); });
    });
    req.on('timeout', () => req.destroy()); req.on('error', () => ok({ status: 0, data: null }));
    if (data) req.write(data);
    req.end();
  });
}
async function lcuGet(p) { const r = await lcuReq('GET', p); return r.status === 200 ? r.data : null; }
// Fichier brut servi par le client (sons, images du jeu) : /lol-game-data/assets/…
function lcuRaw(p) {
  return new Promise((ok) => {
    if (!LCU.port) return ok(null);
    const req = require('https').request({ method: 'GET', host: '127.0.0.1', port: LCU.port, path: p, rejectUnauthorized: false, timeout: 6000,
      headers: { Authorization: 'Basic ' + Buffer.from('riot:' + LCU.pass).toString('base64') } }, (res) => {
      const parts = []; let n = 0;
      res.on('data', (c) => { parts.push(c); n += c.length; if (n > 8e6) req.destroy(); });
      res.on('end', () => ok(res.statusCode === 200 ? Buffer.concat(parts) : null));
    });
    req.on('timeout', () => req.destroy()); req.on('error', () => ok(null));
    req.end();
  });
}
// Voix et bruitages des champions (Détente : « Qui a dit ça ? », League of Listen). Gardés sur le PC une fois lus ;
// sinon CommunityDragon, et s'il est en panne, le client LoL lui-même (s'il est ouvert, et en français pour les voix).
// Stream Twitch de l'équipe : en direct ou pas (decapi.me répond « … is offline » ou la durée du live).
ipcMain.handle('twitch:live', async (e, ch) => {
  ch = String(ch || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25); if (!ch) return null;
  try {
    const r = await fetch('https://decapi.me/twitch/uptime/' + ch, { signal: AbortSignal.timeout(8000) });
    const t = (await r.text()).trim().slice(0, 120);
    if (!r.ok || /error|not found/i.test(t)) return null;
    return { live: !/offline/i.test(t), uptime: /offline/i.test(t) ? '' : t };
  } catch (err) { return null; }
});
const voDir = () => path.join(app.getPath('userData'), 'voix');
let VO_CD_DOWN = 0;
ipcMain.handle('vo:get', async (e, kind, key) => {
  kind = String(kind || ''); key = String(key || '');
  if (!/^(choose-vo|ban-vo|sfx-audios)$/.test(kind) || !/^\d{1,5}$/.test(key)) return null;
  const f = path.join(voDir(), `${kind}-${key}.ogg`);
  try { const b = fs.readFileSync(f); if (b.length > 1000) return b; } catch (err) { /* pas encore en cache */ }
  const keep = (b) => { try { fs.mkdirSync(voDir(), { recursive: true }); fs.writeFileSync(f, b); } catch (err) { /* */ } return b; };
  const loc = kind === 'sfx-audios' ? 'default' : 'fr_fr';
  if (Date.now() > VO_CD_DOWN) {
    try {
      const r = await fetch(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/${loc}/v1/champion-${kind}/${key}.ogg`, { signal: AbortSignal.timeout(6000) });
      if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 1000) return keep(b); }
      if (r.status >= 500) VO_CD_DOWN = Date.now() + 10 * 60000;
    } catch (err) { VO_CD_DOWN = Date.now() + 10 * 60000; } // en panne : on ne réessaie pas avant 10 min
  }
  try {
    if (!LCU.port || !(await lcuGet('/riotclient/region-locale'))) await lcuConnect();
    if (!LCU.port) return null;
    if (kind !== 'sfx-audios') { const rl = await lcuGet('/riotclient/region-locale'); if (!rl || !/^fr/i.test(String(rl.locale || ''))) return null; }
    const b = await lcuRaw(`/lol-game-data/assets/v1/champion-${kind}/${key}.ogg`);
    if (b && b.length > 1000) return keep(b);
  } catch (err) { /* client fermé */ }
  return null;
});
async function lcuConnect() {
  if (LCU.port) { const r = await lcuReq('GET', '/lol-summoner/v1/current-summoner'); if (r.status === 200) return r.data; }
  const f = lcuFind() || await lcuFromProcess();
  if (!f) return null;
  LCU.port = f.port; LCU.pass = f.pass;
  const r = await lcuReq('GET', '/lol-summoner/v1/current-summoner');
  return r.status === 200 ? r.data : null;
}
// Regarder la partie d'un coéquipier dans le mode spectateur officiel de LoL (le même que « Regarder » dans la liste d'amis).
// Riot impose 3 minutes de délai : personne ne peut s'en servir pour tricher.
ipcMain.handle('live:spectate', async (e, who) => {
  try {
    if (liveLast) return { ok: false, error: 'tu es déjà en game' };
    const me = await lcuConnect();
    if (!me) return { ok: false, error: 'ouvre le client League of Legends (connecté) puis réessaie' };
    const puuid = String((who && who.puuid) || '').slice(0, 100), name = String((who && who.name) || '').slice(0, 60);
    if (!puuid && !name) return { ok: false, error: 'partie introuvable' };
    // Le client attend une LISTE de noms (« summonerOrTeamNames ») : le Riot ID complet, puis le pseudo seul.
    const tries = [
      () => lcuReq('POST', '/lol-spectator/v1/buddy/spectate', [name]),
      () => lcuReq('POST', '/lol-spectator/v1/buddy/spectate', [name.split('#')[0]]),
      () => lcuReq('POST', '/lol-spectator/v1/spectate/launch', { allowObserveMode: 'ALL', dropInSpectateGameId: name.split('#')[0], gameQueueType: '', puuid }),
    ];
    let last = null, first = null;
    for (const t of tries) { last = await t(); if (last.status >= 200 && last.status < 300) return { ok: true }; if (!first && last.status && last.status !== 404) first = last; }
    last = first || last;
    const msg = last && last.data && (last.data.message || last.data.errorCode);
    if (/not.*spectat|observ|GAME_NOT_FOUND|not found/i.test(String(msg || ''))) return { ok: false, error: 'cette partie ne peut pas être regardée (partie personnalisée, entraînement, ou moins de 3 minutes de jeu)' };
    return { ok: false, error: msg ? String(msg).slice(0, 160) : 'le client LoL a refusé (la partie a peut-être moins de 3 minutes)' };
  } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
});
async function lcuQueue() {
  if (LCU.queue && Date.now() - LCU.qAt < 60000) return LCU.queue;
  LCU.qAt = Date.now();
  let s = await lcuGet('/lol-gameflow/v1/session');
  if (!s && Date.now() - LCU.at > 60000) { LCU.at = Date.now(); const f = lcuFind() || await lcuFromProcess(); if (f) { LCU.port = f.port; LCU.pass = f.pass; s = await lcuGet('/lol-gameflow/v1/session'); } }
  const q = s && s.gameData && s.gameData.queue;
  LCU.queue = q ? { id: Number(q.id) || 0, name: String(q.description || q.shortName || '').slice(0, 40), ranked: !!q.isRanked, custom: !!(s.gameData.isCustomGame || Number(q.id) <= 0) } : null;
  LCU.gameId = s && s.gameData ? Number(s.gameData.gameId) || 0 : 0;
  if (LCU.queue && !LCU.puuid) { const me = await lcuGet('/lol-summoner/v1/current-summoner'); if (me && me.puuid) LCU.puuid = String(me.puuid); }
  return LCU.queue;
}
// Événements de la partie (kills, assists, objectifs) pour les clips automatiques : seulement ceux du joueur de ce PC.
function liveEvents(d) {
  const me = String((d && d.activePlayer && (d.activePlayer.riotId || d.activePlayer.summonerName)) || '');
  const meName = me.split('#')[0];
  const evs = (d && d.events && Array.isArray(d.events.Events)) ? d.events.Events : [];
  const mine = (x) => x && (x === me || x === meName || String(x).split('#')[0] === meName);
  return evs.slice(-60).map((e) => {
    const killer = String(e.KillerName || e.Acer || ''), as = Array.isArray(e.Assisters) ? e.Assisters.map(String) : [];
    const part = mine(killer) ? 'kill' : as.some(mine) ? 'assist' : '';
    return { id: Number(e.EventID) || 0, t: Number(e.EventTime) || 0, kind: String(e.EventName || '').slice(0, 20), part, victim: String(e.VictimName || '').split('#')[0].slice(0, 30), dragon: String(e.DragonType || '').slice(0, 12), stolen: e.Stolen === 'True' || e.Stolen === true, streak: Number(e.KillStreak) || 0 };
  });
}
function liveSummary(d) {
  if (!d || !Array.isArray(d.allPlayers) || !d.gameData) return null;
  const champ = (p) => String(p.rawChampionName || '').split('_').pop() || String(p.championName || '');
  return {
    mode: String(d.gameData.gameMode || ''), time: Math.round(Number(d.gameData.gameTime) || 0),
    me: String((d.activePlayer && (d.activePlayer.riotId || d.activePlayer.summonerName)) || ''), at: Date.now(),
    players: d.allPlayers.slice(0, 12).map((p) => ({ n: String(p.riotId || p.summonerName || ''), c: champ(p), team: p.team === 'CHAOS' ? 'CHAOS' : 'ORDER',
      k: (p.scores || {}).kills || 0, d: (p.scores || {}).deaths || 0, a: (p.scores || {}).assists || 0, cs: (p.scores || {}).creepScore || 0, lvl: p.level || 0, pos: String(p.position || ''),
      it: liveItems(p), sp: liveSpells(p), dead: p.isDead ? Math.ceil(Number(p.respawnTimer) || 0) : 0, ward: Math.round(((p.scores || {}).wardScore) || 0) })),
    ...liveObjectives(d),
  };
}
// Objets dans l'ordre des emplacements (0 = vide, 6 = balise).
function liveItems(p) { const out = [0, 0, 0, 0, 0, 0, 0]; for (const i of (p.items || [])) { const sl = Number(i.slot); if (sl >= 0 && sl < 7) out[sl] = Number(i.itemID) || 0; } return out; }
function liveSpells(p) {
  const s = p.summonerSpells || {};
  return [s.summonerSpellOne, s.summonerSpellTwo].map((x) => { const r = String((x && x.rawDisplayName) || ''); const m = r.match(/SummonerSpell_(\w+?)_DisplayName/); return m ? m[1].slice(0, 30) : ''; });
}
// Score des objectifs et fil de la partie (kills, objectifs), à partir des événements de l'API locale.
function liveObjectives(d) {
  const team = {}, champ = {};
  for (const p of d.allPlayers || []) { const n = String(p.riotId || p.summonerName || ''); const t = p.team === 'CHAOS' ? 'CHAOS' : 'ORDER'; const c = String(p.rawChampionName || '').split('_').pop(); team[n] = t; team[n.split('#')[0]] = t; champ[n] = c; champ[n.split('#')[0]] = c; }
  const tOf = (x) => team[x] || team[String(x).split('#')[0]] || (/Turret_T1|Barracks_T1/.test(x) ? 'ORDER' : /Turret_T2|Barracks_T2/.test(x) ? 'CHAOS' : '');
  const cOf = (x) => champ[x] || champ[String(x).split('#')[0]] || '';
  const blank = () => ({ drag: [], baron: 0, herald: 0, grubs: 0, atakhan: 0, tower: 0, inhib: 0, kills: 0 });
  const obj = { ORDER: blank(), CHAOS: blank() };
  const feed = [];
  for (const e of (d.events && d.events.Events) || []) {
    const k = String(e.KillerName || ''), kt = tOf(k), t = Math.round(Number(e.EventTime) || 0), n = Array.isArray(e.Assisters) ? e.Assisters.length : 0;
    if (e.EventName === 'ChampionKill') {
      const kk = cOf(k) ? '' : /Turret/i.test(k) ? 'tour' : /Minion/i.test(k) ? 'sbire' : /SRU_|Sru_|Baron|Dragon|Herald/i.test(k) ? 'monstre' : 'exec';
      const vt = tOf(e.VictimName); const kteam = kt || (vt === 'ORDER' ? 'CHAOS' : vt === 'CHAOS' ? 'ORDER' : '');
      if (kteam) obj[kteam].kills++;
      feed.push({ t, x: 'kill', team: kteam, kc: cOf(k), vc: cOf(e.VictimName), n, kk });
    }
    else if (e.EventName === 'DragonKill' && kt) { obj[kt].drag.push(String(e.DragonType || '').slice(0, 10)); feed.push({ t, x: 'drag', team: kt, kc: cOf(k), what: String(e.DragonType || ''), st: e.Stolen === 'True' }); }
    else if (e.EventName === 'BaronKill' && kt) { obj[kt].baron++; feed.push({ t, x: 'baron', team: kt, kc: cOf(k), st: e.Stolen === 'True' }); }
    else if (e.EventName === 'HeraldKill' && kt) { obj[kt].herald++; feed.push({ t, x: 'herald', team: kt, kc: cOf(k) }); }
    else if (e.EventName === 'HordeKill' && kt) { obj[kt].grubs++; feed.push({ t, x: 'grubs', team: kt, kc: cOf(k) }); }
    else if (e.EventName === 'AtakhanKill' && kt) { obj[kt].atakhan++; feed.push({ t, x: 'atakhan', team: kt, kc: cOf(k) }); }
    else if (e.EventName === 'TurretKilled') { const vt = /_T1_/.test(String(e.TurretKilled)) ? 'CHAOS' : /_T2_/.test(String(e.TurretKilled)) ? 'ORDER' : kt; if (vt) obj[vt].tower++; feed.push({ t, x: 'tower', team: vt, kc: cOf(k) }); }
    else if (e.EventName === 'InhibKilled') { const vt = /_T1_/.test(String(e.InhibKilled)) ? 'CHAOS' : /_T2_/.test(String(e.InhibKilled)) ? 'ORDER' : kt; if (vt) obj[vt].inhib++; feed.push({ t, x: 'inhib', team: vt, kc: cOf(k) }); }
  }
  return { obj, feed: feed.slice(-14) };
}
let liveLast = null;
setInterval(async () => {
  const raw = await liveClient();
  const g = liveSummary(raw);
  if (!g && !liveLast) { LCU.queue = null; return; }
  if (g) { const q = await lcuQueue().catch(() => null); if (q) g.queue = q; if (LCU.puuid) g.puuid = LCU.puuid; g.events = liveEvents(raw); }
  try { recStep(raw, g); } catch (e) { /* l'enregistrement ne doit jamais gêner le direct */ }
  liveLast = g;
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('live:update', g);
}, 2500);

// ---------- Revue de parties : FIRE enregistre chaque partie jouée (API locale officielle, rien d'autre) ----------
// Toutes les 10 s de jeu : le tableau (KDA, sbires, niveau, objets, mort) ; tous les événements (kills, objectifs, tours).
// À la fin de la partie, tout est rangé dans userData/parties/<début>.json pour la rubrique « Revue de parties ».
const partiesDir = () => path.join(app.getPath('userData'), 'parties');
// Seules les parties qui comptent pour l'équipe : Solo/Duo (420), Flex (440) et Clash 5c5 (700). Pas d'ARAM ni de personnalisées.
const REVUE_QUEUES = new Set([420, 440, 700]);
const revueOk = (q) => !!(q && !q.custom && REVUE_QUEUES.has(Number(q.id)));
let REC = null;
function recStep(raw, g) {
  if (g && raw) {
    const key = g.players.map((p) => p.n).sort().join('|');
    if (!REC || REC.key !== key) {
      if (REC) recSave(REC);
      REC = { key, v: 1, id: String(Date.now() - g.time * 1000), start: Date.now() - g.time * 1000, mode: g.mode, queue: g.queue || null, me: g.me,
        players: g.players.map((p) => ({ n: p.n, c: p.c, team: p.team, pos: p.pos })), frames: [], events: {}, lastT: -99, result: '' };
    }
    if (g.queue && !REC.queue) REC.queue = g.queue;
    if (g.time - REC.lastT >= 10) {
      REC.lastT = g.time;
      REC.frames.push({ t: g.time, p: g.players.map((p) => [p.k, p.d, p.a, p.cs, p.lvl, p.dead || 0, ...(p.it || []).slice(0, 7)]) });
    }
    for (const e of ((raw.events && raw.events.Events) || [])) {
      const id = Number(e.EventID); if (!Number.isFinite(id) || REC.events[id]) continue;
      REC.events[id] = { t: Math.round(Number(e.EventTime) || 0), x: String(e.EventName || '').slice(0, 20), k: String(e.KillerName || e.Acer || '').slice(0, 40), v: String(e.VictimName || '').slice(0, 40),
        a: Array.isArray(e.Assisters) ? e.Assisters.map((x) => String(x).slice(0, 40)).slice(0, 5) : [], tw: String(e.TurretKilled || e.InhibKilled || '').slice(0, 30),
        dr: String(e.DragonType || '').slice(0, 12), st: e.Stolen === 'True' || e.Stolen === true, ks: Number(e.KillStreak) || 0, r: String(e.Result || '').slice(0, 8) };
      if (e.EventName === 'GameEnd') REC.result = String(e.Result || '');
    }
    REC.duration = g.time;
  } else if (REC) { recSave(REC); REC = null; }
}
function recSave(r) {
  try {
    if (!r || r.frames.length < 6) return; // moins d'une minute : rien à revoir
    if (!revueOk(r.queue)) return; // ARAM, normales, personnalisées… : pas gardées
    fs.mkdirSync(partiesDir(), { recursive: true });
    const out = { ...r, events: Object.values(r.events).sort((a, b) => a.t - b.t) }; delete out.key; delete out.lastT;
    fs.writeFileSync(path.join(partiesDir(), r.id + '.json'), JSON.stringify(out));
    const files = fs.readdirSync(partiesDir()).filter((f) => /^\d+\.json$/.test(f)).sort();
    for (const f of files.slice(0, Math.max(0, files.length - 150))) fs.unlinkSync(path.join(partiesDir(), f));
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('parties:new', r.id);
  } catch (e) { /* disque plein ou dossier protégé */ }
}
app.on('before-quit', () => { try { if (REC) { recSave(REC); REC = null; } } catch (e) { /* */ } });
ipcMain.handle('parties:list', () => {
  try {
    if (!fs.existsSync(partiesDir())) return [];
    return fs.readdirSync(partiesDir()).filter((f) => /^\d+\.json$/.test(f)).sort().reverse().slice(0, 150).map((f) => {
      try { const d = JSON.parse(fs.readFileSync(path.join(partiesDir(), f), 'utf8')); if (!revueOk(d.queue)) return null; return { id: d.id, start: d.start, mode: d.mode, queue: d.queue, me: d.me, duration: d.duration, result: d.result, players: d.players, notes: (d.notes || []).length }; }
      catch (e) { return null; }
    }).filter(Boolean);
  } catch (e) { return []; }
});
ipcMain.handle('parties:get', (e, id) => { try { if (!/^\d+$/.test(String(id))) return null; return JSON.parse(fs.readFileSync(path.join(partiesDir(), id + '.json'), 'utf8')); } catch (err) { return null; } });
ipcMain.handle('parties:save', (e, d) => {
  try {
    if (!d || !/^\d+$/.test(String(d.id)) || !Array.isArray(d.frames) || !Array.isArray(d.events)) return false;
    const txt = JSON.stringify(d); if (txt.length > 4e6) return false;
    fs.mkdirSync(partiesDir(), { recursive: true }); fs.writeFileSync(path.join(partiesDir(), d.id + '.json'), txt); return true;
  } catch (err) { return false; }
});
// Vidéo de la partie entière (Revue de parties) : écrite au fur et à mesure dans Vidéos\FIRE Clips\Parties.
const vodDir = () => path.join(clipDir(), 'Parties');
const VOD = { fd: null, file: '' };
ipcMain.handle('vod:open', () => {
  try {
    if (VOD.fd != null) { try { fs.closeSync(VOD.fd); } catch (e) { /* */ } VOD.fd = null; }
    fs.mkdirSync(vodDir(), { recursive: true });
    const d = new Date(); const z = (n) => String(n).padStart(2, '0');
    VOD.file = path.join(vodDir(), `Partie ${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}h${z(d.getMinutes())}.mp4`);
    VOD.fd = fs.openSync(VOD.file, 'w');
    // On ne garde que les 12 dernières parties filmées (une partie de 30 min pèse environ 1 à 2 Go).
    const old = fs.readdirSync(vodDir()).filter((f) => /\.mp4$/i.test(f)).map((f) => ({ f, t: fs.statSync(path.join(vodDir(), f)).mtimeMs })).sort((a, b) => b.t - a.t).slice(12);
    for (const o of old) { try { fs.unlinkSync(path.join(vodDir(), o.f)); } catch (e) { /* */ } }
    return { ok: true };
  } catch (e) { VOD.fd = null; return { ok: false, error: String(e && e.message || e) }; }
});
ipcMain.on('vod:write', (e, pos, data) => { if (VOD.fd == null || !data) return; try { const b = Buffer.from(data); fs.writeSync(VOD.fd, b, 0, b.length, Number(pos) || 0); } catch (err) { /* disque plein */ } });
ipcMain.handle('vod:close', (e, info) => {
  if (VOD.fd == null) return null;
  try { fs.closeSync(VOD.fd); } catch (err) { /* */ }
  VOD.fd = null;
  const url = require('url').pathToFileURL(VOD.file).href;
  // Rattachée à la partie en cours (ou à la dernière enregistrée).
  const vod = { file: VOD.file, url, gt0: Number(info && info.gt0) || 0, seconds: Number(info && info.seconds) || 0 };
  if (REC) REC.vod = vod;
  else {
    try {
      const files = fs.readdirSync(partiesDir()).filter((f) => /^\d+\.json$/.test(f)).sort();
      const last = files[files.length - 1];
      if (last) { const p = path.join(partiesDir(), last); const d = JSON.parse(fs.readFileSync(p, 'utf8')); if (!d.vod) { d.vod = vod; fs.writeFileSync(p, JSON.stringify(d)); } }
    } catch (err) { /* */ }
  }
  return vod;
});
// Positions lues sur la mini-carte (rubrique Revue) : ajoutées à la partie en cours d'enregistrement.
ipcMain.on('parties:pos', (e, t, pts) => {
  if (!REC || !Array.isArray(pts) || pts.length > 12) return;
  REC.pos = REC.pos || [];
  if (REC.pos.length > 8000) return;
  REC.pos.push({ t: Math.max(0, Math.round(Number(t) || 0)), p: pts.map((x) => (Array.isArray(x) ? [x[0] | 0, x[1] | 0, x[2] | 0] : null)) });
});
// Icônes Data Dragon lues par FIRE (pour la mini-carte : pas de problème d'origine dans le canvas).
ipcMain.handle('dd:image', async (e, p) => {
  if (!/^cdn\/[\w.]+\/img\/champion\/[A-Za-z0-9]+\.png$/.test(String(p || ''))) return null;
  try { const r = await fetch('https://ddragon.leagueoflegends.com/' + p); return r.ok ? Buffer.from(await r.arrayBuffer()) : null; } catch (err) { return null; }
});
ipcMain.handle('parties:delete', (e, id) => { try { if (!/^\d+$/.test(String(id))) return false; fs.unlinkSync(path.join(partiesDir(), id + '.json')); return true; } catch (err) { return false; } });

// ---------- Clips instantanés : rangés dans Vidéos\FIRE Clips ----------
const CLIP_MAX = 150 * 1024 * 1024;
const clipDir = () => path.join(app.getPath('videos'), 'FIRE Clips');
const inClips = (p) => { const r = path.relative(clipDir(), path.resolve(String(p || ''))); return !!r && !r.startsWith('..') && !path.isAbsolute(r); };
ipcMain.handle('clips:save', (e, data, meta) => {
  try {
    const buf = Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data);
    if (!buf.length || buf.length > CLIP_MAX || buf.slice(4, 8).toString('latin1') !== 'ftyp') return { ok: false, error: 'clip invalide' };
    fs.mkdirSync(clipDir(), { recursive: true });
    const d = new Date(); const z = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}h${z(d.getMinutes())}m${z(d.getSeconds())}s`;
    const from = String((meta && meta.from) || '').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 30).trim();
    const label = String((meta && meta.label) || '').replace(/[^\p{L}\p{N} _,+-]/gu, '').slice(0, 40).trim();
    let name = `FIRE ${label ? label + ' ' : ''}${from ? 'de ' + from + ' ' : ''}${stamp}.mp4`;
    let k = 2; while (fs.existsSync(path.join(clipDir(), name))) name = name.replace(/( \(\d+\))?\.mp4$/, ` (${k++}).mp4`);
    fs.writeFileSync(path.join(clipDir(), name), buf);
    const info = { auto: !!(meta && meta.auto), kind: String((meta && meta.kind) || (from ? 'recu' : 'manuel')).slice(0, 20), label, from, champ: String((meta && meta.champ) || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 30), mode: String((meta && meta.mode) || '').slice(0, 40), at: Date.now() };
    try { const all = clipMeta(); all[name] = info; fs.writeFileSync(path.join(clipDir(), 'clips.json'), JSON.stringify(all)); } catch (e) { /* */ }
    return { ok: true, name, path: path.join(clipDir(), name) };
  } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
});
function clipMeta() { try { return JSON.parse(fs.readFileSync(path.join(clipDir(), 'clips.json'), 'utf8')) || {}; } catch (e) { return {}; } }
ipcMain.handle('clips:list', () => {
  try {
    const dir = clipDir(); if (!fs.existsSync(dir)) return [];
    const meta = clipMeta();
    return fs.readdirSync(dir).filter((f) => /\.mp4$/i.test(f)).map((f) => { const st = fs.statSync(path.join(dir, f)); return { name: f, path: path.join(dir, f), size: st.size, t: st.mtimeMs, url: require('url').pathToFileURL(path.join(dir, f)).href, meta: meta[f] || null }; })
      .sort((a, b) => b.t - a.t).slice(0, 300);
  } catch (err) { return []; }
});
ipcMain.handle('clips:read', (e, p) => { try { if (!inClips(p)) return null; const st = fs.statSync(p); if (st.size > CLIP_MAX) return null; return fs.readFileSync(p); } catch (err) { return null; } });
ipcMain.handle('clips:show', (e, p) => { if (p && inClips(p)) shell.showItemInFolder(path.resolve(p)); else { fs.mkdirSync(clipDir(), { recursive: true }); shell.openPath(clipDir()); } return true; });
ipcMain.handle('clips:delete', (e, p) => { try { if (!inClips(p)) return false; fs.unlinkSync(p); return true; } catch (err) { return false; } });
ipcMain.handle('puzzles:draft', async () => (await remoteJson(PUZ_URL, 'puzzles-draft.json')) || { puzzles: [] });
ipcMain.handle('tierlist', async () => (await remoteJson(TIER_URL, 'tierlist.json')) || { data: {} });
// One-tricks : classement LoLalytics par champion (relevé chaque semaine) + noms et icônes des runes et sorts (Data Dragon).
const OTP_URL = 'https://toka120.github.io/fire-team-lol/otp.json';
let otpDD = null;
async function otpDragon() {
  if (otpDD) return otpDD;
  const cached = (() => { try { return JSON.parse(fs.readFileSync(cachePath('otp-dd.json'), 'utf8')); } catch (e) { return null; } })();
  try {
    const v = (await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json())[0];
    if (cached && cached.v === v) { otpDD = cached; return otpDD; }
    const base = `https://ddragon.leagueoflegends.com/cdn/${v}/data/fr_FR/`;
    const [rr, su] = await Promise.all([fetch(base + 'runesReforged.json').then((r) => r.json()), fetch(base + 'summoner.json').then((r) => r.json())]);
    const runes = {};
    for (const tree of rr) {
      runes[tree.id] = { n: tree.name, i: tree.icon };
      for (const slot of tree.slots || []) for (const x of slot.runes || []) runes[x.id] = { n: x.name, i: x.icon, t: tree.id };
    }
    const spells = {};
    Object.values(su.data || {}).forEach((x) => { spells[x.key] = { n: x.name, i: x.image && x.image.full }; });
    otpDD = { v, runes, spells };
    try { fs.writeFileSync(cachePath('otp-dd.json'), JSON.stringify(otpDD)); } catch (e) { /* ignore */ }
    return otpDD;
  } catch (e) { return cached || { v: null, runes: {}, spells: {} }; }
}
// Matchup : la page publique LoLalytics du matchup, lue à la demande (gardée 6 h), pour l'afficher dans FIRE.
const muCache = new Map();
ipcMain.handle('matchup', async (e, a, b, lane) => {
  const slug = (id) => (id === 'MonkeyKing' ? 'wukong' : String(id || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const ln = ['top', 'jungle', 'middle', 'bottom', 'support'].includes(lane) ? lane : '';
  if (!slug(a) || !slug(b)) return { ok: false, error: 'champion manquant' };
  const url = `https://lolalytics.com/lol/${slug(a)}/vs/${slug(b)}/build/${ln ? '?lane=' + ln : ''}`;
  const hit = muCache.get(url);
  const dd = await otpDragon();
  if (hit && Date.now() - hit.at < 6 * 3600e3) return { ...hit.r, dd, url };
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (FIRE LoL)', 'Accept-Language': 'en' } });
    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, dd, url };
    const out = require('./lolalytics').parseMatchup(await r.text());
    if (out.ok) muCache.set(url, { at: Date.now(), r: out });
    return { ...out, dd, url };
  } catch (err) { return { ok: false, error: String((err && err.message) || err), dd, url }; }
});
ipcMain.handle('otp', async () => {
  const [d, dd] = await Promise.all([remoteJson(OTP_URL, 'otp.json'), otpDragon()]);
  return { ...(d || { champs: {} }), dd };
});
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
ipcMain.handle('remp:seal', (e, obj) => coach.rempSeal(obj));
ipcMain.handle('revues', () => coach.revues());
ipcMain.handle('revue:get', (e, id) => coach.revueGet(id));
ipcMain.handle('revue:share', (e, g, who, shots) => coach.revueShare(g, who, shots));
ipcMain.handle('revue:ia', (e, req, who) => coach.revueIa(req || {}, who));
ipcMain.handle('scrims', () => coach.scrims());
ipcMain.handle('scrim:save', (e, op, who) => coach.scrimSave(op || {}, who));
ipcMain.handle('revue:note', (e, id, n, del) => coach.revueNote(id, n, !!del));
ipcMain.handle('remp:open', (e, box) => coach.rempOpen(box));
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
ipcMain.handle('salons', () => coach.salons());
ipcMain.handle('admin:setup', () => coach.adminSetup());
ipcMain.handle('membres', () => coach.membres());
ipcMain.handle('membres:demande', (e, m) => coach.membreDemande(m || {}));
ipcMain.handle('membres:decision', (e, slug, ok, role, who, fix) => coach.membreDecision(String(slug || ''), !!ok, role, who, fix && typeof fix === 'object' ? { slug: String(fix.slug || ''), pseudo: String(fix.pseudo || '') } : null));
ipcMain.handle('roles', () => coach.roles());
ipcMain.handle('roles:save', (e, modos, who) => coach.rolesSave(modos, who));
ipcMain.handle('act:push', (e, slug, evts) => coach.activityPush(slug, evts));
ipcMain.handle('act:all', (e, slugs) => coach.activityAll(slugs));
ipcMain.handle('staff:notes', () => coach.staffNotes());
ipcMain.handle('staff:save', (e, note, who) => coach.staffNoteSave(note, who));
ipcMain.handle('chat:delete', (e, id, who) => coach.chatDelete(id, who));
ipcMain.handle('salons:save', (e, d) => coach.salonsSave(d || {}));
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
async function grab(puuid, cutoff, maxPages, full) {
  // Analyse de parties : pour les 20 dernières games, on garde le détail complet du joueur (build, sorts, notes dpm…).
  const DROP = ['summonerId', 'profileIcon', 'pagePath', 'displayName', 'puuid', 'skillEvolves', 'playerAugment1', 'playerAugment2', 'playerAugment3', 'playerAugment4', 'playerAugment5', 'playerAugment6', 'placement', 'gameCreation'];
  const games = [];
  const slim = (p) => {
    const o = {};
    for (const [k, v] of Object.entries(p)) if (!DROP.includes(k)) o[k] = v;
    o.itemActions = (p.itemActions || []).slice(0, 80).map((a) => [Math.round((a.timestamp || 0) / 1000), a.id, a.action === 'purchase' ? 1 : a.action === 'sell' ? 2 : 3]);
    return o;
  };
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
      if (full && games.length < 20) games.push({ id: m.gameId, t: m.gameCreation, d: m.gameDuration, q: m.queueId, p: slim(p) });
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
  return { matches, champs, rank: m ? m[1].trim() : '', record: m ? m[2].trim() : '', ...(full ? { games } : {}) };
}

// Si le lien enregistré ne mène à aucun profil, on réessaie avec le Riot ID (« Pseudo#TAG » → Pseudo-TAG, au bon format).
async function fetchPlayer(player, days) {
  const r = await fetchPlayerOnce(player, days);
  if (r.ok || !player.pseudo || !/introuvable/.test(r.error || '')) return r;
  const i = String(player.pseudo).lastIndexOf('#');
  if (i < 1) return r;
  const alt = encodeURIComponent(player.pseudo.slice(0, i).trim()) + '-' + encodeURIComponent(player.pseudo.slice(i + 1).trim());
  if (alt === player.slug) return r;
  const r2 = await fetchPlayerOnce({ ...player, slug: alt }, days);
  return r2.ok ? { ...r2, altSlug: alt } : r;
}
async function fetchPlayerOnce(player, days) {
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
    // dpm.lol n'appelle pas toujours son API tout de suite (page déjà prête côté serveur) : l'identifiant est aussi dans la page.
    if (!puuid) {
      puuid = await win.webContents.executeJavaScript(`(() => { const h = document.documentElement.innerHTML; const m = h.match(/player\\\\?"\\s*:\\s*\\{\\\\?"puuid\\\\?"\\s*:\\s*\\\\?"([A-Za-z0-9_-]{60,90})/); return m ? m[1] : null; })()`).catch(() => null);
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
    const data = await win.webContents.executeJavaScript(`(${grab.toString()})(${JSON.stringify(puuid)}, ${cutoff}, ${pages}, ${player.full ? 'true' : 'false'})`);
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
ipcMain.handle('notify', (e, m) => notify(String((m && m.title) || 'FIRE LoL').slice(0, 120), String((m && m.body) || '').slice(0, 300), m && m.section, m && m.silent));

// ---------- Avancé : accélération matérielle, cache, son de Windows ----------
// L'accélération matérielle se règle avant le démarrage : on lit le choix au lancement (redémarrage nécessaire).
const gpuPath = () => path.join(app.getPath('userData'), 'gpu.json');
const gpuOff = () => { try { return JSON.parse(fs.readFileSync(gpuPath(), 'utf8')).off === true; } catch (e) { return false; } };
ipcMain.handle('gpu:get', () => ({ off: gpuOff(), active: !gpuAtStart }));
ipcMain.handle('gpu:set', (e, off) => { try { fs.writeFileSync(gpuPath(), JSON.stringify({ off: !!off })); } catch (err) { return false; } return true; });
ipcMain.handle('app:restart', () => { quitting = true; app.relaunch(); app.exit(0); });
// Vider le cache (images, scripts téléchargés) : les réglages, le code d'équipe et les messages restent.
ipcMain.handle('cache:clear', async () => {
  const ses = session.defaultSession;
  const before = await ses.getCacheSize().catch(() => 0);
  await ses.clearCache().catch(() => {});
  await ses.clearCodeCaches({}).catch(() => {});
  return { freed: before };
});
ipcMain.handle('cache:size', () => session.defaultSession.getCacheSize().catch(() => 0));
// Windows sait baisser le son des autres applications pendant un appel : on ouvre directement ce réglage.
ipcMain.handle('win:soundComms', () => {
  if (process.platform !== 'win32') return false;
  try { require('child_process').spawn('control', ['mmsys.cpl,,3'], { detached: true, stdio: 'ignore', windowsHide: true }).unref(); return true; } catch (e) { return false; }
});

// ---------- Mode streamer : OBS, Streamlabs ou XSplit ouvert sur ce PC ----------
// Liste des programmes ouverts (tasklist de Windows), toutes les 20 s, seulement quand FIRE la demande.
const STREAM_APPS = /^(obs64|obs32|obs|streamlabs obs|streamlabs desktop|xsplit\.core|xsplitbroadcaster|twitchstudio|prismlivestudio)\.exe$/i;
let streamTimer = null, streamOn = false;
function streamCheck() {
  if (process.platform !== 'win32') return;
  require('child_process').execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, out) => {
    if (err) return;
    const on = String(out).split(/\r?\n/).some((l) => STREAM_APPS.test((l.split('","')[0] || '').replace(/^"/, '')));
    if (on !== streamOn) { streamOn = on; if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('streamer:state', on); }
  });
}
ipcMain.handle('streamer:watch', (e, on) => {
  clearInterval(streamTimer); streamTimer = null;
  if (on) { streamCheck(); streamTimer = setInterval(streamCheck, 20000); }
  return streamOn;
});
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

// Accélération matérielle coupée dans Paramètres › Avancé (pris en compte à ce démarrage).
const gpuAtStart = (() => { try { return JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'gpu.json'), 'utf8')).off === true; } catch (e) { return false; } })();
if (gpuAtStart) app.disableHardwareAcceleration();

const single = app.requestSingleInstanceLock();
if (!single) {
  app.quit();
} else {
  // Windows n'affiche les notifications que si l'application a un identifiant (le même que l'installeur).
  // La version Store a déjà son identité Windows (notifications) : on ne la remplace pas.
  if (process.platform === 'win32' && !store) app.setAppUserModelId('lol.fire.team');
  // Un 2e lancement par Windows (démarrage auto) ne doit pas afficher la fenêtre : seulement un double-clic du joueur.
  app.on('second-instance', (e, argv) => { if (!(argv || []).includes('--hidden')) showMain(); });
  app.whenReady().then(() => { lockPermissions(); blockAds(); adblockWeb().catch(() => {}); screenShare(); createMainWindow(); setupUpdater(); });
  app.on('window-all-closed', () => { if ((!bgPrefs().bg && !inVoice) || quitting) app.quit(); });
}
