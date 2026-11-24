// FIRE Team — lecture de la page publique « Synergies » d'un champion sur OP.GG
// (ex. /lol/champions/ahri/synergies/mid?tier=platinum&region=euw). La page est rendue côté serveur : on lit le
// tableau affiché pour chaque rôle allié (champion, part des parties, nombre de parties, victoires ensemble).
'use strict';

const LANES = { Top: 'top', Jungle: 'jungle', Middle: 'middle', Mid: 'middle', Bottom: 'bottom', ADC: 'bottom', Support: 'support' };
const num = (x) => { const n = parseFloat(String(x == null ? '' : x).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
const flat = (s) => String(s || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

function parseSynergies(html) {
  html = String(html || '');
  const t = flat(html);
  const base = num((t.match(/\|Win rate\|([\d.]+)%/) || [])[1]);
  const patch = (t.match(/Patch (\d+\.\d+)/) || [])[1] || '';
  const forLane = LANES[(t.match(/Synergies for (\w+)/) || [])[1]] || '';
  const roles = {};
  const parts = html.split(/Synergies with (Top|Jungle|Middle|Bottom|Support)</);
  // parts : [avant, rôle1, html1, rôle2, html2, …] ; chaque rôle apparaît deux fois (titre et onglet) : on garde le bloc qui a des lignes.
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const lane = LANES[parts[i]];
    const rows = [];
    for (const tr of parts[i + 1].split('<tr').slice(1)) {
      const key = (tr.match(/\/champion\/([A-Za-z]+)\.png/) || [])[1];
      const nums = [...tr.matchAll(/>([\d.,]+)%?</g)].map((m) => m[0]);
      const pick = num((tr.match(/>([\d.]+)%<\/strong><div[^>]*>([\d,]+)</) || [])[1]);
      const games = num((tr.match(/>[\d.]+%<\/strong><div[^>]*>([\d,]+)</) || [])[1]);
      const wrs = [...tr.matchAll(/>([\d.]+)%<\/strong>/g)].map((m) => num(m[1]));
      const wr = wrs.length >= 2 ? wrs[wrs.length - 1] : null;
      if (key && wr != null && nums.length) rows.push({ c: key, pick, games: games || 0, wr });
    }
    if (rows.length && !(roles[lane] && roles[lane].length >= rows.length)) roles[lane] = rows;
  }
  return { ok: Object.keys(roles).length > 0, base, patch, lane: forLane, roles };
}

module.exports = { parseSynergies };
