// FIRE Kiting — menu admin : créer des niveaux, des personnages et des sorts pour toute l'équipe.
// Ouvert avec une clé donnée par le créateur. Les créations restent en brouillon sur ce PC jusqu'à « Publier ».
import * as FA from '../fire-admin.mjs';
import {TEAM, BUILTIN_CHARS, BUILTIN_SPELLS, SHAPES, MODES, FireLevel, cleanLevel, cleanChamp, cleanSpell, loadTeam, levelCard} from './team.mjs';
import {scriptEditor} from './level-editor.mjs';

const {h, toast} = FA;
const DKEY = 'fire.kiting.admin.drafts';
const KIND = {level: 'niveau', champ: 'personnage', spell: 'sort'};
const PREFIX = {level: 'lv_', champ: 'ch_', spell: 'sp_'};
let key = null, tab = 'level', panel = null, editing = null;

function drafts() { try { const d = JSON.parse(localStorage.getItem(DKEY) || '{}'); return {level: d.level || {}, champ: d.champ || {}, spell: d.spell || {}}; } catch { return {level: {}, champ: {}, spell: {}}; } }
function saveDrafts(d) { try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch { toast('Brouillon trop lourd pour être gardé.', true); } }
const teamList = (kind) => TEAM[{level: 'levels', champ: 'champs', spell: 'spells'}[kind]];
// Brouillons + éléments publiés (le brouillon l'emporte : c'est une modification en cours).
function allOf(kind) {
  const d = drafts()[kind], out = new Map();
  for (const it of teamList(kind)) out.set(it.id, {id: it.id, data: it.data, published: true, draft: false, at: it.at});
  for (const [id, data] of Object.entries(d)) out.set(id, {id, data, published: out.has(id), draft: true});
  return [...out.values()];
}
const draftContent = () => ({spells: allOf('spell').map(({id, data}) => ({id, data})), champs: allOf('champ').map(({id, data}) => ({id, data}))});
const nameOf = (kind, id) => { if (kind === 'champ' && BUILTIN_CHARS[id]) return BUILTIN_CHARS[id].name; if (kind === 'spell' && BUILTIN_SPELLS[id]) return BUILTIN_SPELLS[id]; const it = allOf(kind).find((x) => x.id === id); return it ? it.data.name : id; };

export async function openAdmin() {
  key = await FA.myKey('kiting');
  if (key.state === 'revoked') { FA.toast('Ta clé admin a été retirée par le créateur.', true); await FA.clearKey(); }
  if (key.state !== 'ok') { FA.keyScreen('kiting', 'FIRE Kiting', openAdmin); return; }
  panel = FA.modal('🔧 Admin FIRE Kiting', h('div'), {wide: true, onClose: () => { panel = null; }});
  draw();
}

function draw() {
  if (!panel) return;
  const tabs = h('nav', {class: 'fa-tabs'}, Object.entries({level: '🎯 Niveaux', champ: '🧍 Personnages', spell: '☄️ Sorts', key: '🔑 Ma clé'}).map(([k, l]) =>
    h('button', {type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; editing = null; draw(); }}, l)));
  let body;
  if (tab === 'key') body = keyTab();
  else if (editing) body = editor(tab, editing);
  else body = listTab(tab);
  panel.body.replaceChildren(tabs, body);
}

function keyTab() {
  const c = key.cert;
  return h('div', {class: 'fa-sec'},
    h('p', null, 'Clé de ', h('b', null, c.who), ', valable pour ', c.apps.join(' et '), '.'),
    h('p', {class: 'fa-muted'}, 'Tes créations sont signées avec cette clé : tout le monde vérifie qu’elles viennent bien d’un admin. Le créateur peut la retirer à tout moment.'),
    h('p', {class: 'fa-muted'}, 'Pour publier, FIRE Team doit être ouvert sur ce PC (connecté à l’équipe) : c’est lui qui envoie les créations à toute l’équipe.'),
    h('div', {class: 'fa-row'}, h('button', {class: 'fa-btn', type: 'button', onclick: async () => { if (!confirm('Retirer la clé de ce PC ?')) return; await FA.clearKey(); panel.close(); toast('Clé retirée de ce PC.'); }}, 'Retirer la clé de ce PC')));
}

