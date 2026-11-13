// FIRE — lecture de la mini-carte pendant la partie, pour la Revue de parties.
// Une fois par seconde, FIRE regarde la mini-carte sur l'écran (même capture que les clips) et y cherche le portrait de
// chacun des 10 champions (icônes officielles Data Dragon). Seuls les champions visibles sur TA mini-carte sont trouvés
// (le brouillard de guerre est respecté). Rien n'est lu dans le jeu : c'est seulement l'image de l'écran.
// Le calcul se fait dans un worker pour ne jamais ralentir FIRE.
(function () {
  'use strict';
  const N = 192; // la mini-carte est ramenée à 192 × 192 pixels pour la recherche
  const M = { on: false, stream: null, video: null, cv: null, ctx: null, worker: null, timer: null, opts: null, last: null, scale: null, err: '', busy: false, frames: 0, found: 0 };

  const WORKER = `
    let T = []; // modèles : { idx, d, data (Float32 RGB masqué), mean, std, n }
    function prep(list) {
      T = list.map((t) => {
        const d = t.d, r = d * 0.42, c = (d - 1) / 2, vals = [], offs = [];
        for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) {
          if ((x - c) ** 2 + (y - c) ** 2 > r * r) continue;
          const i = (y * d + x) * 4; vals.push(t.px[i], t.px[i + 1], t.px[i + 2]); offs.push(y, x);
        }
        const n = vals.length; let m = 0; for (const v of vals) m += v; m /= n;
        let s = 0; const data = new Float32Array(n); for (let i = 0; i < n; i++) { data[i] = vals[i] - m; s += data[i] * data[i]; }
        return { idx: t.idx, d, data, std: Math.sqrt(s) || 1, offs: Int16Array.from(offs), n };
      });
    }
    function ncc(img, W, t, ox, oy) {
      const o = t.offs; let sum = 0;
      for (let k = 0, j = 0; k < o.length; k += 2) { const p = ((oy + o[k]) * W + ox + o[k + 1]) * 4; sum += img[p] + img[p + 1] + img[p + 2]; j += 3; }
      const mean = sum / t.n; let num = 0, den = 0;
      for (let k = 0, j = 0; k < o.length; k += 2, j += 3) {
        const p = ((oy + o[k]) * W + ox + o[k + 1]) * 4;
        const a = img[p] - mean, b = img[p + 1] - mean, c = img[p + 2] - mean;
        num += a * t.data[j] + b * t.data[j + 1] + c * t.data[j + 2]; den += a * a + b * b + c * c;
      }
      return den > 0 ? num / (Math.sqrt(den) * t.std) : 0;
    }
    function find(img, W, t) {
      let best = -1, bx = 0, by = 0; const lim = W - t.d;
      for (let y = 0; y <= lim; y += 2) for (let x = 0; x <= lim; x += 2) { const s = ncc(img, W, t, x, y); if (s > best) { best = s; bx = x; by = y; } }
      const cx = bx, cy = by;
      for (let y = Math.max(0, cy - 1); y <= Math.min(lim, cy + 1); y++) for (let x = Math.max(0, cx - 1); x <= Math.min(lim, cx + 1); x++) { const s = ncc(img, W, t, x, y); if (s > best) { best = s; bx = x; by = y; } }
      return { s: best, u: (bx + t.d / 2) / W, v: (by + t.d / 2) / W };
    }
    onmessage = (e) => {
      const m = e.data;
      if (m.t === 'tpl') { prep(m.list); postMessage({ t: 'ready' }); return; }
      if (m.t === 'frame') {
        const img = new Uint8ClampedArray(m.buf), W = m.W;
        const out = T.map((t) => ({ idx: t.idx, ...find(img, W, t) }));
        postMessage({ t: 'pos', id: m.id, out });
      }
    };`;

  function worker() {
    if (M.worker) return M.worker;
    M.worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })));
    M.worker.onmessage = (e) => onWorker(e.data);
    return M.worker;
  }

  // Icône Data Dragon du champion, lue par FIRE (pas de souci de sécurité du canvas), réduite à la taille d'une icône de mini-carte.
  const ICONS = {};
  async function icon(champ, ver) {
    const key = ver + '/' + champ;
    if (ICONS[key]) return ICONS[key];
    const buf = await window.fire.ddImage(`cdn/${ver}/img/champion/${champ}.png`).catch(() => null);
    if (!buf) return null;
    ICONS[key] = await createImageBitmap(new Blob([buf])).catch(() => null);
    return ICONS[key];
  }
  async function templates(players, ver, frac) {
    const d = Math.max(9, Math.round(N * frac));
    const c = document.createElement('canvas'); c.width = d; c.height = d;
    const x = c.getContext('2d', { willReadFrequently: true });
    const list = [];
    for (let i = 0; i < players.length; i++) {
      const bmp = await icon(players[i].c, ver); if (!bmp) continue;
      x.clearRect(0, 0, d, d);
      // Sur la mini-carte, le portrait est un peu zoomé dans son cercle : on recadre légèrement l'icône carrée.
      x.drawImage(bmp, bmp.width * 0.08, bmp.height * 0.08, bmp.width * 0.84, bmp.height * 0.84, 0, 0, d, d);
      list.push({ idx: i, d, px: Array.from(x.getImageData(0, 0, d, d).data) });
    }
    return list;
  }

  async function grab(sourceId) {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId, maxWidth: 2560, maxHeight: 1440, maxFrameRate: 2 } } });
  }

  let frameId = 0;
  function tick() {
    if (!M.on || M.busy || !M.video || M.video.readyState < 2) return;
    const r = M.opts.rect, vw = M.video.videoWidth, vh = M.video.videoHeight;
    if (!vw || !vh) return;
    M.ctx.drawImage(M.video, r.x * vw, r.y * vh, r.w * vw, r.h * vh, 0, 0, N, N);
    const data = M.ctx.getImageData(0, 0, N, N).data;
    M.busy = true; M.sent = Date.now();
    worker().postMessage({ t: 'frame', id: ++frameId, W: N, buf: data.buffer }, [data.buffer]);
  }
  function onWorker(m) {
    if (m.t === 'ready') { M.ready = true; return; }
    if (m.t !== 'pos') return;
    M.busy = false; M.frames++;
    const pts = new Array(M.opts.players.length).fill(null);
    // Un seul champion par endroit : le meilleur score garde la place.
    const ok = m.out.filter((o) => o.s >= (M.opts.min || 0.68)).sort((a, b) => b.s - a.s);
    const taken = [];
    for (const o of ok) {
      if (taken.some((t) => Math.hypot(t.u - o.u, t.v - o.v) < 0.025)) continue;
      taken.push(o); pts[o.idx] = [Math.round(o.u * 1000), Math.round(o.v * 1000), Math.round(o.s * 100)];
    }
    M.found = taken.length; M.last = { at: Date.now(), pts };
    // Taille des icônes inconnue au départ (elle dépend des réglages de la mini-carte) : on essaie plusieurs tailles
    // pendant la première minute et on garde celle qui reconnaît le mieux les champions.
    const A = M.auto;
    if (A && !A.locked) {
      const top = m.out.map((o) => o.s).sort((a, b) => b - a).slice(0, 3);
      const k = A.fracs[A.i]; (A.sc[k] = A.sc[k] || []).push(top.reduce((a, b) => a + b, 0) / Math.max(1, top.length));
      if (A.sc[k].length >= 6) {
        A.i++;
        if (A.i >= A.fracs.length) {
          const best = A.fracs.map((f) => [f, A.sc[f].reduce((a, b) => a + b, 0) / A.sc[f].length]).sort((a, b) => b[1] - a[1])[0][0];
          A.locked = true; setFrac(best); if (M.opts.onScale) M.opts.onScale(best);
        } else setFrac(A.fracs[A.i]);
      }
    }
    if (M.opts.onPos && (!A || A.locked)) M.opts.onPos(pts, m.out);
  }

  async function setFrac(f) { M.opts.frac = f; worker().postMessage({ t: 'tpl', list: await templates(M.opts.players, M.opts.ver, f) }); }
  // opts : { sourceId, rect: {x,y,w,h} (fractions de l'écran), players: [{c}], ver, frac, onPos }
  async function start(opts) {
    stop();
    M.opts = opts; M.err = ''; M.frames = 0; M.ready = false;
    try {
      M.stream = await grab(opts.sourceId);
      M.video = document.createElement('video'); M.video.muted = true; M.video.srcObject = M.stream; await M.video.play().catch(() => {});
      M.cv = document.createElement('canvas'); M.cv.width = N; M.cv.height = N; M.ctx = M.cv.getContext('2d', { willReadFrequently: true });
      M.auto = opts.fixed ? null : { fracs: [0.07, 0.08, 0.09, 0.1, 0.11], i: 0, sc: {}, locked: false };
      worker().postMessage({ t: 'tpl', list: await templates(opts.players, opts.ver, M.auto ? M.auto.fracs[0] : (opts.frac || 0.085)) });
      M.on = true;
      M.timer = setInterval(tick, 1000);
    } catch (e) { M.err = 'capture de l’écran impossible'; stop(); }
  }
  function stop() {
    M.on = false; clearInterval(M.timer); M.timer = null; M.busy = false;
    if (M.stream) M.stream.getTracks().forEach((t) => t.stop());
    M.stream = null; M.video = null;
  }
  // Une image de l'écran (après un délai, le temps de revenir dans le jeu) pour placer le cadre de la mini-carte.
  async function snapshot(sourceId, delayMs) {
    const st = await grab(sourceId);
    try {
      const v = document.createElement('video'); v.muted = true; v.srcObject = st; await v.play().catch(() => {});
      await new Promise((r) => setTimeout(r, delayMs || 0));
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0);
      return { url: c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height };
    } finally { st.getTracks().forEach((t) => t.stop()); }
  }
  // Tests : détection sur une image déjà à la taille N × N.
  async function _detect(imgData, players, ver, frac) {
    M.opts = { players, onPos: null, min: 0.68 };
    await new Promise((res) => { const w = worker(); const prev = w.onmessage; w.onmessage = (e) => { if (e.data.t === 'ready') { w.onmessage = prev; res(); } }; templates(players, ver, frac || 0.085).then((list) => w.postMessage({ t: 'tpl', list })); });
    return new Promise((res) => { M.opts.onPos = (pts, raw) => res({ pts, raw }); const d = new Uint8ClampedArray(imgData.data); worker().postMessage({ t: 'frame', id: 1, W: N, buf: d.buffer }, [d.buffer]); });
  }
  window.FireMinimap = { _detect, N, start, stop, snapshot, state: () => ({ on: M.on, err: M.err, frames: M.frames, found: M.found, last: M.last }) };
})();
