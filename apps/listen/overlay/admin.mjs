// FIRE Listen — menu admin : niveaux de quiz et sons ajoutés pour toute l'équipe.
// Ouvert avec une clé donnée par le créateur. Les niveaux restent en brouillon sur ce PC jusqu'à « Publier ».
import * as FA from './fire-admin.mjs';
import { LEVELS } from './engine.mjs';
import { TEAM, ROLES, cleanLevel, cleanSound, timerOf, clipOf, useLevel, useSound, loadTeam } from './team.mjs';

const { h, toast } = FA;
const DKEY = 'fire.listen.admin.drafts';
let key = null, tab = 'level', panel = null, editing = null;

function drafts() { try { const d = JSON.parse(localStorage.getItem(DKEY) || '{}'); return { level: d.level || {} }; } catch { return { level: {} }; } }
function saveDrafts(d) { try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch { toast('Brouillon trop lourd pour être gardé.', true); } }
function levels() {
  const d = drafts().level, out = new Map();
  for (const it of TEAM.levels) out.set(it.id, { id: it.id, data: it.data, published: true, draft: false });
  for (const [id, data] of Object.entries(d)) out.set(id, { id, data, published: out.has(id), draft: true });
  return [...out.values()];
}
const champName = (id) => (TEAM.catalog.find((c) => String(c.id) === String(id)) || {}).name || id;

export async function openAdmin() {
  key = await FA.myKey('listen');
  if (key.state === 'revoked') { toast('Ta clé admin a été retirée par le créateur.', true); await FA.clearKey(); }
  if (key.state !== 'ok') { FA.keyScreen('listen', 'FIRE Listen', openAdmin); return; }
  panel = FA.modal('🔧 Admin FIRE Listen', h('div'), { wide: true, onClose: () => { panel = null; } });
  draw();
}
function draw() {
  if (!panel) return;
  const tabs = h('nav', { class: 'fa-tabs' }, Object.entries({ level: '🎯 Niveaux', sound: '🔊 Sons', key: '🔑 Ma clé' }).map(([k, l]) =>
    h('button', { type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; editing = null; draw(); } }, l)));
  const body = tab === 'key' ? keyTab() : editing ? (tab === 'level' ? levelEditor(editing) : soundEditor(editing)) : tab === 'level' ? levelList() : soundList();
  panel.body.replaceChildren(tabs, body);
}
function keyTab() {
  const c = key.cert;
  return h('div', { class: 'fa-sec' },
    h('p', null, 'Clé de ', h('b', null, c.who), ', valable pour ', c.apps.join(' et '), '.'),
    h('p', { class: 'fa-muted' }, 'Tes créations sont signées avec cette clé : tout le monde vérifie qu’elles viennent bien d’un admin. Le créateur peut la retirer à tout moment.'),
    h('p', { class: 'fa-muted' }, 'Pour publier, FIRE Team doit être ouvert sur ce PC (connecté à l’équipe) : c’est lui qui envoie les créations à toute l’équipe.'),
    h('div', { class: 'fa-row' }, h('button', { class: 'fa-btn', type: 'button', onclick: async () => { if (!confirm('Retirer la clé de ce PC ?')) return; await FA.clearKey(); panel.close(); toast('Clé retirée de ce PC.'); } }, 'Retirer la clé de ce PC')));
}

