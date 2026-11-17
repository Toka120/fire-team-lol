// FIRE Listen — contenus de l'équipe : niveaux de quiz et sons ajoutés depuis le menu admin.
// Tout est vérifié (signature d'une clé admin donnée par le créateur) avant d'être utilisé.
import { LEVELS } from './engine.mjs';
import * as FA from './fire-admin.mjs';

export const ROLES = { top: 'Top', jungle: 'Jungle', mid: 'Mid', adc: 'ADC', support: 'Support' };
export const TEAM = { loaded: false, offline: false, levels: [], sounds: [], catalog: [] };
const num = (v, min, max, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d; };

export function cleanLevel(d = {}) {
  const ab = (Array.isArray(d.abilities) ? d.abilities : [0, 1, 2, 3]).map(Number).filter((i) => i >= 0 && i <= 3);
  return { name: String(d.name || 'Niveau').slice(0, 40), desc: String(d.desc || '').slice(0, 200), abilities: ab.length ? [...new Set(ab)].sort() : [0, 1, 2, 3],
    lives: num(d.lives, 0, 10, 3), points: !!d.points, roles: (Array.isArray(d.roles) ? d.roles : []).filter((r) => ROLES[r]),
    champions: (Array.isArray(d.champions) ? d.champions : []).map(String).slice(0, 200), count: num(d.count, 0, 200, 20),
    timer: !!d.timer, speedPct: num(d.speedPct, 25, 400, 100), difficultyPct: num(d.difficultyPct, 25, 400, 100),
    withSounds: ['none', 'add', 'only'].includes(d.withSounds) ? d.withSounds : 'add' };
}
export function cleanSound(d = {}) {
  return { name: String(d.name || 'Son').slice(0, 40), aliases: (Array.isArray(d.aliases) ? d.aliases : String(d.aliases || '').split(',')).map((s) => String(s).trim().slice(0, 40)).filter(Boolean).slice(0, 8),
    champion: String(d.champion || ''), slot: num(d.slot, 0, 3, 0), sha: /^[0-9a-f]{64}$/.test(String(d.sha)) ? d.sha : '', ext: /^(mp3|ogg|wav|m4a|webm)$/.test(String(d.ext)) ? d.ext : 'mp3' };
}
// Secondes par question (vitesse) et durée maximale d'écoute (difficulté).
export const timerOf = (L) => (L.timer ? Math.max(4, Math.min(120, Math.round(30 * 100 / L.speedPct))) : 0);
export const clipOf = (L) => (L.difficultyPct > 100 ? Math.max(.4, Math.round(300 / L.difficultyPct * 10) / 10) : 0);

export const ListenTeam = {
  extras: [],
  card(key, lang) {
    const L = LEVELS[key];
    if (!L) return ['?', '', []];
    const b = [L.lives ? `${L.lives} vie${L.lives > 1 ? 's' : ''}` : 'Vies illimitées', L.count ? `${L.count} questions` : 'Tous', L.abilities.map((i) => 'QWER'[i]).join(' ')];
    if (L.timer) b.push(`⏱ ${L.timerSec} s`);
    if (L.clip) b.push(`✂ ${L.clip} s`);
    return [L.name, L.desc || (lang === 'en' ? 'Team level' : 'Niveau de l’équipe'), b];
  },
  clip(session, stop) { const L = session && LEVELS[session.mode]; if (L && L.clip) setTimeout(stop, L.clip * 1000); },
  async ready(champions) {
    TEAM.catalog = champions;
    try {
      if (await FA.bridgeReady(4000)) await Promise.race([loadTeam(), new Promise((r) => setTimeout(r, 8000))]);
    } catch { /* hors ligne : les modes de base restent là */ }
    TEAM.loaded = true;
  },
};

// Règles d'un niveau, au format du moteur du quiz.
export function useLevel(key, data) {
  const L = cleanLevel(data);
  const extraIds = ListenTeam.extras.map((c) => c.id);
  const filtered = L.roles.length || L.champions.length;
  const base = filtered ? TEAM.catalog.filter((c) => (!L.roles.length || c.roles.some((r) => L.roles.includes(r))) && (!L.champions.length || L.champions.includes(String(c.id)))).map((c) => c.id) : null;
  // null = tous les champions (et les sons ajoutés, que le quiz reçoit en plus pour un niveau).
  const pool = L.withSounds === 'only' ? extraIds : L.withSounds === 'none' ? (base || TEAM.catalog.map((c) => c.id)) : (base ? base.concat(extraIds) : null);
  LEVELS[key] = { name: L.name, desc: L.desc, abilities: L.abilities, lives: L.lives || null, costs: L.points ? [20, 20, 20, 35] : null,
    pool, count: L.count, timer: timerOf(L), timerSec: timerOf(L), clip: clipOf(L) };
  return LEVELS[key];
}