function listTab(kind) {
  const items = allOf(kind);
  const add = h('button', {class: 'fa-btn primary', type: 'button', onclick: () => { editing = {id: FA.uid(PREFIX[kind]), data: defaults(kind), isNew: true}; draw(); }}, '➕ Nouveau ' + KIND[kind]);
  const intro = {
    level: 'Un niveau règle l’exercice, la vitesse et la complexité en %, la durée, la vie et les personnages qui attaquent. Les joueurs le trouvent dans « Niveaux de l’équipe ».',
    champ: 'Un personnage apparaît dans l’Esquive de sorts et lance ses sorts. Ezreal, Ahri, Lux et Blitzcrank existent déjà ; ajoute-en d’autres ici.',
    spell: 'Un sort a une forme (projectile, orbe, grappin, laser, ligne, zone), une couleur, une taille, une vitesse, un avertissement et des dégâts. Donne-le ensuite à un personnage.',
  }[kind];
  const cards = items.map((it) => {
    const tag = it.draft ? (it.published ? '✏️ Modifié, pas encore publié' : '📝 Brouillon') : '✅ Publié';
    const buttons = [
      h('button', {class: 'fa-btn', type: 'button', onclick: () => { editing = {id: it.id, data: JSON.parse(JSON.stringify(it.data)), isNew: false}; draw(); }}, '✏️ Modifier'),
      h('button', {class: 'fa-btn', type: 'button', onclick: () => test(kind, it)}, '▶ Tester'),
      it.draft ? h('button', {class: 'fa-btn primary', type: 'button', onclick: () => publishOne(kind, it.id)}, '📤 Publier') : null,
      h('button', {class: 'fa-btn danger', type: 'button', onclick: () => remove(kind, it)}, it.published ? '🗑️ Retirer de l’équipe' : '🗑️ Supprimer'),
    ];
    if (kind === 'level') { const c = levelCard(it, () => test(kind, it), [buttons[0], buttons[2], buttons[3]]); c.prepend(h('span', {class: 'fa-tag'}, tag)); return c; }
    return h('div', {class: 'fa-card'}, h('span', {class: 'fa-tag'}, tag), h('div', {class: 'fa-card-h'}, kind === 'spell' ? h('i', {class: 'fa-dot', style: `background:${cleanSpell(it.data).color}`}) : null, h('b', null, it.data.name)),
      h('p', {class: 'fa-muted'}, describe(kind, it.data)), h('div', {class: 'fa-row'}, buttons));
  });
  return h('div', {class: 'fa-sec'}, h('p', {class: 'fa-muted'}, intro), h('div', {class: 'fa-row'}, add), h('div', {class: 'fa-list'}, cards.length ? cards : h('p', {class: 'fa-muted'}, 'Rien pour l’instant.')));
}
function describe(kind, d) {
  if (kind === 'spell') { const s = cleanSpell(d); return `${SHAPES[s.behave]} · taille ${s.width} · vitesse ${s.speed} · avertissement ${s.warning} s · dégâts ${s.damage}`; }
  if (kind === 'champ') { const c = cleanChamp(d); return 'Sorts : ' + (c.spells.map((id) => nameOf('spell', id)).join(', ') || 'aucun'); }
  return '';
}
function defaults(kind) {
  if (kind === 'level') return cleanLevel({name: 'Nouveau niveau', mode: 'dodge', casters: ['ezreal', 'ahri', 'lux', 'blitz']});
  if (kind === 'champ') return cleanChamp({name: 'Nouveau personnage', spells: ['mystic']});
  return cleanSpell({name: 'Nouveau sort'});
}

