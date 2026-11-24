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

// Mise à jour du téléphone : dès que l'équipe annonce une version plus récente que le code chargé, on recharge
// (l'écran de lancement ajoute ?v=<version> à chaque fichier, donc le navigateur prend forcément les nouveaux).
const verNewer = (a, b) => { const x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
function webUpdate(cfg) {
  const v = cfg && cfg.derniere_version;
  if (!v || cfg._source !== 'en ligne') return;
  try { localStorage.setItem('fire.web.lastVer', v); } catch (e) { /* */ }
  if (!verNewer(v, __FIRE_VER__)) return;
  // Garde-fou : une seule tentative par version toutes les 10 minutes (si GitHub n'a pas encore fini de publier).
  let t = null; try { t = JSON.parse(localStorage.getItem('fire.web.reloadFor') || 'null'); } catch (e) { /* */ }
  if (t && t.v === v && Date.now() - t.at < 600000) return;
  try { localStorage.setItem('fire.web.reloadFor', JSON.stringify({ v, at: Date.now() })); } catch (e) { /* */ }
  const go = () => { const d = document.createElement('div'); d.className = 'fire-web-upd'; d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d0f14;color:#eee;display:flex;align-items:center;justify-content:center;font:600 16px system-ui,sans-serif'; d.textContent = '🔥 Mise à jour de FIRE (v' + v + ')…'; document.body.append(d); setTimeout(() => location.reload(), 400); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
}
// L'app reste souvent ouverte en arrière-plan sur un téléphone : au retour dessus, on revérifie.
let lastVis = Date.now();
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible' || Date.now() - lastVis < 60000) return; lastVis = Date.now(); pagesJson('joueurs.json').then(webUpdate).catch(() => {}); });

window.FIRE_MOBILE = true;
window.fire = {
  config: async () => { const j = (await pagesJson('joueurs.json')) || { joueurs: [], _source: 'aucune' }; lastCfg = j; webUpdate(j); return j; },
  guides: async () => (await pagesJson('guides.json')) || { themes: [] },
  patchnotes: async () => (await pagesJson('patchnotes.json')) || { versions: [] },
  tierlist: async () => (await pagesJson('tierlist.json')) || { data: {} },
  puzzles: async () => (await pagesJson('puzzles-draft.json')) || { puzzles: [] },
  otp: async () => { const [d, dd] = await Promise.all([pagesJson('otp.json'), otpDragon()]); return { ...(d || { champs: {} }), dd }; },
  matchup: async (a, b, lane) => ({ ok: false, error: PC_ONLY, dd: await otpDragon(), url: `https://lolalytics.com/lol/${String(a).toLowerCase()}/vs/${String(b).toLowerCase()}/build/` }),
  lolpatch: { list: async () => ({ ok: false, error: PC_ONLY, items: [] }), get: async (url) => ({ ok: false, error: PC_ONLY, link: 'https://www.leagueoflegends.com' + url }) },
  hash: sha,
  version: async () => __FIRE_VER__,
  // Stats : instantané partagé par les PC de l'équipe (le téléphone ne peut pas lire dpm.lol).
  fetchPlayer: no,
  team: async () => ({ ok: true, games: {} }),
  stats: { get: () => coach.statsGet(), push: no },
  gpuz: { bank: () => coach.puzzleBank(), request: (slug, level, have) => coach.puzzleRequest(slug, level, have), generate: no },
  unlock: (code) => coach.unlock(code),
  unlocked: async () => coach.isUnlocked(),
  maint: async () => ({ team: null }),
  coachs: { list: async () => ({ ok: false, coachs: [] }), add: async () => ({ ok: false, error: 'disponible dans FIRE Team sur PC' }) },
  rw: { push: async () => ({ ok: false }), board: async () => ({ ok: false }), remote: async () => ({ ok: true, gifts: [], events: [] }), publish: async () => ({ ok: false, error: 'disponible dans FIRE Team sur PC' }) },
  teams: { info: async () => ({ ok: false, error: 'disponible dans FIRE Team sur PC' }), activate: async () => ({ ok: false, error: 'disponible dans FIRE Team sur PC' }), planning: async () => ({ ok: false, error: 'disponible dans FIRE Team sur PC' }), membre: async () => ({ ok: false, error: 'disponible dans FIRE Team sur PC' }) },
  fiches: () => coach.list(),
  pools: () => coach.pools(),
  planning: () => coach.planning(),
  pub: { get: () => coach.publicGet(), post: (p) => coach.publicPost(p || {}), optin: (s, on) => coach.publicOptin(String(s || ''), !!on), optins: () => coach.publicOptins() },
  plan: { get: () => coach.planGet(), set: (k) => coach.planSet(String(k || '').slice(0, 2000)), clear: () => coach.planClear(), make: (w, p) => coach.planKeyMake(w, p) },
  dev: { make: (w, n) => coach.devKeyMake(w, n), set: (k) => coach.devSet(String(k || '').slice(0, 3000)), clear: () => coach.devClear() },
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
  forum: { get: (id) => coach.forumGet(id), op: (id, op) => coach.forumOp(id, op || {}) },
  appcfg: { get: () => coach.appCfgGet(), post: no, assetPut: no, asset: (id, sum) => coach.appAssetGet(id, sum) },
  annonce: { get: (f, moi) => coach.annonceGet(f || null, String(moi || '')), post: (t, w, r, to, subs) => coach.annoncePost(String(t || ''), String(w || ''), typeof r === 'string' ? r.slice(0, 30) : !!r, Array.isArray(to) ? to : [], Array.isArray(subs) ? subs : []), lu: (id, s, at) => coach.annonceLu(id, s, at), lus: (s) => coach.annonceLus(s) },
  bugs: { send: (b) => coach.sendBug(b || {}), list: () => coach.listBugs(), close: (id) => coach.closeBug(id), reply: (o) => coach.bugReply(o || {}), replies: (s) => coach.bugReplies(s) },
  coach: {
    state: async () => coach.coachState(), unlock: (c) => coach.coachUnlock(c), leave: async () => coach.coachLeave(),
    chefUnlock: (c) => coach.chefUnlock(c), chefLeave: async () => coach.chefLeave(),
    save: no, generate: no, message: async (m) => coach.message(m || {}), publish: no, unpublish: no, savePools: (a) => coach.savePools(a || {}),
  },
  twitchLive: async (ch) => {
    try { const t = (await (await fetch('https://decapi.me/twitch/uptime/' + encodeURIComponent(ch))).text()).trim(); return /error|not found/i.test(t) ? null : { live: !/offline/i.test(t), uptime: /offline/i.test(t) ? '' : t }; } catch (e) { return null; }
  },
  notify: async (m) => {
    try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(String((m && m.title) || 'FIRE Team'), { body: String((m && m.body) || ''), icon: 'icon-192.png' }); } catch (e) { /* */ }
    return true;
  },
  onNotifyGo: noop,
  background: { get: async () => null, set: async () => null },
  // Téléphone : rien à télécharger ni à installer. La dernière version se charge toute seule à chaque lancement (voir webUpdate).
  update: { state: async () => ({ state: 'idle', store: true, web: true }), install: noop, check: async () => ({ ok: true, store: true, web: true }), on: noop },
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
