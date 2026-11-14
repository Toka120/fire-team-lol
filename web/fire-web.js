// FIRE LoL — version téléphone (web app). Remplace le processus principal d'Electron : même code pour le chiffrement
// et le dépôt de l'équipe (coach.js), mais dans le navigateur. Ce qui lit le jeu ou le client LoL du PC n'existe pas ici.
import coach from '../app/coach.js';
import jeux from '../app/jeux.js';
import worlds from '../app/worlds.js';

const BASE = new URL('../../', location.href).href; // https://toka120.github.io/fire-team-lol/
const PAGES = (n) => BASE + n + '?t=' + Date.now();
const store = { get: (k, d) => { try { const v = localStorage.getItem('fire.web.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('fire.web.' + k, JSON.stringify(v)); } catch (e) { /* plein */ } } };
async function pagesJson(name) {
  try { const r = await fetch(PAGES(name), { cache: 'no-store' }); if (r.ok) { const j = await r.json(); store.set('cache.' + name, j); return { ...j, _source: 'en ligne' }; } } catch (e) { /* hors ligne */ }
  const c = store.get('cache.' + name, null);
  return c ? { ...c, _source: 'copie locale' } : null;
}
let lastCfg = null;
coach.init(() => lastCfg || {});
const PC_ONLY = 'disponible sur la version PC de FIRE';
const no = async () => ({ ok: false, error: PC_ONLY });
const noop = () => {};
let otpDD = null;
async function otpDragon() {
  if (otpDD) return otpDD;
  try {
    const v = (await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json())[0];
    const base = `https://ddragon.leagueoflegends.com/cdn/${v}/data/fr_FR/`;
    const [rr, su] = await Promise.all([fetch(base + 'runesReforged.json').then((r) => r.json()), fetch(base + 'summoner.json').then((r) => r.json())]);
    const runes = {};
    for (const tree of rr) { runes[tree.id] = { n: tree.name, i: tree.icon }; for (const slot of tree.slots || []) for (const x of slot.runes || []) runes[x.id] = { n: x.name, i: x.icon, t: tree.id }; }
    const spells = {}; Object.values(su.data || {}).forEach((x) => { spells[x.key] = { n: x.name, i: x.image && x.image.full }; });
    return (otpDD = { v, runes, spells });
  } catch (e) { return { v: null, runes: {}, spells: {} }; }
}
const sha = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t))))].map((b) => b.toString(16).padStart(2, '0')).join('');