// ---------- Formulaires ----------
const field = (label, input, help) => h('label', {class: 'fa-field'}, h('span', null, label), input, help ? h('small', {class: 'fa-muted'}, help) : null);
function text(d, k, max, ph) { return h('input', {class: 'fa-inp', value: d[k] || '', maxlength: max, placeholder: ph || '', oninput: (e) => { d[k] = e.target.value; }}); }
function range(d, k, min, max, step, unit) {
  const out = h('output', null, d[k] + (unit || ''));
  const inp = h('input', {type: 'range', min, max, step, value: d[k], oninput: (e) => { d[k] = Number(e.target.value); out.textContent = d[k] + (unit || ''); }});
  return h('span', {class: 'fa-range'}, inp, out);
}
function select(d, k, opts, onchange) { return h('select', {class: 'fa-inp', onchange: (e) => { d[k] = e.target.value; onchange && onchange(); }}, Object.entries(opts).map(([v, l]) => h('option', {value: v, selected: String(d[k]) === String(v)}, l))); }
function check(d, k, label) { return h('label', {class: 'fa-check'}, h('input', {type: 'checkbox', checked: !!d[k], onchange: (e) => { d[k] = e.target.checked; }}), label); }
function colorIn(d, k) { return h('input', {type: 'color', value: d[k], oninput: (e) => { d[k] = e.target.value; }}); }
function multi(list, selected, onToggle) {
  return h('div', {class: 'fa-chips'}, list.map(([id, label]) => h('button', {type: 'button', class: 'fa-chip' + (selected.includes(id) ? ' on' : ''), 'aria-pressed': String(selected.includes(id)),
    onclick: (e) => { onToggle(id); e.currentTarget.classList.toggle('on'); e.currentTarget.setAttribute('aria-pressed', String(e.currentTarget.classList.contains('on'))); }}, label)));
}
const toggle = (arr, id) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); };

