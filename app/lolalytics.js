// FIRE LoL — lecture d'une page publique « matchup » de LoLalytics (ex. /lol/rumble/vs/drmundo/build/)
// pour afficher l'essentiel directement dans l'onglet Draft › Matchups : victoires, parties, build et runes.
// Une seule page lue quand le joueur choisit un matchup, gardée 6 h en mémoire.
'use strict';

const noComment = (s) => String(s || '').replace(/<!--[\s\S]*?-->/g, '');
const flat = (s) => noComment(s).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '|').replace(/\|+/g, '|')
  .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const num = (x) => (x == null ? null : Number(String(x).replace(/,/g, '')));

function imgs(s, kind, from = 0, to = s.length) {
  const out = [];
  const re = new RegExp(`<img[^>]*${kind}/(\\d+)\\.webp[^>]*>`, 'g');
  const part = s.slice(from, to);
  let m;
  while ((m = re.exec(part))) out.push({ id: m[1], gray: /grayscale/.test(m[0]) });
  return out;
}

function build(html) {
  const s = noComment(html);
  const out = {};
  const sp = s.indexOf('Summoner Spells');
  if (sp > 0) out.spells = imgs(s, 'spell64', sp).slice(0, 2).map((x) => x.id);
  out.runes = imgs(s, 'rune68').filter((x) => !x.gray).slice(0, 6).map((x) => x.id);
  out.shards = imgs(s, 'statmod32').filter((x) => !x.gray).slice(0, 3).map((x) => x.id);
  const section = (label, n) => {
    let j = s.indexOf('>' + label + '<');
    if (j < 0) j = s.indexOf(label + '<');
    if (j < 0) return [];
    const k = s.indexOf('mb-1 text-center text-sm', j + 10);
    return imgs(s, 'item64', j, k > 0 ? k : j + 20000).slice(0, n).map((x) => x.id);
  };
  out.start = section('Starting Items', 3);
  out.core = section('Core Build', 3);
  out.i4 = section('Item 4', 2);
  const sk = s.indexOf('Skill Priority');
  if (sk > 0) {
    const re = /<img[^>]*?src="[^"]*skill68\/([a-z0-9_]+)\.webp"/g;
    const part = s.slice(sk, sk + 20000);
    const keys = [];
    let m;
    while ((m = re.exec(part)) && keys.length < 3) keys.push(m[1].split('_').pop().toUpperCase());
    out.skills = keys;
  }
  return out;
}

