// FIRE LoL - application de bureau (Electron).
// Lit les stats des joueurs sur dpm.lol dans une fenêtre cachée, puis les affiche.

const { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Notification, Tray, Menu, desktopCapturer, globalShortcut, screen, net } = require('electron');
// Les sites voient FIRE comme un Chrome normal. Avec la signature d'Electron, dpm.lol croyait être dans sa propre
// application DPM et affichait « Connecte-toi à DPM » au lieu des stats.
function cleanUA() {
  try {
    const ua = String(app.userAgentFallback || '').replace(/\s(?:Electron|fire[-\w ]*?)\/\S+/gi, '');
    if (/Chrome\/\d/.test(ua)) app.userAgentFallback = ua;
  } catch (e) { /* */ }
}
cleanUA();
// Anti capture : les fenêtres de FIRE apparaissent noires dans les captures d'écran, les enregistrements
// et les partages d'écran (Discord, OBS, outil Capture de Windows…). Demandé par l'équipe pour garder ses infos privées.
let captureBlock = true;
app.on('browser-window-created', (e, w) => { try { w.setContentProtection(captureBlock); } catch (err) { /* */ } });
// Le créateur peut couper l'anti capture pour tous, ou l'autoriser à certains membres (menu Admin › Interrupteurs).
ipcMain.handle('capture:protect', (e, on) => { captureBlock = !!on; for (const w of BrowserWindow.getAllWindows()) { try { w.setContentProtection(captureBlock); } catch (err) { /* */ } } return captureBlock; });
app.whenReady().then(() => {
  cleanUA();
  // Les sessions déjà créées gardent leur signature : on la nettoie aussi.
  for (const p of ['persist:fire-web', 'persist:dpm']) { try { session.fromPartition(p).setUserAgent(app.userAgentFallback); } catch (e) { /* */ } }
});
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
  if (launcherWin && !launcherWin.isDestroyed()) { launcherWin.show(); launcherWin.focus(); return; } // le launcher ouvrira FIRE juste après
  if (!mainWin || mainWin.isDestroyed()) { createMainWindow(true); return; }
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}
function ensureTray() {
  if (tray) return;
  try {
    tray = new Tray(path.join(__dirname, 'assets', process.platform === 'win32' ? 'fire.ico' : 'fire.png'));
    tray.setToolTip('FIRE Team');
    tray.setContextMenu(trayMenu());
    if (inVoice) tray.setToolTip('FIRE Team · en vocal');
    tray.on('click', showMain);
  } catch (e) { tray = null; }
}
function dropTray() { if (tray) { tray.destroy(); tray = null; } }
// En vocal, fermer la fenêtre ne coupe pas l'appel (comme Discord) : FIRE se range près de l'horloge.
let inVoice = false;
ipcMain.on('vocal:on', (e, on) => {
  inVoice = !!on;
  if (tray) tray.setToolTip(inVoice ? 'FIRE Team · en vocal' : 'FIRE Team');
  if (tray) tray.setContextMenu(trayMenu());
});
function trayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Ouvrir FIRE Team', click: showMain },
    ...(inVoice ? [{ label: 'Quitter le vocal', click: () => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('vocal:leave'); } }] : []),
    { type: 'separator' },
    { label: 'Quitter FIRE Team', click: () => { quitting = true; app.quit(); } }
  ]);
}
function notify(title, body, section, silent, flash) {
  // Rappel de rendez-vous : l'icône de FIRE clignote dans la barre des tâches jusqu'à ce qu'on revienne sur FIRE.
  if (flash && mainWin && !mainWin.isDestroyed() && !mainWin.isFocused()) {
    try { mainWin.flashFrame(true); mainWin.once('focus', () => { try { mainWin.flashFrame(false); } catch (e) { /* */ } }); } catch (e) { /* */ }
  }
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
  return screen.getAllDisplays().map((d, i) => ({ id: String(d.id), n: i + 1, primary: d.id === prim, w: d.size.width, h: d.size.height, label: d.label || '', hz: Math.round(d.displayFrequency || 0) }));
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
    title: 'FIRE Team',
    icon: path.join(__dirname, 'assets', 'fire.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Les vérifications (planning, messages, mises à jour) continuent quand la fenêtre est cachée.
      backgroundThrottling: false,
      // Les clips mélangent le son du PC dans l'app : le son doit pouvoir démarrer sans clic.
      autoplayPolicy: 'no-user-gesture-required'
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
    if (!trayHintShown) { trayHintShown = true; notify('FIRE Team reste ouvert', "Tu recevras les notifications ici. Clic droit sur l'icône FIRE près de l'horloge pour quitter."); }
  });
  hideAdSlots(mainWin.webContents);
  // League of Listen (Détente) : interface traduite en français dans le cadre du jeu.
  mainWin.webContents.on('did-frame-finish-load', (e, isMain, pid, rid) => {
    if (isMain) return;
    try {
      const { webFrameMain } = require('electron');
      const f = webFrameMain.fromId(pid, rid);
      if (f && /^https:\/\/(www\.)?lynge\.tv\/listen/.test(f.url)) f.executeJavaScript(require('./listen-fr.js')).catch(() => {});
    } catch (err) { /* cadre fermé entre-temps */ }
  });
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
// YouTube ne marche pas avec le bloqueur (lecteur gris ou noir, même avec des exceptions) : le bloqueur est coupé
// tant que le navigateur de FIRE est sur YouTube, et remis dès qu'on va sur un autre site.
let webBlocker = null, webBlockerOn = false;
function webBlockFor(url) {
  if (!webBlocker || !/^https?:/.test(String(url || ''))) return;
  const s = session.fromPartition('persist:fire-web');
  const yt = isYt(url) || /^https:\/\/([\w-]+\.)*(youtu\.be|googlevideo\.com)\//.test(String(url));
  try {
    if (yt && webBlockerOn) { webBlocker.disableBlockingInSession(s); webBlockerOn = false; }
    else if (!yt && !webBlockerOn) { webBlocker.enableBlockingInSession(s); webBlockerOn = true; }
  } catch (e) { /* */ }
}
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
    // YouTube : certaines règles des listes (scripts anti-pub) cassent le lecteur dans FIRE (écran noir, la vidéo ne se lance pas).
    // On laisse YouTube tranquille pour que les vidéos des matchups et des guides marchent toujours.
    try { blocker.updateFromDiff({ added: ['@@||youtube.com^$document', '@@||youtube-nocookie.com^$document', '@@||googlevideo.com^', '@@||ytimg.com^', '@@||ggpht.com^'] }); } catch (e) { /* */ }
    blocker.enableBlockingInSession(s);
    webBlocker = blocker; webBlockerOn = true;
  } catch (e) {
    try { adFallback(s); } catch (x) { /* */ }
  }
}
function blockAdsWeb(wc) {
  const css = AD_CSS;
  wc.on('dom-ready', () => { if (isYt(wc.getURL())) return; wc.insertCSS(css, { cssOrigin: 'user' }).catch(() => {}); });
  hideAdSlots(wc);
}
function blockAds() {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => {
    let host = '';
    try { host = new URL(d.url).hostname; } catch (e) { /* adresse illisible */ }
    cb({ cancel: !!host && isAdHost(host) });
  });
}
const isYt = (u) => /^https:\/\/([\w-]+\.)*(youtube\.com|youtube-nocookie\.com)\//.test(String(u || ''));
function hideAdSlots(wc) {
  wc.on('did-frame-finish-load', (e, isMain, pid, rid) => {
    if (isMain || isYt(wc.getURL())) return;
    try {
      const { webFrameMain } = require('electron');
      const f = webFrameMain.fromId(pid, rid);
      if (f && /^https:\/\//.test(f.url) && !isYt(f.url)) f.executeJavaScript(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(AD_CSS)}; (document.head || document.documentElement).append(s); })()`).catch(() => {});
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
    // Fréquence de l'écran (Hz) : un partage ne peut pas avoir plus d'images/s que l'écran capturé.
    const ds = screen.getAllDisplays(), prim = screen.getPrimaryDisplay();
    const hzOf = (x) => { const d = ds.find((y) => String(y.id) === String(x.display_id)) || prim; return Math.round((d && d.displayFrequency) || 0); };
    return list.filter((x) => x.name && !x.thumbnail.isEmpty()).map((x) => ({ id: x.id, name: x.name, screen: x.id.startsWith('screen:'), thumb: x.thumbnail.toDataURL(), hz: hzOf(x) }));
  } catch (e) { return []; }
});
// Son du PC sans le son de FIRE (voix du salon, sons, streams regardés), comme Discord : Windows sait
// capter « tout sauf une application » depuis Windows 10 22H2 (build 19045) et Windows 11.
// La page le demande (restrictOwnAudio) et Electron choisit alors cette capture à la place de « tout le son ».
const winBuild = () => { const b = Number(String(require('os').release()).split('.')[2]); return Number.isFinite(b) ? b : 0; };
ipcMain.handle('screen:ownAudio', () => process.platform === 'win32' && winBuild() >= 19045);
ipcMain.handle('screen:pick', (e, id, audio) => { screenPick = typeof id === 'string' ? { id, audio: !!audio } : null; return true; });
// Partage « comme OBS » : suivre une application. Quand une autre fenêtre du même programme passe au premier plan
// (le jeu qui se lance depuis le client LoL, un autre personnage sur Dofus…), le partage passe dessus tout seul.
// On lit seulement quelle fenêtre est au premier plan et le nom de son programme (comme le fait la barre des tâches) :
// aucune ouverture du processus du jeu, rien n'est lu dedans.
const FG_CS = 'Add-Type -TypeDefinition \'using System;using System.Runtime.InteropServices;public class FireFg{[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);}\';';
const procName = (pidExpr) => `$n='';try{$n=(Get-Process -Id ${pidExpr} -ErrorAction Stop).ProcessName}catch{};`;
ipcMain.handle('screen:proc', (e, hwnd) => new Promise((ok) => {
  if (process.platform !== 'win32' || !/^\d+$/.test(String(hwnd))) return ok('');
  const cmd = FG_CS + `$p=0;[void][FireFg]::GetWindowThreadProcessId([IntPtr]${hwnd},[ref]$p);` + procName('$p') + '$n';
  require('child_process').execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true, timeout: 10000 }, (err, out) => ok(String(out || '').trim()));
}));
let fgProc = null;
function fgStop() { if (fgProc) { try { fgProc.kill(); } catch (e) { /* */ } fgProc = null; } }
ipcMain.handle('screen:follow', (e, on) => {
  fgStop();
  if (!on || process.platform !== 'win32') return false;
  const cmd = FG_CS + '$last=0;while($true){$h=[FireFg]::GetForegroundWindow();if([int64]$h -ne $last){$last=[int64]$h;$p=0;[void][FireFg]::GetWindowThreadProcessId($h,[ref]$p);' + procName('$p') + '[Console]::Out.WriteLine("$([int64]$h)|$n");[Console]::Out.Flush()};Start-Sleep -Milliseconds 600}';
  fgProc = require('child_process').spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true });
  let buf = '';
  fgProc.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split(/\r?\n/); buf = lines.pop();
    for (const l of lines) { const [hw, name] = l.split('|'); if (/^\d+$/.test(hw || '') && mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('screen:fg', { hwnd: hw, name: String(name || '').trim() }); }
  });
  fgProc.on('exit', () => { fgProc = null; });
  return true;
});
app.on('will-quit', fgStop);
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
  adblockWeb().catch(() => {});
  blockAdsWeb(wc);
  wc.setWindowOpenHandler(({ url }) => { if (isInstaller(url)) shell.openExternal(url); else if (WEB_OK.test(url)) wc.loadURL(url).catch(() => {}); return { action: 'deny' }; });
  wc.on('will-navigate', (e, url) => { if (!WEB_OK.test(url)) e.preventDefault(); });
  ['did-start-loading', 'did-stop-loading', 'page-title-updated', 'did-navigate', 'did-navigate-in-page'].forEach((ev) => wc.on(ev, webState));
  wc.on('did-start-navigation', (e, u, inPlace, isMain) => { const url = typeof u === 'string' ? u : e && e.url; const main = typeof isMain === 'boolean' ? isMain : !!(e && e.isMainFrame); if (main) webBlockFor(url); });
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
  webBlockFor(url);
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

