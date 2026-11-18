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
  let sel = d.script.length ? 0 : -1, mode = 'select', drag = null, showAt = null;
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
    const w = Math.max(320, Math.min(780, cv.parentElement ? cv.parentElement.clientWidth : 780));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = w; H = Math.round(w * WORLD.h / WORLD.w); k = W / WORLD.w;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const visible = (e) => showAt == null || (e.t >= showAt - 0.05 && e.t < showAt + 1);
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
    d.script.forEach((e, i) => {
      if (i === sel || !visible(e)) return;
      draw(e, i, false);
    });
    if (sel >= 0 && d.script[sel]) draw(d.script[sel], sel, true);
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
    for (let i = d.script.length - 1; i >= 0; i--) if (visible(d.script[i]) && near(p, d.script[i], 14)) return {type: 'caster', i};
    if (near(p, d.start, 14)) return {type: 'player'};
    return null;
  }
  const clampW = (p) => ({x: Math.max(0, Math.min(WORLD.w, Math.round(p.x))), y: Math.max(0, Math.min(WORLD.h, Math.round(p.y)))});
  cv.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault(); cv.setPointerCapture(ev.pointerId); cv.focus({preventScroll: true});
    const p = clampW(toWorld(ev));
    if (mode === 'add') {
      const last = d.script[sel] || d.script[d.script.length - 1];
      const c = last ? last.c : (casters[0] || ['lux'])[0];
      const sp = last && last.c === c ? last.s : (spellsOf(c)[0] || 'mystic');
      const t = last ? Math.round((last.t + 1) * 10) / 10 : 1;
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
    if (e) Object.assign(e, cleanEvent(e));
    drag = null; changed(); refresh();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', (ev) => {
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && sel >= 0) { ev.preventDefault(); removeSel(); }
    if (ev.key === 'Escape') { setMode('select'); }
  });

  // ---------- Outils ----------
  const addBtn = h('button', {class: 'fa-btn', type: 'button', onclick: () => setMode(mode === 'add' ? 'select' : 'add')});
  function setMode(m) {
    mode = m; addBtn.classList.toggle('primary', m === 'add');
    addBtn.textContent = m === 'add' ? '✕ Annuler' : '➕ Ajouter un ennemi';
    hint.textContent = m === 'add' ? 'Appuie sur la carte là où se tient l’ennemi, garde appuyé et glisse dans la direction du sort, puis relâche. (Un simple clic : il vise ta position de départ.)'
      : 'Glisse un ennemi pour le déplacer, la pastille blanche pour changer la direction, « Toi » pour le point de départ. Suppr efface l’ennemi choisi.';
  }
  const timeOut = h('output', null, 'tous');
  const timeIn = h('input', {type: 'range', min: '-1', max: '60', step: '0.5', value: '-1', 'aria-label': 'Afficher les sorts autour d’une seconde', oninput: (ev) => {
    const v = Number(ev.target.value); showAt = v < 0 ? null : v; timeOut.textContent = v < 0 ? 'tous' : `de ${v} à ${v + 1} s`; paint(); }});
  const fitTime = () => { const max = Math.max(10, Math.ceil((d.script.reduce((m, e) => Math.max(m, e.t), 0) + 2) / 5) * 5); timeIn.max = String(max); };

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
      h('div', {class: 'le-row'}, h('b', null, `Ennemi n° ${sel + 1}`), h('span', {class: 'fa-muted'}, `lancé à ${e.t} s`)),
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
  function refresh() { fitTime(); drawProps(); drawList(); paint(); }

  // ---------- Options du scénario ----------
  const loopIn = h('input', {class: 'fa-inp', type: 'number', min: '0', max: '600', step: '0.5', value: String(d.loop || 0), style: 'max-width:110px', onchange: (ev) => { d.loop = Math.max(0, Math.min(600, Number(ev.target.value) || 0)); changed(); }});
  const opts = h('div', {class: 'fa-grid le-opts'},
    h('label', {class: 'fa-field'}, h('span', null, 'Recommencer le scénario toutes les… (s)'), loopIn, h('small', {class: 'fa-muted'}, '0 = une seule fois. Ex. : 8 s pour rejouer la même vague jusqu’à la fin du niveau.')),
    h('label', {class: 'fa-check'}, h('input', {type: 'checkbox', checked: !!d.random, onchange: (ev) => { d.random = ev.target.checked; changed(); }}), 'Ajouter aussi des sorts au hasard (personnages choisis plus bas, selon la complexité)'));

  const box = h('div', {class: 'le-box'},
    h('div', {class: 'fa-row le-tools'}, addBtn, h('button', {class: 'fa-btn', type: 'button', onclick: () => { d.start = {...START0}; changed(); paint(); }}, '🧍 Joueur au centre'),
      h('span', {class: 'le-time'}, 'Afficher ', timeIn, ' ', timeOut)),
    hint, h('div', {class: 'le-wrap'}, cv), props, list, opts);
  setMode('select');
  const ro = new ResizeObserver(() => { size(); paint(); }); ro.observe(box);
  requestAnimationFrame(() => { size(); refresh(); });
  return box;
}
