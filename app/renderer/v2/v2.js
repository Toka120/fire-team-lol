// FIRE V2 — la nouvelle interface (active par défaut ; l'ancienne reste disponible dans Paramètres).
// Avec l'ancienne interface, ce fichier ne change rien. Avec : classe html.v2, barre latérale à gauche,
// icônes Lucide (icons.json) à la place des emojis « système ». Les données restent intactes.
(function () {
  'use strict';
  // V2 pour tout le monde depuis la 1.10.76 ; chacun peut revenir à l'ancienne interface dans Paramètres.
  let on = true;
  try { on = JSON.parse(localStorage.getItem('fire.ui.v1')) !== true; } catch (e) { on = true; }
  const LUC = window.FIRE_LUCIDE || {};
  const DICT = window.FIRE_ICONS || {};
  const SVGNS = 'http://www.w3.org/2000/svg';

  // Nom d'icône : « Library », ou une entrée du dictionnaire « navigation.POOL », ou un alias.
  function resolve(name) {
    if (!name) return null;
    if (LUC[name]) return name;
    const al = DICT.aliases && DICT.aliases[name];
    const ref = al || name;
    const [g, ...rest] = String(ref).split('.');
    const v = DICT[g] && DICT[g][rest.join('.')];
    return v && LUC[v] ? v : null;
  }
  function icon(name, cls) {
    const n = resolve(name);
    if (!n) return null;
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'v2i' + (cls ? ' ' + cls : ''));
    s.dataset.i = n;
    s.innerHTML = LUC[n];
    return s;
  }

  // Rubriques : identifiant FIRE -> libellé du dictionnaire (et donc son icône).
  const NAV = {
    stats: 'Stats des joueurs', pool: 'POOL', planning: 'Planning', draft: 'Draft', train: 'Micro', jeux: 'Détente',
    guides: 'Lanes et principes', coach: 'Parole du coach', worlds: 'E-sport', lolpatch: 'Patchs LoL', chat: 'Discussion', vocal: 'Vocal', carnet: 'Carnet de bord', clips: 'Clips',
    patch: 'Patch notes', settings: 'Paramètres',
  };
  const GROUPS = [['Équipe', ['stats', 'pool', 'planning']], ['Jeu', ['draft', 'train', 'jeux', 'clips']],
    ['Apprendre', ['guides', 'coach', 'worlds', 'lolpatch']], ['Social', ['chat', 'vocal']], [null, ['carnet', 'patch', 'settings']]];

  // items : [{ id, label, badge, cls }] ; go(id) ouvre la rubrique.
  function nav(box, items, current, go) {
    const by = Object.fromEntries(items.map((x) => [x.id, x]));
    const groups = GROUPS.map(([title, ids]) => {
      const g = document.createElement('div');
      g.className = 'v2-group' + (title ? '' : ' foot');
      if (title) { const t = document.createElement('p'); t.className = 'v2-group-t'; t.textContent = title; g.append(t); }
      for (const id of ids) {
        const it = by[id];
        if (!it) continue;
        const b = document.createElement('button');
        b.className = 'navbtn' + (it.cls ? ' ' + it.cls : '');
        if (current === id) b.setAttribute('aria-current', 'page');
        b.title = it.label;
        b.setAttribute('aria-label', it.label + (it.badge ? ` (${it.badge})` : ''));
        b.addEventListener('click', () => go(id));
        const ic = icon('navigation.' + NAV[id]);
        if (ic) b.append(ic);
        const l = document.createElement('span'); l.className = 'v2-lab'; l.textContent = it.label; b.append(l);
        if (it.badge) { const n = document.createElement('span'); n.className = 'nbadge'; n.textContent = it.badge; b.append(n); }
        g.append(b);
      }
      return g;
    });
    box.replaceChildren(...groups);
  }

  // Emojis « système » des en-têtes de page -> icône Lucide (le texte des pages n'est pas touché).
  const HERO = {
    '🔥': 'Users', '📊': 'navigation.Stats des joueurs', '🧙': 'navigation.POOL', '🗓️': 'navigation.Planning', '📅': 'navigation.Planning',
    '🎓': 'controls.Coach', '✏️': 'controls.Modifier', '🎮': 'navigation.Détente', '🎯': 'navigation.Micro', '🎙️': 'navigation.Vocal',
    '⚡': 'controls.Draft en direct', '🧩': 'controls.Puzzles de draft', '🏆': 'navigation.E-sport', '📚': 'navigation.Lanes et principes',
    '📣': 'navigation.Parole du coach', '🆕': 'navigation.Patch notes', '📜': 'navigation.Patchs LoL', '⚙️': 'navigation.Paramètres',
    '🛡️': 'roles.Top', '🌲': 'roles.Jungle', '✨': 'roles.Mid', '🏹': 'roles.ADC', '💞': 'roles.Support',
  };
  // Emojis en tête d'un libellé système (onglets, titres de carte, discussion) -> icône. Un emoji inconnu reste tel quel.
  const LABEL = {
    ...HERO, '🔥': 'ribbons.L’acharné', '✨': 'Sparkles', '👤': 'settings.Mon profil', '🔄': 'settings.Version', '🎨': 'settings.Thème',
    '🔔': 'settings.Notifications', '🔐': 'settings.Accès', '🔒': 'settings.Accès', 'ℹ️': 'settings.À propos', '🐞': 'patchNotes.Signaler un bug',
    '💬': 'controls.Discussion', '📊': 'navigation.Stats des joueurs', '🎯': 'controls.Objectif de la semaine', '🗓️': 'navigation.Planning',
    '📈': 'ribbons.En progression', '👑': 'ribbons.Chef d’équipe', '🌠': 'ribbons.Étoile montante', '⚔️': 'controls.Gérer ses fights',
    '🔁': 'sessions.Flex', '🏆': 'sessions.5c5', '⚠️': 'controls.Notification importante', '⚠': 'controls.Notification importante',
    '➕': 'controls.Ajouter', '➖': 'Minus', '💀': 'controls.Morts', '⏱️': 'controls.Heure', '🐉': 'esport.Dragons', '🪱': 'esport.Larves',
    '👾': 'esport.Barons', '🩸': 'Droplet', '👁️': 'controls.La vision', '🌾': 'Wheat', '⭐': 'controls.Maîtrisé', '❔': 'controls.Incertain',
    '✅': 'CircleCheck', '❌': 'CircleX', '💪': 'BicepsFlexed', '📖': 'BookOpen', '🧭': 'Compass', '🤝': 'micro.Duo', '👥': 'Users',
    '🥶': 'TrendingDown', '❤️': 'Heart', '👉': 'controls.Suivant', '🧑‍🏫': 'controls.Coach', '📜': 'navigation.Patch notes', '🧙': 'navigation.POOL',
    '🏰': 'esport.Tours', '⌛': 'controls.Sans réponse', '🐢': 'Turtle', '🙋': 'controls.Identité',
    '💤': 'Moon', '😴': 'Moon', '🔎': 'controls.Recherche', '👌': 'controls.Valider', '💡': 'Lightbulb', '💾': 'Save',
    '🧠': 'controls.Mental et progression', '✍️': 'controls.Modifier', '⏳': 'controls.Sans réponse',
    '🕒': 'controls.Heure', '📝': 'controls.Modifier', '🎥': 'sessions.Review', '📌': 'sessions.Autre',
    '⏱': 'controls.Heure', '⬇': 'Download', '🔵': 'Circle', '🔴': 'Circle',
    '📨': 'controls.Envoyer', '↗': 'ExternalLink', '🎞️': 'controls.Diaporama', '🆕': 'patchNotes.Nouveau', '🛠️': 'patchNotes.Corrigé', '🎮': 'navigation.Détente',
    '🌊': 'detente.Lis la wave', '🧪': 'detente.Recettes d’objets', '💰': 'controls.Recall, golds et objets', '🏳️': 'controls.Savoir concéder', '🧭': 'controls.Les bases de LoL',
  };
  // Le même emoji sert à plusieurs choses : le texte qui suit décide quand il est clair (« 🏆 Win rate » ≠ « 🏆 5c5 »).
  const BYTEXT = [
    [/^Stats et contenu/, 'settings.Stats et contenu'], [/^Tier list/, 'ChartNoAxesColumnIncreasing'], [/^Points forts/, 'Network'], [/^Arbre des points forts/, 'Network'], [/^Matchups/, 'Swords'], [/^Actualiser/, 'controls.Actualiser'],
    [/^Win rate/i, 'controls.Win rate'], [/^KDA/, 'controls.KDA'], [/^Morts/, 'controls.Morts'], [/^Vision/, 'controls.La vision'],
    [/^Remplaçants/, 'ArrowLeftRight'], [/^Golds à 15/, 'controls.Recall, golds et objets'], [/^Premier sang/, 'Droplet'],
    [/^Obligatoire/, 'controls.Obligatoire'], [/^Maîtrisé/, 'controls.Maîtrisé'], [/^(Hors pool|Autres champions)/, 'controls.Incertain'],
    [/^Dragons/, 'esport.Dragons'], [/^Baron/, 'esport.Barons'], [/^Larves/, 'esport.Larves'], [/^Coachs?\b/, 'controls.Coach'],
    [/^Plus de détails/, 'controls.Ajouter'], [/^Moins de détails/, 'Minus'], [/^Détails/, 'controls.Ajouter'], [/^Masquer les détails/, 'Minus'], [/^(Vos )?[Pp]oints forts/, 'BicepsFlexed'],
    [/^À travailler/, 'controls.Notification importante'], [/^Mauvaises actions/, 'CircleX'], [/^Bonnes actions/, 'CircleCheck'],
    [/^La stratégie/, 'controls.Objectifs et macro'], [/^Comprendre les stats/, 'BookOpen'], [/^Bilan et stratégie/, 'Compass'],
    [/^Qui joue avec qui/, 'micro.Duo'], [/^Stats de l’équipe · .*5c5/, 'sessions.5c5'], [/^Stats de l’équipe/, 'sessions.Flex'],
    [/victoires? de suite/, 'ribbons.L’acharné'], [/défaites? de suite/, 'TrendingDown'], [/hors pool/, 'controls.Incertain'],
    [/^Scrim/, 'sessions.Scrim'], [/^Sélection des champions/, 'voice.EN DIRECT'], [/^Objectif/, 'controls.Objectif de la semaine'], [/^5c5/, 'sessions.5c5'], [/^Flex/, 'sessions.Flex'],
  ];
  const LABEL_SEL = '.tab, .plan-tab, .chip, .card > h2, .settings-card h2, .hub-sec > span, .chat-t, .seg';
  // Stats, profils et analyse d'équipe : libellés système uniquement (jamais les notes, fiches ou messages).
  const STAT_SEL = '.tile-h, .acol > h3, .cgroup > h3, .catpill, .bdg, .team-kick, .hp, .more-btn, .tags > .tag:not(.tag-cap), '
    + '.objline > span, .hub-coachs, .team-h, .ta-k, .ta-keep, .wr-g, .tg-q, .pstatus, .cc .m > span, .bonus-l, .sec-hero p.muted.small, '
    + '.btn-fire, .btn-ghost, .pool-more, .fld-inline, .verdict, .pk-mode, .pc-head > .tag, .plan-type, .plan-note, .pc-name, .pc-hr, .plan-hours, '
    + '.dr-live, .dr-timer, .dr-teams h3, .card > h3, '
    + '.jt-label, .cchip, .diapo-tag, .tr-head b, .pk-tag, .nrow > span, h2:not(.md h2)';
  // Planning : réponses des joueurs et demandes de créneau (Présent ✓, Incertain ?, Absent ✕, Sans réponse ⌛).
  const PLAN = { '✅': 'controls.Valider', '❔': 'controls.Incertain', '❌': 'controls.Fermer', '⏳': 'controls.Sans réponse' };
  const PLAN_SEL = '.plan-count > span, .plan-btn, .pc-state > span, .pc-me > span, .pc-req > span, .plan-tabs .tab';
  // Vocal : salons, petite barre d'appel, bandeau « en direct ».
  const ROOMS = { '🔊': 'Salon de l’équipe', '🎧': 'navigation.Vocal', '🎓': 'controls.Coach', '🎙️': 'navigation.Vocal' };
  const VOICE = { '🎙️': 'navigation.Vocal', '🎤': 'voice.Micro actif', '🔇': 'voice.Micro coupé', '🎧': 'navigation.Vocal',
    '🔕': 'voice.Casque coupé', '📞': 'voice.Quitter', '🔴': 'voice.EN DIRECT', '👑': 'ribbons.Chef d’équipe' };
  const ROLES = { '🛡️': 'roles.Top', '🌲': 'roles.Jungle', '✨': 'roles.Mid', '🏹': 'roles.ADC', '💞': 'roles.Support' };
  // Petites icônes seules (cartes d'analyse, points forts d'équipe, objectifs d'une game).
  const ICO_SEL = '.acard-ico, .tf-ico, .pz-lane, .cat-ico, .pj-ico, .princ-ico, .lens-ico, .pc-ico, .tier-ico, .pk-b, .ibtn, .apill-ico, .mini-tag, .pool-card table.t td';
  // Libellés où 🎯 ⭐ ❔ apparaissent au milieu du texte (légendes POOL, changements de tierlist).
  const CAT_SEL = '.acard-chip, .chg, .catleg > span, .pool-hero p, .week-banner .wb-main .muted.small, .card-editor > p.muted.small';
  const OBJ = { '🩸': 'Droplet', '⚔️': 'Swords', '🐉': 'esport.Dragons', '🪱': 'esport.Larves', '👾': 'esport.Barons', '⏱️': 'controls.Heure', '🏰': 'esport.Tours' };
  const ICO = { ...LABEL, '🛡️': 'roles.Top', '🎯': 'Goal', '🌲': 'roles.Jungle', '✨': 'roles.Mid', '🏹': 'roles.ADC', '💞': 'roles.Support', '⚔️': 'Swords', '💰': 'controls.Recall, golds et objets', '🧠': 'controls.Mental et progression' };
  const EMO = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\uFE0F?/gu;
  const LEAD_RUN = /^\s*((?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\uFE0F?)+)\s*/u;
  // Libellé exact du dictionnaire (« Passif », « Gérer ses fights », « Nouveau »…) -> son icône, quel que soit l'emoji d'origine.
  const norm = (x) => String(x).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
  const NAMES = {};
  for (const g of ['detente', 'micro', 'patchNotes', 'controls', 'sessions', 'settings', 'navigation', 'esport']) {
    for (const k of Object.keys(DICT[g] || {})) NAMES[norm(k)] = g + '.' + k;
  }
  for (const k of Object.keys(DICT.aliases || {})) if (!/[/]/.test(k)) NAMES[norm(k)] = k;
  function pick(em, rest, map) {
    if (map === LABEL) for (const [re, n] of BYTEXT) if (re.test(rest)) return n;
    if (map === LABEL && rest && NAMES[norm(rest)]) return NAMES[norm(rest)];
    return map[em] || map[em.replace(/\uFE0F/g, '')] || map[em + '\uFE0F'];
  }
  // Remplace l'emoji (ou la suite d'emojis, « 🎯⭐ ») en tête du premier texte de l'élément. Rien n'est remplacé si un seul est inconnu.
  function leadIcon(el, map) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t = w.nextNode();
    while (t && !t.textContent.trim()) t = w.nextNode();
    if (!t) return;
    const m = t.textContent.match(LEAD_RUN);
    if (!m) return;
    const rest = t.textContent.slice(m[0].length);
    const ems = m[1].match(EMO) || [];
    // Suite d'emojis : ce sont les catégories de champions (« 🎯⭐ Obligatoire et maîtrisé »).
    const names = ems.length === 1 ? [pick(ems[0], rest, map)] : ems.map((e) => pick(e, '', { ...map, '🎯': 'controls.Obligatoire' }));
    const ics = names.map((n) => n && icon(n));
    if (!ics.length || ics.some((x) => !x)) return;
    t.textContent = rest;
    ics.forEach((ic) => t.parentNode.insertBefore(ic, t));
  }
  // Bandeaux : le thème des données décide de l'icône (DECISIONS-V2 §2). Thème inconnu : Award.
  const RIBBON = { ruby: 'ribbons.Le pilier', fire: 'ribbons.L’acharné', gold: 'ribbons.Chef d’équipe', star: 'ribbons.Étoile montante',
    emerald: 'ribbons.En progression', blade: 'ribbons.Monstre OTP Irelia' };
  const THEMES = Object.keys(RIBBON);
  const LEAD_EMOJI = /^\s*(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s+/u;
  function ribbon(el, holder) {
    const theme = holder && THEMES.find((t) => holder.classList.contains('b-' + t));
    const first = el.firstChild;
    if (first && first.nodeType === 3) first.textContent = first.textContent.replace(LEAD_EMOJI, '');
    const ic = icon(theme ? RIBBON[theme] : 'Award');
    if (ic) el.prepend(ic);
  }
  // Catégories de champions au milieu d'un libellé (« 23 obligatoires · ⭐ 2 maîtrisés · ❔ 2 autres »).
  const CAT = { '🎯': 'controls.Obligatoire', '⭐': 'controls.Maîtrisé', '❔': 'controls.Incertain' };
  function inlineIcons(el, map) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let t = w.nextNode(); t; t = w.nextNode()) if (/\p{Extended_Pictographic}/u.test(t.textContent)) nodes.push(t);
    for (const t of nodes) {
      const parts = t.textContent.split(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\uFE0F?)\s?/u);
      const out = parts.map((x, i) => (i % 2 ? (pick(x, '', map) && icon(pick(x, '', map))) || document.createTextNode(x) : document.createTextNode(x)));
      t.replaceWith(...out);
    }
  }
  function once(root, sel, fn) {
    root.querySelectorAll(sel).forEach((el) => { if (el.dataset.v2l === el.textContent) return; fn(el); el.dataset.v2l = el.textContent; });
  }

  function decorate(root) {
    once(root, LABEL_SEL, (el) => leadIcon(el, LABEL));
    once(root, STAT_SEL, (el) => leadIcon(el, LABEL));
    once(root, '.tg-obj > span', (el) => leadIcon(el, OBJ));
    once(root, CAT_SEL, (el) => inlineIcons(el, CAT));
    once(root, PLAN_SEL, (el) => leadIcon(el, PLAN));
    once(root, '.sec-hero p.muted', (el) => inlineIcons(el, PLAN));
    // Mode de Micro : l'icône suit le nom du mode (dictionnaire « micro »).
    once(root, '.jg-ico', (el) => {
      const lab = el.parentNode && el.parentNode.querySelector('.jg-txt b');
      const n = lab && NAMES[norm(lab.textContent)];
      const ic = n && icon(n);
      if (ic) el.replaceChildren(ic);
    });
    once(root, '.jg-cur', (el) => leadIcon(el, LABEL));
    once(root, '.tr-ico', (el) => {
      const lab = el.parentNode && el.parentNode.querySelector('b');
      const n = lab && NAMES[norm(lab.textContent)];
      const ic = n && icon(n);
      if (ic) el.replaceChildren(ic);
    });
    // Cases d'indices du jeu Classique : vert / ambre / rouge (DECISIONS-V2 §7).
    once(root, '.card > p.muted', (el) => inlineIcons(el, { '🟩': 'Square', '🟧': 'Square', '🟥': 'Square' }));
    // Pastille du thème FIRE : la couleur suffit, pas d'icône.
    once(root, '.theme-sw', (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let t = w.nextNode(); t; t = w.nextNode()) if (t.textContent.trim()) { t.textContent = t.textContent.replace(LEAD_RUN, ''); break; } });
    once(root, '.vr-ico', (el) => { const n = ROOMS[el.textContent.trim()]; const ic = n && icon(n); if (ic) el.replaceChildren(ic); });
    once(root, '.vs-rh, .vc-live-pill', (el) => leadIcon(el, ROOMS));
    once(root, '.vc-ghost, .vb-go, .vl-txt', (el) => leadIcon(el, { ...VOICE, '🎧': 'Tester mon micro' }));
    once(root, '.vb-btn', (el) => { const n = VOICE[el.textContent.trim()]; const ic = n && icon(n); if (ic) el.replaceChildren(ic); });
    once(root, '.vb-live, .vt-name', (el) => inlineIcons(el, VOICE));
    // Petite barre d'appel : en haut de la zone de contenu, sous la barre d'état (DECISIONS-V2 §4).
    const bar = document.getElementById('vbar');
    const view = document.getElementById('view');
    if (bar && view && bar.parentNode === document.body) view.before(bar);
    once(root, '.plan-grid tr.night .plan-hr', (el) => { const ic = icon('Moon'); if (ic) el.prepend(ic); });
    once(root, '.plan-p', (el) => {
      const st = el.firstElementChild;
      const em = st && st.textContent.trim();
      const ic = em && PLAN[em] && icon(PLAN[em]);
      if (ic) st.replaceChildren(ic);
      inlineIcons(el, ROLES);
    });
    once(root, ICO_SEL, (el) => {
      // Seulement si l'élément ne contient que des emojis connus (« 🎯⭐ » donne deux icônes).
      const em = el.textContent.trim();
      const ems = em.match(EMO) || [];
      if (!ems.length || ems.join('') !== em.replace(/\s+/g, '')) return;
      const cat = ems.length > 1 || el.matches('.tier-ico, .pk-b, .mini-tag, .ibtn, td');
      const ics = ems.map((e) => { const n = pick(e, '', cat ? { ...ICO, ...CAT } : ICO); return n && icon(n); });
      if (ics.every(Boolean)) el.replaceChildren(...ics);
    });
    root.querySelectorAll('.role > .ico:not([data-v2])').forEach((el) => { el.dataset.v2 = '1'; const ic = HERO[el.textContent.trim()] && icon(HERO[el.textContent.trim()]); if (ic) el.replaceChildren(ic); });
    root.querySelectorAll('.sec-ico:not([data-v2])').forEach((el) => {
      el.dataset.v2 = '1';
      const name = HERO[el.textContent.trim()];
      const ic = name && icon(name);
      if (ic) el.replaceChildren(ic);
    });
    root.querySelectorAll('.pcap:not([data-v2])').forEach((el) => { el.dataset.v2 = '1'; ribbon(el, el.closest('.pcard')); });
    root.querySelectorAll('.tag.tag-cap:not([data-v2])').forEach((el) => { el.dataset.v2 = '1'; ribbon(el, el); });
  }

  function mount() {
    const shell = document.getElementById('app');
    const top = shell && shell.querySelector('.topbar');
    if (!shell || !top || shell.querySelector('.v2-side')) return;
    const side = document.createElement('aside');
    side.className = 'v2-side';
    side.setAttribute('aria-label', 'Navigation');
    const brand = document.createElement('div');
    brand.className = 'v2-brand';
    const logo = document.createElement('img'); logo.src = '../assets/fire.png'; logo.alt = '';
    const name = document.createElement('span'); name.textContent = 'FIRE LoL';
    brand.append(logo, name);
    side.append(brand, document.getElementById('nav'));
    const main = document.createElement('div');
    main.className = 'v2-main';
    [...shell.children].forEach((c) => main.append(c));
    shell.append(side, main);
    const status = document.getElementById('status');
    const back = document.getElementById('back');
    if (status) back ? back.after(status) : top.prepend(status);
    // Tout ce qui s'affiche (pages, discussion, fenêtres) passe par le remplacement des emojis système.
    let queued = false;
    // setTimeout plutôt que requestAnimationFrame : une fenêtre cachée (barre des tâches) ne dessine plus d'images, et le remplacement ne doit pas rester en attente.
    new MutationObserver(() => { if (queued) return; queued = true; setTimeout(() => { queued = false; decorate(document.body); }, 0); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (on) {
    document.documentElement.classList.add('v2');
    mount();
  }
  window.FIREV2 = { on, icon, nav, decorate, set: (v) => { try { localStorage.setItem('fire.ui.v1', JSON.stringify(!v)); } catch (e) { /* stockage indisponible */ } location.reload(); } };
}());
