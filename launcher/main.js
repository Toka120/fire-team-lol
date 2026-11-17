// FIRE Launcher : installe, met à jour et lance les apps FIRE (FIRE Team, FIRE Kiting, FIRE Listen).
// Chaque app est mise à jour en une fois, directement vers sa dernière version, avant d'être lancée.
const { app, BrowserWindow, ipcMain, shell, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile, spawn } = require('child_process');
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch (e) { /* développement */ }

const PAGES = 'https://toka120.github.io/fire-team-lol/';
const RAW = 'https://raw.githubusercontent.com/Toka120/fire-team-lol/main/';
const TEAM_SETUP = 'https://github.com/Toka120/fire-team-lol/releases/latest/download/FIRE-LoL-Setup.exe';
const TEAM_EXE = 'FIRE LoL.exe'; // nom du programme de FIRE Team (inchangé pour garder les données de chacun)
const LOCAL = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const APPS_DIR = process.env.FIRE_LAUNCHER_APPS || path.join(LOCAL, 'FIRE Launcher', 'apps');
// Valeurs de secours si le manifeste en ligne est injoignable au tout premier lancement.
const DEFAULT_APPS = {
  kiting: { name: 'FIRE Kiting', exe: 'FIRE Kiting.exe', url: 'https://github.com/Toka120/fire-team-lol/releases/download/apps/FIRE-Kiting.exe', sha256: '', version: '' },
  listen: { name: 'FIRE Listen', exe: 'FIRE Listen.exe', url: 'https://github.com/Toka120/fire-team-lol/releases/download/apps/FIRE-Listen.exe', sha256: '', version: '' },
};

// Version Microsoft Store : c'est le Store qui met le launcher à jour, et le démarrage avec Windows se règle dans Windows.
const STORE = !!process.windowsStore;
let win = null;
const send = (ch, m) => { if (win && !win.isDestroyed()) win.webContents.send(ch, m); };
const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const writeJson = (f, v) => { try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1)); } catch (e) { /* */ } };
const newer = (a, b) => {
  const x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
};

// ---------- Réglages ----------
const prefsPath = () => path.join(app.getPath('userData'), 'reglages.json');
const PREF0 = { onPlay: 'min', autostart: false, last: 'team' };
const prefs = () => ({ ...PREF0, ...(readJson(prefsPath(), {}) || {}) });
function setPrefs(p) {
  const cur = prefs();
  const n = { ...cur };
  if (['min', 'stay', 'close'].includes(p && p.onPlay)) n.onPlay = p.onPlay;
  if (p && typeof p.autostart === 'boolean') n.autostart = p.autostart;
  if (p && ['team', 'kiting', 'listen'].includes(p.last)) n.last = p.last;
  writeJson(prefsPath(), n);
  if (n.autostart !== cur.autostart && app.isPackaged && !STORE) { try { app.setLoginItemSettings({ openAtLogin: n.autostart, args: ['--minimized'] }); } catch (e) { /* */ } }
  return n;
}

// ---------- Données en ligne (site de l'équipe), avec copie locale si pas de connexion ----------
async function getJson(name) {
  const cache = path.join(app.getPath('userData'), 'cache', name.replace(/[\\/]/g, '_'));
  for (const base of [PAGES, RAW]) {
    try {
      const r = await net.fetch(base + name + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); writeJson(cache, j); return j; }
    } catch (e) { /* on essaie l'autre adresse */ }
  }
  return readJson(cache, null);
}
async function manifest() {
  const m = await getJson('launcher/apps.json');
  const apps = {};
  for (const id of Object.keys(DEFAULT_APPS)) apps[id] = { ...DEFAULT_APPS[id], ...((m && m.apps && m.apps[id]) || {}) };
  return { ...(m || {}), apps };
}