window.FIRE_MOBILE = true;
window.fire = {
  config: async () => { const j = (await pagesJson('joueurs.json')) || { joueurs: [], _source: 'aucune' }; lastCfg = j; return j; },
  guides: async () => (await pagesJson('guides.json')) || { themes: [] },
  patchnotes: async () => (await pagesJson('patchnotes.json')) || { versions: [] },
  tierlist: async () => (await pagesJson('tierlist.json')) || { data: {} },
  puzzles: async () => (await pagesJson('puzzles-draft.json')) || { puzzles: [] },
  otp: async () => { const [d, dd] = await Promise.all([pagesJson('otp.json'), otpDragon()]); return { ...(d || { champs: {} }), dd }; },
  matchup: async (a, b, lane) => ({ ok: false, error: PC_ONLY, dd: await otpDragon(), url: `https://lolalytics.com/lol/${String(a).toLowerCase()}/vs/${String(b).toLowerCase()}/build/` }),
  lolpatch: { list: async () => ({ ok: false, error: PC_ONLY, items: [] }), get: async (url) => ({ ok: false, error: PC_ONLY, link: 'https://www.leagueoflegends.com' + url }) },
  hash: sha,
  version: async () => { const p = await pagesJson('patchnotes.json'); return (p && p.versions && p.versions[0] && p.versions[0].v) || 'web'; },
  // Stats : instantané partagé par les PC de l'équipe (le téléphone ne peut pas lire dpm.lol).
  fetchPlayer: no,
  team: async () => ({ ok: true, games: {} }),
  stats: { get: () => coach.statsGet(), push: no },
  unlock: (code) => coach.unlock(code),
  unlocked: async () => coach.isUnlocked(),
  fiches: () => coach.list(),
  pools: () => coach.pools(),
  planning: () => coach.planning(),
  savePlanning: (a) => coach.savePlanning(a || {}),
  champions: () => coach.champions(),
  jeux: { data: () => jeux.data(), lore: (s) => jeux.lore(s) },
  worlds: (y, force) => worlds.season(y, !!force),
  revues: { list: () => coach.revues(), get: (id) => coach.revueGet(id), share: no, note: (id, n, del) => coach.revueNote(id, n, !!del), ia: no },
  scrims: { list: () => coach.scrims(), save: (op, who) => coach.scrimSave(op || {}, who) },
  chat: { list: () => coach.chat(), send: (m) => coach.chatSend(m || {}) },
  salons: { list: () => coach.salons(), save: (d) => coach.salonsSave(d || {}) },
  staff: { adminSetup: no, roles: () => coach.roles(), rolesSave: (m, w) => coach.rolesSave(m, w), actPush: (s, e) => coach.activityPush(s, e), actAll: (s) => coach.activityAll(s),
    rempSeal: async (o) => coach.rempSeal(o), rempOpen: async (b) => coach.rempOpen(b),
    membres: () => coach.membres(), demande: (m) => coach.membreDemande(m || {}), decision: (slug, ok, role, who, fix) => coach.membreDecision(String(slug || ''), !!ok, role, who, fix || null),
    notes: () => coach.staffNotes(), noteSave: (n, w) => coach.staffNoteSave(n, w), chatDelete: (id, w) => coach.chatDelete(id, w) },
  bugs: { send: (b) => coach.sendBug(b || {}), list: () => coach.listBugs(), close: (id) => coach.closeBug(id) },
  coach: {
    state: async () => coach.coachState(), unlock: (c) => coach.coachUnlock(c), leave: async () => coach.coachLeave(),
    chefUnlock: (c) => coach.chefUnlock(c), chefLeave: async () => coach.chefLeave(),
    save: no, generate: no, message: async (m) => coach.message(m || {}), publish: no, unpublish: no, savePools: (a) => coach.savePools(a || {}),
  },
  twitchLive: async (ch) => {
    try { const t = (await (await fetch('https://decapi.me/twitch/uptime/' + encodeURIComponent(ch))).text()).trim(); return /error|not found/i.test(t) ? null : { live: !/offline/i.test(t), uptime: /offline/i.test(t) ? '' : t }; } catch (e) { return null; }
  },
  notify: async (m) => {
    try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(String((m && m.title) || 'FIRE LoL'), { body: String((m && m.body) || ''), icon: 'icon-192.png' }); } catch (e) { /* */ }
    return true;
  },
  onNotifyGo: noop,
  background: { get: async () => null, set: async () => null },
  update: { state: async () => ({ state: 'idle' }), install: noop, check: noop, on: noop },
  // Liens : ouverts dans le navigateur du téléphone.
  live: { on: noop, spectate: no },
  win: { displays: async () => [], setDisplay: no, soundComms: async () => null, inVoice: noop, onLeaveVoice: noop },
  adv: { gpu: async () => null, setGpu: no, restart: () => location.reload(), clearCache: async () => ({ ok: true }), cacheSize: async () => 0 },
  streamer: { watch: no, on: noop },
  keys: { set: async () => ({ ok: false, error: PC_ONLY }), on: noop },
  lcu: { draft: async () => null, runes: no, import: no, stats: async () => null },
  ddImage: async () => null,
  openUrl: (u) => { try { window.open(u, '_blank', 'noopener'); } catch (e) { location.href = u; } },
  zoom: noop,
};
