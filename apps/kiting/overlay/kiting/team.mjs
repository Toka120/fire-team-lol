// FIRE Kiting — contenus de l'équipe : niveaux, personnages et sorts publiés depuis le menu admin.
// Tout est vérifié (signature d'une clé admin donnée par le créateur) avant d'être utilisé.
import {registerSpell, SPELLS, BEHAVES} from './dodge.mjs';
import {registerCharacter} from './dodge-scene.mjs';
import * as FA from '../fire-admin.mjs';

const $ = (id) => document.getElementById(id);
const {h} = FA;
export const BUILTIN_CHARS = {
  ezreal: {name: 'Ezreal', spells: ['mystic']},
  ahri: {name: 'Ahri', spells: ['orb']},
  lux: {name: 'Lux', spells: ['binding', 'zone', 'laser']},
  blitz: {name: 'Blitzcrank', spells: ['hook']},
};
export const BUILTIN_SPELLS = {
  mystic: 'Projectile (Ezreal Q)', orb: 'Orbe aller-retour (Ahri Q)', binding: 'Entrave (Lux Q)',
  zone: 'Zone au sol (Lux E)', laser: 'Laser (Lux R)', hook: 'Grappin (Blitzcrank Q)',
};
export const SHAPES = {mystic: 'Projectile', orb: 'Orbe aller-retour', hook: 'Grappin', laser: 'Laser', line: 'Ligne au sol', zone: 'Zone au sol'};
export const MODES = {dodge: 'Esquive de sorts', chase: 'Kiting · poursuite', dummy: 'Kiting · mannequins'};
export const TEAM = {loaded: false, offline: false, levels: [], champs: [], spells: []};

const num = (v, min, max, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d; };
const color = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : d);
// Nettoyage : un contenu publié ne peut pas sortir des limites du jeu.
export function cleanSpell(d = {}) {
  return {name: String(d.name || 'Sort').slice(0, 30), behave: BEHAVES.includes(d.behave) ? d.behave : 'mystic', color: color(d.color, '#80e4ff'),
    width: num(d.width, 6, 160, 20), speed: num(d.speed, 120, 1200, 380), warning: num(d.warning, .2, 3, .8), life: num(d.life, .2, 6, 2.5), damage: num(d.damage, 5, 150, 25)};
}
export function cleanChamp(d = {}) {
  const c = d.colors || {}, st = d.style || {};
  return {name: String(d.name || 'Personnage').slice(0, 22), tag: String(d.tag || '').slice(0, 12),
    colors: {skin: color(c.skin, '#d7a67d'), outfit: color(c.outfit, '#3d4f7a'), hair: color(c.hair, '#2a2230'), accent: color(c.accent, '#e8ba4d'), glow: color(c.glow, '#8fe9ff')},
    style: {hair: ['short', 'long', 'none'].includes(st.hair) ? st.hair : 'short', ears: !!st.ears, horns: !!st.horns, cape: !!st.cape, robe: !!st.robe, bulky: !!st.bulky,
      tails: num(st.tails, 0, 9, 0), size: num(st.size, 70, 160, 100), weapon: ['none', 'staff', 'sword', 'bow', 'gauntlet', 'orb'].includes(st.weapon) ? st.weapon : 'none'},
    spells: (Array.isArray(d.spells) ? d.spells : []).map(String).slice(0, 8)};
}
export function cleanLevel(d = {}) {
  return {name: String(d.name || 'Niveau').slice(0, 40), desc: String(d.desc || '').slice(0, 200), mode: MODES[d.mode] ? d.mode : 'dodge',
    speedPct: num(d.speedPct, 25, 400, 100), complexityPct: num(d.complexityPct, 25, 400, 100), duration: num(d.duration, 0, 600, 60), hp: num(d.hp, 50, 2000, 300),
    flash: d.flash !== false, enemies: num(d.enemies, 1, 64, 6), casters: (Array.isArray(d.casters) ? d.casters : []).map(String).slice(0, 16)};
}

// Enregistre des sorts et personnages (publiés, ou brouillons de l'admin pour un essai).
export function useContent(spells, champs) {
  for (const s of spells) registerSpell(s.id, {...cleanSpell(s.data), caster: 'lux'});
  for (const c of champs) registerCharacter(c.id, cleanChamp(c.data));
}
const extra = {champs: new Map()};
function champById(id) {
  if (BUILTIN_CHARS[id]) return BUILTIN_CHARS[id];
  if (extra.champs.has(id)) return cleanChamp(extra.champs.get(id));
  const t = TEAM.champs.find((c) => c.id === id);
  return t ? cleanChamp(t.data) : null;
}
function poolFor(casters) {
  const out = [];
  for (const id of casters) { const ch = champById(id); if (!ch) continue; for (const s of ch.spells) if (SPELLS[s]) out.push({spell: s, caster: id}); }
  return out.length ? out : null;
}

