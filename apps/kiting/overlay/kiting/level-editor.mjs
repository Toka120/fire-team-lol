// FIRE Kiting — éditeur de scénario d'un niveau (menu admin).
// Sur la carte du mid : tu poses chaque ennemi où tu veux, tu tires la flèche dans la direction de son sort,
// tu choisis le personnage, le sort et la seconde où il part. Le joueur peut aussi être placé.
import * as FA from '../fire-admin.mjs';
import {WORLD} from './engine.mjs';
import {MidNavigation} from './terrain.mjs';
import {SPELLS} from './dodge.mjs';
import {cleanEvent} from './team.mjs';

const {h} = FA;
const START0 = {x: 763, y: 634};
const COLORS = {mystic: '#80e4ff', fire: '#80e4ff', binding: '#d6aaff', orb: '#619eff', hook: '#e9ae38', laser: '#ff6b5a', line: '#ff9f5a', zone: '#d5e9ff'};
let nav = null, img = null;
const navigation = () => (nav ??= new MidNavigation());
function mapImage(onload) {
  if (img) { if (img.complete) return img; img.addEventListener('load', onload, {once: true}); return img; }
  img = new Image(); img.src = new URL('./mid-riot.png', document.baseURI).href; img.addEventListener('load', onload, {once: true});
  return img;
}
const spellColor = (id) => (SPELLS[id] && SPELLS[id].color) || COLORS[(SPELLS[id] && SPELLS[id].behave) || id] || '#80e4ff';
const shapeOf = (id) => (SPELLS[id] && SPELLS[id].behave) || id;

