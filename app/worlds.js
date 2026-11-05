// Résultats des Worlds : pages « Scoreboards » de Leaguepedia (lol.fandom.com, contenu CC BY-SA), gardées en cache.
// Le HTML est analysé dans l'interface (DOMParser) ; ici on ne fait que télécharger et mettre en cache.
const { app, net } = require('electron');
const fs = require('fs');
const path = require('path');

const WIKI = 'https://lol.fandom.com/wiki/';
const file = (y) => path.join(app.getPath('userData'), `worlds-${y}.json`);
const mem = {};

async function getText(url, ms = 30000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await net.fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'FIRE-LoL (application d\'équipe amateur)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Ne garde que le contenu de l'article (les tableaux de scores) : plus léger à envoyer à l'interface.
function keepBoards(html) {
  const a = html.indexOf('mw-parser-output');
  if (a < 0) return html;
  let b = html.indexOf('printfooter', a);
  if (b < 0) b = html.length;
  return html.slice(html.lastIndexOf('<', a), b);
}
function subpages(html, base) {
  const re = new RegExp('href="/wiki/(' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/[^"?#]+)"', 'g');
  const out = [];
  let m;
  while ((m = re.exec(html))) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

async function season(year, force) {
  year = parseInt(year, 10);
  if (!(year >= 2011 && year <= 2100)) return { ok: false, error: 'année invalide' };
  const now = new Date();
  const live = year >= now.getFullYear();
  const ttl = live ? 15 * 60 * 1000 : Infinity;
  let cache = mem[year];
  if (!cache) { try { cache = JSON.parse(fs.readFileSync(file(year), 'utf8')); } catch (e) { cache = null; } }
  if (cache && !force && Date.now() - cache.at < ttl) return { ok: true, ...cache };
  try {
    const pages = [];
    for (const stage of ['Play-In', 'Main_Event']) {
      const base = `${year}_Season_World_Championship/${stage}/Scoreboards`;
      let html;
      try { html = await getText(WIKI + base); } catch (e) { continue; }
      pages.push({ stage, name: '', html: keepBoards(html) });
      for (const sp of subpages(html, base)) {
        await wait(400);
        try { const h = await getText(WIKI + sp); pages.push({ stage, name: decodeURIComponent(sp.slice(base.length + 1)).replace(/_/g, ' '), html: keepBoards(h) }); } catch (e) { /* page manquante */ }
      }
    }
    if (!pages.some((p) => p.html)) throw new Error('aucun résultat trouvé pour ' + year);
    const out = { year, pages, at: Date.now() };
    mem[year] = out;
    try { fs.writeFileSync(file(year), JSON.stringify(out)); } catch (e) { /* cache facultatif */ }
    return { ok: true, ...out };
  } catch (e) {
    if (cache) return { ok: true, ...cache, offline: true };
    return { ok: false, error: String((e && e.message) || e) };
  }
}

module.exports = { season };
