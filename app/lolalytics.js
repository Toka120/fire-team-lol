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
  };
}

module.exports = { parseMatchup, build };