// ---------- Niveaux ----------
function describeLevel(d) {
  const L = cleanLevel(d), parts = [];
  parts.push('Touches ' + L.abilities.map((i) => 'QWER'[i]).join(' '));
  parts.push(L.lives ? `${L.lives} vie${L.lives > 1 ? 's' : ''}` : 'vies illimitées');
  parts.push(L.count ? `${L.count} questions` : 'tous les champions');
  if (L.roles.length) parts.push(L.roles.map((r) => ROLES[r]).join('/'));
  if (L.champions.length) parts.push(`${L.champions.length} champions choisis`);
  parts.push(L.timer ? `⏱ ${timerOf(L)} s par question (vitesse ${L.speedPct} %)` : 'sans chrono');
  parts.push(clipOf(L) ? `✂ sons coupés à ${clipOf(L)} s (difficulté ${L.difficultyPct} %)` : `difficulté ${L.difficultyPct} %`);
  if (L.withSounds === 'only') parts.push('sons ajoutés uniquement'); else if (L.withSounds === 'none') parts.push('sans les sons ajoutés');
  return parts.join(' · ');
}
function levelList() {
  const items = levels();
  return h('div', { class: 'fa-sec' },
    h('p', { class: 'fa-muted' }, 'Un niveau choisit les touches (Q W E R), les vies, le nombre de questions, les rôles ou champions, la vitesse (chrono par question) et la difficulté (sons coupés plus court). Il apparaît à côté des modes de jeu, chez tout le monde.'),
    h('div', { class: 'fa-row' }, h('button', { class: 'fa-btn primary', type: 'button', onclick: () => { editing = { id: FA.uid('lv_'), data: cleanLevel({ name: 'Nouveau niveau' }), isNew: true }; draw(); } }, '➕ Nouveau niveau')),
    h('div', { class: 'fa-list' }, items.length ? items.map((it) => h('div', { class: 'fa-card' },
      h('span', { class: 'fa-tag' }, it.draft ? (it.published ? '✏️ Modifié, pas encore publié' : '📝 Brouillon') : '✅ Publié'),
      h('div', { class: 'fa-card-h' }, h('b', null, it.data.name)), it.data.desc ? h('p', { class: 'fa-muted' }, it.data.desc) : null,
      h('p', { class: 'fa-stats' }, describeLevel(it.data)),
      h('div', { class: 'fa-row' },
        h('button', { class: 'fa-btn', type: 'button', onclick: () => { editing = { id: it.id, data: JSON.parse(JSON.stringify(it.data)), isNew: false }; draw(); } }, '✏️ Modifier'),
        h('button', { class: 'fa-btn', type: 'button', onclick: () => testLevel(it.data) }, '▶ Tester'),
        it.draft ? h('button', { class: 'fa-btn primary', type: 'button', onclick: () => publishLevel(it.id) }, '📤 Publier') : null,
        h('button', { class: 'fa-btn danger', type: 'button', onclick: () => removeItem('level', it) }, it.published ? '🗑️ Retirer de l’équipe' : '🗑️ Supprimer')))) : h('p', { class: 'fa-muted' }, 'Aucun niveau pour l’instant.')));
}
const field = (label, input, help) => h('label', { class: 'fa-field' }, h('span', null, label), input, help ? h('small', { class: 'fa-muted' }, help) : null);
function range(d, k, min, max, step, unit, after) {
  const out = h('output', null, d[k] + (unit || ''));
  return h('span', { class: 'fa-range' }, h('input', { type: 'range', min, max, step, value: d[k], oninput: (e) => { d[k] = Number(e.target.value); out.textContent = d[k] + (unit || ''); after && after(); } }), out);
}
function chips(list, selected, onToggle) {
  return h('div', { class: 'fa-chips' }, list.map(([id, label]) => h('button', { type: 'button', class: 'fa-chip' + (selected.includes(id) ? ' on' : ''), onclick: (e) => { onToggle(id); e.currentTarget.classList.toggle('on'); } }, label)));
}
const toggle = (arr, id) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); };
function levelEditor(ed) {
  const d = ed.data;
  const info = h('p', { class: 'fa-muted' });
  const refresh = () => { const L = cleanLevel(d); info.textContent = (L.timer ? `⏱ ${timerOf(L)} s pour répondre. ` : 'Pas de chrono. ') + (clipOf(L) ? `✂ Chaque son s’arrête après ${clipOf(L)} s.` : 'Sons entiers.'); };
  const timer = h('label', { class: 'fa-check' }, h('input', { type: 'checkbox', checked: d.timer, onchange: (e) => { d.timer = e.target.checked; refresh(); } }), 'Chrono par question');
  const points = h('label', { class: 'fa-check' }, h('input', { type: 'checkbox', checked: d.points, onchange: (e) => { d.points = e.target.checked; } }), 'Points « écoute minimale » (moins de sons écoutés = plus de points)');
  const champs = TEAM.catalog.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => [String(c.id), c.name]);
  const champBox = h('details', null, h('summary', null, `Champions précis (${d.champions.length} choisis — aucun = tous)`), chips(champs, d.champions, (id) => toggle(d.champions, id)));
  const keep = () => { const all = drafts(); all.level[ed.id] = cleanLevel(d); saveDrafts(all); return all.level[ed.id]; };
  refresh();
  return h('div', { class: 'fa-sec' },
    h('p', null, h('button', { class: 'fa-link', type: 'button', onclick: () => { editing = null; draw(); } }, '← Retour'), ' ', h('b', null, ed.isNew ? 'Nouveau niveau' : 'Modifier le niveau')),
    field('Nom', h('input', { class: 'fa-inp', value: d.name, maxlength: 40, oninput: (e) => { d.name = e.target.value; } })),
    field('Description', h('input', { class: 'fa-inp', value: d.desc, maxlength: 200, placeholder: 'Ex. : les ultimes des mids, chrono serré', oninput: (e) => { d.desc = e.target.value; } })),
    field('Touches écoutables', chips([[0, 'Q'], [1, 'W'], [2, 'E'], [3, 'R']], d.abilities, (i) => toggle(d.abilities, i))),
    field('Vies', range(d, 'lives', 0, 10, 1, '', null), '0 = vies illimitées.'),
    field('Nombre de questions', range(d, 'count', 0, 100, 1, ''), '0 = tous les champions du niveau.'),
    field('Rôles', chips(Object.entries(ROLES), d.roles, (r) => toggle(d.roles, r)), 'Aucun = tous les rôles.'),
    champBox,
    field('Sons ajoutés par l’équipe', h('select', { class: 'fa-inp', onchange: (e) => { d.withSounds = e.target.value; } }, Object.entries({ add: 'Inclus avec les champions', none: 'Exclus', only: 'Uniquement les sons ajoutés' }).map(([v, l]) => h('option', { value: v, selected: d.withSounds === v }, l)))),
    timer, field('Vitesse', range(d, 'speedPct', 25, 400, 5, ' %', refresh), 'Avec le chrono : 100 % = 30 s par question, 200 % = 15 s, 400 % = 8 s.'),
    field('Difficulté', range(d, 'difficultyPct', 25, 400, 5, ' %', refresh), 'Au-delà de 100 %, chaque son est coupé plus tôt (200 % = 1,5 s, 400 % = 0,8 s).'),
    points, info,
    h('div', { class: 'fa-row fa-sticky' },
      h('button', { class: 'fa-btn', type: 'button', onclick: () => { keep(); editing = null; draw(); toast('Brouillon enregistré sur ce PC.'); } }, '💾 Enregistrer le brouillon'),
      h('button', { class: 'fa-btn', type: 'button', onclick: () => testLevel(keep()) }, '▶ Tester'),
      h('button', { class: 'fa-btn primary', type: 'button', onclick: () => { keep(); editing = null; publishLevel(ed.id); } }, '📤 Publier pour l’équipe')));
}
function testLevel(data) {
  useLevel('lv_essai', { ...data, name: 'Essai : ' + data.name });
  panel && panel.close();
  window.FireListen.start('lv_essai');
}
window.addEventListener('hashchange', () => { if (location.hash !== '#lv_essai') delete LEVELS.lv_essai; });