export async function useSound(it, data) {
  const s = cleanSound(data);
  if (!s.sha) return false;
  const url = it.url || await FA.teamFile(`apps/listen/sons/${s.sha}.${s.ext}`, s.sha, s.ext);
  if (!url) return false;
  const champ = s.champion && TEAM.catalog.find((c) => String(c.id) === s.champion);
  if (champ) { if (!champ.sounds[s.slot].includes(url)) champ.sounds[s.slot] = champ.sounds[s.slot].concat([url]); return true; }
  const id = 'x_' + it.id;
  ListenTeam.extras = ListenTeam.extras.filter((c) => c.id !== id);
  const sounds = [[], [], [], []]; sounds[s.slot] = [url];
  ListenTeam.extras.push({ id, alias: s.name, name: s.name, aliases: s.aliases, roles: [], icon: 'assets/speaker.svg', sounds });
  return true;
}

export async function loadTeam() {
  const r = await FA.teamContent('listen');
  TEAM.offline = r.offline;
  TEAM.sounds = r.items.filter((it) => it.kind === 'sound');
  TEAM.levels = r.items.filter((it) => it.kind === 'level').sort((a, b) => a.at - b.at);
  for (const it of TEAM.sounds) { try { await useSound(it, it.data); } catch { /* son indisponible */ } }
  for (const k of Object.keys(LEVELS)) if (k.startsWith('lv_')) delete LEVELS[k];
  for (const it of TEAM.levels) useLevel(it.id, it.data);
  window.dispatchEvent(new CustomEvent('fire-team:loaded'));
  return TEAM;
}

// ---------- Chronomètre par question (vitesse du niveau) ----------
const root = () => document.getElementById('fire-listen') || document;
let timerEnd = 0, iv = null, pausedLeft = 0;
function timerEl() {
  let el = root().querySelector('#levelTimer');
  if (!el) { el = FA.h('span', { id: 'levelTimer', class: 'fa-timer' }); root().querySelector('.game-nav')?.append(el); }
  return el;
}
function stopTimer() { clearInterval(iv); iv = null; timerEnd = 0; const el = root().querySelector('#levelTimer'); if (el) el.hidden = true; }
function armTimer() {
  const st = window.FireListen && window.FireListen.getState();
  const L = st && LEVELS[st.mode];
  if (!st || st.over || !L || !L.timer) return stopTimer();
  timerEnd = Date.now() + L.timer * 1000;
  timerEl().hidden = false;
  if (!iv) iv = setInterval(tick, 200);
  tick();
}
function tick() {
  const st = window.FireListen && window.FireListen.getState();
  if (!st || st.over) return stopTimer();
  const busy = !root().querySelector('#settings')?.hidden || !root().querySelector('#browser')?.hidden;
  if (busy) { if (!pausedLeft) pausedLeft = timerEnd - Date.now(); return; }
  if (pausedLeft) { timerEnd = Date.now() + pausedLeft; pausedLeft = 0; }
  const left = Math.max(0, timerEnd - Date.now());
  const el = timerEl();
  el.textContent = '⏱ ' + Math.ceil(left / 1000) + ' s';
  el.classList.toggle('low', left < 5000);
  if (left <= 0) { stopTimer(); root().querySelector('#giveUp')?.click(); }
}
window.addEventListener('hashchange', () => setTimeout(armTimer, 80));
window.addEventListener('fire-listen:round', () => setTimeout(armTimer, 80));
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#again')) setTimeout(armTimer, 120); }, true);

window.FireTeam = TEAM;
window.FireAdmin = {
  ready: true,
  info: () => ({ levels: TEAM.levels.length, sounds: TEAM.sounds.length, extras: ListenTeam.extras.length, bridge: FA.hasBridge() }),
  open: () => import('./admin.mjs').then((m) => m.openAdmin()),
};
function wire() { document.getElementById('adminBtn')?.addEventListener('click', () => window.FireAdmin.open()); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
