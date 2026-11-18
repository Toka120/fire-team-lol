// FIRE Launcher — ce que le créateur peut personnaliser dans le launcher de toute l'équipe (mode admin).
// Le même fichier est utilisé par FIRE Team (qui signe et publie) et par le launcher (qui vérifie et affiche) :
// tout ce qui n'est pas dans cette liste est ignoré, et chaque texte a une longueur maximale.
const APPS = ['team', 'kiting', 'listen'];
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '');
const img = (v) => (/^[0-9a-f]{64}\.(png|jpg|jpeg|webp|gif)$/.test(String(v || '')) ? String(v) : '');
const url = (v) => { const u = str(v, 300); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; };
const id = (v) => str(v, 24).replace(/[^\w-]/g, '');
function news(n) {
  n = n && typeof n === 'object' ? n : {};
  return { id: id(n.id) || 'n' + Math.random().toString(36).slice(2, 8), title: str(n.title, 60), text: str(n.text, 280), emoji: str(n.emoji, 8),
    tag: str(n.tag, 16), img: img(n.img), url: url(n.url), pin: !!n.pin };
}
function feat(f) {
  if (!f || typeof f !== 'object' || !f.on) return null;
  return { on: true, title: str(f.title, 60), text: str(f.text, 280), emoji: str(f.emoji, 8), img: img(f.img), ribbon: str(f.ribbon, 16), url: url(f.url) };
}
function launcherClean(c) {
  c = c && typeof c === 'object' ? c : {};
  const per = (o, fn) => { const out = {}; for (const a of APPS) { const v = fn(o && typeof o === 'object' ? o[a] : null); if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) out[a] = v; } return out; };
  const b = c.banner && typeof c.banner === 'object' ? c.banner : {};
  return {
    news: per(c.news, (l) => (Array.isArray(l) ? l.map(news).filter((x) => x.title || x.text || x.img).slice(0, 8) : [])),
    hide: per(c.hide, (l) => (Array.isArray(l) ? [...new Set(l.map(String).filter((x) => /^(b\d|pn)$/.test(x)))].slice(0, 10) : [])),
    feat: per(c.feat, feat),
    color: per(c.color, hex),
    art: per(c.art, img),
    tag: per(c.tag, (v) => str(v, 140)),
    maint: per(c.maint, (v) => str(v, 160)),
    banner: b.on && str(b.text, 200) ? { on: true, text: str(b.text, 200), color: hex(b.color) || '#ff7a2e', url: url(b.url) } : null,
  };
}
// Images utilisées par une configuration (pour les envoyer avec elle).
function launcherImages(c) {
  const out = new Set();
  for (const l of Object.values(c.news || {})) for (const n of l) if (n.img) out.add(n.img);
  for (const f of Object.values(c.feat || {})) if (f && f.img) out.add(f.img);
  for (const a of Object.values(c.art || {})) if (a) out.add(a);
  return [...out];
}
function canonJ(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canonJ).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonJ(v[k])).join(',') + '}';
}
module.exports = { launcherClean, launcherImages, canonJ, LAUNCHER_APPS: APPS };
