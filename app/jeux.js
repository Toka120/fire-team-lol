// Données de la rubrique Détente (Loldle maison et lore) : Data Dragon de Riot + univers de LoL, gardées en cache.
const { app, net } = require('electron');
const fs = require('fs');
const path = require('path');

const DD = 'https://ddragon.leagueoflegends.com';
const UNI = 'https://universe-meeps.leagueoflegends.com/v1/fr_fr';
const dir = () => app.getPath('userData');
const file = (n) => path.join(dir(), n);

async function get(url, ms = 30000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await net.fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const readJson = (n) => { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch (e) { return null; } };
const writeJson = (n, d) => { try { fs.writeFileSync(file(n), JSON.stringify(d)); } catch (e) { /* cache facultatif */ } };

// Lanes jouées par champion (Meraki Analytics, figées dans l'app) : la donnée n'existe pas chez Riot.
let LANES = {};
try { LANES = require('./lanes.json'); } catch (e) { /* facultatif */ }
// Vrais skins (sans les chromas, qui n'ont pas de splash) et position du champion dans chaque splash.
// Fichier calculé par tools/splash_focus.py : { skins: { Malzahar: [[num, x%, y%, confiance], ...] } }
// Répliques audio françaises transcrites puis relues (tools/voicelines.py et voicelines_curate.py) :
// { "103": { "choose": "texte…", "ban": "texte…" } }. Seules les répliques bien comprises sont gardées,
// pour que le texte affiché soit exactement celui qu'on entend.
let VOICE = {};
try { VOICE = require('./voicelines.json'); } catch (e) { /* facultatif */ }
function voiceList(key) {
  const v = VOICE[key] || {};
  return ['choose', 'ban'].filter((kind) => typeof v[kind] === 'string' && v[kind]).map((kind) => ({ kind, text: v[kind] }));
}
// Indices emoji (4 par champion, du plus vague au plus précis), écrits à la main.
let EMOJI = {};
try { EMOJI = require('./emojis.json'); } catch (e) { /* facultatif */ }
let SPLASH = {};
try { SPLASH = require('./splash.json').skins || {}; } catch (e) { /* facultatif */ }

// Région associée pour les champions que Riot classe « sans région » (origine ou histoire).
const ASSOC = {
  aatrox: 'shurima', zaahen: 'shurima', jax: 'shurima', zilean: 'shurima',
  bard: 'mount-targon', aurelionsol: 'mount-targon', nami: 'mount-targon',
  lucian: 'demacia', fiddlesticks: 'demacia',
  senna: 'shadow-isles', ryze: 'shadow-isles', evelynn: 'shadow-isles', nocturne: 'shadow-isles', kindred: 'shadow-isles', shaco: 'shadow-isles',
  annie: 'noxus', alistar: 'noxus', smolder: 'noxus',
  fizz: 'bilgewater', tahmkench: 'bilgewater',
  brand: 'freljord'
};
const FAC_FR = { 'mount-targon': 'Targon', 'shadow-isles': 'Îles obscures', 'bandle-city': 'Bandle', noxus: 'Noxus', demacia: 'Demacia', shurima: 'Shurima', bilgewater: 'Bilgewater', freljord: 'Freljord' };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const strip = (html) => String(html || '').replace(/<\/p>\s*<p>/g, '\n\n').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

function skinList(c) {
  const names = {};
  (c.skins || []).forEach((s) => { names[s.num] = s.name === 'default' ? c.name : s.name; });
  const known = SPLASH[c.id];
  if (known && known.length) {
    return known.filter((k) => names[k[0]] != null || k[0] === 0).map((k) => ({ num: k[0], name: names[k[0]] || c.name, fx: k[1], fy: k[2], c: k[3] }));
  }
  // Champion trop récent pour le fichier : on écarte les chromas (nom entre parenthèses).
  return (c.skins || []).filter((s) => !/\(/.test(s.name)).map((s) => ({ num: s.num, name: s.name === 'default' ? c.name : s.name, fx: 50, fy: 40, c: 0 }));
}

// Liste des champions : sorts, passif, classes, ressource, portée, skins (Data Dragon) + région et année (univers).
let mem = null;
async function data() {
  let version = null;
  try { version = (await get(`${DD}/api/versions.json`, 15000))[0]; } catch (e) { /* hors ligne */ }
  const cache = mem || readJson('jeux.json');
  if (cache && cache.fmt === 7 && (!version || cache.version === version)) { mem = cache; return { ok: true, ...cache, offline: !version }; }
  if (!version) return cache ? { ok: true, ...cache, offline: true } : { ok: false, error: 'hors ligne : données des champions indisponibles' };
  try {
    const full = await get(`${DD}/cdn/${version}/data/fr_FR/championFull.json`, 60000);
    let uni = { champions: [], factions: [] };
    try { uni = await get(`${UNI}/search/index.json`, 30000); } catch (e) { /* l'univers est facultatif */ }
    const fac = {};
    (uni.factions || []).forEach((f) => { fac[f.slug] = f.name; });
    const byName = {};
    (uni.champions || []).forEach((c) => { byName[norm(c.name)] = c; byName[norm(c.slug)] = c; });
    const champs = Object.values(full.data).map((c) => {
      const u = byName[norm(c.name)] || byName[norm(c.id)] || null;
      const slug0 = u ? u.slug : c.id.toLowerCase();
      let reg = u ? u['associated-faction-slug'] : null;
      // Riot laisse certains champions « sans région » : on prend la région à laquelle leur histoire les rattache.
      if ((!reg || reg === 'unaffiliated') && ASSOC[slug0]) reg = ASSOC[slug0];
      return {
        id: c.id, key: c.key, name: c.name, title: c.title, tags: c.tags || [], partype: c.partype || 'Aucune',
        range: (c.stats && c.stats.attackrange) >= 300 ? 'Distance' : 'Mêlée',
        passive: { name: c.passive.name, img: c.passive.image.full, desc: strip(c.passive.description) },
        spells: (c.spells || []).map((s, i) => ({ key: 'QWER'[i], name: s.name, img: s.image.full })),
        skins: skinList(c),
        vo: voiceList(c.key),
        emo: EMOJI[c.id] || null,
        lanes: LANES[c.id] || [],
        lore: c.lore, slug: u ? u.slug : c.id.toLowerCase(),
        region: reg && reg !== 'unaffiliated' ? (fac[reg] || FAC_FR[reg] || reg) : null,
        regionSlug: reg || null,
        year: u && u['release-date'] ? Number(String(u['release-date']).slice(0, 4)) : null
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const factions = (uni.factions || []).map((f) => ({ slug: f.slug, name: f.name, desc: strip(f.description), img: f.image && f.image.uri ? f.image.uri : null }));
    mem = { fmt: 7, version, champs, factions, at: Date.now() };
    writeJson('jeux.json', mem);
    return { ok: true, ...mem };
  } catch (e) {
    if (cache) return { ok: true, ...cache, offline: true };
    return { ok: false, error: String((e && e.message) || e) };
  }
}

// Fiche lore d'un champion : biographie complète, citation, espèces, rôles.
async function lore(slug) {
  slug = String(slug || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  if (!slug) return { ok: false, error: 'champion inconnu' };
  const all = readJson('lore.json') || {};
  if (all[slug]) return { ok: true, ...all[slug] };
  try {
    const j = await get(`${UNI}/champions/${slug}/index.json`, 20000);
    const c = j.champion || {};
    const b = c.biography || {};
    const out = {
      full: strip(b.full), short: strip(b.short), quote: strip(b.quote).replace(/^«\s*|\s*»$/g, ''), quoteAuthor: b['quote-author'] || '',
      races: (c.races || []).map((r) => r.name), roles: (c.roles || []).map((r) => r.name)
    };
    all[slug] = out;
    writeJson('lore.json', all);
    return { ok: true, ...out };
  } catch (e) {
    return { ok: false, error: 'lore indisponible (' + ((e && e.message) || e) + ')' };
  }
}

module.exports = { data, lore };
