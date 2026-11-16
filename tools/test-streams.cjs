// Lancer avec Electron : electron tools/test-streams.cjs [dossier de résultats].
// Flux synthétiques locaux uniquement : aucun micro, caméra ou appel réseau.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const out = path.resolve(process.argv[2] || 'streams-test-output');
  fs.mkdirSync(out, { recursive: true });
  const win = new BrowserWindow({ show: false, width: 1600, height: 900,
    webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true } });
  try {
    await win.loadURL('data:text/html,<button id="start">Ouvrir les partages</button>');
    await win.webContents.insertCSS(fs.readFileSync(path.join(__dirname, '../app/renderer/style.css'), 'utf8'));
    await win.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, '../app/renderer/streams-view.js'), 'utf8'));
    const report = await win.webContents.executeJavaScript(`(async () => {
      const results = {}, check = (name, ok) => { results[name] = !!ok; if (!ok) throw Error(name); };
      const tick = () => new Promise(r => setTimeout(r, 180));
      const source = (key, w, h, color) => {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff'; ctx.font = '36px sans-serif'; ctx.fillText(key, 40, 65);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.strokeRect(8, 8, w - 16, h - 16);
        return { key, name: key, stream: c.captureStream(5) };
      };
      const a = source('Écran A · 16:9', 1280, 720, '#174757');
      const b = source('Écran B · 16:9', 1280, 720, '#49314e');
      const portrait = source('Écran C · vertical', 450, 800, '#344a24');
      window.testSources = [a, b, portrait];
      document.querySelector('#start').focus(); FireStreams.open([a, b]); await tick();
      check('fullscreenNative', !!document.fullscreenElement);
      check('twoStreams', document.querySelectorAll('.streams-tile:not([hidden])').length === 2);
      check('landscapeSideBySide', getComputedStyle(document.querySelector('.streams-grid')).gridTemplateColumns.split(' ').length === 2);
      check('proportionsConserved', [...document.querySelectorAll('.streams-tile video')].every(x => getComputedStyle(x).objectFit === 'contain'));
      check('blackBackdrop', getComputedStyle(document.querySelector('.streams-view')).backgroundColor === 'rgb(0, 0, 0)');
      check('mutedViewer', [...document.querySelectorAll('.streams-tile video')].every(x => x.muted));
      const original = document.querySelector('.streams-tile video');
      document.querySelector('.streams-tile').click();
      check('clickFocus', document.querySelectorAll('.streams-tile:not([hidden])').length === 1);
      check('focusKeepsNativeFullscreen', !!document.fullscreenElement);
      document.querySelector('.streams-tools button').click();
      check('returnGrid', document.querySelectorAll('.streams-tile:not([hidden])').length === 2);
      FireStreams.sync([a, b, portrait]); await tick();
      check('joinWhileFullscreen', document.querySelectorAll('.streams-tile').length === 3 && !!document.fullscreenElement);
      check('existingVideoReused', document.querySelector('.streams-tile video') === original);
      document.querySelector('.streams-tile').click(); FireStreams.sync([b, portrait]);
      check('focusedStreamLeaves', document.querySelectorAll('.streams-tile:not([hidden])').length === 2);
      const replacement = source(b.key, 640, 360, '#364b62');
      FireStreams.sync([replacement, portrait]); await tick();
      check('streamReplacement', document.querySelector('.streams-tile video').srcObject === replacement.stream);
      FireStreams.sync([a, b]); await tick();
      window.testResults = results; return results;
    })()`, true);
    fs.writeFileSync(path.join(out, 'grid.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`document.querySelector('.streams-tile').click()`);
    fs.writeFileSync(path.join(out, 'focus.png'), (await win.webContents.capturePage()).toPNG());
    const ending = await win.webContents.executeJavaScript(`(async () => {
      const r = {}; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      r.escapeCloses = !FireStreams.active && !document.querySelector('.streams-view');
      r.tracksStillLive = testSources.every(x => x.stream.getVideoTracks()[0].readyState === 'live');
      r.focusRestored = document.activeElement.id === 'start';
      FireStreams.open(testSources); await new Promise(r => setTimeout(r, 120));
      await document.exitFullscreen(); await new Promise(r => setTimeout(r, 120));
      r.systemExitCleansUp = !FireStreams.active;
      FireStreams.open(testSources); FireStreams.sync([]);
      r.lastStreamLeaves = !FireStreams.active;
      return r;
    })()`, true);
    const results = { ...report, ...ending };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
    if (Object.values(results).some(x => !x)) throw Error('Échec de vérification');
    console.log(JSON.stringify(results)); app.exit(0);
  } catch (e) {
    fs.writeFileSync(path.join(out, 'error.txt'), e.stack); console.error(e); app.exit(1);
  }
});