// Texte de la page avec des repères [item:ID] / [skill:Q] à la place des images, pour lire les tableaux.
function marked(html) {
  return noComment(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<img[^>]*?(item64|rune68|statmod32|spell64)\/(\d+)\.webp[^>]*>/g, '[$1:$2]')
    .replace(/<img[^>]*?skill68\/[a-z0-9]+_([a-z0-9]+)\.webp[^>]*>/g, '[skill:$1]')
    .replace(/<[^>]+>/g, '|').replace(/\s*\|[\s|]*/g, '|').replace(/&amp;/g, '&');
}
// Ordre des compétences niveau par niveau (tableau « Skill Order » de LoLalytics, mesuré au niveau 15), complété jusqu'au 18.
function skillOrder(m) {
  const i = m.indexOf('Skill Order is measured');
  if (i < 0) return null;
  const part = m.slice(i, i + 6000);
  const lv = {};
  const re = /\[skill:([a-z0-9]+)\]([^\[]*)/g;
  let x;
  while ((x = re.exec(part))) {
    const key = x[1].slice(-1).toUpperCase();
    if (!'QWER'.includes(key)) continue;
    const stop = x[2].search(/Win Rate|Games/);
    for (const n of (stop >= 0 ? x[2].slice(0, stop) : x[2]).split('|').map((y) => y.trim()).filter((y) => /^\d{1,2}$/.test(y))) lv[Number(n)] = lv[Number(n)] || key;
    if (/Win Rate/.test(x[2])) break;
  }
  const out = [];
  for (let l = 1; l <= 18; l++) out.push(lv[l] || null);
  if (out.filter(Boolean).length < 6) return null;
  // Niveaux 16 à 18 (et trous) : R aux niveaux 6, 11, 16, puis la compétence montée en priorité.
  const cnt = { Q: 0, W: 0, E: 0, R: 0 }; out.forEach((k) => { if (k) cnt[k]++; });
  const prio = ['Q', 'W', 'E'].sort((a, b) => out.lastIndexOf(a) - out.lastIndexOf(b) || cnt[b] - cnt[a]);
  for (let l = 1; l <= 18; l++) {
    if (out[l - 1]) continue;
    if ([6, 11, 16].includes(l) && cnt.R < 3) { out[l - 1] = 'R'; cnt.R++; continue; }
    const k = ['Q', 'W', 'E'].sort((a, b) => cnt[a] === 5 ? 1 : cnt[b] === 5 ? -1 : prio.indexOf(b) - prio.indexOf(a))[0];
    out[l - 1] = k; cnt[k]++;
  }
  return out;
}
// Les choix d'un bloc (« Boots », « Item 4 »…) : chaque objet avec son % de victoires et ses parties.
function choices(m, label, kind, max) {
  const i = m.indexOf('|' + label + '|');
  if (i < 0) return [];
  const part = m.slice(i + label.length + 2, i + 4000);
  const end = part.search(/\|(Item [456]|Boots|Starting Items|Core Build|Summoner Spells|Skill Order|Runes)\|/);
  const seg = end > 0 ? part.slice(0, end) : part.slice(0, 1500);
  const out = [];
  const re = new RegExp('\\[' + kind + ':(\\d+)\\](?:\\|Loading\\.\\.\\.)?\\|([\\d.]+)%\\|([\\d,]+)', 'g');
  let x;
  while ((x = re.exec(seg)) && out.length < (max || 6)) out.push({ id: x[1], wr: num(x[2]), games: num(x[3]) });
  return out;
}
function parseMatchup(html) {
  const t = flat(html);
  const wrm = t.match(/\|([\d.]+)%\|Win Rate\|([\d,]+)\|Games\|/);
  const diff = t.match(/of the time which is (-?[\d.]+)% (\w+)/);
  const norm = t.match(/wins against \|[^|]+\| (-?[\d.]+)% (\w+) than would be expected/);
  const avg = t.match(/Average [^|]*Win Rate: ([\d.]+)%/);
  const stat = (k) => { const m = t.match(new RegExp('\\|' + k + ':\\|([\\d.,]+)\\|')); return m ? num(m[1]) : null; };
  return {
    ok: !!wrm,
    wr: wrm ? num(wrm[1]) : null, games: wrm ? num(wrm[2]) : null,
    diff: diff ? { v: num(diff[1]), w: diff[2] } : null, norm: norm ? { v: num(norm[1]), w: norm[2] } : null,
    avg: avg ? num(avg[1]) : null,
    patch: (t.match(/\|Patch\|([\d.]+)\|/) || [])[1] || '',
    elo: (t.match(/\|([A-Z]+\+?)\|Patch\|/) || [])[1] || '',
    stats: { k: stat('Kills'), d: stat('Deaths'), a: stat('Assists'), dmg: stat('Total Damage'), taken: stat('Damage Taken'), gold: stat('Gold'), cs: stat('Minions Killed'), heal: stat('Healing') },
    build: build(html),
    more: (() => { const m = marked(html); return { skills: skillOrder(m), boots: choices(m, 'Boots', 'item64', 6), i4: choices(m, 'Item 4', 'item64', 6), i5: choices(m, 'Item 5', 'item64', 6), i6: choices(m, 'Item 6', 'item64', 6) }; })(),
  };
}

module.exports = { parseMatchup, build, skillOrder, choices, marked };