// d : données du niveau (modifiées sur place). casters : [[id, nom]], spells : [[id, nom]], spellsOf(id) : sorts d'un personnage.
export function scriptEditor(d, {casters, spells, spellsOf, onChange}) {
  d.script = Array.isArray(d.script) ? d.script.map(cleanEvent) : [];
  if (!d.start) d.start = {...START0};
  let sel = d.script.length ? 0 : -1, mode = 'select', drag = null;
  // Démo : T = seconde affichée (null = vue d'édition, tout visible). play = la démo avance toute seule.
  let T = null, play = false, rate = 1, raf = 0, last = 0, box = null;
  const changed = () => { onChange && onChange(); };
  const nameC = (id) => (casters.find((c) => c[0] === id) || [id, id])[1];
  const nameS = (id) => (spells.find((s) => s[0] === id) || [id, id])[1];

  // ---------- Carte ----------
  const cv = h('canvas', {class: 'le-map', tabindex: '0', 'aria-label': 'Carte du mid : pose les ennemis et la direction de leurs sorts'});
  const ctx = cv.getContext('2d');
  const hint = h('p', {class: 'fa-muted le-hint'});
  let W = 800, H = 667, k = 0.5;
  const toWorld = (ev) => { const r = cv.getBoundingClientRect(); return {x: (ev.clientX - r.left) / r.width * WORLD.w, y: (ev.clientY - r.top) / r.height * WORLD.h}; };
  const sx = (x) => x * k, sy = (y) => y * k;
  function size() {
    // Plein écran : la carte prend toute la hauteur, les réglages passent dans une colonne à droite.
    const full = isFull();
    const avail = full ? Math.min(box.clientWidth - 400, (box.clientHeight - 40) * WORLD.w / WORLD.h) : Math.min(780, cv.parentElement ? cv.parentElement.clientWidth : 780);
    const w = Math.max(320, Math.floor(avail));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = w; H = Math.round(w * WORLD.h / WORLD.w); k = W / WORLD.w;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const spPct = () => Math.max(0.25, Math.min(4, (Number(d.speedPct) || 100) / 100));
  // Ce que fait un sort à l'instant T (mêmes règles que le jeu) : null s'il n'est pas encore lancé ou déjà fini.
  function sim(e, t) {
    const spec = SPELLS[e.s] || SPELLS.mystic, sp = spPct(), warn = spec.warning / Math.sqrt(sp), life = spec.life || 2.5, dt = t - e.t;
    if (dt < 0 || dt > warn + life + 0.55) return null;
    const o = {x: e.x, y: e.y}, tg = e.aim === 'player' ? d.start : {x: e.ax, y: e.ay};
    const L = Math.hypot(tg.x - o.x, tg.y - o.y) || 1, dx = (tg.x - o.x) / L, dy = (tg.y - o.y) / L, b = shapeOf(e.s);
    const r = {o, tg, dx, dy, b, warn: dt < warn, k: dt < warn ? dt / warn : 0, width: spec.width || 20, done: false};
    const t2 = dt - warn;
    if (r.warn) return r;
    if (t2 > life) { r.done = true; return r; }
    if (b === 'laser' || b === 'line' || b === 'zone') return r;
    const dist = (spec.speed || 380) * sp * t2;
    let pos = dist;
    if (b === 'orb' || b === 'hook') { if (dist > 510) pos = 1020 - dist; if (pos <= 0) { r.done = true; return r; } }
    r.px = o.x + dx * pos; r.py = o.y + dy * pos;
    if (r.px < 0 || r.py < 0 || r.px > WORLD.w || r.py > WORLD.h) r.done = true;
    return r;
  }
  const endOf = () => d.script.reduce((m, e) => { const sp = SPELLS[e.s] || SPELLS.mystic; return Math.max(m, e.t + sp.warning / Math.sqrt(spPct()) + (sp.life || 2.5) + 0.6); }, 3);
  const visible = () => true;
  function arrow(x1, y1, x2, y2, color, dash, width) {
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; if (dash) ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    const a = Math.atan2(y2 - y1, x2 - x1), s = 9 + width;
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)); ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function paint() {
    const im = mapImage(paint);
    ctx.clearRect(0, 0, W, H);
    if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, W, H); else { ctx.fillStyle = '#25301f'; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = '#0006'; ctx.fillRect(0, 0, W, H);
    // Joueur (point de départ)
    const p = d.start;
    ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 11, 0, Math.PI * 2); ctx.fillStyle = '#63e3af'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#0c2a20'; ctx.stroke();
    ctx.font = '600 12px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#eafff6'; ctx.fillText('Toi', sx(p.x), sy(p.y) - 16);
    if (T == null) {
      d.script.forEach((e, i) => { if (i !== sel) draw(e, i, false); });
      if (sel >= 0 && d.script[sel]) draw(d.script[sel], sel, true);
    } else {
      d.script.forEach((e, i) => { const r = sim(e, T); if (!r || r.done) ghost(e, i); });
      d.script.forEach((e, i) => { const r = sim(e, T); if (r && !r.done) live(e, i, r); });
      if (sel >= 0 && d.script[sel] && !play) draw(d.script[sel], sel, true);
      ctx.font = '700 15px Segoe UI, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#000a'; ctx.fillRect(8, 8, 92, 26); ctx.fillStyle = '#fff'; ctx.fillText((play ? '▶ ' : '⏸ ') + T.toFixed(1).replace('.', ',') + ' s', 16, 27);
    }
  }
  // Ennemi pas encore lancé (ou déjà fini) : juste sa place, en transparence.
  function ghost(e, i) {
    if (i === sel && !play) return;
    ctx.globalAlpha = e.t > T ? 0.32 : 0.14;
    ctx.beginPath(); ctx.arc(sx(e.x), sy(e.y), 9, 0, Math.PI * 2); ctx.fillStyle = '#1b1220'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = spellColor(e.s); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 10px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), sx(e.x), sy(e.y) + 0.5); ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }
  // Sort en cours : avertissement (trait rouge, zone qui grandit), puis le sort qui part.
  function live(e, i, r) {
    const c = spellColor(e.s), ox = sx(r.o.x), oy = sy(r.o.y), w = Math.max(2, r.width * k);
    ctx.save();
    if (r.warn) {
      ctx.globalAlpha = 0.5 + 0.5 * r.k;
      if (r.b === 'zone') { ctx.beginPath(); ctx.arc(sx(r.tg.x), sy(r.tg.y), Math.max(4, r.width * k * (0.65 + 0.35 * r.k)), 0, Math.PI * 2); ctx.strokeStyle = '#ff4935'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); }
      else { const len = (r.b === 'laser' || r.b === 'line' ? 1250 : 470) * k; ctx.strokeStyle = '#ff4935'; ctx.lineWidth = r.b === 'laser' || r.b === 'line' ? Math.max(2, w * 0.25) : 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + r.dx * len, oy + r.dy * len); ctx.stroke(); }
    } else if (r.b === 'laser' || r.b === 'line') {
      ctx.strokeStyle = c; ctx.globalAlpha = 0.85; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + r.dx * 1250 * k, oy + r.dy * 1250 * k); ctx.stroke();
    } else if (r.b === 'zone') {
      ctx.beginPath(); ctx.arc(sx(r.tg.x), sy(r.tg.y), Math.max(4, w), 0, Math.PI * 2); ctx.fillStyle = c + 'aa'; ctx.fill();
    } else {
      if (r.b === 'hook') { ctx.strokeStyle = '#b88a45'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(sx(r.px), sy(r.py)); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(sx(r.px), sy(r.py), Math.max(3, w * 0.7), 0, Math.PI * 2); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12; ctx.fill();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(ox, oy, 12, 0, Math.PI * 2); ctx.fillStyle = '#1b1220'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = c; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), ox, oy + 0.5); ctx.textBaseline = 'alphabetic';
  }
  function draw(e, i, on) {
    const c = spellColor(e.s), x = sx(e.x), y = sy(e.y);
    const tx = e.aim === 'player' ? sx(d.start.x) : sx(e.ax), ty = e.aim === 'player' ? sy(d.start.y) : sy(e.ay);
    ctx.globalAlpha = on ? 1 : 0.8;
    if (shapeOf(e.s) === 'zone') {
      const r = Math.max(8, ((SPELLS[e.s] && SPELLS[e.s].width) || 110) * k);
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fillStyle = c + '33'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      arrow(x, y, tx, ty, c, true, on ? 2.5 : 1.5);
    } else arrow(x, y, tx, ty, c, e.aim === 'player', on ? 3.5 : 2);
    ctx.beginPath(); ctx.arc(x, y, on ? 13 : 11, 0, Math.PI * 2); ctx.fillStyle = '#1b1220'; ctx.fill(); ctx.lineWidth = on ? 3.5 : 2.5; ctx.strokeStyle = on ? '#fff' : c; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), x, y + 0.5); ctx.textBaseline = 'alphabetic';
    if (on && e.aim !== 'player') { ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = c; ctx.stroke(); }
    if (on) { ctx.font = '600 12px Segoe UI, sans-serif'; ctx.fillStyle = '#fff'; const lbl = `${e.t} s · ${nameC(e.c)} · ${nameS(e.s)}`; const w = ctx.measureText(lbl).width + 12;
      const lx = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x)), ly = y > 34 ? y - 22 : y + 30; ctx.fillStyle = '#000b'; ctx.fillRect(lx - w / 2, ly - 13, w, 18); ctx.fillStyle = '#fff'; ctx.fillText(lbl, lx, ly); }
    ctx.globalAlpha = 1;
  }
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) <= r / k;
  function hit(p) {
    const s = d.script[sel];
    if (s && s.aim !== 'player' && near(p, {x: s.ax, y: s.ay}, 12)) return {type: 'aim', i: sel};
    if (s && near(p, s, 15)) return {type: 'caster', i: sel};
    for (let i = d.script.length - 1; i >= 0; i--) if (near(p, d.script[i], 14)) return {type: 'caster', i};
    if (near(p, d.start, 14)) return {type: 'player'};
    return null;
  }
  const clampW = (p) => ({x: Math.max(0, Math.min(WORLD.w, Math.round(p.x))), y: Math.max(0, Math.min(WORLD.h, Math.round(p.y)))});
  cv.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault(); cv.setPointerCapture(ev.pointerId); cv.focus({preventScroll: true});
    if (play) setPlay(false);
    const p = clampW(toWorld(ev));
    if (mode === 'add') {
      const lastEv = d.script[sel] || d.script[d.script.length - 1];
      const c = lastEv ? lastEv.c : (casters[0] || ['lux'])[0];
      const sp = lastEv && lastEv.c === c ? lastEv.s : (spellsOf(c)[0] || 'mystic');
      const t = T != null ? Math.round(T * 10) / 10 : lastEv ? Math.round((lastEv.t + 1) * 10) / 10 : 1;
      d.script.push(cleanEvent({t, c, s: sp, x: p.x, y: p.y, ax: p.x, ay: p.y, aim: 'fixed'}));
      sel = d.script.length - 1; drag = {type: 'new', i: sel, from: p};
      paint(); return;
    }
    const target = hit(p);
    if (!target) { sel = -1; drag = null; refresh(); return; }
    if (target.i != null) sel = target.i;
    drag = {...target, from: p, orig: target.type === 'player' ? {...d.start} : {...d.script[sel]}};
    refresh();
  });
  cv.addEventListener('pointermove', (ev) => {
    const p = clampW(toWorld(ev));
    if (!drag) { const t = mode === 'add' ? null : hit(p); cv.style.cursor = mode === 'add' ? 'crosshair' : t ? (t.type === 'aim' ? 'grab' : 'move') : 'default'; return; }
    const e = d.script[drag.i];
    if (drag.type === 'new' || drag.type === 'aim') { e.ax = p.x; e.ay = p.y; }
    else if (drag.type === 'caster') { const dx = p.x - drag.from.x, dy = p.y - drag.from.y; Object.assign(e, clampW({x: drag.orig.x + dx, y: drag.orig.y + dy})); const a = clampW({x: drag.orig.ax + dx, y: drag.orig.ay + dy}); e.ax = a.x; e.ay = a.y; }
    else if (drag.type === 'player') { d.start = clampW({x: drag.orig.x + p.x - drag.from.x, y: drag.orig.y + p.y - drag.from.y}); }
    paint();
  });
  const end = () => {
    if (!drag) return;
    const e = d.script[drag.i];
    // Un clic sans glisser : le sort vise l'endroit où tu démarres.
    if (drag.type === 'new' && Math.hypot(e.ax - e.x, e.ay - e.y) < 25) { e.ax = d.start.x; e.ay = d.start.y; }
    if (drag.type === 'new') setMode('select');
    if (drag.type === 'player') d.start = navigation().project(d.start.x, d.start.y);
    if (e) { Object.assign(e, cleanEvent(e)); d.script.sort((a, b) => a.t - b.t); sel = d.script.indexOf(e); }
    drag = null; changed(); refresh();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', (ev) => {
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && sel >= 0) { ev.preventDefault(); removeSel(); }
    if (ev.key === 'Escape') { setMode('select'); }
    if (ev.key === ' ') { ev.preventDefault(); setPlay(!play); }
  });

  // ---------- Outils ----------
  const addBtn = h('button', {class: 'fa-btn', type: 'button', onclick: () => setMode(mode === 'add' ? 'select' : 'add')});
  function setMode(m) {
    mode = m; addBtn.classList.toggle('primary', m === 'add');
    addBtn.textContent = m === 'add' ? '✕ Annuler' : '➕ Ajouter un ennemi';
    hint.textContent = m === 'add' ? 'Appuie sur la carte là où se tient l’ennemi, garde appuyé et glisse dans la direction du sort, puis relâche. (Un simple clic : il vise ta position de départ.)' + (T != null ? ` Il partira à ${fmt(T)}, le moment de la démo.` : '')
      : '▶ lance la démo : les sorts partent comme en jeu. Mets pause, ajoute un ennemi (il part au moment affiché), puis relance. Glisse un ennemi pour le déplacer, la pastille blanche pour la direction, « Toi » pour le départ. Espace = lecture/pause, Suppr = effacer.';
  }
  // ---------- Plein écran ----------
  const isFull = () => document.fullscreenElement === box || box.classList.contains('le-full');
  const fullBtn = h('button', {class: 'fa-btn', type: 'button', title: 'Éditeur en plein écran (Échap pour sortir)', onclick: () => toggleFull()}, '⛶ Plein écran');
  async function toggleFull() {
    if (isFull()) { if (document.fullscreenElement) await document.exitFullscreen().catch(() => {}); box.classList.remove('le-full'); }
    else { try { await box.requestFullscreen(); } catch { box.classList.add('le-full'); } }
    onFull();
  }
  function onFull() { const f = isFull(); fullBtn.textContent = f ? '🗗 Quitter le plein écran' : '⛶ Plein écran'; requestAnimationFrame(() => { size(); paint(); }); }
  document.addEventListener('fullscreenchange', () => { if (box.isConnected) onFull(); });

  // ---------- Démo : lecture, pause, avance rapide ----------
  const playBtn = h('button', {class: 'fa-btn primary le-play', type: 'button', title: 'Lecture / pause (Espace)', onclick: () => setPlay(!play)});
  const stopBtn = h('button', {class: 'fa-btn', type: 'button', title: 'Arrêter la démo et revenir au début', onclick: () => { setPlay(false); T = null; syncTime(); refresh(); }}, '⏹');
  const timeOut = h('output', {class: 'le-clock'}, '0,0 s');
  const timeIn = h('input', {type: 'range', min: '0', max: '20', step: '0.1', value: '0', 'aria-label': 'Moment de la démo', oninput: (ev) => {
    if (play) setPlay(false); T = Number(ev.target.value); syncTime(); paint(); drawProps(); }});
  const rateSel = h('select', {class: 'fa-inp le-rate', title: 'Vitesse de la démo', onchange: (ev) => { rate = Number(ev.target.value) || 1; }},
    h('option', {value: '0.25'}, '×0,25'), h('option', {value: '0.5'}, '×0,5'), h('option', {value: '1', selected: true}, '×1'), h('option', {value: '2'}, '×2'));
  const fmt = (v) => v.toFixed(1).replace('.', ',') + ' s';
  const fitTime = () => { timeIn.max = String(Math.max(5, Math.ceil(endOf()))); };
  function syncTime() {
    fitTime();
    timeIn.value = String(T == null ? 0 : T);
    timeOut.textContent = T == null ? 'édition' : `${fmt(T)} / ${fmt(Number(timeIn.max))}`;
    playBtn.textContent = play ? '⏸ Pause' : T == null ? '▶ Lancer la démo' : '▶ Reprendre';
    stopBtn.disabled = T == null;
  }
  function frame(now) {
    if (!play) return;
    if (!cv.isConnected) { play = false; return; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    T += dt * rate;
    if (T >= endOf()) { T = Math.round(endOf() * 10) / 10; setPlay(false); return; }
    syncTime(); paint();
    raf = requestAnimationFrame(frame);
  }
  function setPlay(on) {
    if (on === play) return;
    play = on; cancelAnimationFrame(raf);
    if (on) { if (T == null || T >= endOf() - 0.05) T = 0; if (mode === 'add') setMode('select'); last = performance.now(); raf = requestAnimationFrame(frame); }
    syncTime(); paint(); drawProps();
  }

  // ---------- Sort choisi ----------
  const props = h('div', {class: 'le-props'});
  const list = h('div', {class: 'le-list'});
  function removeSel() { if (sel < 0) return; d.script.splice(sel, 1); sel = Math.min(sel, d.script.length - 1); changed(); refresh(); }
  function drawProps() {
    const e = d.script[sel];
    if (!e) { props.replaceChildren(h('p', {class: 'fa-muted'}, d.script.length ? 'Choisis un ennemi sur la carte ou dans la liste.' : 'Aucun ennemi : clique « ➕ Ajouter un ennemi », puis pose-le sur la carte.')); return; }
    const own = spellsOf(e.c);
    const spellOpts = [...own.map((id) => [id, nameS(id)]), ...spells.filter(([id]) => !own.includes(id))];
    const set = (patch) => { Object.assign(e, cleanEvent({...e, ...patch})); changed(); refresh(); };
    props.replaceChildren(
      h('div', {class: 'le-row'}, h('b', null, `Ennemi n° ${sel + 1}`), h('span', {class: 'fa-muted'}, `lancé à ${e.t} s`),
        T != null && Math.abs(T - e.t) > 0.05 ? h('button', {class: 'fa-link', type: 'button', onclick: () => { const t = Math.round(T * 10) / 10; Object.assign(e, cleanEvent({...e, t})); d.script.sort((a, b) => a.t - b.t); sel = d.script.indexOf(e); changed(); refresh(); }}, `⏱ Le lancer à ${fmt(T)} (maintenant)`) : null),
      h('div', {class: 'fa-grid'},
        h('label', {class: 'fa-field'}, h('span', null, 'Lancé à (secondes)'), h('input', {class: 'fa-inp', type: 'number', min: '0', max: '600', step: '0.1', value: String(e.t), onchange: (ev) => {
          const t = Number(ev.target.value); set({t}); sel = d.script.indexOf(e); d.script.sort((a, b) => a.t - b.t); sel = d.script.indexOf(e); refresh(); }})),
        h('label', {class: 'fa-field'}, h('span', null, 'Personnage'), h('select', {class: 'fa-inp', onchange: (ev) => { const c = ev.target.value; const sp = spellsOf(c); set({c, s: sp.includes(e.s) ? e.s : (sp[0] || e.s)}); }},
          casters.map(([id, n]) => h('option', {value: id, selected: id === e.c}, n)))),
        h('label', {class: 'fa-field'}, h('span', null, 'Sort'), h('select', {class: 'fa-inp', onchange: (ev) => set({s: ev.target.value})},
          own.length ? h('optgroup', {label: 'Ses sorts'}, own.map((id) => h('option', {value: id, selected: id === e.s}, nameS(id)))) : null,
          h('optgroup', {label: 'Autres sorts'}, spellOpts.filter(([id]) => !own.includes(id)).map(([id, n]) => h('option', {value: id, selected: id === e.s}, n))))),
        h('label', {class: 'fa-field'}, h('span', null, 'Direction'), h('select', {class: 'fa-inp', onchange: (ev) => set({aim: ev.target.value})},
          h('option', {value: 'fixed', selected: e.aim !== 'player'}, 'Fixe : la flèche sur la carte'), h('option', {value: 'player', selected: e.aim === 'player'}, 'Vise le joueur au lancement')))),
      h('div', {class: 'fa-row'},
        h('button', {class: 'fa-btn', type: 'button', onclick: () => { const c = cleanEvent({...e, t: e.t + 0.5}); d.script.push(c); d.script.sort((a, b) => a.t - b.t); sel = d.script.indexOf(c); changed(); refresh(); }}, '⧉ Dupliquer (+0,5 s)'),
        h('button', {class: 'fa-btn', type: 'button', onclick: () => { const c = cleanEvent({...e, x: WORLD.w - e.x, ax: WORLD.w - e.ax}); d.script.push(c); d.script.sort((a, b) => a.t - b.t); sel = d.script.indexOf(c); changed(); refresh(); }}, '⇋ Copie en miroir'),
        h('button', {class: 'fa-btn', type: 'button', onclick: removeSel}, '🗑 Supprimer')));
  }
  function drawList() {
    if (!d.script.length) { list.replaceChildren(); return; }
    list.replaceChildren(h('div', {class: 'le-list-h'}, h('b', null, `Déroulé (${d.script.length} sort${d.script.length > 1 ? 's' : ''})`), h('span', {class: 'fa-muted'}, 'dans l’ordre où ils partent')),
      ...d.script.map((e, i) => h('button', {type: 'button', class: 'le-it' + (i === sel ? ' on' : ''), onclick: () => { sel = i; refresh(); }},
        h('span', {class: 'le-dot', style: `background:${spellColor(e.s)}`}, String(i + 1)), h('span', {class: 'le-t'}, e.t + ' s'), h('span', null, nameC(e.c) + ' · ' + nameS(e.s)),
        h('span', {class: 'fa-muted'}, e.aim === 'player' ? 'vise le joueur' : 'direction fixe'))));
  }
  function refresh() { syncTime(); drawProps(); drawList(); paint(); }

  // ---------- Options du scénario ----------
  const loopIn = h('input', {class: 'fa-inp', type: 'number', min: '0', max: '600', step: '0.5', value: String(d.loop || 0), style: 'max-width:110px', onchange: (ev) => { d.loop = Math.max(0, Math.min(600, Number(ev.target.value) || 0)); changed(); }});
  const opts = h('div', {class: 'fa-grid le-opts'},
    h('label', {class: 'fa-field'}, h('span', null, 'Recommencer le scénario toutes les… (s)'), loopIn, h('small', {class: 'fa-muted'}, '0 = une seule fois. Ex. : 8 s pour rejouer la même vague jusqu’à la fin du niveau.')),
    h('label', {class: 'fa-check'}, h('input', {type: 'checkbox', checked: !!d.random, onchange: (ev) => { d.random = ev.target.checked; changed(); }}), 'Ajouter aussi des sorts au hasard (personnages choisis plus bas, selon la complexité)'));

  box = h('div', {class: 'le-box'},
    h('div', {class: 'fa-row le-tools'}, addBtn, h('button', {class: 'fa-btn', type: 'button', onclick: () => { d.start = {...START0}; changed(); paint(); }}, '🧍 Joueur au centre'), h('span', {class: 'le-sp'}), fullBtn),
    h('div', {class: 'le-timeline'}, playBtn, stopBtn, timeIn, timeOut, rateSel),
    hint, h('div', {class: 'le-wrap'}, cv), props, list, opts);
  setMode('select');
  const ro = new ResizeObserver(() => { if (!box.isConnected) { setPlay(false); ro.disconnect(); return; } size(); paint(); }); ro.observe(box);
  requestAnimationFrame(() => { size(); refresh(); });
  return box;
}
