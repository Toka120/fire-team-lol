// FIRE Launcher : interface.
(() => {
  const fl = window.fl;
  const $ = (id) => document.getElementById(id);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  const svg = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = d; return s; };
  const ICO = {
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    repair: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    notes: '<path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  };

  // Les apps du launcher. FIRE Team = l'ancienne FIRE LoL.
  const APPS = {
    team: { name: 'FIRE Team', icon: 'assets/fire-cut.png', tile: 'assets/team.png', tag: 'L’app de l’équipe : stats, draft, vocal, planning, coaching et boutique.' },
    kiting: { name: 'FIRE Kiting', icon: 'assets/kiting.png', round: true, tag: 'Kiting et Dodge 3D sur la vraie image du mid : attaque-déplacement, esquive de sorts et Flash.',
      feat: ['🌀', 'Dodge 3D', 'Ezreal, Ahri, Lux et Blitzcrank lancent leurs sorts en 3D : esquive, garde ton Flash (F) et tiens jusqu’au bout. Les admins ajoutent d’autres personnages et des niveaux.'],
      news: [
        ['🎯', 'Niveaux de l’équipe', 'Des niveaux créés par les admins : vitesse et complexité en %, personnages choisis, avec ou sans Flash. Onglet « Niveaux de l’équipe ».', 'NOUVEAU'],
        ['🌀', 'Dodge 3D', 'Projectiles, orbes aller-retour, grappin, laser et zones au sol, sur la midlane. F pour le Flash (15 s de recharge).', 'MODE'],
        ['⌨️', 'Tes propres touches', 'Section Touches : clique un raccourci puis presse la nouvelle touche. Préréglage Q + clic gauche et touche du Flash.', 'RÉGLAGES'],
      ] },
    listen: { name: 'FIRE Listen', icon: 'assets/listen.png', round: true, tag: 'Apprends à reconnaître les sons du jeu : quiz sonore, Atelier audio et niveaux de l’équipe.',
      feat: ['🎛️', 'Atelier audio', 'Compare les sons entre eux pour ne plus jamais confondre un sort, une ulti ou un pas dans les buissons.'],
      news: [
        ['🎧', 'Quiz sonore', 'Un son du jeu, à toi de retrouver d’où il vient. Parfait pour réagir plus vite en partie.', 'MODE'],
        ['🎛️', 'Atelier audio', 'Écoute et compare les sons côte à côte pour bien les distinguer.', 'MODE'],
        ['🎯', 'Niveaux de l’équipe', 'Des quiz créés par les admins : touches, vies, chrono, sons coupés, et de nouveaux sons ajoutés pour l’équipe.', 'NOUVEAU'],
      ] },
  };
  const IDS = ['team', 'kiting', 'listen'];

  let cur = 'team';
  let ST = { apps: {} };
  const PROG = {};
  let PN = null;
  let PREFS = { onPlay: 'min', autostart: false };

  // ---------- Barre des apps ----------
  function renderRail() {
    const r = $('rail');
    r.replaceChildren(
      h('div', { class: 'r-logo' }, h('img', { src: 'assets/fire-cut.png', alt: 'FIRE' })),
      ...IDS.map((id) => {
        const a = APPS[id], s = ST.apps[id] || {};
        const dot = (s.update || (!s.installed && s.available)) ? 'new' : s.running ? 'run' : '';
        return h('button', { class: 'r-it' + (cur === id ? ' on' : ''), 'aria-label': a.name, onclick: () => pick(id) },
          h('img', { src: a.tile || a.icon, alt: '' }), dot ? h('span', { class: 'dot ' + dot }) : null, h('span', { class: 'r-tip' }, a.name));
      }),
      h('div', { class: 'r-sp' }),
      ST.admin && ST.admin.on ? h('button', { class: 'r-it r-admin', 'aria-label': 'Mode admin', onclick: () => adminModal() }, h('span', { class: 'r-ico' }, '🛠️'),
        ST.admin.pending ? h('span', { class: 'dot new' }) : null, h('span', { class: 'r-tip' }, 'Mode admin (ce PC)')) : null,
    );
  }
  function pick(id) {
    if (cur === id) return;
    cur = id; document.body.dataset.app = id;
    fl.prefs.set({ last: id });
    renderRail(); renderArt(); render();
  }

  // ---------- Visuels ----------
  function renderArt() {
    const a = APPS[cur], art = $('art');
    if (cur === 'team') art.replaceChildren(h('img', { class: 'big', src: 'assets/fire-cut.png', alt: '' }));
    if (cur === 'kiting') {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 800 800'); s.setAttribute('class', 'rings');
      s.innerHTML = '<g class="spin"><circle cx="400" cy="400" r="340" stroke-width="2" stroke-dasharray="6 14"/><circle cx="400" cy="400" r="260" stroke-width="1.5"/></g>'
        + '<g class="spin2"><circle cx="400" cy="400" r="190" stroke-width="10" stroke-dasharray="90 60" opacity=".6"/></g>'
        + '<path d="M400 20v160M400 620v160M20 400h160M620 400h160" stroke-width="6" opacity=".8"/>';
      art.replaceChildren(s, h('img', { class: 'big round', src: a.icon, alt: '', style: 'width:min(300px,26vw);right:calc(min(760px,62vw)/2 - min(300px,26vw)/2)' }),
        h('i', { class: 'target', style: 'right:22%;top:24%' }), h('i', { class: 'target', style: 'right:52%;top:62%;animation-delay:-2s' }), h('i', { class: 'target', style: 'right:12%;top:70%;animation-delay:-4s' }));
    }
    if (cur === 'listen') {
      art.replaceChildren(h('img', { class: 'big round', src: a.icon, alt: '', style: 'width:min(380px,32vw)' }),
        h('div', { class: 'eq' }, Array.from({ length: 32 }, (_, i) => h('i', { style: `animation-delay:${(-Math.random() * 1.2).toFixed(2)}s;animation-duration:${(0.8 + Math.random() * 0.9).toFixed(2)}s` }))));
    }
  }
  // Braises qui montent (couleur de l'app).
  const cv = $('fx'), cx = cv.getContext('2d');
  const parts = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.2, v: 0.0006 + Math.random() * 0.0016, w: Math.random() * 6.28 }));
  function fx() {
    if (!document.hidden) {
      const W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight;
      const c = getComputedStyle(document.body).getPropertyValue('--acrgb').trim().split(/\s+/).join(',');
      cx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y -= p.v; p.w += 0.02; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        const a = Math.min(1, (1 - p.y) * 1.4) * 0.8;
        cx.beginPath(); cx.fillStyle = `rgba(${c},${a.toFixed(2)})`; cx.shadowColor = `rgb(${c})`; cx.shadowBlur = 8;
        cx.arc((p.x + Math.sin(p.w) * 0.01) * W, p.y * H, p.r, 0, 6.28); cx.fill();
      }
    }
    requestAnimationFrame(fx);
  }

  // ---------- Contenu ----------
  const dateFr = (d) => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  function emojiFor(t) {
    const s = String(t || '').toLowerCase();
    const R = [[/launcher|mise à jour|mises à jour/, '🚀'], [/boutique|article|cosm/, '🛍️'], [/admin/, '🛠️'], [/téléphone|mobile/, '📱'], [/vocal|micro|son/, '🎙️'], [/draft|counter|synerg/, '⚡'],
      [/compagnon|chibi|pet/, '🐾'], [/clip|vidéo|partage d’écran|écran/, '🎬'], [/planning|agenda/, '📅'], [/stat/, '📊'], [/puzzle/, '🧩'], [/accueil|widget/, '🏠'], [/bug|correct/, '🩹']];
    for (const [re, e] of R) if (re.test(s)) return e;
    return '🔥';
  }
  function btnState(id) {
    const s = ST.apps[id] || {}, p = PROG[id];
    if (p) return { label: p.label || 'Patiente…', busy: true, pct: p.pct };
    if (!s.available) return { label: 'Bientôt', dis: true };
    if (!s.installed) return { label: 'Installer', up: true };
    if (s.update) return { label: 'Mettre à jour et jouer', up: true };
    if (s.running) return id === 'team' ? { label: 'Afficher' } : { label: 'Déjà ouvert', dis: true };
    return { label: 'Jouer' };
  }
  function statusOf(id) {
    const s = ST.apps[id] || {};
    if (!s.available) return ['', 'Pas encore disponible'];
    if (s.installed && s.update) return ['up', 'Mise à jour disponible' + (id === 'team' && s.latest ? ' : v' + s.latest : '') + (s.running ? ' (sera fermé puis relancé)' : '')];
    if (s.running) return ['run', 'Ouvert'];
    if (!s.installed) return ['', 'Non installé' + (s.size ? ' · ' + (s.size / 1048576).toFixed(0) + ' Mo' : '')];
    if (s.update) return ['up', 'Mise à jour disponible' + (id === 'team' && s.latest ? ' : v' + s.latest : '')];
    return ['ok', 'À jour'];
  }
  function verOf(id) {
    const s = ST.apps[id] || {};
    if (id === 'team') return s.version ? 'v' + s.version : s.latest ? 'v' + s.latest : 'FIRE Team';
    const v = s.version || s.latest;
    return v ? 'Version ' + v : APPS[id].name;
  }

  async function play(id, opts) {
    if (PROG[id]) return;
    PROG[id] = { label: 'Patiente…', pct: null, text: '' }; render();
    const r = await fl.play(id, opts).catch((e) => ({ ok: false, error: String(e) }));
    delete PROG[id];
    if (!r || !r.ok) toast('Oups', (r && r.error ? r.error.charAt(0).toUpperCase() + r.error.slice(1) : 'Ça n’a pas marché') + '.', true);
    else if (r.updated) toast('À jour ✓', `${APPS[id].name} vient d’être mis à jour, puis lancé.`);
    await refresh();
  }

  function render() {
    const id = cur, a = APPS[id], s = ST.apps[id] || {}, b = btnState(id), [sc, stxt] = statusOf(id), p = PROG[id];
    const go = h('button', { class: 'go' + (b.up ? ' up' : '') + (b.busy ? ' busy' : ''), disabled: b.dis || b.busy, onclick: () => play(id) },
      b.busy ? h('i', { class: 'fill' + (p && p.pct == null ? ' ind' : ''), style: p && p.pct != null ? `width:${p.pct}%` : '' }) : null, h('span', null, b.label));
    const ib = (ico, tip, fn) => h('button', { class: 'ib', 'data-tip': tip, 'aria-label': tip, onclick: fn }, svg(ICO[ico]));
    const btns = [];
    if (s.installed) btns.push(ib('folder', 'Ouvrir le dossier', () => fl.folder(id)));
    if (s.installed && !s.running) btns.push(ib('repair', 'Réparer (réinstaller)', () => { if (confirm(`Réinstaller ${a.name} depuis la dernière version ?`)) play(id, { repair: true }); }));
    if (s.installed && id !== 'team') btns.push(ib('trash', 'Désinstaller', async () => {
      if (!confirm(`Désinstaller ${a.name} ? Tes records et réglages ne sont pas effacés.`)) return;
      const r = await fl.uninstall(id); if (!r.ok) toast('Impossible', r.error || 'Désinstallation impossible.', true); refresh();
    }));
    if (id === 'team') btns.push(ib('notes', 'Nouveautés', () => newsModal()));
    else btns.push(ib('info', 'À propos', () => aboutModal(id)));

    const play_ = h('div', { class: 'card play' },
      h('span', { class: 'vpill' }, verOf(id)),
      h('img', { class: 'logo' + (a.round ? ' round' : ''), src: a.icon, alt: '' }),
      h('h1', null, a.name.replace('FIRE ', '')),
      h('div', { class: 'tag' }, a.tag),
      h('div', { class: 'status ' + sc }, ST.admin && ST.admin.on && id !== 'team' ? h('button', { class: 'adm-pill' + (ST.admin.keys[id] ? '' : ' warn'), title: ST.admin.keys[id] ? 'Mode admin : le bouton 🔧 Admin de l’app s’ouvre directement' : 'Mode admin : ta clé n’est pas encore posée', onclick: () => adminModal() }, ST.admin.keys[id] ? '🛠️ Admin' : '⚠ Admin') : null, h('i'), stxt),
      go,
      h('div', { class: 'ptxt' }, p ? p.text : ''),
      h('div', { class: 'ibtns' }, btns));

    let feat;
    if (id === 'team') {
      const v = (PN || [])[0];
      feat = h('div', { class: 'card feat' }, h('span', { class: 'ribbon' }, 'NOUVEAU !'),
        h('div', { class: 'emb' }, emojiFor(v ? v.titre + ' ' + (v.notes || []).join(' ') : '')),
        h('h2', null, v ? v.titre : 'Les nouveautés de FIRE Team'),
        h('p', null, v ? `Version ${v.version} · ${dateFr(v.date)}` : 'Chargement…'),
        h('button', { class: 'wbtn', onclick: () => newsModal() }, 'Voir les nouveautés'));
    } else {
      const [e, t, d] = a.feat;
      feat = h('div', { class: 'card feat' }, h('span', { class: 'ribbon' }, 'À ESSAYER'), h('div', { class: 'emb' }, e), h('h2', null, t), h('p', null, d),
        h('button', { class: 'wbtn', disabled: !s.available, onclick: () => play(id) }, s.installed ? 'Jouer' : 'Installer'));
    }

    let cards;
    if (id === 'team') {
      cards = (PN || []).slice(0, 3).map((v) => h('button', { class: 'nc', onclick: () => newsModal(v.version) },
        h('div', { class: 'nt' }, v.titre), h('div', { class: 'nx' }, (v.notes || [])[0] || ''), h('div', { class: 'ni' }, h('span', null, emojiFor(v.titre + ' ' + (v.notes || []).join(' ')))),
        h('div', { class: 'nf' }, 'MAJ ', h('em', null, `v${v.version} · ${dateFr(v.date)}`))));
      if (!cards.length) cards = [h('div', { class: 'nc' }, h('div', { class: 'nt' }, 'Chargement des actus…'), h('div', { class: 'ni' }, h('span', null, '🔥')))];
    } else {
      cards = a.news.map(([e, t, d, k]) => h('div', { class: 'nc' }, h('div', { class: 'nt' }, t), h('div', { class: 'nx' }, d), h('div', { class: 'ni' }, h('span', null, e)), h('div', { class: 'nf' }, k)));
    }
    const news = h('div', { class: 'card news' },
      h('div', { class: 'news-h' }, h('b', null, id === 'team' ? 'Actus FIRE Team' : 'À savoir'), id === 'team' ? h('button', { onclick: () => newsModal() }, '+ d’actus') : h('button', { onclick: () => aboutModal(id) }, '+ d’infos')),
      h('div', { class: 'ncards' }, cards));
    $('content').replaceChildren(play_, feat, news);
  }

  // ---------- Fenêtres ----------
  function modal(...kids) {
    const m = $('modal');
    const close = () => { m.hidden = true; m.replaceChildren(); };
    m.replaceChildren(h('div', { class: 'mbox', role: 'dialog' }, h('button', { class: 'x', 'aria-label': 'Fermer', onclick: close }, '×'), ...kids));
    m.hidden = false;
    m.onclick = (e) => { if (e.target === m) close(); };
  }
  function newsModal(focus) {
    modal(h('h2', null, 'Nouveautés de FIRE Team'), (PN || []).map((v) => h('div', { class: 'pn', id: 'pn-' + v.version },
      h('h3', null, v.titre, h('small', null, `v${v.version} · ${dateFr(v.date)}`)), h('ul', null, (v.notes || []).map((n) => h('li', null, n))))));
    if (focus) { const el = document.getElementById('pn-' + focus); if (el) el.scrollIntoView(); }
  }
  function aboutModal(id) {
    const a = APPS[id];
    modal(h('h2', null, a.name), h('p', { style: 'color:var(--mute)' }, a.tag),
      a.news.map(([e, t, d]) => h('div', { class: 'pn' }, h('h3', null, e + ' ' + t), h('p', { style: 'margin:0;color:#fffd' }, d))),
      h('div', { class: 'pn' }, h('h3', null, '💻 Configuration'), h('p', { style: 'margin:0;color:#fffd' }, 'Windows 64 bits et Microsoft Edge WebView2 (déjà présent sur Windows 10 et 11). Pas besoin du client League. Tes réglages et records restent sur ton PC, même après une mise à jour.')));
  }
  // ---------- Mode admin (PC du créateur) ----------
  function adminModal() {
    const A = ST.admin || {};
    if (!A.on) return;
    const row = (title, text, btn) => h('div', { class: 'set-row' }, h('div', null, h('b', null, title), h('p', null, text)), btn || null);
    const keyRow = (id) => row(APPS[id].name, A.keys[id] ? '✅ Ta clé de créateur est posée : dans l’app, clique 🔧 Admin, le menu s’ouvre sans rien coller.'
      : '⚠ Ta clé n’est pas posée. Lance FIRE Team une fois : il la pose tout seul dans Kiting et Listen (ou Admin › Clés des apps › Recréer et reposer ma clé).',
      A.keys[id] ? h('button', { class: 'gbtn', onclick: () => { $('modal').hidden = true; play(id); } }, 'Lancer') : h('button', { class: 'gbtn', onclick: () => { $('modal').hidden = true; play('team'); } }, 'Lancer FIRE Team'));
    modal(h('h2', null, '🛠️ Mode admin'), h('p', { style: 'color:var(--mute);margin-top:-6px' }, 'Visible seulement sur ton PC, là où se trouve ta clé de créateur.'),
      keyRow('kiting'), keyRow('listen'),
      row('🔑 Clés pour l’équipe', 'Donne le menu admin de Kiting ou Listen à quelqu’un : FIRE Team s’ouvre directement sur Admin › Clés des apps.',
        h('button', { class: 'gbtn', onclick: async () => { const r = await fl.admin.keys(); if (r && r.ok) { $('modal').hidden = true; toast('FIRE Team s’ouvre', 'Sur Admin › Clés des apps.'); } else if (r && r.update) { $('modal').hidden = true; cur !== 'team' && pick('team'); toast('Mise à jour d’abord', r.error, true); } else toast('Impossible', (r && r.error) || 'FIRE Team introuvable', true); } }, 'Ouvrir')),
      row('📤 Publications en attente', A.pending ? (A.pending === 1 ? '1 création (niveau, son ou personnage) faite dans Kiting ou Listen attend FIRE Team pour partir chez l’équipe : ouvre FIRE Team.' : `${A.pending} créations (niveaux, sons ou personnages) faites dans Kiting ou Listen attendent FIRE Team pour partir chez l’équipe : ouvre FIRE Team.`) : 'Rien en attente : tout ce que tu as créé dans Kiting et Listen est parti chez l’équipe.',
        h('button', { class: 'gbtn', onclick: () => fl.admin.outbox() }, 'Dossier')),
      row('📦 Versions', `FIRE Team ${verOf('team')} · Kiting ${verOf('kiting')} · Listen ${verOf('listen')} · Launcher ${ST.launcher || '?'}`));
  }
  async function settingsModal() {
    PREFS = await fl.prefs.get();
    const seg = (k, opts) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { class: PREFS[k] === v ? 'on' : '', onclick: async () => { PREFS = { ...PREFS, ...(await fl.prefs.set({ [k]: v })) }; settingsModal(); } }, l)));
    modal(h('h2', null, 'Réglages du launcher'),
      h('div', { class: 'set-row' }, h('div', null, h('b', null, 'Quand une app se lance'), h('p', null, 'Ce que fait le launcher une fois l’app ouverte.')),
        seg('onPlay', [['min', 'Se réduire'], ['stay', 'Rester ouvert'], ['close', 'Se fermer']])),
      PREFS.store ? null : h('div', { class: 'set-row' }, h('div', null, h('b', null, 'Démarrer avec Windows'), h('p', null, 'Le launcher s’ouvre réduit au démarrage du PC et prépare les mises à jour.')),
        h('button', { class: 'sw' + (PREFS.autostart ? ' on' : ''), 'aria-pressed': String(!!PREFS.autostart), onclick: async () => { PREFS = { ...PREFS, ...(await fl.prefs.set({ autostart: !PREFS.autostart })) }; settingsModal(); } })),
      h('div', { class: 'set-row' }, h('div', null, h('b', null, 'FIRE Launcher'), h('p', null, `Version ${PREFS.version || '?'} · ` + (PREFS.store ? 'mis à jour par le Microsoft Store.' : 'se met à jour tout seul.'))),
        h('button', { class: 'gbtn', onclick: () => fl.open('https://github.com/Toka120/fire-team-lol/releases/download/launcher/FIRE-Launcher-Setup.exe') }, 'Lien de téléchargement')));
  }
  function toast(title, text, err, btn) {
    const t = h('div', { class: 'toast' + (err ? ' err' : '') }, h('button', { class: 'x', 'aria-label': 'Fermer', onclick: () => t.remove() }, '×'), h('b', null, title), h('p', null, text), btn || null);
    $('toasts').append(t);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    if (!btn) setTimeout(() => t.remove(), 9000);
    return t;
  }

  // ---------- Données ----------
  let refreshing = false;
  async function refresh() {
    if (refreshing) return; refreshing = true;
    try { ST = await fl.state(); } catch (e) { /* */ } finally { refreshing = false; }
    renderRail(); render();
  }
  fl.onProgress((m) => {
    if (!m || !m.id) return;
    if (m.done) return;
    const t = String(m.text || '');
    const label = /^Installation/.test(t) ? 'Installation…' : /^Lancement/.test(t) ? 'Lancement…' : /^Vérification/.test(t) ? 'Vérification…' : m.pct != null ? `${/^Mise à jour/.test(t) ? 'Mise à jour' : 'Téléchargement'} ${Math.round(m.pct)} %` : 'Téléchargement…';
    PROG[m.id] = { text: t, pct: m.pct, label };
    if (m.id === cur) render();
  });
  fl.onSelf((m) => {
    const box = $('top-mid');
    if (m.state === 'progress') box.replaceChildren(h('span', { class: 'self' }, `⬇ Mise à jour du launcher… ${m.pct || 0} %`));
    else if (m.state === 'ready') { box.replaceChildren(h('span', { class: 'self' }, `✓ Launcher ${m.version} prêt`, h('button', { onclick: () => fl.selfInstall() }, 'Redémarrer'))); toast('Launcher à jour', 'Le launcher redémarre tout seul dans un instant pour finir sa mise à jour.'); }
    else box.replaceChildren();
  });
  fl.onWin(() => {});
  $('w-min').onclick = () => fl.win.min();
  $('w-max').onclick = () => fl.win.max();
  $('w-close').onclick = () => fl.win.close();
  $('b-set').onclick = () => settingsModal();
  window.addEventListener('focus', () => { if (!Object.keys(PROG).length) refresh(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('modal').hidden) { $('modal').hidden = true; $('modal').replaceChildren(); } });

  (async () => {
    try { PREFS = await fl.prefs.get(); } catch (e) { /* */ }
    cur = IDS.includes(PREFS.last) ? PREFS.last : 'team';
    document.body.dataset.app = cur;
    renderRail(); renderArt(); render(); fx();
    await refresh();
    fl.patchnotes().then((p) => { PN = (p || []).map((x) => ({ ...x, version: x.version || x.v, notes: x.notes || (x.items || []).map((i) => (Array.isArray(i) ? i[1] : i)) })); if (cur === 'team') render(); }).catch(() => {});
    setInterval(() => { if (!document.hidden && !Object.keys(PROG).length) refresh(); }, 6000);
  })();
})();
