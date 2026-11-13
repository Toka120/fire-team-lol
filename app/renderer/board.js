// FIRE — tableau tactique du salon vocal.
// Une carte de la Faille (ou un écran partagé) sur laquelle tout le salon dessine en direct :
// crayon, flèches, pions des deux équipes, wards, gomme. Tout passe par le canal de contrôle du vocal
// (pair à pair, chiffré), rien n'est stocké en ligne. Les positions sont relatives (0 à 1) : chacun voit
// les dessins au même endroit, quelle que soit la taille de sa fenêtre.
(function () {
  'use strict';
  const B = {
    open: false, bg: { k: 'map' }, items: [], cur: null, tool: 'pen', color: '#F5A524', tok: { team: 'b', role: 'T' }, ward: 'y',
    drag: null, opts: null, el: null, cv: null, ctx: null, map: null, mapTried: false, streams: {}, vids: {}, raf: 0, lastSend: 0,
  };
  const COLORS = [['#F5A524', 'Or'], ['#579DFF', 'Bleu'], ['#EF6670', 'Rouge'], ['#F2F4F7', 'Blanc'], ['#39C58A', 'Vert']];
  const ROLES = [['T', 'Top'], ['J', 'Jungle'], ['M', 'Mid'], ['A', 'ADC'], ['S', 'Support']];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const me = () => (B.opts && B.opts.me()) || 'moi';
  const send = (m, to) => { if (B.opts) B.opts.send({ t: 'tb', ...m }, to); };
  const changed = () => { if (B.opts && B.opts.onChange) B.opts.onChange(); };

  // ---------- Fond : carte de la Faille (Data Dragon) ou dessin de secours, ou un écran partagé ----------
  function loadMap() {
    if (B.mapTried) return;
    const v = B.opts && B.opts.ddVersion && B.opts.ddVersion();
    if (!v) return;
    B.mapTried = true;
    const img = new Image();
    img.onload = () => { B.map = img; draw(); };
    img.src = `https://ddragon.leagueoflegends.com/cdn/${v}/img/map/map11.png`;
  }
  function fallbackMap(c, x, y, s) {
    c.fillStyle = '#16261d'; c.fillRect(x, y, s, s);
    c.lineCap = 'round';
    // Rivière
    c.strokeStyle = 'rgba(87,157,255,.35)'; c.lineWidth = s * 0.06;
    c.beginPath(); c.moveTo(x + s * 0.18, y + s * 0.18); c.lineTo(x + s * 0.82, y + s * 0.82); c.stroke();
    // Voies
    c.strokeStyle = 'rgba(214,190,140,.55)'; c.lineWidth = s * 0.035;
    c.beginPath(); c.moveTo(x + s * 0.1, y + s * 0.88); c.lineTo(x + s * 0.1, y + s * 0.1); c.lineTo(x + s * 0.88, y + s * 0.1); c.stroke();
    c.beginPath(); c.moveTo(x + s * 0.12, y + s * 0.9); c.lineTo(x + s * 0.9, y + s * 0.9); c.lineTo(x + s * 0.9, y + s * 0.12); c.stroke();
    c.beginPath(); c.moveTo(x + s * 0.14, y + s * 0.86); c.lineTo(x + s * 0.86, y + s * 0.14); c.stroke();
    // Bases
    c.fillStyle = 'rgba(87,157,255,.55)'; c.beginPath(); c.arc(x + s * 0.08, y + s * 0.92, s * 0.07, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(239,102,112,.55)'; c.beginPath(); c.arc(x + s * 0.92, y + s * 0.08, s * 0.07, 0, Math.PI * 2); c.fill();
  }
  function videoOf(key) {
    const st = B.streams[key];
    if (!st) return null;
    let v = B.vids[key];
    if (!v || v.srcObject !== st) { v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = st; v.play().catch(() => {}); B.vids[key] = v; }
    return v;
  }
  // Zone de dessin : un carré pour la carte, le format de la vidéo pour un écran.
  function frame() {
    const W = B.cv.width, H = B.cv.height;
    let ar = 1;
    if (B.bg.k === 'screen') { const v = videoOf(B.bg.key); ar = v && v.videoWidth ? v.videoWidth / v.videoHeight : 16 / 9; }
    let w = W, h = W / ar;
    if (h > H) { h = H; w = H * ar; }
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }

  // ---------- Dessin ----------
  function draw() {
    if (!B.cv) return;
    const c = B.ctx, W = B.cv.width, H = B.cv.height;
    c.clearRect(0, 0, W, H);
    const f = frame();
    if (B.bg.k === 'screen') {
      const v = videoOf(B.bg.key);
      c.fillStyle = '#000'; c.fillRect(f.x, f.y, f.w, f.h);
      if (v && v.readyState >= 2) c.drawImage(v, f.x, f.y, f.w, f.h);
    } else {
      loadMap();
      if (B.map) c.drawImage(B.map, f.x, f.y, f.w, f.h); else fallbackMap(c, f.x, f.y, f.w);
    }
    const u = Math.min(f.w, f.h) / 100; // unité : 1 % de la zone
    const P = (p) => [f.x + p[0] * f.w, f.y + p[1] * f.h];
    const all = B.cur ? B.items.filter((x) => x.id !== B.cur.id).concat(B.cur) : B.items;
    for (const it of all) {
      c.save();
      if (it.k === 'pen' || it.k === 'arrow') {
        c.strokeStyle = it.c; c.fillStyle = it.c; c.lineWidth = Math.max(2, u * 0.7); c.lineCap = 'round'; c.lineJoin = 'round';
        c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 3;
        const pts = it.pts.map(P);
        if (pts.length) {
          c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
          if (it.k === 'pen') for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
          else c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
          c.stroke();
          if (it.k === 'arrow' && pts.length > 1) {
            const [a, b] = [pts[0], pts[pts.length - 1]];
            const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = Math.max(10, u * 3.2);
            c.beginPath(); c.moveTo(b[0], b[1]);
            c.lineTo(b[0] - L * Math.cos(ang - 0.45), b[1] - L * Math.sin(ang - 0.45));
            c.lineTo(b[0] - L * Math.cos(ang + 0.45), b[1] - L * Math.sin(ang + 0.45));
            c.closePath(); c.fill();
          }
        }
      } else if (it.k === 'tok') {
        const [x, y] = P([it.x, it.y]); const r = Math.max(9, u * 2.6);
        c.fillStyle = it.team === 'b' ? '#579DFF' : '#EF6670'; c.strokeStyle = '#0B0D10'; c.lineWidth = 2;
        c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 4;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; c.stroke();
        c.fillStyle = '#0B0D10'; c.font = `600 ${Math.round(r * 1.05)}px Inter, "Segoe UI", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(it.role, x, y + 1);
      } else if (it.k === 'ward') {
        const [x, y] = P([it.x, it.y]); const r = Math.max(6, u * 1.6);
        const col = it.c === 'p' ? '#EF6A9D' : '#E8C56A';
        c.fillStyle = col + '22'; c.beginPath(); c.arc(x, y, u * 9, 0, Math.PI * 2); c.fill();
        c.fillStyle = col; c.strokeStyle = '#0B0D10'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, y - r * 1.3); c.lineTo(x + r, y); c.lineTo(x, y + r * 1.3); c.lineTo(x - r, y); c.closePath(); c.fill(); c.stroke();
      }
      c.restore();
    }
  }
  function loop() {
    B.raf = 0;
    if (!B.open || !B.el || !B.el.isConnected) return;
    draw();
    if (B.bg.k === 'screen') B.raf = requestAnimationFrame(loop);
  }
  function kick() { if (!B.raf) B.raf = requestAnimationFrame(loop); }

  // ---------- Pointeur ----------
  function pos(e) {
    const r = B.cv.getBoundingClientRect(), d = B.cv.width / r.width;
    const f = frame();
    return [clamp(((e.clientX - r.left) * d - f.x) / f.w), clamp(((e.clientY - r.top) * d - f.y) / f.h)];
  }
  function hit(p, onlyTok) {
    const f = frame(), u = Math.min(f.w, f.h) / 100;
    const px = (q) => Math.hypot((q[0] - p[0]) * f.w, (q[1] - p[1]) * f.h);
    let best = null, bd = Math.max(12, u * 3);
    for (let i = B.items.length - 1; i >= 0; i--) {
      const it = B.items[i];
      if (onlyTok && it.k !== 'tok' && it.k !== 'ward') continue;
      let d = Infinity;
      if (it.k === 'tok' || it.k === 'ward') d = px([it.x, it.y]);
      else for (const q of it.pts) d = Math.min(d, px(q));
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }
  function down(e) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    B.cv.setPointerCapture(e.pointerId);
    const p = pos(e);
    // Avec l'outil Pion ou Ward, cliquer sur un pion ou une ward existante le déplace.
    const grab = (B.tool === 'tok' || B.tool === 'ward') && hit(p, true);
    if (grab) { B.drag = grab; return; }
    if (B.tool === 'erase') { const it = hit(p); if (it) { remove(it.id); send({ op: 'del', id: it.id }); } return; }
    if (B.tool === 'pen' || B.tool === 'arrow') { B.cur = { id: uid(), k: B.tool, c: B.color, by: me(), pts: [p] }; draw(); return; }
    if (B.tool === 'tok') { const it = { id: uid(), k: 'tok', team: B.tok.team, role: B.tok.role, x: p[0], y: p[1], by: me() }; add(it); send({ op: 'add', it }); return; }
    if (B.tool === 'ward') { const it = { id: uid(), k: 'ward', c: B.ward, x: p[0], y: p[1], by: me() }; add(it); send({ op: 'add', it }); }
  }
  function move(e) {
    if (!B.cur && !B.drag) return;
    const p = pos(e);
    const now = performance.now();
    if (B.drag) {
      B.drag.x = p[0]; B.drag.y = p[1]; draw();
      if (now - B.lastSend > 40) { B.lastSend = now; send({ op: 'mov', id: B.drag.id, x: p[0], y: p[1] }); }
      return;
    }
    if (B.cur.k === 'pen') { const l = B.cur.pts[B.cur.pts.length - 1]; if (Math.hypot(l[0] - p[0], l[1] - p[1]) > 0.002) B.cur.pts.push(p); }
    else B.cur.pts = [B.cur.pts[0], p];
    draw();
    // En direct : les autres voient le trait se dessiner (une mise à jour toutes les 50 ms).
    if (now - B.lastSend > 50) { B.lastSend = now; send({ op: 'add', it: B.cur, live: true }); }
  }
  function up() {
    if (B.drag) { send({ op: 'mov', id: B.drag.id, x: B.drag.x, y: B.drag.y }); B.drag = null; return; }
    if (!B.cur) return;
    const it = B.cur; B.cur = null;
    if (it.k === 'arrow' && it.pts.length < 2) { draw(); return; }
    if (it.k === 'pen') it.pts = simplify(it.pts);
    add(it); send({ op: 'add', it });
  }
  // Allège les traits (moins de points à envoyer) sans changer leur forme.
  function simplify(pts) {
    if (pts.length < 3) return pts.map((q) => [round(q[0]), round(q[1])]);
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) { const l = out[out.length - 1]; if (Math.hypot(pts[i][0] - l[0], pts[i][1] - l[1]) > 0.004) out.push(pts[i]); }
    out.push(pts[pts.length - 1]);
    return out.map((q) => [round(q[0]), round(q[1])]);
  }
  function round(x) { return Math.round(x * 10000) / 10000; }

  // ---------- État partagé ----------
  function add(it) { const i = B.items.findIndex((x) => x.id === it.id); if (i >= 0) B.items[i] = it; else B.items.push(it); if (B.items.length > 600) B.items.shift(); draw(); }
  function remove(id) { B.items = B.items.filter((x) => x.id !== id); draw(); }
  function valid(it) {
    if (!it || typeof it.id !== 'string' || it.id.length > 20) return false;
    if (it.k === 'pen' || it.k === 'arrow') return Array.isArray(it.pts) && it.pts.length > 0 && it.pts.length < 4000 && /^#[0-9A-Fa-f]{6}$/.test(it.c);
    if (it.k === 'tok') return ['b', 'r'].includes(it.team) && ROLES.some((r) => r[0] === it.role) && isFinite(it.x) && isFinite(it.y);
    if (it.k === 'ward') return ['y', 'p'].includes(it.c) && isFinite(it.x) && isFinite(it.y);
    return false;
  }
  function onMsg(from, m) {
    if (!m || m.t !== 'tb') return;
    if (m.op === 'open') { const was = B.open; B.open = true; if (m.bg) B.bg = m.bg; if (!was && B.opts.onOpen) B.opts.onOpen(from); changed(); kick(); return; }
    if (m.op === 'close') { B.open = false; changed(); return; }
    if (m.op === 'bg' && m.bg) { B.bg = m.bg; changed(); kick(); return; }
    if (m.op === 'add' && valid(m.it)) { m.it.by = from; add(m.it); return; }
    if (m.op === 'del') { remove(m.id); return; }
    if (m.op === 'mov') { const it = B.items.find((x) => x.id === m.id); if (it && isFinite(m.x) && isFinite(m.y)) { it.x = clamp(m.x); it.y = clamp(m.y); draw(); } return; }
    if (m.op === 'clear') { B.items = []; draw(); return; }
    // Arrivée dans le salon : on reçoit le tableau tel qu'il est.
    if (m.op === 'full') {
      if (Array.isArray(m.items)) for (const it of m.items) if (valid(it) && !B.items.some((x) => x.id === it.id)) B.items.push(it);
      if (m.open && !B.open) { B.open = true; if (m.bg) B.bg = m.bg; changed(); }
      draw(); kick();
    }
  }
  function peerReady(slug) {
    if (!B.open && !B.items.length) return;
    send({ op: 'full', open: B.open, bg: B.bg, items: B.items.slice(-300) }, slug);
  }

  // ---------- Interface ----------
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v == null) continue; if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'class') e.className = v; else e.setAttribute(k, v); }
    for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  };
  function toolbar() {
    const bar = B.el.querySelector('.tb-bar');
    const tb = (tool, label, title) => h('button', { class: 'tb-btn' + (B.tool === tool ? ' on' : ''), title, onclick: () => { B.tool = tool; toolbar(); } }, label);
    const sources = Object.keys(B.streams).filter((k) => k.endsWith(':screen'));
    bar.replaceChildren(...[
      h('div', { class: 'tb-grp' },
        tb('pen', 'Crayon', 'Dessin libre'), tb('arrow', 'Flèche', 'Trace une flèche'), tb('tok', 'Pion', 'Place un pion (puis glisse-le pour le déplacer)'),
        tb('ward', 'Ward', 'Place une ward'), tb('erase', 'Gomme', 'Clique sur un dessin pour l’effacer')),
      B.tool === 'pen' || B.tool === 'arrow' ? h('div', { class: 'tb-grp' }, COLORS.map(([c, n]) => h('button', { class: 'tb-col' + (B.color === c ? ' on' : ''), title: n, style: `--c:${c}`, onclick: () => { B.color = c; toolbar(); } }))) : null,
      B.tool === 'tok' ? h('div', { class: 'tb-grp' },
        h('button', { class: 'tb-btn team b' + (B.tok.team === 'b' ? ' on' : ''), onclick: () => { B.tok.team = 'b'; toolbar(); } }, 'Nous'),
        h('button', { class: 'tb-btn team r' + (B.tok.team === 'r' ? ' on' : ''), onclick: () => { B.tok.team = 'r'; toolbar(); } }, 'Eux'),
        ROLES.map(([r, n]) => h('button', { class: 'tb-btn role' + (B.tok.role === r ? ' on' : ''), title: n, onclick: () => { B.tok.role = r; toolbar(); } }, r))) : null,
      B.tool === 'ward' ? h('div', { class: 'tb-grp' },
        h('button', { class: 'tb-btn' + (B.ward === 'y' ? ' on' : ''), onclick: () => { B.ward = 'y'; toolbar(); } }, 'Ward'),
        h('button', { class: 'tb-btn' + (B.ward === 'p' ? ' on' : ''), onclick: () => { B.ward = 'p'; toolbar(); } }, 'Pink')) : null,
      h('div', { class: 'tb-grp end' },
        h('select', { class: 'tb-bg', title: 'Fond du tableau', onchange: (e) => setBg(e.target.value === 'map' ? { k: 'map' } : { k: 'screen', key: e.target.value }) },
          h('option', { value: 'map', selected: B.bg.k === 'map' ? '' : null }, 'Carte de la Faille'),
          sources.map((k) => h('option', { value: k, selected: B.bg.k === 'screen' && B.bg.key === k ? '' : null }, 'Écran de ' + (B.opts.name(k.split(':')[0]))))),
        h('button', { class: 'tb-btn', title: 'Annuler ton dernier dessin', onclick: undo }, 'Annuler'),
        h('button', { class: 'tb-btn', title: 'Effacer tout le tableau, pour tout le salon', onclick: () => { B.items = []; draw(); send({ op: 'clear' }); } }, 'Tout effacer'),
        h('button', { class: 'tb-btn', title: 'Fermer le tableau pour tout le salon', onclick: close }, 'Fermer')),
    ].filter(Boolean));
  }
  function undo() {
    for (let i = B.items.length - 1; i >= 0; i--) if (B.items[i].by === me()) { const id = B.items[i].id; remove(id); send({ op: 'del', id }); return; }
  }
  function setBg(bg) {
    // Pour tout le monde, l'écran de « moi » est la clé « slug:screen » ; chez celui qui partage c'est « me:screen ».
    B.bg = bg; send({ op: 'bg', bg: shareBg(bg) }); toolbar(); draw(); kick();
  }
  function shareBg(bg) { return bg.k === 'screen' && bg.key === 'me:screen' ? { k: 'screen', key: me() + ':screen' } : bg; }
  function localBg(bg) { return bg.k === 'screen' && bg.key === me() + ':screen' ? { k: 'screen', key: 'me:screen' } : bg; }
  function ensureEl() {
    if (B.el) return B.el;
    B.cv = h('canvas', { class: 'tb-cv' });
    B.ctx = B.cv.getContext('2d');
    B.el = h('div', { class: 'tb', onclick: (e) => e.stopPropagation(), ondblclick: (e) => e.stopPropagation() }, h('div', { class: 'tb-bar' }), h('div', { class: 'tb-stage' }, B.cv));
    B.cv.addEventListener('pointerdown', down);
    B.cv.addEventListener('pointermove', move);
    B.cv.addEventListener('pointerup', up);
    B.cv.addEventListener('pointercancel', up);
    B.cv.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
    new ResizeObserver(() => {
      const r = B.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(r.width * d)), hh = Math.max(1, Math.round(r.height * d));
      if (B.cv.width !== w || B.cv.height !== hh) { B.cv.width = w; B.cv.height = hh; draw(); }
    }).observe(B.cv);
    toolbar();
    return B.el;
  }
  function open() {
    B.open = true; ensureEl(); toolbar();
    send({ op: 'open', bg: shareBg(B.bg) });
    send({ op: 'full', open: true, bg: shareBg(B.bg), items: B.items.slice(-300) });
    changed(); kick();
  }
  function close() { B.open = false; send({ op: 'close' }); changed(); }

  window.FireBoard = {
    init(opts) { B.opts = opts; },
    isOpen: () => B.open,
    element() { ensureEl(); toolbar(); kick(); return B.el; },
    open, close,
    onMsg: (from, m) => { if (m && m.bg) m.bg = localBg(m.bg); onMsg(from, m); },
    peerReady,
    // Flux vidéo disponibles (écrans partagés) pour servir de fond.
    setStreams(map) {
      const before = Object.keys(B.streams).sort().join();
      B.streams = map || {};
      for (const k of Object.keys(B.vids)) if (!B.streams[k]) { B.vids[k].srcObject = null; delete B.vids[k]; }
      if (B.bg.k === 'screen' && !B.streams[B.bg.key]) B.bg = { k: 'map' };
      if (B.el && Object.keys(B.streams).sort().join() !== before) toolbar();
      kick();
    },
    reset() { B.open = false; B.items = []; B.cur = null; B.drag = null; B.bg = { k: 'map' }; },
    items: () => B.items.slice(),
  };
}());