// ---------- Sons ----------
function soundList() {
  return h('div', { class: 'fa-sec' },
    h('p', { class: 'fa-muted' }, 'Ajoute un son (MP3, OGG, WAV, M4A, 2,5 Mo au maximum) : soit en plus des sons d’un champion (sous la touche choisie), soit comme une nouvelle réponse du quiz (« Baron Nashor », « Dragon », « Flash »…).'),
    h('div', { class: 'fa-row' }, h('button', { class: 'fa-btn primary', type: 'button', onclick: () => { editing = { id: FA.uid('so_'), data: cleanSound({ name: '' }), isNew: true }; draw(); } }, '➕ Nouveau son')),
    h('div', { class: 'fa-list' }, TEAM.sounds.length ? TEAM.sounds.map((it) => { const s = cleanSound(it.data); return h('div', { class: 'fa-card' },
      h('div', { class: 'fa-card-h' }, h('b', null, s.name), h('span', { class: 'fa-chip' }, 'QWER'[s.slot])),
      h('p', { class: 'fa-muted' }, s.champion ? 'Son de ' + champName(s.champion) : 'Réponse : ' + [s.name, ...s.aliases].join(' / ')),
      h('div', { class: 'fa-row' },
        h('button', { class: 'fa-btn', type: 'button', onclick: async () => { const url = await FA.teamFile(`apps/listen/sons/${s.sha}.${s.ext}`, s.sha, s.ext); if (url) new Audio(url).play().catch(() => {}); else toast('Son indisponible hors ligne.', true); } }, '▶ Écouter'),
        h('button', { class: 'fa-btn', type: 'button', onclick: () => { editing = { id: it.id, data: { ...s }, isNew: false }; draw(); } }, '✏️ Modifier'),
        h('button', { class: 'fa-btn danger', type: 'button', onclick: () => removeItem('sound', { id: it.id, data: s, published: true }) }, '🗑️ Retirer de l’équipe'))); }) : h('p', { class: 'fa-muted' }, 'Aucun son ajouté pour l’instant.')));
}
function soundEditor(ed) {
  const d = ed.data;
  let blob = null;
  const st = h('p', { class: 'fa-muted' }, ed.isNew ? 'Choisis un fichier audio.' : 'Fichier actuel gardé (choisis-en un autre pour le remplacer).');
  const file = h('input', { type: 'file', accept: 'audio/mpeg,audio/ogg,audio/wav,audio/x-wav,audio/mp4,audio/webm,.mp3,.ogg,.wav,.m4a,.webm', onchange: async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const ext = (/\.([a-z0-9]+)$/i.exec(f.name) || [])[1]?.toLowerCase();
    if (!['mp3', 'ogg', 'wav', 'm4a', 'webm'].includes(ext)) { st.textContent = '⚠ Format non pris en charge (MP3, OGG, WAV, M4A ou WEBM).'; return; }
    if (f.size > 2.5e6) { st.textContent = '⚠ Fichier trop lourd : 2,5 Mo au maximum.'; return; }
    const buf = await f.arrayBuffer();
    blob = { bytes: new Uint8Array(buf), url: URL.createObjectURL(new Blob([buf])) };
    d.sha = await FA.sha256Hex(buf); d.ext = ext;
    if (!d.name) { d.name = f.name.replace(/\.[^.]+$/, '').slice(0, 40); nameIn.value = d.name; }
    st.textContent = `✓ ${f.name} (${Math.round(f.size / 1024)} Ko)`;
  } });
  const nameIn = h('input', { class: 'fa-inp', value: d.name, maxlength: 40, placeholder: 'Ex. : Baron Nashor', oninput: (e) => { d.name = e.target.value; } });
  const champs = [['', '— Aucun : nouvelle réponse du quiz —'], ...TEAM.catalog.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => [String(c.id), c.name])];
  const publish = async () => {
    const s = cleanSound(d);
    if (!s.name) { toast('Donne un nom au son.', true); return; }
    if (!s.sha) { toast('Choisis un fichier audio.', true); return; }
    try {
      const item = await FA.signItem(key, 'listen', 'sound', ed.id, s);
      if (blob) item.blob = FA.b64.enc(blob.bytes);
      const r = await FA.publish('listen', item);
      if (!r || !r.ok) throw new Error((r && r.error) || 'envoi impossible');
      editing = null; draw();
      toast('📤 Son envoyé à FIRE Team : publication en cours…');
      const w = await FA.waitPublish(r.name);
      if (w.ok) { if (blob) await useSound({ id: ed.id, url: blob.url }, s); toast('✅ Son publié pour toute l’équipe.'); await loadTeam(); draw(); }
      else toast(w.pending ? '⏳ En attente : ouvre FIRE Team sur ce PC (connecté à l’équipe).' : '⚠ ' + (w.error || 'refusé'), true);
    } catch (e) { toast('⚠ ' + (e.message || e), true); }
  };
  return h('div', { class: 'fa-sec' },
    h('p', null, h('button', { class: 'fa-link', type: 'button', onclick: () => { editing = null; draw(); } }, '← Retour'), ' ', h('b', null, ed.isNew ? 'Nouveau son' : 'Modifier le son')),
    field('Fichier audio', file), st,
    h('div', { class: 'fa-row' }, h('button', { class: 'fa-btn', type: 'button', onclick: async () => { const url = blob ? blob.url : d.sha ? await FA.teamFile(`apps/listen/sons/${d.sha}.${d.ext}`, d.sha, d.ext) : ''; if (url) new Audio(url).play().catch(() => toast('Lecture impossible.', true)); } }, '▶ Écouter')),
    field('Réponse attendue (nom)', nameIn, 'Ce que le joueur doit écrire. Pour un son de champion, le nom du champion suffit.'),
    field('Autres réponses acceptées', h('input', { class: 'fa-inp', value: d.aliases.join(', '), placeholder: 'Ex. : Baron, Nashor', oninput: (e) => { d.aliases = e.target.value.split(','); } }), 'Séparées par des virgules.'),
    field('Champion', h('select', { class: 'fa-inp', onchange: (e) => { d.champion = e.target.value; } }, champs.map(([v, l]) => h('option', { value: v, selected: String(d.champion) === v }, l))), 'Choisis un champion pour ajouter ce son à ses sons.'),
    field('Touche', h('select', { class: 'fa-inp', onchange: (e) => { d.slot = Number(e.target.value); } }, [0, 1, 2, 3].map((i) => h('option', { value: i, selected: d.slot === i }, 'QWER'[i])))),
    h('div', { class: 'fa-row fa-sticky' }, h('button', { class: 'fa-btn primary', type: 'button', onclick: publish }, '📤 Publier pour l’équipe')));
}