export const FireLevel = {
  active: null,
  apply(base) {
    const L = cleanLevel(this.active);
    const c = {...base, mode: L.mode, duration: L.duration, speedPct: L.speedPct, complexityPct: L.complexityPct, hp: L.hp, level: this.active.id || 'essai'};
    if (L.mode === 'dodge') { c.pool = poolFor(L.casters); c.noFlash = !L.flash; }
    else c.enemies = Math.max(1, Math.min(128, Math.round(L.enemies * L.complexityPct / 100)));
    return c;
  },
  clear() { this.active = null; badge(); },
  // Joue un niveau. « draft » : brouillon de l'admin (personnages et sorts pas encore publiés).
  play(level, draft) {
    if (draft) { useContent(draft.spells || [], draft.champs || []); for (const c of draft.champs || []) extra.champs.set(c.id, c.data); }
    this.active = {...cleanLevel(level.data || level), id: level.id, name: (level.data || level).name};
    const mode = $('mode');
    mode.value = this.active.mode; mode.dispatchEvent(new Event('input', {bubbles: true}));
    badge();
    window.FireKiting.start();
  },
};

function badge() {
  let b = $('levelBadge');
  if (!b) { b = h('span', {id: 'levelBadge', class: 'fa-level-badge'}); document.querySelector('.game-tabs')?.after(b); }
  const L = FireLevel.active;
  b.hidden = !L;
  b.replaceChildren(...(L ? ['🎯 Niveau : ', h('b', null, L.name || 'Essai'), ` · vitesse ${L.speedPct} % · complexité ${L.complexityPct} %`,
    h('button', {type: 'button', title: 'Quitter le niveau', onclick: () => { FireLevel.clear(); $('chooseDodge').click(); }}, '✕')] : []));
  $('chooseLevels')?.setAttribute('aria-pressed', String(!!L));
}

export async function loadTeam() {
  const r = await FA.teamContent('kiting');
  TEAM.offline = r.offline;
  TEAM.spells = r.items.filter((it) => it.kind === 'spell');
  TEAM.champs = r.items.filter((it) => it.kind === 'champ');
  TEAM.levels = r.items.filter((it) => it.kind === 'level').sort((a, b) => a.at - b.at);
  useContent(TEAM.spells, TEAM.champs);
  TEAM.loaded = true;
  window.dispatchEvent(new CustomEvent('fire-team:loaded'));
  return TEAM;
}

const fmtDur = (s) => (s ? s + ' s' : 'libre');
export function levelCard(it, onPlay, extraButtons) {
  const L = cleanLevel(it.data);
  const who = (L.casters || []).map((id) => champById(id)?.name).filter(Boolean);
  return h('div', {class: 'fa-card'},
    h('div', {class: 'fa-card-h'}, h('b', null, L.name), h('span', {class: 'fa-chip'}, MODES[L.mode])),
    L.desc ? h('p', {class: 'fa-muted'}, L.desc) : null,
    h('p', {class: 'fa-stats'}, `⚡ Vitesse ${L.speedPct} % · 🧩 Complexité ${L.complexityPct} % · ⏱ ${fmtDur(L.duration)} · ❤ ${L.hp}` + (L.mode === 'dodge' && !L.flash ? ' · sans Flash' : '')),
    L.mode === 'dodge' && who.length ? h('p', {class: 'fa-muted'}, 'Personnages : ' + who.join(', ')) : null,
    h('div', {class: 'fa-row'}, h('button', {class: 'fa-btn primary', type: 'button', onclick: onPlay}, '▶ Jouer'), extraButtons || null));
}
function levelsModal() {
  const list = h('div', {class: 'fa-list'});
  const m = FA.modal('🎯 Niveaux de l’équipe', [
    h('p', {class: 'fa-muted'}, 'Niveaux créés par les admins de l’équipe. Ils arrivent tout seuls à chaque ouverture de FIRE Kiting.'), list], {wide: true});
  const draw = () => {
    if (!TEAM.loaded) { list.replaceChildren(h('p', {class: 'fa-muted'}, 'Chargement…')); return; }
    if (!TEAM.levels.length) { list.replaceChildren(h('p', {class: 'fa-muted'}, 'Aucun niveau publié pour l’instant.' + (TEAM.offline ? ' (Hors ligne.)' : ''))); return; }
    list.replaceChildren(...TEAM.levels.map((it) => levelCard(it, () => { m.close(); FireLevel.play(it); })),
      ...(TEAM.offline ? [h('p', {class: 'fa-muted'}, 'Hors ligne : derniers niveaux connus.')] : []));
  };
  draw();
  if (!TEAM.loaded) window.addEventListener('fire-team:loaded', draw, {once: true});
}

window.FireTeam = TEAM;
window.FireAdmin = {
  ready: true,
  info: () => ({levels: TEAM.levels.length, champs: TEAM.champs.length, spells: TEAM.spells.length, bridge: FA.hasBridge()}),
  open: () => import('./admin.mjs').then((m) => m.openAdmin()),
};
function wire() {
  $('chooseLevels')?.addEventListener('click', levelsModal);
  $('adminBtn')?.addEventListener('click', () => window.FireAdmin.open());
  badge();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
FA.bridgeReady().then((ok) => (ok ? loadTeam() : (TEAM.loaded = true, TEAM.offline = true))).catch(() => { TEAM.loaded = true; TEAM.offline = true; });