// ---------- Dernière version de FIRE Team : celle de la release GitHub (la même que la mise à jour automatique) ----------
const TEAM_YML = 'https://github.com/Toka120/fire-team-lol/releases/latest/download/latest.yml';
let ymlCache = { at: 0, v: null };
async function teamLatest(force) {
  if (!force && ymlCache.v && Date.now() - ymlCache.at < 60000) return ymlCache.v;
  let v = null;
  try {
    const r = await net.fetch(TEAM_YML + '?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) { const m = /^version:\s*['"]?([\d.]+)/m.exec(await r.text()); if (m) v = m[1]; }
  } catch (e) { /* hors ligne */ }
  const cfg = await getJson('joueurs.json');
  const announced = cfg && cfg.derniere_version;
  if (announced && (!v || newer(announced, v))) v = announced;
  if (v) ymlCache = { at: Date.now(), v };
  return v || ymlCache.v;
}

// ---------- Ce qui est installé et ce qui tourne ----------
function regUninstall() {
  if (process.platform !== 'win32') return Promise.resolve('');
  return new Promise((res) => execFile('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall', '/s'], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (e, out) => res(e ? '' : String(out))));
}
// FIRE Team (ex-FIRE LoL) : installé par son propre installeur, retrouvé dans la liste des programmes de Windows.
async function teamInstall() {
  const out = await regUninstall();
  for (const block of out.split(/\r?\n(?=HKEY_)/)) {
    const g = (k) => { const m = block.match(new RegExp('^\\s+' + k + '\\s+REG_\\w+\\s+(.*)$', 'mi')); return m ? m[1].trim() : ''; };
    if (!/^FIRE (LoL|Team)\b/i.test(g('DisplayName'))) continue;
    const icon = g('DisplayIcon').replace(/,\s*-?\d+$/, '').replace(/^"|"$/g, '');
    const dir = g('InstallLocation').replace(/^"|"$/g, '');
    const exe = /\.exe$/i.test(icon) ? icon : dir ? path.join(dir, TEAM_EXE) : '';
    if (exe && fs.existsSync(exe)) return { exe, version: exeVersion(exe) || g('DisplayVersion') };
  }
  for (const d of ['FIRE LoL', 'fire-lol', 'FIRE Team']) {
    const exe = path.join(LOCAL, 'Programs', d, TEAM_EXE);
    if (fs.existsSync(exe)) return { exe, version: exeVersion(exe) };
  }
  return null;
}
// Electron lit directement dans app.asar : on y trouve le package.json, donc la version exacte installée.
function exeVersion(exe) {
  try { return JSON.parse(fs.readFileSync(path.join(path.dirname(exe), 'resources', 'app.asar', 'package.json'), 'utf8')).version || ''; } catch (e) { return ''; }
}
function killExe(name) {
  if (process.platform !== 'win32') return Promise.resolve();
  return new Promise((res) => execFile('taskkill', ['/f', '/t', '/im', name], { windowsHide: true }, () => setTimeout(res, 1200)));
}
function running() {
  if (process.platform !== 'win32') return Promise.resolve(new Set());
  return new Promise((res) => execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (e, out) => {
    res(new Set(e ? [] : String(out).split(/\r?\n/).map((l) => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map((s) => s.toLowerCase())));
  }));
}
const appDir = (id) => path.join(APPS_DIR, id);
const recPath = (id) => path.join(appDir(id), 'installe.json');

async function stateAll() {
  const [m, latest, run, team] = await Promise.all([manifest(), teamLatest(), running(), teamInstall()]);
  const apps = {
    team: { installed: !!team, version: (team && team.version) || '', latest, running: run.has(TEAM_EXE.toLowerCase()), available: true,
      update: !!(team && latest && (!team.version || newer(latest, team.version))) },
  };
  for (const id of ['kiting', 'listen']) {
    const a = m.apps[id];
    const exe = path.join(appDir(id), a.exe);
    const rec = readJson(recPath(id), null);
    const inst = fs.existsSync(exe);
    apps[id] = { installed: inst, version: (rec && rec.version) || '', latest: a.version || '', running: run.has(String(a.exe).toLowerCase()), available: !!a.url,
      update: !!(inst && a.sha256 && (!rec || rec.sha256 !== a.sha256)), size: a.size || 0 };
  }
  return { apps, online: !!latest, launcher: app.getVersion(), news: (m && m.news) || null };
}