// ---------- Publication ----------
async function publishLevel(id) {
  const data = drafts().level[id] || (TEAM.levels.find((x) => x.id === id) || {}).data;
  if (!data) return;
  try {
    const item = await FA.signItem(key, 'listen', 'level', id, cleanLevel(data));
    const r = await FA.publish('listen', item);
    if (!r || !r.ok) throw new Error((r && r.error) || 'envoi impossible');
    toast('📤 Envoyé à FIRE Team : publication en cours…'); draw();
    const w = await FA.waitPublish(r.name);
    if (w.ok) { const d = drafts(); delete d.level[id]; saveDrafts(d); toast('✅ Publié : toute l’équipe le reçoit à la prochaine ouverture de FIRE Listen.'); }
    else toast(w.pending ? '⏳ En attente : ouvre FIRE Team sur ce PC (connecté à l’équipe).' : '⚠ ' + (w.error || 'refusé'), true);
    await loadTeam(); draw();
  } catch (e) { toast('⚠ ' + (e.message || e), true); }
}
async function removeItem(kind, it) {
  if (!it.published) { if (!confirm(`Supprimer le brouillon « ${it.data.name} » ?`)) return; const d = drafts(); delete d.level[it.id]; saveDrafts(d); draw(); return; }
  if (!confirm(`Retirer « ${it.data.name} » pour toute l’équipe ?`)) return;
  try {
    const item = await FA.signItem(key, 'listen', kind, it.id, null, true);
    const r = await FA.publish('listen', item);
    if (!r || !r.ok) throw new Error((r && r.error) || 'envoi impossible');
    if (kind === 'level') { const d = drafts(); delete d.level[it.id]; saveDrafts(d); }
    toast('📤 Retrait envoyé à FIRE Team…');
    const w = await FA.waitPublish(r.name);
    toast(w.ok ? '✅ Retiré pour toute l’équipe (au prochain lancement).' : w.pending ? '⏳ En attente : ouvre FIRE Team sur ce PC.' : '⚠ ' + (w.error || 'refusé'), !w.ok);
    await loadTeam(); draw();
  } catch (e) { toast('⚠ ' + (e.message || e), true); }
}