function editor(kind, ed) {
  const d = ed.data;
  let form;
  if (kind === 'level') {
    const casters = [...Object.entries(BUILTIN_CHARS).map(([id, c]) => [id, c.name]), ...allOf('champ').map((it) => [it.id, it.data.name + (it.published ? '' : ' (brouillon)')])];
    const spellList = [...Object.entries(BUILTIN_SPELLS), ...allOf('spell').map((it) => [it.id, it.data.name + (it.published ? '' : ' (brouillon)')])];
    const spellsOf = (id) => (BUILTIN_CHARS[id] ? BUILTIN_CHARS[id].spells : ((allOf('champ').find((x) => x.id === id) || {}).data || {}).spells || []).filter((sid) => spellList.some(([x]) => x === sid));
    // Les sorts et personnages en brouillon doivent exister dans le jeu pour s'afficher sur la carte.
    try { FireLevel.prepare(draftContent()); } catch { /* */ }
    const pick = field('Personnages qui attaquent', multi(casters, d.casters, (id) => toggle(d.casters, id)), 'Chacun lance ses propres sorts, au hasard, selon la complexité.');
    const cx = field('Complexité', range(d, 'complexityPct', 25, 400, 5, ' %'), 'Fréquence des sorts (plusieurs à la fois au-delà de 150 %), nombre et dégâts des ennemis.');
    const scen = h('div', {class: 'le-host'});
    let built = false;
    const showScript = () => {
      const sc = !!d.scripted;
      if (sc && !built) { scen.replaceChildren(scriptEditor(d, {casters, spells: spellList, spellsOf, onChange: showScript})); built = true; }
      scen.hidden = !sc;
      pick.hidden = sc && !d.random; cx.hidden = sc && !d.random && d.mode === 'dodge';
    };
    const how = field('Comment arrivent les sorts ?', h('select', {class: 'fa-inp', onchange: (e) => { d.scripted = e.target.value === 'script'; showScript(); }},
        h('option', {value: 'random', selected: !d.scripted}, 'Au hasard : les personnages choisis tirent sur toi'),
        h('option', {value: 'script', selected: !!d.scripted}, 'Scénario : je place chaque ennemi, son sort et sa direction')),
      'En scénario, tu poses tout sur la carte : position, sort, direction et seconde de lancement.');
    const dodgeOnly = h('div', null, how, scen, pick, check(d, 'flash', 'Flash autorisé (F)'));
    const kitingOnly = h('div', null, field('Ennemis (avant complexité)', range(d, 'enemies', 1, 32, 1)));
    const showMode = () => { dodgeOnly.hidden = d.mode !== 'dodge'; kitingOnly.hidden = d.mode === 'dodge'; showScript(); };
    form = [field('Nom', text(d, 'name', 40)), field('Description', text(d, 'desc', 200, 'Ex. : Lux et Ahri rapides, sans Flash')),
      field('Exercice', select(d, 'mode', MODES, showMode)),
      field('Vitesse', range(d, 'speedPct', 25, 400, 5, ' %'), 'Vitesse des sorts et des ennemis. 100 % = normal. Plus c’est rapide, plus l’avertissement est court.'),
      cx,
      field('Durée', select(d, 'duration', {0: 'Libre', 30: '30 s', 60: '60 s', 90: '90 s', 120: '2 min', 180: '3 min', 300: '5 min'})),
      field('Vie du joueur', range(d, 'hp', 50, 1000, 25)), dodgeOnly, kitingOnly];
    showMode();
  } else if (kind === 'champ') {
    const spells = [...Object.entries(BUILTIN_SPELLS), ...allOf('spell').map((it) => [it.id, it.data.name + (it.published ? '' : ' (brouillon)')])];
    const st = d.style, c = d.colors;
    form = [field('Nom', text(d, 'name', 22, 'Ex. : Morgana')), field('Étiquette', text(d, 'tag', 12, 'Ex. : Q / R'), 'Affichée à côté du nom, au-dessus du personnage.'),
      field('Sorts lancés', multi(spells, d.spells, (id) => toggle(d.spells, id)), 'Crée de nouveaux sorts dans l’onglet Sorts.'),
      h('div', {class: 'fa-grid'}, field('Peau', colorIn(c, 'skin')), field('Tenue', colorIn(c, 'outfit')), field('Cheveux / fourrure', colorIn(c, 'hair')), field('Accessoires', colorIn(c, 'accent')), field('Lueur', colorIn(c, 'glow'))),
      h('div', {class: 'fa-grid'}, field('Coiffure', select(st, 'hair', {short: 'Courte', long: 'Longue', none: 'Aucune'})),
        field('Arme', select(st, 'weapon', {none: 'Aucune', staff: 'Bâton', sword: 'Épée', bow: 'Arc', gauntlet: 'Gantelet', orb: 'Orbe'})),
        field('Queues', range(st, 'tails', 0, 9, 1)), field('Taille', range(st, 'size', 70, 160, 5, ' %'))),
      h('div', {class: 'fa-chips'}, check(st, 'ears', 'Oreilles'), check(st, 'horns', 'Cornes'), check(st, 'cape', 'Cape'), check(st, 'robe', 'Robe'), check(st, 'bulky', 'Carrure massive'))];
  } else {
    form = [field('Nom', text(d, 'name', 30, 'Ex. : Liens noirs')), field('Forme', select(d, 'behave', SHAPES)), field('Couleur', colorIn(d, 'color')),
      field('Taille', range(d, 'width', 6, 160, 2), 'Largeur du projectile, du laser ou rayon de la zone.'),
      field('Vitesse', range(d, 'speed', 120, 1200, 10), 'Pour les projectiles, orbes et grappins.'),
      field('Avertissement', range(d, 'warning', .2, 3, .05, ' s'), 'Temps entre l’annonce et le sort.'),
      field('Durée', range(d, 'life', .2, 6, .05, ' s'), 'Durée de vie du sort une fois lancé.'),
      field('Dégâts', range(d, 'damage', 5, 150, 1))];
  }
  const keep = () => { const all = drafts(); all[kind][ed.id] = {level: cleanLevel, champ: cleanChamp, spell: cleanSpell}[kind](d); saveDrafts(all); return all[kind][ed.id]; };
  return h('div', {class: 'fa-sec'},
    h('p', null, h('button', {class: 'fa-link', type: 'button', onclick: () => { editing = null; draw(); }}, '← Retour'), ' ', h('b', null, (ed.isNew ? 'Nouveau ' : 'Modifier le ') + KIND[kind])),
    ...form,
    h('div', {class: 'fa-row fa-sticky'},
      h('button', {class: 'fa-btn', type: 'button', onclick: () => { keep(); editing = null; draw(); toast('Brouillon enregistré sur ce PC.'); }}, '💾 Enregistrer le brouillon'),
      h('button', {class: 'fa-btn', type: 'button', onclick: () => { const data = keep(); test(kind, {id: ed.id, data}); }}, '▶ Tester'),
      h('button', {class: 'fa-btn primary', type: 'button', onclick: () => { keep(); editing = null; publishOne(kind, ed.id); }}, '📤 Publier pour l’équipe')));
}