// ---------- Téléchargement (suit les redirections de GitHub), avec progression et contrôle d'empreinte ----------
async function download(url, dest, onPct, expectSha) {
  const r = await net.fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('téléchargement impossible (HTTP ' + r.status + ')');
  const total = Number(r.headers.get('content-length')) || 0;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + '.part';
  const out = fs.createWriteStream(tmp);
  const hash = crypto.createHash('sha256');
  let got = 0, last = 0;
  const reader = r.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const b = Buffer.from(value);
      hash.update(b); got += b.length;
      if (!out.write(b)) await new Promise((ok) => out.once('drain', ok));
      if (Date.now() - last > 150) { last = Date.now(); onPct(total ? (got / total) * 100 : null, got, total); }
    }
  } catch (e) { out.destroy(); try { fs.rmSync(tmp, { force: true }); } catch (err) { /* */ } throw new Error('connexion coupée pendant le téléchargement'); }
  await new Promise((ok, ko) => out.end((err) => (err ? ko(err) : ok())));
  const sum = hash.digest('hex');
  if (expectSha && sum !== expectSha) { try { fs.rmSync(tmp, { force: true }); } catch (e) { /* */ } throw new Error('fichier reçu abîmé : réessaie'); }
  try { fs.rmSync(dest, { force: true }); } catch (e) { /* */ }
  fs.renameSync(tmp, dest);
  return sum;
}
function launch(exe, args) {
  const c = spawn(exe, args || [], { detached: true, stdio: 'ignore', cwd: path.dirname(exe), windowsHide: false });
  c.on('error', () => {});
  c.unref();
}
const mb = (n) => (n / 1048576).toFixed(n > 104857600 ? 0 : 1).replace('.', ',') + ' Mo';
const pctTxt = (t, pct, got, total) => t + (pct != null ? ` ${Math.round(pct)} %` : '') + (total ? `  (${mb(got)} / ${mb(total)})` : '');

async function playTeam(P, opts) {
  P('Vérification de FIRE Team…');
  const latest = await teamLatest(true);
  let inst = await teamInstall();
  const isRun = (await running()).has(TEAM_EXE.toLowerCase());
  const need = !inst || opts.repair || !!(latest && (!inst.version || newer(latest, inst.version)));
  if (need) {
    const tmp = path.join(os.tmpdir(), 'FIRE-Team-Setup-' + Date.now() + '.exe');
    const t = inst ? `Mise à jour vers la version ${latest || 'la plus récente'}…` : 'Téléchargement de FIRE Team…';
    await download(TEAM_SETUP, tmp, (pct, got, total) => P(pctTxt(t, pct, got, total), pct));
    if (isRun) { P('Fermeture de FIRE Team pour la mise à jour…'); await killExe(TEAM_EXE); }
    P('Installation de FIRE Team…');
    const code = await new Promise((res) => { const c = spawn(tmp, ['/S'], { windowsHide: true }); c.on('exit', res); c.on('error', () => res(-1)); });
    setTimeout(() => { try { fs.rmSync(tmp, { force: true }); } catch (e) { /* */ } }, 5000);
    inst = await teamInstall();
    if (!inst) throw new Error(`l'installation n'a pas abouti (code ${code})`);
    if (latest && inst.version && newer(latest, inst.version)) throw new Error(`la mise à jour n'a pas pris (version ${inst.version} au lieu de ${latest}) : réessaie`);
  }
  if (!inst) throw new Error('FIRE Team est introuvable');
  P('Lancement de FIRE Team…');
  launch(inst.exe, ['--from-launcher']);
  return { ok: true, already: isRun && !need, updated: need };
}
async function playExe(id, P, opts) {
  const a = (await manifest()).apps[id];
  if (!a.url) throw new Error(`${a.name} n'est pas encore disponible`);
  const exe = path.join(appDir(id), a.exe);
  const rec = readJson(recPath(id), null);
  const isRun = (await running()).has(String(a.exe).toLowerCase());
  const need = !fs.existsSync(exe) || opts.repair || (a.sha256 && (!rec || rec.sha256 !== a.sha256));
  if (isRun && !need) return { ok: true, already: true };
  if (need) {
    if (isRun) { P(`Fermeture de ${a.name} pour la mise à jour…`); await killExe(a.exe); }
    const t = fs.existsSync(exe) ? `Mise à jour de ${a.name}…` : `Téléchargement de ${a.name}…`;
    P(t, 0);
    const sum = await download(a.url, exe, (pct, got, total) => P(pctTxt(t, pct, got, total), pct), a.sha256);
    writeJson(recPath(id), { sha256: sum, version: a.version || '', at: Date.now() });
  }
  P(`Lancement de ${a.name}…`);
  launch(exe, []);
  return { ok: true };
}