// Équipe active de ce PC : Alpha (joueurs.json tel quel) ou une autre équipe (Bravo…) qui remplace les champs d'équipe.
// Les champs communs (créateurs, dépôt de données, versions, liste des équipes) restent ceux de joueurs.json.
const TEAM_FIELDS = ['equipe', 'code_sha256', 'code_scrypt', 'coach_scrypt', 'chef_scrypt', 'remplacant_scrypt', 'remplacant_salt', 'remplacant_cle', 'fiches_salt', 'fiches_cle_coach', 'objectif', 'joueurs', 'coachs', 'debut_equipe'];
function teamCfg(raw) {
  if (!raw) return {};
  let id = '';
  try { id = coach.activeTeam(); } catch (e) { id = ''; }
  const t = id && raw.equipes && raw.equipes[id];
  if (!t) return { ...raw, team_id: '', team_name: raw.equipe || 'FIRE' };
  const out = { ...raw };
  for (const k of TEAM_FIELDS) delete out[k];
  for (const k of TEAM_FIELDS) if (t[k] !== undefined) out[k] = t[k];
  out.joueurs = Array.isArray(t.joueurs) ? t.joueurs : [];
  out.coachs = Array.isArray(t.coachs) ? t.coachs : [];
  out.team_id = id; out.team_name = t.equipe || id; out.team_plan = t.plan || 'equipe';
  return out;
}
ipcMain.handle('config', async () => {
  const j = (await remoteJson(CONFIG_URL, 'joueurs.json')) || { joueurs: [], _source: 'aucune' };
  lastCfg = j;
  return teamCfg(j);
});
ipcMain.handle('rw:push', (e, slug, c) => coach.rwPush(slug, c));
ipcMain.handle('rw:board', (e, slugs) => coach.rwBoard(slugs));
ipcMain.handle('teams:info', () => coach.teamsInfo());
ipcMain.handle('teams:activate', (e, id, code) => coach.teamActivate(id, code));
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
// Les erreurs du client LoL emboîtent les messages (JSON dans du JSON) : on garde le plus précis.
function deepMsg(d) {
  let m = d && typeof d === 'object' ? (d.message || d.errorCode || JSON.stringify(d)) : String(d || '');
  for (let i = 0; i < 4; i++) {
    const k = m.lastIndexOf('"message"'); if (k < 0) break;
    const mm = m.slice(k).match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/); if (!mm || !mm[1] || mm[1] === m) break;
    m = mm[1].replace(/\\"/g, '"');
  }
  return m || 'sans détail';
}
ipcMain.handle('live:spectate', async (e, who) => {
  try {
    if (liveLast) return { ok: false, error: 'tu es déjà en game' };
    const me = await lcuConnect();
    if (!me) return { ok: false, error: 'ouvre le client League of Legends (connecté) puis réessaie' };
    let puuid = String((who && who.puuid) || '').slice(0, 100);
    const names = [...new Set([who && who.name].concat((who && who.names) || []).map((x) => String(x || '').trim().slice(0, 60)).filter(Boolean))];
    if (!puuid && !names.length) return { ok: false, error: 'partie introuvable' };
    const low = (x) => String(x || '').toLowerCase();
    // 1) La liste d'amis du client LoL : c'est elle que le bouton « Regarder » du client utilise (puuid exact, nom en jeu, statut).
    let fr = null;
    const friends = await lcuGet('/lol-chat/v1/friends').catch(() => null);
    if (Array.isArray(friends)) {
      fr = friends.find((f) => puuid && f.puuid === puuid) || friends.find((f) => names.some((n) => { const [gn, tl] = n.split('#'); return low(f.gameName) === low(gn) && (!tl || low(f.gameTag) === low(tl)); }))
        || friends.find((f) => names.some((n) => low(f.gameName) === low(n.split('#')[0]) || low(f.name) === low(n.split('#')[0])));
    }
    if (fr && fr.puuid) puuid = fr.puuid;
    // 2) Sinon, le Riot ID complet (nom#tag) donne le puuid.
    for (const n of names) { if (puuid) break; if (!n.includes('#')) continue; try { const [gn, tl] = n.split('#'); const a = await lcuReq('GET', `/lol-summoner/v1/alias/lookup?gameName=${encodeURIComponent(gn)}&tagLine=${encodeURIComponent(tl)}`); if (a.status === 200 && a.data && a.data.puuid) puuid = String(a.data.puuid); } catch (err) { /* */ } }
    const gameName = (fr && fr.gameName) || (names[0] || '').split('#')[0];
    const full = fr && fr.gameName ? `${fr.gameName}#${fr.gameTag || ''}` : names[0] || gameName;
    const st = fr && fr.lol ? String(fr.lol.gameStatus || '') : '';
    if (fr && st && !/inGame|spectating/i.test(st)) return { ok: false, error: `d'après le client LoL, ${gameName} n'est pas en partie en ce moment (${st === 'championSelect' ? 'sélection des champions' : st === 'outOfGame' ? 'hors partie' : st}).` };
    // 3) Les mêmes appels que le client : d'abord « Regarder » (puuid), puis par le nom.
    const tries = [];
    // Le bouton « Regarder » du client envoie aussi la file de la partie (gameQueueType), lue dans la liste d'amis.
    const gq = (fr && fr.lol && String(fr.lol.gameQueueType || '')) || '';
    if (puuid) {
      tries.push(['launch', () => lcuReq('POST', '/lol-spectator/v1/spectate/launch', { allowObserveMode: 'ALL', dropInSpectateGameId: gameName, gameQueueType: gq, puuid })]);
      if (full && full !== gameName) tries.push(['launch-id', () => lcuReq('POST', '/lol-spectator/v1/spectate/launch', { allowObserveMode: 'ALL', dropInSpectateGameId: full, gameQueueType: gq, puuid })]);
      if (gq) tries.push(['launch-sans-file', () => lcuReq('POST', '/lol-spectator/v1/spectate/launch', { allowObserveMode: 'ALL', dropInSpectateGameId: gameName, gameQueueType: '', puuid })]);
    }
    tries.push(['buddy', () => lcuReq('POST', '/lol-spectator/v1/buddy/spectate', [full])]);
    if (full !== gameName) tries.push(['buddy-nom', () => lcuReq('POST', '/lol-spectator/v1/buddy/spectate', [gameName])]);
    const errs = [];
    for (const [k, t] of tries) {
      const r = await t();
      if (r.status >= 200 && r.status < 300) return { ok: true };
      errs.push(`${k} ${r.status || '—'} : ${deepMsg(r.data).slice(0, 220)}`);
    }
    const all = errs.join(' · ');
    // Le client refuse souvent de lancer le spectateur depuis un salon ou une file d'attente.
    const phase = await lcuGet('/lol-gameflow/v1/gameflow-phase').catch(() => null);
    if (phase && /Lobby|Matchmaking|ReadyCheck|ChampSelect/.test(String(phase))) return { ok: false, error: `ton client LoL est ${/Lobby/.test(phase) ? 'dans un salon' : /ChampSelect/.test(phase) ? 'en sélection des champions' : 'en file d’attente'} : quitte-le, puis réessaie. Détail : ${all}` };
    if (/not.*spectat|GAME_NOT_FOUND|not found|no.*game/i.test(all) && !/RBAC/i.test(all)) return { ok: false, error: `${gameName} n'a pas de partie que Riot laisse regarder (personnalisée, entraînement, ou trop récente). Détail : ${all}` };
    // Riot réserve la demande de spectateur au client lui-même (« RBAC : access denied », « spectator key is missing ») :
    // une application ne peut pas la lancer. On met le client LoL devant et on dit au joueur où cliquer.
    if (/RBAC|access denied|spectator key/i.test(all)) {
      await lcuReq('POST', '/riotclient/ux-show').catch(() => null);
      return { ok: false, guide: true, error: `Riot ne laisse que son propre client lancer le spectateur. Ton client LoL vient de s'ouvrir : dans ta liste d'amis, clic droit sur ${gameName} › « Regarder ». (Détail technique : ${all})` };
    }
    if (/RBAC|access denied|403/i.test(all)) return { ok: false, error: `Riot refuse le spectateur pour ${gameName}${fr ? '' : ' (il n’est pas dans ta liste d’amis du client LoL)'}. Détail : ${all}` };
    return { ok: false, error: `le client LoL n'a pas lancé le spectateur. Détail : ${all}` };
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
// Seules les parties qui comptent pour l'équipe : Solo/Duo (420), Flex (440), 5c5 du week-end (710) et Clash (700). Pas d'ARAM ni de personnalisées.
const REVUE_QUEUES = new Set([420, 440, 700, 710]);
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
// Liste des parties enregistrées : chaque fichier (souvent lourd) n'est lu qu'une fois, sans bloquer FIRE ;
// on garde son résumé en mémoire tant qu'il ne change pas.
const PARTY_SUM = new Map();
ipcMain.handle('parties:list', async () => {
  try {
    const dir = partiesDir();
    const files = (await fs.promises.readdir(dir).catch(() => [])).filter((f) => /^\d+\.json$/.test(f)).sort().reverse().slice(0, 150);
    const out = [];
    for (const f of files) {
      const p = path.join(dir, f);
      let st; try { st = await fs.promises.stat(p); } catch (e) { continue; }
      const k = f + ':' + st.mtimeMs + ':' + st.size;
      let sum = PARTY_SUM.get(f);
      if (!sum || sum.k !== k) {
        try {
          const d = JSON.parse(await fs.promises.readFile(p, 'utf8'));
          sum = { k, v: revueOk(d.queue) ? { id: d.id, start: d.start, mode: d.mode, queue: d.queue, me: d.me, duration: d.duration, result: d.result, players: d.players, notes: (d.notes || []).length } : null };
        } catch (e) { sum = { k, v: null }; }
        PARTY_SUM.set(f, sum);
        await new Promise((r) => setImmediate(r)); // laisse respirer la fenêtre entre deux gros fichiers
      }
      if (sum.v) out.push(sum.v);
    }
    return out;
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
ipcMain.handle('clips:list', async () => {
  try {
    const dir = clipDir();
    const names = (await fs.promises.readdir(dir).catch(() => null));
    if (!names) return [];
    const meta = clipMeta();
    const stats = new Map(await Promise.all(names.filter((f) => /\.mp4$/i.test(f)).map(async (f) => [f, await fs.promises.stat(path.join(dir, f)).catch(() => null)])));
    return [...stats].filter(([, st]) => st).map(([f, st]) => { return { name: f, path: path.join(dir, f), size: st.size, t: st.mtimeMs, url: require('url').pathToFileURL(path.join(dir, f)).href, meta: meta[f] || null }; })
      .sort((a, b) => b.t - a.t).slice(0, 300);
  } catch (err) { return []; }
});
// Garder un clip (il n'est jamais supprimé tout seul) et ménage : les clips non gardés partent après X jours.
ipcMain.handle('clips:keep', (e, name, on) => {
  try { name = path.basename(String(name || '')); if (!/\.mp4$/i.test(name)) return false; const all = clipMeta(); all[name] = { ...(all[name] || {}), keep: !!on }; fs.writeFileSync(path.join(clipDir(), 'clips.json'), JSON.stringify(all)); return true; } catch (err) { return false; }
});
ipcMain.handle('clips:purge', async (e, days) => {
  days = Number(days) || 0;
  if (days <= 0) return { n: 0, bytes: 0 };
  try {
    const dir = clipDir(); const names = await fs.promises.readdir(dir).catch(() => null); if (!names) return { n: 0, bytes: 0 };
    const all = clipMeta(); let n = 0, bytes = 0;
    for (const f of names) {
      if (!/\.mp4$/i.test(f) || (all[f] && all[f].keep)) continue;
      const p = path.join(dir, f), st = await fs.promises.stat(p).catch(() => null);
      if (!st || !st.isFile() || Date.now() - st.mtimeMs < days * 86400000) continue;
      try { await fs.promises.unlink(p); n++; bytes += st.size; delete all[f]; } catch (err) { /* clip ouvert ailleurs */ }
    }
    if (n) fs.writeFileSync(path.join(dir, 'clips.json'), JSON.stringify(all));
    return { n, bytes };
  } catch (err) { return { n: 0, bytes: 0 }; }
});
// Clips partagés avec l'équipe (dépôt de données, chiffrés).
ipcMain.handle('clips:share', (e, p, meta) => { try { if (!inClips(p)) return { ok: false, error: 'clip introuvable' }; return coach.clipShare({ ...(meta || {}), buf: fs.readFileSync(p) }); } catch (err) { return { ok: false, error: String(err.message || err) }; } });
ipcMain.handle('clips:feed', () => coach.clipFeed());
ipcMain.handle('clips:thumb', (e, id) => coach.clipThumb(String(id || '')));
ipcMain.handle('clips:op', (e, op) => coach.clipOp(op && typeof op === 'object' ? op : {}));
ipcMain.handle('clips:fetch', async (e, id, file, asset) => { const r = await coach.clipFetch(id, file, asset); return r.ok ? { ok: true, url: require('url').pathToFileURL(r.path).href } : r; });
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
ipcMain.handle('matchup', async (e, a, b, lane, tier) => {
  const slug = (id) => (id === 'MonkeyKing' ? 'wukong' : String(id || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const ln = ['top', 'jungle', 'middle', 'bottom', 'support'].includes(lane) ? lane : '';
  if (!slug(a) || !slug(b)) return { ok: false, error: 'champion manquant' };
  // Elo choisi dans FIRE (sinon Émeraude+, le choix par défaut de LoLalytics) : seulement ce rang est chargé.
  const TIERS = ['all', 'iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger', 'gold_plus', 'platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus'];
  const tr = TIERS.includes(tier) && tier !== 'emerald_plus' ? tier : '';
  const qs = [ln ? 'lane=' + ln : '', tr ? 'tier=' + tr : ''].filter(Boolean).join('&');
  const url = `https://lolalytics.com/lol/${slug(a)}/vs/${slug(b)}/build/${qs ? '?' + qs : ''}`;
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
// Lit le tableau « Synergy » de dpm.lol/tierlist/duo dans la page déjà ouverte : on règle les filtres
// en cliquant (comme un joueur), puis on lit les lignes affichées.
async function dpmDuoGrab(tierLabel, r1, r2) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lab = (x) => String(x.getAttribute('aria-label') || x.innerText || '').trim();
  const rows = () => [...document.querySelectorAll('main div.grid.h-44')];
  const read = () => rows().map((r) => {
    const im = [...r.querySelectorAll('img')].map((i) => i.getAttribute('alt') || '');
    const t = [...r.children].map((c) => c.innerText.trim()).filter(Boolean);
    return im.length >= 2 ? { a: im[0], b: im[1], syn: t[1] || '', wr: t[2] || '', games: t[3] || '' } : null;
  }).filter(Boolean);
  const ready = async (sig) => { for (let i = 0; i < 60; i++) { const l = read(); if (l.length && JSON.stringify(l.slice(0, 3)) !== sig) return l; await sleep(300); } return read(); };
  let cur = await ready('');
  const sig0 = () => JSON.stringify(read().slice(0, 3));
  // Rôles : deux groupes de boutons (Top, Jungle, Mid, Bot) puis (Top, Jungle, Mid, Support).
  const roleBtns = () => [...document.querySelectorAll('main button')].filter((x) => ['Top', 'Jungle', 'Mid', 'Bot', 'Support'].includes(lab(x)));
  const setRole = async (group, name) => {
    const g = roleBtns(); const first = g.slice(0, 4), second = g.slice(4, 8);
    const b = (group ? second : first).find((x) => lab(x) === name);
    if (!b) return false;
    const s = sig0(); b.click(); await sleep(400); cur = await ready(s); return true;
  };
  if (r1) await setRole(0, r1);
  if (r2) await setRole(1, r2);
  if (tierLabel) {
    const tb = [...document.querySelectorAll('main button')].find((x) => /^(iron|bronze|silver|gold|platinum|emerald|diamond|master|grandmaster|challenger)\+?$/i.test(lab(x)));
    if (tb && lab(tb) !== tierLabel) {
      tb.click(); await sleep(500);
      const opt = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && e.textContent.trim() === tierLabel && !e.closest('main button'));
      if (opt) { const s = sig0(); (opt.closest('button,a,[role=option],li') || opt).click(); await sleep(400); cur = await ready(s); }
      else document.body.click();
    }
  }
  const patch = (document.querySelector('main') || document.body).innerText.match(/\b(\d{2}\.\d{1,2})\b/);
  return { url: location.href, patch: patch ? patch[1] : '', rows: read() };
}

// Synergies d'un champion (dpm.lol › page du champion › « Synergies ») : on lit les cartes affichées pour chaque rôle
// allié (on clique sur l'icône du rôle, comme un joueur). Exécutée DANS la page, doit rester autonome.
async function dpmChampGrab() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sigs = { top: 'M6.20711 21C5.76', jungle: 'M5.14 2c1.58', middle: 'M13.7929 3C14.23', bottom: 'M17.7929 3C18.23', support: 'M12.4622 10.2574' };
  const roleOf = (b) => { const p = b.querySelector('path'); const d = (p && p.getAttribute('d')) || ''; return Object.keys(sigs).find((k) => d.startsWith(sigs[k])) || ''; };
  const press = (el) => { for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) el.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, { bubbles: true, cancelable: true, button: 0 })); el.click(); };
  const tabs = () => [...document.querySelectorAll('[role=tab]')].filter((b) => /^(matchups|synergies)$/i.test(b.textContent.trim()));
  // Le bloc qui contient les onglets et les icônes de rôle (les cartes peuvent être en train de charger).
  const panel = () => {
    let box = tabs()[0];
    while (box && [...box.querySelectorAll('button')].filter((b) => roleOf(b)).length < 3) box = box.parentElement;
    if (!box) return null;
    // Les cartes sont un peu plus haut que les icônes : on remonte jusqu'au premier bloc qui en contient.
    let up = box;
    for (let k = 0; k < 4 && up; k++, up = up.parentElement) if (up.querySelector('a[href^="/champions/"] img')) return up;
    return box.parentElement || box;
  };
  const cards = (box) => !box ? [] : [...box.querySelectorAll('a[href^="/champions/"]')].map((a) => { const im = a.querySelector('img'); const t = a.innerText.split('\n').map((s) => s.trim()).filter(Boolean); return { c: im ? im.alt : '', d: t[0] || '', g: t[1] || '' }; }).filter((x) => x.c);
  const sig = (box) => JSON.stringify(cards(box).slice(0, 4));
  const settle = async (old) => { for (let i = 0; i < 40; i++) { const b = panel(); if (b && cards(b).length && sig(b) !== old) return true; await sleep(250); } return false; };
  // Le bloc des synergies ne se charge qu'une fois visible : on fait défiler la page (ou son conteneur qui défile).
  const down = () => { window.scrollBy(0, 600); const sc = [...document.querySelectorAll('main, body *')].find((e) => e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (sc) sc.scrollBy(0, 600); };
  for (let i = 0; i < 120 && !(tabs().length && panel() && cards(panel()).length); i++) { if (i % 6 === 5) down(); await sleep(250); }
  const tb = tabs()[0]; if (tb) tb.scrollIntoView({ block: 'start' });
  if (!panel()) return { err: 'bloc des synergies introuvable sur la page « ' + document.title.slice(0, 60) + ' » : ' + (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120) };
  const t = tabs().find((x) => /synerg/i.test(x.textContent));
  if (t && t.getAttribute('data-state') !== 'active') { const s = sig(panel()); press(t); await settle(s); }
  const roles = {};
  const roleBtns = () => [...((panel() || document).querySelectorAll('button'))].filter((b) => !b.textContent.trim() && roleOf(b));
  for (const r of roleBtns().map(roleOf)) {
    const b = roleBtns().find((x) => roleOf(x) === r);
    if (!b) continue;
    if (!/bg-/.test(b.className)) { const s = sig(panel()); press(b); await settle(s); }
    for (let i = 0; i < 20 && !cards(panel()).length; i++) await sleep(250);
    const more = [...((panel() || document).querySelectorAll('button'))].find((x) => /liste|list/i.test(x.textContent));
    if (more) { const n0 = cards(panel()).length; press(more); await sleep(500); if (cards(panel()).length < n0) { press(more); await sleep(500); } }
    const seen = new Set(); roles[r] = cards(panel()).filter((x) => !seen.has(x.c) && seen.add(x.c));
  }
  // Un rôle resté vide (cartes pas encore chargées) : on y revient une fois.
  for (const r of Object.keys(roles).filter((k) => !roles[k].length)) {
    const b = roleBtns().find((x) => roleOf(x) === r);
    if (!b) continue;
    const other = roleBtns().find((x) => roleOf(x) !== r);
    if (other) { press(other); await sleep(800); }
    press(b);
    for (let i = 0; i < 40 && !cards(panel()).length; i++) await sleep(250);
    await sleep(600);
    const more = [...((panel() || document).querySelectorAll('button'))].find((x) => /liste|list/i.test(x.textContent));
    if (more) { const n0 = cards(panel()).length; press(more); await sleep(500); if (cards(panel()).length < n0) { press(more); await sleep(500); } }
    const seen = new Set(); roles[r] = cards(panel()).filter((x) => !seen.has(x.c) && seen.add(x.c));
  }
  const patch = (document.body.innerText.match(/\b(\d{2}\.\d{1,2})\b/) || [])[1] || '';
  return { roles, patch };
}
const champCache = new Map();
let champQueue = Promise.resolve();
const DPM_LANE = { top: 'top', jungle: 'jungle', middle: 'middle', bottom: 'bottom', support: 'utility' };
ipcMain.handle('dpm:champ', (e, champ, lane, tier) => {
  const id = String(champ || '').replace(/[^A-Za-z0-9]/g, '');
  if (!id) return { ok: false, error: 'champion manquant' };
  const ln = DPM_LANE[lane] || '';
  const t = DUO_TIERS[tier] ? tier : 'emerald_plus';
  const url = `https://dpm.lol/champions/${id}/build?tier=${t}${ln ? '&lane=' + ln : ''}`;
  const hit = champCache.get(url);
  if (hit && Date.now() - hit.at < 6 * 3600e3) return hit.r;
  const run = async () => {
    const again = champCache.get(url); if (again && Date.now() - again.at < 6 * 3600e3) return again.r;
    // dpm.lol ne charge le bloc des synergies que quand il est réellement affiché : une fenêtre cachée ou « hors écran »
    // ne s'affiche jamais, et le bloc restait vide. On ouvre donc une vraie fenêtre, mais invisible (opacité 0),
    // placée hors de l'écran, sans barre des tâches, qui ne prend jamais le focus ni les clics.
    const win = new BrowserWindow({ show: false, x: -32000, y: -32000, width: 1400, height: 1500, frame: false, skipTaskbar: true, focusable: false, resizable: false, webPreferences: { session: dpmSession(), backgroundThrottling: false, contextIsolation: true, sandbox: true } });
    win.webContents.setAudioMuted(true);
    try { win.setOpacity(0); win.setIgnoreMouseEvents(true); win.showInactive(); } catch (e) { /* */ }
    try {
      await win.loadURL(url).catch(() => { /* la page peut se recharger */ });
      const res = await Promise.race([
        win.webContents.executeJavaScript(`(${dpmChampGrab.toString()})()`),
        new Promise((ok) => setTimeout(() => ok(null), 50000)),
      ]);
      const num = (x) => { const n = parseFloat(String(x || '').replace(/\s/g, '').replace(',', '.').replace('%', '')); return Number.isFinite(n) ? n : null; };
      const roles = {};
      for (const [r, list] of Object.entries((res && res.roles) || {})) {
        if (!DPM_LANE[r] || !Array.isArray(list)) continue;
        roles[r] = list.slice(0, 80).map((x) => ({ c: String(x.c || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 30), syn: num(x.d), games: parseInt(String(x.g || '').replace(/\D/g, ''), 10) || 0 })).filter((x) => x.c && x.syn != null);
      }
      const r = Object.keys(roles).length ? { ok: true, champ: id, lane: lane || '', tier: t, roles, patch: (res && res.patch) || '', url } : { ok: false, error: (res && res.err) || 'page de dpm.lol pas encore chargée', url };
      if (r.ok) champCache.set(url, { at: Date.now(), r });
      return r;
    } catch (err) { return { ok: false, error: String((err && err.message) || err), url }; }
    finally { try { win.destroy(); } catch (e2) { /* */ } }
  };
  const p = champQueue.then(run, run); champQueue = p.catch(() => {});
  return p;
});
// Counters d'un champion (page publique « Counters » de LoLalytics, une lane adverse à la fois, gardée 6 h).
const ctCache = new Map();
ipcMain.handle('counters', async (e, champ, lane, vslane, tier) => {
  const slug = (x) => (x === 'MonkeyKing' ? 'wukong' : String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const L = ['top', 'jungle', 'middle', 'bottom', 'support'];
  if (!slug(champ)) return { ok: false, error: 'champion manquant' };
  const TIERS = ['all', 'iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger', 'gold_plus', 'platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus'];
  const qs = [L.includes(lane) ? 'lane=' + lane : '', TIERS.includes(tier) && tier !== 'emerald_plus' ? 'tier=' + tier : '', L.includes(vslane) ? 'vslane=' + vslane : ''].filter(Boolean).join('&');
  const url = `https://lolalytics.com/lol/${slug(champ)}/counters/${qs ? '?' + qs : ''}`;
  const hit = ctCache.get(url);
  if (hit && Date.now() - hit.at < 6 * 3600e3) return hit.r;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (FIRE LoL)', 'Accept-Language': 'en' } });
    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, url };
    const out = { ...require('./lolalytics').parseCounters(await r.text()), url };
    if (out.ok) ctCache.set(url, { at: Date.now(), r: out });
    return out;
  } catch (err) { return { ok: false, error: String((err && err.message) || err), url }; }
});
// Synergies de duo (dpm.lol › Tierlist › Synergy) : la page publique est ouverte dans une fenêtre invisible
// (rendu hors écran, comme un onglet normal), les filtres sont réglés en cliquant et on lit le tableau affiché.
// Une seule page à la fois, gardée 6 h par rang et par duo.
const DUO_TYPES = { BOTTOM_UTILITY: ['Bot', 'Support'], JUNGLE_MIDDLE: ['Jungle', 'Mid'], TOP_JUNGLE: ['Top', 'Jungle'], JUNGLE_UTILITY: ['Jungle', 'Support'], MIDDLE_UTILITY: ['Mid', 'Support'] };
const DUO_TIERS = { iron: 'Iron', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', emerald: 'Emerald', diamond: 'Diamond', emerald_plus: 'Emerald+', diamond_plus: 'Diamond+', master_plus: 'Master+' };
const duoCache = new Map();
let duoQueue = Promise.resolve();
ipcMain.handle('dpm:duo', (e, tier, duo) => {
  const t = DUO_TIERS[tier] ? tier : 'emerald_plus';
  const d = DUO_TYPES[duo] ? duo : 'BOTTOM_UTILITY';
  const key = t + '|' + d;
  const hit = duoCache.get(key);
  if (hit && Date.now() - hit.at < 6 * 3600e3) return hit.r;
  const run = async () => {
    const again = duoCache.get(key); if (again && Date.now() - again.at < 6 * 3600e3) return again.r;
    const win = new BrowserWindow({ show: false, width: 1280, height: 1400, webPreferences: { session: dpmSession(), offscreen: true, backgroundThrottling: false, contextIsolation: true, sandbox: true } });
    win.webContents.setAudioMuted(true);
    try {
      await win.loadURL('https://dpm.lol/tierlist/duo').catch(() => { /* la page peut se recharger */ });
      const [r1, r2] = DUO_TYPES[d];
      const res = await Promise.race([
        win.webContents.executeJavaScript(`(${dpmDuoGrab.toString()})(${JSON.stringify(DUO_TIERS[t])}, ${JSON.stringify(r1)}, ${JSON.stringify(r2)})`),
        new Promise((ok) => setTimeout(() => ok(null), 45000)),
      ]);
      const num = (x) => { const n = parseFloat(String(x || '').replace(/\s/g, '').replace(',', '.').replace('%', '')); return Number.isFinite(n) ? n : null; };
      const rows = (res && Array.isArray(res.rows) ? res.rows : []).slice(0, 60).map((x) => ({ a: String(x.a || '').slice(0, 30), b: String(x.b || '').slice(0, 30), syn: num(x.syn), wr: num(x.wr), games: parseInt(String(x.games || '').replace(/\D/g, ''), 10) || 0 })).filter((x) => x.a && x.b);
      const r = rows.length ? { ok: true, tier: t, duo: d, patch: (res && res.patch) || '', rows, url: res.url } : { ok: false, error: 'tableau de dpm.lol vide ou pas encore chargé' };
      if (r.ok) duoCache.set(key, { at: Date.now(), r });
      return r;
    } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
    finally { try { win.destroy(); } catch (e2) { /* */ } }
  };
  const p = duoQueue.then(run, run); duoQueue = p.catch(() => {});
  return p;
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

coach.init(() => teamCfg(lastCfg || {}), () => lastCfg || {});
ipcMain.handle('unlock', (e, code) => coach.unlock(code));
ipcMain.handle('unlocked', () => coach.isUnlocked());
ipcMain.handle('remp:seal', (e, obj) => coach.rempSeal(obj));
ipcMain.handle('revues', () => coach.revues());
ipcMain.handle('revue:get', (e, id) => coach.revueGet(id));
ipcMain.handle('revue:share', (e, g, who, shots) => coach.revueShare(g, who, shots));
ipcMain.handle('revue:ia', (e, req, who) => coach.revueIa(req || {}, who));
ipcMain.handle('scrims', () => coach.scrims());
ipcMain.handle('stats:push', (e, payload, who) => coach.statsPush(payload || {}, who));
ipcMain.handle('stats:get', () => coach.statsGet());
ipcMain.handle('puz:bank', () => coach.puzzleBank());
ipcMain.handle('puz:request', (e, slug, level, have) => coach.puzzleRequest(slug, level, have));
ipcMain.handle('puz:generate', (e, who) => coach.puzzleGenerate(who));
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
ipcMain.handle('appcfg:get', () => coach.appCfgGet());
// Clés admin de FIRE Kiting / FIRE Listen (créateur), et relais des publications de leur menu admin.
ipcMain.handle('appkeys:list', () => coach.appKeysList());
ipcMain.handle('appkeys:make', (e, who, apps) => coach.appKeyMake(who, apps));
ipcMain.handle('appkeys:revoke', (e, id, on) => coach.appKeyRevoke(String(id || ''), on !== false));
ipcMain.handle('appsrelay:now', () => coach.appsRelay());
ipcMain.handle('appkeys:self', (e, force) => coach.appSelfKey(!!force));
ipcMain.handle('plan:get', () => coach.planGet());
ipcMain.handle('pub:get', () => coach.publicGet());
ipcMain.handle('pub:post', (e, page) => coach.publicPost(page || {}));
ipcMain.handle('pub:optin', (e, slug, on) => coach.publicOptin(String(slug || ''), !!on));
ipcMain.handle('pub:optins', () => coach.publicOptins());
ipcMain.handle('plan:set', (e, key) => coach.planSet(String(key || '').slice(0, 2000)));
ipcMain.handle('plan:clear', () => coach.planClear());
ipcMain.handle('plan:make', (e, who, plan) => coach.planKeyMake(who, plan));
// Repère pour le FIRE Launcher : la version exacte qui tourne, et où elle est installée.
app.whenReady().then(() => { try { const f = path.join(process.env.LOCALAPPDATA || path.join(require('os').homedir(), 'AppData', 'Local'), 'FIRE', 'team.json'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify({ v: 1, version: app.getVersion(), exe: process.execPath, at: Date.now() })); } catch (e) { /* */ } });
// Sur le PC du créateur : sa clé Kiting + Listen posée dans les deux apps, et le repère « mode admin » du launcher.
app.whenReady().then(() => { setTimeout(() => coach.appSelfKey(false).catch(() => {}), 12000); setInterval(() => coach.appSelfKey(false).catch(() => {}), 3600000); });
// Le launcher (mode admin) peut ouvrir directement une page : --open=admin-keys (Clés des apps).
function openFromArgs(argv) {
  const m = (argv || []).map(String).find((a) => a.startsWith('--open='));
  if (!m) return;
  const sec = m.slice(7) === 'admin-keys' ? 'admin:appkeys' : '';
  if (!sec) return;
  const go = () => { if (mainWin && !mainWin.isDestroyed()) { showMain(); mainWin.webContents.send('notify:go', sec); } };
  if (mainWin && !mainWin.isDestroyed() && !mainWin.webContents.isLoading()) go(); else setTimeout(go, 6000);
}
app.whenReady().then(() => openFromArgs(process.argv));
app.whenReady().then(() => { setTimeout(() => coach.appsRelay().catch(() => {}), 8000); setInterval(() => coach.appsRelay().catch(() => {}), 15000); });
ipcMain.handle('appcfg:post', (e, cfg, who) => coach.appCfgPost(cfg, String(who || '')));
ipcMain.handle('appcfg:assetPut', (e, id, data) => coach.appAssetPut(String(id || ''), String(data || '')));
ipcMain.handle('appcfg:asset', (e, id, sum) => coach.appAssetGet(String(id || ''), String(sum || '')));
ipcMain.handle('ann:get', (e, f, moi) => coach.annonceGet(f && typeof f === 'object' ? f : null, String(moi || '')));
ipcMain.handle('ann:post', (e, texte, who, retirer, to, subs, also) => coach.annoncePost(String(texte || ''), String(who || ''), typeof retirer === 'string' ? retirer.slice(0, 30) : !!retirer, Array.isArray(to) ? to : [], Array.isArray(subs) ? subs : [], Array.isArray(also) ? also.map(String).slice(0, 8) : []));
ipcMain.handle('ann:lu', (e, id, slug, at) => coach.annonceLu(id, slug, at));
ipcMain.handle('ann:lus', (e, slugs) => coach.annonceLus(slugs));
ipcMain.handle('staff:save', (e, note, who) => coach.staffNoteSave(note, who));
ipcMain.handle('chat:delete', (e, id, who) => coach.chatDelete(id, who));
ipcMain.handle('salons:save', (e, d) => coach.salonsSave(d || {}));
// Fond d'écran vidéo : le fichier choisi par le joueur est copié dans le dossier de FIRE (rien n'est envoyé en ligne).
const bgVidDir = () => app.getPath('userData');
const bgVidFile = () => { try { const f = fs.readdirSync(bgVidDir()).find((x) => /^fond-video\.(mp4|webm|mov|m4v)$/i.test(x)); return f ? path.join(bgVidDir(), f) : null; } catch (e) { return null; } };
// Position du champion dans chaque splash (tools/splash_focus.py) : pour cadrer les bannières de profil sur le visage.
let SPLASH_FOCUS = null;
ipcMain.handle('splash:focus', () => { if (!SPLASH_FOCUS) { try { SPLASH_FOCUS = require('./splash.json').skins || {}; } catch (e) { SPLASH_FOCUS = {}; } } return SPLASH_FOCUS; });
ipcMain.handle('bgvid:get', () => { const f = bgVidFile(); return f ? require('url').pathToFileURL(f).href + '?v=' + Math.round(fs.statSync(f).mtimeMs) : null; });
ipcMain.handle('bgvid:set', (e, data, ext) => {
  ext = String(ext || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return { ok: false, error: 'format non pris en charge (MP4 ou WebM)' };
  const buf = Buffer.from(data || []);
  if (!buf.length) return { ok: false, error: 'fichier vide' };
  if (buf.length > 500 * 1024 * 1024) return { ok: false, error: 'vidéo trop lourde (500 Mo au plus)' };
  try {
    const old = bgVidFile(); if (old) fs.unlinkSync(old);
    const f = path.join(bgVidDir(), 'fond-video.' + ext);
    fs.writeFileSync(f, buf);
    return { ok: true, url: require('url').pathToFileURL(f).href + '?v=' + Date.now() };
  } catch (err) { return { ok: false, error: String(err.message || err) }; }
});
ipcMain.handle('bgvid:clear', () => { const f = bgVidFile(); try { if (f) fs.unlinkSync(f); } catch (e) { /* */ } return true; });
ipcMain.handle('forum:get', (e, id) => coach.forumGet(String(id || '')));
ipcMain.handle('forum:op', (e, id, op) => coach.forumOp(String(id || ''), op && typeof op === 'object' ? op : {}));
ipcMain.handle('chat:send', (e, m) => coach.chatSend(m || {}));
ipcMain.handle('planning:save', (e, action) => coach.savePlanning(action || {}));
ipcMain.handle('bug:send', (e, b) => coach.sendBug(b || {}));
ipcMain.handle('bug:list', () => coach.listBugs());
ipcMain.handle('bug:close', (e, id) => coach.closeBug(id));
ipcMain.handle('bug:reply', (e, o) => coach.bugReply(o && typeof o === 'object' ? o : {}));
ipcMain.handle('bug:replies', (e, slug) => coach.bugReplies(String(slug || '')));
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
function setupUpdater(skipFirst) {
  if (!canAutoUpdate()) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'none' }));
  autoUpdater.on('update-available', (i) => sendUpdate({ state: 'available', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => sendUpdate({ state: 'progress', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => sendUpdate({ state: 'ready', version: i.version }));
  autoUpdater.on('error', (e) => onUpdateError(e));
  if (!skipFirst) setTimeout(safeCheck, 1500);
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
ipcMain.handle('notify', (e, m) => notify(String((m && m.title) || 'FIRE Team').slice(0, 120), String((m && m.body) || '').slice(0, 300), m && m.section, m && m.silent, !!(m && m.flash)));

// ---------- Avancé : accélération matérielle, cache, son de Windows ----------
// L'accélération matérielle se règle avant le démarrage : on lit le choix au lancement (redémarrage nécessaire).
const gpuPath = () => path.join(app.getPath('userData'), 'gpu.json');
const gpuOff = () => { try { return JSON.parse(fs.readFileSync(gpuPath(), 'utf8')).off === true; } catch (e) { return false; } };
ipcMain.handle('gpu:get', () => ({ off: gpuOff(), active: !gpuAtStart }));
// Mode jeu : pendant une partie, tous les processus de FIRE passent en priorité « inférieure à la normale » pour Windows,
// pour que le jeu passe d'abord. Le service audio garde sa priorité (le vocal ne doit pas hacher).
let perfGame = false;
function firePriority(low) {
  const P = require('os').constants.priority;
  for (const m of app.getAppMetrics()) {
    if (/audio/i.test(String(m.serviceName || m.name || ''))) continue;
    try { require('os').setPriority(m.pid, low ? P.PRIORITY_BELOW_NORMAL : P.PRIORITY_NORMAL); } catch (e) { /* processus déjà fermé */ }
  }
}
ipcMain.handle('perf:game', (e, on) => { perfGame = !!on; firePriority(perfGame); return perfGame; });
setInterval(() => { if (perfGame) firePriority(true); }, 30000);
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
// Fin de partie : FIRE passe devant pour montrer les clips de la game (seulement à la fin, jamais pendant).
ipcMain.handle('win:front', () => {
  if (!mainWin || mainWin.isDestroyed()) return false;
  try { if (mainWin.isMinimized()) mainWin.restore(); mainWin.show(); mainWin.moveTop(); mainWin.focus(); if (!mainWin.isFocused()) mainWin.flashFrame(true); } catch (e) { /* */ }
  return true;
});
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

// ---------- Launcher ----------
// Avant d'ouvrir FIRE, un petit écran cherche la mise à jour. S'il y en a une, il télécharge directement la DERNIÈRE
// version publiée (jamais les intermédiaires) et l'installe tout de suite : FIRE s'ouvre déjà à jour, en une fois.
// Pas de connexion, GitHub lent ou erreur : FIRE s'ouvre normalement (la mise à jour continue en arrière-plan).
let launcherWin = null;
function peekMode() { try { const j = JSON.parse(fs.readFileSync(quietPath(), 'utf8')); return Date.now() - (j.t || 0) > 600000 ? null : (j.mode || 'tray'); } catch (e) { return null; } }
async function launcher() {
  // Ouvert par FIRE Launcher : il vient déjà de tout mettre à jour, pas besoin de revérifier ici.
  if (!canAutoUpdate() || process.argv.includes('--from-launcher')) { createMainWindow(); setupUpdater(); return; }
  const silent = startHidden || peekMode() === 'tray'; // lancement avec Windows : pas d'écran, tout se fait en silence
  if (!silent) {
    launcherWin = new BrowserWindow({ width: 420, height: 300, frame: false, transparent: true, resizable: false, maximizable: false, fullscreenable: false, show: false, center: true, title: 'FIRE Team', icon: path.join(__dirname, 'assets', 'fire.ico'),
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false } });
    launcherWin.once('ready-to-show', () => { if (launcherWin && !launcherWin.isDestroyed()) launcherWin.show(); });
    launcherWin.webContents.once('did-finish-load', () => js(`ver(${JSON.stringify(app.getVersion())})`));
    launcherWin.loadFile(path.join(__dirname, 'launcher.html')).catch(() => {});
  }
  function js(code) { if (launcherWin && !launcherWin.isDestroyed()) launcherWin.webContents.executeJavaScript(code).catch(() => {}); }
  const st = (t, p) => js(`st(${JSON.stringify(t)}, ${p == null ? 'null' : JSON.stringify(p)})`);
  const res = await new Promise((resolve) => {
    let over = false, timer = null;
    const H = {
      'update-not-available': () => { updateState = { ...updateState, state: 'none' }; end('none'); },
      'update-available': (i) => { updateState = { ...updateState, state: 'available', version: i.version, percent: 0 }; st(`Nouvelle version ${i.version} : téléchargement…`, 0); arm(120000); },
      'download-progress': (p) => { const pc = Math.round(p.percent || 0); updateState = { ...updateState, state: 'progress', percent: pc }; st(`Téléchargement de la version ${updateState.version || ''}… ${pc} %`, pc); arm(120000); },
      'update-downloaded': (i) => { updateState = { ...updateState, state: 'ready', version: i.version }; end('ready'); },
      error: () => end('error'),
    };
    function end(r) { if (over) return; over = true; clearTimeout(timer); for (const [k, f] of Object.entries(H)) autoUpdater.removeListener(k, f); resolve(r); }
    function arm(ms) { clearTimeout(timer); timer = setTimeout(() => end('timeout'), ms); }
    for (const [k, f] of Object.entries(H)) autoUpdater.on(k, f);
    arm(12000); // recherche : 12 s au maximum, ensuite FIRE s'ouvre quand même
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    checking = true;
    autoUpdater.checkForUpdates().catch(() => end('error')).finally(() => { checking = false; });
  });
  if (res === 'ready' && !(silent && await lolBusy())) {
    st(`Installation de la version ${updateState.version}… FIRE se relance tout seul.`, 100);
    try { fs.writeFileSync(quietPath(), JSON.stringify({ t: Date.now(), mode: silent ? 'tray' : 'show' })); } catch (e) { /* */ }
    await new Promise((r) => setTimeout(r, 900));
    quitting = true;
    try { autoUpdater.quitAndInstall(true, true); return; } catch (e) { quitting = false; /* on ouvre FIRE quand même */ }
  }
  if (res === 'timeout' || res === 'error') st('Ouverture de FIRE…', -1);
  // La fenêtre de FIRE d'abord, puis on ferme le launcher (sinon « plus aucune fenêtre » quitterait l'app).
  setupUpdater(true);
  if (updateState.state === 'available' || updateState.state === 'progress') sendUpdate({});
  createMainWindow();
  const lw = launcherWin; launcherWin = null;
  if (lw && !lw.isDestroyed()) setTimeout(() => { try { lw.destroy(); } catch (e) { /* */ } }, 250);
}

// ---------- FIRE Launcher : installé en un clic depuis FIRE Team (bouton de l'Accueil et des Paramètres) ----------
const FL_SETUP = 'https://github.com/Toka120/fire-team-lol/releases/download/launcher/FIRE-Launcher-Setup.exe';
function flExe() {
  if (process.platform !== 'win32') return Promise.resolve(null);
  return new Promise((res) => require('child_process').execFile('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall', '/s'], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (err, out) => {
    for (const block of String(out || '').split(/\r?\n(?=HKEY_)/)) {
      const g = (k) => { const m = block.match(new RegExp('^\\s+' + k + '\\s+REG_\\w+\\s+(.*)$', 'mi')); return m ? m[1].trim() : ''; };
      if (!/^FIRE Launcher\b/i.test(g('DisplayName'))) continue;
      const icon = g('DisplayIcon').replace(/,\s*-?\d+$/, '').replace(/^"|"$/g, '');
      const dir = g('InstallLocation').replace(/^"|"$/g, '');
      const exe = /\.exe$/i.test(icon) ? icon : dir ? path.join(dir, 'FIRE Launcher.exe') : '';
      if (exe && fs.existsSync(exe)) return res(exe);
    }
    const local = process.env.LOCALAPPDATA || path.join(require('os').homedir(), 'AppData', 'Local');
    for (const d of ['FIRE Launcher', 'fire-launcher']) { const f = path.join(local, 'Programs', d, 'FIRE Launcher.exe'); if (fs.existsSync(f)) return res(f); }
    res(null);
  }));
}
const flRun = (exe) => { const c = require('child_process').spawn(exe, [], { detached: true, stdio: 'ignore', cwd: path.dirname(exe) }); c.on('error', () => {}); c.unref(); };
let flBusy = false;
ipcMain.handle('flauncher:status', async () => ({ installed: !!(await flExe()), busy: flBusy, win: process.platform === 'win32' }));
ipcMain.handle('flauncher:open', async () => { const exe = await flExe(); if (exe) flRun(exe); return !!exe; });
ipcMain.handle('flauncher:install', async (e) => {
  if (process.platform !== 'win32') return { ok: false, error: 'FIRE Launcher existe seulement sur Windows' };
  const have = await flExe();
  if (have) { flRun(have); return { ok: true, already: true }; }
  if (flBusy) return { ok: false, error: 'installation déjà en cours' };
  flBusy = true;
  const wc = e.sender;
  const P = (m) => { try { if (!wc.isDestroyed()) wc.send('flauncher', m); } catch (err) { /* */ } };
  const tmp = path.join(require('os').tmpdir(), 'FIRE-Launcher-Setup-' + Date.now() + '.exe');
  try {
    P({ state: 'download', pct: 0 });
    const r = await net.fetch(FL_SETUP, { cache: 'no-store' });
    if (!r.ok) throw new Error('téléchargement impossible (HTTP ' + r.status + ')');
    const total = Number(r.headers.get('content-length')) || 0;
    const out = fs.createWriteStream(tmp);
    const reader = r.body.getReader();
    let got = 0, last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      if (!out.write(Buffer.from(value))) await new Promise((ok) => out.once('drain', ok));
      if (Date.now() - last > 200) { last = Date.now(); P({ state: 'download', pct: total ? Math.round((got / total) * 100) : null }); }
    }
    await new Promise((ok, ko) => out.end((err) => (err ? ko(err) : ok())));
    P({ state: 'install' });
    const code = await new Promise((res) => { const c = require('child_process').spawn(tmp, ['/S'], { windowsHide: true }); c.on('exit', res); c.on('error', () => res(-1)); });
    const exe = await flExe();
    if (!exe) throw new Error(`l'installation n'a pas abouti (code ${code})`);
    flRun(exe);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  } finally {
    flBusy = false;
    P({ state: 'done' });
    setTimeout(() => { try { fs.rmSync(tmp, { force: true }); } catch (err) { /* */ } }, 8000);
  }
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
  app.on('second-instance', (e, argv) => { if (!(argv || []).includes('--hidden')) showMain(); openFromArgs(argv); });
  // Le bloqueur complet du navigateur intégré (listes lourdes à charger) n'est préparé qu'à sa première ouverture :
  // au lancement, il bloquait FIRE quelques secondes (« ne répond pas »).
  app.whenReady().then(() => { lockPermissions(); blockAds(); screenShare(); launcher().catch(() => { if (!mainWin || mainWin.isDestroyed()) createMainWindow(); setupUpdater(true); }); });
  app.on('window-all-closed', () => { if ((!bgPrefs().bg && !inVoice) || quitting) app.quit(); });
}