// ---------- Essai ----------
function test(kind, it) {
  let level;
  if (kind === 'level') level = {id: 'essai', data: it.data};
  else if (kind === 'champ') level = {id: 'essai', data: {name: 'Essai : ' + it.data.name, mode: 'dodge', casters: [it.id], duration: 60}};
  else {
    const dc = draftContent();
    dc.champs.push({id: 'ch_essai', data: {name: 'Mannequin', tag: it.data.name, spells: [it.id], style: {weapon: 'orb'}}});
    if (!dc.spells.some((s) => s.id === it.id)) dc.spells.push({id: it.id, data: it.data});
    panel && panel.close();
    FireLevel.play({id: 'essai', data: {name: 'Essai : ' + it.data.name, mode: 'dodge', casters: ['ch_essai'], duration: 60}}, dc);
    return;
  }
  panel && panel.close();
  FireLevel.play(level, draftContent());
}

// ---------- Publication ----------
async function send(kind, id, data, del) {
  const item = await FA.signItem(key, 'kiting', kind, id, data, del);
  const r = await FA.publish('kiting', item);
  if (!r || !r.ok) throw new Error((r && r.error) || 'envoi impossible');
  return r.name;
}
async function publishOne(kind, id) {
  const all = drafts();
  const data = all[kind][id] || (teamList(kind).find((x) => x.id === id) || {}).data;
  if (!data) return;
  // Un niveau ou un personnage publie aussi les brouillons dont il a besoin.
  const queue = [];
  const needSpell = (sid) => { if (all.spell[sid] && !queue.some((q) => q.id === sid)) queue.push({kind: 'spell', id: sid, data: all.spell[sid]}); };
  const needChamp = (cid) => { if (all.champ[cid] && !queue.some((q) => q.id === cid)) { for (const s of all.champ[cid].spells || []) needSpell(s); queue.push({kind: 'champ', id: cid, data: all.champ[cid]}); } };
  if (kind === 'level') { for (const c of data.casters || []) needChamp(c); for (const e of (data.scripted && data.script) || []) { needChamp(e.c); needSpell(e.s); } }
  if (kind === 'champ') for (const s of data.spells || []) needSpell(s);
  if (!queue.some((q) => q.id === id)) queue.push({kind, id, data});
  try {
    const names = [];
    for (const q of queue) names.push({q, name: await send(q.kind, q.id, q.data, false)});
    toast(`📤 Envoyé à FIRE Team (${queue.length} élément${queue.length > 1 ? 's' : ''}) : publication en cours…`);
    draw();
    let okAll = true, pending = false;
    for (const {q, name} of names) {
      const r = await FA.waitPublish(name);
      if (r.ok) { const d = drafts(); delete d[q.kind][q.id]; saveDrafts(d); }
      else { okAll = false; if (r.pending) pending = true; else toast(`⚠ ${q.data.name} : ${r.error || 'refusé'}`, true); }
    }
    if (pending) toast('⏳ En attente : ouvre FIRE Team sur ce PC (connecté à l’équipe) pour envoyer la publication.', true);
    if (okAll) toast('✅ Publié : toute l’équipe le reçoit à la prochaine ouverture de FIRE Kiting.');
    await loadTeam(); draw();
  } catch (e) { toast('⚠ ' + (e.message || e), true); }
}
async function remove(kind, it) {
  if (!it.published) { if (!confirm(`Supprimer le brouillon « ${it.data.name} » ?`)) return; const d = drafts(); delete d[kind][it.id]; saveDrafts(d); draw(); return; }
  if (!confirm(`Retirer « ${it.data.name} » pour toute l’équipe ?`)) return;
  try {
    const name = await send(kind, it.id, null, true);
    const d = drafts(); delete d[kind][it.id]; saveDrafts(d);
    toast('📤 Retrait envoyé à FIRE Team…');
    const r = await FA.waitPublish(name);
    toast(r.ok ? '✅ Retiré pour toute l’équipe.' : r.pending ? '⏳ En attente : ouvre FIRE Team sur ce PC.' : '⚠ ' + (r.error || 'refusé'), !r.ok);
    await loadTeam(); draw();
  } catch (e) { toast('⚠ ' + (e.message || e), true); }
}
