// FIRE V2 — aperçu de la nouvelle interface (activable dans Paramètres).
// Sans l'aperçu, ce fichier ne change rien. Avec : classe html.v2, barre latérale à gauche,
// icônes Lucide (icons.json) à la place des emojis « système ». Les données restent intactes.
(function () {
  'use strict';
  let on = false;
  try { on = JSON.parse(localStorage.getItem('fire.v2')) === true; } catch (e) { on = false; }
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
    s.innerHTML = LUC[n];
    return s;
  }

  // Rubriques : identifiant FIRE -> libellé du dictionnaire (et donc son icône).
  const NAV = {
    stats: 'Stats des joueurs', pool: 'POOL', planning: 'Planning', draft: 'Draft', train: 'Micro', jeux: 'Détente',
    guides: 'Lanes et principes', coach: 'Parole du coach', worlds: 'E-sport', lolpatch: 'Patchs LoL', vocal: 'Vocal',
    patch: 'Patch notes', settings: 'Paramètres',
  };
  const GROUPS = [['Équipe', ['stats', 'pool', 'planning']], ['Jeu', ['draft', 'train', 'jeux']],
    ['Apprendre', ['guides', 'coach', 'worlds', 'lolpatch']], ['Social', ['vocal']], [null, ['patch', 'settings']]];

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
    '💬': 'controls.Discussion', '📊': 'settings.Stats et contenu', '🎯': 'controls.Objectif de la semaine', '🗓️': 'navigation.Planning',
    '📈': 'ribbons.En progression', '👑': 'ribbons.Chef d’équipe', '🌠': 'ribbons.Étoile montante', '⚔️': 'controls.Gérer ses fights',
  };
  const LABEL_SEL = '.tab, .plan-tab, .chip, .card > h2, .settings-card h2, .hub-sec > span, .chat-t, .seg';
  function leadIcon(el, map) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t = w.nextNode();
    while (t && !t.textContent.trim()) t = w.nextNode();
    if (!t) return;
    const m = t.textContent.match(LEAD_EMOJI);
    const ic = m && map[m[1]] && icon(map[m[1]]);
    if (!ic) return;
    t.textContent = t.textContent.slice(m[0].length);
    t.parentNode.insertBefore(ic, t);
  }
  // Bandeaux : le thème des données décide de l'icône (DECISIONS-V2 §2). Thème inconnu : Award.
  const RIBBON = { ruby: 'ribbons.Le pilier', fire: 'ribbons.L’acharné', gold: 'ribbons.Chef d’équipe', star: 'ribbons.Étoile montante',
    emerald: 'ribbons.En progression', blade: 'ribbons.Monstre OTP Irelia' };
  const LEAD_EMOJI = /^\s*(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s+/u;

  function decorate(root) {
    root.querySelectorAll(LABEL_SEL).forEach((el) => { if (el.dataset.v2l === el.textContent) return; leadIcon(el, LABEL); el.dataset.v2l = el.textContent; });
    root.querySelectorAll('.role > .ico:not([data-v2])').forEach((el) => { el.dataset.v2 = '1'; const ic = HERO[el.textContent.trim()] && icon(HERO[el.textContent.trim()]); if (ic) el.replaceChildren(ic); });
    root.querySelectorAll('.sec-ico:not([data-v2])').forEach((el) => {
      el.dataset.v2 = '1';
      const name = HERO[el.textContent.trim()];
      const ic = name && icon(name);
      if (ic) el.replaceChildren(ic);
    });
    root.querySelectorAll('.pcap:not([data-v2])').forEach((el) => {
      el.dataset.v2 = '1';
      const card = el.closest('.pcard');
      const theme = card && ['ruby', 'fire', 'gold', 'star', 'emerald', 'blade'].find((t) => card.classList.contains('b-' + t));
      const first = el.firstChild;
      if (first && first.nodeType === 3) first.textContent = first.textContent.replace(LEAD_EMOJI, '');
      const ic = icon(theme ? RIBBON[theme] : 'Award');
      if (ic) el.prepend(ic);
    });
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
    new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; decorate(document.body); }); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (on) {
    document.documentElement.classList.add('v2');
    mount();
  }
  window.FIREV2 = { on, icon, nav, decorate, set: (v) => { try { localStorage.setItem('fire.v2', JSON.stringify(!!v)); } catch (e) { /* stockage indisponible */ } location.reload(); } };
}());