const busy = new Set();
let selfReady = false;
ipcMain.handle('apps:state', () => stateAll());
ipcMain.handle('apps:play', async (e, id, opts) => {
  if (!['team', 'kiting', 'listen'].includes(id)) return { ok: false, error: 'app inconnue' };
  if (busy.has(id)) return { ok: false, error: 'déjà en cours' };
  busy.add(id);
  const P = (text, pct = null) => send('apps:progress', { id, text, pct });
  try {
    const r = id === 'team' ? await playTeam(P, opts || {}) : await playExe(id, P, opts || {});
    setPrefs({ last: id });
    if (r.ok && !(opts && opts.noLaunch)) {
      const p = prefs();
      if (p.onPlay === 'min' && win && !win.isDestroyed()) setTimeout(() => win.minimize(), 900);
      if (p.onPlay === 'close') setTimeout(() => { if (!busy.size) app.quit(); }, 1500);
    }
    return r;
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  } finally {
    busy.delete(id);
    send('apps:progress', { id, done: true });
    if (selfReady && !busy.size) setTimeout(() => autoUpdater.quitAndInstall(true, true), 1500);
  }
});
ipcMain.handle('apps:folder', async (e, id) => {
  if (id === 'team') { const t = await teamInstall(); if (t) shell.showItemInFolder(t.exe); return !!t; }
  if (!['kiting', 'listen'].includes(id)) return false;
  fs.mkdirSync(appDir(id), { recursive: true });
  shell.openPath(appDir(id));
  return true;
});
ipcMain.handle('apps:uninstall', async (e, id) => {
  if (!['kiting', 'listen'].includes(id) || busy.has(id)) return { ok: false };
  const a = (await manifest()).apps[id];
  if ((await running()).has(String(a.exe).toLowerCase())) return { ok: false, error: `Ferme d'abord ${a.name}.` };
  try { fs.rmSync(appDir(id), { recursive: true, force: true }); return { ok: true }; } catch (err) { return { ok: false, error: String(err.message || err) }; }
});
// Notes de version de FIRE Team (format « v / items », et l'ancien « version / notes »).
ipcMain.handle('data:patchnotes', async () => {
  const p = await getJson('patchnotes.json');
  return ((p && p.versions) || []).filter((x) => x && (x.v || x.version)).slice(0, 12).map((x) => ({
    version: String(x.v || x.version), date: x.date || '', titre: x.titre || '',
    notes: Array.isArray(x.items) ? x.items.map((it) => (Array.isArray(it) ? String(it[1] || '') : String(it || ''))).filter(Boolean) : (Array.isArray(x.notes) ? x.notes.map(String) : []),
  }));
});
ipcMain.handle('prefs:get', () => ({ ...prefs(), version: app.getVersion(), store: STORE }));
ipcMain.handle('prefs:set', (e, p) => setPrefs(p || {}));
ipcMain.handle('open:url', (e, u) => { if (/^https:\/\//.test(String(u))) shell.openExternal(String(u)); });
ipcMain.handle('win:min', () => win && win.minimize());
ipcMain.handle('win:max', () => { if (win) { if (win.isMaximized()) win.unmaximize(); else win.maximize(); } });
ipcMain.handle('win:close', () => app.quit());
ipcMain.handle('self:install', () => { if (selfReady && !busy.size) autoUpdater.quitAndInstall(true, true); });

// ---------- Mise à jour du launcher lui-même (canal « launcher » de la release « launcher ») ----------
function selfUpdate() {
  if (!autoUpdater || !app.isPackaged || STORE) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (i) => send('self', { state: 'progress', version: i.version, pct: 0 }));
  autoUpdater.on('download-progress', (p) => send('self', { state: 'progress', pct: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => {
    selfReady = true;
    send('self', { state: 'ready', version: i.version });
    // Pas pendant une installation d'app : on attend qu'elle finisse.
    if (!busy.size) setTimeout(() => { if (!busy.size) autoUpdater.quitAndInstall(true, true); }, 2500);
  });
  autoUpdater.on('error', () => send('self', { state: 'error' }));
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => { if (!selfReady) autoUpdater.checkForUpdates().catch(() => {}); }, 60 * 60 * 1000);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 780, minWidth: 1020, minHeight: 640, frame: false, show: false,
    backgroundColor: '#0b0d10', title: 'FIRE Launcher', icon: path.join(__dirname, 'assets', 'fire.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once('ready-to-show', () => { if (process.argv.includes('--minimized')) win.minimize(); else win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('maximize', () => send('win', { max: true }));
  win.on('unmaximize', () => send('win', { max: false }));
  win.loadFile(path.join(__dirname, 'index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  if (process.platform === 'win32') app.setAppUserModelId('lol.fire.launcher');
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  Menu.setApplicationMenu(null);
  app.whenReady().then(() => { createWindow(); selfUpdate(); });
  app.on('window-all-closed', () => app.quit());
}
