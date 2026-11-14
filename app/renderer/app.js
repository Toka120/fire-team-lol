// FIRE LoL - interface : écran du code, accueil de l'équipe, page de chaque joueur.
(() => {
  const FC = window.FC;
  const { fr, sg, pl } = FC;
  const $ = (id) => document.getElementById(id);
  const REFRESH_EVERY = 10 * 60 * 1000;
  const FETCH_DAYS = 31;

  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  // Thème de fond choisi dans Paramètres (appliqué dès le démarrage, écran du code compris).
  // [id, nom, fond, accent 1, accent 2, description, ambiance] : les « ambiances » ont leur fond, leur police et leurs effets (v2/themes.css).
  const THEMES = [
    ['neon', 'Néon', '#07040f', '#ff2bd6', '#22e6ff', 'Rose et cyan qui brillent, comme une salle d’arcade la nuit', 1],
    ['synthwave', 'Synthwave', '#12051f', '#ff6ec7', '#ffb347', 'Coucher de soleil rétro, grille à l’horizon', 1],
    ['futur', 'Futuriste', '#040a12', '#00e5ff', '#7c5cff', 'Interface de vaisseau : grille, cyan et police techno', 1],
    ['bagarre', 'Bagarre', '#120404', '#ff3b1f', '#ffc21f', 'Rouge sang et jaune : pour les games où ça tape', 1],
    ['cafe', 'Café cosy', '#1c140f', '#e8b07a', '#f3d9b1', 'Latte, caramel et coins arrondis : tranquille', 1],
    ['arcane', 'Arcane', '#061214', '#ff4fa3', '#3ef0c8', 'Zaun et Piltover : rose néon, vert chimique, or', 1],
    ['hextech', 'Hextech', '#010a13', '#c8aa6e', '#0ac8b9', 'L’or et le bleu du client de LoL', 1],
    ['sakura', 'Sakura', '#170c13', '#ff8fb8', '#b8a6ff', 'Rose pâle et lavande, doux et lumineux', 1],
    ['givre', 'Freljord', '#061220', '#8fd8ff', '#ffffff', 'Glace, givre et verre dépoli', 1],
    ['ocean', 'Abysses', '#02141a', '#2ee6c5', '#4aa8ff', 'Turquoise des profondeurs, bulles et lumière', 1],
    ['violet', 'Void', '#0b0614', '#9d5cff', '#ff5cc8', 'Le Néant : violet profond et magenta', 1],
    ['matrix', 'Matrix', '#020803', '#39ff6a', '#b6ffb0', 'Vert terminal, police machine, lignes de code', 1],
    ['rgb', 'Gamer RGB', '#08080d', '#ff3d6e', '#3dd8ff', 'Arc-en-ciel animé, comme un clavier gamer', 1],
    ['fire', 'FIRE', '#0f0d0c', '#ff5e3a', '#ffb02e', 'Le thème d’origine', 0], ['bleu', 'Bleu', '#0a1430', '#508cff', '#8fb6ff', '', 0], ['rouge', 'Rouge', '#1f0709', '#f0283c', '#ff8a8a', '', 0],
    ['vert', 'Vert', '#061a0f', '#3cdc78', '#a6f0c2', '', 0], ['jaune', 'Jaune', '#1c1606', '#ffcd28', '#ffe58a', '', 0], ['noir', 'Noir', '#000000', '#8a8a8a', '#d0d0d0', '', 0], ['gris', 'Gris', '#1b1c1f', '#6b6f78', '#b5b9c2', '', 0]];
  const applyTheme = (t) => {
    const el = document.documentElement;
    const th = THEMES.find((x) => x[0] === t);
    if (!t || t === 'fire' || !th) el.removeAttribute('data-theme'); else el.setAttribute('data-theme', t);
    if (th && th[6]) el.setAttribute('data-skin', '1'); else el.removeAttribute('data-skin');
  };
  applyTheme(load('fire.theme', 'fire'));
  // Polices d'écriture et taille du texte choisies dans Paramètres (vides = celles du thème).
  const FONT_UI = [['', 'Selon le thème'], ['Inter', 'Inter'], ['Poppins', 'Poppins'], ['Nunito', 'Nunito'], ['Montserrat', 'Montserrat'], ['Lexend', 'Lexend (très lisible)'],
    ['Outfit', 'Outfit'], ['Space Grotesk', 'Space Grotesk'], ['Rajdhani', 'Rajdhani (gamer)'], ['Fredoka', 'Fredoka (arrondie)'], ['Comic Neue', 'Comic Neue'], ['JetBrains Mono', 'JetBrains Mono (code)'], ['Segoe UI', 'Windows (Segoe UI)']];
  const FONT_TITLE = [['', 'Selon le thème'], ['Cinzel', 'Cinzel (LoL)'], ['Orbitron', 'Orbitron (futuriste)'], ['Audiowide', 'Audiowide (néon)'], ['Bangers', 'Bangers (comics)'],
    ['Russo One', 'Russo One (esport)'], ['Bebas Neue', 'Bebas Neue (affiche)'], ['Permanent Marker', 'Permanent Marker (feutre)'], ['Press Start 2P', 'Press Start 2P (rétro)'],
    ['Fredoka', 'Fredoka (arrondie)'], ['Poppins', 'Poppins'], ['Montserrat', 'Montserrat'], ['JetBrains Mono', 'JetBrains Mono (code)'], ['=ui', 'Comme le texte']];
  const fontPrefs = () => ({ ui: '', title: '', zoom: 100, ...load('fire.font', {}) });
  function applyFonts() {
    const f = fontPrefs(), el = document.documentElement;
    const fam = (n) => `'${n}', 'Segoe UI', system-ui, sans-serif`;
    if (f.ui) { el.style.setProperty('--v2-font', fam(f.ui)); el.setAttribute('data-fui', '1'); } else { el.style.removeProperty('--v2-font'); el.removeAttribute('data-fui'); }
    const t = f.title === '=ui' ? (f.ui || 'Inter') : f.title;
    if (t) { el.style.setProperty('--v2-display', fam(t)); el.style.setProperty('--ttitle', fam(t)); el.setAttribute('data-ftitle', '1'); }
    else { el.style.removeProperty('--v2-display'); el.style.removeProperty('--ttitle'); el.removeAttribute('data-ftitle'); }
    const z = [90, 100, 110, 120].includes(Number(f.zoom)) ? Number(f.zoom) : 100;
    if (window.fire && window.fire.zoom) window.fire.zoom(z / 100);
    else if (z !== 100) el.style.setProperty('zoom', String(z / 100)); else el.style.removeProperty('zoom');
  }
  applyFonts();
  // Réglages de confort (Paramètres) : apparence, accessibilité, notifications, profil, confidentialité. Gardés sur ce PC.
  const UX_DEF = { accent: '', bg: { type: 'none', c: '', n: 0, blur: 6, dim: 70 }, compact: false, h12: false, calm: false, contrast: false, dys: false, sat: 100,
    dnd: true, quiet: { on: false, from: '23:00', to: '09:00' }, nsound: 'windows', status: 'online', bio: '', color: '', banner: null, dm: 'all', hideLive: false, streamer: 'auto' };
  let UX = { ...UX_DEF, ...load('fire.ux', {}) };
  UX.bg = { ...UX_DEF.bg, ...(UX.bg || {}) }; UX.quiet = { ...UX_DEF.quiet, ...(UX.quiet || {}) };
  const STREAM = { detected: false };
  const streamerOn = () => UX.streamer === 'on' || (UX.streamer === 'auto' && STREAM.detected);
  function applyUx() {
    const el = document.documentElement;
    const tog = (k, v) => { if (v) el.setAttribute(k, '1'); else el.removeAttribute(k); };
    if (/^#[0-9a-f]{6}$/i.test(UX.accent || '')) { ['--fire1', '--fire2', '--ta'].forEach((k) => el.style.setProperty(k, UX.accent)); el.setAttribute('data-accent', '1'); }
    else { ['--fire1', '--fire2', '--ta'].forEach((k) => el.style.removeProperty(k)); el.removeAttribute('data-accent'); }
    tog('data-compact', UX.compact); tog('data-calm', UX.calm); tog('data-contrast', UX.contrast); tog('data-streamer', streamerOn());
    if (UX.contrast) { el.style.setProperty('--muted', 'color-mix(in srgb, var(--fg) 86%, transparent)'); el.style.setProperty('--line', 'color-mix(in srgb, var(--fg) 34%, transparent)'); }
    else { el.style.removeProperty('--muted'); el.style.removeProperty('--line'); }
    el.style.filter = Number(UX.sat) && Number(UX.sat) !== 100 ? `saturate(${Number(UX.sat) / 100})` : '';
    // Police pour la dyslexie : passe avant la police choisie.
    if (UX.dys) { el.style.setProperty('--v2-font', "'OpenDyslexic', 'Segoe UI', sans-serif"); el.setAttribute('data-fui', '1'); }
    // Fond d'écran : un skin de LoL ou ton image, flouté et assombri derrière l'application.
    const b = UX.bg || {};
    let url = '';
    if (b.type === 'skin' && /^[A-Za-z]+$/.test(b.c || '')) url = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${b.c}_${Number(b.n) || 0}.jpg`;
    if (b.type === 'image') url = load('fire.uxbgimg', '') || '';
    if (url) { el.style.setProperty('--ux-bg', `url("${url}")`); el.style.setProperty('--ux-blur', `${Math.max(0, Math.min(30, Number(b.blur) || 0))}px`); el.style.setProperty('--ux-dim', String(Math.max(0, Math.min(95, Number(b.dim) || 0)) / 100)); el.setAttribute('data-uxbg', '1'); }
    else { el.style.removeProperty('--ux-bg'); el.removeAttribute('data-uxbg'); }
  }
  function setUx(patch) { UX = { ...UX, ...patch }; save('fire.ux', UX); applyFonts(); applyUx(); statusPush(); }
  applyUx();
  // Notifications Windows : coupées pendant une partie (si choisi), aux heures calmes et en statut « Occupé » ; son au choix.
  const inQuiet = () => {
    if (!UX.quiet.on) return false;
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
    const t = (x) => { const [hh, mm] = String(x || '0:0').split(':').map(Number); return (hh || 0) * 60 + (mm || 0); };
    const a = t(UX.quiet.from), b = t(UX.quiet.to);
    return a <= b ? m >= a && m < b : m >= a || m < b;
  };
  function notifMuted() { return (UX.dnd && typeof LIVE !== 'undefined' && LIVE.mine) || inQuiet() || UX.status === 'busy'; }
  function deskNotify(o) {
    if (!window.fire.notify || (!o.force && notifMuted())) return Promise.resolve(false);
    const m = { ...o };
    if (streamerOn()) m.body = 'Ouvre FIRE pour voir le détail (mode streamer).';
    if (UX.nsound === 'silence' || UX.nsound === 'fire') m.silent = true;
    if (UX.nsound === 'fire') fireChime();
    return window.fire.notify(m);
  }
  function fireChime() {
    try {
      const c = new (window.AudioContext || window.webkitAudioContext)();
      [[0, 784], [0.11, 1046], [0.22, 1318]].forEach(([d, f]) => {
        const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + d;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.4);
      });
      setTimeout(() => c.close(), 1200);
    } catch (e) { /* pas de son */ }
  }
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* plein */ } };

  const S = {
    cfg: null, players: [], coachs: [], period: '7', since: null, obj: null,
    data: load('fire.data', {}), status: {},
    view: 'hub', player: null, tab: 'resume', jour: 'tous',
    refreshing: false, lastRefresh: null, timer: null,
    section: 'stats', version: '0', guides: null, guideCats: [], guideCat: null, theme: null,
    fiches: null, fichesErr: '', fichesLoading: false, ficheId: null, seen: new Set(load('fire.vus', [])),
    coachState: { coach: false, claude: false, github: false }, draft: null, flash: '', settingsMsg: '', confirm: null,
    pools: null, poolsErr: '', poolWeek: null, poolEdit: null, cardEdit: null, champList: null, cfgObj: null,
    teamGames: {}, teamState: '', teamErr: '', teamAt: null, teamTab: 'bilan', teamQ: 440,
    plan: { jours: {}, reponses: {} }, planErr: '', planWrite: false, planWeek: null, planEdit: null
  };

  // ---------- Petits outils ----------
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      e.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return e;
  }
  const later = (fn) => requestAnimationFrame(() => { try { fn(); } catch (e) { console.error(e); } });
  const hm = (t) => {
    const d = new Date(t), m = String(d.getMinutes()).padStart(2, '0');
    if (UX.h12) { const hh = d.getHours(); return `${hh % 12 || 12}:${m} ${hh < 12 ? 'AM' : 'PM'}`; }
    return `${String(d.getHours()).padStart(2, '0')}:${m}`;
  };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const tag = (t) => h('span', { class: 'tag' }, t);
  // Skins préférés d'un joueur (joueurs.json « fonds » : [{ champ, skin }]) : ils défilent en fond de sa carte et de son profil.
  function skinBg(p) {
    const list = (Array.isArray(p.fonds) ? p.fonds : []).filter((f) => f && /^[A-Za-z]+$/.test(f.champ || '') && Number.isInteger(f.skin)).slice(0, 6);
    if (!list.length) return null;
    return h('div', { class: 'skin-bg', 'aria-hidden': 'true' }, list.map((f, i) => h('img', { class: i === 0 ? 'on' : '', alt: '', loading: 'lazy',
      src: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${f.champ}_${f.skin}.jpg`, onerror: (e) => e.target.remove() })));
  }
  // Un seul minuteur pour toute l'app : chaque fond passe au skin suivant toutes les 7 s (fondu enchaîné).
  setInterval(() => !UX.calm && document.querySelectorAll('.skin-bg').forEach((b) => {
    const imgs = [...b.querySelectorAll('img')];
    if (imgs.length < 2) return;
    const i = imgs.findIndex((x) => x.classList.contains('on'));
    imgs.forEach((x) => x.classList.remove('on'));
    imgs[(i + 1) % imgs.length].classList.add('on');
  }), 7000);
  // Bandeau d'un joueur (joueurs.json) : « capitaine » ou un bandeau libre { texte, theme : gold | star | fire | emerald | ruby | blade }.
  // Ajouter ou changer un bandeau ne demande pas de nouvelle version de l'app.
  const bandeau = (p) => p.capitaine ? { texte: '👑 Chef d’équipe', theme: 'gold' }
    : p.bandeau && p.bandeau.texte ? { texte: String(p.bandeau.texte).slice(0, 40), theme: ['gold', 'star', 'fire', 'emerald', 'ruby', 'blade'].includes(p.bandeau.theme) ? p.bandeau.theme : 'fire' } : null;
  const dateFr = (ymd) => { const d = new Date(ymd + 'T00:00:00'); return `${d.getDate() === 1 ? '1er' : d.getDate()} ${d.toLocaleDateString('fr-FR', { month: 'long' })}`; };
  // Games obligatoires ajoutées par le coach à un joueur pour la semaine en cours (lundi → dimanche).
  const bonusFor = (slug, mon) => (((S.bonus || {})[mon || mondayOf(todayYmd())] || {})[slug]) || 0;
  function objFor(p, d) {
    if (!S.obj || !d || (p && p.temp)) return null;
    const b = bonusFor(p.slug);
    const o = FC.objectif(p, d.matches, { ...S.obj, games: Math.max(0, (Number(S.obj.games) || 0) + b) });
    if (o) o.bonus = b;
    return o;
  }
  function bonusCtl(p, compact) {
    const b = bonusFor(p.slug), base = Number(S.obj && S.obj.games) || 0;
    const busy = S.bonusBusy === p.slug;
    const send = async (e, delta) => {
      e.stopPropagation();
      if (busy) return;
      S.bonusBusy = p.slug; S.bonusErr = ''; render();
      let r;
      actLog('pool', `Bonus ${delta > 0 ? '+' : ''}${delta} game(s) pour ${vocalName(p.slug)}`);
    try { r = await window.fire.coach.savePools({ type: 'bonus', semaine: mondayOf(todayYmd()), slug: p.slug, delta, base }); } catch (err) { r = { ok: false, error: String(err) }; }
      S.bonusBusy = null;
      if (r && r.ok) { S.pools = r.semaines || S.pools; S.bonus = r.bonus || {}; } else S.bonusErr = (r && r.error) || 'envoi impossible';
      render();
    };
    const bt = (delta) => h('button', { class: 'bonus-b' + (delta < 0 ? ' minus' : ''), disabled: busy || (delta < 0 && base + b + delta < 0) ? true : null,
      onclick: (e) => send(e, delta), onkeydown: (e) => e.stopPropagation() }, (delta > 0 ? '+' : '−') + Math.abs(delta));
    return h('div', { class: 'bonus-ctl' + (compact ? ' compact' : ''), onclick: (e) => e.stopPropagation() },
      h('span', { class: 'bonus-l' }, compact ? '🧑‍🏫 Games obligatoires' : '🧑‍🏫 Coach : games obligatoires de la semaine'),
      bt(-10), bt(-1),
      h('span', { class: 'bonus-v' }, busy ? '…' : `${base + b}${b ? ` (${b > 0 ? '+' : ''}${b})` : ''}`),
      bt(1), bt(10),
      !compact && S.bonusErr ? h('span', { class: 'bad small' }, '⚠ ' + S.bonusErr) : null);
  }
  function progress(o, big) {
    if (!o || !o.target) return null;
    const bar = h('div', { class: 'prog' + (o.done >= o.target ? ' done' : '') }, h('i', { style: `width:${o.pct}%` }));
    return h('div', { class: 'objbox' + (big ? ' big' : '') },
      h('div', { class: 'objline' }, h('span', null, `🎯 Objectif de la semaine : ${o.done} / ${o.target} games obligatoires`, o.bonus ? h('span', { class: 'bonus-tag' }, ` ${o.bonus > 0 ? '+' : ''}${o.bonus} du coach`) : null), h('span', { class: 'muted small' }, o.done >= o.target ? 'atteint ✓' : `reste ${o.reste}`)),
      bar);
  }
  const roleOf = (p) => FC.ROLES[p.role_id] || FC.ROLES.mid;
  const repText = (r) => (r.dir === 'up' ? '≥ ' : '≤ ') + (r.signed ? sg(r.v) : fr(r.v, r.d)) + r.u;

  const tip = $('tip');
  function showTip(ev, l1, l2) {
    tip.replaceChildren(h('div', { class: 't1' }, l1), h('div', null, l2));
    tip.hidden = false;
    const x = Math.min(window.innerWidth - tip.offsetWidth - 8, ev.clientX + 14);
    const y = Math.max(8, ev.clientY - tip.offsetHeight - 10);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  const hideTip = () => { tip.hidden = true; };

  // ---------- Période ----------
  // « stats_depuis » (joueurs.json) : pour un joueur arrivé en cours de route, la période « depuis le début »
  // remonte à cette date (ex. le début de l'année) au lieu du début de l'équipe.
  const ownStart = (p) => (p && /^\d{4}-\d{2}-\d{2}$/.test(p.stats_depuis || '') && S.period === 'debut' && S.debut ? p.stats_depuis : null);
  function periodStart(p) {
    if (p && p.temp) return Date.now() - 30 * 86400000;
    if (ownStart(p)) return new Date(ownStart(p) + 'T00:00:00').getTime();
    if (S.period === 'debut' && S.debut) return new Date(S.debut + 'T00:00:00').getTime();
    if (S.period === 'obj' && S.obj) return new Date(S.obj.debut + 'T00:00:00').getTime();
    if (S.period === 'since' && S.since) return new Date(S.since + 'T00:00:00').getTime();
    if (S.period === '1') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    const n = S.period === 'since' ? 7 : Number(S.period);
    return Date.now() - n * 86400000;
  }
  function periodLabel(p) {
    if (p && p.temp) return 'sur les 30 derniers jours';
    if (ownStart(p)) return `depuis le ${dateFr(ownStart(p))} ${ownStart(p).slice(0, 4)}`;
    if (S.period === 'debut' && S.debut) return `depuis le ${dateFr(S.debut)}`;
    if (S.period === 'obj' && S.obj) return `cette semaine (depuis le ${dateFr(S.obj.debut)})`;
    if (S.period === 'since' && S.since) { const d = new Date(S.since + 'T00:00:00'); return `depuis le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`; }
    if (S.period === '1') return "aujourd'hui";
    return `les ${S.period === 'since' ? 7 : S.period} derniers jours`;
  }

  // ---------- Démarrage, code d'accès ----------
  async function start() {
    S.cfg = await window.fire.config();
    try { S.version = await window.fire.version(); } catch (e) { /* inconnue */ }
    S.players = (S.cfg && S.cfg.joueurs) || [];
    membresMerge(load('fire.membres', []));
    S.coachs = (S.cfg && Array.isArray(S.cfg.coachs) && S.cfg.coachs) || [];
    S.cfgObj = (S.cfg && S.cfg.objectif && S.cfg.objectif.debut) ? S.cfg.objectif : null;
    S.obj = weeklyObj(S.cfgObj);
    // Début de la saison de l'équipe (joueurs.json → debut_equipe) : période par défaut de toutes les stats.
    S.debut = (S.cfg && S.cfg.debut_equipe) || null;
    if (S.obj) S.period = 'obj';
    if (S.debut) S.period = 'debut';
    let ok;
    if (S.cfg && S.cfg.code_scrypt) ok = await window.fire.unlocked();
    else { const need = S.cfg && S.cfg.code_sha256; ok = !need || load('fire.unlock', null) === need; }
    if (!ok) showLock();
    else showApp();
  }

  const newer = (a, b) => {
    const x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number);
    for (let i = 0; i < 3; i++) { if ((x[i] || 0) > (y[i] || 0)) return true; if ((x[i] || 0) < (y[i] || 0)) return false; }
    return false;
  };
  const SETUP_URL = 'https://github.com/Toka120/fire-team-lol/releases/latest/download/FIRE-LoL-Setup.exe';
  function updateNode() {
    const u = S.upd || {};
    if (u.store) return null; // Version Microsoft Store : le Store installe les mises à jour.
    let v = S.cfg && S.cfg.derniere_version;
    if (u.latest && (!v || newer(u.latest, v))) v = u.latest;
    if (!v || !newer(v, S.version)) return null;
    return h('span', null, `🔥 Nouvelle version ${v} disponible (tu as la ${S.version}). `, h('a', { href: SETUP_URL, target: '_blank' }, 'Télécharger et installer'),
      u.portable ? ' · La version portable ne se met pas à jour toute seule : installe plutôt FIRE-LoL-Setup.exe, qui se mettra à jour automatiquement.' : '');
  }

  function showLock() {
    $('lock').hidden = false;
    $('app').hidden = true;
    const up = updateNode();
    if (up) { $('lock-update').hidden = false; $('lock-update').replaceChildren(up); }
    $('lock-version').textContent = `FIRE LoL v${S.version}` + (S.cfg && S.cfg._source === 'copie locale' ? ' · hors ligne : configuration enregistrée utilisée' : '');
    const inp = $('code');
    setTimeout(() => inp.focus(), 50);
    const go = async () => {
      const v = inp.value.replace(/[^a-z0-9]/gi, '').toUpperCase();
      if (!v) return;
      $('code-ok').disabled = true;
      let ok = false, why = '';
      $('code-err').hidden = true;
      $('code-ok').textContent = 'Vérification…';
      try {
        if (S.cfg.code_scrypt) { const r = await window.fire.unlock(v); ok = !!(r && r.ok); why = (r && r.error) || ''; }
        else { const hsh = await window.fire.hash(v); ok = hsh === S.cfg.code_sha256; if (ok) save('fire.unlock', hsh); }
      } catch (e) { ok = false; why = String((e && e.message) || e); }
      $('code-ok').disabled = false;
      $('code-ok').textContent = 'Entrer';
      if (ok) {
        $('lock').hidden = true;
        showApp();
      } else {
        $('code-err').textContent = why ? `Le code n'a pas pu être vérifié (${why}). Envoie ce message à Toka120.` : 'Code incorrect. Demande-le à ton coach.';
        $('code-err').hidden = false;
        inp.select();
      }
    };
    $('code-ok').onclick = go;
    inp.onkeydown = (e) => { $('code-err').hidden = true; if (e.key === 'Enter') go(); };
  }

  function showApp() {
    $('app').hidden = false;
    wire();
    S.upd = { state: 'idle' };
    if (window.fire.update) {
      window.fire.update.on((m) => { S.upd = { ...S.upd, ...m }; renderUpdate(); });
      window.fire.update.state().then((m) => { S.upd = { ...m, ...S.upd, auto: m.auto, portable: m.portable, store: m.store }; renderUpdate(); }).catch(() => {});
    }
    if (window.fire.onNotifyGo) window.fire.onNotifyGo((sec) => { if (sec === 'chat') go('chat'); else if (sec) go(sec); });
    if (window.fire.background) window.fire.background.get().then((b) => { S.bg = b; if (S.section === 'settings' && !typing()) renderSettings(); }).catch(() => {});
    renderUpdate();
    // Page d'ouverture choisie dans Paramètres (ou la dernière page ouverte).
    { const st = load('fire.start', 'stats'); const sec = st === 'last' ? load('fire.lastSection', 'stats') : st;
      if (sec && sec !== 'stats' && START_PAGES.some(([k]) => k === sec)) go(sec); }
    render();
    chatInit();
    actInit();
    modInit(); voiceTrayInit();
    loadGuides();
    window.fire.coach.state().then((c) => { S.coachState = c; if (SUB()) { subInit(); renderNav(); if (!SUB_OK.has(S.section)) go('stats'); else if (!typing()) render(); } else if (S.section === 'coach' && !typing()) render(); }).catch(() => {});
    loadFiches();
    loadPools();
    loadPlanning();
    loadPatch();
    loadLolPatch();
    setInterval(() => loadLolPatch(true), 6 * 3600 * 1000);
    loadChampions();
    window.fire.team([]).then((r) => { if (r && r.games) { S.teamGames = r.games; if (S.section === 'stats' && !typing()) render(); } }).catch(() => {});
    refreshAll();
    S.timer = setInterval(refreshContent, REFRESH_EVERY);
    // Créneaux avec un coach : tant qu'une demande attend (ou sur le PC d'un coach), on regarde chaque minute
    // pour prévenir le joueur dès que le coach accepte ou refuse.
    setInterval(() => {
      if (!S.plan || S.planEdit) return;
      const waiting = S.moi && resaList().some((x) => x.s === S.moi && x.st === 'attente');
      if (waiting || S.coachState.coach) loadPlanning();
    }, 60 * 1000);
    if (!S.moi && !load('fire.moi.demande', false)) later(askWho);
  }

  function wire() {
    const sel = $('period'), since = $('since');
    const today = new Date();
    const min = new Date(Date.now() - 30 * 86400000);
    since.max = FC.ymd(today);
    if (S.obj) {
      const o = document.createElement('option');
      o.value = 'obj';
      o.textContent = `Semaine en cours (objectif)`;
      sel.insertBefore(o, sel.firstChild);
      sel.value = 'obj';
    }
    if (S.debut) {
      const o = document.createElement('option');
      o.value = 'debut';
      o.textContent = `Depuis le ${dateFr(S.debut)} (début)`;
      sel.insertBefore(o, sel.firstChild);
      sel.value = 'debut';
    }
    since.min = FC.ymd(min);
    sel.onchange = () => {
      S.period = sel.value;
      since.hidden = S.period !== 'since';
      if (S.period === 'since' && !S.since) { S.since = FC.ymd(new Date(Date.now() - 7 * 86400000)); since.value = S.since; }
      S.jour = 'tous';
      render();
    };
    since.onchange = () => { if (since.value && since.validity.valid) { S.since = since.value; S.jour = 'tous'; render(); } };
    $('refresh').onclick = () => refreshContent();
    $('back').onclick = () => {
      if (S.section === 'stats') { S.view = 'hub'; S.player = null; } else if (S.section === 'guides') { if (S.theme) S.theme = null; else S.guideCat = null; } else S.ficheId = null;
      render();
      window.scrollTo(0, 0);
    };
    let t = null;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (S.section === 'stats') render(); }, 200); });
  }

  // ---------- Contenu toujours à jour ----------
  // Au lancement puis toutes les 10 minutes : liste des joueurs et objectif, thèmes, fiches du coach, stats dpm.lol.
  function loadGuides() {
    return window.fire.guides().then((g) => {
      S.guides = (g && g.themes) || [];
      S.assets = (g && g.assets) || S.assets || {}; // vraie carte de la Faille, partagée par les visuels
      S.guideCats = (g && g.categories) || [];
      if (S.section === 'guides' && !typing()) render();
    }).catch(() => { S.guides = S.guides || []; });
  }

  async function refreshContent() {
    try {
      const c = await window.fire.config();
      if (c && Array.isArray(c.joueurs) && c.joueurs.length) {
        S.cfg = c;
        // Les membres acceptés (et ma demande en attente) ne sont pas dans joueurs.json : on les garde.
        S.players = c.joueurs.slice();
        membresMerge(load('fire.membres', []));
        S.coachs = Array.isArray(c.coachs) ? c.coachs : [];
        S.cfgObj = (c.objectif && c.objectif.debut) ? c.objectif : null;
        applyWeek();
        renderUpdate();
      }
    } catch (e) { /* hors ligne : on garde la configuration actuelle */ }
    loadGuides();
    loadFiches();
    loadPools();
    loadPlanning();
    refreshAll();
    if (window.fire.update) window.fire.update.check().catch(() => {});
  }

  // ---------- Mise à jour de l'application ----------
  let countdown = null;
  function stopCountdown() { clearInterval(countdown); countdown = null; }
  // user : le joueur a cliqué « Redémarrer maintenant » (FIRE revient au premier plan). Sinon, relance automatique :
  // pas pendant une partie de LoL, et FIRE revient réduit, sans passer devant une autre fenêtre.
  function installNow(user) { if (user === true) stopCountdown(); window.fire.update.install({ user: user === true }).then((ok) => { if (ok) stopCountdown(); }).catch(() => {}); }
  function startCountdown() {
    if (countdown) return;
    S.updLeft = 15;
    countdown = setInterval(() => {
      // FIRE caché ou réduit (quelqu'un joue, par exemple) : on installe sans rien afficher,
      // et la nouvelle version revient cachée près de l'horloge.
      // Pas de redémarrage pendant un appel vocal : on attend la fin.
      const inCall = !!(window.FireVoice && window.FireVoice.state().on);
      if (inCall !== !!S.updVoice) { S.updVoice = inCall; renderUpdate(); }
      if (inCall) return;
      if (document.visibilityState !== 'visible') { window.fire.update.install({ quiet: true }).catch(() => {}); return; }
      // Fenêtre visible mais pas au premier plan : on attend que le joueur revienne sur FIRE.
      if (!document.hasFocus()) { S.updAway = true; renderUpdate(); return; }
      S.updAway = false;
      if (typing() || (S.draft && S.draft.busy)) { renderUpdate(); return; } // on n'interrompt pas quelqu'un qui écrit
      S.updLeft--;
      if (S.updLeft <= 0) { S.updLeft = 0; installNow(false); } else renderUpdate();
    }, 1000);
  }
  // ----- Notifications de bureau -----
  // Réglages enregistrés sur cet ordinateur. Chaque alerte n'est envoyée qu'une fois.
  const NOTIF_DEF = { on: true, app: true, upd: true, plan: true, resa: true, coach: true, vocal: true, chat: true };
  const notifPrefs = () => ({ ...NOTIF_DEF, ...load('fire.notif', {}) });
  function notifyDesk(kind, title, body, section) {
    const p = notifPrefs();
    if (!p[kind]) return;
    if (p.app) popup(title, body, section);
    if (p.on && window.fire.notify) deskNotify({ title, body, section }).catch(() => {});
  }
  // Pop-up dans FIRE : descend du haut de la fenêtre et reste jusqu'à ce qu'on clique sur la croix.
  function popup(title, body, section) {
    let zone = document.getElementById('popups');
    if (!zone) { zone = h('div', { id: 'popups', 'aria-live': 'polite' }); document.body.append(zone); }
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    const el = h('div', { class: 'popup', role: 'status' },
      h('div', { class: 'popup-body', onclick: () => { if (section) go(section); close(); } }, h('b', null, title), h('p', null, body), section ? h('span', { class: 'popup-go' }, 'Ouvrir →') : null),
      h('button', { class: 'popup-x', title: 'Fermer', 'aria-label': 'Fermer', onclick: close }, '✕'));
    zone.append(el);
    while (zone.children.length > 3) zone.firstChild.remove();
  }
  function notifUpdate() {
    const u = S.upd || {};
    if (u.store) return;
    let v = null, body = '';
    if (u.auto && u.state === 'ready' && u.version) { v = u.version; body = `La version ${v} est téléchargée. Ouvre FIRE et clique sur « Redémarrer et installer » dans Paramètres.`; }
    else if (!u.auto) {
      let l = S.cfg && S.cfg.derniere_version;
      if (u.latest && (!l || newer(u.latest, l))) l = u.latest;
      if (l && newer(l, S.version)) { v = l; body = `La version ${v} est disponible (tu as la ${S.version}). Ouvre Paramètres pour l'installer.`; }
    }
    if (!v) return;
    const p = notifPrefs();
    // Le pop-up revient à chaque ouverture de FIRE tant que la mise à jour n'est pas installée ; la notification Windows, une seule fois.
    if (S.popV !== v) { S.popV = v; if (p.app && p.upd) popup('🔥 Mise à jour disponible', body, 'settings'); }
    if (load('fire.notif.v', '') === v) return;
    save('fire.notif.v', v);
    if (p.on && p.upd && window.fire.notify) deskNotify({ title: '🔥 Mise à jour disponible', body, section: 'settings' }).catch(() => {});
  }
  // Empreinte des jours de jeu à venir, pour voir si le coach a changé le planning.
  function planSig() {
    const t = todayYmd(), j = (S.plan && S.plan.jours) || {};
    return JSON.stringify(Object.keys(j).filter((d) => d >= t).sort().map((d) => [d, (j[d].heures || []).slice().sort((a, b) => a - b), j[d].type || '', j[d].note || '']));
  }
  // Les coachs ne jouent pas les sessions d'équipe : pas de notification ni de pastille pour le planning de base.
  const isCoachUser = () => !!(S.moi && coachOf(S.moi));
  function notifPlanning(mine) {
    const sig = planSig();
    const prev = load('fire.notif.plan', null);
    save('fire.notif.plan', sig);
    if (mine || prev === null || prev === sig || isCoachUser()) return;
    const was = new Map(JSON.parse(prev).map((x) => [x[0], JSON.stringify(x)]));
    const now = JSON.parse(sig);
    const added = now.filter((x) => !was.has(x[0])).map((x) => x[0]);
    const changed = now.filter((x) => was.has(x[0]) && was.get(x[0]) !== JSON.stringify(x)).map((x) => x[0]);
    const removed = [...was.keys()].filter((d) => d >= todayYmd() && !now.some((x) => x[0] === d));
    const parts = [];
    if (added.length) parts.push(`${added.length > 1 ? 'nouveaux jours' : 'nouveau jour'} : ${added.slice(0, 3).map(dateFr).join(', ')}`);
    if (changed.length) parts.push(`horaires changés : ${changed.slice(0, 3).map(dateFr).join(', ')}`);
    if (removed.length) parts.push(`${removed.length > 1 ? 'jours retirés' : 'jour retiré'} : ${removed.slice(0, 3).map(dateFr).join(', ')}`);
    if (!parts.length) return;
    notifyDesk('plan', '📅 Le planning a changé', cap(parts.join(' · ')) + '. Vérifie tes disponibilités.', 'planning');
  }
  // Créneaux avec les coachs : le joueur est prévenu quand le coach valide ou refuse sa demande,
  // le coach (code coach sur ce PC) quand un joueur demande un créneau.
  function resaList() {
    const out = [];
    for (const [d, byCoach] of Object.entries((S.plan && S.plan.resas) || {})) {
      if (d < todayYmd()) continue;
      for (const [c, byHour] of Object.entries(byCoach || {})) for (const [hr, who] of Object.entries(byHour || {})) for (const [s, x] of Object.entries(who || {})) out.push({ d, c, hr: Number(hr), s, st: x.statut });
    }
    return out;
  }
  function notifResas(mine) {
    const coach = !!S.coachState.coach;
    const key = (x) => [x.d, x.c, x.hr, x.s].join('|');
    const list = resaList().filter((x) => coach ? x.st === 'attente' : x.s === S.moi);
    const sig = JSON.stringify(list.map((x) => [key(x), x.st]).sort());
    const store = 'fire.notif.resa.' + (coach ? 'coach' : S.moi || '');
    const prev = load(store, null);
    save(store, sig);
    if (mine || prev === null || prev === sig || (!coach && !S.moi)) return;
    const was = new Map(JSON.parse(prev));
    const when = (x) => `${dateFr(x.d)} à ${x.hr}h avec ${vocalName(x.c)}`;
    if (coach) {
      const fresh = list.filter((x) => !was.has(key(x)));
      if (fresh.length) S.planTab = 'coachs';
      if (fresh.length) notifyDesk('resa', '🎓 Demande de créneau', fresh.length === 1 ? `${vocalName(fresh[0].s)} demande le ${when(fresh[0])}.` : `${fresh.length} nouvelles demandes, dont ${vocalName(fresh[0].s)} le ${when(fresh[0])}.`, 'planning');
      return;
    }
    const done = list.filter((x) => (x.st === 'ok' || x.st === 'refus') && was.get(key(x)) !== x.st);
    const day = (x) => `${dateFr(x.d)} à ${x.hr}h`;
    const more = (l) => (l.length > 1 ? ` (+${l.length - 1} autre${l.length > 2 ? 's' : ''})` : '');
    const ok = done.filter((x) => x.st === 'ok'), ko = done.filter((x) => x.st === 'refus');
    if (ok.length || ko.length) S.planTab = 'coachs';
    if (ok.length) notifyDesk('resa', '✅ Créneau accepté', `${vocalName(ok[0].c)} a accepté ton créneau du ${day(ok[0])}.` + more(ok), 'planning');
    if (ko.length) notifyDesk('resa', '❌ Créneau refusé', `${vocalName(ko[0].c)} a refusé ton créneau du ${day(ko[0])}.` + more(ko), 'planning');
  }
  function notifFiches() {
    const ids = (S.fiches || []).map((f) => f.id);
    const known = load('fire.notif.fiches', null);
    save('fire.notif.fiches', ids.slice(-300));
    if (known === null) return;
    const fresh = (S.fiches || []).filter((f) => !known.includes(f.id) && !S.seen.has(f.id));
    if (!fresh.length) return;
    const body = fresh.length === 1 ? `« ${fresh[0].titre} »` : `${fresh.length} nouveautés, dont « ${fresh[0].titre} »`;
    S.coachTab = fresh.every(isNote) ? 'notes' : 'fiches';
    notifyDesk('coach', fresh.every(isNote) ? '📝 Nouvelle note du coach' : '📣 Nouveau du coach', body, 'coach');
  }

  function renderUpdate() {
    notifUpdate();
    const box = $('update');
    const u = S.upd || {};
    let node = null;
    if (u.auto && (u.state === 'available' || u.state === 'progress')) {
      node = h('span', null, `⬇ Nouvelle version ${u.version || ''} : téléchargement en cours… ${u.percent || 0} %`);
    } else if (u.auto && u.state === 'ready') {
      const now = h('button', { class: 'linkbtn', onclick: () => installNow(true) }, 'Redémarrer maintenant');
      if (S.updLater) node = h('span', null, `✓ La version ${u.version} s'installera à la fermeture de FIRE LoL. `, now);
      else {
        startCountdown();
        const paused = typing() || (S.draft && S.draft.busy);
        node = h('span', null, `✓ Version ${u.version} prête : FIRE LoL redémarre ${S.updVoice ? 'à la fin de ton appel vocal' : S.updAway ? 'quand tu reviens sur FIRE' : paused ? 'dès que tu as fini d\'écrire' : `dans ${S.updLeft} s`} pour l'installer. `, now, ' · ',
          h('button', { class: 'linkbtn', onclick: () => { S.updLater = true; stopCountdown(); renderUpdate(); } }, 'Plus tard'));
      }
    } else if (!u.auto) node = updateNode();
    box.hidden = !node;
    box.replaceChildren(...(node ? [node] : []));
    if ($('nav').childElementCount) renderNav();
    if (S.section === 'settings' && !typing()) renderSettings();
  }

  // ----- Onglet Paramètres -----
  async function checkUpdate() {
    S.updMsg = 'Recherche de la dernière version…';
    S.updChecking = true;
    renderSettings();
    let r;
    try { r = await window.fire.update.check(); } catch (e) { r = { ok: false, error: String(e) }; }
    S.updChecking = false;
    if (r && r.latest) S.upd = { ...S.upd, latest: r.latest };
    if (!r || !r.ok) S.updMsg = '⚠ Vérification impossible : ' + ((r && r.error) || 'pas de connexion');
    else if (r.store) S.updMsg = 'Les mises à jour arrivent par le Microsoft Store ✓';
    else if (!r.auto) S.updMsg = (r.latest && newer(r.latest, S.version)) ? `La version ${r.latest} est disponible : télécharge-la avec le bouton ci-dessous.` : 'Tu as déjà la dernière version ✓';
    else if (r.state === 'ready') S.updMsg = 'La nouvelle version est prête : clique sur « Redémarrer et installer ».';
    else if (r.state === 'progress' || r.state === 'available') S.updMsg = 'Téléchargement déjà en cours…';
    else if (r.found && newer(r.found, S.version)) S.updMsg = `Version ${r.found} trouvée : téléchargement en cours, puis installation.`;
    else S.updMsg = 'Tu as déjà la dernière version ✓';
    S.updLater = false;
    renderUpdate();
    renderSettings();
  }

  // Carte « Notifications sur le bureau » des Paramètres.
  function notifCard() {
    const p = notifPrefs();
    const b = S.bg || {};
    const set = (k, v) => { save('fire.notif', { ...notifPrefs(), [k]: v }); renderSettings(); };
    const box = (checked, label, onchange, disabled) => h('label', { class: 'nrow' + (disabled ? ' off' : '') },
      h('input', { type: 'checkbox', checked: checked ? true : null, disabled: disabled ? true : null, onchange: (e) => onchange(e.target.checked) }), h('span', null, label));
    const setBg = async (m) => { try { S.bg = await window.fire.background.set(m); } catch (e) { /* ignore */ } renderSettings(); };
    return h('div', { class: 'card settings-card' },
      h('h2', null, '🔔 Notifications'),
      h('p', { class: 'muted small' }, 'Clique sur une notification pour ouvrir la bonne page de FIRE.'),
      box(p.app, 'Pop-up en haut de FIRE (avec une croix pour le fermer)', (v) => set('app', v)),
      box(p.on, 'Notification sur le bureau Windows (en bas de l’écran, même si tu es dans une autre application)', (v) => set('on', v)),
      h('p', { class: 'muted small nlab' }, 'Me prévenir quand :'),
      h('div', { class: 'nsub' },
        box(p.upd, '🔥 Une mise à jour de FIRE est disponible', (v) => set('upd', v), !p.on && !p.app),
        box(p.plan, '📅 Le coach a changé le planning (jour ajouté, retiré ou horaires modifiés)', (v) => set('plan', v), !p.on && !p.app),
        box(p.chat, '💬 Nouveau message dans la discussion (quand FIRE n’est pas au premier plan)', (v) => set('chat', v), !p.on),
        box(p.dm !== false, '🔒 Nouveau message privé', (v) => set('dm', v), !p.on),
        box(p.resa, '🎓 Créneau avec un coach : ta demande est acceptée ou refusée (coachs : un joueur demande un créneau)', (v) => set('resa', v), !p.on && !p.app),
        box(p.coach, '📣 Nouvelle fiche ou note dans « Parole du coach »', (v) => set('coach', v), !p.on && !p.app),
        box(p.vocal, '🎙️ Un coéquipier arrive dans le salon vocal (notification Windows, une fois par personne toutes les 10 min)', (v) => set('vocal', v), !p.on)),
      h('div', { class: 'row' }, h('button', { class: 'btn-ghost', disabled: (p.on || p.app) ? null : true, onclick: () => {
        if (p.app) popup('🔥 FIRE LoL', 'Les notifications fonctionnent ✓', null);
        if (p.on && window.fire.notify) deskNotify({ title: '🔥 FIRE LoL', body: 'Les notifications fonctionnent ✓', section: 'settings', force: true });
      } }, '🔔 Envoyer une notification de test')),
      b.notif === false ? h('p', { class: 'bad small' }, '⚠ Ton ordinateur bloque les notifications. Active-les dans Windows : Paramètres › Système › Notifications.') : null,
      h('h3', { class: 'nh' }, 'Recevoir les notifications même fenêtre fermée'),
      h('p', { class: 'muted small' }, 'FIRE vérifie le planning, les messages et les mises à jour toutes les 10 minutes, mais seulement quand il est ouvert.'),
      window.fire.background ? [
        box(b.bg, 'Quand je ferme la fenêtre, garder FIRE ouvert en arrière-plan (icône 🔥 près de l’horloge, clic droit › Quitter pour le fermer vraiment)', (v) => setBg({ bg: v })),
        box(b.startup, 'Lancer FIRE en arrière-plan au démarrage de Windows', (v) => setBg({ startup: v, bg: v ? true : undefined }), !b.canStartup)
      ] : null);
  }

  // Ouverture de FIRE : la page affichée au démarrage et l'écran (moniteur) où la fenêtre apparaît.
  const START_PAGES = [['stats', '📊 Stats des joueurs'], ['chat', '💬 Discussion'], ['pool', '🧙 POOL'], ['planning', '📅 Planning'], ['draft', '⚡ Draft'], ['jeux', '🎮 Détente'], ['train', '🎯 Micro'],
    ['vocal', '🎙️ Vocal'], ['guides', '📚 Lanes et principes'], ['coach', '📣 Parole du coach'], ['worlds', '🏆 E-sport'], ['lolpatch', '📜 Patchs LoL']];
  const SCR = { list: null, current: 'last', here: null, loading: false };
  function startCard() {
    if (!SCR.list && !SCR.loading && window.fire.win) {
      SCR.loading = true;
      window.fire.win.displays().then((r) => { SCR.list = r.list || []; SCR.current = r.current || 'last'; SCR.here = r.here; }).catch(() => { SCR.list = []; })
        .finally(() => { SCR.loading = false; if (S.section === 'settings' && !typing()) renderSettings(); });
    }
    const st = load('fire.start', 'stats');
    const setScr = (id) => { SCR.current = id; window.fire.win.setDisplay(id).then(() => window.fire.win.displays()).then((r) => { SCR.here = r.here; renderSettings(); }).catch(() => {}); renderSettings(); };
    const screens = SCR.list || [];
    return h('div', { class: 'card settings-card' },
      h('h2', null, '🚀 Ouverture de FIRE'),
      h('p', { class: 'muted small' }, 'Choisis la page qui s’affiche quand tu ouvres FIRE, et l’écran où la fenêtre apparaît.'),
      h('h3', { class: 'th-gt' }, 'Page d’ouverture'),
      h('div', { class: 'row st-row' }, h('select', { class: 'inp st-sel', onchange: (e) => { save('fire.start', e.target.value); renderSettings(); } },
        h('option', { value: 'last', selected: st === 'last' ? true : null }, '↩️ La dernière page ouverte'),
        START_PAGES.map(([k, l]) => h('option', { value: k, selected: st === k ? true : null }, l)))),
      window.fire.win ? [h('h3', { class: 'th-gt' }, 'Écran d’apparition'),
        h('div', { class: 'scr-grid' },
          h('button', { class: 'scr' + (SCR.current === 'last' ? ' on' : ''), onclick: () => setScr('last') }, h('span', { class: 'scr-ico' }, '↩️'), h('b', null, 'Là où je l’ai laissé'), h('small', { class: 'muted' }, 'Même écran, même taille et même position qu’à la fermeture')),
          h('button', { class: 'scr' + (SCR.current === 'primary' ? ' on' : ''), onclick: () => setScr('primary') }, h('span', { class: 'scr-ico' }, '🖥️'), h('b', null, 'Écran principal'), h('small', { class: 'muted' }, 'Celui choisi comme principal dans Windows')),
          screens.map((d) => h('button', { class: 'scr' + (SCR.current === d.id ? ' on' : ''), onclick: () => setScr(d.id) },
            h('span', { class: 'scr-ico scr-n' }, String(d.n)), h('b', null, `Écran ${d.n}` + (d.primary ? ' (principal)' : '')),
            h('small', { class: 'muted' }, `${d.w} × ${d.h}` + (d.label ? ` · ${d.label}` : '') + (SCR.here === d.id ? ' · FIRE est ici' : ''))))),
        screens.length === 1 ? h('p', { class: 'muted small' }, 'Un seul écran est branché pour l’instant. Branche ton deuxième écran pour le choisir ici.') : null] : null);
  }
  // Polices d'écriture : un aperçu par police, pour le texte et pour les titres, et la taille du texte.
  function fontCard() {
    const f = fontPrefs();
    const set = (k, v) => { save('fire.font', { ...f, [k]: v }); applyFonts(); renderSettings(); };
    const sample = (name, isTitle) => name === '' ? 'Thème' : name === '=ui' ? 'Texte' : isTitle ? 'Team FIRE' : 'Aa Bb 123';
    const grid = (list, k, isTitle) => h('div', { class: 'fnt-grid' }, list.map(([id, label]) => h('button', { class: 'fnt' + (isTitle ? ' t' : ''), 'aria-pressed': String((f[k] || '') === id), onclick: () => set(k, id) },
      h('span', { class: 'fnt-s', style: id && id !== '=ui' ? `font-family:'${id}', sans-serif` : '' }, sample(id, isTitle)), h('small', { class: 'muted' }, label))));
    return h('div', { class: 'card settings-card' },
      h('h2', null, '🔤 Polices d’écriture'),
      h('p', { class: 'muted small' }, 'Choisis la police du texte et celle des titres. « Selon le thème » garde la police de ton thème. Le choix est gardé sur cet ordinateur.'),
      h('h3', { class: 'th-gt' }, 'Texte'), grid(FONT_UI, 'ui', false),
      h('h3', { class: 'th-gt' }, 'Titres'), grid(FONT_TITLE, 'title', true),
      h('h3', { class: 'th-gt' }, 'Taille du texte'),
      h('div', { class: 'row' }, [[90, 'Petite'], [100, 'Normale'], [110, 'Grande'], [120, 'Très grande']].map(([z, l]) =>
        h('button', { class: 'chip', 'aria-pressed': String(Number(f.zoom || 100) === z), onclick: () => set('zoom', z) }, `${l} · ${z} %`))),
      f.ui || f.title || Number(f.zoom || 100) !== 100 ? h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => { save('fire.font', {}); applyFonts(); renderSettings(); } }, '↺ Polices par défaut')) : null);
  }

  // ----- Paramètres façon Discord : catégories à gauche, réglages à droite -----
  // Comme Discord : des groupes (titres gris) et leurs sous-menus ; certaines pages ont des onglets en haut.
  const SET_GROUPS = [
    ['Paramètres utilisateur', [['compte', '🪪', 'Mon compte'], ['profil', '👤', 'Profil'], ['confid', '🔒', 'Confidentialité']]],
    ['Application', [['apparence', '🎨', 'Apparence'], ['texte', '🔤', 'Polices et texte'], ['access', '♿', 'Accessibilité'], ['voix', '🎙️', 'Voix et vidéo'],
      ['notifs', '🔔', 'Notifications'], ['raccourcis', '⌨️', 'Raccourcis clavier'], ['streamer', '📺', 'Mode streamer'], ['ouverture', '🚀', 'Ouverture de FIRE'], ['avance', '⚙️', 'Avancé']]],
    ['FIRE LoL', [['nouveautes', '🆕', 'Nouveautés'], ['maj', '🔄', 'Mises à jour'], ['bug', '🐞', 'Signaler un bug'], ['apropos', 'ℹ️', 'À propos']]],
  ];
  const SET_TABS = SET_GROUPS.flatMap(([, items]) => items);
  const SET_SUB = { apparence: [['theme', 'Thème'], ['couleurs', 'Couleur et fond'], ['affichage', 'Affichage']], notifs: [['alertes', 'Alertes'], ['dnd', 'Ne pas déranger'], ['son', 'Son']], profil: [['statut', 'Statut'], ['carte', 'Carte de profil']] };
  const uxBox = (checked, label, sub, onchange, disabled) => h('label', { class: 'nrow ux-row' + (disabled ? ' off' : '') },
    h('input', { type: 'checkbox', checked: checked ? true : null, disabled: disabled ? true : null, onchange: (e) => onchange(e.target.checked) }),
    h('span', null, h('b', null, label), sub ? h('small', { class: 'muted' }, sub) : null));
  const uxSeg = (list, cur, on) => h('div', { class: 'row ux-seg' }, list.map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': String(cur === v), onclick: () => on(v) }, l)));
  const uxCard = (title, sub, ...kids) => h('div', { class: 'card settings-card' }, h('h2', null, title), sub ? h('p', { class: 'muted small' }, sub) : null, ...kids);
  // Choix d'un skin (champion puis skin) : bannière du profil et fond d'écran.
  function skinPicker(cur, onPick) {
    if (!J.data && !J.loading) loadJeux().then(() => { if (S.section === 'settings' && !typing()) renderSettings(); });
    const champs = (J.data && J.data.champs) || ((S.champList && S.champList.list) || []).map((c) => ({ id: c.id, name: c.name, skins: [{ num: 0, name: c.name }] }));
    const ch = champs.find((c) => c.id === (cur && cur.c));
    const skins = ch ? (ch.skins && ch.skins.length ? ch.skins : [{ num: 0, name: ch.name }]) : [];
    return h('div', { class: 'row skin-pick' },
      h('select', { class: 'inp', onchange: (e) => onPick(e.target.value ? { c: e.target.value, n: 0 } : null) },
        h('option', { value: '' }, '— Champion —'), champs.map((c) => h('option', { value: c.id, selected: ch && ch.id === c.id ? true : null }, c.name))),
      ch ? h('select', { class: 'inp', onchange: (e) => onPick({ c: ch.id, n: Number(e.target.value) || 0 }) },
        skins.map((k) => h('option', { value: String(k.num), selected: Number(cur.n) === k.num ? true : null }, k.name || ch.name))) : null,
      ch ? h('img', { class: 'skin-prev', src: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${ch.id}_${Number(cur.n) || 0}.jpg`, alt: '', onerror: (e) => { e.target.style.visibility = 'hidden'; } }) : null);
  }
  function profilCards() {
    const me = vocalMe();
    return [
      uxCard('👤 Qui es-tu ?', 'Choisis ton pseudo : FIRE te reconnaît (tierlist dans POOL, discussion, vocal).', h('div', { class: 'row' }, meSelect())),
      uxCard('🟢 Statut', 'Ce que l’équipe voit à côté de ton nom. « Occupé » coupe aussi tes notifications. « En game » s’affiche tout seul pendant une partie.',
        uxSeg(['online', 'busy', 'away', 'invisible'].map((k) => [k, ST_LABEL[k].join(' ')]), UX.status, (v) => { setUx({ status: v }); actLog('statut', 'Statut : ' + ST_LABEL[v][1]); renderSettings(); }),
        LIVE.mine ? h('p', { class: 'good small' }, '🎮 Tu es en game : l’équipe le voit.') : null),
      uxCard('🪪 Ta carte de profil', 'Visible par l’équipe quand on clique sur ton nom dans la discussion.',
        h('label', { class: 'fld' }, h('span', null, 'Petite bio (140 caractères)'),
          h('textarea', { class: 'inp ux-bio', maxlength: 140, rows: 2, placeholder: 'Ex. : main Ahri, je flame pas promis 😇', onchange: (e) => setUx({ bio: e.target.value.slice(0, 140) }) }, UX.bio || '')),
        h('div', { class: 'row' }, h('span', null, 'Couleur de ton pseudo'),
          h('input', { type: 'color', class: 'ux-color', value: UX.color || '#f5a524', onchange: (e) => { setUx({ color: e.target.value }); renderSettings(); } }),
          UX.color ? h('button', { class: 'btn-ghost', onclick: () => { setUx({ color: '' }); renderSettings(); } }, 'Couleur normale') : null),
        h('div', { class: 'fld' }, h('span', null, 'Bannière (un skin de LoL)'), skinPicker(UX.banner, (b) => { setUx({ banner: b }); renderSettings(); })),
        h('div', { class: 'fld' }, h('span', null, 'Mes jeux (8 au plus)'),
          h('div', { class: 'row pf-pick' }, GAME_LIST.concat((UX.games || []).filter((g) => !GAME_LIST.some(([n]) => n === g)).map((g) => [g, '🎮'])).map(([g, ico]) => {
            const on = (UX.games || []).includes(g);
            return h('button', { class: 'chip', 'aria-pressed': String(on), onclick: () => { const l = new Set(UX.games || []); if (on) l.delete(g); else if (l.size < 8) l.add(g); setUx({ games: [...l] }); renderSettings(); } }, ico + ' ' + g);
          }),
            h('input', { class: 'inp pf-other', placeholder: 'Autre jeu… (Entrée)', maxlength: 24, onkeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { const l = new Set(UX.games || []); if (l.size < 8) l.add(e.target.value.trim().slice(0, 24)); setUx({ games: [...l] }); renderSettings(); } } }))),
        me ? h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => openProfile(me) }, '👀 Voir ma carte')) : h('p', { class: 'muted small' }, 'Choisis d’abord qui tu es.')),
    ];
  }
  // Aperçu du fond d'écran : une mini-FIRE (menu, cartes) par-dessus l'image, avec le flou et l'assombrissement choisis.
  function bgUrl(b) {
    if (b.type === 'skin' && /^[A-Za-z]+$/.test(b.c || '')) return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${b.c}_${Number(b.n) || 0}.jpg`;
    if (b.type === 'image') return load('fire.uxbgimg', '') || '';
    return '';
  }
  function bgPreview(b) {
    const url = bgUrl(b);
    const card = (w) => h('i', { class: 'bgp-card', style: `width:${w}%` }, h('i', { class: 'bgp-l' }), h('i', { class: 'bgp-l s' }), h('i', { class: 'bgp-btn' }));
    return h('div', { class: 'bgp', style: `--bgp-blur:${(Number(b.blur) || 0) * 0.5}px;--bgp-dim:${(Number(b.dim) || 0) / 100}` },
      h('div', { class: 'bgp-img', style: url ? `background-image:url("${url}")` : '' }), h('div', { class: 'bgp-dimmer' }),
      h('div', { class: 'bgp-ui' }, h('div', { class: 'bgp-side' }, h('b', null, '🔥 FIRE'), ...[0, 1, 2, 3, 4].map((i) => h('i', { class: 'bgp-nav' + (i === 1 ? ' on' : '') }))),
        h('div', { class: 'bgp-main' }, h('i', { class: 'bgp-hero' }), h('div', { class: 'bgp-row' }, card(48), card(48)), h('div', { class: 'bgp-row' }, card(31), card(31), card(31)))),
      h('span', { class: 'bgp-tag' }, 'Aperçu'));
  }
  function bgPreviewLive(k, v) {
    const p = document.querySelector('.bgp');
    if (!p) return;
    if (k === 'blur') { p.style.setProperty('--bgp-blur', `${v * 0.5}px`); const l = document.querySelector('.bgp-blur-l'); if (l) l.textContent = `Flou : ${v} px`; }
    if (k === 'dim') { p.style.setProperty('--bgp-dim', String(v / 100)); const l = document.querySelector('.bgp-dim-l'); if (l) l.textContent = `Assombrir : ${v} %`; }
  }
  function appearanceCards(themeCard) {
    const b = UX.bg;
    const setBg = (patch) => { setUx({ bg: { ...UX.bg, ...patch } }); renderSettings(); };
    const upload = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, 1920 / img.width);
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        try { localStorage.setItem('fire.uxbgimg', JSON.stringify(cv.toDataURL('image/jpeg', 0.82))); setBg({ type: 'image' }); }
        catch (err) { alert('Image trop lourde : choisis-en une plus petite.'); }
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(f);
    } });
    const PRESET = ['#f5a524', '#ff5e3a', '#ff2bd6', '#9d5cff', '#579dff', '#00e5ff', '#2ee6c5', '#39c58a', '#ffd23d', '#ff4d6d'];
    return [
      themeCard,
      uxCard('🖌️ Couleur d’accent', 'Ta couleur pour les boutons, le menu et les liens, par-dessus le thème.',
        h('div', { class: 'row ux-acc' }, PRESET.map((c) => h('button', { class: 'acc-sw' + (UX.accent === c ? ' on' : ''), style: `background:${c}`, title: c, onclick: () => { setUx({ accent: c }); renderSettings(); } })),
          h('label', { class: 'acc-custom', title: 'Couleur personnalisée' }, '🎨', h('input', { type: 'color', value: UX.accent || '#f5a524', onchange: (e) => { setUx({ accent: e.target.value }); renderSettings(); } })),
          UX.accent ? h('button', { class: 'btn-ghost', onclick: () => { setUx({ accent: '' }); renderSettings(); } }, 'Couleur du thème') : null)),
      uxCard('🖼️ Fond d’écran', 'Un skin de LoL ou ta propre image derrière toute l’application.',
        uxSeg([['none', 'Aucun'], ['skin', '🎨 Un skin de LoL'], ['image', '📁 Mon image']], b.type, (v) => { if (v === 'image' && !load('fire.uxbgimg', '')) { upload.click(); return; } setBg({ type: v }); }),
        b.type === 'skin' ? skinPicker({ c: b.c, n: b.n }, (x) => setBg({ type: 'skin', c: x ? x.c : '', n: x ? x.n : 0 })) : null,
        b.type === 'image' ? h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => upload.click() }, '📁 Changer d’image')) : null,
        upload,
        b.type !== 'none' ? bgPreview(b) : null,
        b.type !== 'none' ? h('div', { class: 'ux-sliders' },
          h('label', { class: 'fld' }, h('span', { class: 'bgp-blur-l' }, `Flou : ${b.blur} px`), h('input', { type: 'range', min: 0, max: 30, value: b.blur,
            oninput: (e) => bgPreviewLive('blur', Number(e.target.value)), onchange: (e) => setBg({ blur: Number(e.target.value) }) })),
          h('label', { class: 'fld' }, h('span', { class: 'bgp-dim-l' }, `Assombrir : ${b.dim} %`), h('input', { type: 'range', min: 0, max: 95, value: b.dim,
            oninput: (e) => bgPreviewLive('dim', Number(e.target.value)), onchange: (e) => setBg({ dim: Number(e.target.value) }) }))) : null),
      fontCard(),
      uxCard('📐 Affichage', null,
        uxBox(UX.compact, 'Mode compact', 'Moins d’espace entre les éléments : plus de choses à l’écran sans défiler.', (v) => { setUx({ compact: v }); renderSettings(); }),
        uxBox(UX.h12, 'Heure sur 12 h (AM/PM)', `Exemple : ${UX.h12 ? '9:30 PM' : '21:30'}`, (v) => { setUx({ h12: v }); renderSettings(); })),
    ];
  }
  function accessCards() {
    return [uxCard('♿ Accessibilité', 'Pour un FIRE plus confortable à lire.',
      uxBox(UX.calm, 'Réduire les animations', 'Coupe les défilements de skins, l’arc-en-ciel RGB et les effets de mouvement.', (v) => { setUx({ calm: v }); renderSettings(); }),
      uxBox(UX.contrast, 'Contraste élevé', 'Textes secondaires et bordures plus marqués.', (v) => { setUx({ contrast: v }); renderSettings(); }),
      uxBox(UX.dys, 'Police pour la dyslexie (OpenDyslexic)', 'Des lettres plus faciles à distinguer. Passe avant la police choisie.', (v) => { setUx({ dys: v }); renderSettings(); }),
      h('label', { class: 'fld' }, h('span', null, `Saturation des couleurs : ${UX.sat} %`),
        h('input', { type: 'range', min: 30, max: 150, step: 10, value: UX.sat, onchange: (e) => { setUx({ sat: Number(e.target.value) }); renderSettings(); } })),
      UX.sat !== 100 ? h('button', { class: 'btn-ghost', onclick: () => { setUx({ sat: 100 }); renderSettings(); } }, 'Saturation normale') : null)];
  }
  function notifExtraCards() {
    const q = UX.quiet;
    return [uxCard('🌙 Ne pas déranger', 'Les notifications Windows ne s’affichent pas dans ces moments-là (elles restent dans FIRE).',
      uxBox(UX.dnd, 'Pendant une partie de LoL', 'FIRE voit que tu es en game et se tait jusqu’à la fin.', (v) => { setUx({ dnd: v }); renderSettings(); }),
      uxBox(q.on, 'Heures calmes', 'Aucune notification Windows sur ce créneau.', (v) => { setUx({ quiet: { ...q, on: v } }); renderSettings(); }),
      q.on ? h('div', { class: 'row' }, 'De ', h('input', { type: 'time', class: 'inp ux-time', value: q.from, onchange: (e) => setUx({ quiet: { ...UX.quiet, from: e.target.value } }) }),
        ' à ', h('input', { type: 'time', class: 'inp ux-time', value: q.to, onchange: (e) => setUx({ quiet: { ...UX.quiet, to: e.target.value } }) })) : null,
      notifMuted() ? h('p', { class: 'muted small' }, '🔕 En ce moment, les notifications Windows sont coupées.') : null),
      uxCard('🔊 Son des notifications', null,
        uxSeg([['windows', '🔔 Son de Windows'], ['fire', '🔥 Son FIRE'], ['silence', '🔇 Silence']], UX.nsound, (v) => { setUx({ nsound: v }); if (v === 'fire') fireChime(); renderSettings(); }))];
  }
  function vocalCards() {
    let cfg = {};
    try { cfg = FV().state().cfg || {}; } catch (e) { /* */ }
    return [uxCard('🎙️ Voix', 'Micro, casque, filtres, caméra, partage d’écran et clips sont dans les réglages du vocal.',
      uxBox(cfg.sounds !== false, 'Sons d’arrivée et de départ', 'Un petit son quand quelqu’un rejoint ou quitte le salon.', (v) => { try { FV().setCfg({ sounds: v }); } catch (e) { /* */ } setTimeout(renderSettings, 50); }),
      uxBox(cfg.duck !== false, 'Baisser le son des streams quand quelqu’un parle', 'Dans FIRE : le son d’un partage d’écran baisse pendant que l’équipe parle.', (v) => { try { FV().setCfg({ duck: v }); } catch (e) { /* */ } setTimeout(renderSettings, 50); }),
      h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => { go('vocal'); VX.drawer = true; renderVocal(); } }, '⚙️ Réglages voix et vidéo'))),
      uxCard('🔉 Baisser le son des autres applications', 'Windows sait baisser la musique, YouTube ou le jeu pendant un appel vocal. Choisis « Réduire de 80 % » dans l’onglet Communications qui s’ouvre.',
        window.fire.win && window.fire.win.soundComms ? h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => window.fire.win.soundComms() }, '🔉 Ouvrir le réglage de Windows')) : null,
        h('p', { class: 'muted small' }, 'FIRE ne peut pas changer lui-même le volume des autres programmes : c’est Windows qui s’en charge.'))];
  }
  function shortcutCards() {
    const navs = [...document.querySelectorAll('.navbtn')].slice(0, 9).map((b) => (b.querySelector('.v2-lab') || b).textContent.replace(/\d+$/, '').trim());
    const k = (keys, what) => h('div', { class: 'kb-row' }, h('span', { class: 'kb-keys' }, keys.split('+').map((x) => h('kbd', null, x))), h('span', null, what));
    return [uxCard('⌨️ Raccourcis de FIRE', 'Ils marchent quand la fenêtre de FIRE est active.',
      k('Ctrl+K', 'Recherche rapide : une page, un joueur, un jeu, un réglage, un message privé…'),
      navs.map((n, i) => k(`Ctrl+${i + 1}`, n)),
      k('Échap', 'Fermer une fenêtre (recherche, profil, diaporama…)'),
      h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: qsOpen }, '🔎 Essayer Ctrl+K'))),
      uxCard('🎮 Raccourcis du vocal', 'Couper le micro, le son, clip instantané… Ils marchent partout, même en pleine partie.',
        h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => { go('vocal'); VX.drawer = true; VX.setTab && VX.setTab('keys'); renderVocal(); } }, '⌨️ Modifier les raccourcis du vocal')))];
  }
  function privacyCards() {
    return [uxCard('📺 Mode streamer', 'Cache les messages privés, le détail des notifications et les codes quand tu streames.',
      uxSeg([['auto', '🤖 Automatique (OBS, Streamlabs…)'], ['on', 'Toujours'], ['off', 'Jamais']], UX.streamer, (v) => {
        setUx({ streamer: v }); if (window.fire.streamer) window.fire.streamer.watch(v === 'auto').then((x) => { STREAM.detected = !!x; applyUx(); renderSettings(); }).catch(() => {}); renderSettings(); }),
      h('p', { class: 'small ' + (streamerOn() ? 'good' : 'muted') }, streamerOn() ? '📺 Mode streamer actif en ce moment.' : UX.streamer === 'auto' ? 'Aucun logiciel de stream ouvert pour l’instant.' : 'Mode streamer désactivé.')),
      uxCard('💬 Messages privés', 'Qui peut t’écrire en privé dans la discussion.',
        uxSeg([['all', 'Toute l’équipe'], ['coach', 'Seulement les coachs'], ['none', 'Personne']], UX.dm, (v) => { setUx({ dm: v }); renderSettings(); })),
      uxCard('📒 Ce que voit le staff', 'Pour aider l’équipe, ton FIRE note tes actions dans l’application : pages ouvertes, messages dans les salons, vocal, planning, POOL, quiz, clips. Le créateur, les coachs, le chef d’équipe et les modérateurs les voient dans leur carnet de bord. Le contenu de tes messages privés n’est jamais noté.'),
      uxCard('🎮 Ma partie en direct', null,
        uxBox(!UX.hideLive, 'Montrer ma partie en direct à l’équipe', 'Champion, score et temps de jeu dans « Stats des joueurs ». Décoche pour jouer discrètement.', (v) => { setUx({ hideLive: !v }); if (!v) { try { FV().liveSend(null); } catch (e) { /* */ } } renderSettings(); }))];
  }
  const ADV = { gpu: null, cache: null, msg: '' };
  const EXPORT_SKIP = /^fire\.(unlock|data|chat\.|seen$|vus$|jeux\.cache|lastSection)/;
  function exportPrefs() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('fire.') && !EXPORT_SKIP.test(k)) out[k] = localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify({ app: 'FIRE LoL', v: S.version, at: new Date().toISOString(), prefs: out }, null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `FIRE-reglages-${todayYmd()}.json` });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    ADV.msg = '💾 Réglages exportés (dossier Téléchargements).'; renderSettings();
  }
  function importPrefs(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        if (!j || j.app !== 'FIRE LoL' || !j.prefs) throw new Error('fichier');
        const keys = Object.keys(j.prefs).filter((k) => k.startsWith('fire.') && !EXPORT_SKIP.test(k));
        if (!confirm(`Remplacer tes réglages par ceux de ce fichier (${keys.length} réglages) ? FIRE va se recharger.`)) return;
        keys.forEach((k) => localStorage.setItem(k, String(j.prefs[k])));
        location.reload();
      } catch (e) { ADV.msg = '⚠ Ce fichier n’est pas une sauvegarde de réglages FIRE.'; renderSettings(); }
    };
    r.readAsText(file);
  }
  function advancedCards(extra) {
    const A = window.fire.adv;
    if (A && ADV.gpu == null) { A.gpu().then((g) => { ADV.gpu = g; renderSettings(); }).catch(() => {}); A.cacheSize().then((n) => { ADV.cache = n; renderSettings(); }).catch(() => {}); ADV.gpu = {}; }
    const mb = (n) => `${(Number(n || 0) / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
    const imp = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: (e) => { const f = e.target.files && e.target.files[0]; if (f) importPrefs(f); } });
    return [
      uxCard('💾 Sauvegarder mes réglages', 'Thème, polices, notifications, vocal, profil… dans un fichier, pour tout retrouver sur un autre PC. Le code d’équipe n’est jamais dedans.',
        h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: exportPrefs }, '💾 Exporter mes réglages'), h('button', { class: 'btn-ghost', onclick: () => imp.click() }, '📂 Importer un fichier'), imp),
        ADV.msg ? h('p', { class: 'small' }, ADV.msg) : null),
      A ? uxCard('🖥️ Performances', null,
        uxBox(ADV.gpu && ADV.gpu.off === false, 'Accélération matérielle', 'Utilise la carte graphique pour l’affichage. Désactive-la si FIRE rame ou scintille pendant une partie. Il faut redémarrer FIRE.',
          (v) => A.setGpu(!v).then(() => { ADV.gpu = { ...ADV.gpu, off: !v, changed: true }; renderSettings(); })),
        ADV.gpu && ADV.gpu.changed ? h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => A.restart() }, '🔄 Redémarrer FIRE maintenant')) : null,
        h('div', { class: 'row' }, h('span', { class: 'muted small' }, `Cache : ${ADV.cache == null ? '…' : mb(ADV.cache)}`),
          h('button', { class: 'btn-ghost', onclick: () => A.clearCache().then((r) => { ADV.cache = 0; ADV.msg = `🧹 Cache vidé (${mb(r && r.freed)} libérés). Tes réglages et messages sont gardés.`; renderSettings(); }) }, '🧹 Vider le cache')),
        ADV.msg && /Cache/.test(ADV.msg) ? h('p', { class: 'small' }, ADV.msg) : null) : null,
      ...extra,
    ];
  }

  function renderSettings() {
    if (S.section !== 'settings') return;
    const u = S.upd || {};
    const view = $('view');
    const latest = u.store ? null : (u.latest || (S.cfg && S.cfg.derniere_version) || null);
    const behind = latest && newer(latest, S.version);
    const row = (k, v) => h('div', { class: 'srow' }, h('span', { class: 'muted' }, k), h('span', { class: 'sval' }, v));
    let state = '';
    if (u.auto && (u.state === 'available' || u.state === 'progress')) state = `Téléchargement de la version ${u.version || ''} : ${u.percent || 0} %`;
    else if (u.auto && u.state === 'ready') state = `Version ${u.version} téléchargée, prête à installer`;
    else if (u.auto && u.state === 'checking') state = 'Vérification en cours…';
    else if (u.auto && u.state === 'retry') state = u.error || 'Nouvel essai en cours…';
    else if (u.auto && u.state === 'error') state = u.error || 'La dernière vérification a échoué.';
    else if (u.auto) state = behind ? 'Nouvelle version disponible' : 'À jour ✓';
    else if (u.store) state = 'Mises à jour par le Microsoft Store ✓';
    else state = u.portable ? 'Version portable : mise à jour manuelle' : (behind ? 'Nouvelle version disponible' : 'À jour ✓');

    const buttons = [];
    if (u.auto && u.state === 'ready') buttons.push(h('button', { class: 'btn-fire small-btn', onclick: () => installNow(true) }, '🔄 Redémarrer et installer maintenant'));
    else if (u.auto) {
      buttons.push(h('button', { class: 'btn-fire small-btn', disabled: (S.updChecking || u.state === 'progress' || u.state === 'available' || u.state === 'retry') ? true : null, onclick: checkUpdate }, u.state === 'error' ? '🔄 Réessayer la mise à jour' : '⬇ Installer la dernière version'));
      if (u.state === 'error') buttons.push(h('a', { class: 'btn-ghost linklike', href: SETUP_URL, target: '_blank' }, '⬇ Télécharger l’installeur'));
    }
    else if (u.store) { /* rien : le Store s'en charge */ }
    else {
      buttons.push(h('button', { class: 'btn-ghost', disabled: S.updChecking ? true : null, onclick: checkUpdate }, 'Vérifier'));
      buttons.push(h('a', { class: 'btn-fire small-btn linklike', href: SETUP_URL, target: '_blank' }, '⬇ Télécharger la dernière version'));
    }

    const st = S.coachState || {};
    const C = {};
    C.version = h('div', { class: 'card settings-card' },
        h('h2', null, "🔄 Version de l'application"),
        row('Version installée', 'v' + S.version),
        u.store ? null : row('Dernière version publiée', latest ? 'v' + latest : '…'),
        row('État', state),
        h('div', { class: 'row' }, buttons),
        S.updMsg ? h('p', { class: 'small' }, S.updMsg) : null,
        h('p', { class: 'muted small' }, u.store
          ? "Installé depuis le Microsoft Store : les nouvelles versions arrivent toutes seules par le Store (Bibliothèque › Obtenir les mises à jour)."
          : u.portable
          ? "La version portable ne peut pas s'installer toute seule : télécharge FIRE-LoL-Setup.exe, qui se mettra ensuite à jour automatiquement."
          : "L'application cherche aussi les nouvelles versions toute seule, à chaque ouverture et toutes les 30 minutes."));
    C.theme = h('div', { class: 'card settings-card' },
        h('h2', null, '🎨 Thème de l’application'),
        h('p', { class: 'muted small' }, 'Les ambiances changent les couleurs, le fond, la police des titres et les effets. Le choix est gardé sur cet ordinateur.'),
        ...[[1, '✨ Ambiances'], [0, '🎨 Couleurs simples']].map(([grp, title]) => h('div', { class: 'th-grp' }, h('h3', { class: 'th-gt' }, title),
          h('div', { class: 'th-grid' + (grp ? '' : ' simple') }, THEMES.filter((x) => x[6] === grp).map(([id, label, bg, a, b2, desc]) =>
            h('button', { class: 'th-card th-' + id, 'aria-pressed': String(load('fire.theme', 'fire') === id), style: `--pa:${a};--pb:${b2};--pbg:${bg}`, onclick: () => { save('fire.theme', id); applyTheme(id); renderSettings(); } },
              h('span', { class: 'th-prev' }, h('i', { class: 'th-side' }), h('span', { class: 'th-body' }, h('b', { class: 'th-tt' }, label), h('i', { class: 'th-line' }), h('i', { class: 'th-line s' }), h('i', { class: 'th-btn' }))),
              grp ? h('small', { class: 'muted th-desc' }, desc) : null))))));
    // Interface : la V2 est active pour tout le monde ; l'ancienne reste disponible en cas de souci.
    C.v2 = window.FIREV2 ? h('div', { class: 'card settings-card' },
        h('h2', null, '✨ Interface'),
        h('p', { class: 'muted small' }, 'FIRE utilise la nouvelle interface : barre latérale, couleurs or, polices et icônes. Si quelque chose ne va pas, tu peux revenir à l’ancienne sur ce PC. FIRE se recharge quand tu changes ce réglage.'),
        h('label', { class: 'v2-optin' }, h('input', { type: 'checkbox', checked: window.FIREV2.on ? true : null, onchange: (e) => window.FIREV2.set(e.target.checked) }),
          h('span', null, h('b', null, 'Nouvelle interface (V2)'), h('br'), h('span', { class: 'muted small' }, 'Décoche pour retrouver l’ancienne interface.')))) : null;
    C.bug = h('div', { class: 'card settings-card' }, h('h2', null, '🐞 Signaler un bug'), h('p', { class: 'muted small' }, 'Un souci dans FIRE ? Décris-le avec des captures d’écran : le coach reçoit ton rapport.'),
        h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: openBug }, '🐞 Signaler un bug')));
    C.content = h('div', { class: 'card settings-card' },
        h('h2', null, '📊 Stats et contenu'),
        row('Stats dpm.lol', S.refreshing ? 'mise à jour en cours…' : (S.lastRefresh ? 'à jour à ' + hm(S.lastRefresh) : '—')),
        row('Thèmes « Lanes et principes »', S.guides ? `${S.guides.length} thèmes` : '…'),
        row('Fiches du coach', S.fiches ? String(S.fiches.length) : '…'),
        h('div', { class: 'row' }, h('button', { class: 'btn-ghost', disabled: S.refreshing ? true : null, onclick: () => { refreshContent(); setTimeout(renderSettings, 300); } }, '⟳ Tout mettre à jour maintenant')),
        h('p', { class: 'muted small' }, 'Tout se met aussi à jour tout seul à chaque ouverture, puis toutes les 10 minutes.'));
    C.access = h('div', { class: 'card settings-card' },
        h('h2', null, '🔐 Accès'),
        row("Code d'équipe", 'enregistré sur cet ordinateur ✓'),
        row('Mode coach', st.coach ? `activé (Claude ${st.claude ? '✓' : '✗'} · GitHub ${st.github ? '✓' : '✗'})` : 'non activé'),
        coachAccess());
    C.about = h('div', { class: 'card settings-card' },
        h('h2', null, 'ℹ️ À propos'),
        h('p', { class: 'small' }, 'FIRE LoL · ', h('a', { href: 'https://toka120.github.io/fire-team-lol/', target: '_blank' }, 'page de téléchargement'), ' · ',
          h('a', { href: 'https://github.com/Toka120/fire-team-lol/releases', target: '_blank' }, 'toutes les versions'), ' · ',
          h('a', { href: 'https://toka120.github.io/fire-team-lol/confidentialite.html', target: '_blank' }, 'confidentialité')),
        h('p', { class: 'muted small' }, "FIRE LoL n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc."));
    // Comme Discord : plein écran, groupes et sous-menus à gauche, la page à droite, « Échap » pour fermer.
    const tab = SET_TABS.some(([k]) => k === S.setTab) ? S.setTab : 'compte';
    const [pWho, pStatus, pCard] = profilCards();
    const [aTheme, aAccent, aBg, , aDisp] = appearanceCards(C.theme);
    const [cStream, cDm, cLive] = privacyCards();
    const [nDnd, nSon] = notifExtraCards();
    const sub = SET_SUB[tab] ? (SET_SUB[tab].some(([k]) => k === S.setSub) ? S.setSub : SET_SUB[tab][0][0]) : null;
    const pages = {
      compte: () => [pWho, adminCard(), C.access],
      profil: () => ({ statut: [pStatus], carte: [pCard] }[sub]),
      confid: () => [cDm, cLive],
      apparence: () => ({ theme: [aTheme], couleurs: [aAccent, aBg], affichage: [aDisp] }[sub]),
      texte: () => [fontCard()],
      access: () => accessCards(),
      voix: () => vocalCards(),
      notifs: () => ({ alertes: [notifCard()], dnd: [nDnd], son: [nSon] }[sub]),
      raccourcis: () => shortcutCards(),
      streamer: () => [cStream],
      ouverture: () => [startCard(), C.v2],
      avance: () => advancedCards([C.content]),
      nouveautes: () => [newsCard()],
      maj: () => [C.version],
      bug: () => [C.bug],
      apropos: () => [C.about],
    };
    const q = String(S.setQ || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const match = (label) => !q || label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q);
    const side = h('nav', { class: 'set-side' },
      h('input', { class: 'inp set-search', placeholder: 'Rechercher', value: S.setQ || '', oninput: (e) => { S.setQ = e.target.value; const pos = e.target.selectionStart; renderSettings(); const el = document.querySelector('.set-search'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } } }),
      SET_GROUPS.map(([title, items]) => {
        const shown = items.filter(([, , l]) => match(l));
        return shown.length ? [h('div', { class: 'set-gt' }, title), shown.map(([k, ico, label]) => h('button', { class: 'set-tab' + (k === tab ? ' on' : ''), onclick: () => { S.setTab = k; S.setSub = null; renderSettings(); const m = document.querySelector('.set-content'); if (m) m.scrollTop = 0; } },
          h('span', { class: 'set-ico' }, ico), h('span', null, label), k === 'maj' && behind ? h('span', { class: 'set-n' }, '1') : null)), h('div', { class: 'set-sep' })] : null;
      }));
    const cur = SET_TABS.find(([k]) => k === tab);
    const subBar = SET_SUB[tab] ? h('div', { class: 'set-subs' }, SET_SUB[tab].map(([k, l]) => h('button', { class: 'set-sub' + (k === sub ? ' on' : ''), onclick: () => { S.setSub = k; renderSettings(); } }, l))) : null;
    const box = setOverlay();
    box.replaceChildren(
      h('div', { class: 'set-left' }, side),
      h('div', { class: 'set-content' },
        h('div', { class: 'set-page' }, h('h1', { class: 'set-title' }, cur[2]), subBar, ...(pages[tab]() || []).filter(Boolean)),
        h('div', { class: 'set-close' }, h('button', { class: 'set-x', title: 'Fermer (Échap)', onclick: () => setClose() }, '✕'), h('small', null, 'ÉCHAP'))));
  }

  // ----- Navigateur intégré : les liens (op.gg, YouTube, mid.gg, dpm.lol, LoLalytics…) s'ouvrent dans FIRE -----
  // La page web s'affiche à la place du contenu, sous une barre FIRE (retour, avancer, recharger, « ← Retour à FIRE »).
  const WEB = { open: false, url: '', title: '', loading: false, back: false, fwd: false, error: '', from: null, ro: null };
  const webZoom = () => (window.fire && window.fire.zoom ? (Number(fontPrefs().zoom) || 100) / 100 : 1);
  function webRect() {
    const slot = document.getElementById('web-slot');
    if (!slot) return null;
    // La page prend toute la hauteur restante de la fenêtre.
    const top = slot.getBoundingClientRect().top;
    slot.style.height = Math.max(200, window.innerHeight - top - 12) + 'px';
    const r = slot.getBoundingClientRect(), z = webZoom();
    return { x: r.left * z, y: r.top * z, width: r.width * z, height: r.height * z };
  }
  function webOpen(url) {
    if (!window.fire.web || !/^https?:\/\//i.test(String(url || ''))) return;
    if (!WEB.open) WEB.from = S.section === 'web' ? WEB.from : S.section;
    WEB.open = true; WEB.url = url; WEB.title = ''; WEB.error = ''; WEB.loading = true;
    actLog('web', 'Page web : ' + webHost(url));
    if (S.section !== 'web') { S.prevSection = S.section; S.section = 'web'; }
    document.documentElement.classList.add('web-open');
    render();
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.fire.web.load(url, webRect()));
  }
  function webClose(silent) {
    if (!WEB.open) return;
    WEB.open = false;
    document.documentElement.classList.remove('web-open');
    if (WEB.ro) { WEB.ro.disconnect(); WEB.ro = null; }
    try { window.fire.web.close(); } catch (e) { /* */ }
    if (!silent) go(WEB.from && WEB.from !== 'web' ? WEB.from : 'stats');
  }
  const webHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  function renderWeb() {
    if (!WEB.open) { S.section = WEB.from || 'stats'; render(); return; }
    const view = $('view');
    const nav = (a) => window.fire.web.nav(a);
    const inMeet = WEB.from === 'reunion' || WEB.from === 'outils';
    const bar = h('div', { class: 'web-bar' },
      h('button', { class: 'btn-fire small-btn web-home', onclick: () => webClose() }, WEB.from === 'reunion' ? '← Salle de réunion' : WEB.from === 'outils' ? '← Outils' : '← Retour à FIRE'),
      h('button', { class: 'web-b', title: 'Page précédente', disabled: WEB.back ? null : true, onclick: () => nav('back') }, '‹'),
      h('button', { class: 'web-b', title: 'Page suivante', disabled: WEB.fwd ? null : true, onclick: () => nav('fwd') }, '›'),
      h('button', { class: 'web-b', title: WEB.loading ? 'Arrêter' : 'Recharger', onclick: () => nav(WEB.loading ? 'stop' : 'reload') }, WEB.loading ? '✕' : '⟳'),
      h('div', { class: 'web-addr' }, h('span', { class: 'web-lock' }, '🔒'), h('b', null, webHost(WEB.url)), h('span', { class: 'muted' }, WEB.title ? ' · ' + WEB.title : ''),
        WEB.loading ? h('i', { class: 'web-spin' }) : null));
    const slot = h('div', { id: 'web-slot', class: 'web-slot' }, WEB.error ? h('div', { class: 'web-err' }, h('b', null, 'Page indisponible'), h('p', { class: 'muted' }, WEB.error)) : null);
    // Salle de réunion : on passe d'un outil à l'autre sans revenir en arrière.
    // Outils : pas de barre de navigateur, l'outil s'affiche comme une page de FIRE (onglets des outils + retour).
    if (inMeet) {
      const list = WEB.from === 'outils' ? ALL_TOOLS() : MEET_TOOLS;
      const cur = list.find((t) => t.url && webHost(WEB.url) === webHost(t.url)) || {};
      const nbar = h('div', { class: 'web-bar native' },
        h('button', { class: 'btn-ghost web-home', onclick: () => webClose() }, WEB.from === 'reunion' ? '← Salle de réunion' : '← Outils'),
        h('div', { class: 'tool-tabs' }, list.map((t) => h('button', { class: 'tool-tab' + (cur.k === t.k ? ' on' : ''), onclick: () => { if (t.native) { webClose(); go(t.native); } else webOpen(t.url); } }, h('span', null, t.ico), t.name.split(' · ')[0]))),
        h('button', { class: 'web-b', title: WEB.back ? 'Revenir' : '', disabled: WEB.back ? null : true, onclick: () => nav('back') }, '‹'),
        h('button', { class: 'web-b', title: 'Actualiser', onclick: () => nav(WEB.loading ? 'stop' : 'reload') }, WEB.loading ? h('i', { class: 'web-spin' }) : '⟳'));
      view.replaceChildren(nbar, slot);
    } else view.replaceChildren(bar, slot);
    requestAnimationFrame(() => {
      const r = webRect(); if (r) window.fire.web.bounds(r);
      if (!WEB.ro && window.ResizeObserver) { WEB.ro = new ResizeObserver(() => { const rr = webRect(); if (rr && WEB.open) window.fire.web.bounds(rr); }); WEB.ro.observe(document.getElementById('web-slot')); }
      else if (WEB.ro) { WEB.ro.disconnect(); WEB.ro.observe(document.getElementById('web-slot')); }
    });
  }
  // Les fenêtres de FIRE (paramètres, recherche, profil…) passent par-dessus la page : on la cache le temps qu'elles sont ouvertes.
  function webCovered() {
    if (!WEB.open || !window.fire.web) return;
    const cover = !!document.querySelector('#set-ovl, .qs, .prof-pop, .who, .popup-modal, .modal, .vs-modal, .lightbox');
    if (cover !== WEB.covered) { WEB.covered = cover; window.fire.web.hide(cover); }
  }
  if (window.fire && window.fire.web) {
    window.fire.web.onOpen((u) => webOpen(u));
    window.fire.web.onState((st) => {
      if (!WEB.open || !st) return;
      Object.assign(WEB, { url: st.url || WEB.url, title: st.title || '', loading: !!st.loading, back: !!st.back, fwd: !!st.fwd, error: st.error || '' });
      if (S.section === 'web') {
        const bar = document.querySelector('.web-bar');
        if (bar) renderWeb();
      }
    });
    new MutationObserver(() => webCovered()).observe(document.body, { childList: true });
    window.addEventListener('resize', () => { if (WEB.open) { const r = webRect(); if (r) window.fire.web.bounds(r); } });
  }






  // ----- Suivi de la mini-carte pendant la partie (pour voir les champions bouger dans la Revue) -----
  const mmCfg = () => ({ on: true, rect: null, src: '', frac: 0.085, ...load('fire.mm', {}) });
  const MM = { key: '', running: false };
  async function mmLive(g) {
    if (!window.FireMinimap || !window.fire.parties || SUB()) return;
    const c = mmCfg();
    if (g && c.on && !c.rect && !MM.told) { MM.told = true; deskNotify({ title: '🗺️ Revue de parties', body: 'Règle une fois la mini-carte (Outils › Revue de parties › Régler) pour voir les champions bouger dans tes prochaines revues.', section: 'revue', silent: true }).catch(() => {}); }
    if (!g || !c.on || !c.rect) { if (MM.running) { FireMinimap.stop(); MM.running = false; MM.key = ''; } return; }
    const key = g.players.map((p) => p.n).sort().join('|');
    if (MM.running && MM.key === key) return;
    if (MM.busy) return;
    MM.busy = true; MM.key = key;
    try {
      let src = c.src;
      if (!src && window.fire.screen) { const l = await window.fire.screen.sources().catch(() => []); const sc = (l || []).find((x) => x.screen); src = sc && sc.id; }
      if (!src) return;
      const players = g.players.map((p) => ({ c: p.c }));
      await FireMinimap.start({ sourceId: src, rect: c.rect, frac: c.frac, fixed: !!c.fracOk, players, ver: (S.champList && S.champList.version) || '',
        onScale: (f) => save('fire.mm', { ...mmCfg(), frac: f, fracOk: true }),
        onPos: (pts) => { const L = LIVE.mine; if (!L) return; const t = L.time + (Date.now() - (L.at || Date.now())) / 1000; window.fire.parties.pos(t, pts); } });
      MM.running = FireMinimap.state().on;
    } finally { MM.busy = false; }
  }
  // Réglage du cadre de la mini-carte : une image de l'écran prise quelques secondes après le clic (le temps de revenir en jeu).
  async function mmCalibrate(delay) {
    const c = mmCfg();
    let src = c.src;
    const list = window.fire.screen ? await window.fire.screen.sources().catch(() => []) : [];
    const screens = (list || []).filter((x) => x.screen);
    if (!src && screens[0]) src = screens[0].id;
    if (!src) { alert('Aucun écran trouvé.'); return; }
    let shot;
    try { shot = await FireMinimap.snapshot(src, delay); } catch (e) { alert('Capture de l’écran impossible.'); return; }
    const W = shot.w, H = shot.h;
    const r = c.rect || (() => { const sz = Math.round(H * 0.255), m = Math.round(H * 0.004); return { x: (W - sz - m) / W, y: (H - sz - m) / H, w: sz / W, h: sz / H }; })();
    const st = { x: r.x * W, y: r.y * H, s: r.w * W };
    const box = h('div', { class: 'mm-box' });
    const img = h('img', { src: shot.url, class: 'mm-img', draggable: 'false' });
    const wrap = h('div', { class: 'mm-wrap' }, img, box);
    const place = () => { const k = img.clientWidth / W; Object.assign(box.style, { left: st.x * k + 'px', top: st.y * k + 'px', width: st.s * k + 'px', height: st.s * k + 'px' }); };
    let drag = null;
    box.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y }; box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', (e) => { if (!drag) return; const k = img.clientWidth / W; st.x = Math.max(0, Math.min(W - st.s, drag.sx + (e.clientX - drag.x) / k)); st.y = Math.max(0, Math.min(H - st.s, drag.sy + (e.clientY - drag.y) / k)); place(); });
    box.addEventListener('pointerup', () => { drag = null; });
    const size = h('input', { type: 'range', min: Math.round(H * 0.12), max: Math.round(H * 0.5), value: Math.round(st.s), oninput: (e) => { const ns = Number(e.target.value); st.x = Math.min(W - ns, st.x + (st.s - ns)); st.y = Math.min(H - ns, st.y + (st.s - ns)); st.s = ns; place(); } });
    const ovl = h('div', { class: 'popup-modal mm-modal' }, h('div', { class: 'card mm-card' },
      h('h3', null, '🗺️ Place le cadre sur ta mini-carte'),
      h('p', { class: 'muted small' }, 'Fais glisser le carré pour qu’il entoure exactement la mini-carte, et règle sa taille avec le curseur. FIRE ne lira que ce carré, une fois par seconde, pendant tes games.'),
      wrap, h('div', { class: 'row' }, h('small', null, 'Taille'), size,
        screens.length > 1 ? h('select', { class: 'inp', onchange: async (e) => { save('fire.mm', { ...mmCfg(), src: e.target.value }); ovl.remove(); mmCalibrate(0); } }, screens.map((x) => h('option', { value: x.id, selected: x.id === src ? true : null }, x.name))) : null),
      h('div', { class: 'row' },
        h('button', { class: 'btn-fire small-btn', onclick: () => { save('fire.mm', { ...mmCfg(), src, rect: { x: st.x / W, y: st.y / H, w: st.s / W, h: st.s / H }, fracOk: false }); ovl.remove(); vocalToast('Mini-carte réglée ✓', true); if (S.section === 'revue') renderRevue(); } }, '✅ Enregistrer'),
        h('button', { class: 'btn-ghost', onclick: () => ovl.remove() }, 'Annuler'))));
    document.body.append(ovl);
    if (img.complete) place(); else img.onload = place;
    window.addEventListener('resize', place);
  }
  function mmCard() {
    const c = mmCfg();
    return h('div', { class: 'card mm-set' },
      h('div', { class: 'row' }, h('b', null, '🗺️ Voir les champions bouger'),
        h('label', { class: 'vs-sw mm-sw' }, h('span', null, h('small', null, c.on ? 'Activé' : 'Désactivé')), h('input', { type: 'checkbox', class: 'vs-tog', checked: c.on ? true : null, onchange: (e) => { save('fire.mm', { ...mmCfg(), on: e.target.checked }); renderRevue(); } }))),
      h('p', { class: 'muted small' }, 'Pendant tes games, FIRE lit ta mini-carte à l’écran une fois par seconde et y repère les 10 champions, pour les montrer sur la carte de la Revue. Il ne voit que ce que tu vois (brouillard de guerre). Rien n’est lu dans le jeu.'),
      h('div', { class: 'row' },
        h('span', { class: c.rect ? 'good small' : 'bad small' }, c.rect ? '✓ Cadre de la mini-carte réglé' : '⚠ À régler une fois'),
        h('button', { class: 'btn-ghost', onclick: () => { vocalToast('Retourne dans le jeu : capture dans 5 secondes…', true); mmCalibrate(5000); } }, '⏱ Régler (capture dans 5 s)'),
        h('button', { class: 'btn-ghost', onclick: () => mmCalibrate(0) }, 'Régler maintenant')));
  }


  // ----- Partie entière en vidéo, synchronisée avec la Revue -----
  const vodCfg = () => ({ on: false, ...load('fire.vod', {}) });
  const VODS = { on: false, auto: false, busy: false };
  const liveTime = () => { const L = LIVE.mine; return L ? L.time + (Date.now() - (L.at || Date.now())) / 1000 : 0; };
  async function vodLive(g) {
    if (!window.FireClips || !window.fire.vod || SUB() || VODS.busy) return;
    const want = !!(g && vodCfg().on);
    if (want && !VODS.on) {
      VODS.busy = true;
      try {
        if (!FireClips.state().on) { await clipsApplyForce(); VODS.auto = true; }
        if (!FireClips.state().on) return;
        const r = await window.fire.vod.open(); if (!r || !r.ok) return;
        FireClips.recStart((data, pos) => window.fire.vod.write(pos, data));
        VODS.on = true; VODS.t = Date.now(); VODS.gt = liveTime();
      } finally { VODS.busy = false; }
    } else if (!want && VODS.on) {
      VODS.busy = true;
      try {
        const out = await FireClips.recStop();
        const st = out && out.started ? out.started : VODS.t;
        // Heure de jeu de la 1re image : celle du début de l'enregistrement, décalée du temps d'attente de la 1re image clé.
        const gt0 = Math.max(0, VODS.gt + (st - VODS.t) / 1000);
        await window.fire.vod.close({ gt0, seconds: out ? out.seconds : 0 });
        VODS.on = false;
        if (VODS.auto && !clipCfg().on) { FireClips.stop(); VODS.auto = false; }
      } finally { VODS.busy = false; }
    }
  }
  // Démarre l'encodeur des clips pour filmer la partie, même si les clips instantanés sont désactivés.
  async function clipsApplyForce() {
    const c = clipCfg();
    let src = c.src;
    if (!src && window.fire.screen) { const l = await window.fire.screen.sources().catch(() => []); const sc = (l || []).find((x) => x.screen); src = sc && sc.id; }
    if (!src) return;
    await FireClips.start({ sourceId: src, seconds: c.seconds, quality: c.quality, mic: () => FV().micStream() });
  }
  // Combats : les kills à moins de 20 s d'intervalle forment un combat ; on le relie à l'objectif pris juste après.
  function rvFights(g) {
    const { tOf } = rvTeams(g);
    const myTeam = ((g.players || []).find((p) => p.n === g.me) || {}).team || 'ORDER';
    const meN = String(g.me || '').split('#')[0];
    const isMe = (n) => n && (n === g.me || String(n).split('#')[0] === meN);
    const out = [];
    let cur = null;
    for (const e of g.events || []) {
      if (e.x !== 'ChampionKill') continue;
      if (!cur || e.t - cur.end > 20) { cur = { start: e.t, end: e.t, ev: [] }; out.push(cur); }
      cur.end = e.t; cur.ev.push(e);
    }
    return out.map((f) => {
      let mine = 0, theirs = 0, me = '';
      for (const e of f.ev) {
        const vt = tOf(e.v), kt = tOf(e.k) || (vt === 'ORDER' ? 'CHAOS' : vt === 'CHAOS' ? 'ORDER' : '');
        if (kt === myTeam) mine++; else theirs++;
        if (isMe(e.k)) me = me || 'kill'; else if ((e.a || []).some(isMe)) me = me || 'assist'; if (isMe(e.v)) me = 'mort';
      }
      const obj = (g.events || []).find((e) => /DragonKill|BaronKill|HeraldKill|HordeKill|AtakhanKill/.test(e.x) && e.t >= f.start - 25 && e.t <= f.end + 30);
      const objLab = obj ? { DragonKill: 'Dragon', BaronKill: 'Nashor', HeraldKill: 'Héraut', HordeKill: 'Larves', AtakhanKill: 'Atakhan' }[obj.x] : '';
      const n = f.ev.length;
      const kind = n === 1 ? (me === 'kill' ? 'Kill' : me === 'assist' ? 'Assist' : me === 'mort' ? 'Mort' : (mine ? 'Kill de l’équipe' : 'Mort d’un allié')) : (mine > theirs ? 'Combat gagné' : mine < theirs ? 'Combat perdu' : 'Combat égal');
      return { ...f, mine, theirs, me, won: mine > theirs, lost: theirs > mine, n, obj: objLab, label: `${kind}${n > 1 ? ` ${mine}–${theirs}` : ''}${objLab ? ' · ' + objLab : ''}` };
    });
  }

  // ----- Analyse IA de la partie (clé Claude du coach) : texte de la Revue + images de la vidéo -----
  function rvKeyMoments(g) {
    const fs = rvFights(g);
    const score = (f) => (f.lost ? 4 : 0) + (f.me === 'mort' ? 3 : f.me ? 1 : 0) + (f.obj ? 2 : 0) + Math.min(3, f.n / 2);
    const pick = fs.slice().sort((a, b) => score(b) - score(a)).slice(0, 8).map((f) => ({ t: Math.max(0, f.start - 2), why: f.label + (f.me ? ` (${({ kill: 'je tue', assist: 'j’assiste', mort: 'je meurs' })[f.me]})` : '') }));
    for (const e of g.events || []) {
      if (pick.length >= 8) break;
      if (!/DragonKill|BaronKill|HeraldKill|AtakhanKill/.test(e.x) || pick.some((p) => Math.abs(p.t - e.t) < 30)) continue;
      pick.push({ t: Math.max(0, e.t - 10), why: { DragonKill: 'Dragon', BaronKill: 'Nashor', HeraldKill: 'Héraut', AtakhanKill: 'Atakhan' }[e.x] + ' (avant la prise)' });
    }
    return pick.sort((a, b) => a.t - b.t);
  }
  // Images de la vidéo aux moments clés (640 px, JPEG) : lues dans un lecteur caché.
  async function rvShots(g, onStep) {
    if (!g.vod || !g.vod.url) return [];
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = g.vod.url;
    const ok = await new Promise((res) => { v.onloadedmetadata = () => res(true); v.onerror = () => res(false); setTimeout(() => res(false), 15000); });
    if (!ok || !v.videoWidth) return [];
    const W = 640, H = Math.round(W * v.videoHeight / v.videoWidth);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d');
    const out = [];
    const ms = rvKeyMoments(g);
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]; const vt = m.t - (g.vod.gt0 || 0);
      if (vt < 0 || vt > v.duration - 0.5) continue;
      if (onStep) onStep(i + 1, ms.length);
      const seeked = new Promise((res) => { v.onseeked = () => res(true); setTimeout(() => res(false), 8000); });
      v.currentTime = vt;
      if (!(await seeked)) continue;
      cx.drawImage(v, 0, 0, W, H);
      let q = 0.62, img = cv.toDataURL('image/jpeg', q);
      while (img.length > 110000 && q > 0.3) { q -= 0.1; img = cv.toDataURL('image/jpeg', q); }
      out.push({ t: m.t, why: m.why, img });
    }
    v.removeAttribute('src'); v.load();
    return out;
  }
  // Déroulé de la partie en texte, pour l'IA.
  function rvCtx(g) {
    const { tOf, cOf } = rvTeams(g);
    const nm = (n) => { const c = cOf(n); const tm = tOf(n); return c ? `${FC.champName(c)} (${tm === 'ORDER' ? 'bleu' : tm === 'CHAOS' ? 'rouge' : '?'})` : (n ? 'sbire/tour/monstre' : '?'); };
    const meP = (g.players || []).find((p) => p.n === g.me) || {};
    const last = (g.frames || [])[(g.frames || []).length - 1];
    const L = [];
    L.push(`Partie : ${gameModeLabel(g)} · durée ${mmss(g.duration || 0)} · résultat pour moi : ${/win/i.test(g.result || '') ? 'victoire' : /lose/i.test(g.result || '') ? 'défaite' : 'inconnu'}.`);
    L.push(`Moi : ${FC.champName(meP.c || '')} dans l'équipe ${meP.team === 'ORDER' ? 'bleue (en bas à gauche de la carte)' : 'rouge (en haut à droite)'}.`);
    L.push('', 'Joueurs (fin de partie : K/D/A, CS, niveau) :');
    (g.players || []).forEach((p, i) => { const a = (last && last.p[i]) || []; L.push(`- ${p.team === 'ORDER' ? 'Bleu' : 'Rouge'} · ${FC.champName(p.c)}${p.n === g.me ? ' (MOI)' : ''} : ${a[0] || 0}/${a[1] || 0}/${a[2] || 0}, ${a[3] || 0} CS, niv. ${a[4] || 1}`); });
    L.push('', 'Événements (t = secondes de jeu) :');
    for (const e of g.events || []) {
      const ts = `${mmss(e.t)} (t=${Math.round(e.t)})`;
      if (e.x === 'ChampionKill') L.push(`${ts} kill : ${nm(e.k)} tue ${nm(e.v)}${(e.a || []).length ? ', assists ' + e.a.map(nm).join(', ') : ''}`);
      else if (e.x === 'DragonKill') L.push(`${ts} dragon ${e.dr || ''} pris par ${tOf(e.k) === 'ORDER' ? 'les bleus' : 'les rouges'}${e.st ? ' (volé)' : ''}`);
      else if (/BaronKill|HeraldKill|HordeKill|AtakhanKill/.test(e.x)) L.push(`${ts} ${({ BaronKill: 'Nashor', HeraldKill: 'Héraut', HordeKill: 'larve', AtakhanKill: 'Atakhan' })[e.x]} pris par ${tOf(e.k) === 'ORDER' ? 'les bleus' : 'les rouges'}`);
      else if (e.x === 'TurretKilled' || e.x === 'InhibKilled') {
        const key = rvBuilding(e.tw, e.x === 'InhibKilled'); const m = key && key.split('_');
        const tier = m && m[2] ? (m[1] === 'C' ? { '05': 'extérieure', '04': 'intérieure', '03': 'd’inhibiteur', '01': 'du nexus', '02': 'du nexus' } : { '03': 'extérieure', '02': 'intérieure', '01': 'd’inhibiteur' })[m[2]] : '';
        const where = m ? `de l'équipe ${m[0] === 'T1' ? 'bleue' : 'rouge'}, ${({ L: 'top', C: 'mid', R: 'bot' })[m[1]]}${tier ? ' (' + tier + ')' : ''}` : (e.tw || '');
        L.push(`${ts} ${e.x === 'TurretKilled' ? 'tour détruite' : 'inhibiteur détruit'} ${where}`);
      }
    }
    L.push('', 'Combats repérés :');
    for (const f of rvFights(g)) L.push(`${mmss(f.start)}–${mmss(f.end)} (t=${Math.round(f.start)}) ${f.label}${f.me ? ' · moi : ' + f.me : ''}`);
    L.push('', 'Situation aux moments clés (tableau, et positions lues sur la mini-carte : x de 0 à gauche à 1000 à droite, y de 0 en haut à 1000 en bas ; base bleue en bas à gauche) :');
    for (const m of rvKeyMoments(g)) {
      const f = rvFrame(g, m.t);
      L.push(`— ${mmss(m.t)} (t=${Math.round(m.t)}) ${m.why}`);
      if (f) (g.players || []).forEach((p, i) => { const a = f.p[i] || []; L.push(`  ${FC.champName(p.c)}${p.n === g.me ? ' (MOI)' : ''} : niv. ${a[4] || 1}, ${a[0] || 0}/${a[1] || 0}/${a[2] || 0}, ${a[3] || 0} CS${a[5] ? ', mort (' + a[5] + ' s)' : ''}`); });
      if (Array.isArray(g.pos) && g.pos.length) {
        let k = g.pos.length - 1; while (k > 0 && g.pos[k].t > m.t) k--;
        const P = g.pos[k]; if (P && m.t - P.t <= 6) L.push('  positions : ' + (P.p || []).map((q, i) => q ? `${FC.champName((g.players[i] || {}).c || '')} ${q[0]},${q[1]}` : null).filter(Boolean).join(' · '));
      }
    }
    if ((g.notes || []).length) { L.push('', 'Notes déjà écrites par l\'équipe :'); for (const n of g.notes) L.push(`${mmss(n.t)} : ${n.text}`); }
    return L.join('\n');
  }
  async function rvRunIa(g) {
    if (RV.ia) return;
    RV.ia = 'Préparation…'; rvPaintIa(g);
    try {
      const shots = RV.src === 'local' && g.vod ? await rvShots(g, (i, n) => { RV.ia = `Images de la vidéo ${i}/${n}…`; rvPaintIa(g); }) : [];
      RV.ia = 'Claude regarde la partie (30 s à 2 min)…'; rvPaintIa(g);
      const r = await window.fire.revues.ia({ id: g.id, src: RV.src, ctx: rvCtx(g), shots }, vocalMe()).catch((e) => ({ ok: false, error: String(e) }));
      if (r && r.ok) { g.ia = r.ia; if (RV.src === 'local') await window.fire.parties.save(g).catch(() => {}); RV.iaErr = ''; actLog('app', 'Analyse IA de partie'); }
      else RV.iaErr = (r && r.error) || 'échec';
    } finally { RV.ia = null; rvPaintIa(g); }
  }
  function rvPaintIa(g) {
    const box = document.querySelector('.rv-ia'); if (!box || RV.g !== g) return;
    const canRun = S.coachState && S.coachState.claude && !SUB();
    const ia = g.ia;
    const tchip = (t) => h('button', { class: 'chip', onclick: () => { rvSeek(Math.max(0, t - 5)); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, '⏱ ' + mmss(t));
    const headRow = h('div', { class: 'row rv-iah' }, h('h3', null, '🤖 Analyse IA de la partie'),
      ia ? h('small', { class: 'muted' }, `par ${vocalName(ia.par) || 'le coach'} · ${new Date(ia.at).toLocaleDateString('fr-FR')} · ${ia.images ? ia.images + ' images de la vidéo' : 'sans vidéo'}`) : null,
      canRun ? h('button', { class: ia ? 'btn-ghost' : 'btn-fire small-btn', disabled: RV.ia ? '' : null, onclick: () => rvRunIa(g) }, RV.ia ? RV.ia : ia ? '↻ Refaire l’analyse' : '🤖 Lancer l’analyse') : null);
    const kids = [headRow];
    if (RV.iaErr) kids.push(h('p', { class: 'bad small' }, '⚠ ' + RV.iaErr));
    if (!ia) {
      kids.push(h('p', { class: 'muted small' }, canRun
        ? `Claude revoit la partie comme en revue VOD : déroulé, combats, positions${g.vod || g.shots ? ' et images de la vidéo aux moments clés' : ''}. Il pointe les erreurs et les bonnes décisions, minute par minute, avec quoi faire à la place.`
        : rvAutoOk(g) ? 'L’analyse se fait toute seule : FIRE partage la partie avec l’équipe à la fin de la game (avec des images de ta vidéo si elle est filmée), puis le PC d’un coach l’analyse dès que FIRE y est ouvert. Elle s’affichera ici.' : 'L’analyse automatique est faite pour les parties sur la Faille de l’invocateur de plus de 10 minutes.'));
    } else {
      kids.push(h('p', { class: 'rv-iares' }, ia.resume));
      if ((ia.points_forts || []).length) kids.push(h('div', { class: 'rv-iapf' }, h('b', null, '✅ Points forts'), h('ul', null, ia.points_forts.map((x) => h('li', null, x)))));
      if ((ia.moments || []).length) kids.push(h('div', { class: 'rv-iams' }, ia.moments.map((m) => h('div', { class: 'rv-iam ' + m.type },
        h('div', { class: 'row' }, tchip(m.t), h('b', null, (m.type === 'erreur' ? '❌ ' : m.type === 'bien' ? '✅ ' : '🧭 ') + m.titre)),
        m.analyse ? h('p', null, m.analyse) : null, m.conseil ? h('p', { class: 'rv-iac' }, '👉 ' + m.conseil) : null))));
      if ((ia.combats || []).length) kids.push(h('details', { class: 'rv-iacb' }, h('summary', null, `⚔ Les combats (${ia.combats.length})`), ia.combats.map((c) => h('div', { class: 'row rv-iacr' }, tchip(c.t), h('b', { class: /gagn/.test(c.verdict) ? 'good' : /perdu/.test(c.verdict) ? 'bad' : 'muted' }, c.verdict), h('span', null, c.pourquoi)))));
      if ((ia.a_travailler || []).length) kids.push(h('div', { class: 'rv-iaw' }, h('b', null, '🎯 À travailler'), ia.a_travailler.map((x) => h('div', { class: 'rv-iawi' }, h('b', null, x.titre), h('p', { class: 'muted' }, x.exercice)))));
    }
    box.replaceChildren(...kids.filter(Boolean));
  }

  // ----- Analyse IA automatique : chaque game est partagée toute seule, et le PC d'un coach l'analyse tout seul -----
  const rvAutoOk = (g) => g && g.mode === 'CLASSIC' && (g.duration || 0) >= 600;
  const RVA = { busy: false, iaBusy: false };
  async function rvAutoShare(onlyId) {
    if (RVA.busy || SUB() || !window.fire.revues || !window.fire.parties) return;
    RVA.busy = true;
    try {
      const done = load('fire.rvShared', {});
      const list = await window.fire.parties.list().catch(() => []);
      const todo = (list || []).filter((x) => (!onlyId || String(x.id) === String(onlyId)) && !done[x.id] && Date.now() - x.start < 3 * 864e5 && rvAutoOk(x)).slice(0, 5);
      for (const x of todo) {
        const g = await window.fire.parties.get(x.id).catch(() => null); if (!g) continue;
        const shots = g.vod ? await rvShots(g).catch(() => []) : [];
        const r = await window.fire.revues.share(g, vocalMe(), shots).catch(() => null);
        if (!r || !r.ok) break; // pas de code d'équipe ou pas de réseau : on réessaiera plus tard
        done[x.id] = Date.now(); save('fire.rvShared', done);
      }
    } finally { RVA.busy = false; }
  }
  async function rvAutoIa() {
    if (RVA.iaBusy || SUB() || !(S.coachState && S.coachState.claude) || !window.fire.revues || !window.fire.revues.ia) return;
    RVA.iaBusy = true;
    try {
      const st = load('fire.iaAuto', { day: '', n: 0, tried: {} });
      const day = new Date().toDateString(); if (st.day !== day) { st.day = day; st.n = 0; }
      const r = await window.fire.revues.list().catch(() => null);
      const todo = ((r && r.list) || []).filter((x) => !x.ia && rvAutoOk(x) && Date.now() - (x.at || 0) < 14 * 864e5 && !(st.tried[x.id] && Date.now() - st.tried[x.id] < 6 * 36e5)).sort((a, b) => a.at - b.at);
      for (const x of todo.slice(0, 3)) {
        if (st.n >= 40) break; // garde-fou sur le coût de la clé Claude
        st.tried[x.id] = Date.now(); save('fire.iaAuto', st);
        const g = await window.fire.revues.get(x.id).catch(() => null);
        if (!g || g.ia) continue;
        const res = await window.fire.revues.ia({ id: x.id, src: 'team', ctx: rvCtx(g) }, vocalMe()).catch(() => null);
        if (res && res.ok) { st.n++; save('fire.iaAuto', st); if (RV.g && String(RV.g.id) === String(x.id)) { RV.g.ia = res.ia; rvPaintIa(RV.g); } }
      }
      for (const k of Object.keys(st.tried)) if (Date.now() - st.tried[k] > 7 * 864e5) delete st.tried[k];
      save('fire.iaAuto', st);
    } finally { RVA.iaBusy = false; }
  }
  function rvAutoInit() {
    setTimeout(() => { rvAutoShare(); rvAutoIa(); }, 60000);
    setInterval(() => { rvAutoShare(); rvAutoIa(); }, 4 * 60000);
  }

  // ----- Revue en direct : une revue partagée regardée ensemble. Celui qui la lance mène (temps, lecture, vitesse) ;
  // tout le monde peut dessiner sur la carte, les dessins apparaissent chez tous. Passe par les liens P2P de l'équipe.
  const RVL = { hosting: false, id: null, viewers: {}, host: null, hostId: null, offers: {}, last: { k: '', at: 0 }, timer: null, beat: null };
  const rvlName = (slug) => vocalName(slug) || String(slug || '').split('%20')[0] || 'Un coéquipier';
  function rvlSend(slug, m) { try { FV().hallSend(slug, { t: 'rv', ...m }); } catch (e) { /* */ } }
  function rvlStart() {
    const g = RV.g; if (!g || RV.src !== 'team' || SUB() || !FV().rvBroadcast) return;
    RVL.hosting = true; RVL.id = String(g.id); RVL.viewers = {}; RVL.last = { k: '', at: 0 };
    const meP = (g.players || []).find((p) => p.n === g.me) || {};
    const offer = () => {
      if (!RVL.hosting) return;
      if (!RV.g || String(RV.g.id) !== RVL.id) { rvlStop(); return; }
      FV().rvBroadcast({ t: 'rv', a: 'open', id: RVL.id, title: `${meP.c ? FC.champName(meP.c) + ' · ' : ''}${gameModeLabel(g)} · ${mmss(g.duration || 0)}` }).catch(() => {});
      for (const [k, exp] of Object.entries(RVL.viewers)) if (exp < Date.now()) delete RVL.viewers[k];
      rvlCount();
    };
    offer(); clearInterval(RVL.timer); RVL.timer = setInterval(offer, 8000);
    actLog('app', 'Revue en direct lancée');
    renderRevue();
  }
  function rvlStop() {
    if (!RVL.hosting) return;
    for (const v of Object.keys(RVL.viewers)) rvlSend(v, { a: 'close', id: RVL.id });
    FV().rvBroadcast && FV().rvBroadcast({ t: 'rv', a: 'close', id: RVL.id }).catch(() => {});
    RVL.hosting = false; RVL.viewers = {}; clearInterval(RVL.timer); RVL.timer = null;
    if (S.section === 'revue') renderRevue();
  }
  function rvlCount() { const n = Object.keys(RVL.viewers).length; const el = document.querySelector('.rvl-n'); if (el) el.textContent = n ? (n > 1 ? `${n} coéquipiers suivent` : '1 coéquipier suit') : 'personne ne suit encore'; }
  const rvlStrokes = () => RV.strokes.slice(-40).map((st) => ({ c: st.c, p: st.p.slice(0, 300).map((q) => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]) }));
  // Appelé à chaque dessin de la Revue : l'hôte envoie l'état aux spectateurs (au plus 2 fois par seconde, ou dès qu'il change).
  function rvlTick() {
    if (!RVL.hosting || !RV.g || String(RV.g.id) !== RVL.id) return;
    const sk = RV.strokes.length + ':' + RV.strokes.reduce((n, st) => n + st.p.length, 0);
    const k = `${Math.round(RV.t)}|${RV.play}|${RV.speed}|${sk}`;
    const now = Date.now();
    if ((k === RVL.last.k && now - RVL.last.at < 3000) || now - RVL.last.at < 450) return;
    const withStrokes = !RVL.last.k || RVL.last.k.split('|')[3] !== sk || now - RVL.last.at > 6000;
    RVL.last = { k, at: now };
    const msg = { a: 'st', id: RVL.id, tt: RV.t, play: !!RV.play, speed: RV.speed, ...(withStrokes ? { strokes: rvlStrokes() } : {}) };
    for (const v of Object.keys(RVL.viewers)) rvlSend(v, msg);
  }
  async function rvlJoin(host) {
    const o = RVL.offers[host]; if (!o) return;
    RVL.host = host; RVL.hostId = o.id; delete RVL.offers[host]; rvlOfferBar();
    rvlSend(host, { a: 'join', id: o.id });
    clearInterval(RVL.beat); RVL.beat = setInterval(() => { if (RVL.host) rvlSend(RVL.host, { a: 'join', id: RVL.hostId }); else clearInterval(RVL.beat); }, 8000);
    go('revue');
    if (!RV.g || String(RV.g.id) !== String(o.id)) await rvOpen(o.id, 'team'); else renderRevue();
  }
  function rvlLeave(silent) {
    if (!RVL.host) return;
    if (!silent) rvlSend(RVL.host, { a: 'leave', id: RVL.hostId });
    RVL.host = null; RVL.hostId = null; clearInterval(RVL.beat); RV.show = null; rvStop();
    if (S.section === 'revue') renderRevue();
  }
  function rvlFollow(m) {
    if (!RV.g || String(RV.g.id) !== String(m.id)) return;
    const tt = Math.max(0, Math.min(RV.g.duration || 0, Number(m.tt) || 0));
    if (Math.abs(tt - RV.t) > 1.2 || !m.play) RV.t = tt;
    RV.speed = Math.max(1, Math.min(32, Number(m.speed) || 8));
    if (m.play && !RV.play) { RV.play = true; clearInterval(RV.timer); RV.timer = setInterval(() => { if (!RV.g || !RVL.host) { rvStop(); return; } RV.t = Math.min(RV.g.duration || 0, RV.t + RV.speed * 0.25); rvPaint(); }, 250); }
    else if (!m.play && RV.play) rvStop();
    if (Array.isArray(m.strokes)) { RV.show = m.strokes.slice(0, 60).filter((st) => st && Array.isArray(st.p)); RV.strokes = []; rvDrawPaint(); }
    rvPaint();
  }
  function rvlOfferBar() {
    let bar = document.getElementById('rvl-offer');
    const L = Object.entries(RVL.offers).filter(([, o]) => o.exp > Date.now() && !(RVL.host)); 
    if (!L.length) { if (bar) bar.remove(); return; }
    if (!bar) { bar = h('div', { id: 'rvl-offer', class: 'rvl-offer' }); document.body.append(bar); }
    bar.replaceChildren(...L.map(([from, o]) => h('div', { class: 'rvl-o' }, h('span', null, '📡'), h('div', null, h('b', null, `${rvlName(from)} lance une revue en direct`), h('small', { class: 'muted' }, o.title || '')),
      h('button', { class: 'btn-fire small-btn', onclick: () => rvlJoin(from) }, 'Rejoindre'),
      h('button', { class: 'btn-ghost', title: 'Ignorer', onclick: () => { RVL.offers[from].exp = Date.now() + 0; RVL.offers[from].ign = o.id; rvlOfferBar(); } }, '✕'))));
  }
  function rvlInit() {
    if (!FV().onRv) return;
    FV().onRv((from, m) => {
      if (SUB()) return;
      const id = String(m.id || '').replace(/\D/g, '').slice(0, 16); if (!id) return;
      if (m.a === 'open') {
        if (RVL.host === from) return;
        const old = RVL.offers[from];
        const ign = old && old.ign === id;
        RVL.offers[from] = { id, title: String(m.title || '').slice(0, 80), exp: ign ? 0 : Date.now() + 20000, ign: ign ? id : null };
        if (!old && !ign) vocalToast(`📡 ${rvlName(from)} lance une revue de partie en direct`, true);
        rvlOfferBar(); return;
      }
      if (m.a === 'close') { delete RVL.offers[from]; rvlOfferBar(); if (RVL.host === from) { rvlLeave(true); vocalToast('📡 La revue en direct est terminée', true); } return; }
      if (m.a === 'join' && RVL.hosting && id === RVL.id) { const isNew = !RVL.viewers[from]; RVL.viewers[from] = Date.now() + 25000; if (isNew) RVL.last = { k: '', at: 0 }; if (isNew) vocalToast(`📡 ${rvlName(from)} suit ta revue`, true); rvlCount(); rvlTick(); return; }
      if (m.a === 'leave' && RVL.hosting) { delete RVL.viewers[from]; rvlCount(); return; }
      if (m.a === 'draw' && RVL.hosting && id === RVL.id && m.st && Array.isArray(m.st.p)) {
        RV.strokes.push({ c: String(m.st.c || '#3dd8ff').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7), p: m.st.p.slice(0, 300).map((q) => [Math.max(0, Math.min(1, Number(q[0]) || 0)), Math.max(0, Math.min(1, Number(q[1]) || 0))]) });
        rvDrawPaint(); rvlTick(); return;
      }
      if (m.a === 'st' && RVL.host === from && id === String(RVL.hostId)) rvlFollow(m);
    });
    setInterval(rvlOfferBar, 5000);
  }
  const RV_TAGS = ['Surextension', 'Mauvais engage', 'Mauvais placement', 'Mauvais focus', 'Trop tard', 'Pas groupés', 'En infériorité', 'Pas de vision', 'Sorts en recharge', 'Mauvaise lecture du jungler'];
  function vodCard() {
    const c = vodCfg();
    return h('div', { class: 'card mm-set' },
      h('div', { class: 'row' }, h('b', null, '🎥 Filmer mes games en entier'),
        h('label', { class: 'vs-sw mm-sw' }, h('span', null, h('small', null, c.on ? 'Activé' : 'Désactivé')), h('input', { type: 'checkbox', class: 'vs-tog', checked: c.on ? true : null, onchange: (e) => { save('fire.vod', { ...vodCfg(), on: e.target.checked }); renderRevue(); } }))),
      h('p', { class: 'muted small' }, 'Pendant tes games, FIRE filme ton écran (avec le son du jeu et du vocal) et range la vidéo dans Vidéos › FIRE Clips › Parties. Dans la Revue, la vidéo suit la timeline : clique sur un combat ou un événement pour y aller. Une partie de 30 min pèse 1 à 2 Go ; FIRE garde les 12 dernières.'));
  }

  // ===== Revue de parties : chaque game jouée est enregistrée par FIRE (API locale officielle de Riot) et se revoit ici =====
  // Carte avec tours, inhibiteurs et objectifs dans le temps, tableau à chaque instant, timeline des kills et objectifs,
  // clips de la partie, dessins et notes horodatées. Une partie peut être partagée avec l'équipe pour la revoir ensemble.
  const RV = { tab: 'mine', list: null, team: null, g: null, src: 'local', t: 0, play: false, speed: 8, timer: null, col: '#ff6b3d', strokes: [], cur: null, show: null, filter: 'tout', err: '' };
  // Positions (coordonnées de la Faille, 0 à 14 870) : tours, inhibiteurs et fosses.
  const RV_TW = {
    T1_L_03: [981, 10441], T1_L_02: [1512, 6699], T1_L_01: [1169, 4287], T1_C_05: [5846, 6396], T1_C_04: [5048, 4812], T1_C_03: [3651, 3696], T1_C_01: [1748, 2270], T1_C_02: [2177, 1807],
    T1_R_03: [10504, 1029], T1_R_02: [6919, 1483], T1_R_01: [4281, 1253],
    T2_L_03: [4318, 13875], T2_L_02: [7943, 13411], T2_L_01: [10481, 13650], T2_C_05: [8955, 8510], T2_C_04: [9767, 10113], T2_C_03: [11134, 11207], T2_C_01: [13052, 12612], T2_C_02: [12611, 13084],
    T2_R_03: [13866, 4505], T2_R_02: [13327, 8226], T2_R_01: [13624, 10572] };
  const RV_IN = { T1_L: [1171, 3571], T1_C: [3203, 3208], T1_R: [3452, 1236], T2_L: [11261, 13676], T2_C: [11598, 11667], T2_R: [13604, 11316] };
  const RV_PIT = { drag: [9866, 4414], baron: [5007, 10471], atakhan: [7400, 7400] };
  const rvXY = (c) => [c[0] / 14870 * 100, (1 - c[1] / 14870) * 100];
  // Nom d'une tour ou d'un inhibiteur dans les événements de Riot (« Turret_T2_L_03_A », « Barracks_T1_C1 »…) → clé de la carte.
  function rvBuilding(name, inhib) {
    const n = String(name || '');
    const team = /_T1_|_T1$|Order|_100_/i.test(n) ? 'T1' : /_T2_|_T2$|Chaos|_200_/i.test(n) ? 'T2' : '';
    const lane = /_L_|_L\d|_Top/i.test(n) ? 'L' : /_C_|_C\d|_Mid/i.test(n) ? 'C' : /_R_|_R\d|_Bot/i.test(n) ? 'R' : '';
    if (!team || !lane) return null;
    if (inhib) return `${team}_${lane}`;
    const tier = (n.match(/_(\d\d)_/) || [])[1];
    return tier ? `${team}_${lane}_${tier}` : null;
  }
  function rvTeams(g) {
    const team = {}, champ = {};
    for (const p of g.players || []) { team[p.n] = p.team; team[p.n.split('#')[0]] = p.team; champ[p.n] = p.c; champ[p.n.split('#')[0]] = p.c; }
    const tOf = (n) => team[n] || team[String(n).split('#')[0]] || '';
    const cOf = (n) => champ[n] || champ[String(n).split('#')[0]] || '';
    return { tOf, cOf };
  }
  // État de la partie à l'instant t (événements jusqu'à t).
  function rvState(g, t) {
    const { tOf, cOf } = rvTeams(g);
    const st = { kills: { ORDER: 0, CHAOS: 0 }, towers: {}, inhibs: {}, drag: { ORDER: [], CHAOS: [] }, baron: { ORDER: 0, CHAOS: 0 }, grubs: { ORDER: 0, CHAOS: 0 }, herald: { ORDER: 0, CHAOS: 0 }, recent: [] };
    for (const e of g.events || []) {
      if (e.t > t) break;
      const kt = tOf(e.k);
      if (e.x === 'ChampionKill') { const vt = tOf(e.v); const tm = kt || (vt === 'ORDER' ? 'CHAOS' : vt === 'CHAOS' ? 'ORDER' : ''); if (tm) st.kills[tm]++; }
      else if (e.x === 'TurretKilled') { const k = rvBuilding(e.tw); if (k) st.towers[k] = e.t; else if (kt) st.towers[(kt === 'ORDER' ? 'T2' : 'T1') + '_?_' + e.t] = e.t; }
      else if (e.x === 'InhibKilled') { const k = rvBuilding(e.tw, true); if (k) st.inhibs[k] = e.t; }
      else if (e.x === 'DragonKill' && kt) st.drag[kt].push(e.dr);
      else if (e.x === 'BaronKill' && kt) st.baron[kt]++;
      else if (e.x === 'HordeKill' && kt) st.grubs[kt]++;
      else if (e.x === 'HeraldKill' && kt) st.herald[kt]++;
      if (t - e.t <= 20 && /Kill|Killed/.test(e.x)) st.recent.push({ ...e, kt, kc: cOf(e.k), vc: cOf(e.v) });
    }
    // Les inhibiteurs reviennent 5 minutes après.
    for (const [k, at] of Object.entries(st.inhibs)) if (t - at > 300) delete st.inhibs[k];
    return st;
  }
  const rvFrame = (g, t) => { let f = null; for (const x of g.frames || []) { if (x.t <= t) f = x; else break; } return f || (g.frames || [])[0]; };
  async function rvLoadList() {
    RV.list = window.fire.parties ? await window.fire.parties.list().catch(() => []) : [];
    if (S.section === 'revue' && !RV.g) renderRevue();
  }
  async function rvLoadTeam() {
    const r = window.fire.revues ? await window.fire.revues.list().catch((e) => ({ ok: false, error: String(e) })) : { ok: false, list: [] };
    RV.team = (r && r.list) || []; RV.err = r && !r.ok ? r.error || '' : '';
    if (S.section === 'revue' && !RV.g) renderRevue();
  }
  async function rvOpen(id, src) {
    const g = src === 'team' ? await window.fire.revues.get(id).catch(() => null) : await window.fire.parties.get(id).catch(() => null);
    if (!g) { RV.err = 'Partie introuvable.'; renderRevue(); return; }
    rvStop(); RV.g = g; RV.src = src; RV.t = 0; RV.strokes = []; RV.show = null; RV.iaErr = ''; RV.fights = null; RV.ftag = null;
    if (!CL.list.length && window.fire.clips) clipsRefresh();
    actLog('app', 'Revue de partie ouverte');
    renderRevue(); window.scrollTo(0, 0);
    // Ma partie a été partagée : on récupère l'analyse IA faite par le PC d'un coach.
    if (src === 'local' && !g.ia && !SUB() && window.fire.revues) {
      const t = await window.fire.revues.get(id).catch(() => null);
      if (t && t.ia && RV.g === g) { g.ia = t.ia; window.fire.parties.save(g).catch(() => {}); rvPaintIa(g); }
    }
  }
  const rvVid = () => (RV.video && RV.video.isConnected && RV.g && RV.g.vod ? RV.video : null);
  function rvStop() { RV.play = false; clearInterval(RV.timer); RV.timer = null; const v = rvVid(); if (v && !v.paused) v.pause(); }
  const rvPaintTl = () => rvPaint();
  function rvPlay() {
    if (RV.play) { rvStop(); rvPaint(); return; }
    const v = rvVid();
    // Avec la vidéo : c'est elle qui avance (jusqu'à ×16, au-delà le navigateur coupe le son et saccade).
    if (v && !v.error) { v.playbackRate = Math.min(16, RV.speed || 1); v.play().catch(() => {}); return; }
    RV.play = true;
    RV.timer = setInterval(() => { if (!RV.g || S.section !== 'revue') { rvStop(); return; } RV.t = Math.min(RV.g.duration || 0, RV.t + RV.speed * 0.25); if (RV.t >= (RV.g.duration || 0)) rvStop(); rvPaint(); }, 250);
    rvPaint();
  }
  function rvSeek(t) {
    RV.t = Math.max(0, Math.min(RV.g.duration || 0, t));
    const v = rvVid(); if (v && !v.error) { try { v.currentTime = Math.max(0, RV.t - (RV.g.vod.gt0 || 0)); } catch {} }
    rvPaint();
  }
  const rvTitle = (g) => { const me = (g.players || []).find((p) => p.n === g.me) || {}; return { me, when: new Date(g.start).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }; };
  function renderRevue() {
    const view = $('view');
    if (RV.g) { renderRevueGame(view); return; }
    if (RV.list == null) { RV.list = []; rvLoadList(); }
    if (RV.team == null && !SUB()) { RV.team = []; rvLoadTeam(); }
    const card = (x, src) => {
      const me = (x.players || []).find((p) => p.n === x.me) || { c: x.champ };
      const win = /win/i.test(x.result || ''), lose = /lose/i.test(x.result || '');
      return h('button', { class: 'card rv-card' + (win ? ' win' : lose ? ' lose' : ''), onclick: () => rvOpen(x.id, src) },
        me.c ? champIcon(me.c, 44) : h('span', { class: 'rv-q' }, '?'),
        h('div', { class: 'rv-ci' }, h('b', null, `${me.c ? FC.champName(me.c) : 'Partie'} · ${gameModeLabel(x)}`),
          h('small', { class: 'muted' }, [new Date(x.start).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), mmss(x.duration || 0), src === 'team' && x.par ? 'partagée par ' + vocalName(x.par) : null, x.notes ? `${x.notes} note${x.notes > 1 ? 's' : ''}` : null].filter(Boolean).join(' · '))),
        h('span', { class: 'rv-res' }, win ? 'Victoire' : lose ? 'Défaite' : ''));
    };
    const list = RV.tab === 'team' ? (RV.team || []) : (RV.list || []);
    view.replaceChildren(...[
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🎞️'), h('div', null, h('h1', { class: 'title' }, 'Revue de parties'),
        h('p', { class: 'muted' }, 'Chaque game que tu joues est enregistrée par FIRE. Revois-la : la carte avec les tours et les objectifs, le tableau à chaque instant, les kills, tes clips, et ajoute des dessins et des notes. Partage-la pour la revoir en équipe.'))),
      h('div', { class: 'row pt-modes' },
        h('button', { class: 'plan-tab', 'aria-pressed': String(RV.tab !== 'team'), onclick: () => { RV.tab = 'mine'; rvLoadList(); renderRevue(); } }, `🎮 Mes parties (${(RV.list || []).length})`),
        SUB() ? null : h('button', { class: 'plan-tab', 'aria-pressed': String(RV.tab === 'team'), onclick: () => { RV.tab = 'team'; rvLoadTeam(); renderRevue(); } }, `👥 Revues de l’équipe (${(RV.team || []).length})`)),
      RV.err ? h('p', { class: 'muted small' }, '⚠ ' + RV.err) : null,
      RV.tab !== 'team' ? mmCard() : null,
      RV.tab !== 'team' ? vodCard() : null,
      list.length ? h('div', { class: 'rv-list' }, list.map((x) => card(x, RV.tab === 'team' ? 'team' : 'local')))
        : h('div', { class: 'card' }, h('p', { class: 'muted' }, RV.tab === 'team' ? 'Aucune revue partagée pour l’instant. Ouvre une de tes parties et clique sur « Partager avec l’équipe ».' : 'Aucune partie enregistrée pour l’instant. Joue une game avec FIRE ouvert : elle apparaîtra ici à la fin de la partie.'))].filter(Boolean));
  }
  function renderRevueGame(view) {
    const g = RV.g; const { me, when } = rvTitle(g);
    const win = /win/i.test(g.result || ''), lose = /lose/i.test(g.result || '');
    const head = h('div', { class: 'rv-head' },
      h('button', { class: 'btn-ghost', onclick: () => { rvStop(); rvlStop(); rvlLeave(); RV.g = null; renderRevue(); } }, '← Parties'),
      me.c ? champIcon(me.c, 34) : null,
      h('div', null, h('b', null, `${me.c ? FC.champName(me.c) : ''} · ${gameModeLabel(g)}`), h('small', { class: 'muted' }, ` ${when} · ${mmss(g.duration || 0)}${RV.src === 'team' && g.par ? ' · partagée par ' + vocalName(g.par) : ''}`)),
      h('span', { class: 'rv-res ' + (win ? 'win' : lose ? 'lose' : '') }, win ? 'Victoire' : lose ? 'Défaite' : ''),
      RV.src === 'local' && !SUB() ? h('button', { class: 'btn-fire small-btn', onclick: async (e) => {
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Partage…';
        // Avec la vidéo : on joint quelques images des moments clés (pour l'analyse IA du coach). La vidéo reste ici.
        const shots = g.vod ? await rvShots(g, (i, n) => { btn.textContent = `Images de la vidéo ${i}/${n}…`; }).catch(() => []) : [];
        btn.textContent = 'Partage…';
        const r = await window.fire.revues.share(g, vocalMe(), shots).catch((er) => ({ ok: false, error: String(er) }));
        e = { target: btn };
        e.target.textContent = r && r.ok ? '✓ Partagée avec l’équipe' : '⚠ ' + ((r && r.error) || 'échec');
        if (r && r.ok) rvLoadTeam();
      } }, '👥 Partager avec l’équipe') : null,
      RV.src === 'local' ? h('button', { class: 'btn-ghost', onclick: async () => { if (!confirm('Supprimer cette partie de ton PC ?')) return; await window.fire.parties.del(g.id); RV.g = null; rvLoadList(); renderRevue(); } }, '🗑') : null);
    // Revue en direct : bandeau de l'hôte ou du spectateur.
    const live = RVL.host && String(RVL.hostId) === String(g.id)
      ? h('div', { class: 'card rvl-bar follow' }, h('span', null, '📡'), h('div', null, h('b', null, `Tu suis la revue de ${rvlName(RVL.host)}`), h('small', { class: 'muted' }, 'Le temps, la lecture et les dessins suivent les siens. Tes dessins sur la carte apparaissent chez tout le monde. Parlez-en dans le vocal.')), h('button', { class: 'btn-ghost', onclick: () => rvlLeave() }, 'Quitter'))
      : RVL.hosting && RVL.id === String(g.id)
        ? h('div', { class: 'card rvl-bar host' }, h('span', { class: 'rvl-dot' }), h('div', null, h('b', null, 'Revue en direct'), h('small', { class: 'muted rvl-n' }, '')), h('small', { class: 'muted' }, 'Tu mènes : ce que tu fais (temps, lecture, dessins) s’affiche chez ceux qui suivent.'), h('button', { class: 'btn-ghost', onclick: rvlStop }, '⏹ Arrêter'))
        : RV.src === 'team' && !SUB() && FV().rvBroadcast ? h('div', { class: 'row rvl-start' }, h('button', { class: 'btn-fire small-btn', onclick: rvlStart }, '📡 Revoir en direct avec l’équipe'), h('small', { class: 'muted' }, 'Tous ceux qui ont FIRE ouvert reçoivent une invitation ; ils suivent ta lecture et voient tes dessins en direct.')) : null;
    const map = h('div', { class: 'rv-map' }, h('img', { class: 'rv-mapimg', alt: '', src: `https://ddragon.leagueoflegends.com/cdn/${(S.champList && S.champList.version) || '14.1.1'}/img/map/map11.png` }),
      h('div', { class: 'rv-ov' }), h('canvas', { class: 'rv-draw', width: 600, height: 600 }));
    const tools = h('div', { class: 'row rv-tools' }, ['#ff6b3d', '#3dd8ff', '#ffe14d', '#3ddc84', '#ffffff'].map((c) => h('button', { class: 'rv-col' + (RV.col === c ? ' on' : ''), style: `background:${c}`, title: 'Couleur du crayon', onclick: (e) => { RV.col = c; e.target.parentElement.querySelectorAll('.rv-col').forEach((x) => x.classList.toggle('on', x === e.target)); } })),
      h('button', { class: 'btn-ghost', onclick: () => { RV.strokes.pop(); RV.show = null; rvDrawPaint(); } }, '↶ Annuler'),
      h('button', { class: 'btn-ghost', onclick: () => { RV.strokes = []; RV.show = null; rvDrawPaint(); } }, '🧽 Effacer'),
      h('small', { class: 'muted' }, 'Dessine sur la carte, puis ajoute une note : le dessin y est joint.'),
      !(g.pos || []).length ? h('p', { class: 'small rv-nopos' }, '🗺️ Pas de positions pour cette partie : la lecture de la mini-carte n’était pas encore réglée. Règle-la dans « Revue de parties » (liste des parties), puis joue une nouvelle game : les champions bougeront sur la carte.') : null);
    const board = h('div', { class: 'rv-board' });
    const tl = h('div', { class: 'rv-tl' });
    const feed = h('div', { class: 'rv-feed' });
    const noteIn = h('textarea', { class: 'inp rv-note-in', rows: 2, maxlength: 600, placeholder: 'Une remarque à ce moment de la partie (ex. « ici il fallait reset avant le dragon »)…' });
    const notes = h('div', { class: 'rv-notes' });
    const addNote = h('button', { class: 'btn-fire small-btn', onclick: async () => {
      const text = noteIn.value.trim(); if (!text && !RV.strokes.length) return;
      const n = { id: Math.random().toString(36).slice(2, 10), t: Math.round(RV.t), by: vocalMe(), text, at: Date.now(), draw: RV.strokes.slice(0, 30) };
      g.notes = (g.notes || []).concat(n).sort((a, b) => a.t - b.t);
      noteIn.value = ''; RV.strokes = []; rvDrawPaint();
      if (RV.src === 'team') { const r = await window.fire.revues.note(g.id, n).catch(() => null); if (r && r.ok) g.notes = r.notes; }
      else await window.fire.parties.save(g).catch(() => {});
      rvPaint();
    } }, '📝 Ajouter la note');
    // Vidéo de la partie (si elle a été filmée sur ce PC) : c'est elle qui donne le temps pendant la lecture.
    const video = g.vod && g.vod.url && RV.src === 'local' ? h('video', { class: 'rv-video', src: g.vod.url, preload: 'auto', controls: '' }) : null;
    RV.video = video;
    if (video) {
      video.addEventListener('timeupdate', () => { if (RV.g !== g || video.paused) return; RV.t = Math.min(g.duration || 0, (g.vod.gt0 || 0) + video.currentTime); rvPaint(); });
      video.addEventListener('play', () => { RV.play = true; rvPaintTl(); });
      video.addEventListener('pause', () => { RV.play = false; rvPaintTl(); });
      video.addEventListener('error', () => { const n = document.querySelector('.rv-vnote'); if (n) n.textContent = 'Vidéo introuvable (déplacée ou supprimée de Vidéos › FIRE Clips › Parties).'; });
    }
    const fights = h('div', { class: 'rv-fights' });
    view.replaceChildren(...[head, live,
      video ? h('div', { class: 'card rv-vcard' }, video, h('small', { class: 'muted rv-vnote' }, 'La vidéo suit la timeline : clique sur un combat, un événement ou une note pour y aller.')) : null,
      h('div', { class: 'rv-main' }, h('div', { class: 'rv-left' }, map, tools, fights), h('div', { class: 'rv-right' }, board, feed)),
      tl, h('div', { class: 'card rv-notebox' }, h('h3', null, '📝 Notes'), h('div', { class: 'row rv-addnote' }, noteIn, addNote), notes),
      h('div', { class: 'card rv-ia' })].filter(Boolean));
    // Dessin à la souris sur la carte (coordonnées 0 à 1, pour s'afficher pareil chez tout le monde).
    const cv = map.querySelector('.rv-draw');
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); RV.show = null; RV.cur = { c: RV.col, p: [pos(e)] }; RV.strokes.push(RV.cur); rvDrawPaint(); });
    cv.addEventListener('pointermove', (e) => { if (!RV.cur) return; const q = pos(e); const l = RV.cur.p[RV.cur.p.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.004) { RV.cur.p.push(q); rvDrawPaint(); } });
    const end = () => {
      const st = RV.cur; RV.cur = null;
      // Spectateur d'une revue en direct : le dessin part chez l'hôte, qui le renvoie à tout le monde.
      if (st && RVL.host && String(RVL.hostId) === String(g.id)) { rvlSend(RVL.host, { a: 'draw', id: RVL.hostId, st: { c: st.c, p: st.p.slice(0, 300) } }); RV.show = (RV.show || []).concat(st); RV.strokes = RV.strokes.filter((x) => x !== st); rvDrawPaint(); }
      else if (st && RVL.hosting) rvlTick();
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    rvPaint(); rvPaintIa(g); rvlCount();
  }
  function rvDrawPaint() {
    const cv = document.querySelector('.rv-draw'); if (!cv) return;
    const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    const all = (RV.show ? RV.show : []).concat(RV.strokes);
    for (const st of all) {
      x.strokeStyle = st.c; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round'; x.shadowColor = '#000'; x.shadowBlur = 4;
      x.beginPath(); st.p.forEach(([a, b], i) => { const px = a * cv.width, py = b * cv.height; if (i) x.lineTo(px, py); else x.moveTo(px, py); });
      if (st.p.length === 1) x.lineTo(st.p[0][0] * cv.width + 0.1, st.p[0][1] * cv.height);
      x.stroke();
    }
    rvlTick();
  }
  function rvPaint() {
    const g = RV.g; if (!g || S.section !== 'revue') return;
    rvlTick();
    const t = RV.t, st = rvState(g, t), f = rvFrame(g, t), { cOf, tOf } = rvTeams(g);
    const v = (S.champList && S.champList.version) || '';
    // Carte : tours (vivantes / détruites), inhibiteurs, fosses, événements des 20 dernières secondes.
    const ov = document.querySelector('.rv-ov');
    if (ov) {
      const dot = (c, cls, title, ico) => { const [x, y] = rvXY(c); return h('span', { class: 'rv-pt ' + cls, style: `left:${x}%;top:${y}%`, title }, ico || ''); };
      const pts = [];
      for (const [k, c] of Object.entries(RV_TW)) pts.push(dot(c, 'tw ' + (k.startsWith('T1') ? 'blue' : 'red') + (st.towers[k] != null ? ' down' : ''), st.towers[k] != null ? `Tour détruite à ${mmss(st.towers[k])}` : 'Tour'));
      for (const [k, c] of Object.entries(RV_IN)) pts.push(dot(c, 'inh ' + (k.startsWith('T1') ? 'blue' : 'red') + (st.inhibs[k] != null ? ' down' : ''), 'Inhibiteur'));
      pts.push(dot(RV_PIT.drag, 'pit', `Dragons : bleus ${st.drag.ORDER.length} · rouges ${st.drag.CHAOS.length}`, '🐉'));
      pts.push(dot(RV_PIT.baron, 'pit', 'Nashor / Héraut / Larves', '🟣'));
      // Champions : dernière position lue sur la mini-carte (moins de 10 s), plus pâle quand elle date un peu.
      if (Array.isArray(g.pos) && g.pos.length) {
        let i = g.pos.length - 1; while (i > 0 && g.pos[i].t > t) i--;
        const seen = new Array((g.players || []).length).fill(null);
        for (let j = i; j >= 0 && t - g.pos[j].t <= 10; j--) (g.pos[j].p || []).forEach((q, k) => { if (q && !seen[k]) seen[k] = { q, age: t - g.pos[j].t }; });
        seen.forEach((x, k) => { if (!x) return; const pl = g.players[k];
          pts.push(h('span', { class: 'rv-champ ' + (pl.team === 'ORDER' ? 'blue' : 'red') + (pl.n === g.me ? ' me' : ''), style: `left:${x.q[0] / 10}%;top:${x.q[1] / 10}%;opacity:${x.age > 4 ? 0.45 : 1}`, title: FC.champName(pl.c) }, champIcon(pl.c, 26))); });
      }
      for (const e of st.recent) {
        const c = e.x === 'DragonKill' ? RV_PIT.drag : /Baron|Herald|Horde/.test(e.x) ? RV_PIT.baron : e.x === 'AtakhanKill' ? RV_PIT.atakhan : e.x === 'TurretKilled' ? RV_TW[rvBuilding(e.tw)] : e.x === 'InhibKilled' ? RV_IN[rvBuilding(e.tw, true)] : null;
        if (c) pts.push(dot(c, 'ping ' + (e.kt === 'ORDER' ? 'blue' : 'red'), ''));
      }
      ov.replaceChildren(...pts);
    }
    if (RV.show == null) rvDrawPaint();
    // Tableau à l'instant t.
    const board = document.querySelector('.rv-board');
    if (board && f) {
      const row = (p, i) => { const a = f.p[i] || []; const dead = a[5];
        return h('div', { class: 'sp-p' + (p.n === g.me ? ' ours' : '') + (dead ? ' dead' : '') },
          h('span', { class: 'sp-ch' }, champIcon(p.c, 30), h('b', { class: 'sp-lvl' }, a[4] || 1), dead ? h('span', { class: 'sp-dead' }, dead) : null), h('span'),
          h('span', { class: 'sp-n' }, h('b', null, p.n.split('#')[0]), h('small', { class: 'muted' }, `${a[3] || 0} CS`)),
          h('span', { class: 'sp-its' }, ...a.slice(6, 13).map((id) => id ? h('img', { class: 'sp-it', src: `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${id}.png`, width: 20, height: 20, alt: '', onerror: (e) => { e.target.style.visibility = 'hidden'; } }) : h('span', { class: 'sp-it empty' }))),
          h('span', { class: 'sp-k' }, `${a[0] || 0}/${a[1] || 0}/${a[2] || 0}`)); };
      const side = (tm) => h('div', { class: 'sp-team ' + (tm === 'ORDER' ? 'blue' : 'red') }, (g.players || []).map((p, i) => [p, i]).filter(([p]) => p.team === tm).map(([p, i]) => row(p, i)));
      const objs = (tm) => h('span', { class: 'rv-objs' }, `🏰 ${Object.keys(st.towers).filter((k) => k.startsWith(tm === 'ORDER' ? 'T2' : 'T1')).length}`, ` 🐉 ${st.drag[tm].length}`, st.grubs[tm] ? ` 🪲 ${st.grubs[tm]}` : '', st.baron[tm] ? ` 🟣 ${st.baron[tm]}` : '');
      board.replaceChildren(h('div', { class: 'sp-score' }, objs('ORDER'), h('div', { class: 'sp-k2' }, h('b', { class: 'blue' }, st.kills.ORDER), h('span', { class: 'muted' }, mmss(t)), h('b', { class: 'red' }, st.kills.CHAOS)), objs('CHAOS')),
        h('div', { class: 'rv-teams' }, side('ORDER'), side('CHAOS')));
    }
    // Fil : les événements, cliquables pour aller au moment.
    const feed = document.querySelector('.rv-feed');
    const fkey = RV.filter + ':' + Math.floor(t / 3) + ':' + (g.events || []).length;
    if (feed && feed.dataset.k !== fkey) {
      const sc = feed.querySelector('.rv-fl') ? feed.querySelector('.rv-fl').scrollTop : 0;
      feed.dataset.k = fkey;
      setTimeout(() => { const fl = feed.querySelector('.rv-fl'); if (fl) fl.scrollTop = sc; }, 0);
      const keep = (e) => RV.filter === 'tout' ? /ChampionKill|DragonKill|BaronKill|HeraldKill|HordeKill|AtakhanKill|TurretKilled|InhibKilled|Multikill|Ace/.test(e.x) : RV.filter === 'kills' ? /ChampionKill|Multikill|Ace/.test(e.x) : /DragonKill|BaronKill|HeraldKill|HordeKill|AtakhanKill|TurretKilled|InhibKilled/.test(e.x);
      const lab = (e) => ({ DragonKill: '🐉 Dragon ' + (((SP_DRAG[e.dr] || [])[1]) || e.dr || '').toLowerCase(), BaronKill: '🟣 Nashor', HeraldKill: '👁 Héraut', HordeKill: '🪲 Larve', AtakhanKill: '🔥 Atakhan', TurretKilled: '🏰 Tour', InhibKilled: '⬢ Inhibiteur', Multikill: ['', '', 'Double kill', 'Triple kill', 'Quadra kill', 'PENTAKILL'][e.ks] || 'Multikill', Ace: 'Ace' })[e.x];
      const evs = (g.events || []).filter(keep);
      feed.replaceChildren(h('div', { class: 'row rv-ff' }, [['tout', 'Tout'], ['kills', 'Kills'], ['obj', 'Objectifs']].map(([k, l]) => h('button', { class: 'chip', 'aria-pressed': String(RV.filter === k), onclick: () => { RV.filter = k; rvPaint(); } }, l))),
        h('div', { class: 'rv-fl' }, evs.map((e) => { const kt = tOf(e.k) || (e.x === 'ChampionKill' ? (tOf(e.v) === 'ORDER' ? 'CHAOS' : 'ORDER') : '');
          return h('button', { class: 'sp-f ' + (kt === 'ORDER' ? 'blue' : kt === 'CHAOS' ? 'red' : '') + (Math.abs(e.t - t) < 6 ? ' now' : ''), onclick: () => rvSeek(e.t - 3) },
            h('small', { class: 'muted sp-ft' }, mmss(e.t)),
            e.x === 'ChampionKill' ? [cOf(e.k) ? champIcon(cOf(e.k), 20) : h('span', null, '💀'), h('span', { class: 'sp-sw' }, '⚔'), cOf(e.v) ? champIcon(cOf(e.v), 20) : h('span', null, '?'), e.a && e.a.length ? h('small', { class: 'muted' }, ` +${e.a.length}`) : null]
              : [h('span', null, lab(e)), cOf(e.k) ? champIcon(cOf(e.k), 18) : null]); })));
    }
    // Timeline : curseur, lecture, marques des kills, objectifs, notes et clips.
    const tl = document.querySelector('.rv-tl');
    if (tl) {
      const D = Math.max(1, g.duration || 1);
      const marks = [];
      for (const e of g.events || []) {
        if (!/ChampionKill|DragonKill|BaronKill|HeraldKill|HordeKill|AtakhanKill|TurretKilled|InhibKilled/.test(e.x)) continue;
        const kt = tOf(e.k) || (e.x === 'ChampionKill' ? (tOf(e.v) === 'ORDER' ? 'CHAOS' : 'ORDER') : '');
        marks.push(h('i', { class: 'rv-m ' + (e.x === 'ChampionKill' ? 'k ' : 'o ') + (kt === 'ORDER' ? 'blue' : 'red'), style: `left:${e.t / D * 100}%`, title: mmss(e.t) }));
      }
      for (const n of g.notes || []) marks.push(h('i', { class: 'rv-m n', style: `left:${n.t / D * 100}%`, title: 'Note : ' + (n.text || 'dessin') }));
      const clips = (CL.list || []).filter((c) => c.t >= g.start && c.t <= g.start + D * 1000 + 90000);
      for (const c of clips) { const ct = Math.max(0, (c.t - g.start) / 1000); marks.push(h('i', { class: 'rv-m c', style: `left:${Math.min(100, ct / D * 100)}%`, title: 'Clip : ' + clipTitle(c), onclick: (e) => { e.stopPropagation(); CL.sel = c.path; go('clips'); } }, '🎬')); }
      const bar = h('div', { class: 'rv-bar', onclick: (e) => { const r = e.currentTarget.getBoundingClientRect(); rvSeek((e.clientX - r.left) / r.width * D); } }, h('div', { class: 'rv-fill', style: `width:${t / D * 100}%` }), ...marks, h('i', { class: 'rv-head-m', style: `left:${t / D * 100}%` }));
      tl.replaceChildren(...[h('button', { class: 'btn-fire small-btn rv-pl', onclick: rvPlay }, RV.play ? '⏸' : '▶'),
        h('b', { class: 'rv-time' }, `${mmss(t)} / ${mmss(D)}`), bar,
        h('select', { class: 'inp rv-sp', onchange: (e) => { RV.speed = Number(e.target.value); const v = rvVid(); if (v) v.playbackRate = Math.min(16, RV.speed); } }, (rvVid() ? [1, 2, 4, 8, 16] : [4, 8, 16, 32]).map((x) => h('option', { value: x, selected: RV.speed === x ? true : null }, `×${x}`))),
        clips.length ? h('small', { class: 'muted' }, `🎬 ${clips.length} clip${clips.length > 1 ? 's' : ''}`) : null].filter(Boolean));
    }
    // Combats : gagnés / perdus, cliquables ; sur un combat perdu, on coche ce qui n'a pas marché (ça devient une note).
    const fb = document.querySelector('.rv-fights');
    if (fb) {
      if (!RV.fights || RV.fights.g !== g) RV.fights = { g, list: rvFights(g).filter((x) => x.n >= 2 || x.me) };
      const cur = RV.fights.list.find((x) => t >= x.start - 8 && t <= x.end + 6);
      const fk = (cur ? cur.start : '-') + ':' + (RV.ftag ? RV.ftag.start + RV.ftag.tags.join() : '') + ':' + (g.notes || []).length;
      if (fb.dataset.k !== fk) {
        fb.dataset.k = fk;
        const sc = fb.querySelector('.rv-fgl') ? fb.querySelector('.rv-fgl').scrollTop : 0;
        setTimeout(() => { const l = fb.querySelector('.rv-fgl'); if (l) l.scrollTop = sc; }, 0);
        const tagged = (f) => (g.notes || []).some((n) => n.fight === f.start);
        const L = RV.fights.list;
        const won = L.filter((x) => x.won).length, lost = L.filter((x) => x.lost).length;
        fb.replaceChildren(
          h('div', { class: 'row rv-fh' }, h('b', null, '⚔ Combats'), L.length ? h('small', { class: 'muted' }, `${won} gagné${won > 1 ? 's' : ''} · ${lost} perdu${lost > 1 ? 's' : ''}`) : null),
          L.length ? h('div', { class: 'rv-fgl' }, L.map((f) => {
            const open = RV.ftag && RV.ftag.start === f.start;
            return h('div', { class: 'rv-fg' + (f.won ? ' won' : f.lost ? ' lost' : '') + (cur === f ? ' now' : '') },
              h('button', { class: 'rv-fgb', onclick: () => rvSeek(f.start - 8) },
                h('small', { class: 'muted sp-ft' }, mmss(f.start)), h('span', null, f.label),
                f.me ? h('small', { class: 'rv-fme' }, { kill: 'tu tues', assist: 'tu assistes', mort: 'tu meurs' }[f.me]) : null),
              f.lost || f.me === 'mort' ? h('button', { class: 'chip rv-fq' + (tagged(f) ? ' done' : ''), title: 'Qu’est-ce qui n’a pas marché ?', onclick: () => { RV.ftag = open ? null : { start: f.start, tags: [] }; rvPaint(); } }, tagged(f) ? '✓ analysé' : '❓ Pourquoi ?') : null,
              open ? h('div', { class: 'rv-ftags' }, h('small', { class: 'muted' }, 'Qu’est-ce qui n’a pas marché ? (plusieurs choix possibles)'),
                h('div', { class: 'row' }, RV_TAGS.map((tg) => h('button', { class: 'chip', 'aria-pressed': String(RV.ftag.tags.includes(tg)), onclick: () => { const a = RV.ftag.tags; const i = a.indexOf(tg); if (i >= 0) a.splice(i, 1); else a.push(tg); rvPaint(); } }, tg))),
                h('button', { class: 'btn-fire small-btn', disabled: RV.ftag.tags.length ? null : '', onclick: async () => {
                  const n = { id: Math.random().toString(36).slice(2, 10), t: Math.round(f.start), by: vocalMe(), fight: f.start, text: `Combat perdu ${f.mine}–${f.theirs}${f.obj ? ' (' + f.obj + ')' : ''} : ${RV.ftag.tags.join(', ')}`, at: Date.now(), draw: [] };
                  g.notes = (g.notes || []).concat(n).sort((a, b) => a.t - b.t); RV.ftag = null;
                  if (RV.src === 'team') { const r = await window.fire.revues.note(g.id, n).catch(() => null); if (r && r.ok) g.notes = r.notes; } else await window.fire.parties.save(g).catch(() => {});
                  rvPaint();
                } }, 'Enregistrer en note')) : null);
          })) : h('small', { class: 'muted' }, 'Aucun combat dans cette partie.'));
      }
    }
    // Notes.
    const nb = document.querySelector('.rv-notes');
    const nkey = (g.notes || []).map((n) => n.id).join() + ':' + Math.floor(t / 4);
    if (nb && nb.dataset.k !== nkey && (nb.dataset.k = nkey)) nb.replaceChildren(...((g.notes || []).length ? g.notes.map((n) => h('div', { class: 'rv-note' + (Math.abs(n.t - t) < 4 ? ' now' : '') },
      h('button', { class: 'chip', onclick: () => { rvStop(); RV.show = n.draw || []; RV.strokes = []; rvSeek(n.t); rvDrawPaint(); } }, '⏱ ' + mmss(n.t)),
      h('div', null, h('b', null, vocalName(n.by) || 'Moi'), (n.draw || []).length ? h('small', { class: 'muted' }, ' · ✏️ dessin') : null, h('p', null, n.text)),
      (n.by === vocalMe() || isStaff()) ? h('button', { class: 'btn-ghost', title: 'Retirer', onclick: async () => {
        g.notes = g.notes.filter((x) => x.id !== n.id);
        if (RV.src === 'team') { const r = await window.fire.revues.note(g.id, n, true).catch(() => null); if (r && r.ok) g.notes = r.notes; } else await window.fire.parties.save(g).catch(() => {});
        rvPaint(); } }, '✕') : null)) : [h('p', { class: 'muted small' }, 'Aucune note. Mets la partie au bon moment, dessine sur la carte si besoin, écris ta remarque et ajoute-la.')]));
  }



  // ===== Scrims : les séances contre d'autres équipes. Les parties personnalisées partagées sont détectées toutes seules,
  // on les range par scrim (adversaire, côté, résultat, notes) et on suit le bilan. Données chiffrées avec le code d'équipe.
  const SC = { list: null, rv: null, err: '', edit: null, busy: false };
  const scIsScrim = (x) => x && x.mode === 'CLASSIC' && x.queue && (x.queue.custom || Number(x.queue.id) <= 0);
  const scDay = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const scDateFr = (ymd) => new Date(ymd + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  async function scLoad() {
    if (!window.fire.scrims) return;
    const [a, b] = await Promise.all([window.fire.scrims.list().catch((e) => ({ ok: false, error: String(e), list: [] })), window.fire.revues.list().catch(() => ({ list: [] }))]);
    SC.list = (a && a.list) || []; SC.err = a && !a.ok ? a.error || '' : '';
    SC.rv = ((b && b.list) || []).filter(scIsScrim);
    if (S.section === 'scrims') renderScrims();
  }
  // Une même game est partagée par chaque joueur : on regroupe les copies (même début à 90 s près, même durée).
  function scGames() {
    const out = [];
    for (const x of (SC.rv || []).slice().sort((a, b) => a.start - b.start)) {
      const g = out.find((o) => Math.abs(o.start - x.start) < 90000 && Math.abs((o.duration || 0) - (x.duration || 0)) < 8);
      if (g) g.ids.push(String(x.id)); else out.push({ ...x, ids: [String(x.id)] });
    }
    return out;
  }
  const scSide = (x) => { const me = (x.players || []).find((p) => p.n === x.me); return me ? (me.team === 'ORDER' ? 'bleu' : 'rouge') : ''; };
  const scRes = (x) => (/win/i.test(x.result || '') ? 'win' : /lose/i.test(x.result || '') ? 'lose' : '');
  async function scSave(op) {
    SC.busy = true; renderScrims();
    const r = await window.fire.scrims.save(op, vocalMe()).catch((e) => ({ ok: false, error: String(e) }));
    SC.busy = false;
    if (r && r.ok) { SC.list = r.list; SC.edit = null; SC.err = ''; actLog('app', op.del ? 'Scrim supprimé' : 'Scrim enregistré'); }
    else SC.err = (r && r.error) || 'échec';
    renderScrims();
  }
  function scOpenRevue(rid) { go('revue'); rvOpen(rid, 'team'); }
  function scForm(sc) {
    const f = JSON.parse(JSON.stringify(sc));
    const box = h('div', { class: 'card sc-form' });
    const paint = () => {
      box.replaceChildren(h('h3', null, sc.id ? '✏️ Modifier le scrim' : '➕ Nouveau scrim'),
        h('div', { class: 'row sc-fr' },
          h('label', null, h('small', { class: 'muted' }, 'Date'), h('input', { class: 'inp', type: 'date', value: f.date, onchange: (e) => { f.date = e.target.value; } })),
          h('label', { class: 'sc-adv' }, h('small', { class: 'muted' }, 'Équipe adverse'), h('input', { class: 'inp', value: f.adv || '', maxlength: 60, placeholder: 'ex. Team Nova', oninput: (e) => { f.adv = e.target.value; } })),
          h('label', null, h('small', { class: 'muted' }, 'Format'), h('select', { class: 'inp', onchange: (e) => { f.format = e.target.value; } }, ['', 'BO1', 'BO3', 'BO5', 'Blocs de games', 'Libre'].map((x) => h('option', { value: x, selected: f.format === x ? true : null }, x || '—'))))),
        h('div', { class: 'sc-fg' }, (f.games || []).map((g, i) => h('div', { class: 'row sc-fgr' },
          h('b', null, `Game ${i + 1}`),
          h('select', { class: 'inp', onchange: (e) => { g.side = e.target.value; } }, [['', 'Côté ?'], ['bleu', '🔵 Bleu'], ['rouge', '🔴 Rouge']].map(([v, l]) => h('option', { value: v, selected: g.side === v ? true : null }, l))),
          h('select', { class: 'inp', onchange: (e) => { g.res = e.target.value; } }, [['', 'Résultat ?'], ['win', '✅ Victoire'], ['lose', '❌ Défaite']].map(([v, l]) => h('option', { value: v, selected: g.res === v ? true : null }, l))),
          h('input', { class: 'inp sc-gn', value: g.notes || '', maxlength: 600, placeholder: 'Ce qui a marché, ce qui n’a pas marché…', oninput: (e) => { g.notes = e.target.value; } }),
          g.rid ? h('small', { class: 'muted' }, '🎞️ revue liée') : null,
          h('button', { class: 'btn-ghost', title: 'Retirer cette game', onclick: () => { f.games.splice(i, 1); paint(); } }, '✕')))),
        h('button', { class: 'btn-ghost', onclick: () => { f.games = (f.games || []).concat({ rid: null, res: '', side: '', notes: '' }); paint(); } }, '➕ Ajouter une game'),
        h('textarea', { class: 'inp sc-notes', rows: 3, maxlength: 2000, placeholder: 'Notes du scrim : leur style, leurs picks, ce qu’on doit travailler…', oninput: (e) => { f.notes = e.target.value; } }, f.notes || ''),
        h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', disabled: SC.busy ? '' : null, onclick: () => { if (!String(f.adv || '').trim()) { alert('Indique l’équipe adverse.'); return; } scSave({ scrim: f }); } }, SC.busy ? 'Enregistrement…' : '💾 Enregistrer'),
          h('button', { class: 'btn-ghost', onclick: () => { SC.edit = null; renderScrims(); } }, 'Annuler')));
    };
    paint();
    return box;
  }
  function renderScrims() {
    const view = $('view');
    if (SUB()) { view.replaceChildren(h('div', { class: 'card' }, h('p', null, 'Les scrims sont réservés à l’équipe principale.'))); return; }
    if (SC.list == null) { SC.list = []; SC.rv = []; scLoad(); }
    const L = SC.list || [];
    const games = L.flatMap((x) => x.games.map((g) => ({ ...g, adv: x.adv })));
    const W = games.filter((g) => g.res === 'win').length, D = games.filter((g) => g.res === 'lose').length;
    const pct = (w, d) => (w + d ? Math.round(w / (w + d) * 100) + ' %' : '—');
    const side = (sd) => { const g = games.filter((x) => x.side === sd); const w = g.filter((x) => x.res === 'win').length, d = g.filter((x) => x.res === 'lose').length; return `${w} V – ${d} D (${pct(w, d)})`; };
    const byAdv = {};
    for (const g of games) { const k = g.adv || '?'; byAdv[k] = byAdv[k] || { w: 0, d: 0, n: 0 }; byAdv[k].n++; if (g.res === 'win') byAdv[k].w++; if (g.res === 'lose') byAdv[k].d++; }
    const linked = new Set(L.flatMap((x) => x.games.map((g) => g.rid).filter(Boolean)));
    const det = scGames().filter((g) => !g.ids.some((id) => linked.has(id)));
    const days = {}; for (const g of det) (days[scDay(g.start)] = days[scDay(g.start)] || []).push(g);
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🤝'), h('div', null, h('h1', { class: 'title' }, 'Scrims'),
      h('p', { class: 'muted' }, 'Vos séances contre d’autres équipes. Les parties personnalisées que vous jouez sont repérées toutes seules (elles sont partagées et analysées par l’IA comme les autres) : range-les par scrim, note l’adversaire, le côté et ce qu’il faut retenir. Chaque game se revoit dans la Revue, aussi en direct avec toute l’équipe.')));
    view.replaceChildren(...[hero,
      SC.err ? h('p', { class: 'bad small' }, '⚠ ' + SC.err) : null,
      L.length ? h('div', { class: 'card sc-stats' },
        h('div', { class: 'sc-big' }, h('b', null, `${W} – ${D}`), h('small', { class: 'muted' }, `${games.length} games · ${L.length} scrim${L.length > 1 ? 's' : ''} · ${pct(W, D)} de victoires`)),
        h('div', { class: 'sc-sides' }, h('span', null, '🔵 Côté bleu : ' + side('bleu')), h('span', null, '🔴 Côté rouge : ' + side('rouge'))),
        h('div', { class: 'sc-advs' }, Object.entries(byAdv).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => h('span', { class: 'chip' }, `${k} · ${v.w}–${v.d}`)))) : null,
      Object.keys(days).length ? h('div', { class: 'card sc-det' }, h('h3', null, '🔎 Games de scrim repérées'),
        Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])).map(([day, gs]) => {
          const same = L.find((x) => x.date === day);
          const fromDet = () => gs.map((g) => ({ rid: g.ids[0], res: scRes(g), side: scSide(g), notes: '' }));
          return h('div', { class: 'row sc-dr' },
            h('div', { class: 'sc-dd' }, h('b', null, scDateFr(day)), h('small', { class: 'muted' }, `${gs.length} game${gs.length > 1 ? 's' : ''} · ${gs.filter((g) => scRes(g) === 'win').length} V – ${gs.filter((g) => scRes(g) === 'lose').length} D`)),
            h('div', { class: 'row sc-dg' }, gs.map((g) => { const meP = (g.players || []).find((p) => p.n === g.me) || {}; return h('button', { class: 'chip', title: 'Revoir', onclick: () => scOpenRevue(g.ids[0]) }, meP.c ? champIcon(meP.c, 18) : null, ` ${scSide(g) === 'bleu' ? '🔵' : '🔴'} ${scRes(g) === 'win' ? 'V' : scRes(g) === 'lose' ? 'D' : '?'} · ${mmss(g.duration || 0)}`); })),
            same ? h('button', { class: 'btn-ghost', onclick: () => scSave({ scrim: { ...same, games: same.games.concat(fromDet()) } }) }, `➕ Ajouter au scrim contre ${same.adv}`) : null,
            h('button', { class: 'btn-fire small-btn', onclick: () => { SC.edit = { date: day, adv: '', format: '', notes: '', games: fromDet() }; renderScrims(); window.scrollTo(0, 0); } }, '🤝 Créer le scrim'));
        })) : null,
      SC.edit ? scForm(SC.edit) : h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => { SC.edit = { date: scDay(Date.now()), adv: '', format: 'BO3', notes: '', games: [{ rid: null, res: '', side: '', notes: '' }] }; renderScrims(); } }, '➕ Nouveau scrim'), h('button', { class: 'btn-ghost', onclick: () => { SC.list = null; renderScrims(); } }, '⟳ Actualiser')),
      L.length ? h('div', { class: 'sc-list' }, L.map((x) => {
        const w = x.games.filter((g) => g.res === 'win').length, d = x.games.filter((g) => g.res === 'lose').length;
        return h('div', { class: 'card sc-card ' + (w > d ? 'win' : d > w ? 'lose' : '') },
          h('div', { class: 'row sc-ch' }, h('b', { class: 'sc-score' }, `${w} – ${d}`), h('div', null, h('h3', null, 'vs ' + x.adv), h('small', { class: 'muted' }, [scDateFr(x.date), x.format, x.by ? 'noté par ' + rvlName(x.by) : ''].filter(Boolean).join(' · '))),
            h('button', { class: 'btn-ghost', onclick: () => { SC.edit = x; renderScrims(); window.scrollTo(0, 0); } }, '✏️'),
            h('button', { class: 'btn-ghost', onclick: () => { if (confirm(`Supprimer le scrim contre ${x.adv} du ${scDateFr(x.date)} ?`)) scSave({ del: x.id }); } }, '🗑')),
          h('div', { class: 'sc-games' }, x.games.map((g, i) => h('div', { class: 'row sc-g ' + (g.res || '') },
            h('b', null, `Game ${i + 1}`), h('span', null, g.side === 'bleu' ? '🔵 Bleu' : g.side === 'rouge' ? '🔴 Rouge' : '—'), h('span', { class: g.res === 'win' ? 'good' : g.res === 'lose' ? 'bad' : 'muted' }, g.res === 'win' ? 'Victoire' : g.res === 'lose' ? 'Défaite' : '?'),
            g.notes ? h('small', { class: 'muted sc-gnote' }, g.notes) : h('span', { class: 'sc-gnote' }),
            g.rid ? h('button', { class: 'btn-ghost', onclick: () => scOpenRevue(g.rid) }, '🎞️ Revoir') : null))),
          x.notes ? h('p', { class: 'sc-n' }, x.notes) : null);
      })) : (!Object.keys(days).length ? h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Aucun scrim pour l’instant. Jouez une partie personnalisée avec FIRE ouvert : elle apparaîtra ici, prête à être rangée. Tu peux aussi en ajouter un à la main.')) : null)].filter(Boolean));
  }

  // ===== Puzzle du jour : une situation de partie, plusieurs bonnes réponses selon le style, au moins une mauvaise =====
  const GP = { cur: null, pick: null, order: [], role: null, th: 'all', mode: 'jour' };
  const gpData = () => window.FIRE_PUZZLES || { P: [], SP: {}, THEMES: {}, ROLES: {}, STYLES: {} };
  const gpSave = () => load('fire.puzzle', { days: {}, seen: {} });
  const gpToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  // Même puzzle du jour pour toute l'équipe (tiré de la date).
  function gpDaily() {
    const L = gpData().P; if (!L.length) return null;
    let x = 0; for (const c of gpToday()) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    return L[x % L.length];
  }
  function gpStreak() {
    const days = gpSave().days || {};
    let n = 0; const d = new Date();
    if (!days[gpToday()]) d.setDate(d.getDate() - 1);
    for (;;) { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; if (!days[k]) break; n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const GP_V = { P: ['✅', 'Ce qu’un pro ferait', 'pro'], O: ['🟡', 'Jouable, pas optimal', 'ok'], X: ['❌', 'Mauvaise réponse', 'bad'] };
  function gpOpen(p) { GP.cur = p; GP.pick = null; GP.order = p.a.map((_, i) => i).sort(() => Math.random() - 0.5); renderGamePuzzle(); window.scrollTo(0, 0); }
  function gpNext() {
    const D = gpData(); const seen = gpSave().seen || {};
    const ok = (p) => (GP.th === 'all' || p.th === GP.th) && (!GP.role || GP.role === 'all' || p.role === GP.role || p.role === 'all');
    const pool = D.P.filter(ok);
    const fresh = pool.filter((p) => !seen[p.id] && p !== GP.cur);
    const L = fresh.length ? fresh : pool.filter((p) => p !== GP.cur);
    if (!L.length) return;
    gpOpen(L[Math.floor(Math.random() * L.length)]);
  }
  function gpAnswer(i) {
    const p = GP.cur; if (!p || GP.pick != null) return;
    GP.pick = i;
    const v = p.a[i].v;
    const sv = gpSave(); sv.seen = sv.seen || {}; sv.days = sv.days || {};
    if (!sv.seen[p.id] || v === 'P') sv.seen[p.id] = v;
    const daily = gpDaily();
    if (daily && daily.id === p.id && !sv.days[gpToday()]) sv.days[gpToday()] = { id: p.id, v };
    save('fire.puzzle', sv); renderNav();
    actLog('app', v === 'P' ? 'Puzzle réussi' : 'Puzzle tenté');
    renderGamePuzzle();
  }
  function gpMap(p) {
    const D = gpData(); const m = p.map; if (!m) return null;
    const at = (x) => (typeof x === 'string' ? D.SP[x] : x) || [500, 500];
    const v = (S.champList && S.champList.version) || '14.1.1';
    const pts = [];
    for (const [pos, tm] of m.w || []) { const [x, y] = at(pos); pts.push(h('span', { class: 'gp-ward ' + (tm === 'r' ? 'red' : 'blue'), style: `left:${x / 10}%;top:${y / 10}%`, title: 'Balise' })); }
    for (const [side, cls] of [['b', 'blue'], ['r', 'red']]) for (const [c, pos, guess] of m[side] || []) {
      const [x, y] = at(pos);
      pts.push(h('span', { class: `rv-champ ${cls}${guess ? ' gp-guess' : ''}`, style: `left:${x / 10}%;top:${y / 10}%`, title: FC.champName(c) + (guess ? ' (dernière position connue)' : '') }, champIcon(c, 30)));
    }
    return h('div', { class: 'rv-map gp-map' }, h('img', { class: 'rv-mapimg', alt: '', src: `https://ddragon.leagueoflegends.com/cdn/${v}/img/map/map11.png` }), h('div', { class: 'rv-ov' }, ...pts),
      h('div', { class: 'gp-leg' }, h('span', null, h('i', { class: 'blue' }), 'Ton équipe'), h('span', null, h('i', { class: 'red' }), 'Adversaires'), h('span', null, h('i', { class: 'red guess' }), 'Dernière position connue')));
  }
  function gpCard(p) {
    const D = gpData();
    const done = GP.pick != null;
    const chosen = done ? p.a[GP.pick] : null;
    const pros = p.a.filter((a) => a.v === 'P');
    const ans = GP.order.map((i) => {
      const a = p.a[i]; const [ico, lab, cls] = GP_V[a.v];
      return h('button', { class: 'gp-a' + (done ? ' ' + cls : '') + (GP.pick === i ? ' picked' : ''), disabled: done ? '' : null, onclick: () => gpAnswer(i) },
        h('div', { class: 'gp-at' }, done ? h('span', { class: 'gp-v' }, ico) : null, h('b', null, a.txt)),
        done ? h('div', { class: 'gp-ae' }, h('div', { class: 'row gp-tags' }, h('span', { class: 'gp-vl ' + cls }, lab), h('span', { class: 'chip gp-st' }, D.STYLES[a.s] || a.s), GP.pick === i ? h('span', { class: 'gp-you' }, 'ta réponse') : null),
          h('p', null, h('b', null, '🎙 Lecture pro : '), a.e)) : null);
    });
    return h('div', { class: 'card gp-card' },
      h('div', { class: 'row gp-meta' }, h('span', { class: 'chip' }, D.THEMES[p.th] || p.th), h('span', { class: 'chip' }, D.ROLES[p.role] || p.role), h('span', { class: 'chip' }, '⏱ ' + p.t), h('span', { class: 'gp-diff' }, '★'.repeat(p.d) + '☆'.repeat(3 - p.d))),
      h('h2', { class: 'gp-title' }, p.titre),
      h('div', { class: 'gp-body' + (p.map ? '' : ' nomap') }, p.map ? gpMap(p) : null,
        h('div', { class: 'gp-right' }, h('p', { class: 'gp-sit' }, p.sit), h('h3', { class: 'gp-q' }, p.q), h('div', { class: 'gp-ans' }, ...ans))),
      done ? h('div', { class: 'gp-res ' + GP_V[chosen.v][2] },
        h('b', null, chosen.v === 'P' ? '🔥 Bien joué, c’est une réponse de pro.' : chosen.v === 'O' ? '🟡 Jouable, mais il y avait mieux.' : '❌ Pas cette fois.'),
        h('p', { class: 'muted' }, pros.length > 1 ? `${pros.length} réponses sont « pro » ici : ${pros.map((a) => D.STYLES[a.s] || a.s).join(' et ')}. Elles dépendent de ton style et de ce que ton équipe veut jouer.` : 'Une seule réponse « pro » ici : relis la lecture pro pour comprendre ce qui la rend meilleure.'),
        h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: gpNext }, 'Puzzle suivant →'), h('button', { class: 'btn-ghost', onclick: () => { GP.cur = null; renderGamePuzzle(); } }, '← Retour'))) : null);
  }
  function renderGamePuzzle() {
    const view = $('view'); const D = gpData();
    if (GP.role == null) GP.role = myRole() || 'all';
    const sv = gpSave(); const seen = sv.seen || {};
    const total = D.P.length, found = D.P.filter((p) => seen[p.id] === 'P').length;
    const daily = gpDaily(); const dDone = (sv.days || {})[gpToday()];
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🧩'), h('div', null, h('h1', { class: 'title' }, 'Puzzle du jour'),
      h('p', { class: 'muted' }, 'Une situation de partie, à toi de décider. Souvent plusieurs réponses sont « pro » selon ton style (agressif, prudent, macro…), et il y a toujours au moins un piège. Après ta réponse, la lecture pro explique chaque choix.'),
      h('div', { class: 'row gp-stats' }, h('span', { class: 'chip' }, `🔥 Série : ${gpStreak()} jour${gpStreak() > 1 ? 's' : ''}`), h('span', { class: 'chip' }, `✅ ${found} / ${total} puzzles réussis`))));
    if (GP.cur) { view.replaceChildren(hero, gpCard(GP.cur)); return; }
    const chips = (obj, cur, set) => h('div', { class: 'row gp-filt' }, Object.entries(obj).map(([k, l]) => h('button', { class: 'chip', 'aria-pressed': String(cur === k), onclick: () => { set(k); renderGamePuzzle(); } }, l)));
    const ths = { all: 'Tous les thèmes', ...D.THEMES };
    const list = D.P.filter((p) => (GP.th === 'all' || p.th === GP.th) && (GP.role === 'all' || p.role === GP.role || p.role === 'all'));
    view.replaceChildren(hero,
      daily ? h('div', { class: 'card gp-daily' + (dDone ? ' done' : '') },
        h('div', null, h('small', { class: 'muted' }, 'Puzzle du jour · le même pour toute l’équipe'), h('h2', null, daily.titre), h('p', { class: 'muted' }, `${D.THEMES[daily.th]} · ${D.ROLES[daily.role]} · ${'★'.repeat(daily.d)}`)),
        h('button', { class: 'btn-fire', onclick: () => gpOpen(daily) }, dDone ? `${GP_V[dDone.v][0]} Revoir` : '🧩 Jouer')) : null,
      h('div', { class: 'card' }, h('h3', null, '🎯 Entraînement libre'),
        chips(D.ROLES, GP.role, (k) => { GP.role = k; }), chips(ths, GP.th, (k) => { GP.th = k; }),
        h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', disabled: list.length ? null : '', onclick: gpNext }, '🎲 Un puzzle au hasard'), h('small', { class: 'muted' }, `${list.length} puzzle${list.length > 1 ? 's' : ''} dans cette sélection`)),
        h('div', { class: 'gp-list' }, list.map((p) => h('button', { class: 'gp-li ' + (seen[p.id] ? GP_V[seen[p.id]][2] : ''), onclick: () => gpOpen(p) },
          h('span', null, seen[p.id] ? GP_V[seen[p.id]][0] : '·'), h('b', null, p.titre), h('small', { class: 'muted' }, `${D.THEMES[p.th]} · ${'★'.repeat(p.d)}`))))));
  }

  // ===== Parcours : arbre de compétences (5 thèmes × 4 niveaux). Réussir les puzzles d'une étape débloque la suivante. =====
  const PC = { open: null, i: 0, ok: 0, ans: null, order: [] };
  const pcData = () => window.FIRE_PARCOURS || { THEMES: [], LEVELS: [], NODES: [] };
  const pcProg = () => load('fire.parcours', {});
  const pcDone = (id) => !!(pcProg()[id] && pcProg()[id].done);
  function pcUnlocked(n) {
    if (n.lv === 0) return true;
    const prev = pcData().NODES.find((x) => x.th === n.th && x.lv === n.lv - 1);
    return !prev || pcDone(prev.id);
  }
  function pcStart(n) { PC.open = n.id; PC.i = 0; PC.ok = 0; PC.ans = null; PC.lesson = true; PC.order = shuffle(n.q.map((_, i) => i)); PC.perm = n.q.map((q) => shuffle(q.o.map((_, i) => i))); render(); window.scrollTo(0, 0); }
  function renderParcours() {
    const view = $('view');
    const D = pcData();
    const prog = pcProg();
    const total = D.NODES.length, done = D.NODES.filter((n) => pcDone(n.id)).length;
    const n = PC.open && D.NODES.find((x) => x.id === PC.open);
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🗺️'), h('div', null, h('h1', { class: 'title' }, 'Parcours'),
      h('p', { class: 'muted' }, 'La carte des compétences de macro. Chaque étape : une courte leçon, puis 4 puzzles. Réussis-en 3 pour débloquer le niveau suivant du thème, de Facile jusqu’à Pro.'),
      h('div', { class: 'pc-total' }, h('div', { class: 'prog' }, h('i', { style: `width:${Math.round(done / Math.max(1, total) * 100)}%` })), h('small', null, `${done} / ${total} étapes réussies`))));
    if (n) { view.replaceChildren(hero, pcStep(n)); return; }
    const grid = h('div', { class: 'pc-grid', style: `grid-template-columns: 90px repeat(${D.THEMES.length}, 1fr)` },
      h('div'), ...D.THEMES.map(([k, ico, name]) => h('div', { class: 'pc-th' }, h('span', null, ico), h('b', null, name))),
      ...D.LEVELS.flatMap(([lab, col], lv) => [h('div', { class: 'pc-lv', style: `--c:${col}` }, h('i'), h('span', null, lab)),
        ...D.THEMES.map(([k]) => {
          const x = D.NODES.find((y) => y.th === k && y.lv === lv);
          if (!x) return h('div');
          const ok = pcDone(x.id), open = pcUnlocked(x), best = prog[x.id] && prog[x.id].best;
          return h('button', { class: 'pc-node' + (ok ? ' done' : open ? ' open' : ' locked'), style: `--c:${col}`, disabled: open ? null : true, title: open ? '' : 'Réussis d’abord l’étape du dessus', onclick: () => pcStart(x) },
            h('span', { class: 'pc-ico' }, x.ico), h('b', null, x.t), h('small', null, ok ? `✅ Réussie · ${best}/4` : open ? 'À faire' : '🔒 Verrouillée'));
        })]));
    view.replaceChildren(hero, grid);
  }
  function pcStep(n) {
    const D = pcData();
    const [lab, col] = D.LEVELS[n.lv];
    const th = D.THEMES.find(([k]) => k === n.th) || ['', '', ''];
    const back = h('button', { class: 'btn-ghost', onclick: () => { PC.open = null; render(); } }, '← Carte du parcours');
    const head = h('div', { class: 'pc-head' }, back, h('span', { class: 'pc-tag', style: `--c:${col}` }, `${th[1]} ${th[2]} · ${lab}`), h('h2', null, `${n.ico} ${n.t}`));
    if (PC.lesson) return h('div', { class: 'card pc-step' }, head, h('h3', null, '📘 La leçon'), h('ul', { class: 'pc-lesson' }, n.l.map((x) => h('li', null, x))),
      h('button', { class: 'btn-fire small-btn', onclick: () => { PC.lesson = false; render(); } }, `▶ Passer aux puzzles (${n.q.length})`));
    if (PC.i >= n.q.length) {
      const win = PC.ok >= Math.ceil(n.q.length * 0.75);
      if (!PC.saved) {
        PC.saved = true;
        const p = pcProg(); const cur = p[n.id] || {};
        p[n.id] = { done: cur.done || win, best: Math.max(cur.best || 0, PC.ok), at: Date.now() };
        save('fire.parcours', p);
        actLog('jeu', `Parcours : ${n.t} ${win ? 'réussie' : 'ratée'} (${PC.ok}/${n.q.length})`);
      }
      const next = D.NODES.find((x) => x.th === n.th && x.lv === n.lv + 1);
      return h('div', { class: 'card pc-step pc-end ' + (win ? 'win' : 'lose') }, head,
        h('div', { class: 'pc-big' }, win ? '🏅 Étape réussie !' : '😤 Pas encore…'),
        h('p', null, `${PC.ok} / ${n.q.length} bonnes réponses${win ? '' : ' : il en faut ' + Math.ceil(n.q.length * 0.75) + ' pour valider.'}`),
        h('div', { class: 'row' },
          win && next ? h('button', { class: 'btn-fire small-btn', onclick: () => { PC.saved = false; pcStart(next); } }, `Débloqué : ${next.ico} ${next.t} ▶`) : null,
          !win ? h('button', { class: 'btn-fire small-btn', onclick: () => { PC.saved = false; pcStart(n); } }, '↻ Réessayer') : null,
          h('button', { class: 'btn-ghost', onclick: () => { PC.saved = false; PC.open = null; render(); } }, 'Carte du parcours')));
    }
    const q = n.q[PC.order[PC.i]];
    const answered = PC.ans != null;
    return h('div', { class: 'card pc-step' }, head,
      h('div', { class: 'qz-top' }, h('span', null, `Puzzle ${PC.i + 1} / ${n.q.length}`), h('b', null, `${PC.ok} ✓`)),
      h('h3', null, q.q),
      // Les réponses sont mélangées à chaque essai.
      h('div', { class: 'pc-opts' }, PC.perm[PC.order[PC.i]].map((i) => [q.o[i], i]).map(([o, i]) => h('button', { class: 'pc-opt' + (answered ? (i === q.g ? ' good' : i === PC.ans ? ' bad' : ' dim') : ''), disabled: answered ? true : null,
        onclick: () => { PC.ans = i; if (i === q.g) PC.ok++; render(); } }, o))),
      answered ? h('div', { class: 'l-fb ' + (PC.ans === q.g ? 'ok' : 'ko') }, h('b', null, PC.ans === q.g ? '✅ Bien vu ! ' : '❌ Raté. '), h('span', null, q.e),
        h('button', { class: 'btn-fire small-btn', onclick: () => { PC.i++; PC.ans = null; render(); } }, PC.i + 1 >= n.q.length ? 'Voir le résultat ▶' : 'Puzzle suivant ▶')) : null);
  }

  // ===== Outils : tous les sites utiles, rangés par thème, ouverts dans FIRE =====
  const TOOL_CATS = [
    ['🎞️ Revoir ses parties', [
      { k: 'n-revue', ico: '🎞️', name: 'Revue de parties', native: 'revue', desc: 'Intégré à FIRE (à la place de Replays.lol) : chaque game filmée, revue sur la carte avec les combats, et analysée par l’IA toute seule.' },
      { k: 'n-scrims', ico: '🤝', name: 'Scrims', native: 'scrims', desc: 'Intégré à FIRE (à la place d’Invade) : scrims repérés tout seuls, bilan par adversaire et par côté, revue en direct avec toute l’équipe.' }]],
    ['🗺️ Carte et stratégie', [
      { k: 'riftkit', ico: '🗺️', name: 'RiftKit', url: 'https://kdx.gg/riftkit', desc: 'Carte de la Faille : champions, objectifs, timeline, graphiques d’or et de dégâts, annotations.' },
      { k: 'll', ico: '🧭', name: 'Level Legendary · Map Planner', url: 'https://levellegendary.com/tools/lol-map/', desc: 'La Faille en 3D avec les vraies portées des sorts et des tours, wards et zones de freeze.' },
      { k: 'mobapat', ico: '🧩', name: 'MOBA Trainer · Carte des patterns', url: 'https://www.mobatrainer.com/patterns', desc: '51 patterns de macro, chacun avec une vidéo et des puzzles de décision.' }]],
    ['📊 Stats et builds', [
      { k: 'dpm', ico: '📈', name: 'dpm.lol', url: 'https://dpm.lol/', desc: 'Profils, historique et stats détaillées des joueurs (la source des stats de FIRE).' },
      { k: 'lolalytics', ico: '📊', name: 'LoLalytics', url: 'https://lolalytics.com/lol/tierlist/', desc: 'Tier list, builds, runes et matchups de chaque champion, à chaque elo.' },
      { k: 'midgg', ico: '🎥', name: 'mid.gg', url: 'https://mid.gg/', desc: 'Parties de pros avec build, runes et chronologie.' }]],
    ['👤 Compte', [
      { k: 'lolvalue', ico: '💎', name: 'LoLValue', url: 'https://lolvalue.com/', desc: 'Temps passé sur LoL, valeur du compte et des skins.' }]],
  ];
  const ALL_TOOLS = () => TOOL_CATS.flatMap(([, l]) => l);
  function renderOutils() {
    const view = $('view');
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🧰'), h('div', null, h('h1', { class: 'title' }, 'Outils'),
        h('p', { class: 'muted' }, 'Tout ce qu’il faut pour progresser, rangé par thème.'))),
      h('div', { class: 'row meet-tabs' },
        SUB() ? null : h('button', { class: 'btn-fire small-btn', onclick: () => go('parties') }, '🔬 Analyse de parties'),
        meetOk() ? h('button', { class: 'btn-ghost', onclick: () => go('reunion') }, '🧑‍🏫 Salle de réunion (coachs)') : null,
        h('button', { class: 'btn-ghost', onclick: () => go('draft') }, '⚡ Draft, matchups et tier list')),
      ...TOOL_CATS.flatMap(([title, list]) => [h('h2', { class: 'hub-sec' }, h('span', null, title)),
        h('div', { class: 'meet-grid' }, list.filter((t) => !(t.native && SUB() && !SUB_OK.has(t.native))).map((t) => h('button', { class: 'card meet-card' + (t.native ? ' native' : ''), onclick: () => (t.native ? go(t.native) : webOpen(t.url)) },
          h('span', { class: 'meet-ico' }, t.ico), h('b', null, t.name), h('small', { class: 'muted' }, t.desc), h('span', { class: 'meet-go' }, t.native ? 'Ouvrir dans FIRE →' : 'Ouvrir →'))))]));
  }

  // ===== Analyse de parties (titulaires) : les 20 dernières games d'un joueur, chacune décortiquée =====
  // Pas les mêmes infos que « Stats des joueurs » : ici chaque game a sa note dpm.lol détaillée (lane, objectifs, jeu
  // d'équipe, jungle), son classement parmi les 10 joueurs, le build dans l'ordre avec les minutes, l'ordre des sorts,
  // la vision, les pings et un verdict « ce qui a marché / à travailler ».
  const PT = { mode: 'equipe', region: 'EUW', name: '', tag: '', busy: false, err: '', who: null, game: null, recent: load('fire.pt.recent', []), G: {} };
  const PT_REG = ['EUW', 'EUNE', 'NA', 'KR', 'BR', 'LAN', 'LAS', 'OCE', 'TR', 'RU', 'JP'];
  const LANE_ROLE = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'adc', UTILITY: 'support' };
  const PT_CAT = { global: ['💥', 'Impact sur la partie'], lane: ['🛣️', 'Phase de lane'], objectives: ['🐉', 'Objectifs'], team: ['🤝', 'Jeu d’équipe'], jungle: ['🌲', 'Jungle'], gameState: ['🏁', 'Résultat'] };
  const PT_DET = { kills: 'Kills', deaths: 'Morts', assists: 'Assists', csm: 'Sbires / min', goldPerMinute: 'Or / min', damagePerMinute: 'Dégâts / min', visionScorePerMinute: 'Vision / min', firstBlood: 'First blood',
    champExperienceDiff: 'Écart d’XP', goldDiff: 'Écart d’or', visionDiff: 'Écart de vision', maxCsAdvantageOnLaneOpponent: 'Avance de sbires max', riftHerald: 'Héraut', dragon: 'Dragons', baron: 'Nashor', horde: 'Larves',
    damageDealtToObjectives: 'Dégâts aux objectifs', epicMonsterSteals: 'Vols d’objectifs', killParticipation: 'Participation aux kills', damageTakenOnTeamPercentage: 'Part des dégâts encaissés', teamDamagePercentage: 'Part des dégâts de l’équipe',
    win: 'Victoire', initialCrabCount: 'Carapateurs du début', scuttleCrabKills: 'Carapateurs', jungleCsBefore10Minutes: 'Camps avant 10 min', enemyJungleMonsterKills: 'Camps adverses volés', buffsStolen: 'Buffs volés', pickKillWithAlly: 'Picks avec un allié' };
  const ptRank = (r) => (r === 1 ? '1er' : r ? r + 'e' : '—');
  async function ptLoad(slug, puuid) {
    PT.busy = true; PT.err = ''; renderParties();
    const pl = S.players.find((x) => x.slug === slug) || PT.who || {};
    let r; try { r = await window.fire.fetchPlayer({ slug, pseudo: pl.pseudo, puuid: puuid || ((S.cfg && S.cfg.puuids) || {})[String(pl.pseudo || '').toLowerCase()] || null, pages: 2, full: true }, 31); } catch (e) { r = { ok: false, error: String(e) }; }
    PT.busy = false;
    if (!r || !r.ok || !Array.isArray(r.games)) { PT.err = `Lecture impossible sur dpm.lol (${(r && r.error) || 'erreur'}).`; renderParties(); return false; }
    PT.G[slug] = { at: Date.now(), games: r.games, rank: r.rank, record: r.record };
    renderParties();
    return true;
  }
  async function ptSearch(name, tag, region) {
    name = String(name || '').trim(); tag = String(tag || '').trim().replace(/^#/, '');
    if (!name || !tag) { PT.err = 'Entre le pseudo et le tag (ex. Faker # EUW).'; renderParties(); return; }
    const slug = encodeURIComponent(name) + '-' + encodeURIComponent(tag);
    PT.recent = [{ name, tag, region }].concat(PT.recent.filter((x) => !(x.name.toLowerCase() === name.toLowerCase() && x.tag.toLowerCase() === tag.toLowerCase()))).slice(0, 6);
    save('fire.pt.recent', PT.recent);
    PT.who = { slug, pseudo: name + '#' + tag }; PT.game = null;
    if (!PT.G[slug]) await ptLoad(slug); else renderParties();
  }
  function ptPick(p) { PT.who = { slug: p.slug, pseudo: p.pseudo, puuid: p.puuid }; PT.game = null; if (!PT.G[p.slug] || Date.now() - PT.G[p.slug].at > 10 * 60000) ptLoad(p.slug, p.puuid || (load('fire.puuids', {}) || {})[p.slug]); else renderParties(); }
  function renderParties() {
    const view = $('view');
    const titulaires = S.players.filter((p) => p.slug && !p.pending && !isSub(p));
    const field = (lab, el) => h('label', { class: 'pt-f' }, h('small', null, lab), el);
    const nameI = h('input', { class: 'inp', placeholder: 'Faker', value: PT.name, oninput: (e) => { PT.name = e.target.value; } });
    const tagI = h('input', { class: 'inp', placeholder: 'EUW', value: PT.tag, oninput: (e) => { PT.tag = e.target.value; } });
    const go2 = () => ptSearch(PT.name, PT.tag, PT.region);
    [nameI, tagI].forEach((x) => x.addEventListener('keydown', (e) => { if (e.key === 'Enter') go2(); }));
    nameI.addEventListener('paste', (e) => { const t = (e.clipboardData && e.clipboardData.getData('text')) || ''; if (t.includes('#')) { e.preventDefault(); const j = t.lastIndexOf('#'); PT.name = t.slice(0, j).trim(); PT.tag = t.slice(j + 1).trim(); renderParties(); } });
    if (!PT.who && S.moi && titulaires.some((p) => p.slug === S.moi)) { const me = titulaires.find((p) => p.slug === S.moi); PT.who = { slug: me.slug, pseudo: me.pseudo, puuid: me.puuid }; }
    const head = [h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🔬'), h('div', null, h('h1', { class: 'title' }, 'Analyse de parties'),
        h('p', { class: 'muted' }, 'Chaque game décortiquée : la note de la partie et son détail, le classement parmi les 10 joueurs, la lane, le build minute par minute, l’ordre des sorts, la vision, et ce qu’il faut retenir.'))),
      h('div', { class: 'row pt-modes' },
        h('button', { class: 'plan-tab', 'aria-pressed': String(PT.mode === 'equipe'), onclick: () => { PT.mode = 'equipe'; renderParties(); } }, '🔥 L’équipe'),
        h('button', { class: 'plan-tab', 'aria-pressed': String(PT.mode === 'manuel'), onclick: () => { PT.mode = 'manuel'; renderParties(); } }, '🔎 Recherche manuelle')),
      PT.mode === 'equipe' ? h('div', { class: 'row pt-roster' }, titulaires.map((p) => h('button', { class: 'chip' + (PT.who && PT.who.slug === p.slug ? ' on' : ''), 'aria-pressed': String(!!(PT.who && PT.who.slug === p.slug)), onclick: () => ptPick(p) }, roleOf(p).ico + ' ' + String(p.pseudo).split('#')[0])))
        : [PT.recent.length ? h('div', { class: 'row pt-recent' }, h('small', { class: 'muted' }, 'Dernières recherches'),
          PT.recent.map((x) => h('button', { class: 'chip', onclick: () => { PT.name = x.name; PT.tag = x.tag; PT.region = x.region || 'EUW'; ptSearch(x.name, x.tag, x.region); } }, h('b', null, x.name), h('span', { class: 'muted' }, '#' + x.tag + ' · ' + (x.region || 'EUW'))))) : null,
          h('div', { class: 'card pt-form' },
            field('Région', h('select', { class: 'inp', onchange: (e) => { PT.region = e.target.value; } }, PT_REG.map((r) => h('option', { value: r, selected: PT.region === r ? true : null }, r)))),
            field('Pseudo', nameI), h('span', { class: 'pt-hash' }, '#'), field('Tag', tagI),
            h('button', { class: 'btn-fire small-btn', disabled: PT.busy ? true : null, onclick: go2 }, PT.busy ? 'Recherche…' : 'Chercher'))],
      PT.err ? h('p', { class: 'bad small' }, '⚠ ' + PT.err) : null,
      PT.busy ? h('div', { class: 'card' }, h('p', { class: 'muted' }, '⏳ Lecture des 20 dernières games sur dpm.lol… (20 à 40 secondes)')) : null].flat().filter(Boolean);
    const D = PT.who && PT.G[PT.who.slug];
    if (!PT.who || PT.busy) { view.replaceChildren(...head, !PT.who && !PT.busy ? h('div', { class: 'card' }, h('p', { class: 'muted' }, PT.mode === 'equipe' ? 'Choisis un joueur de l’équipe.' : 'Cherche un joueur.')) : null); return; }
    if (!D) { if (!PT.busy && !PT.err) ptLoad(PT.who.slug, PT.who.puuid || (load('fire.puuids', {}) || {})[PT.who.slug]); view.replaceChildren(...head); return; }
    if (PT.game != null) { const g = D.games.find((x) => x.id === PT.game); if (g) { view.replaceChildren(...head, ptGame(g, D)); return; } }
    view.replaceChildren(...head, ...ptOverview(D));
  }
  // Vue d'ensemble des 20 dernières games.
  function ptOverview(D) {
    const gs = D.games;
    if (!gs.length) return [h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Aucune game récente.'))];
    const n = gs.length, w = gs.filter((g) => g.p.win).length;
    const avg = (f) => { const xs = gs.map(f).filter((x) => x != null && !isNaN(x)); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
    const K = avg((g) => g.p.kills), De = avg((g) => g.p.deaths), A = avg((g) => g.p.assists);
    const score = avg((g) => g.p.dpmScore), rk = avg((g) => g.p.dpmScoreRank);
    const mvp = gs.filter((g) => g.p.dpmScoreRank === 1).length, top3 = gs.filter((g) => g.p.dpmScoreRank && g.p.dpmScoreRank <= 3).length;
    // Profil : moyenne de chaque partie de la note (forces et faiblesses).
    const cats = Object.keys(PT_CAT).filter((k) => k !== 'gameState').map((k) => [k, avg((g) => g.p.dpmScoreDetails && g.p.dpmScoreDetails[k] ? g.p.dpmScoreDetails[k].score : null)]).filter(([, v]) => v != null);
    const mx = Math.max(1, ...cats.map(([, v]) => Math.abs(v)));
    const sorted = cats.slice().sort((a, b) => b[1] - a[1]);
    const champs = {}; gs.forEach((g) => { const c = (champs[g.p.championName] = champs[g.p.championName] || { n: 0, w: 0, s: 0 }); c.n++; if (g.p.win) c.w++; c.s += g.p.dpmScore || 0; });
    const stat = (lab, val, sub) => h('div', { class: 'pt-stat' }, h('small', { class: 'muted' }, lab), h('b', null, val), sub ? h('small', { class: 'muted' }, sub) : null);
    return [
      h('div', { class: 'card pt-ov' }, h('div', { class: 'pt-ovh' }, h('h2', null, PT.who.pseudo), D.rank ? h('span', { class: 'chip' }, D.rank) : null, h('small', { class: 'muted' }, `${n} dernières games, toutes files`)),
        h('div', { class: 'pt-stats' }, stat('Victoires', `${w} V – ${n - w} D`, `${fr(w / n * 100)} %`), stat('KDA moyen', `${fr(K, 1)} / ${fr(De, 1)} / ${fr(A, 1)}`, `${fr((K + A) / Math.max(1, De), 2)} KDA`),
          stat('Note moyenne', fr(score, 1), 'note dpm.lol de la partie'), stat('Classement moyen', rk ? fr(rk, 1) + 'e / 10' : '—', `${mvp} fois 1er · ${top3} fois sur le podium`))),
      h('div', { class: 'pt-two' },
        h('div', { class: 'card' }, h('h3', null, '🧬 Profil de jeu'), h('p', { class: 'muted small' }, 'D’où viennent ses points, en moyenne (au-dessus de 0 : il apporte ; en dessous : il coûte).'),
          cats.map(([k, v]) => h('div', { class: 'pt-bar' }, h('span', null, PT_CAT[k][0] + ' ' + PT_CAT[k][1]), h('div', { class: 'pt-track' }, h('i', { class: v >= 0 ? 'pos' : 'neg', style: `width:${Math.abs(v) / mx * 50}%;${v >= 0 ? 'left:50%' : 'right:50%'}` })), h('b', null, (v > 0 ? '+' : '') + fr(v, 1)))),
          sorted.length >= 2 ? h('p', { class: 'small' }, '💪 Force : ', h('b', null, PT_CAT[sorted[0][0]][1]), ' · ⚠️ À travailler : ', h('b', null, PT_CAT[sorted[sorted.length - 1][0]][1])) : null),
        h('div', { class: 'card' }, h('h3', null, '🧙 Champions joués'),
          Object.entries(champs).sort((a, b) => b[1].n - a[1].n).map(([c, x]) => h('div', { class: 'pt-ch' }, champIcon(c, 28), h('b', null, FC.champName(c)), h('small', { class: 'muted' }, `${x.n} game${x.n > 1 ? 's' : ''} · ${fr(x.w / x.n * 100)} % · note ${fr(x.s / x.n, 1)}`))))),
      h('h2', { class: 'hub-sec' }, h('span', null, '🎮 Les games'), h('small', { class: 'muted' }, 'clique sur une game pour l’analyse complète')),
      h('div', { class: 'pt-games' }, gs.map((g) => { const p = g.p;
        return h('button', { class: 'pt-g ' + (p.win ? 'win' : 'lose'), onclick: () => { PT.game = g.id; renderParties(); window.scrollTo(0, 0); } },
          h('span', { class: 'pt-gc' }, champIcon(p.championName, 40), p.opponentChampionName ? h('small', { class: 'muted' }, 'vs') : null, p.opponentChampionName ? champIcon(p.opponentChampionName, 26) : null),
          h('span', { class: 'pt-gi' }, h('b', null, `${p.kills} / ${p.deaths} / ${p.assists}`), h('small', { class: 'muted' }, `${gameModeLabel({ queue: { id: g.q } })} · ${mmss(g.d)} · ${dayFrT(g.t)}`)),
          h('span', { class: 'pt-gs' }, h('b', null, fr(p.dpmScore, 1)), h('small', null, ptRank(p.dpmScoreRank) + ' / 10')),
          h('span', { class: 'pt-gr' }, p.win ? 'Victoire' : 'Défaite')); }))];
  }
  // Une game en détail.
  function ptGame(g, D) {
    const p = g.p, min = Math.max(1, g.d / 60), v = (S.champList && S.champList.version) || '';
    const role = LANE_ROLE[p.lane] || 'mid', sup = role === 'support', jgl = role === 'jungle';
    const cs = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
    const item = (id, sz) => id ? h('img', { class: 'pt-it', src: `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${id}.png`, width: sz || 30, height: sz || 30, alt: '', onerror: (e) => { e.target.style.visibility = 'hidden'; } }) : h('span', { class: 'pt-it empty' });
    const kv = (lab, val, cls) => h('div', { class: 'pt-kv' + (cls ? ' ' + cls : '') }, h('small', { class: 'muted' }, lab), h('b', null, val));
    const sg2 = (x, d) => (x == null ? '—' : (x > 0 ? '+' : '') + fr(x, d || 0));
    // Verdict : ce qui a marché, ce qui est à travailler (seuils simples, toujours vrais).
    const good = [], bad = [];
    if (p.dpmScoreRank === 1) good.push('Meilleur joueur de la partie (1er sur 10).'); else if (p.dpmScoreRank >= 9) bad.push(`Parmi les moins influents de la partie (${p.dpmScoreRank}e sur 10).`);
    if (p.deaths <= 2 && g.d > 1200) good.push(`Très peu de morts (${p.deaths}).`); else if (p.deaths >= 8) bad.push(`Beaucoup de morts (${p.deaths}) : chaque mort donne de l’or et du temps à l’adversaire.`);
    if (p.killParticipation >= 60) good.push(`Présent dans ${fr(p.killParticipation)} % des kills de l’équipe.`); else if (p.killParticipation != null && p.killParticipation < 35 && role !== 'top') bad.push(`Seulement ${fr(p.killParticipation)} % de participation aux kills.`);
    if (!sup && !jgl) { const c = cs / min; if (c >= 7.5) good.push(`Bon farm : ${fr(c, 1)} sbires / min.`); else if (c < 5.5) bad.push(`Farm à améliorer : ${fr(c, 1)} sbires / min (objectif 7+).`); }
    if (p.goldDiffAt15 >= 500) good.push(`Lane gagnée : ${sg2(p.goldDiffAt15)} or à 15 min.`); else if (p.goldDiffAt15 <= -500) bad.push(`Lane perdue : ${sg2(p.goldDiffAt15)} or à 15 min.`);
    if (p.csDiffAt15 <= -15 && !sup) bad.push(`${sg2(p.csDiffAt15)} sbires d’écart à 15 min.`);
    const vpm = p.visionScorePerMinute || 0;
    if ((sup && vpm >= 2) || (!sup && vpm >= 1.1)) good.push(`Bonne vision : ${fr(vpm, 2)} / min.`); else if ((sup && vpm < 1.5) || (!sup && vpm < 0.6)) bad.push(`Vision faible : ${fr(vpm, 2)} / min${sup ? ' (support : vise 2+)' : ''}.`);
    if (!p.controlWardsPlaced && g.d > 1200) bad.push('Aucune balise de contrôle posée.');
    if (p.teamDamagePercentage >= 28 && !sup) good.push(`${fr(p.teamDamagePercentage)} % des dégâts de l’équipe.`);
    if (p.soloKills >= 2) good.push(`${p.soloKills} solo kills.`);
    if (p.turretPlatesTaken >= 2) good.push(`${p.turretPlatesTaken} plaques de tour prises.`);
    if (p.isFirstToHitLevel2) good.push('Premier niveau 2 de la lane.');
    if (p.epicMonsterSteals) good.push(`${p.epicMonsterSteals} objectif${p.epicMonsterSteals > 1 ? 's' : ''} volé${p.epicMonsterSteals > 1 ? 's' : ''}.`);
    if ((p.enemyMissingPings || 0) === 0 && g.d > 1200 && (role === 'mid' || sup)) bad.push('Aucun ping « disparu » : préviens quand ton adversaire quitte la lane.');
    // Comparaison avec sa moyenne sur les 20 games.
    const avg = (f) => { const xs = D.games.map(f).filter((x) => x != null && !isNaN(x)); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
    const cmp = (val, a, up) => (a == null || val == null ? null : h('small', { class: (val >= a) === up ? 'good' : 'bad' }, val >= a ? ' ▲' : ' ▼'));
    const det = p.dpmScoreDetails || {};
    const cats = Object.keys(PT_CAT).filter((k) => det[k]);
    const mx = Math.max(1, ...cats.map((k) => Math.abs(det[k].score || 0)));
    const SK = ['', 'Q', 'W', 'E', 'R'];
    const buys = (p.itemActions || []).filter((a) => a[2] === 1);
    const groups = []; for (const a of buys) { const last = groups[groups.length - 1]; if (last && a[0] - last.t < 40) last.ids.push(a[1]); else groups.push({ t: a[0], ids: [a[1]] }); }
    return h('div', { class: 'pt-game' },
      h('div', { class: 'row pt-gh' }, h('button', { class: 'btn-ghost', onclick: () => { PT.game = null; renderParties(); } }, '← Les games'),
        champIcon(p.championName, 48), h('div', null, h('h2', null, `${FC.champName(p.championName)}${p.opponentChampionName ? ' contre ' + FC.champName(p.opponentChampionName) : ''}`),
          h('small', { class: 'muted' }, `${gameModeLabel({ queue: { id: g.q } })} · ${mmss(g.d)} · ${new Date(g.t).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`)),
        h('span', { class: 'pt-res ' + (p.win ? 'win' : 'lose') }, p.win ? 'Victoire' : 'Défaite')),
      h('div', { class: 'pt-two' },
        h('div', { class: 'card' }, h('h3', null, '🏅 Note de la partie'),
          h('div', { class: 'pt-note' }, h('b', null, fr(p.dpmScore, 1)), h('span', null, `${ptRank(p.dpmScoreRank)} sur 10 joueurs · ${ptRank(p.dpmScoreTeamRank)} de son équipe`)),
          cats.map((k) => { const c = det[k]; const sc = c.score || 0;
            return h('details', { class: 'pt-cat' }, h('summary', null, h('span', null, PT_CAT[k][0] + ' ' + PT_CAT[k][1]), h('div', { class: 'pt-track' }, h('i', { class: sc >= 0 ? 'pos' : 'neg', style: `width:${Math.abs(sc) / mx * 50}%;${sc >= 0 ? 'left:50%' : 'right:50%'}` })), h('b', null, (sc > 0 ? '+' : '') + fr(sc, 1))),
              h('div', { class: 'pt-det' }, Object.entries(c.details || {}).map(([dk, dv]) => h('span', { class: dv > 0 ? 'good' : dv < 0 ? 'bad' : 'muted' }, `${PT_DET[dk] || dk} ${dv > 0 ? '+' : ''}${fr(dv, 1)}`)))); }),
          h('p', { class: 'muted small' }, 'Chaque ligne : ce que cette partie du jeu lui a rapporté (ou coûté) dans la note. Clique pour le détail.')),
        h('div', { class: 'card' }, h('h3', null, '🧾 Le verdict'),
          good.length ? h('div', { class: 'pt-vd good' }, h('b', null, '✅ Ce qui a marché'), h('ul', null, good.map((x) => h('li', null, x)))) : null,
          bad.length ? h('div', { class: 'pt-vd bad' }, h('b', null, '⚠️ À travailler'), h('ul', null, bad.map((x) => h('li', null, x)))) : null,
          !good.length && !bad.length ? h('p', { class: 'muted' }, 'Partie dans la moyenne, rien de marquant.') : null)),
      h('div', { class: 'pt-three' },
        h('div', { class: 'card' }, h('h3', null, '⚔️ Combat'),
          h('div', { class: 'pt-kvs' }, kv('KDA', `${p.kills} / ${p.deaths} / ${p.assists}`), kv('Participation', fr(p.killParticipation) + ' %'), kv('Dégâts / min', fr(p.damagePerMinute), ''), kv('Part des dégâts', fr(p.teamDamagePercentage) + ' %'),
            kv('Dégâts encaissés', fr(p.damageTakenOnTeamPercentage) + ' % équipe'), kv('Solo kills', p.soloKills || 0), kv('Picks avec un allié', p.pickKillWithAlly || 0), kv('Alliés sauvés', p.saveAllyFromDeath || 0))),
        h('div', { class: 'card' }, h('h3', null, '🛣️ Lane'),
          h('div', { class: 'pt-kvs' }, kv('Or à 15 min', sg2(p.goldDiffAt15), p.goldDiffAt15 > 0 ? 'good' : p.goldDiffAt15 < 0 ? 'bad' : ''), kv('Sbires à 15 min', sg2(p.csDiffAt15), p.csDiffAt15 > 0 ? 'good' : p.csDiffAt15 < 0 ? 'bad' : ''),
            kv('XP à 15 min', sg2(p.xpDiffAt15), p.xpDiffAt15 > 0 ? 'good' : p.xpDiffAt15 < 0 ? 'bad' : ''), kv('Sbires / min', fr(cs / min, 1)), kv('Sbires de lane (10 min)', p.laneMinionsFirst10Minutes != null ? fr(p.laneMinionsFirst10Minutes) : '—'),
            kv('Plaques prises', p.turretPlatesTaken || 0), kv('Niveau 2 en premier', p.isFirstToHitLevel2 ? 'Oui' : 'Non'), jgl ? kv('Camps avant 10 min', fr(p.jungleCsBefore10Minutes)) : null, jgl ? kv('Carapateurs', p.scuttleCrabKills || 0) : null)),
        h('div', { class: 'card' }, h('h3', null, '👁️ Vision et objectifs'),
          h('div', { class: 'pt-kvs' }, kv('Vision / min', fr(vpm, 2)), kv('Wards posées', p.stealthWardsPlaced || 0), kv('Balises de contrôle', p.controlWardsPlaced || 0), kv('Wards détruites', p.wardTakedowns || 0),
            kv('Dragons', p.dragon || 0), kv('Nashor', p.baron || 0), kv('Larves', p.horde || 0), kv('Tours', p.turretTakedowns || 0), kv('Dégâts aux objectifs', fr(p.damageDealtToObjectives)), kv('Vols', p.epicMonsterSteals || 0)))),
      h('div', { class: 'card' }, h('h3', null, '🛒 Le build, minute par minute'),
        h('div', { class: 'row pt-final' }, h('small', { class: 'muted' }, 'Objets finaux'), ...(p.itemIds || []).map((id) => item(id, 34))),
        h('div', { class: 'pt-build' }, groups.map((x) => h('div', { class: 'pt-buy' }, h('small', { class: 'muted' }, mmss(x.t)), h('div', { class: 'row' }, x.ids.map((id) => item(id, 28)))))),
        (p.skillLevelUps || []).length ? [h('h3', null, '📈 Ordre des sorts'), h('div', { class: 'pt-skills' }, [1, 2, 3, 4].map((sk) => h('div', { class: 'pt-skr' }, h('b', null, SK[sk]), ...Array.from({ length: 18 }, (_, i) => h('i', { class: p.skillLevelUps[i] === sk ? 'on s' + sk : '' }, p.skillLevelUps[i] === sk ? String(i + 1) : '')))))] : null),
      h('div', { class: 'card' }, h('h3', null, '📣 Communication (pings)'),
        h('div', { class: 'pt-kvs' }, kv('Disparu', p.enemyMissingPings || 0), kv('En route', p.onMyWayPings || 0), kv('Pousser', p.pushPings || 0), kv('Besoin de vision', p.needVisionPings || 0), kv('Vision ennemie', p.enemyVisionPings || 0), kv('Aidez-moi', p.assistMePings || 0)),
        h('p', { class: 'muted small' }, 'Comparé à sa moyenne des 20 games : note ', fr(avg((x) => x.p.dpmScore), 1), cmp(p.dpmScore, avg((x) => x.p.dpmScore), true), ' · morts ', fr(avg((x) => x.p.deaths), 1), cmp(p.deaths, avg((x) => x.p.deaths), false), ' · vision ', fr(avg((x) => x.p.visionScorePerMinute), 2), cmp(vpm, avg((x) => x.p.visionScorePerMinute), true))));
  }
  // ===== Salle de réunion des coachs : les outils pour enseigner, ouverts dans FIRE =====
  const MEET_TOOLS = [
    { k: 'riftkit', ico: '🗺️', name: 'RiftKit', url: 'https://kdx.gg/riftkit', desc: 'Carte de la Faille : charge un match ou monte une situation avec les champions, les objectifs, le tableau des scores, la timeline, les graphiques d’or et de dégâts, et des annotations.' },
    { k: 'll', ico: '🧭', name: 'Level Legendary · Map Planner', url: 'https://levellegendary.com/tools/lol-map/', desc: 'La Faille en 3D : place les 10 champions, dessine les actions, pose wards et camps, et vérifie les vraies portées des sorts et des tours et les zones de freeze, à n’importe quel niveau et build.' },
    { k: 'n-revue', ico: '🎞️', name: 'Revue de parties', native: 'revue', desc: 'Intégrée à FIRE : ouvre une revue de l’équipe et lance « Revoir en direct » : tout le monde suit ta lecture et voit tes dessins sur la carte, avec l’analyse IA de la partie.' },
    { k: 'n-scrims', ico: '🤝', name: 'Scrims', native: 'scrims', desc: 'Intégré à FIRE : bilan des scrims par adversaire et par côté, notes, et chaque game à revoir.' },
    { k: 'lolvalue', ico: '💎', name: 'LoLValue', url: 'https://lolvalue.com/', desc: 'Temps passé sur LoL, valeur du compte et des skins d’un joueur.' },
  ];
  const meetOk = () => !SUB() && !!(S.coachState && (S.coachState.coach || S.coachState.admin));
  function renderReunion() {
    const view = $('view');
    if (!meetOk()) { view.replaceChildren(h('div', { class: 'card' }, h('p', null, 'La salle de réunion est réservée aux coachs.'))); return; }
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🧑‍🏫'), h('div', null, h('h1', { class: 'title' }, 'Salle de réunion'),
        h('p', { class: 'muted' }, 'Les outils pour enseigner. Partage ton écran dans le salon vocal pour les montrer aux joueurs.'))),
      h('div', { class: 'meet-grid' }, MEET_TOOLS.map((t) => h('button', { class: 'card meet-card' + (t.native ? ' native' : ''), onclick: () => (t.native ? go(t.native) : webOpen(t.url)) },
        h('span', { class: 'meet-ico' }, t.ico), h('b', null, t.name), h('small', { class: 'muted' }, t.desc), h('span', { class: 'meet-go' }, 'Ouvrir →')))),
      h('div', { class: 'card meet-tips' }, h('h3', null, '🎙️ Pour une séance'),
        h('div', { class: 'row' },
          h('button', { class: 'btn-ghost', onclick: () => go('vocal') }, '🎙️ Ouvrir le vocal'),
          h('button', { class: 'btn-ghost', onclick: () => go('coach') }, '📣 Parole du coach'),
          h('button', { class: 'btn-ghost', onclick: () => go('pool') }, '🧙 POOL'),
          h('button', { class: 'btn-ghost', onclick: () => go('draft') }, '⚡ Draft')),
        h('p', { class: 'muted small' }, 'Astuce : dans le vocal, le tableau tactique de FIRE permet aussi à tout le salon de dessiner sur la carte en même temps.')));
  }

  // ===== Carnet de bord (staff) : ce que fait chaque membre dans FIRE, notes du staff, modération, rôles =====
  // Chaque FIRE note ses actions (pages ouvertes, messages, vocal, planning, POOL, quiz, clips…) et les envoie toutes les
  // 3 minutes dans le fichier d'activité du joueur (chiffré avec le code d'équipe). Le contenu des messages privés n'est jamais noté.
  const PAGE_NAMES = { stats: 'Stats des joueurs', pool: 'POOL', planning: 'Planning', draft: 'Draft', train: 'Micro', jeux: 'Détente', guides: 'Lanes et principes',
    coach: 'Parole du coach', worlds: 'E-sport', lolpatch: 'Patchs LoL', vocal: 'Vocal', chat: 'Discussion', patch: 'Patch notes', settings: 'Paramètres', carnet: 'Carnet de bord', clips: 'Clips', reunion: 'Salle de réunion', outils: 'Outils', parties: 'Analyse de parties', parcours: 'Parcours', puzzle: 'Puzzle du jour', scrims: 'Scrims', revue: 'Revue de parties', web: 'navigateur' };
  const ACT = { buf: load('fire.act.buf', []), timer: null, sending: false };
  function actLog(k, d) {
    if (!vocalMe() || !window.fire.staff) return;
    const last = ACT.buf[ACT.buf.length - 1];
    if (last && last.k === k && last.d === d && Date.now() - last.t < 60000) return;
    ACT.buf.push({ t: Date.now(), k, d: String(d || '').slice(0, 160) });
    ACT.buf = ACT.buf.slice(-300);
    save('fire.act.buf', ACT.buf);
  }
  async function actFlush() {
    const me = vocalMe();
    if (ACT.sending || !me || !window.fire.staff) return;
    const out = ACT.buf.slice();
    ACT.sending = true;
    try {
      const r = await window.fire.staff.actPush(me, out);
      if (r && r.ok) { ACT.buf = ACT.buf.slice(out.length); save('fire.act.buf', ACT.buf); }
    } catch (e) { /* hors ligne : on réessaiera */ }
    ACT.sending = false;
  }
  function actInit() {
    if (ACT.timer || !window.fire.staff) return;
    actLog('app', `Ouvre FIRE (v${S.version})`);
    setTimeout(actFlush, 20000);
    ACT.timer = setInterval(actFlush, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) actFlush(); });
    staffLoad();
  }
  // Rôles : créateur (son PC), coach, chef d'équipe, modérateurs (choisis par le coach ou le créateur).
  const STF = { modos: load('fire.modos', []), tab: load('fire.membres', []).some((m) => m.statut === 'attente') ? 'demandes' : 'activite', act: null, notes: null, loading: false, who: '', kind: '', msg: '', edit: null, admin: null };
  async function staffLoad() {
    if (!window.fire.staff) return;
    try { const r = await window.fire.staff.roles(); if (r && r.ok) { STF.modos = r.modos || []; save('fire.modos', STF.modos); renderNav(); } } catch (e) { /* */ }
  }
  const isModo = (slug) => (STF.modos || []).includes(slug || vocalMe());
  const isStaff = () => !!(S.coachState.coach || S.coachState.chef || S.coachState.admin || isModo());
  const roleBadge = (slug) => {
    if (slug === vocalMe() && S.coachState.admin) return h('span', { class: 'role-b admin', title: 'Créateur de FIRE' }, '👑');
    if (coachOf(slug)) return h('span', { class: 'role-b coach', title: 'Coach' }, 'COACH');
    if (isModo(slug)) return h('span', { class: 'role-b modo', title: 'Modérateur' }, 'MODO');
    return null;
  };
  const ACT_KIND = { app: ['🚀', 'Ouverture'], page: ['📄', 'Page'], msg: ['💬', 'Message'], vocal: ['🎙️', 'Vocal'], plan: ['📅', 'Planning'], pool: ['🧙', 'POOL'], jeu: ['🎮', 'Jeu'],
    clip: ['🎬', 'Clip'], web: ['🌐', 'Web'], statut: ['🟢', 'Statut'], modo: ['🛡️', 'Modération'], roles: ['👑', 'Rôles'], staff: ['📒', 'Staff'], salons: ['⚙️', 'Salons'] };
  const members = () => S.players.filter((p) => p.slug).map((p) => [p.slug, roleOf(p).ico, String(p.pseudo).split('#')[0]]).concat((S.coachs || []).map((c) => [c.slug, '🎓', c.pseudo]));
  async function staffFetch() {
    if (STF.loading || !window.fire.staff) return;
    STF.loading = true; STF.err = '';
    try {
      const [a, n] = await Promise.all([window.fire.staff.actAll({ list: members().map(([sl]) => sl), modo: isModo() }), window.fire.staff.notes()]);
      if (a && a.ok) STF.act = a.act || {}; else STF.err = (a && a.error) || 'activité illisible';
      if (n && n.ok) STF.notes = n.notes || [];
    } catch (e) { STF.err = String(e); }
    STF.loading = false;
    if (S.section === 'carnet' && !typing()) renderCarnet();
  }
  const dayFrT = (t) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const ago = (t) => { if (!t) return 'jamais'; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };
  // Temps passé dans FIRE sur une période : écarts de moins de 10 min entre deux actions.
  function timeIn(evts, since) { let ms = 0, prev = null; for (const e of evts) { if (e.t < since) { prev = e.t; continue; } if (prev && e.t - prev < 600000) ms += e.t - prev; prev = e.t; } return ms; }
  const dur = (ms) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
  function renderCarnet() {
    const view = $('view');
    if (!isStaff()) { view.replaceChildren(h('div', { class: 'card' }, h('p', null, 'Le carnet de bord est réservé au staff (créateur, coachs, chef d’équipe, modérateurs).'))); return; }
    if (!STF.act && !STF.loading) staffFetch();
    const nPend = NM.list.filter((m) => m.statut === 'attente').length;
    const tabs = [['demandes', `🆕 Demandes${nPend ? ' (' + nPend + ')' : ''}`], ['activite', '👥 Activité de chacun'], ['journal', '📜 Journal'], ['notes', '📒 Notes du staff'], ['modo', '🛡️ Modération'], ['roles', '👑 Rôles']];
    const tabBar = h('div', { class: 'row plan-tabs' }, tabs.map(([k, l]) => h('button', { class: 'plan-tab', 'aria-pressed': String(STF.tab === k), onclick: () => { STF.tab = k; renderCarnet(); } }, l)),
      h('button', { class: 'btn-ghost', onclick: () => { STF.act = null; staffFetch(); renderCarnet(); } }, STF.loading ? 'Chargement…' : '⟳ Actualiser'));
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '📒'), h('div', null, h('h1', { class: 'title' }, 'Carnet de bord'),
      h('p', { class: 'muted' }, 'Ce que fait chaque membre dans FIRE, les notes du staff et la modération. Mis à jour toutes les 3 minutes par le FIRE de chacun.')));
    const A = STF.act || {};
    let body;
    const allEvts = () => Object.entries(A).flatMap(([sl, x]) => (x.evts || []).map((e) => ({ ...e, who: sl }))).sort((a, b) => b.t - a.t);
    if (STF.err && !STF.act) body = h('div', { class: 'card' }, h('p', { class: 'bad' }, '⚠ ' + STF.err));
    else if (STF.tab === 'demandes') {
      const canDecide = S.coachState.coach || S.coachState.chef || S.coachState.admin;
      const list = NM.list.slice().sort((a, b) => (a.statut === 'attente' ? -1 : 1) - (b.statut === 'attente' ? -1 : 1) || b.at - a.at);
      body = h('div', null,
        h('p', { class: 'muted small' }, 'Les nouveaux qui ont rejoint FIRE avec le code d’équipe. Vérifie leur profil dpm.lol, choisis leur poste, puis accepte : toute l’équipe les voit dans les 2 minutes.'),
        list.length ? list.map((m) => {
          const sel = { role: m.role };
          return h('div', { class: 'card nm-req' + (m.statut !== 'attente' ? ' done' : '') },
            h('div', { class: 'nm-h' }, h('b', null, (FC.ROLES[roleIdOf(m.role)] || {}).ico + ' ' + m.pseudo), h('span', { class: 'chip' }, m.role),
              h('small', { class: 'muted' }, `${dayFrT(m.at)} ${hm(m.at)}`), h('span', { class: 'nm-st ' + m.statut }, m.statut === 'attente' ? '⏳ En attente' : m.statut === 'ok' ? `✅ Accepté${m.par ? ' par ' + vocalName(m.par) : ''}` : '❌ Refusé')),
            m.note ? h('p', { class: 'small' }, '« ' + m.note + ' »') : null,
            h('div', { class: 'row' },
              h('button', { class: 'btn-ghost', onclick: () => webOpen('https://dpm.lol/' + m.slug) }, '📊 Voir son profil dpm.lol'),
              canDecide ? h('button', { class: 'btn-ghost', onclick: (e) => {
                const row = e.target.closest('.nm-req'); if (!row || row.querySelector('.nm-fix')) return;
                const inp = h('input', { class: 'inp', value: 'https://dpm.lol/' + m.slug, placeholder: 'https://dpm.lol/Pseudo-TAG ou Pseudo#TAG' });
                const msg = h('small', { class: 'muted' }, '');
                row.append(h('div', { class: 'row nm-fix' }, inp, h('button', { class: 'btn-fire small-btn', onclick: async () => {
                  const pp = dpmParse(inp.value); if (!pp) { msg.textContent = 'Lien ou Riot ID invalide.'; return; }
                  const r = await window.fire.staff.decision(m.slug, m.statut === 'ok', m.role, vocalMe(), { slug: pp.slug, pseudo: pp.pseudo }).catch((er) => ({ ok: false, error: String(er) }));
                  if (r && r.ok) { NM.list = r.membres; save('fire.membres', NM.list); S.players = S.players.filter((x) => x.slug !== m.slug); delete S.data[m.slug]; delete S.status[m.slug]; membresMerge(NM.list); refreshAll(); renderCarnet(); }
                  else msg.textContent = '⚠ ' + ((r && r.error) || 'erreur');
                } }, 'Enregistrer'), msg));
              } }, '✏️ Corriger le lien') : null,
              m.statut === 'attente' && canDecide ? [
                h('select', { class: 'inp nm-role', onchange: (e) => { sel.role = e.target.value; } }, ['Top', 'Jungle', 'Mid', 'ADC', 'Support'].flatMap((r) => [r, r + ' (Remplaçant)']).map((r) => h('option', { value: r, selected: r === m.role ? true : null }, r))),
                h('button', { class: 'btn-fire small-btn', onclick: async () => { const r = await window.fire.staff.decision(m.slug, true, sel.role, vocalMe()).catch((e) => ({ ok: false, error: String(e) })); if (r && r.ok) { NM.list = r.membres; save('fire.membres', NM.list); membresMerge(NM.list); refreshAll(); renderNav(); } else alert('⚠ ' + ((r && r.error) || 'erreur')); renderCarnet(); } }, '✅ Accepter'),
                h('button', { class: 'btn-ghost', onclick: async () => { if (!confirm(`Refuser la demande de ${m.pseudo} ?`)) return; const r = await window.fire.staff.decision(m.slug, false, '', vocalMe()).catch((e) => ({ ok: false, error: String(e) })); if (r && r.ok) { NM.list = r.membres; save('fire.membres', NM.list); renderNav(); } else alert('⚠ ' + ((r && r.error) || 'erreur')); renderCarnet(); } }, '❌ Refuser')]
                : m.statut === 'attente' ? h('span', { class: 'muted small' }, 'Les modérateurs voient la demande ; le créateur, un coach ou le chef d’équipe la valide.') : null));
        }) : h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Aucune demande pour l’instant.')));
    }
    else if (STF.tab === 'activite') {
      const now = Date.now(), d1 = new Date(); d1.setHours(0, 0, 0, 0); const today = d1.getTime(), week = now - 7 * 86400000;
      body = h('div', { class: 'stf-grid' }, members().sort((a, b) => a[2].localeCompare(b[2], 'fr')).map(([sl, ico, name]) => {
        const x = A[sl] || { evts: [], vu: 0 };
        const ev = x.evts || [];
        const last = ev[ev.length - 1];
        const lastSeen = Math.max(x.vu || 0, last ? last.t : 0);
        const pages = {}; ev.filter((e) => e.k === 'page' && e.t > week).forEach((e) => { pages[e.d] = (pages[e.d] || 0) + 1; });
        const topPages = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p.replace(/^Page /, ''));
        const nMsg = ev.filter((e) => e.k === 'msg' && e.t > week).length;
        const st = statusOf(sl);
        return h('div', { class: 'card stf-p' + (STF.who === sl ? ' on' : '') },
          h('div', { class: 'stf-ph' }, h('b', null, ico + ' ' + name), stDot(sl), roleBadge(sl), h('small', { class: 'muted' }, st.game ? '🎮 en game' : (ST_LABEL[st.st] || ST_LABEL.offline)[1])),
          h('div', { class: 'stf-kv' },
            h('span', null, h('small', { class: 'muted' }, 'Dernière activité'), h('b', null, ago(lastSeen))),
            h('span', null, h('small', { class: 'muted' }, 'Aujourd’hui'), h('b', null, dur(timeIn(ev, today)))),
            h('span', null, h('small', { class: 'muted' }, '7 jours'), h('b', null, dur(timeIn(ev, week)))),
            h('span', null, h('small', { class: 'muted' }, 'Messages (7 j)'), h('b', null, String(nMsg)))),
          topPages.length ? h('p', { class: 'muted small' }, 'Pages les plus ouvertes : ' + topPages.join(', ')) : null,
          last ? h('p', { class: 'small stf-last' }, (ACT_KIND[last.k] || ['•'])[0] + ' ' + last.d, h('small', { class: 'muted' }, ' · ' + ago(last.t))) : h('p', { class: 'muted small' }, 'Aucune activité reçue (FIRE pas encore mis à jour, ou pas ouvert).'),
          h('button', { class: 'btn-ghost', onclick: () => { STF.who = sl; STF.tab = 'journal'; renderCarnet(); } }, 'Voir tout son journal →'));
      }));
    } else if (STF.tab === 'journal') {
      const evts = allEvts().filter((e) => (!STF.who || e.who === STF.who) && (!STF.kind || e.k === STF.kind)).slice(0, 400);
      const rows = []; let lastDay = '';
      for (const e of evts) {
        const d = dayFrT(e.t);
        if (d !== lastDay) { rows.push(h('div', { class: 'stf-day' }, d)); lastDay = d; }
        rows.push(h('div', { class: 'stf-ev' }, h('span', { class: 'muted stf-t' }, hm(e.t)), h('span', { class: 'stf-k', title: (ACT_KIND[e.k] || ['', e.k])[1] }, (ACT_KIND[e.k] || ['•'])[0]),
          h('b', { class: 'stf-who' }, vocalName(e.who)), h('span', null, e.d)));
      }
      body = h('div', { class: 'card' },
        h('div', { class: 'row stf-filt' },
          h('select', { class: 'inp', onchange: (e) => { STF.who = e.target.value; renderCarnet(); } }, h('option', { value: '' }, 'Tout le monde'), members().map(([sl, , n]) => h('option', { value: sl, selected: STF.who === sl ? true : null }, n))),
          h('select', { class: 'inp', onchange: (e) => { STF.kind = e.target.value; renderCarnet(); } }, h('option', { value: '' }, 'Toutes les actions'), Object.entries(ACT_KIND).map(([k, [ico, l]]) => h('option', { value: k, selected: STF.kind === k ? true : null }, ico + ' ' + l)))),
        rows.length ? h('div', { class: 'stf-list' }, rows) : h('p', { class: 'muted' }, STF.loading ? 'Chargement…' : 'Rien pour ce filtre.'));
    } else if (STF.tab === 'notes') {
      const notes = STF.notes || [];
      const E = STF.edit;
      const saveNote = async (n) => { STF.msg = ''; const r = await window.fire.staff.noteSave(n, vocalMe()).catch((e) => ({ ok: false, error: String(e) })); if (r && r.ok) { STF.notes = r.notes; STF.edit = null; } else STF.msg = '⚠ ' + ((r && r.error) || 'erreur'); renderCarnet(); };
      body = h('div', null,
        E ? h('div', { class: 'card stf-edit' },
          h('input', { class: 'inp', placeholder: 'Titre (ex. : Toks : travailler le wave management)', value: E.titre || '', oninput: (e) => { E.titre = e.target.value; } }),
          h('input', { class: 'inp', placeholder: 'Étiquette (joueur, scrim, objectif…)', value: E.tag || '', oninput: (e) => { E.tag = e.target.value; } }),
          h('textarea', { class: 'inp', rows: 6, placeholder: 'Ta note pour le staff…', oninput: (e) => { E.texte = e.target.value; } }, E.texte || ''),
          h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => saveNote(E) }, '💾 Enregistrer'), h('button', { class: 'btn-ghost', onclick: () => { STF.edit = null; renderCarnet(); } }, 'Annuler')))
          : h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => { STF.edit = { titre: '', texte: '', tag: '' }; renderCarnet(); } }, '➕ Nouvelle note')),
        STF.msg ? h('p', { class: 'bad small' }, STF.msg) : null,
        notes.length ? notes.map((n) => h('div', { class: 'card stf-note' },
          h('div', { class: 'stf-nh' }, h('b', null, n.titre || 'Sans titre'), n.tag ? h('span', { class: 'chip' }, n.tag) : null, h('small', { class: 'muted' }, `${vocalName(n.by)} · ${dayFrT(n.at)} ${hm(n.at)}`)),
          h('p', { class: 'stf-nt' }, n.texte),
          h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => { STF.edit = { ...n }; renderCarnet(); window.scrollTo(0, 0); } }, '✏️ Modifier'),
            h('button', { class: 'btn-ghost', onclick: () => { if (confirm('Supprimer cette note ?')) saveNote({ ...n, del: true }); } }, '🗑 Supprimer')))) : h('p', { class: 'muted' }, 'Aucune note pour l’instant. Les notes sont visibles par tout le staff.'));
    } else if (STF.tab === 'modo') {
      const msgs = CH.msgs.filter((m) => !m.to).slice(-80).reverse();
      body = h('div', { class: 'card' }, h('p', { class: 'muted small' }, 'Les derniers messages des salons. Un message supprimé disparaît pour tout le monde. Les messages privés ne sont pas affichés ici.'),
        msgs.length ? msgs.map((m) => h('div', { class: 'stf-msg' }, h('span', { class: 'muted stf-t' }, `${dayFrT(m.at)} ${hm(m.at)}`), h('b', null, vocalName(m.from)),
          h('span', { class: 'muted' }, m.ch ? convName('ch:' + m.ch) : '#général'), h('span', { class: 'stf-mt' }, m.text),
          h('button', { class: 'btn-ghost', onclick: () => chatModDelete(m) }, '🗑'))) : h('p', { class: 'muted' }, 'Aucun message.'));
    } else {
      const canSet = S.coachState.coach || S.coachState.admin;
      const sel = new Set(STF.modos || []);
      body = h('div', null,
        h('div', { class: 'card' }, h('h2', null, '👑 Les rôles'),
          h('p', { class: 'small' }, '👑 Créateur : tous les droits, seulement sur son PC. 🎓 Coachs : code coach. ⭐ Chef d’équipe : code chef. 🛡️ Modérateurs : choisis ici par un coach ou le créateur (carnet de bord, suppression de messages, salons).'),
          S.coachState.admin ? h('p', { class: 'good small' }, '👑 Tu es le créateur sur ce PC : tous les droits.') : null),
        h('div', { class: 'card' }, h('h2', null, '🛡️ Modérateurs'),
          members().filter(([sl]) => !coachOf(sl)).map(([sl, ico, n]) => h('label', { class: 'nrow' }, h('input', { type: 'checkbox', checked: sel.has(sl) ? true : null, disabled: canSet ? null : true,
            onchange: async (e) => { if (e.target.checked) sel.add(sl); else sel.delete(sl); const r = await window.fire.staff.rolesSave([...sel], vocalMe()).catch((er) => ({ ok: false, error: String(er) }));
              if (r && r.ok) { STF.modos = r.modos; save('fire.modos', r.modos); } else alert('⚠ ' + ((r && r.error) || 'erreur')); renderCarnet(); renderNav(); } }), h('span', null, ico + ' ' + n))),
          canSet ? null : h('p', { class: 'muted small' }, 'Seuls un coach et le créateur peuvent choisir les modérateurs.')));
    }
    view.replaceChildren(hero, tabBar, body);
  }
  async function chatModDelete(m) {
    if (!confirm(`Supprimer ce message de ${vocalName(m.from)} pour tout le monde ?\n\n« ${m.text.slice(0, 200)} »`)) return;
    const r = await window.fire.staff.chatDelete(m.id, vocalMe()).catch((e) => ({ ok: false, error: String(e) }));
    if (r && r.ok) { CH.msgs = CH.msgs.filter((x) => x.id !== m.id); CH.deleted = (CH.deleted || new Set()); CH.deleted.add(m.id); chatPaint(); if (S.section === 'carnet') renderCarnet(); }
    else alert('⚠ ' + ((r && r.error) || 'suppression impossible'));
  }
  // Paramètres › Mon compte : préparer ce PC pour le rôle de créateur (clé gardée par Windows sur ce PC).
  function adminCard() {
    if (!window.fire.staff) return null;
    if (S.coachState.admin) return uxCard('👑 Créateur', null, h('p', { class: 'good' }, '👑 Tu es le créateur de FIRE sur ce PC : tous les droits (coach, chef d’équipe, modération, carnet de bord).'));
    const a = STF.admin;
    return uxCard('👑 Rôle de créateur', 'Tous les droits, seulement sur TON ordinateur. FIRE crée une clé gardée par Windows sur ce PC : elle ne marche sur aucun autre.',
      a ? [h('p', { class: 'small' }, 'Empreinte de ce PC : ', h('b', null, a.empreinte)),
        h('textarea', { class: 'inp adm-key', rows: 3, readonly: true }, a.pub),
        h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => { navigator.clipboard.writeText(a.pub).then(() => { STF.copied = true; renderSettings(); }).catch(() => {}); } }, STF.copied ? '✓ Copiée' : '📋 Copier la clé')),
        h('p', { class: 'muted small' }, 'Envoie cette clé (elle n’est pas secrète) à celui qui gère FIRE : elle sera ajoutée à la liste des créateurs, et ce PC aura tous les droits à la prochaine mise à jour.')]
        : h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: async () => { try { STF.admin = await window.fire.staff.adminSetup(); } catch (e) { /* */ } renderSettings(); } }, '👑 Préparer ce PC pour le rôle de créateur')));
  }

  // Fenêtre plein écran des paramètres, par-dessus FIRE (comme Discord).
  function setOverlay() {
    let el = document.getElementById('set-ovl');
    if (!el) {
      el = h('div', { id: 'set-ovl', class: 'set-ovl', role: 'dialog', 'aria-label': 'Paramètres' });
      document.body.append(el);
      document.documentElement.classList.add('set-open');
    }
    return el;
  }
  function setClose(silent) {
    const el = document.getElementById('set-ovl');
    if (!el) return;
    el.remove();
    document.documentElement.classList.remove('set-open');
    if (!silent && S.section === 'settings') go(S.prevSection && S.prevSection !== 'settings' ? S.prevSection : 'stats');
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !document.getElementById('set-ovl')) return;
    if (document.querySelector('.qs, .prof-pop, .who, .bug-modal')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') && e.target.value) return;
    e.preventDefault(); setClose();
  });
  // Nouveautés : les dernières versions de FIRE, en bref, avec un lien vers toutes les notes.
  function newsCard() {
    const list = Array.isArray(S.patch) ? S.patch : [];
    return h('div', { class: 'card settings-card' }, h('h2', null, '🆕 Les dernières nouveautés'),
      list.length ? list.slice(0, 4).map((v) => h('div', { class: 'set-news' }, h('b', null, `v${v.v} · ${v.titre}`), h('ul', null, (v.items || []).slice(0, 4).map(([, t]) => h('li', null, t)))))
        : h('p', { class: 'muted' }, 'Chargement…'),
      h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => go('patch') }, 'Voir toutes les notes de version')));
  }

  // ---------- Lecture dpm.lol ----------
  // Un joueur peut changer de compte : « comptes » liste ses comptes, chacun avec ses dates.
  // Un ancien compte (jusqu_au) garde toutes ses games jusqu'à ce jour inclus, le nouveau (depuis) compte à partir de ce jour.
  // L'identité du joueur (slug) ne change pas : planning, pools, objectifs et réglages restent les siens.
  const accountsOf = (p) => (Array.isArray(p.comptes) && p.comptes.length ? p.comptes : [{ slug: p.slug, puuid: p.puuid || null, pseudo: p.pseudo }]);
  const curAccount = (p) => { const a = accountsOf(p); return a.find((c) => !c.jusqu_au) || a[a.length - 1]; };
  const dayMs = (ymd) => new Date(ymd + 'T00:00:00').getTime();
  const inAccount = (c, t) => !(c.depuis && t < dayMs(c.depuis)) && !(c.jusqu_au && t >= dayMs(c.jusqu_au) + 86400000);
  function mergeChamps(lists) {
    const by = {};
    const W = ['kda', 'kills', 'deaths', 'assists', 'csm', 'gpm', 'dpm', 'kp', 'goldDiff'];
    for (const list of lists) for (const c of list || []) {
      const e = by[c.id];
      if (!e) { by[c.id] = { ...c }; continue; }
      const n1 = e.games || 0, n2 = c.games || 0, n = n1 + n2 || 1;
      for (const k of W) if (typeof c[k] === 'number' && typeof e[k] === 'number') e[k] = (e[k] * n1 + c[k] * n2) / n;
      e.games = n1 + n2; e.wins = (e.wins || 0) + (c.wins || 0);
      e.recent = [].concat(e.recent || [], c.recent || []);
    }
    return Object.values(by).sort((a, b) => (b.games || 0) - (a.games || 0));
  }
  // Lit chaque compte du joueur et rassemble ses games. Un compte terminé garde aussi les games déjà connues
  // (même sorties de la période lue), et si dpm.lol ne répond pas pour lui, on reprend la dernière lecture.
  async function fetchAccounts(p) {
    const accs = accountsOf(p);
    const cur = S.data[p.slug] || {};
    const prev = cur.acc || {};
    if (!cur.acc && cur.matches && accs[0] && accs[0].jusqu_au) prev[accs[0].slug] = { matches: cur.matches, champs: cur.champs, rank: cur.rank, record: cur.record, at: cur.at };
    const acc = {};
    let ok = false, error = '';
    for (const c of accs) {
      let r;
      try { r = await window.fire.fetchPlayer({ slug: c.slug, puuid: c.puuid || null }, fetchDays()); } catch (e) { r = { ok: false, error: String(e) }; }
      const old = prev[c.slug];
      if (r && r.ok) {
        ok = true;
        let ms = (r.matches || []).filter((m) => inAccount(c, m.t)).map((m) => ({ ...m, pu: r.puuid || c.puuid }));
        if (c.jusqu_au && old) { const ids = new Set(ms.map((m) => m.id)); ms = ms.concat((old.matches || []).filter((m) => !ids.has(m.id) && inAccount(c, m.t)).map((m) => ({ pu: c.puuid, ...m }))); }
        acc[c.slug] = { matches: ms, champs: r.champs, rank: r.rank, record: r.record, at: r.at };
      } else if (old) acc[c.slug] = old;
      else error = (r && r.error) || 'erreur inconnue';
    }
    if (!ok) return { ok: false, error };
    const list = accs.map((c) => acc[c.slug]).filter(Boolean);
    const seen = new Set();
    const matches = list.flatMap((a) => a.matches || []).filter((m) => (seen.has(m.id) ? false : seen.add(m.id))).sort((a, b) => b.t - a.t);
    const now = acc[curAccount(p).slug] || {};
    const older = list.find((a) => a !== now && a.rank) || {};
    return { ok: true, matches, champs: mergeChamps(list.map((a) => a.champs)), rank: now.rank || (older.rank ? older.rank + ' (ancien compte)' : ''), record: now.rank ? now.record : older.record || '', at: Math.max(...list.map((a) => a.at || 0)), acc };
  }
  function fetchDays(p) {
    if (p && /^\d{4}-\d{2}-\d{2}$/.test(p.stats_depuis || '')) return Math.min(400, Math.max(fetchDays(), Math.ceil((Date.now() - new Date(p.stats_depuis + 'T00:00:00').getTime()) / 86400000) + 1));
    let n = FETCH_DAYS;
    if (S.obj) n = Math.max(n, Math.ceil((Date.now() - new Date(S.obj.debut + 'T00:00:00').getTime()) / 86400000) + 1);
    if (S.debut) n = Math.max(n, Math.ceil((Date.now() - new Date(S.debut + 'T00:00:00').getTime()) / 86400000) + 1);
    return Math.min(n, 120);
  }

  async function refreshAll() {
    if (S.refreshing) return;
    const list = S.players.filter((p) => p.slug);
    if (!list.length) return;
    S.refreshing = true;
    $('refresh').disabled = true;
    list.forEach((p) => { S.status[p.slug] = { state: 'wait' }; });
    renderStatus();
    if (S.section === 'stats' && S.view === 'hub') render();
    let i = 0;
    const worker = async () => {
      while (i < list.length) {
        const p = list[i++];
        S.status[p.slug] = { state: 'loading' };
        renderStatus();
        if (S.section === 'stats' && S.view === 'hub') render();
        let res;
        if (Array.isArray(p.comptes) && p.comptes.length) res = await fetchAccounts(p);
        else { try { res = await window.fire.fetchPlayer({ slug: p.slug, pseudo: p.pseudo, puuid: p.puuid || (load('fire.puuids', {}) || {})[p.slug] || ((S.cfg && S.cfg.puuids) || {})[String(p.pseudo || '').toLowerCase()] || null, pages: p.stats_depuis ? 70 : 14 }, fetchDays(p)); } catch (e) { res = { ok: false, error: String(e) }; } }
        // Identifiant Riot gardé : la prochaine lecture marche même si dpm.lol tarde à répondre (membres ajoutés par l'accueil).
        if (res && res.ok && res.puuid && !p.puuid) { const m = load('fire.puuids', {}) || {}; if (m[p.slug] !== res.puuid) { m[p.slug] = res.puuid; save('fire.puuids', m); } }
        if (res && res.ok) {
          S.data[p.slug] = { matches: res.matches, champs: res.champs, rank: res.rank, record: res.record, at: res.at, acc: res.acc };
          save('fire.data', S.data);
          S.status[p.slug] = { state: 'ok', at: res.at };
        } else {
          S.status[p.slug] = { state: 'error', error: (res && res.error) || 'erreur inconnue' };
        }
        renderStatus();
        if (S.section === 'stats' && (S.view === 'hub' || S.player === p.slug)) render();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    S.refreshing = false;
    S.lastRefresh = Date.now();
    $('refresh').disabled = false;
    renderStatus();
    if (S.section === 'settings' && !typing()) renderSettings();
    loadTeam();
  }

  function renderStatus() {
    const list = S.players.filter((p) => p.slug);
    const st = list.map((p) => S.status[p.slug] || {});
    const busy = st.filter((x) => x.state === 'loading' || x.state === 'wait').length;
    const errs = list.filter((p) => (S.status[p.slug] || {}).state === 'error');
    let t;
    if (busy) t = `Mise à jour depuis dpm.lol… ${list.length - busy}/${list.length} joueurs`;
    else if (S.lastRefresh) t = `Stats à jour depuis dpm.lol à ${hm(S.lastRefresh)} · prochaine mise à jour automatique dans 10 min`;
    else t = 'Stats de la dernière session (mise à jour en cours)';
    if (errs.length) t += ` · dpm.lol n'a pas répondu pour ${errs.map((p) => p.pseudo).join(', ')} : dernières stats connues affichées`;
    $('status').textContent = t;
  }

  // La dernière game classée Solo/Duo lue sur dpm.lol, pour vérifier d'un coup d'œil que tout est à jour.
  function lastGame(d) {
    const m = (d && d.matches || []).filter((x) => x.q === 420).sort((a, b) => b.t - a.t)[0];
    if (!m) return null;
    const dt = new Date(m.t);
    const today = FC.ymd(dt) === FC.ymd(new Date());
    const quand = today ? `aujourd'hui à ${hm(m.t)}` : `${dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${hm(m.t)}`;
    return `Dernière game : ${FC.champName(m.championName)} ${m.win ? '✓' : '✗'}, ${quand}`;
  }

  function statusText(st, d) {
    if (st && st.state === 'loading') return '⟳ Lecture de dpm.lol…';
    if (st && st.state === 'wait') return '⏳ En attente…';
    if (st && st.state === 'error') return d ? `⚠ dpm.lol injoignable · stats de ${hm(d.at)}` : `⚠ dpm.lol injoignable : ${st.error}`;
    if (d) return `✓ À jour à ${hm(d.at)}`;
    return '';
  }

  // ---------- Rendu ----------
  function render() {
    hideTip();
    renderNav();
    try { chatPaint(); } catch (e) { /* discussion pas encore prête */ }
    try { vocalLiveBanner(); } catch (e) { /* salon pas encore prêt */ }
    $('period-box').hidden = S.section !== 'stats' || S.view === 'team';
    const back = $('back');
    back.hidden = S.section === 'carnet' || S.section === 'parcours' || S.section === 'puzzle' || S.section === 'scrims' || S.section === 'revue' || S.section === 'clips' || S.section === 'reunion' || S.section === 'outils' || S.section === 'parties' || S.section === 'chat' || S.section === 'web' || S.section === 'settings' || S.section === 'pool' || S.section === 'planning' || S.section === 'jeux' || S.section === 'worlds' || S.section === 'patch' || S.section === 'lolpatch' || S.section === 'train' || S.section === 'vocal' || S.section === 'draft' || !(S.section === 'stats' ? (S.view === 'player' || S.view === 'team') : S.section === 'guides' ? !!(S.theme || S.guideCat) : !!S.ficheId);
    const gc = catOf(S.guideCat);
    back.textContent = S.section === 'stats' ? '← Équipe' : S.section === 'guides' ? (S.theme && gc ? `← ${gc.titre}` : '← Lanes et principes') : '← Parole du coach';
    if (S.section === 'settings') renderSettings();
    else if (S.section === 'web') renderWeb();
    else if (S.section === 'chat') renderChatPage();
    else if (S.section === 'carnet') renderCarnet();
    else if (S.section === 'clips') renderClipsPage();
    else if (S.section === 'reunion') renderReunion();
    else if (S.section === 'outils') renderOutils();
    else if (S.section === 'parcours') renderParcours();
    else if (S.section === 'puzzle') renderGamePuzzle();
    else if (S.section === 'scrims') renderScrims();
    else if (S.section === 'revue') renderRevue();
    else if (S.section === 'parties') renderParties();
    else if (S.section === 'pool') renderPool();
    else if (S.section === 'planning') renderPlanning();
    else if (S.section === 'jeux') renderJeux();
    else if (S.section === 'worlds') renderWorlds();
    else if (S.section === 'patch') renderPatch();
    else if (S.section === 'lolpatch') renderLolPatch();
    else if (S.section === 'train') renderTrain();
    else if (S.section === 'vocal') renderVocal();
    else if (S.section === 'draft') renderDraft();
    else if (S.section === 'guides') { if (S.theme) renderTheme(); else renderGuides(); }
    else if (S.section === 'coach') { if (S.ficheId) renderFicheView(); else renderCoach(); }
    else if (S.view === 'player') renderPlayer();
    else if (S.view === 'team') renderTeam();
    else renderHub();
  }

  function openPlayer(slug) {
    if (SUB() && slug !== S.moi) return;
    S.view = 'player'; S.player = slug; S.tab = 'resume'; S.jour = 'tous'; S.more = false; S.openCard = null;
    render();
    window.scrollTo(0, 0);
  }

  // ----- Accueil équipe -----
  function renderHub() {
    const start = periodStart();
    const view = $('view');
    view.replaceChildren(...[
      newsBanner(), pendingBanner(),
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🔥'), h('div', null,
        h('h1', { class: 'title' }, "L'équipe"),
        h('p', { class: 'muted' }, `Classé Solo/Duo · ${periodLabel()} · clique sur un joueur pour voir tout le détail.`),
        (S.coachs || []).length ? h('p', { class: 'muted small hub-coachs' }, '🎓 Coachs : ', (S.coachs || []).map((c) => h('b', null, c.pseudo)).reduce((a, x, i) => (i ? a.concat(' · ', x) : [x]), [])) : null,
        S.obj && S.obj.games ? h('p', { class: 'muted small' }, `🎯 Objectif : ${S.obj.games} games par semaine (du lundi au dimanche) sur les champions obligatoires, réparties comme chacun veut. Cette semaine : du ${dateFr(S.obj.debut)} au ${dateFr(S.obj.fin)}.`) : null)),
      SUB() ? subBanner() : homeNotes(),
      SUB() ? null : liveSection(),
      SUB() ? null : teamCards(),
      h('div', { class: 'more-row hub-more' }, h('button', { class: 'btn-ghost more-btn', onclick: () => { S.hubMore = !S.hubMore; render(); } }, S.hubMore ? '➖ Moins de détails' : '➕ Plus de détails')),
      // Les titulaires (Team FIRE) d'abord, les remplaçants dans leur propre catégorie en dessous.
      ...(SUB() ? subHub(start) : hubSections(start))
    ].filter(Boolean));
  }

  // ----- Parties en direct : la mienne (API locale de Riot) et celles des coéquipiers (envoyées par leur FIRE) -----
  const LIVE = { mine: null, lastSend: 0, sig: '' };
  function liveAll() {
    const out = {};
    try { Object.assign(out, (FV().state().lives) || {}); } catch (e) { /* vocal pas prêt */ }
    const me = vocalMe();
    if (LIVE.mine && me) out[me] = LIVE.mine;
    return out;
  }
  function liveInit() {
    if (!window.fire.live) return;
    window.fire.live.on((g) => {
      LIVE.mine = g;
      const now = Date.now();
      if (g) autoClipCheck(g);
      mmLive(g);
      vodLive(g);
      if (g && g.events) { g = { ...g }; delete g.events; LIVE.mine = g; }
      if (!g || now - LIVE.lastSend > 5000) { LIVE.lastSend = now; try { FV().liveSend(UX.hideLive ? null : g); } catch (e) { /* hors ligne */ } }
      if (!!g !== !!LIVE.wasIn) { LIVE.wasIn = !!g; statusPush(); }
      liveRefresh();
    });
    try { FV().onChange(() => liveRefresh()); } catch (e) { /* */ }
  }
  function liveRefresh(force) {
    const all = liveAll();
    const bare = S.players.filter((p) => p.slug && !all[p.slug] && p.slug !== vocalMe() && statusOf(p.slug).game).map((p) => p.slug + ':g');
    const sig = Object.entries(all).map(([k, g]) => k + ':' + g.time).concat(bare).sort().join('|');
    if (sig === LIVE.sig && !force) return;
    const keysChanged = Object.keys(all).sort().join() !== LIVE.sig.split('|').map((x) => x.split(':')[0]).filter(Boolean).sort().join();
    LIVE.sig = sig;
    if (keysChanged) renderNav();
    if (S.section === 'stats' && S.view === 'hub' && !typing()) {
      const cur = document.querySelector('.live-sec');
      const next = liveSection();
      if (cur && next) cur.replaceWith(next); else if (cur || next) render();
    }
  }
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  // Mode exact de la partie : file d'attente lue dans le client League (Solo/Duo, Flex, Normale, ARAM…), sinon le mode du jeu.
  const QUEUES = { 420: 'Classée Solo/Duo', 440: 'Classée Flex', 400: 'Normale (draft)', 430: 'Normale (aveugle)', 480: 'Partie rapide', 490: 'Partie rapide', 450: 'ARAM', 2400: 'ARAM : Mayhem',
    1700: 'Arena', 1710: 'Arena', 900: 'URF', 1900: 'URF', 1010: 'URF', 700: 'Clash', 720: 'Clash ARAM', 0: 'Partie personnalisée', 3100: 'Partie personnalisée', 1020: 'Un pour tous', 1300: 'Nexus Blitz', 1810: 'Swarm', 1820: 'Swarm', 1830: 'Swarm', 1840: 'Swarm',
    830: 'Contre l’IA', 840: 'Contre l’IA', 850: 'Contre l’IA', 870: 'Contre l’IA', 880: 'Contre l’IA', 890: 'Contre l’IA' };
  const GMODES = { CLASSIC: 'Faille (normale ou classée)', ARAM: 'ARAM', KIWI: 'ARAM : Mayhem', CHERRY: 'Arena', URF: 'URF', ARURF: 'ARURF', PRACTICETOOL: 'Outil d’entraînement', ONEFORALL: 'Un pour tous', NEXUSBLITZ: 'Nexus Blitz', ULTBOOK: 'Grimoire ultime', TUTORIAL: 'Tutoriel', STRAWBERRY: 'Swarm', SWIFTPLAY: 'Partie rapide' };
  const gameModeLabel = (g) => (g.queue && g.queue.custom && 'Partie personnalisée') || (g.queue && g.queue.id != null && QUEUES[g.queue.id]) || (g.queue && g.queue.name) || GMODES[g.mode] || g.mode || 'Partie';
  const gameModeKind = (g) => { const id = g.queue && g.queue.id; return id === 420 || id === 440 ? 'ranked' : (g.mode === 'ARAM' || g.mode === 'KIWI' || id === 450 || id === 2400) ? 'aram' : g.mode === 'CLASSIC' ? 'normal' : 'fun'; };
  // ----- Vue spectateur FIRE : comme le tableau (Tab) en jeu, avec objets, sorts, objectifs et le fil de la partie -----
  const SP_DRAG = { Fire: ['#ff6a3d', 'Infernal'], Earth: ['#b98a4a', 'Montagne'], Water: ['#3dc8d8', 'Océan'], Air: ['#cfe3ff', 'Nuages'], Hextech: ['#3d8bff', 'Hextech'], Chemtech: ['#9be03d', 'Chemtech'], Elder: ['#e8d9ff', 'Ancestral'] };
  function specView(g, slugs) {
    const v = (S.champList && S.champList.version) || '';
    const ours = new Set(S.players.map((p) => String(p.pseudo || '').toLowerCase()));
    const img = (src, cls, title, sz) => h('img', { class: cls, src, alt: '', title: title || '', width: sz, height: sz, loading: 'lazy', onerror: (e) => { e.target.style.visibility = 'hidden'; } });
    const item = (id) => id ? img(`https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${id}.png`, 'sp-it', '', 22) : h('span', { class: 'sp-it empty' });
    const spell = (k) => k ? img(`https://ddragon.leagueoflegends.com/cdn/${v}/img/spell/${k}.png`, 'sp-sp', k.replace(/^Summoner/, ''), 16) : h('span', { class: 'sp-sp empty' });
    const O = g.obj || { ORDER: {}, CHAOS: {} };
    const kills = (t) => (O[t] && O[t].kills != null ? O[t].kills : g.players.filter((p) => p.team === t).reduce((a, p) => a + p.k, 0));
    const objs = (t) => { const o = O[t] || {};
      return h('div', { class: 'sp-obj ' + (t === 'ORDER' ? 'blue' : 'red') },
        h('span', { title: 'Tours détruites' }, '🏰 ', o.tower || 0), o.inhib ? h('span', { title: 'Inhibiteurs' }, '⬢ ', o.inhib) : null,
        h('span', { class: 'sp-drags', title: 'Dragons' }, (o.drag || []).map((d) => h('i', { class: 'sp-drag', style: `background:${(SP_DRAG[d] || ['#999'])[0]}`, title: (SP_DRAG[d] || ['', d])[1] })), !(o.drag || []).length ? h('small', { class: 'muted' }, '0 dragon') : null),
        o.grubs ? h('span', { title: 'Larves du Néant' }, '🪲 ', o.grubs) : null, o.herald ? h('span', { title: 'Héraut' }, '👁 ', o.herald) : null,
        o.baron ? h('span', { title: 'Nashor' }, '🟣 ', o.baron) : null, o.atakhan ? h('span', { title: 'Atakhan' }, '🔥 ', o.atakhan) : null);
    };
    const row = (p) => h('div', { class: 'sp-p' + (ours.has(p.n.toLowerCase()) ? ' ours' : '') + (p.dead ? ' dead' : '') },
      h('span', { class: 'sp-ch' }, champIcon(p.c, 34), h('b', { class: 'sp-lvl' }, p.lvl), p.dead ? h('span', { class: 'sp-dead' }, p.dead) : null),
      h('span', { class: 'sp-sps' }, (p.sp || []).map(spell)),
      h('span', { class: 'sp-n' }, h('b', null, p.n.split('#')[0]), h('small', { class: 'muted' }, `${p.cs} CS${p.ward ? ' · vision ' + p.ward : ''}`)),
      h('span', { class: 'sp-its' }, ...((p.it && p.it.length ? p.it : [0, 0, 0, 0, 0, 0, 0]).slice(0, 7).map(item))),
      h('span', { class: 'sp-k' }, `${p.k} / ${p.d} / ${p.a}`));
    const FEED = { drag: '🐉', baron: '🟣', herald: '👁', grubs: '🪲', atakhan: '🔥', tower: '🏰', inhib: '⬢' };
    const feedTxt = (f) => f.x === 'drag' ? `Dragon ${((SP_DRAG[f.what] || ['', f.what])[1] || '').toLowerCase()}${f.st ? ' (volé)' : ''}` : f.x === 'baron' ? 'Nashor' + (f.st ? ' (volé)' : '') : f.x === 'herald' ? 'Héraut' : f.x === 'grubs' ? 'Larve du Néant' : f.x === 'atakhan' ? 'Atakhan' : f.x === 'tower' ? 'Tour détruite' : f.x === 'inhib' ? 'Inhibiteur détruit' : '';
    const feed = (g.feed || []).slice().reverse().map((f) => h('div', { class: 'sp-f ' + (f.team === 'ORDER' ? 'blue' : f.team === 'CHAOS' ? 'red' : '') },
      h('small', { class: 'muted sp-ft' }, mmss(f.t)),
      f.x === 'kill' ? [f.kc ? champIcon(f.kc, 22) : h('span', { title: { tour: 'Tour', sbire: 'Sbires', monstre: 'Monstre', exec: 'Exécuté' }[f.kk] || '' }, { tour: '🏰', sbire: '👾', monstre: '🐉', exec: '💀' }[f.kk] || '💀'), h('span', { class: 'sp-sw' }, '⚔'), f.vc ? champIcon(f.vc, 22) : h('span', null, '?'), f.n ? h('small', { class: 'muted' }, ` +${f.n}`) : null]
        : [h('span', null, FEED[f.x] || '•'), h('span', null, feedTxt(f)), f.kc ? champIcon(f.kc, 18) : null]));
    // Regarder : le vrai mode spectateur de LoL (3 min de délai, imposé par Riot) ou l'écran du joueur s'il le partage en vocal.
    const vs = FV().state();
    const sharing = slugs.filter((x) => (vs.members || []).some((m) => m.slug === x && m.remote && m.remote.screen));
    const me = vocalMe();
    const watchers = slugs.filter((x) => x !== me);
    const SPX = (LIVE.spx = LIVE.spx || {});
    const actions = h('div', { class: 'row sp-act' },
      watchers.map((x) => { const nm = String(((S.players.find((p) => p.slug === x) || {}).pseudo) || vocalName(x)).split('#')[0];
        return h('button', { class: 'btn-fire small-btn', disabled: SPX[x] === '…' ? true : null, title: 'Ouvre le mode spectateur de League of Legends (le client LoL doit être ouvert). Riot impose 3 minutes de délai.', onclick: async () => {
          SPX[x] = '…'; liveRefresh(true);
          const r = await window.fire.live.spectate({ puuid: g.puuid || '', name: (g.players.find((p) => p.n.split('#')[0].toLowerCase() === nm.toLowerCase()) || {}).n || nm }).catch((e) => ({ ok: false, error: String(e) }));
          SPX[x] = r && r.ok ? '✓ Le mode spectateur de LoL se lance…' : '⚠ ' + ((r && r.error) || 'impossible');
          liveRefresh(true);
        } }, `👁 Regarder ${nm} en spectateur`); }),
      sharing.map((x) => h('button', { class: 'btn-ghost', onclick: () => { go('vocal'); VX.focus = x + ':screen'; renderVocal(); } }, `📺 Voir l’écran de ${vocalName(x)}`)),
      Object.values(SPX).filter((t) => t && t !== '…').slice(-1).map((t) => h('small', { class: t.startsWith('⚠') ? 'bad' : 'good' }, t)),
      h('small', { class: 'muted sp-note' }, 'Ici : mis à jour toutes les 5 s, sans délai. Spectateur LoL : image du jeu, 3 min de délai.'));
    return h('div', { class: 'sp' },
      h('div', { class: 'sp-score' }, objs('ORDER'), h('div', { class: 'sp-k2' }, h('b', { class: 'blue' }, kills('ORDER')), h('span', { class: 'muted' }, mmss(g.time)), h('b', { class: 'red' }, kills('CHAOS'))), objs('CHAOS')),
      h('div', { class: 'sp-body' },
        h('div', { class: 'sp-teams' }, h('div', { class: 'sp-team blue' }, g.players.filter((p) => p.team === 'ORDER').map(row)), h('div', { class: 'sp-team red' }, g.players.filter((p) => p.team === 'CHAOS').map(row))),
        feed.length ? h('div', { class: 'sp-feed' }, h('h4', null, 'Fil de la partie'), feed) : null),
      actions);
  }
  function liveSection() {
    const all = liveAll();
    // Plusieurs joueurs de FIRE dans la même partie : une seule carte.
    const games = [];
    for (const [slug, g] of Object.entries(all)) {
      const key = g.players.map((p) => p.n).sort().join('|');
      const ex = games.find((x) => x.key === key);
      if (ex) { ex.slugs.push(slug); if (g.at > ex.g.at) ex.g = g; } else games.push({ key, g, slugs: [slug] });
    }
    // En game d'après leur statut, mais leur FIRE n'a pas (encore) envoyé le détail : on les montre quand même.
    const shown = new Set(Object.keys(all));
    const bare = S.players.filter((p) => p.slug && !p.pending && !shown.has(p.slug) && p.slug !== vocalMe() && statusOf(p.slug).game);
    if (!games.length && !bare.length) return null;
    const ours = new Set(S.players.map((p) => String(p.pseudo || '').toLowerCase()));
    const isOurs = (p) => ours.has(p.n.toLowerCase());
    const team = (g, side) => h('div', { class: 'lv-team ' + (side === 'ORDER' ? 'blue' : 'red') }, g.players.filter((p) => p.team === side).map((p) =>
      h('div', { class: 'lv-p' + (isOurs(p) ? ' ours' : '') }, champIcon(p.c, 24),
        h('span', { class: 'lv-n' }, h('b', null, p.n.split('#')[0]), h('small', { class: 'muted' }, ` niv. ${p.lvl} · ${p.cs} CS`)),
        h('span', { class: 'lv-k' }, `${p.k} / ${p.d} / ${p.a}`))));
    LIVE.open = LIVE.open || {};
    const n = games.reduce((t, x) => t + x.slugs.length, 0) + bare.length;
    return h('section', { class: 'live-sec' },
      h('h2', { class: 'hub-sec' }, h('span', { class: 'lv-dot' }), h('span', null, 'En game maintenant'),
        h('small', { class: 'muted' }, `${n} joueur${n > 1 ? 's' : ''} de FIRE${games.length > 1 ? ` · ${games.length} parties` : ''}`)),
      games.map(({ key, g, slugs }) => {
        const open = LIVE.open[key] != null ? LIVE.open[key] : games.length === 1;
        const mine = g.players.filter(isOurs);
        const names = slugs.map((x) => (S.players.find((p) => p.slug === x) || {}).pseudo || vocalName(x)).map((x) => String(x).split('#')[0]);
        return h('div', { class: 'card lv-card' + (open ? ' open' : '') },
          h('button', { class: 'lv-head lv-tog', 'aria-expanded': String(open), onclick: () => { LIVE.open[key] = !open; const cur = document.querySelector('.live-sec'); if (cur) cur.replaceWith(liveSection()); } },
            h('span', { class: 'lv-live' }, 'EN DIRECT'),
            h('span', { class: 'lv-mode ' + gameModeKind(g) }, gameModeLabel(g)),
            h('span', { class: 'lv-ours' }, (mine.length ? mine : g.players.filter((p) => p.n === g.me)).map((p) => h('span', { class: 'lv-o' }, champIcon(p.c, 22), h('b', null, p.n.split('#')[0]), h('small', { class: 'muted' }, ` ${p.k}/${p.d}/${p.a}`))),
              !mine.length ? h('b', null, names.join(', ')) : null),
            h('span', { class: 'muted lv-time' }, mmss(g.time)),
            h('span', { class: 'lv-chev' }, open ? 'Masquer ▴' : 'Détails ▾')),
          open ? specView(g, slugs) : null);
      }),
      bare.length ? h('div', { class: 'card lv-card lv-bare' }, h('div', { class: 'lv-head' }, h('span', { class: 'lv-live' }, 'EN GAME'),
        h('b', null, bare.map((p) => String(p.pseudo || '').split('#')[0]).join(', ')),
        h('span', { class: 'muted small' }, 'Le détail de la partie arrive dès que leur FIRE l’envoie (FIRE ouvert chez eux, « Montrer ma partie » activé).'))) : null);
  }

  const isSub = (p) => !!(p.remplacant || /rempla|bench|suppl/i.test(p.role || ''));
  function hubSections(start) {
    const grid = (list) => h('div', { class: 'hub-grid' + (S.hubMore ? '' : ' compact') }, list.map((p) => hubCard(p, start)));
    const main = S.players.filter((p) => !isSub(p)), subs = S.players.filter(isSub);
    return [
      h('h2', { class: 'hub-sec' }, h('span', null, '🔥 Team FIRE'), h('small', { class: 'muted' }, `${main.length} titulaire${main.length > 1 ? 's' : ''}`)),
      grid(main),
      subs.length ? h('h2', { class: 'hub-sec subs' }, h('span', null, '🔁 Remplaçants'), h('small', { class: 'muted' }, `${subs.length} joueur${subs.length > 1 ? 's' : ''}`)) : null,
      subs.length ? grid(subs) : null];
  }

  function roleLine(p, R) {
    return h('div', { class: 'role' }, h('span', { class: 'ico' }, R.ico), h('span', null, p.role || R.label));
  }

  function hubCard(p, start) {
    const R = roleOf(p);
    if (!p.slug) {
      return h('article', { class: 'pcard empty' }, roleLine(p, R), h('div', { class: 'pname muted' }, p.pseudo || 'Joueur à venir'), h('div', { class: 'soon' }, 'Bientôt disponible'));
    }
    const d = S.data[p.slug];
    const st = S.status[p.slug];
    const bd = bandeau(p);
    const bg = skinBg(p);
    const card = h('article', { class: 'pcard' + (bd ? ' banded b-' + bd.theme : '') + (bg ? ' has-skin' : ''), tabindex: '0', onclick: () => openPlayer(p.slug), onkeydown: (e) => { if (e.key === 'Enter') openPlayer(p.slug); } },
      bg, bd ? h('div', { class: 'pcap' }, bd.texte) : null, roleLine(p, R), h('div', { class: 'pname' }, p.pseudo),
      vocalPeople().includes(p.slug) ? h('button', { class: 'pvoc', title: 'Ouvrir le salon vocal', onclick: (e) => { e.stopPropagation(); go('vocal'); } }, h('span', { class: 'dot' }), 'En vocal') : null);
    // Vue compacte : rôle, pseudo et objectif de games. Le reste avec « Plus de détails » ou sur le profil.
    if (!S.hubMore) {
      if (d) card.append(progress(objFor(p, d)));
      if (S.coachState.coach && S.obj) card.append(bonusCtl(p, true));
      if (!d) card.append(h('div', { class: 'pstatus ' + ((st && st.state) || '') }, statusText(st, d)));
      return card;
    }
    if (p.pool) card.append(h('div', { class: 'muted small' }, '🎯 ' + p.pool));
    if ((p.maitrise_ids || []).length) card.append(h('div', { class: 'muted small' }, '⭐ ' + p.maitrise_ids.map(FC.champName).join(' · ')));
    if (d) {
      const s = FC.stats(FC.toRows(p, d.matches, periodStart(p)));
      const box = h('div');
      card.append(h('div', { class: 'mini' }, box, h('div', { class: 'mini-info' },
        h('div', null, s.games ? `${pl(s.wins, 'victoire', 'victoires')} · ${pl(s.losses, 'défaite', 'défaites')}` : 'Aucune game'),
        h('div', { class: 'muted small' }, s.games ? `KDA ${fr(s.kda, 2)} · ${fr(s.morts_moy, 1)} morts/game` : periodLabel(p)),
        d.rank ? h('div', { class: 'muted small' }, d.rank) : null)));
      later(() => ring(box, s, 84));
      const o = objFor(p, d);
      card.append(progress(o));
      if (S.coachState.coach && S.obj) card.append(bonusCtl(p, true));
      const cb = s.games ? catBar({ oblig: s.oblig, maitrise: s.maitrise_g, autres: s.autres }) : null;
      if (cb) { cb.classList.add('compact'); card.append(cb); }
      const pills = hubPills(p, FC.toRows(p, d.matches, periodStart(p)), s, o);
      if (pills.length) card.append(h('div', { class: 'hpills' }, pills));
    }
    const lg = lastGame(d);
    if (lg) card.append(h('div', { class: 'muted small' }, lg));
    card.append(h('div', { class: 'pstatus ' + ((st && st.state) || '') }, statusText(st, d)));
    return card;
  }

  // Alertes visuelles courtes sur la carte d'un joueur (série, objectif, hors pool, morts).
  function hubPills(p, rows, s, o) {
    const out = [];
    if (rows.length >= 3) {
      const last = rows[rows.length - 1].win;
      let n = 0;
      for (let i = rows.length - 1; i >= 0 && rows[i].win === last; i--) n++;
      if (n >= 3) out.push(h('span', { class: 'hp ' + (last ? 'good' : 'bad') }, last ? `🔥 ${n} victoires de suite` : `🥶 ${n} défaites de suite`));
    }
    if (o && o.target) out.push(o.done >= o.target ? h('span', { class: 'hp good' }, '🎯 Objectif atteint') : null);
    if (s.games >= 4 && s.autres / s.games >= 0.25) out.push(h('span', { class: 'hp bad' }, `❔ ${s.autres} games hors pool`));
    const rep = FC.reperes(p.role_id);
    if (s.games >= 3 && s.morts_moy > rep.morts_moy.v) out.push(h('span', { class: 'hp bad' }, `💀 ${fr(s.morts_moy, 1)} morts/game`));
    else if (s.games >= 3 && s.kda >= rep.kda.v) out.push(h('span', { class: 'hp good' }, `⚔️ KDA ${fr(s.kda, 2)}`));
    return out.filter(Boolean).slice(0, 3);
  }

  // ----- Stats de l'équipe : les flex jouées ensemble -----
  // Un joueur avec plusieurs comptes apparaît une fois par compte (même slug) : ses flex sont reconnues sur chacun.
  const teamRoster = () => S.players.filter((p) => p.slug).flatMap((p) => accountsOf(p).filter((c) => c.puuid).map((c) => ({ slug: p.slug, pseudo: p.pseudo, puuid: c.puuid, role_id: p.role_id })));
  const shortName = (p) => String(p || '').split('#')[0];

  // Repère les flex communes dans l'historique déjà lu, puis demande à dpm.lol le détail de celles qu'on n'a pas encore.
  async function loadTeam() {
    if (S.teamState === 'loading') return;
    const roster = teamRoster();
    const cands = FT.candidates(roster, S.data).slice(0, 80);
    const reqs = cands.filter((g) => !S.teamGames[g.id]).map((g) => ({ id: g.id, puuid: g.who[0] }));
    S.teamState = 'loading';
    if (S.section === 'stats' && S.view !== 'player') render();
    try {
      const r = await window.fire.team(reqs);
      if (r && r.games) S.teamGames = r.games;
      S.teamState = r && r.ok === false ? 'error' : 'ok';
      S.teamErr = (r && r.error) || '';
      S.teamAt = Date.now();
    } catch (e) {
      S.teamState = 'error';
      S.teamErr = String(e);
    }
    if (S.section === 'stats' && S.view !== 'player' && !typing()) render();
  }

  // q : 440 = Flex, 710 = 5c5 du week-end (classé 5v5 en équipe). Jamais les deux ensemble.
  function teamAnalysis(q) {
    return FT.analyze(Object.values(S.teamGames || {}), teamRoster(), q || S.teamQ || 440);
  }
  const TEAM_MODES = [[440, '🔁 Flex'], [710, '🏆 5c5 du week-end']];
  const modeText = (q) => (q === 710 ? '5c5 du week-end' : 'Flex');

  function openTeam(q) {
    S.view = 'team';
    S.teamQ = q;
    render();
    window.scrollTo(0, 0);
  }

  // Une carte par mode : la Flex et les 5c5 du week-end ne sont jamais mélangés.
  function teamCards() {
    return h('div', { class: 'team-cards' }, teamCard(440), teamCard(710));
  }

  function teamCard(q) {
    const A = teamAnalysis(q);
    const n = A.all.n;
    const box = h('div', { class: 'ring' });
    const last = A.games.slice(0, 10).reverse();
    const ico = q === 710 ? '🏆' : '🔁';
    const card = h('article', { class: 'team-card' + (q === 710 ? ' t5' : ''), tabindex: '0', onclick: () => openTeam(q), onkeydown: (e) => { if (e.key === 'Enter') openTeam(q); } },
      h('div', { class: 'team-card-txt' },
        h('div', { class: 'team-kick' }, `${ico} Stats de l’équipe · ${modeText(q)}`),
        h('div', { class: 'team-big' }, n ? `${A.all.w} V – ${A.all.l} D` : (q === 710 ? 'Aucun 5c5 joué ensemble pour l’instant' : 'Aucune flex jouée ensemble pour l’instant')),
        h('p', { class: 'muted small' }, n
          ? `${pl(n, 'game', 'games')} avec au moins 2 joueurs de FIRE · bonnes et mauvaises actions, stratégie, points forts`
          : (S.teamState === 'loading' ? 'Recherche sur dpm.lol…' : (q === 710 ? 'Jouez un 5c5 classé à 2 ou plus : il apparaîtra ici.' : 'Jouez une flex à 2 ou plus : elle apparaîtra ici.'))),
        last.length ? h('div', { class: 'team-dots' }, last.map((g) => h('span', { class: 'tdot ' + (g.win ? 'w' : 'l'), title: `${new Date(g.t).toLocaleDateString('fr-FR')} · ${g.win ? 'Victoire' : 'Défaite'} à ${g.size}` }, g.win ? 'V' : 'D'))) : null,
        A.bad[0] ? h('div', { class: 'hp bad' }, '⚠️ ' + A.bad[0].titre) : null),
      n ? box : null,
      h('span', { class: 'team-go' }, n ? 'Voir l’analyse →' : ''));
    if (n) later(() => ring(box, { games: n, wr: A.all.wr, wins: A.all.w, losses: A.all.l }, 96));
    return card;
  }

  function teamBar(label, x, note) {
    const w = x && x.n ? x.wr : null;
    return h('div', { class: 'twr' + (x && x.n ? '' : ' none') },
      h('div', { class: 'twr-l' }, label, note ? h('span', { class: 'muted small' }, ' ' + note) : null),
      h('div', { class: 'twr-track' }, w == null ? null : h('div', { class: 'twr-fill ' + (w >= 55 ? 'ok' : w >= 45 ? 'mid' : 'bad'), style: `width:${Math.max(3, w)}%` })),
      h('div', { class: 'twr-v' }, w == null ? '—' : `${w} %`, x && x.n ? h('span', { class: 'muted small' }, ` (${x.w}/${x.n})`) : null));
  }

  function renderTeam() {
    const view = $('view');
    const A = teamAnalysis();
    const k = A.k || {};
    const n = A.all.n;
    const since = n ? new Date(A.games[n - 1].t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
    const ringBox = h('div', { class: 'ring' });
    const state = S.teamState === 'loading' ? '⟳ Lecture des nouvelles games sur dpm.lol…' : S.teamState === 'error' ? `⚠ dpm.lol n'a pas répondu (${S.teamErr}) : parties déjà connues affichées` : S.teamAt ? `✓ À jour à ${hm(S.teamAt)}` : '';
    view.replaceChildren(h('header', { class: 'hero' },
      h('div', { class: 'hero-txt' },
        h('div', { class: 'tags' }, tag('👥 Équipe'), tag(modeText(S.teamQ)), tag('au moins 2 joueurs de FIRE')),
        h('h1', { class: 'title' }, `Stats de l’équipe · ${modeText(S.teamQ)}`),
        h('div', { class: 'chips team-modes' }, TEAM_MODES.map(([q, l]) => h('button', { class: 'chip', 'aria-pressed': String(S.teamQ === q), onclick: () => { S.teamQ = q; render(); } }, l))),
        h('p', { class: 'muted small' }, n ? `${pl(n, 'game', 'games')} (${modeText(S.teamQ)}) jouées ensemble depuis le ${since} · ${state}` : state),
        n ? h('p', { class: 'lead' }, A.plan[0] || '') : h('p', { class: 'lead' }, `Aucune game (${modeText(S.teamQ)}) jouée à 2 ou plus n’a encore été trouvée dans l’historique des joueurs. Elles apparaîtront ici dès la prochaine mise à jour.`)),
      n ? ringBox : null));
    if (!n) return;
    later(() => ring(ringBox, { games: n, wr: A.all.wr, wins: A.all.w, losses: A.all.l }, 170));

    const tabs = [['bilan', '🧭 Bilan et stratégie'], ['chiffres', '📊 Ce qui décide vos games'], ['joueurs', '🤝 Qui joue avec qui'], ['games', '📜 Les games']];
    view.append(h('nav', { class: 'tabs' }, tabs.map(([id, l]) => h('button', { class: 'tab', 'aria-selected': String(S.teamTab === id), onclick: () => { S.teamTab = id; render(); } }, l))));
    const page = h('section', { class: 'page' });
    view.append(page);

    if (S.teamTab === 'bilan') {
      if (A.plan.length) page.append(h('div', { class: 'card team-plan' }, h('h2', null, '🧭 Plan de jeu conseillé'), h('ul', { class: 'checks' }, A.plan.map((x) => h('li', null, x)))));
      page.append(h('h2', { class: 'team-h' }, '❌ Mauvaises actions d’équipe, et quoi faire'));
      if (!A.bad.length) page.append(h('p', { class: 'muted' }, 'Rien d’alarmant sur ces games. 👍'));
      page.append(h('div', { class: 'team-list' }, A.bad.map((b) => h('div', { class: 'card team-act tbad' },
        h('div', { class: 'ta-t' }, b.titre), h('p', { class: 'muted' }, b.detail),
        h('div', { class: 'ta-strat' }, h('div', { class: 'ta-k' }, '🎯 La stratégie à prendre'), h('ul', null, b.strat.map((x) => h('li', null, x))))))));
      page.append(h('h2', { class: 'team-h' }, '✅ Bonnes actions d’équipe'));
      if (!A.good.length) page.append(h('p', { class: 'muted' }, 'Pas encore assez de games pour en tirer une conclusion.'));
      page.append(h('div', { class: 'team-list' }, A.good.map((b) => h('div', { class: 'card team-act tgood' },
        h('div', { class: 'ta-t' }, b.titre), h('p', { class: 'muted' }, b.detail), h('div', { class: 'ta-keep' }, '👉 ' + b.garder)))));
      if (A.forts.length) {
        page.append(h('h2', { class: 'team-h' }, '💪 Vos points forts'));
        page.append(h('div', { class: 'team-forts' }, A.forts.map((f) => h('div', { class: 'card team-fort' }, h('div', { class: 'tf-ico' }, f.ico), h('div', null, h('div', { class: 'ta-t' }, f.titre), h('p', { class: 'muted small' }, f.detail))))));
      }
      page.append(h('p', { class: 'muted small' }, `Analyse calculée sur ${pl(n, 'game', 'games')} (${modeText(S.teamQ)}). Une conclusion demande au moins 3 à 4 games ; plus vous jouez ensemble, plus elle est fiable.`));
    } else if (S.teamTab === 'chiffres') {
      const vs = (ico, label, a, b, unit, better) => {
        const good = better === 'up' ? a >= b : a <= b;
        return h('div', { class: 'card tile' }, h('div', { class: 'tile-h' }, `${ico} ${label}`),
          h('div', { class: 'num' }, `${fr(a, 1)}${unit || ''}`, h('span', { class: 'vs' }, ` vs ${fr(b, 1)}`)),
          h('p', { class: 'small ' + (good ? 'ok-t' : 'bad-t') }, good ? '✓ mieux que l’adversaire' : '✗ moins bien que l’adversaire'));
      };
      page.append(h('div', { class: 'tiles' },
        h('div', { class: 'card tile' }, h('div', { class: 'tile-h' }, '⏱️ Golds à 15 min'), h('div', { class: 'num' }, sg(Math.round(k.gd15))), h('p', { class: 'muted small' }, 'Avance (+) ou retard (−) de toute l’équipe, en moyenne.')),
        vs('🐉', 'Dragons par game', k.dragUs, k.dragThem, '', 'up'),
        vs('🪱', 'Larves par game', k.grubsUs, k.grubsThem, '', 'up'),
        vs('👾', 'Barons par game', k.baronUs, k.baronThem, '', 'up'),
        vs('🏰', 'Tours par game', k.towersUs, k.towersThem, '', 'up'),
        vs('🔦', 'Vision par minute', k.visUs, k.visThem, '', 'up'),
        vs('👁️', 'Pinks par game', k.cw, k.cwThem, '', 'up'),
        h('div', { class: 'card tile' }, h('div', { class: 'tile-h' }, '💀 Morts par game'), h('div', { class: 'num' }, fr(k.deaths, 0)), h('p', { class: 'muted small' }, `${fr(k.deathsW, 0)} dans les victoires, ${fr(k.deathsL, 0)} dans les défaites.`)),
        h('div', { class: 'card tile' }, h('div', { class: 'tile-h' }, '🩸 Premier sang'), h('div', { class: 'num' }, `${k.fb} %`), h('p', { class: 'muted small' }, 'Part des games où le premier kill est pour vous.'))));
      const S2 = A.S;
      page.append(h('div', { class: 'card' }, h('h2', null, 'Votre winrate selon ce qui se passe'),
        h('p', { class: 'muted small' }, 'Plus l’écart entre deux lignes est grand, plus cet élément décide vos games.'),
        h('div', { class: 'twrs' },
          h('div', { class: 'wr-g' }, '🐉 Dragons'), teamBar('Vous en prenez plus', S2.moreDrag), teamBar('Ils en prennent plus', S2.lessDrag),
          h('div', { class: 'wr-g' }, '👾 Baron'), teamBar('Vous prenez le Baron', S2.baron), teamBar('Ils prennent le Baron', S2.theirBaron),
          h('div', { class: 'wr-g' }, '🪱 Larves'), teamBar('Vous en prenez plus', S2.moreGrubs), teamBar('Ils en prennent plus', S2.lessGrubs),
          h('div', { class: 'wr-g' }, '⏱️ Golds à 15 min'), teamBar('Devant (+1 000 ou plus)', S2.ahead), teamBar('À peu près égal', S2.even), teamBar('Derrière (−1 000 ou plus)', S2.behind),
          h('div', { class: 'wr-g' }, '🩸 Premier sang'), teamBar('Pour vous', S2.fb), teamBar('Pour eux', S2.noFb),
          h('div', { class: 'wr-g' }, '⌛ Durée'), teamBar('Moins de 25 min', S2.short), teamBar('25 à 32 min', S2.mid), teamBar('Plus de 32 min', S2.long),
          h('div', { class: 'wr-g' }, '📈 En ce moment'), teamBar('Les 10 dernières games', S2.recent))));
    } else if (S.teamTab === 'joueurs') {
      page.append(h('div', { class: 'card' }, h('h2', null, '👥 Selon le nombre de joueurs de FIRE'),
        h('div', { class: 'twrs' }, A.bySize.map((x) => teamBar(`À ${x.size}`, x)))));
      page.append(h('div', { class: 'card' }, h('h2', null, '🤝 Les duos'), h('p', { class: 'muted small' }, 'Winrate quand ces deux joueurs jouent ensemble.'),
        h('div', { class: 'twrs' }, A.pairs.map((x) => teamBar(x.label, x)))));
      page.append(h('div', { class: 'card' }, h('h2', null, '🙋 Chaque joueur en équipe'),
        h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Joueur', 'Games', 'Winrate', 'KDA', 'Morts', 'Participation aux kills', 'Golds à 15 min'].map((x) => h('th', null, x)))),
          h('tbody', null, A.byMember.map((m) => h('tr', null, h('td', null, shortName(m.pseudo)), h('td', null, String(m.n)), h('td', { class: m.wr >= 50 ? 'ok-t' : 'bad-t' }, `${m.wr} %`),
            h('td', null, fr(m.kda, 2)), h('td', null, fr(m.deaths, 1)), h('td', null, `${Math.round(m.kp)} %`), h('td', null, sg(Math.round(m.g15)))))))));
      if (A.subs && A.subs.length) page.append(h('div', { class: 'card' }, h('h2', null, '🧩 Les joueurs qui complètent l’équipe'),
        h('p', { class: 'muted small' }, 'Joueurs hors FIRE vus au moins 2 fois dans votre équipe (souvent le 5e en 5c5).'),
        h('div', { class: 'twrs' }, A.subs.map((x) => teamBar(`${x.name ? shortName(x.name) : 'Joueur inconnu'} · ${x.champs.map(FC.champName).join(', ')}`, x)))));
      if (A.champs.length) page.append(h('div', { class: 'card' }, h('h2', null, '⭐ Champions joués en équipe (2 games ou plus)'),
        h('div', { class: 'twrs' }, A.champs.slice(0, 14).map((x) => teamBar(`${x.who} · ${FC.champName(x.c)}`, x)))));
    } else {
      const tgCard = (g) => {
        const dt = new Date(g.t);
        const m = Math.round(g.dur / 60);
        return h('div', { class: 'card tgame ' + (g.win ? 'w' : 'l') },
          h('div', { class: 'tg-head' }, h('span', { class: 'tg-q q' + g.q }, g.q === 710 ? '🏆 5c5' : '🔁 Flex'), h('span', { class: 'tg-res' }, g.win ? 'Victoire' : 'Défaite'),
            h('span', { class: 'muted small' }, `${dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à ${hm(g.t)} · ${m} min · ${g.size} joueurs de FIRE`)),
          h('div', { class: 'tg-mem' }, g.members.map((x) => h('span', { class: 'tg-p' }, champIcon(champIdFromName(x.c), 26), `${shortName(x.pseudo)} · ${FC.champName(x.c)} `, h('b', null, `${x.k}/${x.d}/${x.a}`)))),
          h('div', { class: 'tg-obj' },
            h('span', null, `⚔️ ${g.us.k}–${g.them.k}`), h('span', null, `🐉 ${g.us.drag}–${g.them.drag}`), h('span', null, `🪱 ${g.us.grubs}–${g.them.grubs}`),
            h('span', null, `👾 ${g.us.baron}–${g.them.baron}`), h('span', null, `🏰 ${g.us.towers}–${g.them.towers}`),
            h('span', { class: g.gd15 >= 0 ? 'ok-t' : 'bad-t' }, `⏱️ ${sg(g.gd15)} à 15 min`), g.us.fb ? h('span', null, '🩸 premier sang') : null));
      };
      // Semaines (lundi → dimanche), puis jours, puis games : tout est dépliable.
      const ymdT = (g) => FC.ymd(new Date(g.t));
      const weeks = weekGroups(A.games, ymdT).reverse();
      const lastW = weeks[0];
      const vd = (gs) => { const w = gs.filter((g) => g.win).length; return vdChip({ wins: w, losses: gs.length - w, games: gs.length, wr: gs.length ? (w / gs.length) * 100 : 0 }); };
      page.append(h('div', { class: 'folds' }, weeks.map((w) => {
        const byD = new Map();
        w.items.slice().sort((a, b) => b.t - a.t).forEach((g) => { const k = ymdT(g); if (!byD.has(k)) byD.set(k, []); byD.get(k).push(g); });
        const dk = [...byD.keys()];
        return fold('tw:' + S.teamQ + ':' + w.n, w === lastW,
          [h('span', { class: 'fold-t' }, weekTitle(w)), h('span', { class: 'muted small' }, `${weekRangeFr(w)} · ${pl(w.items.length, 'game', 'games')}`), vd(w.items)],
          h('div', { class: 'fold-body' }, dk.map((k) => fold('td:' + S.teamQ + ':' + k, w === lastW && k === dk[0],
            [h('span', { class: 'fold-t' }, cap(dayFr(k).replace(/^(\S+) 1 /, '$1 1er '))), h('span', { class: 'muted small' }, pl(byD.get(k).length, 'game', 'games')), vd(byD.get(k))],
            h('div', { class: 'team-games' }, byD.get(k).map(tgCard)), 'fold-day'))), 'fold-week');
      })));
    }
  }

  // ----- Page joueur -----
  function renderPlayer() {
    const p = S.players.find((x) => x.slug === S.player);
    const view = $('view');
    if (!p) { S.view = 'hub'; renderHub(); return; }
    const R = roleOf(p);
    const rep = FC.reperes(p.role_id);
    const d = S.data[p.slug];
    const st = S.status[p.slug];
    if (!d) {
      view.replaceChildren(h('div', { class: 'empty-state' }, st && st.state === 'error' ? `Impossible de lire dpm.lol pour ${p.pseudo} (${st.error}). Réessaie avec « Mettre à jour ».` : `Lecture des stats de ${p.pseudo} sur dpm.lol…`));
      return;
    }
    const rows = FC.toRows(p, d.matches, periodStart(p));
    const s = FC.stats(rows);
    const days = FC.byDay(rows);
    const champs = FC.byChamp(rows);
    const obj = objFor(p, d);
    if (S.jour !== 'tous' && !days.some((x) => x.jour === S.jour)) S.jour = 'tous';

    const ringBox = h('div', { class: 'ring' });
    const pbg = skinBg(p);
    view.replaceChildren(h('header', { class: 'hero' + (pbg ? ' has-skin' : '') }, pbg,
      h('div', { class: 'hero-txt' },
        h('div', { class: 'tags' }, bandeau(p) ? h('span', { class: 'tag tag-cap b-' + bandeau(p).theme }, bandeau(p).texte) : null, tag(`${R.ico} ${p.role || R.label}`), d.rank ? tag(d.rank) : null,
          S.more ? [tag('Classé Solo/Duo'), p.pool ? tag('🎯 ' + p.pool) : null, (p.maitrise_ids || []).length ? tag('⭐ ' + p.maitrise_ids.map(FC.champName).join(' · ')) : null] : null),
        h('h1', { class: 'title' }, p.pseudo),
        h('p', { class: 'muted small' }, S.more ? `${cap(periodLabel(p))} · ${pl(s.games, 'game', 'games')} · stats dpm.lol de ${hm(d.at)} · ${lastGame(d) || 'aucune game Solo/Duo'} · ` : `${cap(periodLabel(p))} · ${pl(s.games, 'game', 'games')} · `,
          h('a', { href: 'https://dpm.lol/' + curAccount(p).slug, target: '_blank' }, 'voir sur dpm.lol')),
        accountsOf(p).length > 1 ? h('p', { class: 'muted small' }, '🔁 ', accountsOf(p).map((c) => c.jusqu_au
          ? h('span', null, 'ancien compte ', h('a', { href: 'https://dpm.lol/' + c.slug, target: '_blank' }, c.pseudo || decodeURIComponent(c.slug)), ` (games jusqu’au ${dateFr(c.jusqu_au)})`)
          : h('span', null, 'compte actuel ', h('a', { href: 'https://dpm.lol/' + c.slug, target: '_blank' }, c.pseudo || decodeURIComponent(c.slug)), c.depuis ? ` (depuis le ${dateFr(c.depuis)})` : '')).reduce((a, x, i) => (i ? a.concat(' · ', x) : [x]), [])) : null,
        S.more ? h('p', { class: 'lead' }, FC.lead(p, s)) : null,
        progress(obj, S.more),
        S.coachState.coach && S.obj && !p.temp ? bonusCtl(p) : null,
        S.more && s.games ? catBar({ oblig: s.oblig, maitrise: s.maitrise_g, autres: s.autres }) : null),
      ringBox));
    later(() => ring(ringBox, s, 170));

    if (s.games && S.more) {
      const sb = h('div', { class: 'streak' });
      view.append(h('div', { class: 'card' }, h('h2', null, 'La série, game après game'),
        h('p', { class: 'muted small' }, "Chaque rond est une game, dans l'ordre. Survole pour voir le détail, clique pour l'ouvrir."), sb));
      later(() => streak(sb, rows));
    }

    const tabs = [['resume', '📊 Résumé'], ['lens', '🌳 Points forts'], ['jours', '📅 Jour par jour'], ['champions', '🧙 Champions'], ['lexique', '📖 Comprendre les stats']];
    view.append(h('nav', { class: 'tabs' }, tabs.map(([id, l]) => h('button', { class: 'tab', 'aria-selected': String(S.tab === id), onclick: () => { S.tab = id; render(); } }, l))));
    const page = h('section', { class: 'page' });
    view.append(page);
    if (S.tab === 'resume') pageResume(page, p, R, rep, rows, s, days, d, obj);
    else if (S.tab === 'lens') pageLens(page, p, rows);
    else if (S.tab === 'jours') pageJours(page, p, R, rows, s, days);
    else if (S.tab === 'champions') pageChamps(page, p, champs, obj);
    else pageLexique(page, p, R, rep);
  }

  // Arbre des points forts : 6-7 domaines notés sur 100 (lens.js), l'arbre à droite, le détail à gauche.
  function pageLens(page, p, rows) {
    if (!window.FireLens) return;
    if (rows.length < 3) { page.append(h('div', { class: 'card empty-state' }, 'Il faut au moins 3 games sur la période pour dessiner l’arbre des points forts.')); return; }
    const A = FireLens.analyse(rows, p.role_id);
    const ring = (score, color) => {
      const r = 18, c = 2 * Math.PI * r, off = c * (1 - (score || 0) / 100);
      const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sv.setAttribute('viewBox', '0 0 44 44'); sv.setAttribute('class', 'lens-ring');
      sv.innerHTML = `<circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--panel2)" stroke-width="5"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 22 22)"/><text x="22" y="23" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="var(--fg)">${score}</text>`;
      return sv;
    };
    S.lensOpen = S.lensOpen || {};
    const cards = h('div', { class: 'lens-cards' }, A.domains.map((d) => {
      const open = !!S.lensOpen[d.id];
      return h('div', { class: 'lens-card' + (A.weakest === d.id ? ' weak' : '') + (A.best === d.id ? ' best' : ''), style: `--lc:${d.color}` },
        h('button', { class: 'lens-head', onclick: () => { S.lensOpen[d.id] = !open; render(); } },
          h('span', { class: 'lens-ico' }, d.ico), h('b', null, d.label),
          A.weakest === d.id ? h('span', { class: 'lens-tag weak' }, 'À travailler') : A.best === d.id ? h('span', { class: 'lens-tag best' }, 'Point fort') : null,
          ring(d.score, d.color)),
        open ? h('div', { class: 'lens-stats' }, d.stats.map((x) => h('div', { class: 'lens-stat' },
          h('span', null, x.label), h('b', null, FireLens.fmt(x.k, x.val)),
          h('span', { class: 'lens-bar' }, h('i', { style: `width:${x.score == null ? 0 : x.score}%;background:${x.score >= 60 ? 'var(--ok)' : x.score < 40 ? 'var(--bad)' : 'var(--warn)'}` }))))) : null);
    }));
    const weak = A.domains.find((d) => d.id === A.weakest), best = A.domains.find((d) => d.id === A.best);
    page.append(h('div', { class: 'card lens' },
      h('div', { class: 'lens-top' }, h('div', null, h('h2', null, '🌳 Arbre des points forts'),
        h('p', { class: 'muted small' }, `Sur ${A.games} games, comparé à un joueur ${roleOf(p).label} de niveau Émeraude : 50 = au niveau, plus = mieux. Clique sur un domaine pour voir le détail, survole l’arbre pour les valeurs.`)),
        best && weak ? h('p', { class: 'lens-sum' }, h('span', { class: 'lens-tag best' }, best.label), ' est son point fort · ', h('span', { class: 'lens-tag weak' }, weak.label), ' est à travailler') : null),
      h('div', { class: 'lens-body' }, cards, h('div', { class: 'lens-tree' }, FireLens.tree(A)))));
  }

  function pageResume(page, p, R, rep, rows, s, days, d, obj) {
    const sup = p.role_id === 'support';
    const tiles = [
      ['🏆', 'Win rate', s.wr == null ? '—' : fr(s.wr, 1) + ' %', rep.wr, s.wr, 'Part des games gagnées.'],
      ['⚔️', 'KDA', fr(s.kda, 2), rep.kda, s.kda, `(Kills + assists) ÷ morts. Total : ${s.kills} / ${s.morts} / ${s.assists}.`],
      ['💀', 'Morts par game', fr(s.morts_moy, 1), rep.morts_moy, s.morts_moy, "Moins il meurt, mieux c'est."],
      sup ? ['🔦', 'Vision par game', fr(s.vision, 1), rep.vision, s.vision, "Score de vision moyen : ce qu'il éclaire et dénie sur la carte."]
        : ['🌾', 'CS par minute', fr(s.cs_min, 1), rep.cs_min, s.cs_min, `Sa vitesse de farm.${s.cs10 != null ? ` ${fr(s.cs10, 1)} ${p.role_id === 'jungle' ? 'CS de jungle' : 'CS'} avant 10 min en moyenne.` : ''}`],
      ['⏱️', 'Golds à 15 min', sg(s.gold15), rep.gold15, s.gold15, `Avance (+) ou retard (−) ${R.sur} à 15 min. En retard dans ${s.gold15_neg} ${s.gold15_neg > 1 ? 'games' : 'game'} sur ${s.games}.`],
      ['👁️', 'Pinks par game', fr(s.pinks_moy, 1), rep.pinks_moy, s.pinks_moy, `Balises de contrôle posées. ${s.pinks} au total.`]
    ];
    const shown = S.more ? tiles : tiles.slice(0, 4);
    page.append(h('div', { class: 'tiles' + (S.more ? '' : ' compact') }, shown.map(([ico, label, val, r, v, expl]) => {
      const m = h('div', { class: 'meter' });
      if (r && v != null) later(() => meter(m, v, r));
      return h('div', { class: 'card tile', title: expl }, h('div', { class: 'tile-h' }, `${ico} ${label}`), h('div', { class: 'num' }, val), m, S.more ? h('p', { class: 'muted small' }, expl) : null);
    })));

    const ins = FC.insights(p, rows, s, d.champs, obj);
    // Compact : titres seulement, un clic ouvre le détail d'une carte.
    const acard = (x) => {
      const key = x.kind + '|' + x.title;
      const open = S.more || S.openCard === key;
      return h('div', { class: 'acard k-' + x.kind + (S.more ? '' : ' click'), onclick: S.more ? null : () => { S.openCard = open ? null : key; render(); } },
        h('div', { class: 'acard-ico' }, x.ico),
        h('div', { class: 'acard-body' }, h('div', { class: 'acard-t' }, x.title, x.chip ? h('span', { class: 'acard-chip' }, x.chip) : null), open ? h('p', null, x.text) : null));
    };
    const lim = (list) => (S.more ? list : list.slice(0, 3));
    const col = (title, cls, list) => h('div', { class: 'acol ' + cls }, h('h3', null, title, h('span', { class: 'acount' }, list.length)), list.length ? lim(list).map(acard) : h('p', { class: 'muted small' }, 'Rien à signaler.'));
    page.append(h('div', { class: 'card' },
      h('h2', null, '🎯 Le bilan en un coup d\'œil'),
      h('p', { class: 'muted small' }, S.more ? 'Calculé automatiquement à partir des chiffres de la période, à confirmer au replay.' : 'Clique sur une carte pour voir le détail.'),
      h('div', { class: 'acols' },
        col('💪 Points forts', 'good', ins.filter((x) => x.kind === 'plus')),
        col('⚠️ À travailler', 'bad', ins.filter((x) => x.kind === 'warn'))),
      S.more && ins.some((x) => x.kind === 'info') ? h('div', { class: 'ainfo' }, ins.filter((x) => x.kind === 'info').map(acard)) : null));

    page.append(h('div', { class: 'more-row' }, h('button', { class: 'btn-ghost more-btn', onclick: () => { S.more = !S.more; render(); } }, S.more ? '➖ Moins de détails' : '➕ Plus de détails')));
    if (days.length && S.more) {
      const c = h('div', { class: 'chart' });
      page.append(h('div', { class: 'card' }, h('h2', null, 'Victoires et défaites par jour'), h('p', { class: 'muted small' }, 'Clique sur une barre pour voir les games du jour.'), c));
      later(() => dayChart(c, days));
    }
  }

  // Semaines du lundi au dimanche. La semaine 1 commence au début de l'équipe (même un mardi) et finit le dimanche suivant.
  function weekGroups(items, ymdOf) {
    const firstDay = items.reduce((m, x) => (!m || ymdOf(x) < m ? ymdOf(x) : m), null);
    const anchor = S.debut || firstDay;
    if (!anchor) return [];
    const mon0 = mondayOf(anchor);
    const map = new Map();
    items.forEach((x) => {
      const d = ymdOf(x);
      // Les games jouées avant le début de l'équipe sont regroupées à part (« Avant la semaine 1 »).
      if (d < anchor) {
        if (!map.has(0)) map.set(0, { n: 0, start: d, end: addDays(anchor, -1), items: [] });
        const z = map.get(0); if (d < z.start) z.start = d; z.items.push(x); return;
      }
      const n = Math.floor(Math.round((dOf(mondayOf(d)) - dOf(mon0)) / 86400000) / 7) + 1;
      if (!map.has(n)) {
        const mon = addDays(mon0, (n - 1) * 7);
        map.set(n, { n, start: n === 1 && anchor > mon ? anchor : mon, end: addDays(mon, 6), items: [] });
      }
      map.get(n).items.push(x);
    });
    return [...map.values()].sort((a, b) => a.n - b.n);
  }
  const weekTitle = (w) => (w.n ? `Semaine ${w.n}` : 'Avant la semaine 1');
  const weekRangeFr = (w) => `du ${dayFr(w.start, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\S+) 1 /, '$1 1er ')} au ${dayFr(w.end, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\S+) 1 /, '$1 1er ')}`;
  // Garde ouverts les blocs dépliés (semaines, jours) quand la page se redessine.
  S.openFold = S.openFold || {};
  function fold(key, defOpen, summary, body, cls) {
    const open = key in S.openFold ? S.openFold[key] : defOpen;
    const el = h('details', { class: 'fold ' + (cls || ''), open: open ? true : null }, h('summary', null, summary), body);
    el.addEventListener('toggle', () => { S.openFold[key] = el.open; });
    return el;
  }
  const vdChip = (st) => h('span', { class: 'fold-vd' }, h('b', { class: 'good' }, `${st.wins} V`), ' – ', h('b', { class: 'bad' }, `${st.losses} D`), st.games ? h('span', { class: 'muted' }, ` · ${fr(st.wr, 0)} %`) : null);

  function pageJours(page, p, R, rows, s, days) {
    days = days.slice().sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));
    if (!rows.length) { page.append(h('div', { class: 'empty-state' }, 'Aucune game classée Solo/Duo sur cette période.')); return; }
    const item = (lab, v) => h('div', { class: 'it' }, h('span', { class: 'lab' }, lab), h('span', { class: 'v' }, v));
    page.append(h('div', { class: 'card' }, h('div', { class: 'banner' },
      h('div', { class: 'it' }, h('span', { class: 'lab' }, 'Période'), h('span', { class: 'big' }, cap(periodLabel(p)))),
      item('Victoires', fr(s.wins)), item('Défaites', fr(s.losses)), item('Win rate', fr(s.wr, 1) + ' %'),
      item('KDA', fr(s.kda, 2)), item('Morts / game', fr(s.morts_moy, 1)), item('Golds @15', sg(s.gold15)))));
    page.append(h('p', { class: 'muted small' }, 'Clique sur une semaine pour voir ses jours, puis sur un jour pour voir ses games. Bordure verte : victoire, rouge : défaite. Les flèches comparent chaque game à sa moyenne sur la période.'));

    // La semaine en cours en haut, la semaine 1 en bas ; dans une semaine, le jour le plus récent en premier.
    const weeks = weekGroups(days, (d) => d.jour).reverse();
    const lastW = weeks[0];
    const list = h('div', { class: 'folds' });
    weeks.forEach((w) => {
      const wst = FC.stats(w.items.flatMap((d) => d.rows));
      const wd = w.items.slice().reverse();
      const lastD = wd[0];
      const body = h('div', { class: 'fold-body' }, wd.map((d) => fold('j:' + p.slug + ':' + d.jour, w === lastW && d === lastD,
        [h('span', { class: 'fold-t' }, d.label), h('span', { class: 'muted small' }, pl(d.games, 'game', 'games')), vdChip(d)],
        h('div', { class: 'matches' }, d.rows.slice().sort((a, b) => b.t - a.t).map((g) => matchCard(p, R, g, s))), 'fold-day')));
      list.append(fold('w:' + p.slug + ':' + w.n, w === lastW,
        [h('span', { class: 'fold-t' }, weekTitle(w)), h('span', { class: 'muted small' }, `${weekRangeFr(w)} · ${pl(wst.games, 'game', 'games')}`), vdChip(wst)],
        body, 'fold-week'));
    });
    page.append(list);

    page.append(h('div', { class: 'card' }, h('h2', null, 'Tableau récapitulatif par semaine'), h('p', { class: 'muted small' }, 'Moyennes par game.'),
      h('div', { class: 'scroll' }, h('table', { class: 't' },
        h('thead', null, h('tr', null, h('th', { class: 'l' }, 'Semaine'), ['Games', 'V', 'D', 'Win rate %', 'KDA', 'Morts', p.role_id === 'support' ? 'Vision' : 'CS/min', 'Golds @15', 'Dégâts/min', 'Pinks'].map((x) => h('th', null, x)))),
        h('tbody', null, weeks.map((w) => {
          const d = FC.stats(w.items.flatMap((x) => x.rows));
          return h('tr', { class: 'click', onclick: () => { S.openFold['w:' + p.slug + ':' + w.n] = true; render(); } },
            h('td', { class: 'l' }, h('b', null, weekTitle(w)), h('div', { class: 'muted small' }, weekRangeFr(w))), h('td', null, d.games), h('td', null, d.wins), h('td', null, d.losses),
            h('td', { class: d.wr >= 50 ? 'good' : 'bad' }, fr(d.wr, 1)), h('td', null, fr(d.kda, 2)), h('td', null, fr(d.morts_moy, 1)),
            h('td', null, p.role_id === 'support' ? fr(d.vision, 1) : fr(d.cs_min, 1)),
            h('td', { class: d.gold15 > 0 ? 'good' : d.gold15 < 0 ? 'bad' : '' }, sg(d.gold15)), h('td', null, fr(d.degats_min)), h('td', null, d.pinks));
        }))))));
  }

  function matchCard(p, R, g, s) {
    const sup = p.role_id === 'support';
    const stat = (label, v, avg, fmt) => {
      const diff = v == null || avg == null ? null : v - avg;
      return h('div', { class: 'ms' }, h('span', { class: 'lab' }, label), h('span', { class: 'v' }, fmt(v)),
        diff == null ? null : h('span', { class: 'cmp ' + (diff >= 0 ? 'good' : 'bad') }, `${diff >= 0 ? '▲' : '▼'} moyenne ${fmt(avg)}`));
    };
    const f1 = (x) => fr(x, 1), f0 = (x) => fr(x), s0 = (x) => sg(x);
    const dl = [['KP', g.kp == null ? '—' : fr(g.kp, 1) + ' %'], ['CS', fr(g.cs)], [g.lane === 'Jungle' ? 'CS jungle avant 10 min' : 'CS avant 10 min', fr(g.cs10, 1)],
      ['Gold/min', fr(g.gold_min)], ['% dégâts équipe', g.part_degats == null ? '—' : fr(g.part_degats, 1) + ' %'], ['Pinks', g.pinks], ['Wards', g.wards], ['Wards détruites', g.wards_detruites],
      ['CS @15', sg(g.cs15)], ['XP @15', sg(g.xp15)],
      ...(g.lane === 'Jungle' ? [['Crabes', fr(g.crabes)]] : [['Solo kills', fr(g.solo_kills)], ['Plates', fr(g.plates)]]),
      ['Drakes', fr(g.drakes)], ['Larves', fr(g.larves)], ['Score DPM', fr(g.score, 1)], ['Game', g.id]];
    const b = FC.badges(p, g);
    return h('article', { class: 'match ' + (g.win ? 'win' : 'loss'), id: 'match-' + g.id },
      h('div', { class: 'mhead' }, h('span', { class: 'mchamp' }, champIcon(champIdFromName(g.champ_id), 44), h('span', { class: 'champ' }, g.champion)), h('span', { class: 'pill ' + (g.win ? 'good' : 'bad') }, g.win ? 'Victoire' : 'Défaite')),
      h('div', null, h('span', { class: 'catpill c-' + g.cat }, g.cat === 'oblig' ? (g.maitrise ? '🎯⭐ Obligatoire et maîtrisé' : '🎯 Obligatoire') : g.cat === 'maitrise' ? '⭐ Maîtrisé' : g.cat === 'travail' ? '🛠️ À travailler' : '❔ Hors pool')),
      h('div', { class: 'muted small mvs' }, 'contre ', g.adv_id ? champIcon(champIdFromName(g.adv_id), 22) : null, ` ${g.adversaire} · ${g.heure} · ${g.duree}${g.lane && g.lane !== R.lane ? ' · en ' + g.lane : ''}`),
      h('div', { class: 'kda' }, h('span', { class: 'k' }, `${g.kills} / ${g.morts} / ${g.assists}`), h('span', { class: 'muted small' }, `KDA ${fr(g.kda, 2)}`)),
      h('div', { class: 'mstats' },
        sup ? stat('KP %', g.kp, s.kp, f1) : stat('CS/min', g.cs_min, s.cs_min, f1),
        stat('Golds @15', g.gold15, s.gold15, s0), stat('Dégâts/min', g.degats_min, s.degats_min, f0), stat('Vision', g.vision, s.vision, f1)),
      b.length ? h('div', { class: 'badges' }, b.map((x) => h('span', { class: 'bdg' }, x))) : null,
      h('details', null, h('summary', null, 'Toutes les stats'), h('dl', { class: 'dl' }, dl.map(([k, v]) => [h('dt', null, k), h('dd', null, v)]))));
  }

  function openGame(g) {
    S.tab = 'jours'; S.jour = g.jour;
    const p = S.players.find((x) => x.slug === S.player);
    if (p) {
      const days = FC.byDay(FC.toRows(p, (S.data[p.slug] || {}).matches || [], periodStart(p)));
      const w = weekGroups(days, (d) => d.jour).find((x) => x.items.some((d) => d.jour === g.jour));
      if (w) S.openFold['w:' + p.slug + ':' + w.n] = true;
      S.openFold['j:' + p.slug + ':' + g.jour] = true;
    }
    render();
    setTimeout(() => {
      const card = document.getElementById('match-' + g.id);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 1600);
    }, 80);
  }

  function pageChamps(page, p, champs, obj) {
    if (obj && obj.target) {
      const chart = h('div', { class: 'chart', style: 'min-height:0' });
      page.append(h('div', { class: 'card' },
        h('h2', null, `🎯 Objectif de la semaine : ${obj.target} games sur les champions obligatoires`),
        h('p', { class: 'muted small' }, `Compté en Solo/Duo du ${dateFr(obj.debut)} au ${dateFr(S.obj && S.obj.fin ? S.obj.fin : obj.debut)} (chaque semaine, du lundi au dimanche, le compteur repart à zéro), uniquement sur les champions 🎯 obligatoires${p.pool ? ' (' + p.pool + ')' : ''}, répartis comme il veut. Les champions ⭐ maîtrisés et les autres ne comptent pas.`),
        progress(obj, true),
        h('p', { class: 'small' }, `${obj.wins} V – ${obj.losses} D sur ces games obligatoires${obj.wr != null ? ` (${fr(obj.wr, 1)} %)` : ''}. ${obj.hors_pool ? `${pl(obj.hors_pool, 'game', 'games')} sur des champions non obligatoires (⭐ maîtrisés ou ❔ autres), non comptée${obj.hors_pool > 1 ? 's' : ''}.` : 'Toutes ses games sont sur ses champions obligatoires.'}`),
        chart,
        h('div', { class: 'scroll' }, h('table', { class: 't' },
          h('thead', null, h('tr', null, h('th', { class: 'l' }, 'Champion obligatoire'), ['Games', 'V', 'D', 'Win rate %', 'KDA', 'Morts', p.role_id === 'support' ? 'Vision' : 'CS/min', 'Golds @15'].map((x) => h('th', null, x)))),
          h('tbody', null, obj.per.map((c) => h('tr', null, h('td', { class: 'l' }, c.champion), h('td', null, c.games), h('td', null, c.wins), h('td', null, c.losses),
            h('td', { class: c.wr == null ? '' : c.wr >= 50 ? 'good' : 'bad' }, fr(c.wr, 1)), h('td', null, fr(c.kda, 2)), h('td', null, fr(c.morts_moy, 1)),
            h('td', null, p.role_id === 'support' ? fr(c.vision, 1) : fr(c.cs_min, 1)), h('td', { class: c.gold15 > 0 ? 'good' : c.gold15 < 0 ? 'bad' : '' }, sg(c.gold15)))))))));
      later(() => objChart(chart, obj));
    }
    const grid = h('div', { class: 'champs-groups' });
    const groups = [['oblig', '🎯 Obligatoires', 'comptent pour l\'objectif'], ['maitrise', '⭐ Maîtrisés', 'ses champions sûrs'], ['travail', '🛠️ À travailler', 'en apprentissage'], ['autre', '❔ Autres champions', 'hors de son pool']];
    for (const [cat, title, sub] of groups) {
      const list = champs.filter((c) => c.cat === cat);
      if (!list.length) continue;
      const g = h('div', { class: 'champs' });
      grid.append(h('div', { class: 'cgroup cat-' + cat }, h('h3', null, title, h('span', { class: 'muted small' }, ` · ${sub} · ${list.reduce((a, c) => a + c.games, 0)} games`)), g));
      list.forEach((c) => {
      const box = h('div');
      g.append(h('div', { class: 'card cc cat-' + cat }, box, h('div', null, h('div', { class: 'n' }, c.champion), h('div', { class: 'm' },
        h('span', null, c.cat === 'oblig' ? (c.maitrise ? '🎯⭐ Obligatoire et maîtrisé' : '🎯 Obligatoire') : c.cat === 'maitrise' ? '⭐ Maîtrisé' : c.cat === 'travail' ? '🛠️ À travailler' : '❔ Hors pool'),
        h('span', null, `${pl(c.games, 'game', 'games')} · ${c.wins} V – ${c.losses} D`),
        h('span', null, `KDA ${fr(c.kda, 2)} · ${fr(c.morts_moy, 1)} morts/game`),
        h('span', null, p.role_id === 'support' ? `Vision ${fr(c.vision, 1)} · golds @15 ${sg(c.gold15)}` : `${fr(c.cs_min, 1)} CS/min · golds @15 ${sg(c.gold15)}`)))));
      later(() => ring(box, c, 84));
      });
    }
    page.append(h('div', { class: 'card' }, h('h2', null, `Tous ses champions ${periodLabel(p)}`), h('p', { class: 'muted small' }, 'Le cercle montre le win rate. Moyennes par game. Classés en 🎯 obligatoires, ⭐ maîtrisés et ❔ autres.'),
      champs.length ? grid : h('p', { class: 'muted' }, 'Aucune game sur la période.')));
  }

  function pageLexique(page, p, R, rep) {
    const sup = p.role_id === 'support', jg = p.role_id === 'jungle';
    const items = [
      ['🏆 Win rate', `La part des games gagnées. Repère : ${repText(rep.wr)}.`],
      ['⚔️ KDA', `Kills + assists, divisé par le nombre de morts. Plus c'est haut, plus il est utile sans mourir. Repère : ${repText(rep.kda)}.`],
      ['💀 Morts par game', `Combien de fois il meurt en moyenne. Chaque mort donne des golds à l'adversaire et le sort de la carte. Repère : ${repText(rep.morts_moy)}.`],
      ['🌾 CS et CS/min', sup ? "Les monstres et sbires tués (« creep score »). Pour un support, le farm compte peu : il laisse les sbires à son ADC." : `Les monstres et sbires tués (« creep score »). Par minute, ça mesure la vitesse de farm. Repère : ${repText(rep.cs_min)}.`],
      [jg ? '🌲 CS jungle avant 10 min' : '🌾 CS avant 10 min', jg ? 'Les monstres de jungle tués pendant les 10 premières minutes : la qualité de ses premiers tours de jungle.' : 'Les sbires tués pendant les 10 premières minutes : la qualité de sa phase de lane.'],
      ['⏱️ Golds / CS / XP @15', `L'écart ${R.sur.replace(/^sur /, 'avec ')} à 15 minutes. Positif : il est devant. Négatif : il est derrière. Repère pour les golds : ${repText(rep.gold15)}.`],
      ['🤝 KP (kill participation)', 'La part des kills de son équipe auxquels il a participé (kill ou assist).'],
      ['💥 Dégâts/min et % dégâts', "Les dégâts infligés aux champions adverses par minute, et sa part des dégâts de toute l'équipe."],
      ['👁️ Vision, wards et pinks', `Le score de vision mesure ce qu'il a éclairé et déniché sur la carte. Les wards sont les balises gratuites, les pinks (balises de contrôle) coûtent des golds et révèlent les wards adverses.${rep.vision ? ` Repère vision : ${repText(rep.vision)} par game.` : ''} Repère pinks : ${repText(rep.pinks_moy)} par game.`],
      jg ? ['🦀 Crabes, drakes, larves', 'Les objectifs neutres pris : crabes de la rivière, dragons et larves du Néant.'] : ['⚔️ Solo kills et plates', 'Les solo kills sont les kills faits seul contre un adversaire. Les plates sont les plaques de tourelle arrachées avant 14 minutes, qui rapportent des golds.'],
      ['⭐ Score DPM', 'La note de performance calculée par dpm.lol pour chaque game (plus c\'est haut, mieux c\'est).'],
      ['🎯 Obligatoires', `Les champions de la première ligne de sa tierlist : ce sont eux qui comptent pour l'objectif de la semaine${p.pool ? ' (' + p.pool + ')' : ''}.`],
      ['⭐ Maîtrisés', `Les champions qu'il maîtrise (deuxième ligne de sa tierlist)${(p.maitrise_ids || []).length ? ' : ' + p.maitrise_ids.map(FC.champName).join(' · ') : ''}. Un champion peut être à la fois obligatoire et maîtrisé.`],
      ['❔ Autres', 'Les champions joués qui ne sont ni obligatoires ni maîtrisés.']
    ];
    page.append(h('p', { class: 'muted small' }, 'Les mots de FIRE LoL, expliqués simplement. Les repères sont indicatifs (choisis pour FIRE LoL), pas des règles officielles.'),
      h('dl', { class: 'lex' }, items.map(([t, d]) => h('div', null, h('dt', null, t), h('dd', null, d)))));
  }

  // ---------- Graphiques (d3) ----------
  function ring(el, s, size) {
    el.replaceChildren();
    const R0 = size / 2 - 3, w = Math.max(8, size / 12), big = size > 120;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${size} ${size}`).attr('width', size).attr('height', size);
    const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);
    const arc = d3.arc().innerRadius(R0 - w).outerRadius(R0).cornerRadius(w / 2);
    g.append('path').attr('d', arc({ startAngle: 0, endAngle: 2 * Math.PI })).attr('class', 'ring-bg');
    if (s.games) g.append('path').attr('d', arc({ startAngle: 0, endAngle: 2 * Math.PI * Math.max(0.002, s.wr / 100) })).attr('class', s.wr >= 50 ? 'ring-ok' : 'ring-bad');
    g.append('text').attr('text-anchor', 'middle').attr('dy', big ? '0.1em' : '0.35em').attr('class', big ? 'ring-big' : 'ring-mid').text(s.games ? `${fr(s.wr, big ? 1 : 0)} %` : '—');
    if (big) g.append('text').attr('text-anchor', 'middle').attr('dy', '1.9em').attr('class', 'ring-sub').text(s.games ? `${s.wins} V – ${s.losses} D` : 'aucune game');
  }

  function meter(el, v, r) {
    el.replaceChildren();
    const ok = r.dir === 'up' ? v >= r.v : v <= r.v;
    const W = Math.max(150, el.clientWidth), H = 30;
    const x = d3.scaleLinear([r.min, r.max], [2, W - 2]).clamp(true);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).style('display', 'block');
    svg.append('rect').attr('x', 2).attr('y', 4).attr('width', W - 4).attr('height', 8).attr('rx', 4).style('fill', 'var(--line)');
    const x0 = r.min < 0 ? x(0) : x(r.min);
    svg.append('rect').attr('x', Math.min(x0, x(v))).attr('y', 4).attr('width', Math.max(3, Math.abs(x(v) - x0))).attr('height', 8).attr('rx', 4).style('fill', ok ? 'var(--ok)' : 'var(--bad)');
    svg.append('line').attr('x1', x(r.v)).attr('x2', x(r.v)).attr('y1', 0).attr('y2', 16).style('stroke', 'var(--fg)').attr('stroke-width', 2);
    const t = svg.append('text').attr('y', H - 2).text(`${ok ? '✓' : '✗'} repère ${repText(r)}`);
    const tw = t.node().getComputedTextLength();
    t.attr('x', Math.max(2, Math.min(W - tw - 2, x(r.v) - tw / 2)));
  }

  function streak(el, rows) {
    el.replaceChildren();
    const W = Math.max(300, el.clientWidth), H = 64;
    const days = [...new Set(rows.map((r) => r.jour))];
    const gap = 18;
    const step = Math.max(12, Math.min(30, (W - 8 - gap * (days.length - 1)) / rows.length));
    const rad = Math.min(11, step / 2 - 1.5);
    const totalW = Math.max(W, 8 + step * rows.length + gap * (days.length - 1));
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${totalW} ${H}`).style('display', 'block');
    let x = 4 + step / 2, prev = null, startX = x;
    const lab = (j, x0, x1) => svg.append('text').attr('x', (x0 + x1) / 2).attr('y', H - 6).attr('text-anchor', 'middle').style('fill', 'var(--muted)').style('font-size', '12px').text(`${j.slice(8, 10)}/${j.slice(5, 7)}`);
    rows.forEach((r, i) => {
      if (prev !== null && r.jour !== prev) { lab(prev, startX, x - step); x += gap; startX = x; }
      const c = svg.append('g').style('cursor', 'pointer')
        .on('mousemove', (ev) => showTip(ev, `${r.jour_label} · ${r.heure}`, `${r.champion} contre ${r.adversaire} · ${r.win ? 'Victoire' : 'Défaite'} · ${r.kills}/${r.morts}/${r.assists}`))
        .on('mouseleave', hideTip)
        .on('click', () => { hideTip(); openGame(r); });
      c.append('circle').attr('cx', x).attr('cy', 22).attr('r', rad).style('fill', r.win ? 'var(--ok)' : 'var(--bad)');
      if (rad >= 8) c.append('text').attr('x', x).attr('y', 22).attr('dy', '0.35em').attr('text-anchor', 'middle').style('fill', 'var(--bg)').style('font-size', '11px').style('font-weight', '700').text(r.win ? 'V' : 'D');
      prev = r.jour;
      if (i === rows.length - 1) lab(prev, startX, x);
      x += step;
    });
  }

  function dayChart(el, days) {
    el.replaceChildren();
    const W = Math.max(300, el.clientWidth), H = 240, mt = 40, mb = 28, mr = 8;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).style('display', 'block');
    const maxG = d3.max(days, (d) => d.games) || 1;
    const y = d3.scaleLinear([0, maxG], [H - mb, mt]).nice();
    const ticks = y.ticks(Math.min(5, maxG)).filter((t) => Number.isInteger(t));
    const probe = svg.append('text');
    let ml = 0;
    ticks.forEach((t) => { probe.text(String(t)); ml = Math.max(ml, probe.node().getComputedTextLength()); });
    probe.remove();
    ml += 12;
    const x = d3.scaleBand(days.map((d) => d.jour), [ml, W - mr]).padding(0.35);
    ticks.forEach((t) => {
      svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', t === 0 ? 'var(--muted)' : 'var(--line)');
      svg.append('text').attr('x', ml - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').text(t);
    });
    const bw = Math.min(36, x.bandwidth());
    days.forEach((d) => {
      const x0 = x(d.jour) + (x.bandwidth() - bw) / 2;
      const grp = svg.append('g').style('cursor', 'pointer')
        .on('mousemove', (ev) => showTip(ev, d.label, `${d.wins} V – ${d.losses} D · win rate ${fr(d.wr, 1)} % · KDA ${fr(d.kda, 2)}`))
        .on('mouseleave', hideTip)
        .on('click', () => { hideTip(); S.tab = 'jours'; S.jour = d.jour; render(); });
      grp.append('rect').attr('x', x(d.jour)).attr('width', x.bandwidth()).attr('y', mt).attr('height', H - mb - mt).style('fill', 'transparent');
      if (d.wins) grp.append('rect').attr('x', x0).attr('width', bw).attr('y', y(d.wins)).attr('height', y(0) - y(d.wins)).attr('rx', 3).style('fill', 'var(--ok)');
      if (d.losses) grp.append('rect').attr('x', x0).attr('width', bw).attr('y', y(d.games)).attr('height', y(d.wins) - y(d.games)).attr('rx', 3).style('fill', 'var(--bad)');
      grp.append('text').attr('class', 'strong').attr('x', x0 + bw / 2).attr('y', y(d.games) - 6).attr('text-anchor', 'middle').text(`${d.wins}-${d.losses}`);
      grp.append('text').attr('x', x(d.jour) + x.bandwidth() / 2).attr('y', H - mb + 16).attr('text-anchor', 'middle').text(`${d.jour.slice(8, 10)}/${d.jour.slice(5, 7)}`);
    });
    [['Victoires', 'var(--ok)'], ['Défaites', 'var(--bad)']].forEach(([lab, col], i) => {
      svg.append('rect').attr('x', ml + i * 90).attr('y', 7).attr('width', 10).attr('height', 10).attr('rx', 2).style('fill', col);
      svg.append('text').attr('x', ml + i * 90 + 14).attr('y', 12).attr('dy', '0.32em').text(lab);
    });
  }

  // Games jouées par champion du pool (victoires + défaites), sur l'échelle de l'objectif.
  function objChart(el, obj) {
    el.replaceChildren();
    const pool = obj.per;
    if (!pool.length) return;
    const W = Math.max(300, el.clientWidth), rowH = 38, mt = 10, mb = 24;
    const H = mt + pool.length * rowH + mb;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).style('display', 'block');
    const label = (c) => (c.games ? `${c.games} ${c.games > 1 ? 'games' : 'game'} · ${c.wins} V – ${c.losses} D` : 'aucune game');
    const probe = svg.append('text');
    let ml = 0, mr = 0;
    pool.forEach((c) => { probe.text(c.champion); ml = Math.max(ml, probe.node().getComputedTextLength()); probe.text(label(c)); mr = Math.max(mr, probe.node().getComputedTextLength()); });
    probe.remove();
    ml += 12; mr += 10;
    const maxX = Math.max(obj.target, d3.max(pool, (c) => c.games) || 0, 1);
    const x = d3.scaleLinear([0, maxX], [ml, Math.max(ml + 60, W - mr)]);
    const y = d3.scaleBand(pool.map((c) => c.id), [mt, H - mb]).padding(0.3);
    x.ticks(Math.min(10, maxX)).filter((t) => Number.isInteger(t)).forEach((t) => {
      svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', mt).attr('y2', H - mb).style('stroke', 'var(--line)');
      svg.append('text').attr('x', x(t)).attr('y', H - mb + 14).attr('text-anchor', 'middle').text(t);
    });
    pool.forEach((c) => {
      const yy = y(c.id), bh = Math.min(22, y.bandwidth()), top = yy + (y.bandwidth() - bh) / 2;
      const g = svg.append('g').on('mousemove', (ev) => showTip(ev, c.champion, c.games ? `${label(c)} · KDA ${fr(c.kda, 2)}` : 'aucune game')).on('mouseleave', hideTip);
      if (c.wins) g.append('rect').attr('x', ml).attr('y', top).attr('height', bh).attr('width', x(c.wins) - ml).attr('rx', 3).style('fill', 'var(--ok)');
      if (c.losses) g.append('rect').attr('x', x(c.wins)).attr('y', top).attr('height', bh).attr('width', x(c.games) - x(c.wins)).attr('rx', 3).style('fill', 'var(--bad)');
      svg.append('text').attr('class', 'strong').attr('x', ml - 8).attr('y', yy + y.bandwidth() / 2).attr('dy', '0.32em').attr('text-anchor', 'end').text(c.champion);
      svg.append('text').attr('class', 'strong').attr('x', x(c.games) + 6).attr('y', yy + y.bandwidth() / 2).attr('dy', '0.32em').text(label(c));
    });
  }

  // ================= Rubriques « Lanes et principes » et « Parole du coach » =================
  const typing = () => { const a = document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('view').contains(a)); };
  const CIBLES = ["Toute l'équipe", 'Top', 'Jungle', 'Mid', 'ADC', 'Support'];
  const dateLong = (t) => { const d = new Date(t); return `${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${hm(t)}`; };
  const themeOf = (id) => (S.guides || []).find((t) => t.id === id) || null;
  const unseen = () => (S.fiches || []).filter((f) => !S.seen.has(f.id));
  const pourLabel = (p) => (!p || p === 'tous') ? "Toute l'équipe" : String(p).split(/\s+/).map((r) => (FC.ROLES[r] ? FC.ROLES[r].label : r)).join(' et ');

  function go(sec) {
    if (SUB() && !SUB_OK.has(sec)) sec = 'stats';
    if (sec !== S.section && S.section !== 'settings') S.prevSection = S.section;
    if (sec !== 'settings') setClose(true);
    if (sec !== 'web' && WEB.open) webClose(true);
    document.documentElement.classList.toggle('chat-page', sec === 'chat');
    S.section = sec;
    if (START_PAGES.some(([k]) => k === sec)) save('fire.lastSection', sec);
    if (sec !== S.prevSection || sec === 'settings') actLog('page', 'Page ' + (PAGE_NAMES[sec] || sec));
    if (sec === 'guides') { S.theme = null; S.guideCat = null; }
    if (sec === 'coach') S.ficheId = null;
    if (sec === 'stats') { S.view = 'hub'; S.player = null; }
    if (sec === 'planning') { S.planEdit = null; loadPlanning(); }
    if (sec === 'patch') { loadPatch(); markPatchSeen(); }
    if (sec === 'pool') { S.poolFresh = newsFresh('pool'); if (S.poolFresh.length) newsMark('pool', S.poolFresh); }
    if (sec === 'lolpatch') loadLolPatch();
    if (sec === 'vocal') VX.dev = null;
    if (sec === 'draft') { DR.msg = ''; setTimeout(pollDraft, 0); }
    if (sec === 'jeux') { loadJeux(); J.home = true; }
    if (sec === 'worlds') { loadJeux(); loadWorlds(W.year); }
    render();
    window.scrollTo(0, 0);
  }

  // ----- Nouveautés par rubrique, façon quêtes : une pastille dans le menu tant qu'il reste du nouveau non ouvert -----
  // POOL : la nouvelle semaine (et ta tierlist modifiée par le coach) ; vue dès que la page s'ouvre.
  // Lanes et principes : chaque thème nouveau ou mis à jour ; vu quand on l'ouvre (marqué « Nouveau » d'ici là).
  const hashStr = (x) => { let h2 = 0; const t = String(x); for (let i = 0; i < t.length; i++) h2 = (h2 * 31 + t.charCodeAt(i)) | 0; return (h2 >>> 0).toString(36); };
  // Jeux ajoutés récemment dans Détente : pastille « Nouveau » jusqu'à ce que le joueur les ouvre.
  const JNEW = ['cdq', 'prix', 'stat', 'recette'];
  function newsIds(sec) {
    if (sec === 'pool') {
      const w = (S.pools || []).slice().sort((a, b) => String(b.debut || '').localeCompare(String(a.debut || '')))[0];
      if (!w) return [];
      const ids = ['week:' + w.id];
      const mine = S.moi && (w.joueurs || {})[S.moi];
      if (mine && mine.par !== 'joueur' && mine.maj) ids.push('tl:' + w.id + ':' + mine.maj);
      if (w.note) ids.push('note:' + w.id + ':' + hashStr(w.note));
      return ids;
    }
    if (sec === 'guides') return (S.guides || []).map((t) => 'g:' + t.id + ':' + hashStr(JSON.stringify(t)));
    if (sec === 'jeux') return JNEW.map((k) => 'f:' + k);
    if (sec === 'draft') return ['f:otp'];
    return [];
  }
  function newsFresh(sec) {
    const seen = load('fire.seen', {});
    const ids = newsIds(sec);
    if (!ids.length) return [];
    // Première fois : tout ce qui existe déjà compte comme vu (pas de pluie de pastilles à l'installation).
    // Les nouveaux jeux (« f: ») restent à découvrir, même la première fois.
    if (!seen[sec]) { seen[sec] = ids.filter((x) => !x.startsWith('f:')); save('fire.seen', seen); }
    return ids.filter((x) => !seen[sec].includes(x));
  }
  function newsMark(sec, ids) {
    const seen = load('fire.seen', {});
    seen[sec] = [...new Set((seen[sec] || []).concat(ids))].slice(-400);
    save('fire.seen', seen);
    renderNav();
  }
  const newsCount = (sec) => newsFresh(sec).length;
  // Thème de guide nouveau ou modifié (pour l'étiquette « Nouveau » dans la page).
  const themeIsNew = (t) => { const id = 'g:' + t.id + ':' + hashStr(JSON.stringify(t)); return newsFresh('guides').includes(id); };
  const markTheme = (t) => newsMark('guides', ['g:' + t.id + ':' + hashStr(JSON.stringify(t))]);

  // ----- Patch notes -----
  // Entrées « contenu » (diapos, guides, quiz…) : pas de numéro de version, juste une date et un identifiant.
  const lastContent = () => (S.patch || []).find((x) => x.contenu);
  const patchUnseen = () => (!!S.version && load('fire.patch.vu', '') !== S.version) || (!!lastContent() && load('fire.patch.cvu', '') !== lastContent().id);
  const markPatchSeen = () => { save('fire.patch.vu', S.version); if (lastContent()) save('fire.patch.cvu', lastContent().id); };
  async function loadPatch() {
    try { const r = await window.fire.patchnotes(); if (r && Array.isArray(r.versions)) S.patch = r.versions; } catch (e) { /* hors ligne */ }
    if (!S.patch) S.patch = [];
    if (S.section === 'patch') markPatchSeen();
    if (S.section === 'patch' && !typing()) render();
    else if ($('nav').childElementCount) renderNav();
    patchPopup();
  }
  // Après une mise à jour : un pop-up propose de voir les nouveautés de la version installée.
  function patchPopup() {
    const last = load('fire.patch.version', null);
    save('fire.patch.version', S.version);
    if (!last || last === S.version || !S.patch) return;
    const mine = S.patch.filter((x) => x.v && newer(x.v, last) && !newer(x.v, S.version));
    if (!mine.length) return;
    popup(`🆕 FIRE est passé en v${S.version}`, mine.slice(0, 3).map((x) => x.titre).join(' · ') + (mine.length > 3 ? '…' : ''), 'patch');
  }
  // ----- Signaler un bug : texte + jusqu'à 3 captures (fichier ou Ctrl+V), envoyé chiffré au coach -----
  S.bug = { open: false, texte: '', images: [], busy: false, msg: '', ok: false };
  function shrinkImage(file) {
    return new Promise((resolve) => {
      const rd = new FileReader();
      rd.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 1600 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(null);
        img.src = rd.result;
      };
      rd.onerror = () => resolve(null);
      rd.readAsDataURL(file);
    });
  }
  async function addBugImages(files) {
    const b = S.bug;
    for (const f of [...files].filter((x) => /^image\//.test(x.type))) {
      if (b.images.length >= 3) { b.msg = '3 images maximum.'; break; }
      const d = await shrinkImage(f);
      if (d) b.images.push(d);
    }
    if (S.section === 'patch') render();
  }
  document.addEventListener('paste', (e) => {
    if (S.section !== 'patch' || !S.bug.open || !e.clipboardData) return;
    const files = [...e.clipboardData.items].filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
    if (files.length) { e.preventDefault(); addBugImages(files); }
  });
  function openBug() { setClose(true); S.section = 'patch'; renderNav(); S.bug.open = true; S.bug.ok = false; S.bug.msg = ''; loadPatch(); render(); window.scrollTo(0, 0); setTimeout(() => { const x = $('bug-txt'); if (x) x.focus(); }, 60); }
  async function sendBug() {
    const b = S.bug;
    if (b.busy) return;
    if ((b.texte || '').trim().length < 5) { b.msg = 'Décris le problème en quelques mots.'; render(); return; }
    b.busy = true; b.msg = ''; render();
    const me = S.players.find((x) => x.slug === S.moi);
    let r;
    try { r = await window.fire.bugs.send({ texte: b.texte, images: b.images, qui: me ? me.pseudo : 'anonyme', version: S.version, section: S.prevSection || '' }); } catch (e) { r = { ok: false, error: String(e) }; }
    b.busy = false;
    if (r && r.ok) { S.bug = { open: false, texte: '', images: [], busy: false, msg: '', ok: true }; popup('🐞 Rapport envoyé', 'Merci ! Le coach a bien reçu ton rapport de bug.', null); }
    else b.msg = '⚠ Envoi impossible : ' + ((r && r.error) || 'erreur inconnue');
    render();
  }
  function bugCard() {
    const b = S.bug;
    if (!b.open) {
      return h('div', { class: 'card bug-cta' },
        h('div', null, h('h2', null, '🐞 Un bug ? Dis-le !'), h('p', { class: 'muted small' }, b.ok ? '✓ Ton dernier rapport a bien été envoyé. Merci !' : 'Explique ce qui ne va pas et ajoute des captures d’écran si tu veux : le coach reçoit ton rapport.')),
        h('button', { class: 'btn-fire small-btn', onclick: openBug }, '🐞 Signaler un bug'));
    }
    const ta = h('textarea', { id: 'bug-txt', class: 'inp', rows: 5, maxlength: 4000, placeholder: 'Que s’est-il passé ? Où (quelle page) ? Qu’est-ce que tu attendais ? Ex. : dans Détente › Splash, l’image reste noire après 2 essais.', disabled: b.busy ? true : null });
    ta.value = b.texte;
    ta.addEventListener('input', () => { b.texte = ta.value; });
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true, hidden: true, onchange: (e) => addBugImages(e.target.files) });
    return h('div', { class: 'card bug-form' },
      h('h2', null, '🐞 Signaler un bug'),
      ta,
      h('div', { class: 'bug-imgs' },
        b.images.map((src, i) => h('div', { class: 'bug-thumb' }, h('img', { src, alt: '', onclick: () => zoom(src, 'Capture ' + (i + 1)) }),
          h('button', { class: 'bug-x', title: 'Retirer', onclick: () => { b.images.splice(i, 1); render(); } }, '✕'))),
        b.images.length < 3 ? h('button', { class: 'bug-add', onclick: () => file.click(), disabled: b.busy ? true : null }, '＋', h('span', null, 'Ajouter une image')) : null, file),
      h('p', { class: 'muted small' }, 'Jusqu’à 3 images. Tu peux aussi coller une capture avec Ctrl+V (Win+Maj+S pour en faire une). Ton pseudo et ta version de FIRE sont ajoutés automatiquement.'),
      b.msg ? h('p', { class: 'bad small' }, b.msg) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn-fire small-btn', disabled: b.busy ? true : null, onclick: sendBug }, b.busy ? 'Envoi…' : '📨 Envoyer le rapport'),
        h('button', { class: 'btn-ghost', disabled: b.busy ? true : null, onclick: () => { b.open = false; render(); } }, 'Annuler')));
  }
  // Côté coach : les rapports reçus.
  async function loadBugs() {
    S.bugsLoading = true;
    let r; try { r = await window.fire.bugs.list(); } catch (e) { r = { ok: false, error: String(e) }; }
    S.bugsLoading = false;
    S.bugs = r && r.ok ? r.bugs : []; S.bugsErr = r && !r.ok ? r.error : (r && r.info) || '';
    if (S.section === 'patch' && !typing()) render();
  }
  function bugInbox() {
    if (!S.bugs && !S.bugsLoading) loadBugs();
    const list = S.bugs || [];
    return h('div', { class: 'card bug-inbox' },
      h('h2', null, `🔒 Rapports de bug reçus (${list.length})`, h('button', { class: 'linkbtn small', style: 'margin-left:10px', onclick: loadBugs }, '⟳ Actualiser')),
      S.bugsErr ? h('p', { class: 'muted small' }, '⚠ ' + S.bugsErr) : null,
      S.bugsLoading && !S.bugs ? h('p', { class: 'muted' }, 'Chargement…') : !list.length ? h('p', { class: 'muted small' }, 'Aucun rapport pour le moment. 👍') : null,
      list.map((x) => h('div', { class: 'bug-item' },
        h('div', { class: 'bug-meta' }, h('b', null, x.qui || 'anonyme'), h('span', { class: 'muted small' }, ` · v${x.version || '?'} · ${x.at ? dateLong(x.at) : ''}`),
          h('button', { class: 'btn-ghost bug-done', onclick: async (e) => { e.target.disabled = true; const r = await window.fire.bugs.close(x.id); if (r && r.ok) { S.bugs = S.bugs.filter((y) => y.id !== x.id); } else S.bugsErr = (r && r.error) || 'erreur'; render(); } }, '✓ Réglé')),
        h('p', { class: 'bug-text' }, x.texte),
        (x.images || []).length ? h('div', { class: 'bug-imgs' }, x.images.map((src, i) => h('div', { class: 'bug-thumb' }, h('img', { src, alt: '', onclick: () => zoom(src, `${x.qui} · capture ${i + 1}`) })))) : null)));
  }

  // ----- Patchs officiels de League of Legends (leagueoflegends.com, en français) -----
  const LP = { list: null, err: '', cur: null, art: {}, loading: false };
  const lolUnseen = () => !!(LP.list && LP.list[0] && load('fire.lolpatch.vu', '') !== LP.list[0].url);
  async function loadLolPatch(force) {
    if (LP.loading || (LP.list && !force)) return;
    LP.loading = true;
    try { const r = await window.fire.lolpatch.list(); LP.list = r.items || []; LP.err = r.ok ? '' : (r.error || 'site indisponible'); }
    catch (e) { LP.err = String(e); if (!LP.list) LP.list = []; }
    LP.loading = false;
    if (S.section === 'lolpatch') { if (!LP.cur && LP.list[0]) openLolPatch(LP.list[0].url); else render(); }
    else if ($('nav').childElementCount) renderNav();
  }
  async function openLolPatch(url) {
    LP.cur = url;
    if (LP.list && LP.list[0] && url === LP.list[0].url) save('fire.lolpatch.vu', url);
    render();
    if (!LP.art[url] || !LP.art[url].ok) {
      try { LP.art[url] = await window.fire.lolpatch.get(url); } catch (e) { LP.art[url] = { ok: false, error: String(e) }; }
      if (S.section === 'lolpatch' && LP.cur === url) render();
    }
  }
  // Le texte vient du site de Riot : on ne garde que les balises de mise en forme et les liens/images en https.
  const LP_DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'VIDEO', 'AUDIO', 'SOURCE', 'LINK', 'META', 'SVG', 'MATH', 'NOSCRIPT', 'TEMPLATE']);
  const LP_KEEP = new Set(['DIV', 'P', 'H2', 'H3', 'H4', 'H5', 'UL', 'OL', 'LI', 'STRONG', 'B', 'I', 'EM', 'U', 'A', 'IMG', 'BR', 'HR', 'BLOCKQUOTE', 'SPAN', 'HEADER', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'SUP', 'SUB', 'SECTION', 'FIGURE', 'FIGCAPTION']);
  function lolHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const clean = (node) => {
      [...node.children].forEach((el) => {
        if (LP_DROP.has(el.tagName)) { el.remove(); return; }
        clean(el);
        if (!LP_KEEP.has(el.tagName)) { el.replaceWith(...el.childNodes); return; }
        [...el.attributes].forEach((a) => {
          const n = a.name.toLowerCase(), v = a.value.trim();
          const ok = n === 'class' || n === 'alt' || n === 'colspan' || n === 'rowspan' || ((n === 'href' || n === 'src') && /^https:\/\//i.test(v));
          if (!ok) el.removeAttribute(a.name);
        });
        if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
        if (el.tagName === 'IMG') el.setAttribute('loading', 'lazy');
      });
    };
    clean(doc.body);
    const box = h('div', { class: 'lp-body' });
    box.append(...[...doc.body.childNodes].map((n) => document.importNode(n, true)));
    return box;
  }
  // ----- Salon vocal de l'équipe (voir voice.js) : voix, caméra, partage d'écran, réglages -----
  const VX = { sig: '', dev: null, pending: false, vids: {}, picker: null, inv: {}, more: false };
  // Un clic ailleurs ferme le menu ⋯ du salon.
  document.addEventListener('click', (e) => { if (VX.more && !e.target.closest('.vm-wrap')) { VX.more = false; VX.invOpen = false; if (S.section === 'vocal') renderVocal(); } });
  const FV = () => window.FireVoice;
  const vocalMe = () => S.moi || (S.coachState && S.coachState.coach ? 'coach' : null);
  const coachOf = (slug) => (S.coachs || []).find((c) => c.slug === slug) || null;
  // Pseudo choisi par moi pour quelqu'un (« Changer le pseudo », visible seulement par moi).
  const vocalName = (slug) => (load('fire.nicks', {})[slug]) || (slug === 'coach' ? 'Coach' : coachOf(slug) ? coachOf(slug).pseudo : shortName((S.players.find((p) => p.slug === slug) || {}).pseudo || slug));
  const vocalIds = () => S.players.map((p) => p.slug).filter(Boolean).concat((S.coachs || []).map((c) => c.slug), 'coach');
  const ini = (slug) => vocalName(slug).slice(0, 2).toUpperCase();
  // Qui est en vocal : les gens connectés avec moi si je suis dans le salon, sinon ce que les autres FIRE annoncent.
  function vocalPeople() {
    const v = window.FireVoice && FV().state();
    if (!v) return [];
    return v.on ? [v.me].concat(v.members.filter((m) => m.ok).map((m) => m.slug)) : v.here;
  }
  const vocalLive = () => vocalPeople().length > 0;
  function vocalBadge() { const n = vocalPeople().length; return n ? String(n) : null; }
  // Bandeau vert en haut de toutes les pages quand des coéquipiers sont en vocal et que je n'y suis pas.
  function vocalLiveBanner() {
    let el = document.getElementById('vlive');
    const v = window.FireVoice && FV().state();
    const ppl = v && !v.on ? v.here : [];
    if (!ppl.length || S.section === 'vocal' || !vocalMe()) { if (el) el.remove(); return; }
    if (!el) { el = h('div', { id: 'vlive' }); $('view').before(el); }
    const list = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} et ${xs[xs.length - 1]}`);
    const byRoom = ROOMS.map((r) => [r, ppl.filter((x) => (v.rooms || {})[x] === r.id || (!(v.rooms || {})[x] && r.id === 'equipe'))]).filter(([, xs]) => xs.length);
    const txt = byRoom.length === 1
      ? `${list(byRoom[0][1].map(vocalName))} ${byRoom[0][1].length > 1 ? 'sont' : 'est'} en vocal · ${byRoom[0][0].name}`
      : byRoom.map(([r, xs]) => `${r.name} : ${list(xs.map(vocalName))}`).join('   ·   ');
    const target = (byRoom.find(([r]) => r.id === 'equipe') || byRoom[0] || [ROOMS[0]])[0].id;
    el.replaceChildren(
      h('span', { class: 'vl-live' }, h('span', { class: 'dot' }), 'EN DIRECT'),
      h('span', { class: 'vl-av' }, ppl.slice(0, 6).map((x) => h('span', { class: 'vc-av mini', title: vocalName(x) }, ini(x)))),
      h('b', { class: 'vl-txt' }, '🎙️ ', txt),
      h('button', { class: 'vl-join', onclick: () => { go('vocal'); vocalJoin(target); } }, byRoom.length > 1 ? 'Rejoindre l’équipe' : 'Rejoindre'),
      h('button', { class: 'vl-see', onclick: () => go('vocal') }, 'Voir le salon'));
  }
  function vocalSig(v) {
    return JSON.stringify([v.on, v.joining, v.err, v.mute, v.deaf, v.monitor, !!v.cam, !!v.screen, v.lmute,
      v.members.filter((m) => m.ok).map((m) => [m.slug, m.remote]).sort(), v.videos.map((x) => x.slug + x.kind + (x.sound ? 's' : '')).sort(), v.svol, v.cfg.streamSound, v.screenAudio, v.screenMix, v.unwatch]);
  }
  // Salon libre : toute l'équipe arrive dans le même salon, sans code.
  // Plusieurs salons : le salon de l'équipe, deux salons duo et un salon de coaching perso (2 places).
  const ROOMS = [
    { id: 'equipe', ico: '🔊', name: 'Salon de l’équipe', sub: 'Toute l’équipe', max: 0 },
    { id: 'duo1', ico: '🎧', name: 'Duo 1', sub: '2 places', max: 2 },
    { id: 'duo2', ico: '🎧', name: 'Duo 2', sub: '2 places', max: 2 },
    { id: 'coaching', ico: '🎓', name: 'Coaching perso', sub: '2 places · en tête-à-tête', max: 2 }
  ];
  const roomOf = (id) => ROOMS.find((r) => r.id === id) || ROOMS[0];
  // Le salon de l'équipe garde son adresse d'avant : les versions précédentes de FIRE s'y retrouvent.
  const roomCode = (id) => (id === 'equipe' ? 'FIRE-salon-equipe' : 'FIRE-salon-' + id);
  // Qui est dans chaque salon, d'après ce que les autres FIRE annoncent (et moi si je suis dedans).
  function roomPeople(id) {
    const v = FV().state();
    const out = Object.entries(v.rooms || {}).filter(([, r]) => r === id).map(([x]) => x);
    if (v.on && v.room === id) out.unshift(v.me);
    return [...new Set(out)];
  }
  function vocalJoin(roomId) {
    if (!vocalMe()) return;
    if (modBlocked()) { vocalToast(`Tu es exclu du vocal jusqu’à ${hm(MOD.me.until)}.`, false); return; }
    actLog('vocal', 'Rejoint le salon vocal ' + roomOf(typeof roomId === 'string' ? roomId : (VX.room || load('fire.vocal.room', 'equipe'))).name);
    const v = FV().state();
    const id = roomOf(typeof roomId === 'string' ? roomId : (VX.room || load('fire.vocal.room', 'equipe'))).id;
    const r = roomOf(id);
    const there = roomPeople(id).filter((x) => x !== vocalMe());
    if (r.max && there.length >= r.max) { VX.roomErr = `${r.name} est complet (${there.map(vocalName).join(' et ')}).`; renderVocal(); return; }
    VX.roomErr = '';
    VX.room = id; save('fire.vocal.room', id);
    const go2 = () => FV().join({ me: vocalMe(), ids: vocalIds(), code: roomCode(id), room: id });
    if (v.on && v.room !== id) { FV().leave(); setTimeout(go2, 600); } else if (!v.on) go2();
  }
  function vocalSpeak() {
    const v = FV().state();
    document.querySelectorAll('[data-vslug]').forEach((el) => el.classList.toggle('talk', !!v.speaking[el.dataset.vslug]));
  }
  // Un élément vidéo retiré de la page se met en pause (règle du navigateur), et l'autoplay ne repart pas tout seul
  // quand on le remet : après chaque affichage du salon (changement d'onglet, quelqu'un qui coupe son micro…),
  // on relance la lecture des vidéos visibles.
  function resumeVideos() {
    requestAnimationFrame(() => Object.values(VX.vids).forEach((el) => { if (el.isConnected && el.paused && el.srcObject) el.play().catch(() => {}); }));
  }
  // Élément vidéo gardé d'un rendu à l'autre : l'image ne clignote pas.
  function vidEl(key, stream, mirror) {
    let el = VX.vids[key];
    if (!el) { el = VX.vids[key] = h('video', { autoplay: true, playsinline: true }); el.muted = true; }
    if (el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); }
    el.classList.toggle('mirror', !!mirror);
    return el;
  }
  function vocalBar() {
    let bar = document.getElementById('vbar');
    const v = FV().state();
    if (!v.on || S.section === 'vocal') { if (bar) bar.remove(); return; }
    if (!bar) { bar = h('div', { id: 'vbar' }); document.body.append(bar); }
    const ppl = [v.me].concat(v.members.filter((m) => m.ok).map((m) => m.slug));
    const live = v.videos.length;
    bar.replaceChildren(
      h('button', { class: 'vb-go', title: 'Ouvrir le salon vocal', onclick: () => go('vocal') }, '🎙️ ', h('b', null, 'Vocal'), ' · ', String(ppl.length), live ? h('span', { class: 'vb-live' }, ' · 🔴 ' + live + ' en direct') : null),
      h('span', { class: 'vb-ppl' }, ppl.map((s) => h('span', { class: 'vb-p', 'data-vslug': s, title: vocalName(s) }, ini(s)))),
      h('button', { class: 'vb-btn' + (v.mute ? ' off' : ''), title: (v.mute ? 'Réactiver le micro' : 'Couper le micro') + ` (${keyTxt(vkeys().mute)})`, onclick: () => FV().setMute(!v.mute) }, v.mute ? '🔇' : '🎤'),
      h('button', { class: 'vb-btn' + (v.deaf ? ' off' : ''), title: (v.deaf ? 'Réactiver le son' : 'Couper le son') + ` (${keyTxt(vkeys().deaf)})`, onclick: () => FV().setDeaf(!v.deaf) }, v.deaf ? '🔕' : '🎧'),
      h('button', { class: 'vb-btn leave', title: 'Quitter le salon', onclick: () => FV().leave() }, '📞'));
    vocalSpeak();
  }
  async function openScreenPicker() {
    VX.picker = { list: null };
    const box = h('div', { class: 'vc-pick', onclick: (e) => { if (e.target === box) close(); } });
    const close = () => { box.remove(); VX.picker = null; };
    const paint = () => {
      const L = VX.picker && VX.picker.list;
      box.replaceChildren(h('div', { class: 'card vc-pick-in' },
        h('div', { class: 'row vc-pick-head' }, h('b', null, '🖥️ Que veux-tu montrer ?'), h('button', { class: 'btn-ghost', onclick: close }, '✕ Annuler')),
        h('label', { class: 'vs-sw vc-pick-snd' }, h('span', null, h('b', null, '🔊 Partager aussi le son de mon PC'), h('small', null, VX.picker && VX.picker.own === false
          ? '⚠ Ton Windows est trop ancien pour séparer les pistes : les voix du salon passeront aussi dans le son partagé. Mets Windows à jour (Windows 10 22H2 ou Windows 11) pour les retirer.'
          : 'Le son du jeu, d’une vidéo… sans l’appel : les voix du salon et les sons de FIRE ne sont pas envoyés, comme sur Discord.')),
          h('input', { type: 'checkbox', class: 'vs-tog', checked: load('fire.vocal.sharesound', false) ? true : null, onchange: (e) => save('fire.vocal.sharesound', e.target.checked) })),
        !L ? h('p', { class: 'muted' }, 'Recherche des écrans et des fenêtres…')
          : !L.length ? h('p', { class: 'bad' }, '⚠ Aucun écran trouvé (autorise la capture d’écran dans Windows si besoin).')
            : ['Écrans', 'Fenêtres'].map((t, k) => {
              const part = L.filter((x) => x.screen === (k === 0));
              return part.length ? h('div', null, h('p', { class: 'muted small vc-pick-t' }, t), h('div', { class: 'vc-pick-grid' }, part.map((x) =>
                h('button', { class: 'vc-src', onclick: () => { close(); FV().startScreen(x.id, load('fire.vocal.sharesound', false)); } }, h('img', { src: x.thumb, alt: '' }), h('span', null, x.name))))) : null;
            })));
    };
    paint(); document.body.append(box);
    if (window.fire && window.fire.screen) {
      const own = window.fire.screen.ownAudio ? window.fire.screen.ownAudio().catch(() => false) : Promise.resolve(false);
      VX.picker.list = await window.fire.screen.sources().catch(() => []);
      if (VX.picker) VX.picker.own = await own;
    }
    else { close(); FV().startScreen(null); return; }
    if (VX.picker) paint();
  }
  function fullscreen(el) { (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => {}); }
  // Icônes du salon (traits fins, comme dans les apps de voix).
  const VICO = {
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    micOff: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="3" x2="21" y1="3" y2="21"/>',
    head: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    headOff: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/><line x1="3" x2="21" y1="3" y2="21"/>',
    cam: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    camOff: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/><line x1="2" x2="22" y1="2" y2="22"/>',
    screen: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    gear: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    focus: '<rect x="2" y="3" width="14" height="18" rx="1.5"/><rect x="18" y="3" width="4" height="5" rx="1"/><rect x="18" y="10" width="4" height="5" rx="1"/><rect x="18" y="17" width="4" height="4" rx="1"/>',
    full: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    vol: '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.4 18.4a9 9 0 0 0 0-12.8"/>',
    keys: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    invite: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    board: '<path d="M14.1 6.1 9 3 3 6v15l6-3 6 3 6-3V3l-6.9 3.1"/><path d="M9 3v15"/><path d="M15 6v15"/>',
    clip: '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.8a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>'
  };
  const vi = (name) => { const sp = document.createElement('span'); sp.className = 'vi'; sp.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${VICO[name]}</svg>`; return sp; };

  // ----- Raccourcis clavier (globaux : ils marchent aussi en pleine partie) -----
  const VKEY_DEF = { join: 'Ctrl+Alt+V', mute: 'Ctrl+Alt+M', deaf: 'Ctrl+Alt+D', cam: 'Ctrl+Alt+C', screen: 'Ctrl+Alt+S', clip: 'Ctrl+Alt+X' };
  const VKEY_LAB = { join: 'Rejoindre / quitter le salon', mute: 'Couper / rallumer le micro', deaf: 'Couper / rallumer le son (casque)', cam: 'Allumer / couper la caméra', screen: 'Partager / arrêter ton écran', clip: 'Enregistrer un clip' };
  const vkeys = () => ({ ...VKEY_DEF, ...load('fire.vocal.keys', {}) });
  const keyTxt = (a) => (a ? a.replace(/\+/g, ' + ').replace('Ctrl', 'Ctrl').replace('Shift', 'Maj') : '—');
  function syncKeys(force) {
    if (!window.fire.keys) return;
    const k = vkeys();
    // Hors appel, seul « rejoindre » est réservé ; pendant un enregistrement de touche, rien.
    const map = VX.rec ? {} : FV().state().on ? { ...k } : { join: k.join };
    // Le raccourci des clips est réservé dès que les clips sont activés, même hors appel.
    if (!VX.rec) { if (clipCfg().on) map.clip = k.clip; else delete map.clip; }
    const sig = JSON.stringify(map);
    if (!force && sig === VX.keySig) return;
    VX.keySig = sig;
    window.fire.keys.set(map).then((r) => {
      const bad = (r && r.bad) || [];
      if (JSON.stringify(bad) !== JSON.stringify(VX.keyBad || [])) { VX.keyBad = bad; if (S.section === 'vocal' && VX.drawer) renderVocal(); }
    }).catch(() => {});
  }
  async function primaryScreen() {
    if (!window.fire.screen) return FV().startScreen(null);
    const list = await window.fire.screen.sources().catch(() => []);
    const scr = list.find((x) => x.screen) || list[0];
    if (scr) FV().startScreen(scr.id, load('fire.vocal.sharesound', false));
  }
  function keyAction(a) {
    const v = FV().state();
    if (a === 'clip') { saveClip(); return; }
    if (a === 'join') { if (v.on) FV().leave(); else vocalJoin(); return; }
    if (!v.on) return;
    if (a === 'mute') { FV().setMute(!v.mute); FV().cue(v.mute); }
    if (a === 'deaf') { FV().setDeaf(!v.deaf); FV().cue(v.deaf); }
    if (a === 'cam') { if (v.cam) FV().stopCam(); else FV().startCam(); FV().cue(!v.cam); }
    if (a === 'screen') { if (v.screen) FV().stopScreen(); else primaryScreen(); FV().cue(!v.screen); }
  }
  // Enregistre une nouvelle touche : on appuie sur la combinaison voulue (Échap annule, Retour arrière efface).
  function recordKey(act) {
    VX.rec = act; syncKeys(); renderVocal();
    const done = (val) => {
      document.removeEventListener('keydown', onKey, true);
      if (val !== undefined) { const k = load('fire.vocal.keys', {}); k[act] = val; save('fire.vocal.keys', k); }
      VX.rec = null; syncKeys(true); renderVocal();
    };
    const onKey = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') return done();
      if (e.key === 'Backspace' || e.key === 'Delete') return done('');
      const c = e.code || '';
      const key = /^Key[A-Z]$/.test(c) ? c.slice(3) : /^Digit\d$/.test(c) ? c.slice(5) : /^F\d{1,2}$/.test(c) ? c : /^Numpad\d$/.test(c) ? 'num' + c.slice(6) : null;
      if (!key) return; // on attend la touche principale (lettre, chiffre ou F1…F24)
      const mods = [e.ctrlKey ? 'Ctrl' : null, e.altKey ? 'Alt' : null, e.shiftKey ? 'Shift' : null].filter(Boolean);
      if (!mods.length && !/^F\d/.test(key)) { VX.recMsg = 'Ajoute Ctrl, Alt ou Maj (ou prends une touche F1 à F24).'; renderVocal(); return; }
      VX.recMsg = '';
      done(mods.concat(key).join('+'));
    };
    document.addEventListener('keydown', onKey, true);
  }

  if (window.FireVoice) {
    FV().onChange(() => {
      const v = FV().state();
      // Petites bulles « X a rejoint / quitté le salon » (désactivables dans le menu ⋯).
      const now = v.on ? v.members.filter((m) => m.ok).map((m) => m.slug) : [];
      if (v.on && VX.prevIn && load('fire.vocal.toasts', true)) {
        now.filter((x) => !VX.prevIn.includes(x)).forEach((x) => vocalToast(`${vocalName(x)} a rejoint le salon`, true));
        VX.prevIn.filter((x) => !now.includes(x)).forEach((x) => vocalToast(`${vocalName(x)} a quitté le salon`, false));
      }
      // Fin de l'appel : le tableau tactique repart de zéro.
      if (!v.on && VX.prevIn && window.FireBoard) FireBoard.reset();
      if (window.FireClips && !!v.on !== !!VX.prevIn) FireClips.setMic(v.on ? FV().micStream() : null);
      VX.prevIn = v.on ? now : null;
      const sig = vocalSig(v);
      if (sig !== VX.sig) {
        VX.sig = sig;
        renderNav();
        syncKeys();
        // Pas de nouvel affichage pendant le plein écran d'une vidéo : il le fermerait.
        if (S.section === 'vocal') { if (typing() || document.fullscreenElement) VX.pending = true; else renderVocal(); }
      }
      vocalBar(); vocalSpeak(); vocalLiveBanner();
      // Notification Windows quand un coéquipier arrive en vocal alors que je n'y suis pas.
      if (!v.on) {
        const np = notifPrefs(), now = Date.now();
        VX.notified = VX.notified || {};
        const fresh = v.here.filter((x) => !(VX.prevHere || []).includes(x) && now - (VX.notified[x] || 0) > 600000);
        if (fresh.length && VX.prevHere && np.on && np.vocal && window.fire.notify && vocalMe()) {
          fresh.forEach((x) => { VX.notified[x] = now; });
          const names = fresh.map(vocalName);
          const all = v.here.length;
          deskNotify({ title: '🎙️ Salon vocal', body: `${names.join(', ')} ${names.length > 1 ? 'sont arrivés' : 'est arrivé'} en vocal${all > fresh.length ? ` (${all} en tout)` : ''}. Clique pour les rejoindre.`, section: 'vocal' }).catch(() => {});
        }
        VX.prevHere = v.here.slice();
      }
      const hs = vocalPeople().slice().sort().join('|') + '#' + Object.entries(v.rooms || {}).map((e) => e.join(':')).sort().join('|');
      if (hs !== VX.hereSig) {
        VX.hereSig = hs; renderNav();
        if (S.section === 'stats' && S.view === 'hub' && !typing()) render();
        if (S.section === 'vocal' && !typing() && !document.fullscreenElement) renderVocal();
      }
    });
    if (window.fire.keys) { window.fire.keys.on(keyAction); setTimeout(() => syncKeys(true), 1500); }
    FV().onSoundRequest(soundAsk);
    liveInit();
    rvAutoInit();
    rvlInit();
    // Clips : enregistrement continu si activé sur ce PC ; ta voix y entre quand tu es en appel.
    if (window.FireClips) { FireClips.onChange(() => { if (S.section === 'vocal' && VX.drawer) renderVocal(); }); setTimeout(() => clipsApply().catch(() => {}), 4000); }
    // Tableau tactique : messages du salon et état envoyé à chaque personne qui arrive.
    if (window.FireBoard) {
      FireBoard.init({
        me: () => vocalMe(), name: (s) => vocalName(s), send: (m, to) => FV().appSend(m, to),
        ddVersion: () => S.champList && S.champList.version,
        onChange: () => { if (S.section === 'vocal' && !document.fullscreenElement) renderVocal(); },
        onOpen: (from) => { vocalToast(`${vocalName(from)} a ouvert le tableau tactique`, true); if (S.section === 'vocal') { save('fire.vocal.layout', 'focus'); VX.focus = 'board'; } },
      });
      FV().onApp((from, m) => { if (m && m.t === 'tb') { if (!SUB()) FireBoard.onMsg(from, m); } else if (m && m.t === 'clip') clipRecv(from, m); });
      FV().onPeer((slug) => FireBoard.peerReady(slug));
    }
    // Définition reçue de chaque écran partagé (petit badge en haut à gauche de la vidéo).
    setInterval(async () => {
      if (S.section !== 'vocal' || !FV().state().on || !document.querySelector('.vt-q')) return;
      const info = await FV().recvInfo().catch(() => ({}));
      document.querySelectorAll('.vt-q').forEach((el) => { const i = info[el.dataset.q]; el.textContent = i && i.h ? `${i.h}p · ${i.fps} i/s` : ''; el.hidden = !(i && i.h); });
    }, 3000);
    // Jauge du micro (et rendu remis à plus tard pendant qu'on règle un curseur).
    setInterval(() => {
      if (S.section !== 'vocal') return;
      if (VX.pending && !typing() && !document.fullscreenElement) { VX.pending = false; renderVocal(); }
      const l = FV().level(), open = FV().gateOpen() && !FV().state().mute;
      document.querySelectorAll('.vc-meter-fill').forEach((f) => { f.style.width = Math.min(100, l / 1.28) + '%'; f.classList.toggle('open', open); });
    }, 80);
    // Hall des invitations : FIRE reste joignable pour qu'un coéquipier puisse t'inviter dans le salon.
    const onInvite = (from, room) => {
      if (FV().state().on) return;
      const r = roomOf(room);
      VX.room = r.id; save('fire.vocal.room', r.id);
      const t = '🎙️ Invitation au salon vocal', b = `${vocalName(from)} t’invite dans « ${r.name} ».`;
      const np = notifPrefs();
      if (np.app) popup(t, b, 'vocal');
      if (np.on && window.fire.notify) deskNotify({ title: t, body: b, section: 'vocal' }).catch(() => {});
    };
    const hall = () => { if (S.players.length && vocalMe()) FV().lobby({ me: vocalMe(), ids: vocalIds(), code: 'FIRE-salon-equipe', onInvite, noChat: subSlugs() }).catch(() => {}); };
    setTimeout(hall, 3000); setInterval(hall, 10000);
    // Rejoindre tout seul au lancement, si le joueur l'a demandé.
    let tries = 0;
    const auto = setInterval(() => {
      if (++tries > 20 || !load('fire.vocal.auto', false)) return clearInterval(auto);
      if (S.players.length && vocalMe()) { clearInterval(auto); if (!FV().state().on) vocalJoin(); }
    }, 1500);
  }

  // Menu clic droit (comme sur Discord) : sur un stream ou sur un participant.
  function vctxClose() { const m = document.getElementById('vctx'); if (m) m.remove(); document.removeEventListener('mousedown', vctxOut, true); document.removeEventListener('keydown', vctxEsc, true); }
  function vctxOut(e) { if (!e.target.closest('#vctx')) vctxClose(); }
  function vctxEsc(e) { if (e.key === 'Escape') vctxClose(); }
  function vctxOpen(x, y, build) {
    vctxClose();
    const m = h('div', { id: 'vctx', oncontextmenu: (e) => e.preventDefault() });
    const paint = () => m.replaceChildren(...build(paint).flat(4).filter(Boolean));
    paint(); document.body.append(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
    m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
    setTimeout(() => { document.addEventListener('mousedown', vctxOut, true); document.addEventListener('keydown', vctxEsc, true); }, 0);
  }
  const cxItem = (label, fn, ico, cls) => h('button', { class: 'cx-item' + (cls ? ' ' + cls : ''), onclick: fn }, ico ? vi(ico) : null, h('span', null, label));
  const cxCheck = (label, on, fn, hint) => h('button', { class: 'cx-item cx-chk', onclick: fn }, h('span', { class: 'cx-l' }, label, hint ? h('small', null, hint) : null), h('span', { class: 'vm-box' + (on ? ' on' : '') }, on ? vi('check') : null));
  const cxRange = (label, val, min, max, fn) => { const out = h('span', { class: 'vs-rv' }, Math.round(val * 100) + ' %');
    return h('div', { class: 'cx-range' }, h('label', null, label), h('div', { class: 'vs-range' }, h('input', { type: 'range', min, max, step: 0.05, value: val, oninput: (e) => { out.textContent = Math.round(e.target.value * 100) + ' %'; fn(Number(e.target.value)); } }), out)); };
  const cxSep = () => h('div', { class: 'cx-sep' });
  function streamMenu(t, box, x, y) {
    vctxOpen(x, y, (paint) => {
      const v = FV().state();
      const vid = (box.querySelector(':scope > video'));
      const hasSnd = !!(v.videos.find((z) => z.slug === t.slug && z.kind === 'screen') || {}).sound;
      const so = (v.svol || {})[t.slug] || {};
      const sndOn = so.on == null ? v.cfg.streamSound !== false : so.on;
      const vol = so.vol ?? 0.8;
      return [
        cxItem('Arrêter de regarder', () => { vctxClose(); FV().watchStream(t.slug, false); }, 'camOff'),
        cxSep(),
        hasSnd ? cxCheck('Rendre muet', !sndOn, () => { FV().setStreamSound(t.slug, { on: !sndOn }); paint(); }) : null,
        hasSnd ? cxRange('Volume du stream', Math.min(1, vol), 0, 1, (n) => FV().setStreamSound(t.slug, { vol: n, on: true })) : null,
        !hasSnd ? cxItem(`Demander le son à ${vocalName(t.slug)}`, () => { const ok = FV().requestSound(t.slug); vctxClose(); vocalToast(ok ? `Demande envoyée à ${vocalName(t.slug)}` : 'Demande impossible pour le moment', ok); }, 'vol') : null,
        !hasSnd ? h('p', { class: 'cx-note' }, `${vocalName(t.slug)} ne partage pas le son de son PC.`) : null,
        cxSep(),
        vid && document.pictureInPictureEnabled ? cxItem('Ouvrir le stream dans une petite fenêtre', () => { vctxClose(); vid.requestPictureInPicture().catch(() => {}); }, 'focus') : null,
        cxItem('Plein écran', () => { vctxClose(); fullscreen(box); }, 'full'),
        cxSep(),
        cxCheck('Atténuation du stream', v.cfg.duck !== false, () => { FV().setCfg({ duck: v.cfg.duck === false }); setTimeout(paint, 50); }, 'Réduit automatiquement le volume du stream lorsque les gens parlent.'),
        v.cfg.duck !== false ? cxRange('Force d’atténuation du stream', v.cfg.duckAmt ?? 0.5, 0, 1, (n) => FV().setCfg({ duckAmt: n })) : null
      ];
    });
  }
  // Clic droit sur quelqu'un (vocal, discussion) : comme Discord. La partie rouge (modération) est réservée au créateur, aux coachs et aux modérateurs.
  function personMenu(t, x, y) {
    const slug = t.slug, me = vocalMe();
    let open = '';
    vctxOpen(x, y, (paint) => {
      let v = null;
      try { v = FV().state(); } catch (e) { v = null; }
      const inCall = !!(v && v.on && v.members.some((m) => m.slug === slug));
      const lm = !!(v && v.lmute[slug]);
      const camOff = !!(VX.hideCam && VX.hideCam[slug]);
      const nicks = load('fire.nicks', {});
      const staff = isStaff() && slug !== me;
      const there = (v && v.rooms && v.rooms[slug]) || (inCall ? v.room : null);
      const sub = (key, label, kids) => [h('button', { class: 'cx-item cx-subh' + (open === key ? ' on' : ''), onclick: () => { open = open === key ? '' : key; paint(); } }, h('span', null, label), h('span', { class: 'cx-arrow' }, open === key ? '▾' : '›')),
        open === key ? h('div', { class: 'cx-sub' }, kids) : null];
      const mod = (label, cmd, done, cls) => cxItem(label, async () => { vctxClose(); const ok = await modDo(slug, cmd, done); vocalToast(ok ? done : `${vocalName(slug)} n’a pas FIRE ouvert : commande pas reçue.`, ok); }, null, 'cx-red' + (cls ? ' ' + cls : ''));
      return [
        h('div', { class: 'cx-head' }, vocalName(slug), roleBadge(slug)),
        cxItem('Profil', () => { vctxClose(); openProfile(slug); }),
        cxItem('Envoyer un message', () => { vctxClose(); CH.conv = slug; go('chat'); }),
        cxItem('Ajouter une note', () => { vctxClose(); const notes = load('fire.unotes', {}); const n = prompt(`Ta note sur ${vocalName(slug)} (visible seulement par toi) :`, notes[slug] || ''); if (n != null) { if (n.trim()) notes[slug] = n.trim().slice(0, 300); else delete notes[slug]; save('fire.unotes', notes); } }),
        cxSep(),
        v ? cxRange('Volume de l’utilisateur', Math.min(5, v.vols[slug] ?? 1), 0, 5, (n) => FV().setVol(slug, n)) : null,
        v ? cxCheck('Rendre muet', lm, () => { FV().setLocalMute(slug, !lm); setTimeout(paint, 50); }) : null,
        cxCheck('Désactiver la vidéo', camOff, () => { VX.hideCam = VX.hideCam || {}; if (camOff) delete VX.hideCam[slug]; else VX.hideCam[slug] = true; renderVocal(); setTimeout(paint, 50); }),
        cxItem('Changer le pseudo', () => { vctxClose(); const n = prompt(`Pseudo de ${vocalName(slug)} pour toi seulement (vide = pseudo normal) :`, nicks[slug] || ''); if (n != null) { if (n.trim()) nicks[slug] = n.trim().slice(0, 24); else delete nicks[slug]; save('fire.nicks', nicks); render(); } }),
        cxItem('Inviter dans mon salon', () => { vctxClose(); try { FV().invite(slug); vocalToast(`Invitation envoyée à ${vocalName(slug)}`, true); } catch (e) { /* */ } }),
        staff ? [cxSep(),
          ...sub('roles', 'Rôles', [cxCheck('Modérateur', isModo(slug), async () => { const set = new Set(STF.modos || []); if (set.has(slug)) set.delete(slug); else set.add(slug);
            const r = await window.fire.staff.rolesSave([...set], me).catch(() => null); if (r && r.ok) { STF.modos = r.modos; save('fire.modos', r.modos); renderNav(); } else vocalToast('Seuls un coach et le créateur choisissent les modérateurs.', false); paint(); })]),
          ...sub('move', 'Déplacer vers', ROOMS.filter((r) => r.id !== there).map((r) => cxItem(`${r.ico} ${r.name}`, async () => { vctxClose(); const ok = await modDo(slug, { a: 'move', room: r.id }, `${vocalName(slug)} déplacé vers ${r.name}`); vocalToast(ok ? `${vocalName(slug)} déplacé vers ${r.name}` : 'Commande pas reçue (FIRE fermé ?)', ok); }))),
          cxSep(),
          h('div', { class: 'cx-head cx-modh' }, '🛡️ Modération'),
          mod(MODS.has(slug, 'mute') ? 'Rendre la parole' : 'Rendre muet sur le serveur', { a: 'mute', on: !MODS.has(slug, 'mute') }, MODS.has(slug, 'mute') ? `${vocalName(slug)} peut de nouveau parler` : `${vocalName(slug)} est rendu muet`),
          mod(MODS.has(slug, 'deaf') ? 'Retirer la sourdine' : 'Mettre en sourdine sur le serveur', { a: 'deaf', on: !MODS.has(slug, 'deaf') }, MODS.has(slug, 'deaf') ? `${vocalName(slug)} entend de nouveau` : `${vocalName(slug)} est mis en sourdine`),
          inCall || there ? mod('Déconnecter', { a: 'kick' }, `${vocalName(slug)} est déconnecté du vocal`) : null,
          mod(`Exclure ${vocalName(slug)} (10 min)`, { a: 'timeout', min: 10 }, `${vocalName(slug)} est exclu 10 minutes`),
          mod(`Expulser ${vocalName(slug)} (1 h)`, { a: 'timeout', min: 60 }, `${vocalName(slug)} est expulsé pour 1 heure`),
          mod(`Bannir ${vocalName(slug)} (24 h)`, { a: 'timeout', min: 1440 }, `${vocalName(slug)} est banni pour 24 heures`, 'strong'),
          MODS.has(slug, 'timeout') ? mod('Lever l’exclusion', { a: 'untimeout' }, `Exclusion de ${vocalName(slug)} levée`) : null] : null,
      ];
    });
  }
  // ----- Modération du vocal et de la discussion : commandes envoyées au FIRE du membre -----
  // Ce que j'ai appliqué aux autres (pour afficher « Rendre la parole » au lieu de « Rendre muet »), gardé sur ce PC.
  const MODS = { st: load('fire.modsent', {}), has(slug, k) { const x = this.st[slug] || {}; return k === 'timeout' ? (x.until || 0) > Date.now() : !!x[k]; } };
  async function modDo(slug, cmd, label) {
    let ok = false;
    try { ok = await FV().modSend(slug, cmd); } catch (e) { ok = false; }
    if (ok) {
      const x = MODS.st[slug] = MODS.st[slug] || {};
      if (cmd.a === 'mute' || cmd.a === 'deaf') x[cmd.a] = !!cmd.on;
      if (cmd.a === 'timeout') x.until = Date.now() + cmd.min * 60000;
      if (cmd.a === 'untimeout') x.until = 0;
      save('fire.modsent', MODS.st);
      actLog('modo', label);
    }
    return ok;
  }
  // Les commandes reçues : seulement si elles viennent du créateur, d'un coach ou d'un modérateur.
  const MOD = { me: load('fire.mod', {}) };
  const isStaffSlug = (slug) => !!(coachOf(slug) || slug === 'coach' || (STF.modos || []).includes(slug) || ((S.cfg && S.cfg.admins) || []).some((a) => a.slug === slug));
  const modBlocked = () => (MOD.me.until || 0) > Date.now();
  function modReceive(from, c) {
    if (!isStaffSlug(from)) return;
    const who = vocalName(from);
    let v = null; try { v = FV().state(); } catch (e) { /* */ }
    if (c.a === 'move' && c.room) { const r = roomOf(c.room); if (v && v.on) { FV().leave(); setTimeout(() => vocalJoin(r.id), 600); } VX.room = r.id; save('fire.vocal.room', r.id); vocalToast(`${who} t’a déplacé vers ${r.name}`, true); }
    if (c.a === 'mute') { MOD.me.mute = c.on; if (c.on) FV().setMute(true); vocalToast(c.on ? `${who} t’a rendu muet` : `${who} t’a rendu la parole`, !c.on); }
    if (c.a === 'deaf') { MOD.me.deaf = c.on; if (c.on) FV().setDeaf(true); else FV().setDeaf(false); vocalToast(c.on ? `${who} t’a mis en sourdine` : `${who} a retiré ta sourdine`, !c.on); }
    if (c.a === 'kick') { if (v && v.on) FV().leave(); vocalToast(`${who} t’a déconnecté du vocal`, false); }
    if (c.a === 'timeout') { MOD.me.until = Date.now() + c.min * 60000; if (v && v.on) FV().leave(); popup('⛔ Exclusion', `${who} t’a exclu du vocal et de la discussion pour ${c.min >= 60 ? Math.round(c.min / 60) + ' h' : c.min + ' min'}.`, null); }
    if (c.a === 'untimeout') { MOD.me.until = 0; vocalToast(`${who} a levé ton exclusion`, true); }
    save('fire.mod', MOD.me);
    actLog('modo', `Reçu de ${who} : ${c.a}`);
    render();
  }
  // En vocal, fermer la fenêtre ne coupe pas l'appel : FIRE se range près de l'horloge (comme Discord).
  function voiceTrayInit() {
    const w = window.fire.win;
    if (!w || !w.inVoice) return;
    let last = null;
    try { FV().onChange(() => { const on = FV().isOn ? FV().isOn() : false; if (on !== last) { last = on; w.inVoice(on); } }); } catch (e) { /* */ }
    if (w.onLeaveVoice) w.onLeaveVoice(() => { try { FV().leave(); } catch (e) { /* */ } });
  }
  function modInit() {
    try {
      FV().onMod((from, c) => modReceive(from, c));
      // Rendu muet ou en sourdine par le staff : on ne peut pas se le retirer soi-même.
      FV().onChange(() => {
        if (!MOD.me.mute && !MOD.me.deaf && !modBlocked()) return;
        const v = FV().state();
        if (MOD.me.mute && !v.mute) FV().setMute(true);
        if (MOD.me.deaf && !v.deaf) FV().setDeaf(true);
        if (modBlocked() && v.on) FV().leave();
      });
    } catch (e) { /* vocal pas prêt */ }
  }
  // Quelqu'un demande le son de mon partage d'écran : je choisis.
  function soundAsk(from) {
    let zone = document.getElementById('vtoasts');
    if (!zone) { zone = h('div', { id: 'vtoasts' }); document.body.append(zone); }
    const t = h('div', { class: 'vtoast ask' }, h('span', { class: 'dot' }), h('span', null, `${vocalName(from)} voudrait entendre le son de ton stream.`),
      h('button', { class: 'vm-btn', onclick: () => { t.remove(); FV().addScreenSound(); } }, 'Partager le son'),
      h('button', { class: 'vs-btn', onclick: () => t.remove() }, 'Non'));
    zone.append(t);
    setTimeout(() => { if (t.isConnected) t.remove(); }, 25000);
  }
  function vocalToast(text, up) {
    let zone = document.getElementById('vtoasts');
    if (!zone) { zone = h('div', { id: 'vtoasts' }); document.body.append(zone); }
    const t = h('div', { class: 'vtoast' + (up ? ' up' : '') }, h('span', { class: 'dot' }), text);
    zone.append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
  }

  // ----- Clips instantanés -----
  // Réglages (sur ce PC) : activés ou non, durée, qualité, écran filmé.
  const clipCfg = () => ({ on: false, seconds: 30, quality: '1080p30', src: '', ...load('fire.clips', {}) });
  const CL = { list: [], sel: null, recv: {}, sending: {}, open: false };
  async function clipsApply() {
    const c = clipCfg();
    if (!window.FireClips || !window.fire.clips) return;
    FireClips.stop();
    if (!c.on) { syncKeys(true); return; }
    let src = c.src;
    if (!src && window.fire.screen) {
      const list = await window.fire.screen.sources().catch(() => []);
      const scr = (list || []).find((x) => x.screen);
      src = scr && scr.id;
    }
    if (!src) return;
    await FireClips.start({ sourceId: src, seconds: c.seconds, quality: c.quality, mic: () => FV().micStream() });
    syncKeys(true);
  }
  async function saveClip() {
    actLog('clip', 'Clip instantané enregistré');
    if (!window.FireClips) return;
    const st = FireClips.state();
    if (!st.on) { vocalToast('Les clips ne sont pas activés : Vocal › Paramètres › Clips instantanés', false); return; }
    const r = await FireClips.save().catch(() => null);
    if (!r) { vocalToast('Rien à enregistrer pour l’instant', false); return; }
    const res = await window.fire.clips.save(r.buf, {}).catch(() => null);
    try { FV().cue(true); } catch (e) { /* */ }
    if (res && res.ok) { vocalToast(`Clip enregistré · ${r.seconds} s`, true); clipsRefresh(); }
    else vocalToast('Clip impossible à enregistrer', false);
  }
  async function clipsRefresh() {
    CL.list = window.fire.clips ? await window.fire.clips.list().catch(() => []) : [];
    clipsPaint();
  }
  // Envoi d'un clip à tout le salon (pair à pair, par morceaux de 64 Ko).
  async function clipSend(c) {
    const v = FV().state();
    if (!v.on || !v.members.some((m) => m.ok)) return;
    const data = await window.fire.clips.read(c.path).catch(() => null);
    if (!data) { vocalToast('Clip introuvable', false); return; }
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const id = Math.random().toString(36).slice(2, 10), PART = 65536, n = Math.ceil(bytes.length / PART);
    CL.sending[c.path] = 0; clipsPaint();
    FV().appSend({ t: 'clip', op: 'start', id, size: bytes.length, n });
    for (let i = 0; i < n; i++) {
      FV().appSend({ t: 'clip', op: 'part', id, i, d: bytes.slice(i * PART, (i + 1) * PART).buffer });
      if (i % 8 === 7) { CL.sending[c.path] = Math.round((i + 1) / n * 100); clipsPaint(); await new Promise((r) => setTimeout(r, 40)); }
    }
    FV().appSend({ t: 'clip', op: 'end', id });
    delete CL.sending[c.path];
    vocalToast('Clip envoyé au salon', true); clipsPaint();
  }
  function clipRecv(from, m) {
    if (!m || !m.id || typeof m.id !== 'string') return;
    const k = from + ':' + m.id;
    if (m.op === 'start') { if (m.size > 0 && m.size <= 150 * 1024 * 1024 && m.n > 0 && m.n <= 3000) CL.recv[k] = { size: m.size, n: m.n, parts: [], got: 0 }; return; }
    const r = CL.recv[k]; if (!r) return;
    if (m.op === 'part' && Number.isInteger(m.i) && m.i >= 0 && m.i < r.n && m.d && !r.parts[m.i]) { r.parts[m.i] = new Uint8Array(m.d); r.got++; return; }
    if (m.op === 'end') {
      delete CL.recv[k];
      if (r.got !== r.n) return;
      const all = new Uint8Array(r.size); let o = 0;
      for (const p of r.parts) { if (o + p.length > r.size) return; all.set(p, o); o += p.length; }
      window.fire.clips.save(all.buffer, { from: vocalName(from) }).then((res) => {
        if (res && res.ok) { vocalToast(`${vocalName(from)} t’a envoyé un clip (Vocal › Mes clips)`, true); clipsRefresh(); }
      }).catch(() => {});
    }
  }

  // ===== Bibliothèque de clips (Vidéos › FIRE Clips) et clips automatiques =====
  // Clips auto : lus dans l'API locale officielle de Riot pendant la partie (rien dans la mémoire du jeu).
  // Comptent : tes kills et assists, les objectifs où tu participes (dragons, Nashor, Héraut, larves, Atakhan),
  // et une tour ou un inhibiteur seulement s'il y a eu un kill ou une assist de ta part juste avant (30 s).
  // Ne comptent pas : camps de la jungle, vagues, sorts d'invocateur (TP, ignite…) sans kill ni assist.
  const AC = { game: '', seen: new Set(), lastKA: -999, q: null, timer: null };
  const AC_OBJ = { DragonKill: 'Dragon', BaronKill: 'Nashor', HeraldKill: 'Héraut', HordeKill: 'Larves du Néant', AtakhanKill: 'Atakhan' };
  const AC_DRAG = { Fire: 'infernal', Earth: 'de montagne', Water: 'océanique', Air: 'des nuages', Hextech: 'hextech', Chemtech: 'chemtech', Elder: 'ancestral' };
  const AC_MULTI = { 2: 'Double kill', 3: 'Triple kill', 4: 'Quadra kill', 5: 'PENTAKILL' };
  function autoClipCheck(g) {
    const key = (g.players || []).map((p) => p.n).sort().join('|');
    const evs = g.events || [];
    if (AC.game !== key) { AC.game = key; AC.seen = new Set(evs.map((e) => e.id)); AC.lastKA = -999; return; } // ce qui s'est passé avant l'ouverture de FIRE n'est pas filmé
    const c = clipCfg();
    for (const e of evs) {
      if (AC.seen.has(e.id)) continue;
      AC.seen.add(e.id);
      if (!e.part) continue;
      let kind = null, lab = null;
      if (e.kind === 'ChampionKill') { AC.lastKA = e.t; kind = e.part; lab = e.part === 'kill' ? 'Kill' : 'Assist'; }
      else if (e.kind === 'Multikill' && e.part === 'kill' && AC_MULTI[e.streak]) { kind = 'kill'; lab = AC_MULTI[e.streak]; }
      else if (e.kind === 'Ace' && e.part === 'kill') { kind = 'kill'; lab = 'Ace'; }
      else if (AC_OBJ[e.kind]) { kind = 'objectif'; lab = e.kind === 'DragonKill' && AC_DRAG[e.dragon] ? (e.dragon === 'Elder' ? 'Dragon ancestral' : 'Dragon ' + AC_DRAG[e.dragon]) : AC_OBJ[e.kind]; if (e.stolen) lab += ' volé'; }
      else if ((e.kind === 'TurretKilled' || e.kind === 'InhibKilled') && e.t - AC.lastKA <= 30) { kind = 'tour'; lab = e.kind === 'TurretKilled' ? 'Tour' : 'Inhibiteur'; }
      if (!kind || !c.on || c.auto === false) continue;
      autoClipQueue(kind, lab, g);
    }
  }
  // Un combat = un seul clip : on attend 7 s de calme après le dernier moment fort (sans dépasser la durée du clip).
  function autoClipQueue(kind, lab, g) {
    const now = Date.now();
    if (!AC.q) AC.q = { first: now, labs: [], kinds: [], g };
    AC.q.labs.push(lab); AC.q.kinds.push(kind); AC.q.g = g;
    clearTimeout(AC.timer);
    const maxWait = Math.max(5000, (clipCfg().seconds - 8) * 1000);
    AC.timer = setTimeout(autoClipSave, Math.max(0, Math.min(7000, AC.q.first + maxWait - now)));
  }
  function autoClipLabel(labs) {
    const n = (x) => labs.filter((l) => l === x).length;
    const multi = ['PENTAKILL', 'Quadra kill', 'Triple kill', 'Double kill'].find((m) => labs.includes(m));
    const parts = [];
    if (multi) parts.push(multi); else if (n('Kill')) parts.push(n('Kill') > 1 ? `${n('Kill')} kills` : 'Kill');
    if (n('Assist')) parts.push(n('Assist') > 1 ? `${n('Assist')} assists` : 'Assist');
    if (labs.includes('Ace')) parts.push('Ace');
    parts.push(...new Set(labs.filter((l) => !['Kill', 'Assist', 'Ace', 'PENTAKILL', 'Quadra kill', 'Triple kill', 'Double kill'].includes(l))));
    return parts.join(' + ');
  }
  async function autoClipSave() {
    const q = AC.q; AC.q = null;
    if (!q || !window.FireClips || !window.fire.clips || !FireClips.state().on) return;
    const r = await FireClips.save().catch(() => null);
    if (!r) return;
    const label = autoClipLabel(q.labs);
    const kind = ['objectif', 'kill', 'tour', 'assist'].find((k) => q.kinds.includes(k)) || 'kill';
    const me = (q.g.players || []).find((p) => p.n === q.g.me) || {};
    const res = await window.fire.clips.save(r.buf, { auto: true, kind, label, champ: me.c || '', mode: gameModeLabel(q.g) }).catch(() => null);
    if (res && res.ok) { actLog('clip', 'Clip automatique : ' + label); vocalToast(`🎬 Clip auto : ${label}`, true); clipsRefresh(); }
  }

  const CLIP_KINDS = [['tous', 'Tous'], ['auto', '⚡ Automatiques'], ['kill', '⚔️ Kills'], ['assist', '🤝 Assists'], ['objectif', '🐉 Objectifs'], ['tour', '🏰 Tours'], ['manuel', '🎬 Manuels'], ['recu', '📨 Reçus']];
  const CLB = { filter: 'tous', champ: '', n: 24 };
  const clipKind = (c) => (c.meta && c.meta.kind) || (/ de [^ ]+ \d{4}-/.test(c.name) ? 'recu' : 'manuel');
  const clipTitle = (c) => (c.meta && c.meta.label) || (clipKind(c) === 'recu' ? 'Clip reçu' + (c.meta && c.meta.from ? ' de ' + c.meta.from : '') : 'Clip manuel');
  function clipsPaint() { if (CL.open) clipsModal(); if (S.section === 'clips' && !typing()) renderClipsPage(); }
  function renderClipsPage() {
    const view = $('view');
    if (!CL.loaded) { CL.loaded = true; clipsRefresh(); }
    const c = clipCfg();
    const st = window.FireClips ? FireClips.state() : { on: false };
    const v = FV().state();
    const others = v.on && v.members.some((m) => m.ok);
    const upd = (patch) => { save('fire.clips', { ...c, ...patch }); clipsApply().then(() => renderClipsPage()); renderClipsPage(); };
    const champs = [...new Set(CL.list.map((x) => x.meta && x.meta.champ).filter(Boolean))].sort();
    const list = CL.list.filter((x) => (CLB.filter === 'tous' || (CLB.filter === 'auto' ? x.meta && x.meta.auto : clipKind(x) === CLB.filter)) && (!CLB.champ || (x.meta && x.meta.champ) === CLB.champ));
    const sel = CL.list.find((x) => x.path === CL.sel);
    const mb = (b) => (b / 1048576).toFixed(1).replace('.', ',') + ' Mo';
    const when = (t) => new Date(t).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🎬'), h('div', null, h('h1', { class: 'title' }, 'Clips'),
      h('p', { class: 'muted' }, 'Tes meilleurs moments, enregistrés par FIRE pendant tes games. Rangés dans Vidéos › FIRE Clips, sur ton PC.')));
    const cfg = h('div', { class: 'card clb-cfg' },
      h('label', { class: 'vs-sw' }, h('span', null, h('b', null, 'Enregistrement continu'), h('small', null, `FIRE garde en mémoire les ${c.seconds} dernières secondes de ton écran, du son du jeu et du vocal. Rien n’est écrit tant qu’il n’y a pas de clip.`)),
        h('input', { type: 'checkbox', class: 'vs-tog', checked: c.on ? true : null, onchange: (e) => upd({ on: e.target.checked }) })),
      h('label', { class: 'vs-sw' }, h('span', null, h('b', null, 'Clips automatiques'), h('small', null, 'Un clip à chaque kill ou assist, à chaque objectif où tu participes (dragon, Nashor, Héraut, larves, Atakhan) et à chaque tour ou inhibiteur pris juste après un kill ou une assist. Pas les camps de la jungle, ni les vagues, ni un TP ou un ignite sans kill. Un combat entier = un seul clip.')),
        h('input', { type: 'checkbox', class: 'vs-tog', checked: c.auto !== false ? true : null, onchange: (e) => upd({ auto: e.target.checked }) })),
      h('div', { class: 'row clb-row' },
        h('label', { class: 'clb-f' }, h('span', { class: 'muted small' }, 'Durée'), h('select', { class: 'inp', onchange: (e) => upd({ seconds: Number(e.target.value) }) },
          [[15, '15 s'], [30, '30 s'], [60, '1 min'], [90, '1 min 30']].map(([n, t]) => h('option', { value: n, selected: c.seconds === n ? true : null }, t)))),
        h('label', { class: 'clb-f' }, h('span', { class: 'muted small' }, 'Qualité'), h('select', { class: 'inp', onchange: (e) => upd({ quality: e.target.value }) },
          [['1080p30', '1080p 30 i/s'], ['1080p60', '1080p 60 i/s'], ['720p30', '720p 30 i/s']].map(([k, t]) => h('option', { value: k, selected: c.quality === k ? true : null }, t)))),
        h('span', { class: 'muted small clb-key' }, `Clip à la main : ${keyTxt(vkeys().clip)}`),
        h('span', { class: 'clb-state ' + (st.on ? 'on' : '') }, st.on ? '● Enregistrement en cours' : st.err ? '⚠ ' + st.err : '○ En pause'),
        h('button', { class: 'btn-ghost', onclick: () => window.fire.clips.show() }, '📂 Ouvrir le dossier')));
    const filters = h('div', { class: 'row clb-filters' },
      CLIP_KINDS.map(([k, l]) => { const n = k === 'tous' ? CL.list.length : CL.list.filter((x) => (k === 'auto' ? x.meta && x.meta.auto : clipKind(x) === k)).length;
        return (n || k === 'tous') ? h('button', { class: 'chip', 'aria-pressed': String(CLB.filter === k), onclick: () => { CLB.filter = k; CLB.n = 24; renderClipsPage(); } }, `${l} · ${n}`) : null; }),
      champs.length ? h('select', { class: 'inp clb-champ', onchange: (e) => { CLB.champ = e.target.value; renderClipsPage(); } }, h('option', { value: '' }, 'Tous les champions'),
        champs.map((x) => h('option', { value: x, selected: CLB.champ === x ? true : null }, FC.champName(x)))) : null);
    const player = sel ? h('div', { class: 'card clb-player' },
      h('video', { src: sel.url, controls: '', autoplay: '', preload: 'auto' }),
      h('div', { class: 'clb-ph' }, sel.meta && sel.meta.champ ? champIcon(sel.meta.champ, 32) : null,
        h('div', null, h('b', null, clipTitle(sel)), h('div', { class: 'muted small' }, [when(sel.t), sel.meta && sel.meta.mode, mb(sel.size)].filter(Boolean).join(' · '))),
        h('div', { class: 'row clb-act' },
          others ? h('button', { class: 'btn-fire small-btn', disabled: CL.sending[sel.path] != null ? true : null, onclick: () => clipSend(sel) }, CL.sending[sel.path] != null ? `Envoi… ${CL.sending[sel.path]} %` : '📨 Envoyer au salon') : null,
          h('button', { class: 'btn-ghost', onclick: () => window.fire.clips.show(sel.path) }, 'Afficher dans le dossier'),
          h('button', { class: 'btn-ghost', onclick: async () => {
            if (CL.confirm !== sel.path) { CL.confirm = sel.path; renderClipsPage(); return; }
            CL.confirm = null; await window.fire.clips.del(sel.path); CL.sel = null; clipsRefresh();
          } }, CL.confirm === sel.path ? 'Confirmer la suppression' : '🗑 Supprimer'),
          h('button', { class: 'btn-ghost', title: 'Fermer', onclick: () => { CL.sel = null; renderClipsPage(); } }, '✕'))),
      !others ? h('p', { class: 'muted small' }, 'Pour l’envoyer à l’équipe, rejoins le salon vocal : ceux qui y sont le reçoivent directement.') : null) : null;
    const grid = list.length ? h('div', { class: 'clb-grid' }, list.slice(0, CLB.n).map((x) => h('button', { class: 'clb-card' + (CL.sel === x.path ? ' on' : ''), onclick: () => { CL.sel = x.path; CL.confirm = null; renderClipsPage(); view.scrollTop = 0; window.scrollTo(0, 0); } },
      h('div', { class: 'clb-thumb' }, h('video', { src: x.url + '#t=2', preload: 'metadata', muted: '', onmouseenter: (e) => { e.target.muted = true; e.target.play().catch(() => {}); }, onmouseleave: (e) => e.target.pause() }),
        x.meta && x.meta.auto ? h('span', { class: 'clb-auto' }, '⚡ Auto') : null,
        x.meta && x.meta.champ ? h('span', { class: 'clb-champ-ico' }, champIcon(x.meta.champ, 26)) : null),
      h('b', null, clipTitle(x)), h('small', { class: 'muted' }, [when(x.t), x.meta && x.meta.mode].filter(Boolean).join(' · ')))))
      : h('div', { class: 'card' }, h('p', { class: 'muted' }, CL.list.length ? 'Aucun clip avec ce filtre.' : c.on ? `Aucun clip pour l’instant. Lance une game : ${c.auto !== false ? 'tes kills, assists et objectifs seront filmés tout seuls, et ' : ''}${keyTxt(vkeys().clip)} garde les ${c.seconds} dernières secondes.` : 'Active l’enregistrement continu ci-dessus pour que FIRE filme tes meilleurs moments.'));
    view.replaceChildren(...[hero, cfg, player, filters, grid,
      list.length > CLB.n ? h('div', { class: 'more-row' }, h('button', { class: 'btn-ghost', onclick: () => { CLB.n += 24; renderClipsPage(); } }, `Voir plus (${list.length - CLB.n})`)) : null].filter(Boolean));
  }

  function clipsModal() {
    let el = document.getElementById('clips');
    if (!CL.open) { if (el) el.remove(); return; }
    if (!el) { el = h('div', { id: 'clips', onclick: (e) => { if (e.target === el) { CL.open = false; clipsModal(); } } }); document.body.append(el); }
    const v = FV().state();
    const st = window.FireClips ? FireClips.state() : { on: false };
    const others = v.on && v.members.some((m) => m.ok);
    const sel = CL.list.find((c) => c.path === CL.sel) || CL.list[0];
    const mb = (b) => (b / 1048576).toFixed(1).replace('.', ',') + ' Mo';
    const when = (t) => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    el.replaceChildren(h('div', { class: 'clips-box' },
      h('div', { class: 'clips-head' }, h('h2', null, vi('clip'), 'Mes clips'),
        h('span', { class: 'muted small' }, st.on ? `Enregistrement continu · ${keyTxt(vkeys().clip)} pour garder les ${clipCfg().seconds} dernières secondes` : 'Clips désactivés : Vocal › Paramètres › Clips instantanés'),
        h('button', { class: 'btn-ghost', onclick: () => window.fire.clips.show() }, 'Ouvrir le dossier'),
        h('button', { class: 'btn-ghost', title: 'Fermer', onclick: () => { CL.open = false; clipsModal(); } }, vi('x'))),
      !CL.list.length ? h('p', { class: 'muted clips-empty' }, st.on ? `Aucun clip pour l’instant. Pendant une game, appuie sur ${keyTxt(vkeys().clip)} : les ${clipCfg().seconds} dernières secondes (écran, son du jeu et vocal) sont enregistrées.` : 'Aucun clip pour l’instant.')
        : h('div', { class: 'clips-body' },
          h('div', { class: 'clips-list' }, CL.list.map((c) => h('button', { class: 'clips-item' + (sel && c.path === sel.path ? ' on' : ''), onclick: () => { CL.sel = c.path; clipsModal(); } },
            h('b', null, c.name.replace(/\.mp4$/i, '')), h('span', { class: 'muted small' }, `${when(c.t)} · ${mb(c.size)}`)))),
          sel ? h('div', { class: 'clips-view' },
            h('video', { src: sel.url, controls: '', preload: 'metadata' }),
            h('div', { class: 'row' },
              others ? h('button', { class: 'btn-fire small-btn', disabled: CL.sending[sel.path] != null ? true : null, onclick: () => clipSend(sel) }, CL.sending[sel.path] != null ? `Envoi… ${CL.sending[sel.path]} %` : 'Envoyer au salon') : null,
              h('button', { class: 'btn-ghost', onclick: () => window.fire.clips.show(sel.path) }, 'Afficher dans le dossier'),
              h('button', { class: 'btn-ghost', onclick: async () => {
                if (CL.confirm !== sel.path) { CL.confirm = sel.path; clipsModal(); return; }
                CL.confirm = null; await window.fire.clips.del(sel.path); CL.sel = null; clipsRefresh();
              } }, CL.confirm === sel.path ? 'Confirmer la suppression' : 'Supprimer')),
            !others ? h('p', { class: 'muted small' }, 'Pour l’envoyer à l’équipe, rejoins le salon vocal : ceux qui y sont le reçoivent directement.') : null) : null)));
  }
  function openClips() { VX.drawer = false; go('clips'); }
  // Menu « ⋯ » du salon : inviter, affichage, réglages.
  function vocalMenu(v, tilesAll) {
    const me = vocalMe();
    const inCall = new Set([me].concat(v.members.filter((m) => m.ok).map((m) => m.slug)));
    const others = vocalIds().filter((x) => !inCall.has(x) && (x !== 'coach' || true));
    const stTxt = { ok: '✓ invité', off: 'FIRE fermé', wait: 'déjà invité', go: '…' };
    const doInvite = async (x) => { VX.inv[x] = 'go'; renderVocal(); VX.inv[x] = await FV().invite(x); renderVocal(); };
    const chk = (label, on, fn) => h('button', { class: 'vm-item', onclick: () => { fn(!on); renderVocal(); } }, h('span', null, label), h('span', { class: 'vm-box' + (on ? ' on' : '') }, on ? vi('check') : null));
    const layout = load('fire.vocal.layout', 'grid');
    return h('div', { class: 'vm', onclick: (e) => e.stopPropagation() },
      VX.invOpen
        ? h('div', null,
          h('button', { class: 'vm-item head', onclick: () => { VX.invOpen = false; renderVocal(); } }, h('span', null, '‹ Inviter dans le salon vocal')),
          !others.length ? h('p', { class: 'vm-note' }, 'Toute l’équipe est déjà là.') : null,
          others.map((x) => h('div', { class: 'vm-inv' }, h('span', { class: 'vc-av mini' }, ini(x)), h('span', { class: 'vm-n' }, vocalName(x)),
            VX.inv[x] ? h('span', { class: 'vm-st ' + VX.inv[x] }, stTxt[VX.inv[x]]) : h('button', { class: 'vm-btn', onclick: () => doInvite(x) }, 'Inviter'))),
          others.length > 1 ? h('button', { class: 'vm-item', onclick: () => others.filter((x) => !VX.inv[x]).forEach(doInvite) }, h('span', null, 'Inviter tout le monde')) : null,
          h('p', { class: 'vm-note' }, 'Ils reçoivent une notification Windows, si FIRE est ouvert chez eux.'))
        : h('div', null,
          h('button', { class: 'vm-item', onclick: () => { VX.invOpen = true; renderVocal(); } }, h('span', { class: 'vm-ico' }, vi('invite'), 'Inviter dans le salon vocal'), h('span', { class: 'muted' }, '›')),
          h('div', { class: 'vm-sep' }),
          chk('Affichage en grille', layout !== 'focus', (on) => { save('fire.vocal.layout', on ? 'grid' : 'focus'); if (on) VX.focus = null; }),
          chk('Afficher ma caméra', load('fire.vocal.selfcam', true), (on) => save('fire.vocal.selfcam', on)),
          chk('Contour vert sur un partage d’écran quand son auteur parle', load('fire.vocal.screenring', false), (on) => save('fire.vocal.screenring', on)),
          chk('Caméra incrustée sur le partage d’écran (pas en plein écran)', load('fire.vocal.pip', false), (on) => save('fire.vocal.pip', on)),
          chk('Afficher les participants sans vidéo', load('fire.vocal.novideo', true), (on) => save('fire.vocal.novideo', on)),
          chk('Afficher les arrivées et départs', load('fire.vocal.toasts', true), (on) => save('fire.vocal.toasts', on)),
          h('div', { class: 'vm-sep' }),
          h('button', { class: 'vm-item', onclick: () => { VX.more = false; openClips(); renderVocal(); } }, h('span', { class: 'vm-ico' }, vi('clip'), 'Mes clips')),
          h('button', { class: 'vm-item', onclick: () => { VX.more = false; VX.drawer = true; renderVocal(); } }, h('span', { class: 'vm-ico' }, vi('gear'), 'Paramètres vocaux et vidéo'))));
  }

  // ----- Réglages (panneau latéral) -----
  function clipSettings() {
    const c = clipCfg();
    const st = window.FireClips ? FireClips.state() : { on: false };
    const upd = (patch) => { save('fire.clips', { ...c, ...patch }); clipsApply().then(() => renderVocal()); renderVocal(); };
    if (!VX.clipSrcs && window.fire.screen) { VX.clipSrcs = []; window.fire.screen.sources().then((l) => { VX.clipSrcs = (l || []).filter((x) => x.screen); if (S.section === 'vocal' && VX.drawer) renderVocal(); }).catch(() => {}); }
    const field = (lab, ...kids) => h('div', { class: 'vs-field' }, h('label', null, lab), ...kids);
    return h('section', { class: 'vs-sec' }, h('h3', null, vi('clip'), 'Clips instantanés'),
      h('label', { class: 'vs-sw' }, h('span', null, h('b', null, 'Enregistrer en continu'), h('small', null, `Au raccourci (${keyTxt(vkeys().clip)}), les dernières secondes deviennent une vidéo : ton écran, le son du jeu, les voix du salon et la tienne. Rien n’est gardé tant que tu n’appuies pas.`)),
        h('input', { type: 'checkbox', class: 'vs-tog', checked: c.on ? true : null, onchange: (e) => upd({ on: e.target.checked }) })),
      field('Durée du clip', h('select', { class: 'inp', onchange: (e) => upd({ seconds: Number(e.target.value) }) },
        [[15, '15 secondes'], [30, '30 secondes'], [60, '1 minute'], [90, '1 min 30']].map(([n, t]) => h('option', { value: n, selected: c.seconds === n ? true : null }, t)))),
      field('Qualité', h('select', { class: 'inp', onchange: (e) => upd({ quality: e.target.value }) },
        [['1080p30', '1080p · 30 images/s (recommandé)'], ['1080p60', '1080p · 60 images/s'], ['720p30', '720p · 30 images/s (PC modeste)']].map(([k, t]) => h('option', { value: k, selected: c.quality === k ? true : null }, t)))),
      (VX.clipSrcs || []).length > 1 ? field('Écran filmé', h('select', { class: 'inp', onchange: (e) => upd({ src: e.target.value }) },
        h('option', { value: '' }, 'Écran principal'), VX.clipSrcs.map((x) => h('option', { value: x.id, selected: c.src === x.id ? true : null }, x.name)))) : null,
      h('p', { class: 'vs-hint' }, st.err ? 'Problème : ' + st.err + '.' : st.on ? `En cours : ${st.w}×${st.h}, encodé par la carte graphique. Les clips vont dans Vidéos › FIRE Clips.` : 'Les clips vont dans Vidéos › FIRE Clips.'),
      h('button', { class: 'vs-btn', onclick: openClips }, 'Voir mes clips'));
  }
  function vocalSettings(v) {
    const c = v.cfg, D = VX.dev || { mics: [], outs: [], cams: [] };
    const set = (k) => (e) => FV().setCfg({ [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? Number(e.target.value) : e.target.value });
    const done = (e) => e.target.blur();
    const sel = (k, list, def, lab) => h('select', { class: 'inp', onchange: (e) => { set(k)(e); done(e); } }, h('option', { value: '' }, def),
      list.map((d, i) => h('option', { value: d.deviceId, selected: c[k] === d.deviceId ? true : null }, d.label || `${lab} ${i + 1}`)));
    const sw = (k, label, hint) => h('label', { class: 'vs-sw' }, h('span', null, h('b', null, label), hint ? h('small', null, hint) : null),
      h('input', { type: 'checkbox', class: 'vs-tog', checked: c[k] ? true : null, onchange: (e) => { set(k)(e); done(e); } }));
    const pct = (val) => Math.round(val * 100) + ' %';
    const range = (k, min, max, step, fmt) => { const out = h('span', { class: 'vs-rv' }, fmt(c[k]));
      return h('div', { class: 'vs-range' }, h('input', { type: 'range', min, max, step, value: c[k], onchange: done, oninput: (e) => { out.textContent = fmt(Number(e.target.value)); set(k)(e); } }), out); };
    const field = (lab, ...kids) => h('div', { class: 'vs-field' }, h('label', null, lab), ...kids);
    const gateMark = c.vad === 'manual' ? h('div', { class: 'vc-meter-mark', style: `left:${Math.min(100, (c.gate || 0) / 0.6)}%` }) : null;
    const K = vkeys();
    const bad = VX.keyBad || [];
    // Profil d'entrée (comme Discord) : Isolement de la voix (tous les filtres), Studio (aucun traitement), Personnalisé.
    const PROFILES = {
      iso: { ai: true, ns: true, ec: true, agc: false, hp: true, clarity: true, keys: true, vad: 'auto' },
      studio: { ai: false, ns: false, ec: false, agc: false, hp: false, clarity: false, keys: false, vad: 'off' },
    };
    const prof = c.profile || 'iso';
    const setProf = (k) => { FV().setCfg(k === 'custom' ? { profile: 'custom' } : { profile: k, ...PROFILES[k] }); renderVocal(); };
    const profRow = (k, t, d) => h('label', { class: 'vs-prof' + (prof === k ? ' on' : '') }, h('input', { type: 'radio', name: 'vsprof', checked: prof === k ? true : null, onchange: () => setProf(k) }),
      h('span', null, h('b', null, t), h('small', null, d)));
    const S2 = {
      voix: [h('section', { class: 'vs-sec' }, h('h3', null, vi('mic'), 'Micro'),
        field('Appareil', sel('mic', D.mics, 'Micro par défaut de Windows', 'Micro')),
        field('Volume du micro', range('gain', 0, 2, 0.05, pct)),
        h('div', { class: 'vc-meter' }, h('div', { class: 'vc-meter-fill' }), gateMark),
        field('Détection de la voix', h('select', { class: 'inp', onchange: (e) => { FV().setCfg({ vad: e.target.value }); done(e); renderVocal(); } },
          [['auto', 'Automatique (recommandé)'], ['manual', 'Seuil manuel'], ['off', 'Désactivée : micro toujours ouvert']].map(([k, t]) => h('option', { value: k, selected: (c.vad || 'auto') === k ? true : null }, t)))),
        c.vad === 'manual' ? field('Seuil', range('gate', 0, 60, 1, (x) => `${x - 60} dB`)) : null,
        h('p', { class: 'vs-hint' }, c.vad === 'manual' ? 'La barre doit dépasser le trait orange quand tu parles, et rester dessous quand tu tapes au clavier.'
          : c.vad === 'off' ? 'Tout ce que capte ton micro est envoyé, même entre tes phrases.'
            : 'FIRE n’ouvre ton micro que quand il reconnaît TA voix : il apprend ton niveau en quelques phrases, et ignore les voix au fond de la pièce, le clavier, la souris et les coups sur le micro ou le bureau. Une fois ouvert, il reste ouvert tant que tu parles.'),
        sw('ai', 'Suppression du bruit par IA', v.ai ? 'Active : efface clavier, souris, ventilateur pendant que tu parles.' : 'Efface clavier, souris, ventilateur pendant que tu parles (RNNoise).'),
        h('button', { class: 'vs-btn' + (v.monitor ? ' on' : ''), onclick: () => FV().setMonitor(!v.monitor) }, v.monitor ? '⏹ Arrêter le test' : '🎧 Tester mon micro (tu t’entends)'),
        v.on ? h('p', { class: 'vs-hint' }, v.monitor ? '🔇 Pendant le test, ton micro et ton casque sont coupés pour le salon. Ils reviennent comme avant à la fin du test.' : 'En plein appel, le test coupe ton micro et ton casque pour le salon, le temps du test.') : null),
      h('section', { class: 'vs-sec' }, h('h3', null, vi('vol'), 'Profil d’entrée audio'),
        profRow('iso', 'Isolement de la voix', 'Rien que ta voix : FIRE retire le bruit, le clavier, l’écho et les voix au fond de la pièce (recommandé).'),
        profRow('studio', 'Studio', 'Son pur : micro ouvert sans aucun traitement (micro de qualité, pièce calme).'),
        profRow('custom', 'Personnalisé', 'Mode avancé : tu règles chaque filtre toi-même.')),
      prof !== 'custom' ? null : h('section', { class: 'vs-sec' }, h('h3', null, vi('vol'), 'Traitement de la voix'),
        sw('clarity', 'Voix claire', 'Moins de résonance et d’écho de la pièce, plus d’articulation, volume régulier.'),
        sw('keys', 'Anti-clavier', 'Les clics de touches perdent leur bruit sec, même pendant que tu parles. Ta voix n’est jamais coupée.'),
        sw('ns', 'Réduction de bruit', 'Ventilateur, clavier, bruits de fond.'),
        sw('ec', 'Annulation d’écho', 'Indispensable sur haut-parleurs.'),
        sw('agc', 'Gain automatique', 'Ta voix garde le même volume.'),
        sw('hp', 'Filtre anti-souffle', 'Coupe les sons très graves.')),
      ],
      sortie: [h('section', { class: 'vs-sec' }, h('h3', null, vi('head'), 'Casque / haut-parleurs'),
        field('Sortie', sel('out', D.outs, 'Sortie par défaut de Windows', 'Sortie')),
        field('Volume général du salon', range('outVol', 0, 1, 0.05, pct)),
        sw('sounds', 'Sons d’arrivée et de départ', 'Quand quelqu’un rejoint ou quitte.')),
      ],
      video: [h('section', { class: 'vs-sec' }, h('h3', null, vi('cam'), 'Caméra et écran'),
        field('Caméra', sel('cam', D.cams, 'Caméra par défaut', 'Caméra')),
        field('Qualité des streams que je regarde', h('select', { class: 'inp', onchange: (e) => { FV().setCfg({ recvQ: e.target.value }); done(e); } },
          [['auto', 'Auto : s’adapte à ma connexion (recommandé)'], ['high', 'Haute : la meilleure image possible'], ['medium', 'Moyenne : 720p, 30 images/s max'], ['low', 'Petite connexion : 480p, très peu de retard']].map(([k, t]) =>
            h('option', { value: k, selected: (c.recvQ || 'auto') === k ? true : null }, t)))),
        h('p', { class: 'vs-hint' }, 'Chaque spectateur reçoit sa propre image : la qualité baisse seulement pour toi si ta connexion est petite, pas pour les autres.'),
        sw('streamSound', 'Entendre le son des streams', 'Quand quelqu’un partage le son de son PC. Tu peux aussi le couper stream par stream (bouton 🔊 sur la vidéo).'),
        field('Qualité de mon partage d’écran', h('select', { class: 'inp', onchange: (e) => { FV().setCfg({ screenFps: Number(e.target.value) }); done(e); } },
          [[15, 'Net · 15 images/s (texte, replays)'], [30, 'Fluide · 30 images/s'], [60, 'Ultra fluide · 60 images/s'], [120, 'Maximum · 120 images/s (fibre)']].map(([n, t]) =>
            h('option', { value: n, selected: (c.screenFps || 15) === n ? true : null }, t)))),
        h('label', { class: 'vs-sw' }, h('span', null, h('b', null, 'Rejoindre au lancement de FIRE'), h('small', null, 'Tu arrives directement dans le salon.')),
          h('input', { type: 'checkbox', class: 'vs-tog', checked: load('fire.vocal.auto', false) ? true : null, onchange: (e) => { save('fire.vocal.auto', e.target.checked); done(e); } }))),
      ],
      clips: [clipSettings()],
      keys: [h('section', { class: 'vs-sec' }, h('h3', null, vi('keys'), 'Raccourcis clavier'),
        h('p', { class: 'vs-hint' }, 'Ils marchent partout, même en pleine partie. Un petit bip confirme chaque changement. Clique sur un raccourci pour le changer.'),
        Object.keys(VKEY_DEF).map((a) => h('div', { class: 'vs-key' + (bad.includes(a) ? ' bad' : '') },
          h('span', null, VKEY_LAB[a], bad.includes(a) ? h('small', null, 'déjà pris par une autre app : choisis-en un autre') : null),
          h('button', { class: 'vs-kbd' + (VX.rec === a ? ' rec' : ''), onclick: () => (VX.rec ? null : recordKey(a)) }, VX.rec === a ? 'Appuie sur ta combinaison…' : keyTxt(K[a])))),
        VX.recMsg ? h('p', { class: 'bad small' }, VX.recMsg) : null,
        h('p', { class: 'vs-hint' }, 'Échap annule, Retour arrière efface. ', h('button', { class: 'linkbtn small', onclick: () => { save('fire.vocal.keys', {}); syncKeys(true); renderVocal(); } }, 'Remettre les raccourcis par défaut')))],
    };
    // Menu à gauche (comme les paramètres de Discord), la catégorie choisie à droite.
    const CATS = [['voix', 'mic', 'Voix'], ['sortie', 'head', 'Casque et sons'], ['video', 'cam', 'Caméra et streaming'], ['clips', 'clip', 'Clips instantanés'], ['keys', 'keys', 'Raccourcis clavier']];
    const cur = S2[VX.setTab] ? VX.setTab : 'voix';
    return h('div', { class: 'vs-body vs-split' },
      h('nav', { class: 'vs-nav' }, h('p', { class: 'vs-nav-t' }, 'Voix et vidéo'),
        CATS.map(([k, ic, t]) => h('button', { class: 'vs-nav-b' + (cur === k ? ' on' : ''), onclick: () => { VX.setTab = k; renderVocal(); } }, vi(ic), t))),
      h('div', { class: 'vs-content' }, h('h2', { class: 'vs-title' }, (CATS.find((x) => x[0] === cur) || [])[2]), ...S2[cur].filter(Boolean)));
  }

  // ----- Le salon : scène (vidéos et participants), barre de contrôle, réglages -----
  function renderVocal() {
    const view = $('view');
    vocalBar();
    if (!window.FireVoice || !window.Peer) { view.replaceChildren(h('div', { class: 'card' }, h('p', { class: 'bad' }, '⚠ Le module vocal n’est pas chargé. Réinstalle la dernière version de FIRE.'))); return; }
    const v = FV().state();
    const me = vocalMe();
    if (!me) { view.replaceChildren(h('div', { class: 'vc-lobby' }, h('div', { class: 'vc-lobby-in' }, h('h1', null, 'Salon vocal'), h('p', { class: 'muted' }, 'Choisis d’abord ton pseudo (en haut, « Qui es-tu ? ») pour entrer dans le salon.')))); return; }
    if (!VX.dev) { VX.dev = { mics: [], outs: [], cams: [] }; FV().devices().then((d) => { VX.dev = d; if (S.section === 'vocal') { if (typing()) VX.pending = true; else renderVocal(); } }); }
    const playerOf = (slug) => S.players.find((x) => x.slug === slug) || {};
    const K = vkeys();
    const drawer = VX.drawer ? h('div', { class: 'vs-drawer-wrap vs-modal', onclick: (e) => { if (e.target.classList.contains('vs-drawer-wrap')) { VX.drawer = false; renderVocal(); } } },
      h('aside', { class: 'vs-drawer' },
        h('div', { class: 'vs-head' }, h('b', null, 'Réglages voix et vidéo'), h('button', { class: 'vs-x', title: 'Fermer', onclick: () => { VX.drawer = false; renderVocal(); } }, vi('x'))),
        vocalSettings(v))) : null;
    const gearBtn = (cls) => h('button', { class: cls, title: 'Réglages voix et vidéo', onclick: () => { VX.drawer = true; renderVocal(); } }, vi('gear'));

    // Avant d'entrer : le hall.
    if (!v.on) {
      const p = playerOf(me);
      const f = (p.fonds || [])[0];
      view.replaceChildren(...[h('div', { class: 'vc-lobby' },
        f ? h('div', { class: 'vc-lobby-bg', style: `background-image:url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${f.champ}_${f.skin}.jpg')` }) : null,
        h('div', { class: 'vc-lobby-in' },
          h('div', { class: 'vc-live-pill' }, h('span', { class: 'dot' }), 'Salons vocaux FIRE'),
          h('h1', null, 'Salon vocal'),
          h('p', { class: 'muted' }, 'Choisis ton salon : toute l’équipe, un duo, ou un coaching en tête-à-tête. Voix, caméra et écran passent directement d’un PC à l’autre, chiffrés.'),
          h('div', { class: 'vc-rooms' }, ROOMS.filter(roomOk).map((r) => {
            const there = roomPeople(r.id);
            const full = r.max && there.length >= r.max;
            const sel = (VX.room || load('fire.vocal.room', 'equipe')) === r.id;
            return h('button', { class: 'vr-card' + (sel ? ' sel' : '') + (full ? ' full' : '') + (there.length ? ' busy' : ''), onclick: () => { VX.room = r.id; save('fire.vocal.room', r.id); VX.roomErr = ''; renderVocal(); }, ondblclick: () => vocalJoin(r.id) },
              h('span', { class: 'vr-ico' }, r.ico),
              h('span', { class: 'vr-t' }, h('b', null, r.name), h('small', null, there.length ? `${there.length}${r.max ? '/' + r.max : ''} en ligne` : r.sub)),
              h('span', { class: 'vr-av' }, there.slice(0, 4).map((x) => h('span', { class: 'vc-av mini', title: vocalName(x) }, ini(x)))),
              full ? h('span', { class: 'vr-full' }, 'Complet') : null);
          })),
          canManageSalons() ? h('button', { class: 'linkbtn small vc-manage', onclick: openSalons }, '⚙️ Gérer les salons (coach et chef d’équipe)') : null,
          VX.roomErr ? h('p', { class: 'bad' }, '⚠ ' + VX.roomErr) : null,
          h('div', { class: 'vc-lobby-me' }, h('div', { class: 'vc-av big' }, ini(me)), h('div', null, h('b', null, vocalName(me)), h('small', { class: 'muted' }, v.monitor ? 'Test du micro en cours' : 'Prêt à rejoindre')),
            h('div', { class: 'vc-meter slim' }, h('div', { class: 'vc-meter-fill' }))),
          h('div', { class: 'vc-lobby-act' },
            h('button', { class: 'vc-join', disabled: v.joining ? true : null, onclick: () => vocalJoin() }, v.joining ? 'Connexion…' : `Rejoindre « ${roomOf(VX.room || load('fire.vocal.room', 'equipe')).name} »`),
            h('button', { class: 'vc-ghost', onclick: () => FV().setMonitor(!v.monitor) }, v.monitor ? '⏹ Arrêter le test' : '🎧 Tester mon micro'),
            h('button', { class: 'vc-ghost', title: 'Mes clips', onclick: openClips }, vi('clip'), 'Clips'),
            gearBtn('vc-ghost icon')),
          v.err ? h('p', { class: 'bad' }, '⚠ ' + v.err, ' ', h('button', { class: 'linkbtn small', onclick: () => FV().clearErr() }, 'OK')) : null,
          h('p', { class: 'vc-kbd-hint' }, h('kbd', null, keyTxt(K.join)), ' pour rejoindre ou quitter, même en jeu'))),
      drawer].filter(Boolean));
      return;
    }

    // Dans le salon.
    const people = [{ slug: me, ok: true, remote: { mute: v.mute, deaf: v.deaf, cam: !!v.cam, screen: !!v.screen } }].concat(v.members.filter((m) => m.ok));
    const camOf = (slug) => (slug === me ? (load('fire.vocal.selfcam', true) ? v.cam : null) : (VX.hideCam && VX.hideCam[slug]) ? null : (v.videos.find((x) => x.slug === slug && x.kind === 'cam') || {}).stream);
    const screens = [];
    if (v.screen) screens.push({ key: 'me:screen', slug: me, stream: v.screen, mine: true });
    v.videos.filter((x) => x.kind === 'screen').forEach((x) => screens.push({ key: x.slug + ':screen', slug: x.slug, stream: x.stream, sound: x.sound }));
    // Options d'affichage (désactivées par défaut, chacun choisit dans le menu ⋯) :
    // - contour vert sur le partage d'écran quand son auteur parle ;
    // - sa caméra incrustée dans un coin de son partage d'écran (jamais en plein écran), au lieu d'une case à part.
    const ringScreen = load('fire.vocal.screenring', false);
    const pip = load('fire.vocal.pip', false);
    const pipOf = (slug) => (pip && screens.some((x) => x.slug === slug) ? camOf(slug) : null);
    // Streams que j'ai arrêté de regarder : une case « Regarder » à la place.
    const off = v.members.filter((m) => m.ok && m.remote && m.remote.screen && (v.unwatch || []).includes(m.slug)).map((m) => ({ key: m.slug + ':off', slug: m.slug, kind: 'screenoff' }));
    if (window.FireBoard) FireBoard.setStreams(Object.fromEntries(screens.map((x) => [x.key, x.stream])));
    const boardTile = window.FireBoard && FireBoard.isOpen() && !SUB() ? [{ key: 'board', slug: me, kind: 'board' }] : [];
    const allTiles = boardTile.concat(screens.map((x) => ({ ...x, kind: 'screen', pipCam: pipOf(x.slug) }))).concat(off)
      .concat(people.filter((p) => !pipOf(p.slug)).map((p) => ({ key: p.slug + ':p', slug: p.slug, kind: 'person', p, stream: camOf(p.slug), mine: p.slug === me })));
    // « Afficher les participants sans vidéo » décoché : seules les vidéos restent (s'il y en a).
    const hideNoVid = !load('fire.vocal.novideo', true) && allTiles.some((t) => t.stream);
    const tiles = hideNoVid ? allTiles.filter((t) => t.stream || t.kind === 'board') : allTiles;
    const hidden = allTiles.length - tiles.length;
    const keep = new Set(tiles.filter((t) => t.stream).map((t) => (t.kind === 'screen' ? t.key : t.slug + ':cam')).concat(tiles.filter((t) => t.pipCam).map((t) => t.slug + ':cam')));
    for (const k of Object.keys(VX.vids)) if (!keep.has(k)) { VX.vids[k].srcObject = null; delete VX.vids[k]; }
    // Disposition : « côte à côte » (tout visible, même taille) ou « focus » (une vidéo en grand, les autres à côté).
    let layout = load('fire.vocal.layout', 'grid');
    if (!tiles.some((t) => t.key === VX.focus)) VX.focus = null;
    if (layout === 'focus' && !VX.focus) VX.focus = (screens[0] || tiles[0]).key;
    const setLayout = (l, key) => { save('fire.vocal.layout', l); VX.focus = key || null; renderVocal(); };
    const tileEl = (t, small) => {
      if (t.kind === 'board') {
        const box = h('div', { class: 'vt board' + (small ? ' small' : ''), onclick: () => { if (layout === 'focus' && VX.focus === t.key) setLayout('grid'); else setLayout('focus', t.key); } },
          FireBoard.element(), h('div', { class: 'vt-name' }, vi('board'), 'Tableau tactique'));
        return box;
      }
      if (t.kind === 'screenoff') {
        return h('div', { class: 'vt screenoff' + (small ? ' small' : '') },
          h('div', { class: 'vt-off' }, vi('screen'), h('b', null, `${vocalName(t.slug)} partage son écran`),
            h('button', { class: 'vm-btn', onclick: (e) => { e.stopPropagation(); FV().watchStream(t.slug, true); } }, 'Regarder')));
      }
      const r = (t.p && t.p.remote) || {};
      const pl = playerOf(t.slug);
      const f = (pl.fonds || [])[0];
      const lm = !!v.lmute[t.slug];
      const vol = v.vols[t.slug] ?? 1;
      const box = h('div', { class: 'vt ' + t.kind + (small ? ' small' : '') + (t.stream ? ' has-video' : '') + (lm ? ' lm' : ''), 'data-vslug': t.kind === 'person' || (t.kind === 'screen' && ringScreen) ? t.slug : null,
        ondblclick: () => fullscreen(box), onclick: (e) => { if (e.target.closest('.vt-menu, .vt-tools')) return; if (layout === 'focus' && VX.focus === t.key) setLayout('grid'); else setLayout('focus', t.key); },
        oncontextmenu: (e) => { if (t.mine) return; e.preventDefault(); if (t.kind === 'screen') streamMenu(t, box, e.clientX, e.clientY); else if (t.kind === 'person') personMenu(t, e.clientX, e.clientY); } });
      // Vidéo (caméra ou écran) : elle prend toute la case, sans initiales par-dessus.
      // Pas de vidéo : le skin préféré en fond et les initiales.
      if (t.stream) box.append(vidEl(t.kind === 'screen' ? t.key : t.slug + ':cam', t.stream, t.mine && t.kind === 'person'));
      else {
        if (f) box.append(h('div', { class: 'vt-bg', style: `background-image:url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${f.champ}_${f.skin}.jpg')` }));
        box.append(h('div', { class: 'vc-av' }, ini(t.slug)));
      }
      if (t.pipCam) box.append(h('div', { class: 'vt-pip' }, vidEl(t.slug + ':cam', t.pipCam, t.mine)));
      if (t.kind === 'screen' && !t.mine) box.append(h('span', { class: 'vt-q', 'data-q': t.key }));
      const so = (v.svol || {})[t.slug] || {};
      const sndOn = so.on == null ? v.cfg.streamSound !== false : so.on;
      const sndVol = so.vol ?? 0.8;
      const hasSnd = t.kind === 'screen' && !t.mine && t.sound;
      box.append(h('div', { class: 'vt-name' }, t.kind === 'screen' ? vi('screen') : null, (t.kind === 'screen' ? 'Écran de ' : '') + (t.mine ? (t.kind === 'screen' ? 'toi' : vocalName(t.slug) + ' (toi)') : ((pl.capitaine ? '👑 ' : coachOf(t.slug) ? '🎓 ' : '') + vocalName(t.slug))),
        t.kind === 'person' && r.mute ? h('span', { class: 'vt-st bad' }, vi('micOff')) : null,
        t.kind === 'person' && r.deaf ? h('span', { class: 'vt-st bad' }, vi('headOff')) : null,
        hasSnd ? h('span', { class: 'vt-st ' + (sndOn ? 'snd' : 'bad') }, vi(sndOn ? 'vol' : 'headOff')) : null,
        t.kind === 'screen' && t.mine && v.screenAudio ? h('span', { class: 'vt-st snd' + (v.screenMix ? ' warn' : ''), title: v.screenMix ? 'Le son de ton PC est partagé, voix du salon comprises (Windows trop ancien pour les retirer)' : 'Le son de ton PC est partagé, sans les voix du salon' }, vi('vol')) : null));
      const tools = h('div', { class: 'vt-tools' },
        h('button', { title: 'Plein écran (Échap pour sortir)', onclick: () => fullscreen(box) }, vi('full')),
        t.kind === 'person' && !t.mine ? h('button', { title: 'Volume', onclick: () => { VX.menu = VX.menu === t.slug ? null : t.slug; renderVocal(); } }, vi('vol')) : null,
        hasSnd ? h('button', { title: sndOn ? 'Couper le son du stream' : 'Entendre le son du stream', class: sndOn ? '' : 'off', onclick: () => FV().setStreamSound(t.slug, { on: !sndOn }) }, vi(sndOn ? 'vol' : 'headOff')) : null,
        t.kind === 'screen' && !t.mine ? h('button', { title: 'Options du stream (ou clic droit)', onclick: (e) => { const r = e.currentTarget.getBoundingClientRect(); streamMenu(t, box, r.left - 200, r.bottom + 6); } }, vi('more')) : null);
      box.append(tools);
      if (VX.menu === t.key && hasSnd) {
        box.append(h('div', { class: 'vt-menu' },
          h('b', null, 'Son du stream de ' + vocalName(t.slug)),
          h('div', { class: 'vs-range' }, h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: Math.min(1, sndVol), onchange: (e) => e.target.blur(),
            oninput: (e) => { FV().setStreamSound(t.slug, { vol: Number(e.target.value), on: true }); e.target.nextSibling.textContent = Math.round(e.target.value * 100) + ' %'; } }), h('span', { class: 'vs-rv' }, Math.round(sndVol * 100) + ' %')),
          h('button', { class: 'vs-btn', onclick: () => FV().setStreamSound(t.slug, { on: !sndOn }) }, sndOn ? '🔇 Couper le son du stream' : '🔊 Entendre le son du stream')));
      }
      if (VX.menu === t.slug && t.kind === 'person' && !t.mine) {
        box.append(h('div', { class: 'vt-menu' },
          h('b', null, 'Volume de ' + vocalName(t.slug)),
          h('div', { class: 'vs-range' }, h('input', { type: 'range', min: 0, max: 5, step: 0.05, value: Math.min(5, vol), disabled: lm ? true : null, onchange: (e) => e.target.blur(),
            oninput: (e) => { FV().setVol(t.slug, Number(e.target.value)); e.target.nextSibling.textContent = Math.round(e.target.value * 100) + ' %'; } }), h('span', { class: 'vs-rv' }, Math.round(vol * 100) + ' %')),
          h('button', { class: 'vs-btn', onclick: () => FV().setLocalMute(t.slug, !lm) }, lm ? '🔈 Réentendre' : '🔇 Rendre muet pour moi')));
      }
      return box;
    };
    let stage;
    const n = tiles.length;
    if (layout === 'focus' && n > 1) {
      const main = tiles.find((t) => t.key === VX.focus) || tiles[0];
      stage = h('div', { class: 'vc-stage focus' }, h('div', { class: 'vc-main' }, tileEl(main)), h('div', { class: 'vc-strip' }, tiles.filter((t) => t !== main).map((t) => tileEl(t, true))));
    } else {
      const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
      stage = h('div', { class: 'vc-stage grid', style: `--cols:${cols}` }, tiles.map((t) => tileEl(t)));
    }
    const cbtn = (on, icOn, icOff, title, fn, cls) => h('button', { class: 'cb ' + (cls || '') + (on ? ' on' : ''), title, onclick: fn }, vi(on ? icOn : icOff));
    const bar = h('div', { class: 'vc-bar' },
      h('div', { class: 'vc-bar-l' }, h('span', { class: 'vc-live-pill' }, h('span', { class: 'dot' }), `${roomOf(v.room).ico} ${roomOf(v.room).name} · ${people.length}`)),
      h('div', { class: 'vc-bar-c' },
        cbtn(v.mute, 'micOff', 'mic', `${v.mute ? 'Réactiver' : 'Couper'} le micro (${keyTxt(K.mute)})`, () => FV().setMute(!v.mute), 'warn'),
        cbtn(v.deaf, 'headOff', 'head', `${v.deaf ? 'Réactiver' : 'Couper'} le son (${keyTxt(K.deaf)})`, () => FV().setDeaf(!v.deaf), 'warn'),
        cbtn(!!v.cam, 'cam', 'camOff', `${v.cam ? 'Couper' : 'Allumer'} la caméra (${keyTxt(K.cam)})`, () => (v.cam ? FV().stopCam() : FV().startCam()), 'live'),
        cbtn(!!v.screen, 'screen', 'screen', `${v.screen ? 'Arrêter le partage' : 'Partager ton écran'} (${keyTxt(K.screen)})`, () => (v.screen ? FV().stopScreen() : openScreenPicker()), 'live'),
        window.FireBoard && !SUB() ? cbtn(FireBoard.isOpen(), 'board', 'board', FireBoard.isOpen() ? 'Fermer le tableau tactique (pour tout le salon)' : 'Ouvrir le tableau tactique : une carte où tout le salon dessine', () => {
          if (FireBoard.isOpen()) FireBoard.close(); else { save('fire.vocal.layout', 'focus'); VX.focus = 'board'; FireBoard.open(); }
        }, 'live') : null,
        window.FireClips && FireClips.state().on ? h('button', { class: 'cb', title: `Enregistrer un clip : les ${clipCfg().seconds} dernières secondes (${keyTxt(K.clip)})`, onclick: saveClip }, vi('clip')) : null,
        gearBtn('cb'),
        h('button', { class: 'cb leave', title: `Quitter le salon (${keyTxt(K.join)})`, onclick: () => FV().leave() }, vi('phone'))),
      h('div', { class: 'vc-bar-r' },
        h('div', { class: 'vm-wrap' },
          h('button', { class: 'vc-more' + (VX.more ? ' on' : ''), title: 'Plus d’options', onclick: (e) => { e.stopPropagation(); VX.more = !VX.more; VX.invOpen = false; renderVocal(); } }, vi('more')),
          VX.more ? vocalMenu(v) : null),
        n > 1 ? h('div', { class: 'vc-seg' },
          h('button', { class: layout !== 'focus' ? 'on' : '', title: 'Côte à côte : tout est visible', onclick: () => setLayout('grid') }, vi('grid')),
          h('button', { class: layout === 'focus' ? 'on' : '', title: 'Focus : une vidéo en grand', onclick: () => setLayout('focus', VX.focus || (screens[0] || tiles[0]).key) }, vi('focus'))) : null));
    const switcher = h('div', { class: 'vc-switch' }, ROOMS.filter(roomOk).map((r) => {
      const there = roomPeople(r.id);
      const mine = r.id === v.room;
      const full = r.max && there.filter((x) => x !== me).length >= r.max;
      // Chaque salon montre qui est dedans (avatars et noms), même quand tu es dans un autre salon.
      const names = there.map(vocalName);
      return h('button', { class: 'vs-room' + (mine ? ' on' : '') + (there.length && !mine ? ' busy' : ''), disabled: mine || full ? true : null,
        title: (names.length ? `Dedans : ${names.join(', ')}` : 'Personne pour le moment') + (mine ? ' · tu es ici' : full ? ' · complet' : ' · clique pour y aller'), onclick: () => vocalJoin(r.id) },
        h('span', { class: 'vs-rh' }, r.ico, ' ', r.name, full && !mine ? h('span', { class: 'vs-n full' }, 'complet') : null),
        mine ? h('span', { class: 'vs-empty here' }, 'tu es ici') : there.length
          ? h('span', { class: 'vs-ppl' }, there.slice(0, 4).map((x) => h('span', { class: 'vc-av mini' }, ini(x))), h('span', { class: 'vs-names' }, names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')))
          : h('span', { class: 'vs-empty' }, 'vide'));
    }));
    view.replaceChildren(...[h('div', { class: 'vc-room' },
      v.err ? h('p', { class: 'bad vc-err' }, '⚠ ' + v.err, ' ', h('button', { class: 'linkbtn small', onclick: () => FV().clearErr() }, 'OK')) : null,
      VX.roomErr ? h('p', { class: 'bad vc-err' }, '⚠ ' + VX.roomErr) : null,
      switcher, stage, bar,
      people.length === 1 ? h('p', { class: 'vc-alone' }, 'Tu es seul pour le moment : invite tes coéquipiers avec le menu ⋯ en bas à droite.') : null,
      hidden ? h('p', { class: 'vc-alone' }, `${hidden} participant${hidden > 1 ? 's' : ''} sans vidéo masqué${hidden > 1 ? 's' : ''} (menu ⋯).`) : null), drawer].filter(Boolean));
    resumeVideos();
    vocalSpeak();
  }

  // ----- Draft en direct : la sélection des champions lue dans le client LoL, et les runes du matchup -----
  const DR = { d: null, sig: '', opp: {}, runes: {}, busy: '', msg: '', timer: null };
  const POSN = { top: 'Top', jungle: 'Jungle', middle: 'Mid', bottom: 'ADC', utility: 'Support' };
  const POSLANE = { top: 'top', jungle: 'jungle', middle: 'middle', bottom: 'bottom', utility: 'support' };
  const POSCAT = { top: 'top', jungle: 'jungle', middle: 'mid', bottom: 'adc', utility: 'support' };
  const live = (d) => d && (d.phase === 'ChampSelect' || d.phase === 'InProgress');
  function draftBadge() { return live(DR.d) ? (DR.d.phase === 'InProgress' ? 'EN JEU' : 'LIVE') : (newsCount('draft') ? String(newsCount('draft')) : null); }
  async function pollDraft() {
    if (!window.fire.lcu || DR.inflight) return;
    DR.inflight = true;
    let d = null;
    try { d = await window.fire.lcu.draft(); } catch (e) { d = null; }
    DR.inflight = false;
    const was = draftBadge();
    DR.d = d;
    const sig = JSON.stringify(d && [d.client, d.phase, d.allies, d.enemies, d.timer && d.timer.phase]);
    if (draftBadge() !== was) renderNav();
    if (S.section === 'draft') {
      if (sig !== DR.sig && !typing() && S.drTab !== 'puzzle') { DR.sig = sig; renderDraft(); }
      const t = document.querySelector('.dr-timer');
      if (t && d && d.timer) t.textContent = d.timer.left ? `⏱ ${d.timer.left} s` : '';
    }
    clearTimeout(DR.timer);
    // Toutes les 2 s quand l'onglet est ouvert ou qu'une draft est en cours, sinon toutes les 15 s.
    DR.timer = setTimeout(pollDraft, S.section === 'draft' || live(d) ? 2000 : 15000);
  }
  setTimeout(pollDraft, 3000);
  const lolSlug = (id) => (id === 'MonkeyKing' ? 'wukong' : String(id || '').toLowerCase());
  // Vis-à-vis : en partie Riot donne le poste de chacun ; en draft, le joueur clique sur son adversaire.
  function opponent(d) {
    if (!d || !d.me) return null;
    const pick = DR.opp[d.me.pos || '?'];
    const byPick = pick && d.enemies.find((e) => e.champ === pick);
    if (byPick) return byPick;
    return d.me.pos ? d.enemies.find((e) => e.champ && e.pos === d.me.pos) || null : null;
  }
  async function loadRunes(me) {
    const k = me.key + ':' + (me.pos || '');
    if (DR.runes[k] || !me.key) return;
    DR.runes[k] = { loading: true };
    const r = await window.fire.lcu.runes(me.key, me.pos).catch((e) => ({ ok: false, error: String(e) }));
    DR.runes[k] = r || { ok: false };
    if (S.section === 'draft' && !typing() && S.drTab !== 'puzzle') renderDraft();
  }
  async function importRunes(pg, label, replaceId) {
    DR.busy = label; DR.msg = ''; renderDraft();
    const r = await window.fire.lcu.import(pg.raw, label, replaceId).catch((e) => ({ ok: false, error: String(e) }));
    DR.busy = '';
    if (r && r.ok) DR.msg = { ok: true, t: `✓ Page « ${r.name} » créée et sélectionnée dans le client.` };
    else if (r && r.full && r.replace) DR.msg = { ok: false, t: `Toutes tes pages de runes sont prises. Remplacer la page « ${r.replace.name} » ?`, replace: r.replace, pg, label };
    else DR.msg = { ok: false, t: '⚠ Import impossible' + (r && r.error ? ` : ${r.error}` : '') + '.' };
    renderDraft();
  }
  // Onglets de la rubrique Draft : la draft en direct et les puzzles « Contrez la composition adverse ».
  function renderDraft() {
    if (S.drTab === 'puzzle') return renderPuzzles();
    if (S.drTab === 'tier') return renderTierList();
    if (S.drTab === 'matchup') return renderMatchups();
    if (S.drTab === 'otp') return renderOtp();
    renderDraftLive();
    const hero = $('view').querySelector('.sec-hero');
    if (hero) hero.after(draftTabs());
  }
  function draftTabs() {
    const t = S.drTab || 'live';
    const tab = (k, label, extra) => h('button', { class: 'plan-tab', 'aria-pressed': String(t === k), onclick: () => { S.drTab = k; if (k === 'live') DR.sig = null; renderDraft(); } }, label, extra || null);
    return h('div', { class: 'row plan-tabs' },
      tab('live', '⚡ Draft en direct'),
      tab('tier', '📊 Tier list'),
      tab('matchup', '⚔️ Matchups'),
      tab('otp', '🎖️ One-tricks', newsFresh('draft').includes('f:otp') ? h('span', { class: 'plan-tab-n' }, 'new') : null),
      tab('puzzle', '🧩 Puzzles de draft', pzDue() ? h('span', { class: 'plan-tab-n' }, '!') : null));
  }

  // ----- Matchups : ton champion contre un adversaire → vidéos gratuites (YouTube, VOD de pros) et stats du matchup -----
  const MU = { a: null, b: null, side: 'a', q: '', lane: '' };
  function renderMatchups() {
    const view = $('view');
    const list = ((S.champList && S.champList.list) || []).slice().sort((x, y) => x.name.localeCompare(y.name, 'fr'));
    const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const nameOf = (id) => (list.find((c) => c.id === id) || {}).name || id;
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '⚔️'),
      h('div', null, h('h1', { class: 'title' }, 'Matchups'),
        h('p', { class: 'muted' }, 'Choisis ton champion et ton adversaire : FIRE t’ouvre des vidéos gratuites de ce matchup (YouTube, VOD de pros) et ses statistiques.')));
    const slot = (k, label) => h('button', { class: 'mu-slot' + (MU.side === k ? ' on' : ''), onclick: () => { MU.side = k; renderMatchups(); } },
      MU[k] ? champIcon(MU[k], 56) : h('span', { class: 'mu-q' }, '?'), h('span', null, h('small', { class: 'muted' }, label), h('b', null, MU[k] ? nameOf(MU[k]) : 'Choisir')));
    const q = norm(MU.q);
    const grid = h('div', { class: 'mu-grid' }, list.filter((c) => !q || norm(c.name).includes(q) || norm(c.id).includes(q)).map((c) =>
      h('button', { class: 'mu-c' + (MU.a === c.id || MU.b === c.id ? ' sel' : ''), title: c.name, onclick: () => {
        MU[MU.side] = c.id; if (MU.side === 'a' && !MU.b) MU.side = 'b'; MU.q = ''; renderMatchups();
        if (MU.a && MU.b) { const r = document.querySelector('.mu-res'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      } }, champIcon(c.id, 44))));
    const search = h('input', { class: 'inp mu-search', placeholder: 'Rechercher un champion…', value: MU.q, oninput: (e) => { MU.q = e.target.value; const pos = e.target.selectionStart; renderMatchups(); const el = document.querySelector('.mu-search'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } } });
    const lanes = [['', 'Toutes les lanes'], ['top', 'Top'], ['jungle', 'Jungle'], ['middle', 'Mid'], ['bottom', 'ADC'], ['support', 'Support']];
    const pick = h('div', { class: 'card mu-pick' },
      h('div', { class: 'mu-slots' }, slot('a', 'Ton champion'), h('span', { class: 'mu-vs' }, 'VS'), slot('b', 'Adversaire'),
        MU.a || MU.b ? h('button', { class: 'btn-ghost', onclick: () => { MU.a = MU.b = null; MU.side = 'a'; renderMatchups(); } }, 'Effacer') : null),
      h('div', { class: 'row' }, search, h('select', { class: 'inp mu-lane', onchange: (e) => { MU.lane = e.target.value; renderMatchups(); } }, lanes.map(([k, t]) => h('option', { value: k, selected: MU.lane === k ? true : null }, t)))),
      list.length ? grid : h('p', { class: 'muted small' }, 'Chargement des champions…'));
    let res = null;
    if (MU.a && MU.b) {
      const A = nameOf(MU.a), B = nameOf(MU.b);
      const laneTxt = { top: 'top', jungle: 'jungle', middle: 'mid', bottom: 'adc', support: 'support' }[MU.lane] || '';
      const yt = (extra) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${A} vs ${B} ${laneTxt} ${extra}`.replace(/\s+/g, ' ').trim());
      const ll = `https://lolalytics.com/lol/${lolSlug(MU.a)}/vs/${lolSlug(MU.b)}/build/${MU.lane ? '?lane=' + MU.lane : ''}`;
      const link = (href, t, sub, cls) => h('a', { class: 'mu-link ' + (cls || ''), href, target: '_blank', rel: 'noopener' }, h('b', null, t), h('small', { class: 'muted' }, sub));
      // L'essentiel du matchup directement dans FIRE (LoLalytics, Émeraude+) ; le détail est replié.
      const key = `${MU.a}|${MU.b}|${MU.lane}`;
      if (!MU.data) MU.data = {};
      if (!MU.data[key] && window.fire.matchup) {
        MU.data[key] = { loading: true };
        window.fire.matchup(MU.a, MU.b, MU.lane).then((r) => { MU.data[key] = r || { ok: false }; }).catch((e) => { MU.data[key] = { ok: false, error: String(e) }; })
          .finally(() => { if (S.section === 'draft' && S.drTab === 'matchup') renderMatchups(); });
      }
      const M = MU.data[key] || {};
      const pct = (x) => `${fr(x, 1)} %`;
      const sign = (x) => (x > 0 ? '+' : '') + fr(x, 1);
      let stats;
      if (M.loading) stats = h('p', { class: 'muted mu-load' }, 'Chargement des stats du matchup…');
      else if (!M.ok) stats = h('p', { class: 'muted small' }, 'Stats du matchup indisponibles pour l’instant' + (M.error ? ` (${M.error})` : '') + '. Le bouton LoLalytics ci-dessous ouvre la page complète.');
      else {
        const verdict = M.wr >= 52 ? ['good', `${A} gagne ce matchup`] : M.wr <= 48 ? ['bad', `${A} perd ce matchup`] : ['', 'Matchup équilibré'];
        const st = M.stats || {};
        stats = h('div', { class: 'mu-stats' },
          h('div', { class: 'mu-top' },
            h('div', { class: 'mu-wr ' + verdict[0] }, h('b', null, pct(M.wr)), h('small', null, 'de victoires')),
            h('div', { class: 'mu-sum' }, h('b', null, verdict[1]),
              h('small', { class: 'muted' }, `${(M.games || 0).toLocaleString('fr-FR')} parties · ${M.elo ? M.elo.replace('EMERALD+', 'Émeraude+') : 'Émeraude+'} · patch ${M.patch || '?'}`),
              M.diff ? h('small', { class: M.diff.v >= 0 ? 'good' : 'bad' }, `${sign(M.diff.v)} pts par rapport à ses autres matchups`) : null)),
          buildBox(M.build, M.dd),
          h('details', { class: 'mu-more' }, h('summary', null, 'Plus de détails'),
            h('div', { class: 'mu-grid2' },
              ...[['Kills', st.k], ['Morts', st.d], ['Assists', st.a], ['Dégâts', st.dmg], ['Dégâts subis', st.taken], ['Soins', st.heal], ['Golds', st.gold], ['Sbires', st.cs]]
                .filter(([, x]) => x != null).map(([l, x]) => h('div', { class: 'mu-kv' }, h('small', { class: 'muted' }, l), h('b', null, x >= 1000 ? Math.round(x).toLocaleString('fr-FR') : fr(x, 1))))),
            h('p', { class: 'muted small' }, `Moyennes de ${A} par partie dans ce matchup.`,
              M.norm ? ` Une fois corrigé du niveau des deux champions : ${sign(M.norm.v)} pts.` : '', M.avg ? ` Taux de victoire moyen à cet elo : ${pct(M.avg)}.` : '')));
      }
      res = h('div', { class: 'card mu-res' },
        h('h2', null, `${A} contre ${B}`),
        stats,
        h('div', { class: 'mu-links' },
          link(yt('challenger'), '▶ Vidéos du matchup', 'YouTube · parties de joueurs Challenger et Grand Maître', 'yt'),
          link('https://www.youtube.com/results?search_query=' + encodeURIComponent(`guide ${A} ${laneTxt} français`.replace(/\s+/g, ' ').trim()), '▶ Guide du champion ' + A, 'YouTube · une vidéo qui explique ' + A + ' : sorts, combos, build, plan de jeu', 'yt'),
          link(`https://mid.gg/champion/${encodeURIComponent(MU.a)}`, '▶ VOD de pros sur ' + A, 'mid.gg · parties pro avec build, runes et chronologie (choisis le matchup sur la page)'),
          h('button', { class: 'mu-link', onclick: () => window.fire.lcu.stats(ll) }, h('b', null, '📊 Stats et runes du matchup'), h('small', { class: 'muted' }, 'LoLalytics · taux de victoire, runes et objets contre ' + B))),
        h('p', { class: 'muted small' }, 'Les vidéos s’ouvrent dans FIRE, gratuitement. Rien n’est téléchargé.'));
    }
    view.replaceChildren(hero, draftTabs(), pick, res);
  }


  // ----- One-tricks : les meilleurs joueurs de chaque champion en Corée et en Europe, et le build des Maîtres+ -----
  // Classement LoLalytics (Diamant IV+, plus de 50 % de victoires, 50 parties ou plus en 90 jours), relevé chaque semaine (tools/otp.py).
  const OT = { data: null, loading: false, q: '', champ: load('fire.otp', null) };
  const OT_LANE = { top: 'Top', jungle: 'Jungle', middle: 'Mid', bottom: 'ADC', support: 'Support' };
  const OT_SHARD = { 5001: 'PV (selon le niveau)', 5005: 'Vitesse d’attaque', 5007: 'Accélération de compétence', 5008: 'Force adaptative', 5010: 'Vitesse de déplacement', 5011: 'PV', 5013: 'Ténacité et résistance aux ralentissements' };
  const OT_TIER = { challenger: '#5ad0ff', grandmaster: '#ff4d5e', master: '#b05cff', diamond: '#6b8cff', emerald: '#2fbf71' };
  // Build compact : sorts, runes, départ, build principal, 4e objet, ordre des sorts (données LoLalytics, noms Data Dragon).
  function buildBox(b, dd) {
    b = b || {}; dd = dd || { runes: {}, spells: {} };
    const v = (S.champList && S.champList.version) || '';
    const img = (src, title, sz) => h('img', { class: 'ot-i', src, alt: title || '', title: title || '', width: sz || 34, height: sz || 34, onerror: (e) => { e.target.style.visibility = 'hidden'; } });
    const item = (id) => img(`https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${id}.png`, ((((J.data && J.data.items) || []).find((x) => x.id === String(id))) || {}).name || '');
    const rune = (id, sz) => { const r = (dd.runes || {})[id]; return r ? img('https://ddragon.leagueoflegends.com/cdn/img/' + r.i, r.n, sz) : null; };
    const spell = (k) => { const x = (dd.spells || {})[k]; return x ? img(`https://ddragon.leagueoflegends.com/cdn/${v}/img/spell/${x.i}`, x.n) : null; };
    const grp = (t, ...kids) => h('div', { class: 'ot-g' }, h('small', { class: 'muted' }, t), h('div', { class: 'ot-row' }, ...kids));
    const runesBox = (b.runes || []).length ? grp('Runes', ...b.runes.slice(0, 4).map((id, i) => rune(id, i ? 30 : 40)), h('span', { class: 'ot-sep' }), ...b.runes.slice(4).map((id) => rune(id, 30)),
      (b.shards || []).length ? h('span', { class: 'ot-shards muted small' }, b.shards.map((x) => OT_SHARD[x] || x).join(' · ')) : null) : null;
    return h('div', { class: 'ot-build' },
      (b.spells || []).length ? grp('Sorts', ...b.spells.map(spell)) : null,
      runesBox,
      (b.start || []).length ? grp('Départ', ...b.start.map(item)) : null,
      (b.core || []).length ? grp('Build principal', ...b.core.map((id, i) => [i ? h('span', { class: 'ot-arrow' }, '›') : null, item(id)])) : null,
      (b.i4 || []).length ? grp('4e objet', ...b.i4.map((id, i) => [i ? h('span', { class: 'ot-or muted small' }, 'ou') : null, item(id)])) : null,
      (b.skills || []).length ? grp('Ordre des sorts', ...b.skills.map((k, i) => [i ? h('span', { class: 'ot-arrow' }, '›') : null, h('b', { class: 'ot-key' }, k)])) : null);
  }
  function renderOtp() {
    const view = $('view');
    if (newsFresh('draft').length) newsMark('draft', ['f:otp']);
    if (!OT.data && !OT.loading && window.fire.otp) {
      OT.loading = true;
      window.fire.otp().then((d) => { OT.data = d || { champs: {} }; }).catch(() => { OT.data = { champs: {} }; }).finally(() => {
        OT.loading = false;
        // Pas encore de données (relevé pas encore publié, ou hors ligne) : on réessaiera à la prochaine ouverture de l'onglet.
        if (!OT.data.champs || !Object.keys(OT.data.champs).length) { OT.empty = OT.data; OT.data = null; }
        if (S.section === 'draft' && S.drTab === 'otp' && !OT.retried) { OT.retried = !!OT.empty; renderOtp(); }
      });
    }
    const list = ((S.champList && S.champList.list) || []).slice().sort((x, y) => x.name.localeCompare(y.name, 'fr'));
    const v = (S.champList && S.champList.version) || '';
    const norm = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const nameOf = (id) => (list.find((c) => c.id === id) || {}).name || id;
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🎖️'),
      h('div', null, h('h1', { class: 'title' }, 'One-tricks'),
        h('p', { class: 'muted' }, 'Les meilleurs spécialistes de chaque champion en Corée et en Europe : leur rang, leurs stats, leur profil, et le build des joueurs Maître+.')));
    const q = norm(OT.q);
    const choose = (id) => { OT.champ = id; OT.q = ''; save('fire.otp', id); renderOtp(); const r = document.querySelector('.ot-res'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const search = h('input', { class: 'inp mu-search ot-search', placeholder: 'Rechercher un champion…', value: OT.q, oninput: (e) => { OT.q = e.target.value; const pos = e.target.selectionStart; renderOtp(); const el = document.querySelector('.ot-search'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } } });
    const shown = list.filter((c) => !q || norm(c.name).includes(q) || norm(c.id).includes(q));
    const pick = h('div', { class: 'card mu-pick' }, h('div', { class: 'row' }, search),
      list.length ? h('div', { class: 'mu-grid' + (OT.champ && !q ? ' ot-mini' : '') }, shown.map((c) => h('button', { class: 'mu-c' + (OT.champ === c.id ? ' sel' : ''), title: c.name, onclick: () => choose(c.id) }, champIcon(c.id, 44))))
        : h('p', { class: 'muted small' }, 'Chargement des champions…'));
    let res = null;
    const D = OT.data || OT.empty;
    if (OT.data) OT.retried = false;
    if (OT.champ) {
      const c = D && D.champs ? D.champs[OT.champ] : null;
      const dd = (D && D.dd) || { runes: {}, spells: {} };
      const b = (c && c.build) || {};
      const build = c ? buildBox(b, D && D.dd) : null;
      const opgg = (r, n) => `https://www.op.gg/summoners/${r === 'kr' ? 'kr' : 'euw'}/${encodeURIComponent(String(n).replace('#', '-'))}`;
      const col = (reg, label) => {
        const ps = (c && c[reg]) || [];
        return h('div', { class: 'ot-col' }, h('h3', null, label, h('small', { class: 'muted' }, ` · ${ps.length} joueur${ps.length > 1 ? 's' : ''}`)),
          ps.length ? ps.map((p, i) => h('a', { class: 'ot-p', href: opgg(reg, p.n), target: '_blank', rel: 'noopener', title: 'Ouvrir son profil op.gg (historique, builds de ses parties)' },
            h('span', { class: 'ot-n' }, String(i + 1)),
            h('span', { class: 'ot-tier', style: `color:${OT_TIER[p.t] || 'var(--muted)'}` }, p.d || p.t),
            h('span', { class: 'ot-name' }, h('b', null, p.n.split('#')[0]), h('small', { class: 'muted' }, '#' + (p.n.split('#')[1] || '') + (p.l && p.l.length ? ' · ' + p.l.map((l) => OT_LANE[l] || l).join(', ') : ''))),
            h('span', { class: 'ot-wr ' + (p.wr >= 60 ? 'good' : '') }, `${fr(p.wr, 1)} %`, h('small', { class: 'muted' }, `${p.g} parties`)),
            h('span', { class: 'ot-go' }, '↗')))
            : h('p', { class: 'muted small' }, D ? 'Pas de one-trick classé pour ce champion dans cette région.' : 'Chargement…'));
      };
      const A = nameOf(OT.champ);
      res = h('div', { class: 'card ot-res' },
        h('div', { class: 'ot-head' }, champIcon(OT.champ, 64), h('div', null, h('h2', null, A), h('small', { class: 'muted' }, D && D.maj ? `Build des joueurs Maître+ · patch ${D.patch || '?'}` : 'Chargement des données…')),
          h('div', { class: 'ot-links' },
            h('a', { class: 'btn-ghost', href: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(A + ' one trick challenger gameplay'), target: '_blank', rel: 'noopener' }, '▶ Vidéos d’OTP'),
            h('a', { class: 'btn-ghost', href: `https://mid.gg/champion/${encodeURIComponent(OT.champ)}`, target: '_blank', rel: 'noopener' }, '▶ VOD de pros'),
            h('button', { class: 'btn-ghost', onclick: () => window.fire.lcu.stats(`https://lolalytics.com/lol/${lolSlug(OT.champ)}/leaderboard/`) }, '📊 Classement complet'))),
        build || (OT.loading ? h('p', { class: 'muted' }, 'Chargement des one-tricks…') : D && !c ? h('p', { class: 'muted' }, OT.empty ? 'Les données des one-tricks ne sont pas encore arrivées sur ce PC. Rouvre l’onglet dans un instant (il faut Internet).' : 'Pas encore de données pour ce champion (elles arrivent avec le relevé de la semaine).') : null),
        h('div', { class: 'ot-cols' }, col('kr', '🇰🇷 Corée'), col('euw', '🇪🇺 Europe')),
        h('p', { class: 'muted small' }, 'Clique sur un joueur pour ouvrir son profil op.gg dans ton navigateur : ses dernières parties, ses runes et ses objets. ',
          D && D.maj ? `Données : LoLalytics (Diamant IV et plus, au moins 50 parties et plus de 50 % de victoires sur 90 jours), relevées le ${dateFr(D.maj)}.` : ''));
    } else res = h('p', { class: 'muted ot-hint' }, '👆 Choisis un champion pour voir ses one-tricks.');
    view.replaceChildren(hero, draftTabs(), res && OT.champ ? res : pick, res && OT.champ ? pick : res);
  }

  // ----- Tier list méta : Corée et Europe, par lane et par elo (LoLalytics, relevé chaque jour : tools/tierlist.py) -----
  const TL = { data: null, loading: false };
  const TL_LANES = [['top', 'Top'], ['jungle', 'Jungle'], ['middle', 'Mid'], ['bottom', 'ADC'], ['support', 'Support']];
  const TL_RANKS = [['iron', 'Fer'], ['bronze', 'Bronze'], ['silver', 'Argent'], ['gold', 'Or'], ['platinum', 'Platine'], ['emerald', 'Émeraude'], ['diamond', 'Diamant'], ['master', 'Maître'], ['grandmaster', 'Grand Maître'], ['challenger', 'Challenger']];
  const TL_PLUS = [['all', 'Tous les elos'], ['gold_plus', 'Or+'], ['platinum_plus', 'Platine+'], ['emerald_plus', 'Émeraude+'], ['diamond_plus', 'Diamant+'], ['master_plus', 'Maître+']];
  const TL_ELOS = TL_PLUS.concat(TL_RANKS);
  const TL_REG = [['kr', 'Corée'], ['euw', 'Europe']];
  const tlPrefs = () => ({ region: 'kr', elo: 'emerald_plus', lane: 'top', off: false, ...load('fire.tl', {}) });
  async function renderTierList() {
    const view = $('view');
    if (!TL.data && !TL.loading) {
      TL.loading = true;
      window.fire.tierlist().then((d) => { TL.data = d || { data: {} }; }).catch(() => { TL.data = { data: {} }; }).finally(() => { TL.loading = false; if (S.section === 'draft' && S.drTab === 'tier') renderTierList(); });
    }
    const P = tlPrefs();
    const set = (k, v) => { save('fire.tl', { ...P, [k]: v }); renderTierList(); };
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '📊'),
      h('div', null, h('h1', { class: 'title' }, 'Tier list méta'),
        h('p', { class: 'muted' }, 'Les champions les plus forts du moment, lane par lane, en Corée et en Europe. Choisis ton rang, de Fer à Challenger, pour voir ce qui marche à ton niveau.')));
    const seg = (list, cur, k) => h('div', { class: 'row tl-seg' }, list.map(([id, label]) => h('button', { class: 'chip', 'aria-pressed': String(cur === id), onclick: () => set(k, id) }, label)));
    const filters = h('div', { class: 'card tl-filters' },
      seg(TL_REG, P.region, 'region'),
      seg(TL_LANES, P.lane, 'lane'),
      h('div', { class: 'row tl-row' }, h('select', { class: 'inp tl-elo', onchange: (e) => set('elo', e.target.value) },
          h('optgroup', { label: 'Un seul rang' }, TL_RANKS.map(([id, label]) => h('option', { value: id, selected: P.elo === id ? true : null }, label))),
          h('optgroup', { label: 'Ce rang et au-dessus' }, TL_PLUS.map(([id, label]) => h('option', { value: id, selected: P.elo === id ? true : null }, label)))),
        h('label', { class: 'tl-off' }, h('input', { type: 'checkbox', checked: P.off ? true : null, onchange: (e) => set('off', e.target.checked) }), 'Afficher les choix hors méta')));
    const D = TL.data;
    let body, trend = null;
    if (!D) body = h('p', { class: 'muted' }, 'Chargement de la tier list…');
    else {
      const rows = (((D.data || {})[P.region] || {})[P.elo] || {})[P.lane] || [];
      const shown = rows.filter((r) => P.off || r.lane == null || r.lane >= 10);
      // La même lane et le même elo dans l'autre région : la Corée donne souvent la tendance avant l'Europe.
      const other = P.region === 'kr' ? 'euw' : 'kr';
      const oRows = (((D.data || {})[other] || {})[P.elo] || {})[P.lane] || [];
      const oTier = Object.fromEntries(oRows.map((r) => [r.id, r.tier]));
      const TRANK = ['S+', 'S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
      const rk = (t) => { const i = TRANK.indexOf(t); return i < 0 ? 99 : i; };
      if (P.region === 'euw') {
        const mine = Object.fromEntries(rows.map((r) => [r.id, r.tier]));
        const rising = oRows.filter((r) => rk(r.tier) <= 2 && (mine[r.id] == null || rk(mine[r.id]) >= rk(r.tier) + 2)).slice(0, 6);
        if (rising.length) trend = h('div', { class: 'card tl-trend' }, h('h3', null, '📈 Ce qui marche en Corée et pas encore en Europe'),
          h('div', { class: 'tl-trend-l' }, rising.map((r) => h('span', { class: 'tl-tr' }, champIcon(r.id, 32), h('b', null, r.fr || r.name),
            h('small', { class: 'muted' }, `🇰🇷 ${r.tier}`, mine[r.id] ? ` · 🇪🇺 ${mine[r.id]}` : ' · 🇪🇺 hors liste')))),
          h('p', { class: 'muted small' }, 'Les joueurs coréens trouvent souvent les choix forts d’un patch avant l’Europe : ces champions pourraient monter chez nous.'));
      }
      if (!shown.length) body = h('p', { class: 'muted' }, 'Pas encore de données pour ce choix.');
      else {
        body = h('div', { class: 'card tl-card' },
          h('div', { class: 'tl-head' }, h('span', null, '#'), h('span', null, 'Champion'), h('span', null, 'Tier'), h('span', null, other === 'kr' ? '🇰🇷 Corée' : '🇪🇺 Europe'), h('span', null, 'Victoires'), h('span', null, 'Pick'), h('span', null, 'Ban'), h('span', null, 'Parties')),
          shown.map((r, i) => h('div', { class: 'tl-r' },
            h('span', { class: 'tl-n' }, String(i + 1)),
            h('span', { class: 'tl-c' }, champIcon(r.id, 36), h('b', null, r.fr || r.name), r.lane != null && r.lane < 10 ? h('span', { class: 'tl-offm' }, 'hors méta') : null),
            h('span', null, h('span', { class: 'tl-t t-' + r.tier.replace('+', 'p').replace('-', 'm') }, r.tier)),
            h('span', null, oTier[r.id] ? h('span', { class: 'tl-t sm t-' + oTier[r.id].replace('+', 'p').replace('-', 'm') }, oTier[r.id]) : h('span', { class: 'muted small' }, '—')),
            h('span', { class: 'tl-wr ' + (r.wr >= 51 ? 'good' : r.wr < 49 ? 'bad' : '') }, `${fr(r.wr, 1)} %`, r.d != null ? h('small', null, `${r.d > 0 ? '+' : ''}${fr(r.d, 1)}`) : null),
            h('span', null, `${fr(r.pick, 1)} %`),
            h('span', null, `${fr(r.ban, 1)} %`),
            h('span', { class: 'muted' }, r.games.toLocaleString('fr-FR')))));
      }
    }
    const pt = (D && D.patches) || {};
    const ptTxt = pt.kr && pt.euw && pt.kr !== pt.euw ? `patch ${pt.kr} en Corée, ${pt.euw} en Europe` : `patch ${(pt[P.region]) || (D && D.patch) || '?'}`;
    const foot = D && D.maj ? h('p', { class: 'muted small' }, `Données : ${D.source || 'LoLalytics'} · ${ptTxt} · relevées le ${dateFr(D.maj)}, mises à jour chaque jour.`) : null;
    view.replaceChildren(hero, draftTabs(), filters, trend, body, foot);
  }

  // ----- Puzzles de draft : la compo adverse est connue, 3 alliés aussi ; choisis le meilleur duo pour les 2 rôles restants. -----
  // Les bonnes réponses viennent des taux de victoire de LoLalytics (Émeraude+), relevés chaque semaine (tools/puzzles_draft.py).
  // Progression personnelle seulement (pas de classement entre joueurs : on est une équipe).
  const PZ_LANES = [['top', 'Top', '🛡️'], ['jungle', 'Jungle', '🌲'], ['middle', 'Mid', '✨'], ['bottom', 'ADC', '🏹'], ['support', 'Support', '💞']];
  const PZ = { data: null, loading: false, cur: null, pick: null, fifty: null, err: '', last: null };
  const pzStats = () => ({ cote: 1000, serie: 0, best: 0, ok: 0, total: 0, done: [], days: [], ...load('fire.pz', {}) });
  const pzDue = () => !!(PZ.data && PZ.data.puzzles && PZ.data.puzzles.length && !pzStats().days.includes(todayYmd()));
  async function pzLoad() {
    if (PZ.loading || !window.fire.puzzles) return;
    PZ.loading = true;
    try { PZ.data = await window.fire.puzzles(); PZ.err = PZ.data && PZ.data.puzzles && PZ.data.puzzles.length ? '' : 'Les puzzles de la semaine ne sont pas encore prêts.'; }
    catch (e) { PZ.err = 'Puzzles indisponibles (hors ligne ?)'; }
    PZ.loading = false;
    if (S.section === 'draft' && S.drTab === 'puzzle') renderPuzzles(); else renderNav();
  }
  function pzNext() {
    const st = pzStats();
    const list = (PZ.data && PZ.data.puzzles) || [];
    PZ.cur = list.find((p) => !st.done.includes(p.id)) || null;
    PZ.pick = null; PZ.fifty = null; PZ.last = null;
  }
  function pzStreakDays(days) {
    let n = 0; let d = days.includes(todayYmd()) ? todayYmd() : addDays(todayYmd(), -1);
    while (days.includes(d)) { n++; d = addDays(d, -1); }
    return n;
  }
  function pzAnswer(i) {
    const p = PZ.cur;
    if (!p || PZ.pick !== null) return;
    PZ.pick = i;
    const st = pzStats();
    const ok = i === p.bon;
    let delta;
    if (ok) { st.serie++; delta = 15 + Math.min(10, (st.serie - 1) * 2); if (PZ.fifty) delta = Math.round(delta / 2); st.ok++; }
    else { st.serie = 0; delta = -12; }
    st.best = Math.max(st.best, st.serie);
    st.total++;
    st.cote = Math.max(0, st.cote + delta);
    st.done = st.done.concat(p.id).slice(-500);
    if (!st.days.includes(todayYmd())) st.days = st.days.concat(todayYmd()).slice(-120);
    save('fire.pz', st);
    PZ.last = { ok, delta };
    renderPuzzles(); renderNav();
  }
  function pzFifty() {
    const p = PZ.cur;
    if (!p || PZ.pick !== null || PZ.fifty) return;
    const wrong = p.choix.map((_, i) => i).filter((i) => i !== p.bon);
    // On retire les deux moins bons choix restants au hasard parmi les mauvais.
    PZ.fifty = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
    renderPuzzles();
  }
  function pzChamp(c, size) { return champIcon(c.id, size || 36); }
  const pct = (x) => (Math.round(x * 10) / 10).toLocaleString('fr-FR') + ' %';
  function renderPuzzles() {
    const view = $('view');
    if (!S.champList) loadChampions();
    if (!PZ.data) pzLoad();
    if (PZ.data && !PZ.cur && PZ.pick === null) pzNext();
    const st = pzStats();
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🧩'), h('div', null, h('h1', { class: 'title' }, 'Puzzles de draft'),
      h('p', { class: 'muted' }, 'Contre la composition adverse : la compo ennemie est connue, choisis le duo qui gagne le plus contre ses adversaires de lane.')));
    const prec = st.total ? Math.round((st.ok / st.total) * 100) + ' %' : '—';
    const days = pzStreakDays(st.days);
    const mon = mondayOf(todayYmd());
    const week = h('div', { class: 'pz-week' }, ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, k) => {
      const d = addDays(mon, k);
      return h('span', { class: 'pz-dot' + (st.days.includes(d) ? ' on' : '') + (d === todayYmd() ? ' today' : '') }, st.days.includes(d) ? '🔥' : l);
    }));
    const stats = h('div', { class: 'pz-stats' },
      h('div', { class: 'pz-stat big' }, h('small', null, 'Cote de puzzles'), h('b', null, String(st.cote))),
      h('div', { class: 'pz-stat' }, h('small', null, 'Série'), h('b', null, String(st.serie))),
      h('div', { class: 'pz-stat' }, h('small', null, 'Meilleure série'), h('b', null, String(st.best))),
      h('div', { class: 'pz-stat' }, h('small', null, 'Précision'), h('b', null, prec)),
      h('div', { class: 'pz-stat days' }, h('small', null, 'Jours d’affilée'), h('b', null, String(days)), week));
    const nodes = [hero, draftTabs(), stats];
    if (!PZ.data) nodes.push(h('div', { class: 'card empty-state' }, h('b', null, PZ.err || 'Chargement des puzzles…')));
    else if (!PZ.cur) {
      const n = (PZ.data.puzzles || []).length;
      nodes.push(h('div', { class: 'card empty-state' }, h('b', null, n ? `🏆 Tu as fait les ${n} puzzles de la semaine !` : (PZ.err || 'Pas de puzzle pour le moment.')),
        h('p', { class: 'muted small' }, 'De nouveaux puzzles arrivent chaque lundi avec les stats à jour.'),
        n ? h('button', { class: 'btn-ghost', onclick: () => { const s2 = pzStats(); s2.done = s2.done.filter((id) => !(PZ.data.puzzles || []).some((p) => p.id === id)); save('fire.pz', s2); pzNext(); renderPuzzles(); } }, '🔁 Les refaire') : null));
    } else nodes.push(pzBoard(PZ.cur));
    if (PZ.data && PZ.data.patch) nodes.push(h('p', { class: 'muted small pz-src' }, `Données : LoLalytics · ${PZ.data.niveau || 'Émeraude+'} · patch ${PZ.data.patch} · relevées le ${dateFr(PZ.data.genere)}, mises à jour chaque lundi. `,
      'Le bon duo est celui qui gagne le plus souvent contre ses deux adversaires de lane directs.'));
    view.replaceChildren(...nodes.filter(Boolean));
  }
  function pzBoard(p) {
    const done = PZ.pick !== null;
    const side = (team, blue) => h('div', { class: 'pz-side ' + (blue ? 'blue' : 'red') },
      h('div', { class: 'pz-side-t' }, blue ? h('span', null, 'CÔTÉ BLEU ', h('small', null, '(vous)')) : 'CÔTÉ ROUGE'),
      PZ_LANES.map(([lane, label, ico]) => {
        const c = team[lane];
        const open = blue && p.ouverts.includes(lane);
        if (open) {
          const pick = done ? p.choix[PZ.pick][lane === p.ouverts[0] ? 'a' : 'b'] : null;
          return h('div', { class: 'pz-slot open' + (done ? (PZ.pick === p.bon ? ' good' : ' bad') : '') },
            pick ? pzChamp(pick) : h('span', { class: 'pz-hex' }), h('b', null, pick ? pick.nom : 'Votre choix'), h('span', { class: 'pz-lane', title: label }, ico));
        }
        return h('div', { class: 'pz-slot' }, pzChamp(c), h('b', null, c.nom), h('span', { class: 'pz-lane', title: label }, ico));
      }));
    const lab = (lane) => (PZ_LANES.find((x) => x[0] === lane) || [])[1];
    const opts = h('div', { class: 'pz-opts' }, p.choix.map((c, i) => {
      const gone = PZ.fifty && PZ.fifty.includes(i);
      const cls = 'pz-opt' + (gone ? ' gone' : '') + (done && i === p.bon ? ' good' : '') + (done && i === PZ.pick && i !== p.bon ? ' bad' : '');
      return h('button', { class: cls, disabled: done || gone ? true : null, onclick: () => pzAnswer(i) },
        h('span', { class: 'pz-letter' }, 'ABCD'[i]),
        h('div', { class: 'pz-duo' }, pzChamp(c.a, 44), pzChamp(c.b, 44)),
        h('div', { class: 'pz-names' }, c.a.nom, h('span', { class: 'muted' }, ' + '), c.b.nom),
        done ? h('div', { class: 'pz-why' },
          h('span', null, `${c.a.nom} vs ${p.rouge[p.ouverts[0]].nom} : ${pct(c.a.wr)}`),
          h('span', null, `${c.b.nom} vs ${p.rouge[p.ouverts[1]].nom} : ${pct(c.b.wr)}`),
          h('b', { class: c.score >= 0 ? 'st-ok' : 'st-bad' }, (c.score >= 0 ? '+' : '') + pct(c.score).replace(' %', ' pts'))) : null);
    }));
    const L = PZ.last;
    const center = h('div', { class: 'pz-center' },
      h('div', { class: 'pz-arch' }, h('span', null, 'VOS CHOIX'), h('small', { class: 'muted' }, `${lab(p.ouverts[0])} + ${lab(p.ouverts[1])}`)),
      opts,
      !done ? h('button', { class: 'pz-fifty', disabled: PZ.fifty ? true : null, onclick: pzFifty }, h('b', null, '50 / 50'), h('small', null, 'Éliminer deux choix'), h('small', { class: 'st-bad' }, 'gain de cote divisé par 2')) : null,
      done ? h('div', { class: 'pz-res ' + (L && L.ok ? 'ok' : 'ko') },
        h('b', null, L && L.ok ? `✅ Bien vu ! ${L.delta > 0 ? '+' : ''}${L.delta} de cote` : `❌ Raté : la bonne réponse était ${'ABCD'[p.bon]} (${L ? L.delta : ''} de cote)`),
        h('p', { class: 'muted small' }, `${p.choix[p.bon].a.nom} gagne ${pct(p.choix[p.bon].a.wr)} de ses parties contre ${p.rouge[p.ouverts[0]].nom}, et ${p.choix[p.bon].b.nom} ${pct(p.choix[p.bon].b.wr)} contre ${p.rouge[p.ouverts[1]].nom}.`),
        h('button', { class: 'btn-fire', onclick: () => { pzNext(); renderPuzzles(); } }, 'Puzzle suivant →')) : null);
    return h('div', { class: 'card pz-board' }, side(p.bleu, true), center, side(p.rouge, false));
  }

  function renderDraftLive() {
    const view = $('view');
    if (!S.champList) loadChampions();
    const d = DR.d;
    const hero = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '⚡'), h('div', null, h('h1', { class: 'title' }, 'Draft en direct'),
      h('p', { class: 'muted' }, 'FIRE suit ta sélection des champions dans le client LoL : ton matchup, les runes conseillées et leur import en un clic.')));
    const wait = (t, sub) => view.replaceChildren(hero, h('div', { class: 'card empty-state dr-wait' }, h('b', null, t), sub ? h('p', { class: 'muted small' }, sub) : null));
    if (!window.fire.lcu) return wait('Fonction indisponible dans cette version.');
    if (!d) return wait('Recherche du client League of Legends…');
    if (!d.client) return wait('Client League of Legends non détecté.', 'Ouvre League of Legends sur ce PC : FIRE le repère tout seul, rien à configurer.');
    if (!live(d)) return wait('Client détecté ✓ · en attente d’une draft', 'Lance une partie (classée, normale, flex…) : dès la sélection des champions, tout s’affiche ici en direct.');
    const inGame = d.phase === 'InProgress';
    const me = d.me || {};
    const opp = opponent(d);
    const row = (p, enemy) => {
      const chosen = enemy && opp && p.champ && opp.champ === p.champ;
      const click = enemy && !inGame && p.champ && me.pos ? () => { DR.opp[me.pos] = p.champ; renderDraft(); } : null;
      return h(click ? 'button' : 'div', { class: 'dr-row' + (p.me ? ' me' : '') + (chosen ? ' opp' : '') + (p.hover ? ' hover' : ''), onclick: click, title: click ? 'C’est mon vis-à-vis' : null },
        p.champ ? champIcon(p.champ, 40) : h('span', { class: 'dr-empty' }, '?'),
        h('span', { class: 'dr-n' }, h('b', null, p.name || (p.champ ? FC.champName(p.champ) : enemy ? 'En attente…' : 'Pas encore choisi')),
          h('span', { class: 'muted small' }, [p.pos ? POSN[p.pos] : null, p.me ? 'toi' : null, p.hover ? 'survole' : null, chosen ? 'ton vis-à-vis' : null].filter(Boolean).join(' · '))));
    };
    const meName = me.name || (me.champ ? FC.champName(me.champ) : '');
    const lane = POSLANE[me.pos] || '';
    const statsUrl = me.champ ? `https://lolalytics.com/lol/${lolSlug(me.champ)}/${opp && opp.champ ? 'vs/' + lolSlug(opp.champ) + '/' : ''}build/${lane ? '?lane=' + lane : ''}` : null;
    const rk = me.key ? me.key + ':' + (me.pos || '') : null;
    if (!inGame && me.key) loadRunes(me);
    const R = rk ? DR.runes[rk] : null;
    const runeBlock = inGame ? null : !me.champ ? h('p', { class: 'muted' }, 'Choisis (ou survole) ton champion : les runes conseillées apparaissent ici.')
      : !R || R.loading ? h('p', { class: 'muted' }, 'Lecture des runes recommandées…')
        : !R.ok || !R.pages.length ? h('p', { class: 'muted' }, '⚠ Le client n’a pas renvoyé de runes recommandées' + (R.error ? ` (${R.error})` : '') + '.')
          : h('div', { class: 'dr-pages' }, R.pages.map((pg, i) => h('div', { class: 'dr-page' },
            h('div', { class: 'dr-pg-h' }, pg.perks[0] && pg.perks[0].icon ? h('img', { class: 'dr-key', src: pg.perks[0].icon, alt: '' }) : null,
              h('span', null, h('b', null, (pg.perks[0] && pg.perks[0].name) || 'Page ' + (i + 1)), h('span', { class: 'muted small' }, `${pg.primary.name} + ${pg.sub.name}`))),
            h('div', { class: 'dr-perks' }, pg.perks.slice(1).map((x) => h('span', { class: 'dr-perk', title: x.name }, x.icon ? h('img', { src: x.icon, alt: '' }) : null, h('span', null, x.name)))),
            h('button', { class: 'btn-fire', disabled: DR.busy ? true : null, onclick: () => importRunes(pg, meName) }, DR.busy ? 'Import…' : '⬇ Mettre cette page dans le client'))));
    const M = DR.msg;
    const cat = POSCAT[me.pos];
    view.replaceChildren(...[hero,
      h('div', { class: 'card dr-status' }, h('span', { class: 'dr-live' }, inGame ? '🔴 Partie en cours' + (d.game && d.game.time ? ` · ${Math.floor(d.game.time / 60)} min` : '') : '🔴 Sélection des champions en direct'),
        h('span', { class: 'dr-timer muted' }, d.timer && d.timer.left ? `⏱ ${d.timer.left} s` : '')),
      h('div', { class: 'dr-teams' },
        h('div', { class: 'card' }, h('h3', null, '🔵 Ton équipe'), d.allies.map((p) => row(p, false))),
        h('div', { class: 'card' }, h('h3', null, '🔴 En face'), !inGame && me.pos ? h('p', { class: 'muted small' }, 'Clique sur ton vis-à-vis pour adapter le matchup.') : null, d.enemies.map((p) => row(p, true)))),
      me.champ ? h('div', { class: 'card dr-match' },
        h('div', { class: 'dr-vs' }, champIcon(me.champ, 64), h('div', null, h('b', null, meName), h('span', { class: 'muted small' }, POSN[me.pos] || '')),
          h('span', { class: 'dr-vs-x' }, 'VS'),
          opp && opp.champ ? champIcon(opp.champ, 64) : h('span', { class: 'dr-empty big' }, '?'),
          h('div', null, h('b', null, opp ? (opp.name || FC.champName(opp.champ)) : 'Vis-à-vis à choisir'), h('span', { class: 'muted small' }, opp ? (POSN[opp.pos] || '') : 'clique dessus dans « En face »'))),
        h('div', { class: 'row dr-acts' },
          statsUrl ? h('button', { class: 'btn-fire', onclick: () => window.fire.lcu.stats(statsUrl) }, opp ? `📊 Meilleures runes contre ${opp.name || FC.champName(opp.champ)}` : `📊 Meilleures runes de ${meName}`) : null,
          cat ? h('button', { class: 'btn-ghost', onclick: () => { S.section = 'guides'; S.guideCat = cat; S.theme = null; render(); window.scrollTo(0, 0); } }, `📚 Carnet ${POSN[me.pos]}`) : null),
        h('p', { class: 'muted small' }, 'Les runes du matchup (taux de victoire de chaque page de runes contre ce champion, d’après les parties classées) s’ouvrent dans une fenêtre à part, sur lolalytics.com.')) : null,
      !inGame && me.champ ? h('div', { class: 'card' }, h('h3', null, `⚡ Runes recommandées par Riot pour ${meName}${me.pos ? ' ' + POSN[me.pos] : ''}`), runeBlock,
        M ? h('p', { class: M.ok ? 'ok-t' : 'bad' }, M.t, M.replace ? h('span', null, ' ', h('button', { class: 'btn-ghost', onclick: () => importRunes(M.pg, M.label, M.replace.id) }, 'Oui, remplacer'), ' ', h('button', { class: 'linkbtn', onclick: () => { DR.msg = ''; renderDraft(); } }, 'Non')) : null) : null) : null,
      inGame ? h('p', { class: 'muted small' }, 'En partie, les runes ne peuvent plus être changées : ce récap sert à revoir ton matchup. Le vis-à-vis vient des postes donnés par Riot.') : null].filter(Boolean));
  }

  // ----- Entraînement micro : les modes de loldodgegame.com (jeu fan-made de swompy), joués dans l'app -----
  const TRAIN = [
    ['dodge', '/dodge/', '🏃', 'Esquive', 'Survis le plus longtemps possible en esquivant les skillshots qui arrivent de partout.', 'Tous les rôles'],
    ['skillshot', '/skillshot/', '🎯', 'Skillshots', 'Touche des cibles qui bougent avec tes sorts : précision et vitesse.', 'Mid, support, ADC'],
    ['kiting', '/kiting/', '🏹', 'Kiting', "Attaque-déplacement et orb-walk : tape sans t'arrêter de bouger.", 'ADC, mid'],
    ['farming', '/farming/', '🌾', 'Last hit', 'Prends le dernier coup sur chaque sbire pour récupérer tout l’or de la vague.', 'Top, mid, ADC'],
    ['1vs1', '/1vs1/', '⚔️', 'Duel 1v1', 'Affronte une IA ou un autre joueur en duel.', 'Top, mid'],
    ['mobabattle', '/mobabattle/', '💥', 'Teamfight', 'Des combats d’équipe condensés : placement et réflexes.', 'Tous les rôles'],
    ['duo', '/duo/', '🤝', 'Duo', 'Entraîne ta synergie avec un autre joueur.', 'Botlane, duo jungle'],
    ['lol-guessr', '/lol-guessr/', '🗺️', 'LoL Guessr', 'Devine l’endroit de la carte ou l’objet affiché.', 'Tous les rôles'],
    ['lolrogue', '/lolrogue/', '🃏', 'LoL Rogue', 'Une aventure roguelike façon Slay the Spire dans l’univers de LoL.', 'Pour souffler']
  ];
  const TRAIN_SITE = 'https://loldodgegame.com';
  function renderTrain() {
    const view = $('view');
    const mode = TRAIN.find((m) => m[0] === load('fire.train.mode', 'dodge')) || TRAIN[0];
    // Les rendus automatiques (stats, messages) ne doivent pas relancer une partie en cours.
    if (view.querySelector(`.tr-frame[data-mode="${mode[0]}"]`)) return;
    const pick = (k) => { save('fire.train.mode', k); renderTrain(); };
    const url = TRAIN_SITE + mode[1];
    const frame = h('iframe', { class: 'tr-frame', 'data-mode': mode[0], src: url, title: 'Entraînement ' + mode[3],
      allow: 'fullscreen; autoplay; gamepad', allowfullscreen: true,
      sandbox: 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups allow-modals' });
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🎯'), h('div', null, h('h1', { class: 'title' }, 'Entraînement micro'),
        h('p', { class: 'muted' }, 'Esquive, skillshots, kiting, last hit : travaille tes mécaniques entre deux games, sans lancer League of Legends.'))),
      h('div', { class: 'tr-modes' }, TRAIN.map((m) => h('button', { class: 'tr-mode', 'aria-pressed': String(m[0] === mode[0]), onclick: () => pick(m[0]) },
        h('span', { class: 'tr-ico' }, m[2]), h('span', null, h('b', null, m[3]), h('span', { class: 'muted small' }, m[5]))))),
      h('div', { class: 'card tr-card' },
        h('div', { class: 'tr-head' },
          h('div', null, h('b', null, mode[2] + ' ' + mode[3]), h('p', { class: 'muted small' }, mode[4])),
          h('div', { class: 'row' },
            h('button', { class: 'btn-ghost', title: 'Recommencer', onclick: () => { frame.src = url; } }, '⟳ Recharger'),
            h('button', { class: 'btn-ghost', onclick: () => { (frame.requestFullscreen ? frame.requestFullscreen() : Promise.reject()).catch(() => {}); } }, '⛶ Plein écran'),
            h('a', { class: 'btn-ghost', href: url, target: '_blank' }, '↗ Navigateur'))),
        frame,
        h('p', { class: 'muted small' }, 'Clique dans le jeu avant de jouer pour qu’il reçoive le clavier et la souris (Échap pour sortir du plein écran). Jeu fan-made créé par swompy, intégré tel quel depuis ',
          h('a', { href: TRAIN_SITE + '/', target: '_blank' }, 'loldodgegame.com'), ' : tes scores et réglages restent ceux du site.')));
  }

  function renderLolPatch() {
    const view = $('view');
    if (!LP.list) loadLolPatch();
    const list = LP.list || [];
    if (!LP.cur && list[0]) { setTimeout(() => openLolPatch(list[0].url), 0); }
    const a = LP.cur ? LP.art[LP.cur] : null;
    const it = list.find((x) => x.url === LP.cur) || {};
    const dateFr = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const article = !LP.cur ? null
      : !a ? h('div', { class: 'card empty-state' }, 'Chargement du patch…')
        : !a.ok ? h('div', { class: 'card' }, h('p', { class: 'bad' }, '⚠ Impossible de lire ce patch pour le moment' + (a.error ? ` (${a.error})` : '') + '.'),
          a.link ? h('a', { href: a.link, target: '_blank' }, 'Le lire sur leagueoflegends.com') : null)
          : h('article', { class: 'card lp-art' },
            a.banner || it.img ? h('img', { class: 'lp-banner', src: a.banner || it.img, alt: '' }) : null,
            h('h2', { class: 'lp-title' }, a.title || it.title),
            h('p', { class: 'muted small' }, dateFr(a.date || it.date), ' · ', h('a', { href: a.link, target: '_blank' }, 'Voir sur le site officiel')),
            a.desc ? h('p', { class: 'lp-desc' }, a.desc.replace(/<[^>]+>/g, '')) : null,
            lolHtml(a.html));
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '📜'), h('div', null, h('h1', { class: 'title' }, 'Patchs de League of Legends'),
        h('p', { class: 'muted' }, 'Les notes de patch officielles de Riot, en français, dès leur mise en ligne sur leagueoflegends.com.'))),
      h('div', { class: 'lp-wrap' },
        h('aside', { class: 'lp-list' },
          h('div', { class: 'row' }, h('button', { class: 'btn-ghost', disabled: LP.loading ? true : null, onclick: () => loadLolPatch(true) }, LP.loading ? 'Chargement…' : '⟳ Actualiser')),
          LP.err ? h('p', { class: 'muted small' }, '⚠ Site de Riot indisponible : liste enregistrée affichée.') : null,
          !LP.list ? h('p', { class: 'muted small' }, 'Chargement des patchs…') : !list.length ? h('p', { class: 'muted small' }, 'Aucun patch trouvé pour le moment.') : null,
          list.map((x, i) => h('button', { class: 'lp-item' + (x.url === LP.cur ? ' on' : ''), onclick: () => { openLolPatch(x.url); window.scrollTo(0, 0); } },
            x.img ? h('img', { src: x.img, alt: '' }) : null,
            h('span', null, h('b', null, x.title.replace(/ de League of Legends$/, '')), h('span', { class: 'muted small' }, dateFr(x.date) + (i === 0 ? ' · le plus récent' : '')))))),
        h('div', { class: 'lp-main' }, article || h('div', { class: 'card empty-state' }, 'Choisis un patch dans la liste.'))));
  }

  const PATCH_KIND = { new: ['🆕', 'Nouveau'], improve: ['✨', 'Amélioré'], fix: ['🛠️', 'Corrigé'] };
  function renderPatch() {
    const view = $('view');
    const list = S.patch || [];
    view.replaceChildren(...[
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🆕'), h('div', null, h('h1', { class: 'title' }, 'Patch notes'),
        h('p', { class: 'muted' }, `Tout ce qui change dans FIRE : les versions de l'app et chaque mise à jour du contenu (diapos, quiz, guides…). Tu as la v${S.version}.`))),
      bugCard(),
      S.coachState.coach ? bugInbox() : null,
      h('h2', { class: 'team-h' }, '📜 Les versions'),
      !S.patch ? h('div', { class: 'empty-state' }, 'Chargement des patch notes…') : null,
      h('div', { class: 'patch-list' }, list.map((x, i) => h('article', { class: 'card patch' + (x.contenu ? ' content' : '') + (x.v && x.v === S.version ? ' cur' : '') + (x.v && newer(x.v, S.version) ? ' soon' : '') },
        h('div', { class: 'patch-h' },
          h('span', { class: 'patch-v' + (x.contenu ? ' content' : '') }, x.contenu ? '📚 Contenu' : 'v' + x.v),
          h('span', { class: 'patch-t' }, x.titre),
          x.contenu ? h('span', { class: 'muted small' }, 'Sans mise à jour à installer') : x.v === S.version ? h('span', { class: 'pill-new' }, 'Ta version') : newer(x.v, S.version) ? h('span', { class: 'pill-new soon' }, 'À installer') : null,
          h('span', { class: 'muted small patch-d' }, x.date ? dayFr(x.date, { day: 'numeric', month: 'long', year: 'numeric' }) : '')),
        h('ul', { class: 'patch-items' }, (x.items || []).map(([k, t]) => h('li', { class: 'pk-' + k }, h('span', { class: 'pk-tag' }, (PATCH_KIND[k] || ['•', '']).join(' ')), h('span', null, t)))))))].filter(Boolean));
  }

  function renderNav() {
    const n = unseen().length;
    const b = (id, label, badge, cls) => h('button', { class: 'navbtn' + (cls ? ' ' + cls : ''), 'aria-current': S.section === id ? 'page' : null, onclick: () => go(id) }, label, badge ? h('span', { class: 'nbadge' }, badge) : null);
    const u = S.upd || {};
    const upd = !u.store && ((u.auto && u.state === 'ready') || (u.latest && newer(u.latest, S.version))) ? '1' : null;
    const items = [['stats', '📊', 'Stats des joueurs', Object.keys(liveAll()).length ? String(Object.keys(liveAll()).length) : null, Object.keys(liveAll()).length ? 'navlive' : null], ['pool', '🧙', 'POOL', newsCount('pool') || null], ['planning', '📅', 'Planning', planTodo() || null], ['jeux', '🎮', 'Détente', newsCount('jeux') || null], ['train', '🎯', 'Micro'],
      ['chat', '💬', 'Discussion', chatUnread() || null], ['vocal', '🎙️', 'Vocal', vocalBadge(), vocalLive() ? 'navlive' : null], ['clips', '🎬', 'Clips'], ['draft', '⚡', 'Draft', draftBadge()], ['worlds', '🏆', 'E-sport'], ['guides', '📚', 'Lanes et principes', newsCount('guides') || null], ['scrims', '🤝', 'Scrims'], ['parcours', '🗺️', 'Parcours'], ['puzzle', '🧩', 'Puzzle du jour', window.FIRE_PUZZLES && !(gpSave().days || {})[gpToday()] ? '!' : null],
      ['coach', '📣', 'Parole du coach', n || null], ['revue', '🎞️', 'Revue de parties'], ['parties', '🔬', 'Analyse de parties'], ['outils', '🧰', 'Outils'], ...(meetOk() ? [['reunion', '🧑‍🏫', 'Salle de réunion']] : []), ...(isStaff() ? [['carnet', '📒', 'Carnet de bord', pendingCount() || null]] : []), ['patch', '🆕', 'Patch notes', patchUnseen() ? '!' : null], ['lolpatch', '📜', 'Patchs LoL', lolUnseen() ? '!' : null], ['settings', '⚙️', 'Paramètres', upd]];
    if (SUB()) { const keep = items.filter(([id]) => SUB_OK.has(id)); items.length = 0; items.push(...keep); }
    // V2 (aperçu) : barre latérale en groupes, icônes Lucide. Sinon : la barre du haut habituelle.
    if (window.FIREV2 && window.FIREV2.on) { window.FIREV2.nav($('nav'), items.map(([id, , label, badge, cls]) => ({ id, label, badge, cls })), S.section, go); return; }
    $('nav').replaceChildren(...items.map(([id, ico, label, badge, cls]) => b(id, ico + ' ' + label, badge, cls)));
  }

  function pendingBanner() {
    const pend = load('fire.pending', null);
    if (!pend || !pend.slug) return null;
    return h('div', { class: 'news nm-pend' }, h('span', { class: 'news-ico' }, '⏳'),
      h('span', { class: 'news-txt' }, h('b', null, 'Ton profil attend la validation. '), 'Tes stats se chargent déjà pour toi ; le créateur, un coach ou le chef d’équipe va valider ta demande pour que toute l’équipe te voie.' + (pend.sent ? '' : ' (Demande pas encore envoyée : nouvel essai automatique.)'),
        S.status[pend.slug] && S.status[pend.slug].state === 'error' ? h('span', { class: 'bad' }, ' Ton profil dpm.lol ne se charge pas : vérifie ton lien. ') : null),
      h('button', { class: 'btn-ghost small-btn', onclick: () => askNew(false, pend) }, '✏️ Corriger mon lien dpm.lol'));
  }
  function newsBanner() {
    const u = unseen().filter((f) => !(isNote(f) && isCommon(f)));
    if (!u.length) return null;
    const f = u[0];
    return h('button', { class: 'news', onclick: () => openFiche(f.id) },
      h('span', { class: 'news-ico' }, '📣'),
      h('span', { class: 'news-txt' }, h('b', null, 'Nouveau du coach : '), f.titre, u.length > 1 ? h('span', { class: 'muted' }, ` (et ${u.length - 1} autre${u.length > 2 ? 's' : ''})`) : null),
      h('span', { class: 'news-go' }, 'Lire →'));
  }

  async function loadFiches() {
    S.fichesLoading = true;
    let r;
    try { r = await window.fire.fiches(); } catch (e) { r = { ok: false, error: String(e) }; }
    S.fichesLoading = false;
    if (r && r.ok) { S.fiches = r.fiches; S.fichesErr = r.offline ? 'Hors ligne : seules les fiches déjà téléchargées sont affichées.' : ''; if (!r.offline) notifFiches(); }
    else { S.fiches = S.fiches || []; S.fichesErr = (r && r.error) || 'fiches indisponibles'; }
    renderNav();
    if (typing()) return;
    if (S.section === 'coach' || S.section === 'guides' || (S.section === 'stats' && S.view === 'hub')) render();
  }

  function markSeen(id) {
    if (S.seen.has(id)) return;
    S.seen.add(id);
    save('fire.vus', [...S.seen].slice(-300));
  }

  function openFiche(id) {
    S.section = 'coach';
    S.ficheId = id;
    markSeen(id);
    render();
    window.scrollTo(0, 0);
  }

  // ----- Texte simple : paragraphes, listes « - », **gras** (sans HTML) -----
  function inline(t) {
    const out = [];
    const re = /\*\*(.+?)\*\*/g;
    let i = 0, m;
    while ((m = re.exec(t))) { if (m.index > i) out.push(t.slice(i, m.index)); out.push(h('b', null, m[1])); i = re.lastIndex; }
    if (i < t.length) out.push(t.slice(i));
    return out;
  }
  function md(text) {
    const out = [];
    for (const block of String(text || '').split(/\n\s*\n/)) {
      let list = null, para = [];
      const flush = () => { if (para.length) { out.push(h('p', null, para.map((l, i) => [i ? h('br') : null, inline(l)]))); para = []; } };
      for (const raw of block.split('\n')) {
        const l = raw.trim();
        if (!l) continue;
        const m = l.match(/^[-•]\s+(.*)$/);
        if (m) { flush(); if (!list) { list = h('ul'); out.push(list); } list.append(h('li', null, inline(m[1]))); }
        else { list = null; para.push(l); }
      }
      flush();
    }
    return out;
  }

  // Les visuels font référence à la carte par « rift:map », « rift:lane », « rift:arena » : on y met les images de guides.json.
  const withRift = (svg) => String(svg).replace(/rift:(map|lane|arena)/g, (m, k) => (S.assets && S.assets[k === 'map' ? 'rift' : k]) || m);
  const svgSrc = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withRift(svg));
  const ytId = (u) => { const m = String(u).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : null; };

  function zoom(src, cap) {
    const box = h('div', { class: 'zoom', onclick: () => box.remove() }, h('img', { src, alt: cap || '' }), cap ? h('p', null, cap) : null, h('span', { class: 'zoom-x' }, '✕ Fermer'));
    document.body.append(box);
  }

  function docNodes(doc) {
    const nodes = [];
    if (doc.accroche) nodes.push(h('p', { class: 'lead doc-lead' }, doc.accroche));
    (doc.sections || []).forEach((sec) => {
      let fig = null;
      if (sec.schema && sec.schema.svg) {
        const src = svgSrc(sec.schema.svg);
        fig = h('figure', { class: 'schema' }, h('img', { src, alt: sec.schema.legende || 'schéma', onclick: () => zoom(src, sec.schema.legende) }),
          h('figcaption', null, (sec.schema.legende ? sec.schema.legende + ' ' : ''), h('span', { class: 'muted' }, '(clique pour agrandir)')));
      }
      nodes.push(h('section', { class: 'card doc-sec' + (fig ? ' with-fig' : '') }, sec.titre ? h('h2', null, sec.titre) : null, h('div', { class: 'md' }, md(sec.texte)), fig));
    });
    if (doc.a_retenir && doc.a_retenir.length) nodes.push(h('div', { class: 'card doc-retenir' }, h('h2', null, '✅ À retenir'), h('ul', { class: 'checks' }, doc.a_retenir.map((x) => h('li', null, x)))));
    if (doc.exercice) nodes.push(h('div', { class: 'card doc-exo' }, h('h2', null, '🎮 Exercice pour ta prochaine game'), h('p', null, doc.exercice)));
    if (doc.videos && doc.videos.length) {
      nodes.push(h('div', { class: 'card' }, h('h2', null, "🎬 Vidéos pour voir l'exemple"), h('div', { class: 'videos' }, doc.videos.map((v) => {
        const id = ytId(v.url);
        return h('a', { class: 'video', href: v.url, target: '_blank' },
          id ? h('img', { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: '' }) : h('div', { class: 'video-ph' }, '▶'),
          h('div', { class: 'video-t' }, v.titre), v.auteur ? h('div', { class: 'muted small' }, v.auteur) : null);
      }))));
    }
    if (doc.sources && doc.sources.length) {
      nodes.push(h('p', { class: 'muted small sources' }, 'Sources : ', doc.sources.map((x, i) => [i ? ' · ' : null, h('a', { href: x.url, target: '_blank' }, x.titre)])));
    }
    return nodes;
  }

  // Conseils propres à la lane quand on vient d'une catégorie (ex. « Pour le TOP »).
  function laneBanner(t) {
    const c = catOf(S.guideCat);
    const x = c && c.themes.find((y) => y.id === t.id);
    if (!x || !(x.conseils && x.conseils.length)) return null;
    return h('div', { class: 'lane-banner' },
      h('div', { class: 'lb-head' }, h('span', { class: 'lb-ico' }, c.ico), h('div', null, h('div', { class: 'lb-t' }, `Conseils ${c.titre}`), h('div', { class: 'muted small' }, x.focus))),
      h('div', { class: 'lb-tips' }, x.conseils.map((tip) => h('div', { class: 'lb-tip' }, h('span', { class: 'lb-dot' }, '➜'), h('span', null, tip)))));
  }

  // Le même exemple sur LoLValue Map Planner : le lien contient tout le plan, étape par étape, et chacun peut le modifier.
  function lvLink(url) {
    if (!url || !/^https:\/\/lolvalue\.com\/lol-map#plan=/.test(url)) return null;
    return h('a', { class: 'lv-link', href: url, target: '_blank', title: 'Ouvre le plan dans ton navigateur' },
      h('span', { class: 'lv-go' }, '▶ Voir en étapes sur LoLValue'),
      h('span', { class: 'lv-sub' }, 'les champions de l’équipe, étape par étape · tu peux le modifier'));
  }

  // Page d'un thème : « En bref » en tuiles, puis chaque principe dans un bloc qui se déplie.
  function themeNodes(t) {
    const nodes = [];
    if (t.accroche) nodes.push(h('p', { class: 'lead doc-lead' }, t.accroche));
    if (t.a_retenir && t.a_retenir.length) nodes.push(h('div', { class: 'bref' }, t.a_retenir.map((x, i) => h('div', { class: 'bref-tile' }, h('span', { class: 'bref-n' }, String(i + 1)), h('span', null, x)))));
    (t.sections || []).forEach((sec, i) => {
      let fig = null;
      if (sec.schema && sec.schema.svg) {
        const src = svgSrc(sec.schema.svg);
        fig = h('figure', { class: 'schema' }, h('img', { src, alt: sec.schema.legende || 'schéma', onclick: () => zoom(src, sec.schema.legende) }), h('figcaption', null, sec.schema.legende || ''),
          lvLink(sec.schema.lolvalue));
      }
      nodes.push(h('details', { class: 'acc', open: i < 2 ? true : null },
        h('summary', null, h('span', { class: 'acc-n' }, String(i + 1)), h('span', { class: 'acc-t' }, sec.titre), fig ? h('span', { class: 'acc-tag' + (sec.schema.anime ? ' anim' : '') }, sec.schema.anime ? '🎬 animé' : '🖼️ schéma') : null),
        h('div', { class: 'acc-body' + (fig ? ' with-fig' : '') }, h('div', { class: 'md' }, md(sec.texte)), fig)));
    });
    if (t.exercice) nodes.push(h('div', { class: 'quest' }, h('div', { class: 'quest-ico' }, '🎮'), h('div', null, h('div', { class: 'quest-t' }, 'Quête pour ta prochaine game'), h('p', null, t.exercice))));
    return nodes;
  }

  // ----- Lanes et principes -----
  const catOf = (id) => (S.guideCats || []).find((c) => c.id === id) || null;
  const myRole = () => { const me = S.players.find((p) => p.slug === S.moi); return me ? me.role_id : null; };
  const openTheme = (id) => { S.theme = id; const t = (S.guides || []).find((x) => x.id === id); if (t) markTheme(t); render(); window.scrollTo(0, 0); };

  function renderGuides() {
    if (S.guideCats && S.guideCats.length && S.guideCat !== 'all') {
      if (S.guideCat) { renderCategory(catOf(S.guideCat)); return; }
      renderCategories();
      return;
    }
    renderAllThemes();
  }

  // Lanes et principes : 5 grandes tuiles de lane (splash art), puis les principes du jeu en cartes.
  const LANE_ART = { top: ['Darius', 0], jungle: ['LeeSin', 0], mid: ['Ahri', 0], adc: ['Jinx', 0], support: ['Thresh', 0] };
  function laneArt(c) {
    const k = Object.keys(LANE_ART).find((x) => String(c.id).toLowerCase().includes(x) || (c.roles || []).includes(x)) || '';
    const a = LANE_ART[k] || (c.roles || []).map((r) => LANE_ART[r]).find(Boolean);
    return a ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${a[0]}_${a[1]}.jpg` : null;
  }
  // Chaque tuile de lane fait défiler des champions de la lane avec leurs skins (fondu enchaîné, léger zoom).
  const LANE_POOL = {
    top: ['Darius', 'Garen', 'Aatrox', 'Fiora', 'Jax', 'Camille', 'Riven', 'Sett', 'Mordekaiser', 'Irelia', 'Renekton', 'Gwen'],
    jungle: ['LeeSin', 'Viego', 'Khazix', 'Kayn', 'Hecarim', 'Elise', 'Graves', 'Vi', 'JarvanIV', 'Nidalee', 'Evelynn', 'Kindred'],
    mid: ['Ahri', 'Yasuo', 'Zed', 'Sylas', 'Akali', 'Syndra', 'Katarina', 'Leblanc', 'Orianna', 'Yone', 'Viktor', 'Lux'],
    adc: ['Jinx', 'Kaisa', 'Ezreal', 'Jhin', 'MissFortune', 'Caitlyn', 'Vayne', 'Lucian', 'Xayah', 'Samira', 'Ashe', 'Draven'],
    support: ['Thresh', 'Lux', 'Pyke', 'Nautilus', 'Leona', 'Rakan', 'Nami', 'Seraphine', 'Morgana', 'Senna', 'Soraka', 'Blitzcrank'],
  };
  const laneKey = (c) => Object.keys(LANE_POOL).find((x) => String(c.id).toLowerCase().includes(x) || (c.roles || []).includes(x)) || ((c.roles || []).find((r) => LANE_POOL[r]) || '');
  const laneShow = {};
  function laneSkins(c) {
    const k = laneKey(c);
    if (!k) return null;
    if (!laneShow[k] || (J.data && !laneShow[k].full)) {
      const byId = J.data ? Object.fromEntries(J.data.champs.map((x) => [x.id, x])) : {};
      const list = shuffle(LANE_POOL[k]).map((id) => {
        const ch = byId[id];
        const sk = ch && ch.skins && ch.skins.length ? pick(ch.skins.filter((x) => x.num > 0).concat(ch.skins.slice(0, 1))) : { num: 0 };
        return { id, num: sk.num, name: sk.name || id };
      });
      const first = LANE_ART[k] ? [{ id: LANE_ART[k][0], num: LANE_ART[k][1], name: '' }] : [];
      laneShow[k] = { full: !!J.data, list: first.concat(list.filter((x) => !first.some((f) => f.id === x.id))).slice(0, 10) };
    }
    return h('div', { class: 'lane-skins', 'data-step': String(4200 + Math.floor(Math.random() * 1600)), 'aria-hidden': 'true' },
      laneShow[k].list.map((x, i) => h('img', { class: 'lane-art' + (i === 0 ? ' on' : ''), alt: '', title: x.name, decoding: 'async',
        src: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${x.id}_${x.num}.jpg`,
        onerror: (e) => { const im = e.target, box = im.parentNode, wasOn = im.classList.contains('on'); im.remove(); if (wasOn && box && box.firstElementChild) box.firstElementChild.classList.add('on'); } })));
  }
  setInterval(() => {
    const now = Date.now();
    document.querySelectorAll('.lane-skins').forEach((b) => {
      const next = Number(b.dataset.next || 0);
      if (!next) { b.dataset.next = String(now + Number(b.dataset.step || 5000)); return; }
      if (now < next) return;
      b.dataset.next = String(now + Number(b.dataset.step || 5000));
      const imgs = [...b.querySelectorAll('img')];
      if (imgs.length < 2) return;
      const i = imgs.findIndex((x) => x.classList.contains('on'));
      // Le suivant déjà chargé (une image pas encore arrivée ne laisse jamais la tuile vide).
      for (let d = 1; d < imgs.length; d++) {
        const nx = imgs[(i + d + imgs.length) % imgs.length];
        if (nx.complete && nx.naturalWidth > 0) { imgs.forEach((x) => x.classList.remove('on')); nx.classList.add('on'); break; }
      }
    });
  }, 500);
  function renderCategories() {
    const view = $('view');
    if (!J.data && !J.loading && window.fire.jeux) loadJeux().then(() => { if (S.section === 'guides' && !S.guideCat && !S.theme && !typing()) renderCategories(); });
    const role = myRole();
    const seenThemes = new Set();
    const themes = [];
    for (const c of S.guideCats) for (const x of c.themes) { const t = themeOf(x.id); if (t && !seenThemes.has(t.id)) { seenThemes.add(t.id); themes.push(t); } }
    for (const t of S.guides || []) if (!seenThemes.has(t.id)) { seenThemes.add(t.id); themes.push(t); }
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '📚'), h('div', null, h('h1', { class: 'title' }, 'Lanes et principes'),
        h('p', { class: 'muted' }, 'Choisis ta lane pour son diaporama et ses conseils, ou ouvre directement un principe du jeu.'))),
      h('div', { class: 'lane-grid' }, S.guideCats.map((c) => {
        const mine = role && (c.roles || []).includes(role);
        const art = laneArt(c);
        const nNew = c.themes.filter((x) => { const t = themeOf(x.id); return t && themeIsNew(t); }).length;
        return h('button', { class: 'lane-tile' + (mine ? ' mine' : ''), onclick: () => { S.guideCat = c.id; S.theme = null; render(); window.scrollTo(0, 0); } },
          laneSkins(c) || (art ? h('img', { class: 'lane-art', src: art, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null),
          h('div', { class: 'lane-shade' }),
          h('div', { class: 'lane-top' }, mine ? h('span', { class: 'me-tag' }, 'Ta lane') : null, nNew ? h('span', { class: 'new-tag' }, `${nNew} nouveau${nNew > 1 ? 'x' : ''}`) : null),
          h('div', { class: 'lane-body' },
            h('div', { class: 'cat-ico' }, c.ico),
            h('div', { class: 'lane-t' }, c.titre),
            h('p', { class: 'lane-intro' }, c.intro),
            h('div', { class: 'lane-meta' },
              c.diapo ? h('span', { class: 'lane-go' }, `▶ Diaporama · ${c.diapo.slides.length} slides`) : null,
              h('span', { class: 'lane-n' }, `${c.themes.length} principes`))));
      })),
      h('h2', { class: 'hub-sec' }, h('span', null, '🧭 Les principes du jeu'), h('small', { class: 'muted' }, `${themes.length} thèmes, utiles à toutes les lanes`)),
      h('div', { class: 'princ-grid' }, themes.map((t) => h('button', { class: 'princ' + (themeIsNew(t) ? ' is-new' : ''), onclick: () => openTheme(t.id) },
        h('span', { class: 'princ-ico' }, t.ico),
        h('span', { class: 'princ-txt' }, h('b', null, t.titre.replace(/ \(.*\)$/, ''), themeIsNew(t) ? h('span', { class: 'new-tag' }, 'Nouveau') : null),
          t.accroche ? h('small', { class: 'muted' }, t.accroche.length > 110 ? t.accroche.slice(0, 108) + '…' : t.accroche) : null)))));
  }

  function renderCategory(c) {
    const view = $('view');
    if (!c) { S.guideCat = null; renderCategories(); return; }
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, c.ico), h('div', null, h('h1', { class: 'title' }, c.titre), h('p', { class: 'muted' }, c.intro))),
      (c.diapo && ((c.diapo.quiz || []).length || (c.diapo.defis || []).length))
        ? h('div', { class: 'diapo-row' }, diapoCard(c), h('div', { class: 'diapo-side' }, (c.diapo.quiz || []).length ? quizCard(c) : null, (c.diapo.scenarios || []).length ? scenCard(c) : null, (c.diapo.defis || []).length ? defisCard(c) : null))
        : diapoCard(c),
      h('div', { class: 'cat-list' }, c.themes.map((x, i) => {
        const t = themeOf(x.id);
        if (!t) return null;
        const extra = (S.fiches || []).filter((f) => f.rubrique === t.id).length;
        return h('button', { class: 'cat-item', onclick: () => openTheme(t.id) },
          h('span', { class: 'ci-n' }, String(i + 1)),
          h('span', { class: 'ci-ico' }, t.ico),
          h('span', { class: 'ci-body' }, h('b', null, t.titre), h('span', { class: 'muted small' }, x.focus)),
          h('span', { class: 'ci-meta' }, x.conseils && x.conseils.length ? h('span', { class: 'cchip lane' }, `${c.ico} ${x.conseils.length} conseil${x.conseils.length > 1 ? 's' : ''} ${c.titre.toLowerCase()}`) : null,
            h('span', { class: 'muted small' }, `${(t.sections || []).length} principes`), extra ? h('span', { class: 'pill-new' }, `+${extra} du coach`) : null),
          h('span', { class: 'ci-go' }, '→'));
      })));
  }

  // ----- Diaporama d'une catégorie (ex. ADC) : carte d'accès et visionneuse plein écran -----
  const slideUrl = (d, sl) => (/^https:\/\//.test(sl.img) ? sl.img : (d.base || '') + sl.img);

  function diapoCard(c) {
    const d = c && c.diapo;
    if (!d || !d.slides || !d.slides.length) return null;
    return h('button', { class: 'diapo-card', onclick: () => openDiapo(d, 0) },
      h('img', { class: 'diapo-thumb', src: slideUrl(d, d.slides[0]), alt: '' }),
      h('div', { class: 'diapo-info' },
        h('div', { class: 'diapo-kick' }, '🎞️ Diaporama'),
        h('div', { class: 'diapo-t' }, d.titre),
        h('p', { class: 'muted small' }, d.resume || ''),
        h('div', { class: 'diapo-strip' }, d.slides.slice(1, 6).map((sl) => h('img', { src: slideUrl(d, sl), alt: '' }))),
        h('span', { class: 'diapo-go' }, `▶ Voir les ${d.slides.length} slides`)));
  }

  // ----- Quiz d'une lane : les questions du carnet, une par une, avec l'explication du coach -----
  const quizName = (c) => (c.diapo && c.diapo.quizTitre) || ('Quiz · ' + c.titre);
  const QDIFF = [['simple', '🙂 Simple', 'Les questions du carnet'], ['dur', '🧠 Compliqué', 'Des situations, avec des « pourquoi ? »'], ['hardcore', '💀 Ultra hardcore', 'Les décisions les plus fines']];
  const qOf = (c, d) => ((c.diapo && c.diapo.quiz) || []).filter((x) => (x.diff || 'simple') === d);
  const qTotal = (qs) => qs.reduce((n, x) => n + 1 + (x.suite ? 1 : 0), 0);
  const QUIZ_N = 5;
  const mixChoices = (q) => { const order = shuffle(q.ch.map((_, k) => k)); return { ...q, ch: order.map((k) => q.ch[k]), good: order.indexOf(q.good) }; };
  function drawQuiz(pool, seenKey, n) {
    let seen = load(seenKey, []);
    if (!Array.isArray(seen)) seen = [];
    let fresh = pool.filter((x) => !seen.includes(x.q));
    if (fresh.length < Math.min(n, pool.length)) { seen = []; fresh = pool.slice(); } // tout a été vu : on repart de zéro
    const pick = shuffle(fresh).slice(0, n);
    if (pick.length < n) pick.push(...shuffle(pool.filter((x) => !pick.includes(x))).slice(0, n - pick.length));
    save(seenKey, seen.concat(pick.map((x) => x.q)));
    return pick.map((x) => ({ ...mixChoices(x), suite: x.suite ? mixChoices(x.suite) : undefined }));
  }
  function quizCard(c) {
    const qs = (c.diapo && c.diapo.quiz) || [];
    const bests = QDIFF.map(([d, l]) => { const b = load(`fire.quiz.${c.id}.${d}`, null); return b ? `${l.split(' ')[0]} ${b.ok}/${b.n}` : null; }).filter(Boolean);
    return h('button', { class: 'diapo-card quiz-card', onclick: () => openQuiz(c) },
      h('div', { class: 'diapo-info' },
        h('div', { class: 'diapo-kick' }, '❓ Quiz'),
        h('div', { class: 'diapo-t' }, quizName(c)),
        h('p', { class: 'muted small' }, `3 niveaux : simple, compliqué et ultra hardcore · ${qs.length} questions, tirées au hasard à chaque partie.`),
        bests.length ? h('p', { class: 'small' }, '🏆 ' + bests.join(' · ')) : null,
        h('span', { class: 'diapo-go' }, '▶ Lancer le quiz')));
  }

  function openQuiz(c) {
    let diff = null, qs = [], i = 0, ok = 0, picked = null, step = 'main';
    const body = h('div', { class: 'qz-body' });
    const close = () => { box.remove(); document.removeEventListener('keydown', key); if (S.section === 'guides') render(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    // Chaque partie tire 5 questions au hasard, en priorité celles pas vues aux parties précédentes,
    // et mélange l'ordre des réponses : on ne refait jamais exactement le même quiz.
    const begin = (d) => { diff = d; qs = drawQuiz(qOf(c, d), `fire.quizseen.${c.id}.${d}`, QUIZ_N); i = 0; ok = 0; picked = null; step = 'main'; draw(); };
    const draw = () => {
      if (!diff) {
        body.replaceChildren(h('h2', { class: 'qz-q' }, 'Choisis ton niveau'),
          h('div', { class: 'qz-levels' }, QDIFF.map(([d, l, sub]) => {
            const n = qOf(c, d).length, b = load(`fire.quiz.${c.id}.${d}`, null);
            return h('button', { class: 'qz-level lv-' + d, disabled: n ? null : true, onclick: () => begin(d) },
              h('b', null, l), h('span', { class: 'muted small' }, sub), h('span', { class: 'small' }, n ? `${Math.min(QUIZ_N, n)} questions tirées parmi ${n}` + (b ? ` · 🏆 ${b.ok}/${b.n}` : '') : 'Bientôt'));
          })));
        return;
      }
      const total = qTotal(qs);
      if (i >= qs.length) {
        const k = `fire.quiz.${c.id}.${diff}`, prev = load(k, null);
        if (!prev || ok > prev.ok || prev.n !== total) save(k, { ok, n: total });
        const all = ok === total;
        body.replaceChildren(
          h('div', { class: 'qz-end' }, h('div', { class: 'qz-big' }, all ? '🏆' : ok >= total / 2 ? '🔥' : '💪'),
            h('h2', null, `${ok} / ${total} bonnes réponses`),
            h('p', { class: 'muted' }, all ? (diff === 'hardcore' ? 'Ultra hardcore sans faute. Respect.' : 'Sans faute : passe au niveau au-dessus !') : 'Revois les slides du diaporama, puis retente ta chance.'),
            h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => begin(diff) }, '🔄 Nouvelles questions'),
              h('button', { class: 'btn-ghost', onclick: () => { diff = null; draw(); } }, 'Changer de niveau'),
              h('button', { class: 'btn-ghost', onclick: close }, 'Fermer'))));
        return;
      }
      const base = qs[i], q = step === 'suite' ? base.suite : base;
      const choices = q.ch.map((txt, k) => {
        let cls = 'qz-ch';
        if (picked !== null) cls += k === q.good ? ' good' : (k === picked ? ' bad' : ' dim');
        return h('button', { class: cls, disabled: picked !== null ? true : null, onclick: () => { picked = k; if (k === q.good) ok++; draw(); } },
          h('span', { class: 'qz-l' }, 'ABCDE'[k]), txt);
      });
      const next = () => { if (step === 'main' && base.suite) step = 'suite'; else { i++; step = 'main'; } picked = null; draw(); };
      const last = i + 1 >= qs.length && (step === 'suite' || !base.suite);
      body.replaceChildren(
        h('div', { class: 'qz-meta muted small' }, `${QDIFF.find((x) => x[0] === diff)[1]} · Question ${i + 1} / ${qs.length}`, base.niveau ? ' · ' + base.niveau : ''),
        h('div', { class: 'qz-bar' }, h('span', { style: `width:${Math.round(i / qs.length * 100)}%` })),
        step === 'suite' ? h('div', { class: 'qz-follow' }, '🔎 Et maintenant : pourquoi ?') : null,
        h('h2', { class: 'qz-q' }, q.q),
        h('div', { class: 'qz-chs' }, choices),
        picked !== null ? h('div', { class: 'qz-why ' + (picked === q.good ? 'good' : 'bad') },
          h('b', null, picked === q.good ? '✅ Bonne réponse ! ' : '❌ Pas tout à fait. '), q.why) : null,
        picked !== null ? h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: next },
          step === 'main' && base.suite ? 'Pourquoi ? →' : last ? 'Voir mon score' : 'Question suivante →')) : null);
    };
    const box = h('div', { class: 'dv qz', onclick: (e) => { if (e.target === box) close(); } },
      h('div', { class: 'dv-top' }, h('span', { class: 'dv-name' }, '❓ ' + quizName(c)), h('span', { class: 'dv-title' }), h('button', { class: 'btn-ghost', onclick: close }, '✕ Fermer')),
      h('div', { class: 'qz-card' }, body));
    document.body.append(box);
    document.addEventListener('keydown', key);
    draw();
  }

  // ----- Scénarios sur la vraie carte (comme MOBA Trainer) : une situation, une décision, puis la flèche -----
  const scenName = (c) => ((c.diapo && c.diapo.quizTitre) || '').replace(/^Quiz/, 'Scénarios') || 'Scénarios';
  function scenCard(c) {
    const ss = (c.diapo && c.diapo.scenarios) || [];
    const b = load('fire.scen.' + c.id, null);
    return h('button', { class: 'diapo-card scen-card', onclick: () => openScen(c) },
      h('div', { class: 'diapo-info' },
        h('div', { class: 'diapo-kick' }, '🧩 Scénarios'),
        h('div', { class: 'diapo-t' }, scenName(c)),
        h('p', { class: 'muted small' }, `${ss.length} situations sur la vraie carte : lis la carte, prends la décision.`),
        b ? h('p', { class: 'small' }, `🏆 Meilleur score : ${b.ok} / ${b.n}`) : null,
        h('span', { class: 'diapo-go' }, '▶ Jouer')));
  }
  function scenMap(sc, showArrows) {
    const pos = (x, y) => `left:${x}%;top:${y}%`;
    const kids = [];
    (sc.obj || []).forEach(([x, y, e, l]) => kids.push(h('div', { class: 'sm-obj', style: pos(x, y) }, h('span', null, e), l ? h('em', null, l) : null)));
    (sc.waves || []).forEach(([x, y, tm, n]) => kids.push(h('div', { class: 'sm-wave ' + tm, style: pos(x, y) }, Array.from({ length: Math.min(n, 7) }, () => h('i')))));
    (sc.wards || []).forEach(([x, y, tm]) => kids.push(h('div', { class: 'sm-ward ' + tm, style: pos(x, y) }, '👁️')));
    (sc.inconnus || []).forEach(([x, y, l]) => kids.push(h('div', { class: 'sm-unk', style: pos(x, y) }, h('span', null, '?'), l ? h('em', null, l) : null)));
    (sc.champs || []).forEach(([x, y, id, tm, l]) => kids.push(h('div', { class: 'sm-champ ' + tm, style: pos(x, y) }, champIcon(id, 30), l ? h('em', null, l) : null)));
    const svg = showArrows && (sc.fleches || []).length ? (() => {
      const ns = 'http://www.w3.org/2000/svg';
      const s = document.createElementNS(ns, 'svg');
      s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('preserveAspectRatio', 'none'); s.setAttribute('class', 'sm-arrows');
      (sc.fleches || []).forEach(([x1, y1, x2, y2, col], k) => {
        const id = 'ah' + k + Math.random().toString(36).slice(2, 6);
        const m = document.createElementNS(ns, 'marker');
        m.setAttribute('id', id); m.setAttribute('viewBox', '0 0 10 10'); m.setAttribute('refX', '7'); m.setAttribute('refY', '5');
        m.setAttribute('markerWidth', '4'); m.setAttribute('markerHeight', '4'); m.setAttribute('orient', 'auto');
        const pth = document.createElementNS(ns, 'path'); pth.setAttribute('d', 'M0,0 L10,5 L0,10 z'); pth.setAttribute('fill', col); m.append(pth); s.append(m);
        const ln = document.createElementNS(ns, 'line');
        [['x1', x1], ['y1', y1], ['x2', x2], ['y2', y2]].forEach(([a, v]) => ln.setAttribute(a, v));
        ln.setAttribute('stroke', col); ln.setAttribute('stroke-width', '1.1'); ln.setAttribute('stroke-dasharray', '2.4 1.4');
        ln.setAttribute('marker-end', `url(#${id})`); ln.setAttribute('vector-effect', 'non-scaling-stroke'); ln.style.strokeWidth = '4px';
        s.append(ln);
      });
      return s;
    })() : null;
    return h('div', { class: 'sm-map', style: S.assets && S.assets.rift ? `background-image:url("${S.assets.rift}")` : '' }, ...kids, svg,
      h('span', { class: 'sm-credit' }, 'Carte · © Riot Games'));
  }
  function openScen(c) {
    const base0 = (c.diapo && c.diapo.scenarios) || [];
    if (!base0.length) return;
    const mixS = () => shuffle(base0).map((x) => ({ ...mixChoices(x), suite: x.suite ? mixChoices(x.suite) : undefined }));
    let ss = mixS();
    let i = 0, ok = 0, picked = null, step = 'main';
    const total = ss.reduce((n, x) => n + 1 + (x.suite ? 1 : 0), 0);
    const body = h('div', { class: 'sc-body' });
    const close = () => { box.remove(); document.removeEventListener('keydown', key); if (S.section === 'guides') render(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    const draw = () => {
      if (i >= ss.length) {
        const k = 'fire.scen.' + c.id, prev = load(k, null);
        if (!prev || ok > prev.ok || prev.n !== total) save(k, { ok, n: total });
        body.replaceChildren(h('div', { class: 'qz-end' }, h('div', { class: 'qz-big' }, ok === total ? '🏆' : ok >= total / 2 ? '🔥' : '💪'),
          h('h2', null, `${ok} / ${total} bonnes décisions`),
          h('p', { class: 'muted' }, ok === total ? 'Lecture de carte parfaite.' : 'Relis les slides, puis rejoue les situations.'),
          h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: () => { ss = mixS(); i = 0; ok = 0; picked = null; step = 'main'; draw(); } }, '🔄 Rejouer'),
            h('button', { class: 'btn-ghost', onclick: close }, 'Fermer'))));
        return;
      }
      const sc = ss[i], q = step === 'suite' ? sc.suite : sc;
      const choices = q.ch.map((txt, k) => {
        let cls = 'qz-ch';
        if (picked !== null) cls += k === q.good ? ' good' : (k === picked ? ' bad' : ' dim');
        return h('button', { class: cls, disabled: picked !== null ? true : null, onclick: () => { picked = k; if (k === q.good) ok++; draw(); } }, h('span', { class: 'qz-l' }, 'ABCDE'[k]), txt);
      });
      const next = () => { if (step === 'main' && sc.suite) step = 'suite'; else { i++; step = 'main'; } picked = null; draw(); };
      const last = i + 1 >= ss.length && (step === 'suite' || !sc.suite);
      body.replaceChildren(
        scenMap(sc, picked !== null || step === 'suite'),
        h('div', { class: 'sc-side' },
          h('div', { class: 'qz-meta muted small' }, `Situation ${i + 1} / ${ss.length}`),
          h('div', { class: 'qz-bar' }, h('span', { style: `width:${Math.round(i / ss.length * 100)}%` })),
          h('h3', { class: 'sc-title' }, sc.titre),
          h('div', { class: 'sc-ctx' }, (sc.contexte || []).map((x) => h('span', { class: 'chip' }, x))),
          step === 'suite' ? h('div', { class: 'qz-follow' }, '🔎 Et maintenant : pourquoi ?') : null,
          h('p', { class: 'qz-q' }, q.q),
          h('div', { class: 'qz-chs' }, choices),
          picked !== null ? h('div', { class: 'qz-why ' + (picked === q.good ? 'good' : 'bad') }, h('b', null, picked === q.good ? '✅ Bonne décision ! ' : '❌ Pas tout à fait. '), q.why) : null,
          picked !== null ? h('div', { class: 'row' }, h('button', { class: 'btn-fire small-btn', onclick: next }, step === 'main' && sc.suite ? 'Pourquoi ? →' : last ? 'Voir mon score' : 'Situation suivante →')) : null,
          h('p', { class: 'muted small' }, '🔵 ta team · 🔴 en face · ❔ position supposée · 👁️ ward')));
    };
    const box = h('div', { class: 'dv qz', onclick: (e) => { if (e.target === box) close(); } },
      h('div', { class: 'dv-top' }, h('span', { class: 'dv-name' }, '🧩 ' + scenName(c)), h('span', { class: 'dv-title' }), h('button', { class: 'btn-ghost', onclick: close }, '✕ Fermer')),
      h('div', { class: 'qz-card sc-card' }, body));
    document.body.append(box);
    document.addEventListener('keydown', key);
    if (!S.champList) loadChampions();
    draw();
  }

  // ----- Défis d'une lane : à cocher, gardés sur cet ordinateur -----
  const defiKey = (c) => 'fire.defis.' + c.id;
  const defiCount = (c) => {
    const ds = (c.diapo && c.diapo.defis) || [], done = load(defiKey(c), {});
    let n = 0, ok = 0;
    ds.forEach((d, i) => d.items.forEach((x, k) => { n++; if (done[i + ':' + k]) ok++; }));
    return { n, ok };
  };
  function defisCard(c) {
    const ds = (c.diapo && c.diapo.defis) || [];
    const { n, ok } = defiCount(c);
    return h('button', { class: 'diapo-card defis-card', onclick: () => openDefis(c) },
      h('div', { class: 'diapo-info' },
        h('div', { class: 'diapo-kick' }, '🎯 Défis'),
        h('div', { class: 'diapo-t' }, (c.diapo.quizTitre || '').replace(/^Quiz/, 'Défis') || 'Défis'),
        h('p', { class: 'muted small' }, `${ds.length} défis et le Boss final, à cocher au fil de tes games.`),
        h('div', { class: 'qz-bar' }, h('span', { style: `width:${n ? Math.round(ok / n * 100) : 0}%` })),
        h('p', { class: 'small' }, `✅ ${ok} / ${n} cochés`),
        h('span', { class: 'diapo-go' }, '▶ Voir mes défis')));
  }

  function openDefis(c) {
    const ds = (c.diapo && c.diapo.defis) || [];
    const body = h('div', { class: 'qz-body' });
    const close = () => { box.remove(); document.removeEventListener('keydown', key); if (S.section === 'guides') render(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    const draw = () => {
      const done = load(defiKey(c), {});
      const { n, ok } = defiCount(c);
      body.replaceChildren(
        h('div', { class: 'qz-meta muted small' }, `✅ ${ok} / ${n} cochés · gardé sur cet ordinateur`),
        h('div', { class: 'qz-bar' }, h('span', { style: `width:${n ? Math.round(ok / n * 100) : 0}%` })),
        ...ds.map((d, i) => {
          const all = d.items.every((x, k) => done[i + ':' + k]);
          return h('div', { class: 'df-group' + (d.boss ? ' boss' : '') + (all ? ' done' : '') },
            h('div', { class: 'df-head' }, h('span', { class: 'df-ico' }, d.boss ? '🏆' : '🎯'),
              h('div', null, h('b', null, d.titre), h('div', { class: 'muted small' }, [d.big, d.sub].filter(Boolean).join(' · ') + (d.niveau ? (d.big || d.sub ? ' · ' : '') + d.niveau : ''))),
              all ? h('span', { class: 'df-ok' }, d.boss ? 'Badge débloqué !' : 'Validé ✓') : null),
            h('div', { class: 'df-items' }, d.items.map((x, k) => {
              const id = i + ':' + k;
              return h('label', { class: 'df-item' + (done[id] ? ' on' : '') },
                h('input', { type: 'checkbox', checked: done[id] ? true : null, onchange: (e) => { const cur = load(defiKey(c), {}); if (e.target.checked) cur[id] = true; else delete cur[id]; save(defiKey(c), cur); draw(); } }),
                h('span', null, x));
            })));
        }),
        h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => { save(defiKey(c), {}); draw(); } }, '↺ Tout décocher'),
          h('button', { class: 'btn-fire small-btn', onclick: close }, 'Fermer')));
    };
    const box = h('div', { class: 'dv qz', onclick: (e) => { if (e.target === box) close(); } },
      h('div', { class: 'dv-top' }, h('span', { class: 'dv-name' }, '🎯 ' + ((c.diapo.quizTitre || '').replace(/^Quiz/, 'Défis') || 'Défis')), h('span', { class: 'dv-title' }), h('button', { class: 'btn-ghost', onclick: close }, '✕ Fermer')),
      h('div', { class: 'qz-card df-card' }, body));
    document.body.append(box);
    document.addEventListener('keydown', key);
    draw();
  }

  function openDiapo(d, start) {
    let i = start || 0;
    const img = h('img', { class: 'dv-img', alt: '' });
    const count = h('span', { class: 'dv-count' });
    const title = h('span', { class: 'dv-title' });
    const thumbs = h('div', { class: 'dv-thumbs' }, d.slides.map((sl, k) => h('img', { src: slideUrl(d, sl), alt: sl.titre || '', onclick: (e) => { e.stopPropagation(); show(k); } })));
    const show = (k) => {
      i = Math.max(0, Math.min(d.slides.length - 1, k));
      img.src = slideUrl(d, d.slides[i]);
      img.alt = d.slides[i].titre || '';
      count.textContent = `${i + 1} / ${d.slides.length}`;
      title.textContent = d.slides[i].titre || '';
      [...thumbs.children].forEach((t, k2) => t.classList.toggle('on', k2 === i));
      const cur = thumbs.children[i];
      if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    };
    const close = () => { box.remove(); document.removeEventListener('keydown', key); };
    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); show(i + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(i - 1); }
      else if (e.key === 'Escape') close();
    };
    const box = h('div', { class: 'dv', onclick: (e) => { if (e.target === box) close(); } },
      h('div', { class: 'dv-top' }, h('span', { class: 'dv-name' }, '🎞️ ' + d.titre), title, count, h('button', { class: 'btn-ghost', onclick: close }, '✕ Fermer')),
      h('div', { class: 'dv-stage' },
        h('button', { class: 'dv-nav', 'aria-label': 'Slide précédente', onclick: () => show(i - 1) }, '‹'),
        img,
        h('button', { class: 'dv-nav', 'aria-label': 'Slide suivante', onclick: () => show(i + 1) }, '›')),
      thumbs,
      h('div', { class: 'dv-help muted small' }, '← → pour changer de slide · Échap pour fermer'));
    img.addEventListener('click', () => show(i + 1));
    document.body.append(box);
    document.addEventListener('keydown', key);
    show(i);
  }

  function renderAllThemes() {
    const view = $('view');
    const head = h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '📚'), h('div', null, h('h1', { class: 'title' }, 'Lanes et principes'),
      h('p', { class: 'muted' }, 'Tous les principes de LoL, expliqués simplement, avec des schémas. Clique sur un thème. Saison 2026.')));
    if (!S.guides) { view.replaceChildren(head, h('div', { class: 'empty-state' }, 'Chargement des thèmes…')); return; }
    view.replaceChildren(head, h('div', { class: 'theme-grid' }, S.guides.map((t) => {
      const extra = (S.fiches || []).filter((f) => f.rubrique === t.id).length;
      return h('button', { class: 'tcard' + (themeIsNew(t) ? ' is-new' : ''), onclick: () => { markTheme(t); S.theme = t.id; render(); window.scrollTo(0, 0); } },
        h('div', { class: 'tico' }, t.ico || '📘'),
        h('div', { class: 'tname' }, t.titre),
        h('p', { class: 'muted small' }, t.accroche),
        h('div', { class: 'tfoot' }, tag(pourLabel(t.pour)), h('span', { class: 'muted small' }, `${(t.sections || []).length} principes`), extra ? h('span', { class: 'pill-new' }, `+${extra} du coach`) : null));
    })));
  }

  function renderTheme() {
    const t = themeOf(S.theme);
    const view = $('view');
    if (!t) { S.theme = null; renderGuides(); return; }
    const extra = (S.fiches || []).filter((f) => f.rubrique === t.id);
    view.replaceChildren(...[
      h('header', { class: 'doc-head' }, h('div', { class: 'tags' }, tag(pourLabel(t.pour)), tag('Saison 2026')), h('h1', { class: 'title' }, `${t.ico || ''} ${t.titre}`)),
      laneBanner(t),
      ...themeNodes(t),
      extra.length || S.coachState.coach ? h('div', { class: 'card' },
        h('h2', null, '📣 Ajouts du coach'),
        extra.length ? h('div', { class: 'fgrid' }, extra.map(ficheCard)) : h('p', { class: 'muted' }, 'Pas encore d\'ajout du coach dans ce thème.'),
        S.coachState.coach ? h('button', { class: 'btn-ghost', onclick: () => { ensureDraft().rubrique = t.id; S.section = 'coach'; S.ficheId = null; render(); window.scrollTo(0, 0); setTimeout(() => { const x = $('sujet'); if (x) x.focus(); }, 50); } }, '✍️ Écrire un ajout pour ce thème') : null) : null].filter(Boolean));
  }

  // ----- Parole du coach -----
  const isNote = (f) => f.type === 'message';
  const isCommon = (f) => !f.cible || f.cible === "Toute l'équipe" || f.cible === 'tous';
  const byDate = (a, b) => String(b.at || '').localeCompare(String(a.at || ''));
  const noteText = (f) => ((f.sections || [])[0] || {}).texte || '';
  // Une note se lit directement, sans ouvrir de page.
  function noteCard(f, compact) {
    const fresh = !S.seen.has(f.id);
    return h('article', { class: 'card note-card' + (fresh ? ' fresh' : '') },
      h('div', { class: 'note-head' }, h('span', { class: 'note-t' }, '📝 ' + f.titre), fresh ? h('span', { class: 'pill-new' }, 'Nouveau') : null,
        h('span', { class: 'muted small note-d' }, [f.at ? dateLong(f.at) : '', compact || isCommon(f) ? '' : ' · pour ' + f.cible].join(''))),
      h('div', { class: 'md' }, md(noteText(f))),
      S.coachState.coach && !compact ? h('button', { class: 'linkbtn small', onclick: () => openFiche(f.id) }, 'Gérer cette note') : null);
  }
  // Écran d'accueil : les notes pour toute l'équipe.
  function homeNotes() {
    const notes = (S.fiches || []).filter((f) => isNote(f) && isCommon(f)).sort(byDate).slice(0, 3);
    if (!notes.length) return null;
    later(() => notes.forEach((f) => markSeen(f.id)));
    later(renderNav);
    return h('section', { class: 'home-notes' },
      h('div', { class: 'home-notes-h' }, h('h2', null, '📝 Notes du coach'),
        h('button', { class: 'linkbtn', onclick: () => { S.section = 'coach'; S.ficheId = null; S.coachTab = 'notes'; render(); window.scrollTo(0, 0); } }, 'Toutes les notes →')),
      notes.map((f) => noteCard(f, true)));
  }

  function ficheCard(f) {
    const th = f.rubrique ? themeOf(f.rubrique) : null;
    return h('button', { class: 'fcard', onclick: () => openFiche(f.id) },
      h('div', { class: 'fmeta' }, h('span', { class: 'muted small' }, f.at ? dateLong(f.at) : ''), !S.seen.has(f.id) ? h('span', { class: 'pill-new' }, 'Nouveau') : null),
      h('div', { class: 'fname' }, (f.type === 'message' ? '📝 ' : '📘 ') + f.titre),
      f.accroche ? h('p', { class: 'muted small' }, f.accroche) : null,
      h('div', { class: 'tags' }, tag('Pour : ' + (f.cible || "Toute l'équipe")), th ? tag(`${th.ico} ${th.titre}`) : null));
  }

  function renderFicheView() {
    const f = (S.fiches || []).find((x) => x.id === S.ficheId);
    const view = $('view');
    if (!f) { S.ficheId = null; renderCoach(); return; }
    const th = f.rubrique ? themeOf(f.rubrique) : null;
    const nodes = [h('header', { class: 'doc-head' },
      h('div', { class: 'tags' }, tag(f.type === 'message' ? '📝 Note du coach' : '📘 Fiche du coach'), tag('Pour : ' + (f.cible || "Toute l'équipe")), th ? tag(`${th.ico} ${th.titre}`) : null),
      h('h1', { class: 'title' }, f.titre),
      h('p', { class: 'muted small' }, f.at ? 'Publié le ' + dateLong(f.at) : ''))];
    nodes.push(...docNodes(f));
    if (S.coachState.coach) {
      const confirming = S.confirm === 'del:' + f.id;
      nodes.push(h('div', { class: 'card coach-zone' }, h('h2', null, '🔒 Réservé au coach'),
        f.sujet ? h('p', { class: 'muted small' }, 'Sujet donné : ' + f.sujet) : null,
        S.coachState.github ? h('button', { class: confirming ? 'btn-danger' : 'btn-ghost', onclick: async (e) => {
          if (!confirming) { S.confirm = 'del:' + f.id; render(); return; }
          e.target.disabled = true; e.target.textContent = 'Retrait en cours…';
          const r = await window.fire.coach.unpublish(f.id);
          S.confirm = null;
          if (r.ok) { S.flash = 'Fiche retirée pour toute l\'équipe.'; S.ficheId = null; await loadFiches(); } else { S.flash = 'Impossible de retirer la fiche : ' + r.error; }
          render();
        } }, confirming ? 'Confirmer : retirer cette fiche pour tout le monde' : 'Retirer cette fiche') : h('p', { class: 'muted small' }, 'Ajoute le jeton GitHub dans les réglages coach pour pouvoir retirer une fiche.')));
    }
    view.replaceChildren(...nodes);
  }

  const newDraft = () => ({ mode: 'fiche', sujet: '', titre: '', cible: "Toute l'équipe", rubrique: '', fiche: null, busy: false, err: '', modif: '', t0: 0, info: '' });
  const ensureDraft = () => (S.draft = S.draft || newDraft());
  let busyTimer = null;

  function renderCoach() {
    const view = $('view');
    const nodes = [h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '📣'), h('div', null, h('h1', { class: 'title' }, 'Parole du coach'),
      h('p', { class: 'muted' }, "Les fiches et les notes du coach pour l'équipe. Les nouvelles arrivent toutes seules à l'ouverture de l'application."))) ];
    if (S.flash) nodes.push(h('div', { class: 'flash' }, S.flash, h('button', { class: 'flash-x', onclick: () => { S.flash = ''; render(); } }, '✕')));
    if (S.coachState.coach) nodes.push(composerCard(), settingsCard());
    if (S.fichesErr) nodes.push(h('p', { class: 'muted small' }, '⚠ ' + S.fichesErr));
    if (!S.fiches) nodes.push(h('div', { class: 'empty-state' }, 'Chargement des fiches du coach…'));
    else if (!S.fiches.length) nodes.push(h('div', { class: 'empty-state' }, "Le coach n'a encore rien publié."));
    else {
      const notes = S.fiches.filter(isNote).sort(byDate), fiches = S.fiches.filter((f) => !isNote(f));
      const newN = notes.filter((f) => !S.seen.has(f.id)).length, newF = fiches.filter((f) => !S.seen.has(f.id)).length;
      if (!S.coachTab) S.coachTab = newN && !newF ? 'notes' : (fiches.length ? 'fiches' : 'notes');
      const tb = (id, l, n, nw) => h('button', { class: 'tab', 'aria-selected': String(S.coachTab === id), onclick: () => { S.coachTab = id; render(); } }, `${l} (${n})`, nw ? h('span', { class: 'nbadge' }, nw) : null);
      nodes.push(h('nav', { class: 'tabs coach-tabs' }, tb('fiches', '📘 Fiches', fiches.length, newF), tb('notes', '📝 Notes', notes.length, newN)));
      if (S.coachTab === 'notes') {
        if (!notes.length) nodes.push(h('div', { class: 'empty-state' }, "Le coach n'a pas encore écrit de note."));
        else {
          nodes.push(h('div', { class: 'notes-list' }, notes.map((f) => noteCard(f, false))));
          later(() => notes.forEach((f) => markSeen(f.id)));
          later(renderNav);
        }
      } else if (!fiches.length) nodes.push(h('div', { class: 'empty-state' }, "Le coach n'a pas encore publié de fiche."));
      else nodes.push(h('div', { class: 'fgrid' }, fiches.map(ficheCard)));
    }
    nodes.push(coachAccess());
    view.replaceChildren(...nodes);
  }

  function coachAccess() {
    if (S.coachState.coach) {
      const c = S.confirm === 'leave';
      return h('p', { class: 'coach-access muted small' }, '🔒 Mode coach activé sur cet ordinateur. ',
        h('button', { class: 'linkbtn', onclick: async () => {
          if (!c) { S.confirm = 'leave'; render(); return; }
          S.coachState = await window.fire.coach.leave(); S.confirm = null; S.draft = null; render();
        } }, c ? 'Confirmer : quitter le mode coach et effacer les clés de cet ordinateur' : 'Quitter le mode coach'));
    }
    const inp = h('input', { class: 'inp', type: 'password', placeholder: 'Code coach', autocomplete: 'off', style: 'max-width:240px' });
    const err = h('span', { class: 'bad small' });
    const goCoach = async () => {
      const r = await window.fire.coach.unlock(inp.value);
      if (r && r.ok) { S.coachState = r; render(); } else { err.textContent = 'Code coach incorrect.'; inp.select(); }
    };
    inp.addEventListener('keydown', (e) => { err.textContent = ''; if (e.key === 'Enter') goCoach(); });
    return h('details', { class: 'coach-access' }, h('summary', null, 'Je suis le coach'),
      h('div', { class: 'row' }, inp, h('button', { class: 'btn-ghost', onclick: goCoach }, 'Activer le mode coach'), err));
  }

  function settingsCard() {
    const st = S.coachState;
    const a = h('input', { class: 'inp', type: 'password', autocomplete: 'off', placeholder: st.claude ? 'Clé enregistrée ✓ (laisse vide pour la garder)' : 'sk-ant-…' });
    const g = h('input', { class: 'inp', type: 'password', autocomplete: 'off', placeholder: st.github ? 'Jeton enregistré ✓ (laisse vide pour le garder)' : 'github_pat_…' });
    const eq = h('input', { class: 'inp', type: 'password', autocomplete: 'off', placeholder: S.poolWrite ? 'Jeton d\'équipe actif ✓ (laisse vide pour le garder)' : 'github_pat_… (dépôt fire-lol-data)' });
    const btn = h('button', { class: 'btn-ghost', onclick: async () => {
      if (!a.value && !g.value && !eq.value) return;
      btn.disabled = true; btn.textContent = 'Vérification…';
      const r = await window.fire.coach.save({ anthropic: a.value, github: g.value, equipe: eq.value });
      if (eq.value) { loadPools(); loadPlanning(); }
      S.coachState = { coach: r.coach, claude: r.claude, github: r.github };
      S.settingsMsg = (r.messages || []).join(' ') || r.error || '';
      render();
    } }, 'Enregistrer');
    return h('details', { class: 'card settings', open: !(st.claude && st.github) ? true : null },
      h('summary', null, `⚙️ Réglages coach · Claude ${st.claude ? '✓' : '✗'} · GitHub ${st.github ? '✓' : '✗'}`),
      h('p', { class: 'muted small' }, "Ces clés restent sur cet ordinateur, chiffrées par Windows. Elles ne sont jamais envoyées aux joueurs."),
      h('label', { class: 'fld' }, h('span', null, "Clé de l'API Claude (pour les fiches avec recherche)"), a),
      h('label', { class: 'fld' }, h('span', null, 'Jeton GitHub (pour publier les fiches)'), g),
      h('label', { class: 'fld' }, h('span', null, `Jeton d'équipe (pour que chaque joueur puisse modifier sa tierlist) ${S.poolWrite ? '· actif ✓' : '· pas encore activé'}`), eq),
      h('div', { class: 'row' }, btn, S.settingsMsg ? h('span', { class: 'small' }, S.settingsMsg) : null),
      h('details', { class: 'help' }, h('summary', null, 'Comment obtenir ces clés ?'),
        h('ol', { class: 'small' },
          h('li', null, 'Clé Claude : sur ', h('a', { href: 'https://console.anthropic.com/settings/keys', target: '_blank' }, 'console.anthropic.com'), ', crée un compte, ajoute du crédit (Billing), puis « Create Key ». Chaque fiche générée est facturée sur ce compte.'),
          h('li', null, 'Jeton GitHub : sur ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank' }, 'github.com → Fine-grained token'), ', choisis « Only select repositories » → Toka120/fire-team-lol, puis Permissions → Contents : « Read and write ». Le propriétaire du dépôt (Toka120) doit le créer ou donner accès au coach.'),
          h('li', null, "Jeton d'équipe : crée d'abord le dépôt ", h('b', null, 'Toka120/fire-lol-data'), ' (public, avec un README), puis un « Fine-grained token » limité à ce dépôt seulement, avec Contents : « Read and write ». Il est envoyé chiffré aux joueurs et ne donne aucun accès au code de l\'application.'))));
  }

  function composerCard() {
    const d = ensureDraft();
    const seg = (m, l) => h('button', { class: 'seg', 'aria-pressed': String(d.mode === m), disabled: d.busy ? true : null, onclick: () => { d.mode = m; d.fiche = null; d.err = ''; render(); } }, l);
    const sujet = h('textarea', { id: 'sujet', class: 'inp', rows: d.mode === 'message' ? 6 : 3, disabled: d.busy ? true : null,
      placeholder: d.mode === 'message' ? 'Ta note pour l\'équipe (ex. : scrim demain à 20 h, soyez là 10 min avant).' : 'Ex. : comment gérer sa wave en top quand on est en retard ; ou : explique le tempo jungle avec Jarvan IV.' });
    sujet.value = d.sujet;
    sujet.addEventListener('input', () => { d.sujet = sujet.value; });
    const titre = h('input', { class: 'inp', placeholder: 'Titre (facultatif)', disabled: d.busy ? true : null });
    titre.value = d.titre;
    titre.addEventListener('input', () => { d.titre = titre.value; });
    const sel = (opts, val, set) => { const s = h('select', { disabled: d.busy ? true : null }, opts.map(([v, l]) => h('option', { value: v }, l))); s.value = val; s.addEventListener('change', () => set(s.value)); return s; };
    const cible = sel(CIBLES.map((c) => [c, c]), d.cible, (v) => { d.cible = v; });
    const rub = sel([['', 'Parole du coach seulement'], ...(S.guides || []).map((t) => [t.id, `${t.ico} ${t.titre}`])], d.rubrique, (v) => { d.rubrique = v; if (d.fiche) d.fiche.rubrique = v; });
    const main = h('button', { class: 'btn-fire small-btn', disabled: d.busy ? true : null, onclick: () => generate(false) }, d.mode === 'fiche' ? (d.fiche ? '🔄 Refaire la fiche' : '🔎 Générer la fiche') : '👀 Voir l\'aperçu');
    const box = h('div', { class: 'card composer' },
      h('h2', null, '✍️ Écrire pour l\'équipe'),
      h('div', { class: 'segs' }, seg('fiche', '🔎 Fiche avec recherche et schémas'), seg('message', '📝 Note')),
      d.mode === 'fiche' ? h('p', { class: 'muted small' }, "Écris ton sujet : l'application cherche sur le web (guides, vidéos), rédige une fiche claire et dessine des schémas. Tu relis l'aperçu avant de publier.") : h('p', { class: 'muted small' }, 'Ta note est publiée telle quelle. Pour « Toute l’équipe », elle s’affiche aussi sur l’écran d’accueil de chaque joueur. Tu peux utiliser **gras** et des listes avec « - ».'),
      d.mode === 'message' ? titre : null,
      sujet,
      h('div', { class: 'row' }, h('label', { class: 'fld-inline' }, 'Pour ', cible), h('label', { class: 'fld-inline' }, 'Ranger dans ', rub)),
      h('div', { class: 'row' }, main, d.mode === 'fiche' && !S.coachState.claude ? h('span', { class: 'bad small' }, "Ajoute la clé de l'API Claude dans les réglages coach.") : null));
    if (d.busy) box.append(h('p', { class: 'busy' }, h('span', { class: 'spin' }), h('span', { id: 'busy-t' }, busyText())));
    if (d.err) box.append(h('p', { class: 'bad' }, '⚠ ' + d.err));
    if (d.fiche) {
      const modif = h('textarea', { class: 'inp', rows: 2, disabled: d.busy ? true : null, placeholder: 'Demander une modification (ex. : plus court, ajoute un exemple avec Renekton, schéma plus simple…)' });
      modif.value = d.modif;
      modif.addEventListener('input', () => { d.modif = modif.value; });
      const pub = h('button', { class: 'btn-fire small-btn', disabled: d.busy || !S.coachState.github ? true : null, onclick: publishDraft }, "📣 Publier pour l'équipe");
      box.append(h('div', { class: 'preview' },
        h('div', { class: 'preview-label' }, 'Aperçu : voilà ce que verront les joueurs' + (d.info ? ' · ' + d.info : '')),
        h('h1', { class: 'title' }, (d.fiche.type === 'message' ? '📝 ' : '📘 ') + d.fiche.titre),
        ...docNodes(d.fiche)),
        d.mode === 'fiche' ? h('div', { class: 'row' }, modif, h('button', { class: 'btn-ghost', disabled: d.busy ? true : null, onclick: () => { if (d.modif.trim()) generate(true); } }, '✏️ Modifier')) : null,
        h('div', { class: 'row' }, pub, h('button', { class: 'btn-ghost', disabled: d.busy ? true : null, onclick: () => { S.draft = newDraft(); render(); } }, 'Tout effacer'),
          !S.coachState.github ? h('span', { class: 'bad small' }, 'Ajoute le jeton GitHub dans les réglages coach pour publier.') : null));
    }
    return box;
  }

  function busyText() {
    const d = S.draft;
    if (!d || !d.busy) return '';
    const sec = Math.round((Date.now() - d.t0) / 1000);
    if (d.pub) return `Publication en cours… ${sec} s`;
    return d.mode === 'fiche' ? `Recherche sur le web et rédaction de la fiche… ${sec} s (compte 1 à 3 minutes)` : 'Préparation…';
  }
  function startBusy() {
    clearInterval(busyTimer);
    busyTimer = setInterval(() => { const el = $('busy-t'); if (el) el.textContent = busyText(); if (!S.draft || !S.draft.busy) clearInterval(busyTimer); }, 1000);
  }

  async function generate(modif) {
    const d = ensureDraft();
    if (d.busy) return;
    if (!d.sujet.trim()) { d.err = d.mode === 'message' ? 'Écris ta note.' : 'Écris un sujet.'; render(); return; }
    d.err = ''; d.busy = true; d.t0 = Date.now();
    render(); startBusy();
    let r;
    try {
      r = d.mode === 'message'
        ? await window.fire.coach.message({ titre: d.titre, texte: d.sujet, cible: d.cible })
        : await window.fire.coach.generate({ sujet: d.sujet, cible: d.cible, precedent: modif ? d.fiche : null, modif: modif ? d.modif : '' });
    } catch (e) { r = { ok: false, error: String(e) }; }
    d.busy = false;
    if (r && r.ok) { d.fiche = { ...r.fiche, rubrique: d.rubrique }; if (modif) d.modif = ''; d.info = r.recherches ? `${r.recherches} recherche${r.recherches > 1 ? 's' : ''} sur le web` : ''; }
    else d.err = (r && r.error) || 'erreur inconnue';
    if (S.section === 'coach') render();
  }

  async function publishDraft() {
    const d = S.draft;
    if (!d || !d.fiche || d.busy) return;
    d.busy = true; d.pub = true; d.err = ''; d.t0 = Date.now();
    render(); startBusy();
    let r;
    try { r = await window.fire.coach.publish({ ...d.fiche, rubrique: d.rubrique }); } catch (e) { r = { ok: false, error: String(e) }; }
    d.busy = false; d.pub = false;
    if (r && r.ok) {
      S.draft = newDraft();
      markSeen(r.id);
      S.flash = "Publié ✓ Les joueurs le verront à leur prochaine ouverture de l'application (ou dans 10 minutes au plus).";
      await loadFiches();
    } else d.err = (r && r.error) || 'erreur inconnue';
    render();
  }

  // ================= Rubrique POOL : tierlists de la semaine et analyse =================
  // Ligne 1 : OBLIGATOIRE (compte pour l'objectif). Ligne 2 : MAÎTRISÉS. Un champion peut être dans les deux.
  const TIERS = FC.TIERS;
  const TI = FC.TIER_INFO;
  const todayYmd = () => FC.ymd(new Date());
  const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00'); d.setDate(d.getDate() + n); return FC.ymd(d); };
  const weekLabel = (w) => `Semaine du ${dateFr(w.debut)}`;
  const nextWeekOf = (w) => (S.pools || []).find((x) => x.debut > w.debut) || null;
  S.moi = load('fire.moi', null);
  S.poolWrite = false;

  function currentWeek() {
    const t = todayYmd();
    const past = (S.pools || []).filter((w) => w.debut <= t);
    return past.length ? past[past.length - 1] : null;
  }

  // Les stats et l'objectif suivent la tierlist de la semaine en cours (sinon le pool de la configuration).
  function weeklyObj(base) {
    if (!base) return null;
    const mon = mondayOf(todayYmd());
    return { ...base, debut: base.debut && base.debut > mon ? base.debut : mon, fin: addDays(mon, 6), hebdo: true };
  }
  function applyWeek() {
    const w = currentWeek();
    for (const p of S.players) {
      if (!p._cfg) p._cfg = { pool_ids: p.pool_ids || [], pool: p.pool || '', maitrise_ids: p.maitrise_ids || [], travail_ids: p.travail_ids || [] };
      const t = FC.normTiers(w && w.joueurs && w.joueurs[p.slug]);
      if (t && (t.O.length || t.M.length || t.T.length)) {
        p.pool_ids = t.O; p.maitrise_ids = t.M; p.travail_ids = t.T; p._tiers = t;
        p.pool = t.O.map(FC.champName).join(' · ');
      } else { p.pool_ids = p._cfg.pool_ids; p.maitrise_ids = p._cfg.maitrise_ids; p.travail_ids = p._cfg.travail_ids; p.pool = p._cfg.pool; p._tiers = null; }
    }
    // L'objectif se compte chaque semaine, du lundi au dimanche, et repart à zéro le lundi.
    S.obj = weeklyObj(w && w.objectif ? { games: w.objectif, description: w.note || '' } : S.cfgObj);
    const sel = $('period');
    let opt = sel.querySelector('option[value=obj]');
    if (S.obj && !opt) { opt = document.createElement('option'); opt.value = 'obj'; sel.insertBefore(opt, sel.firstChild); }
    if (opt) { if (S.obj) opt.textContent = `Semaine en cours (objectif)`; else opt.remove(); }
  }

  // ----- Apprendre en jouant : mini-jeux tirés des carnets du coach -----
  const LMODES = [['wave', '🌊 Lis la wave'], ['jgl', '🦀 Le jungler'], ['bot', '🔥 Bot lane'], ['trade', '⚔️ Trade ou pas ?'], ['vf', '✅ Vrai ou faux'], ['quoi', '🧠 Que fais-tu ?']];
  const L = { st: {} };
  const shuffle = (xs) => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const WAVE_Q = [
    { mine: 3, theirs: 6, pos: 22, q: 'Ta wave est devant ta tour, avec 3 casters ennemis en plus. Tu veux farmer en sécurité.', ch: ['Je last hit seulement', 'Je tape toute la wave', 'Je vais dive sous sa tour'], why: 'C’est un freeze : la wave ne bouge plus devant ta tour. Pour le tenir : 3 casters full PV en face (wave canon : 3 casters + 1 mêlée). Attention, tu perds la prio.' },
    { mine: 6, theirs: 3, pos: 55, q: 'Tu veux reset : tu as slow push la 1re wave et stacké la 2e. Que fais-tu de la 3e ?', ch: ['Je la fast push pour crash, puis je back', 'Je la freeze', 'Je la laisse et je back tout de suite'], why: 'Reset : slow push la 1re, stack la 2e, fast push la 3e, puis back sans rien perdre.' },
    { mine: 0, theirs: 7, pos: 18, q: 'Tu as tout crash sous sa tour. La wave revient très vite vers toi et il passe niveau 3 avant toi. Pourquoi ?', ch: ['C’est le bounce : j’ai trop crash la wave', 'Il a eu de la chance', 'Mon jungler a pris mes sbires'], why: 'Le bounce : ses sbires et la wave qui revient tuent vite, il prend l’XP pendant que toi tu es encore sous ta tour. C’est le « niveau 3 et demi ».' },
    { mine: 2, theirs: 5, pos: 60, q: 'Tu as les golds de ton objet, mais tu ne peux pas crash ta wave : elle est plus petite que la sienne.', ch: ['Back direct pour acheter', 'Je fast push quand même', 'J’attends sous sa tour'], why: 'Fast push SEULEMENT si tu peux crash la wave. Sinon : back direct pour acheter tes objets.' },
    { mine: 0, theirs: 2, pos: 50, q: 'Il a pris sa wave, il reste 2 de ses sbires, et la wave suivante n’est pas arrivée.', ch: ['Je prends les 2 derniers et je back en même temps que lui', 'Je laisse ses 2 sbires', 'Je vais taper sa tour'], why: 'C’est un reset : tu annules tout, la wave revient au milieu.' },
    { mine: 8, theirs: 3, pos: 55, q: 'Tu slow push avec 8 sbires. Il vient casser ta wave pour se mettre un freeze.', ch: ['Je deviens agressif : j’ai plus de sbires', 'Je recule sous ma tour', 'Je back'], why: 'Tu as plus de sbires : sur les longs fights tu gagnes, et même sur les courts trades. Reste près de tes sbires.' },
    { mine: 5, theirs: 5, pos: 50, q: 'Mid game : ton équipe se regroupe pour un dragon dans 1 minute. Ta wave est au milieu.', ch: ['Je push ma wave puis je rejoins', 'Je freeze devant ma tour', 'Je reste farmer seul'], why: 'Au mid game, évite de freeze : push, puis fight. Rends-toi disponible sur la carte.' },
    { mine: 0, theirs: 4, pos: 25, q: 'Tu n’as plus de sbires et leur wave arrive sous ta tour.', ch: ['Je la laisse crash et je farme sous ma tour', 'Je force un freeze', 'Je vais chercher la wave suivante chez eux'], why: 'Pas de wave ? Ne force pas : laisse crash et farme sous ta tour. Rappel : la tour tape d’abord le canon, ou le premier sbire qu’elle voit.' },
    { mine: 5, theirs: 6, pos: 75, q: 'Mid game : ta wave de side est près de leur jungle. Pas de vision, personne pour te shadow.', ch: ['J’attends la wave en sécurité ou je demande un shadow', 'J’y vais seul', 'Je face check le buisson'], why: 'Ne va jamais chercher une wave seul : fais-toi shadow et dis-le. Pas de shadow ? Attends la wave en sécurité.' },
    { mine: 4, theirs: 4, pos: 50, q: 'Pourquoi tu slow push ta wave ?', ch: ['Pour un but : dive, reset ou objectif', 'Pour rien, c’est joli', 'Pour perdre des sbires'], why: 'Chaque gestion de wave a un but. On n’enfonce pas un clou avec une scie : le bon outil au bon moment.' }
  ];
  const TRADE_Q = [
    ['Il vient de lancer son sort le plus dangereux, il est en cooldown.', true, 'Cooldown : c’est la fenêtre pour trade.'],
    ['Il va chercher un sbire (last hit).', true, 'Punis sur les last hits : quand il farme, tu tapes.'],
    ['Sa wave est plus grosse que la tienne, vous êtes au milieu.', false, 'Plus de sbires de son côté : l’échange est pour lui.'],
    ['Tu as 4 sbires de plus que lui, il vient te taper.', true, 'Plus de sbires : tu gagnes les longs fights et même les courts trades.'],
    ['Tu viens de gagner un trade, il recule à 20 % PV sous sa tour.', false, 'Trade gagnant : ne prends pas la confiance, ne ruine pas ta lane en le poursuivant.'],
    ['Tu es all-in, niveau 1, contre une lane poke, et tu as déjà pris du poke.', false, 'Garde tes PV : sinon tu ne pourras plus all-in.'],
    ['Tu n’as plus ni flash ni R, lui a les deux.', false, 'Sans flash ou sans R : joue safe et call-le.'],
    ['Ta wave arrive en premier pour le niveau 2.', true, 'Toujours contester le niveau 2 si possible.'],
    ['Le jungler adverse n’a pas été vu depuis longtemps et tu es poussé.', false, 'Sois parano : où sont-ils ? Je ne vois personne, je fais attention.'],
    ['L’adversaire n’a plus de flash et ton jungler arrive.', true, 'Un ennemi sans flash : on joue sur lui.'],
    ['Tu es ADC, ton support est loin, leur support Leona est dans le buisson.', false, 'L’ADC est fragile : sans ton support, pas de trade contre un engage.'],
    ['Il rate son sort principal en voulant te toucher.', true, 'Punis ses erreurs : il n’a plus son sort.']
  ];
  const VF_Q = [
    ['Un ganker monocible commence plutôt au Blue.', true, 'Blue, Grump et loups : peu de cibles.'],
    ['Pour le carapateur bot, on regarde la prio top et bot.', false, 'Carapateur bot : prio mid + bot.'],
    ['Le freeze te fait perdre la prio.', true, 'Tu farmes safe, mais tu perds la prio.'],
    ['Au mid game, il vaut mieux freeze ses waves.', false, 'Au mid game : push, puis fight.'],
    ['La tour tape d’abord le canon, ou le premier sbire qu’elle voit.', true, ''],
    ['Fast push même si tu ne peux pas crash la wave.', false, 'Seulement si tu peux crash ; sinon back direct.'],
    ['L’ADC scale surtout avec les golds.', true, 'Les autres lanes scalent surtout avec l’XP.'],
    ['Prendre une R d’Amumu en tant qu’ADC, c’est la faute du support.', false, 'C’est à toi d’être à range.'],
    ['Avant un fight, on check les R et les flashs des deux équipes.', true, ''],
    ['Jouer front to back : taper ce que tu vois, pas l’ADC au fond.', true, ''],
    ['En solo queue, il faut surtout corriger les erreurs de ses alliés.', false, 'Concentre-toi sur ton jeu.'],
    ['Back sur une wave canon si possible.', true, 'Toujours crash ta wave avant de back.'],
    ['All-in bat sustain.', true, 'Le feu brûle la nature.'],
    ['Poke bat sustain.', false, 'La nature absorbe l’eau : sustain bat poke.'],
    ['Le farmeur gank seulement s’il est sûr d’un kill ou d’un flash.', true, ''],
    ['Une wave qui bounce revient vers celui qui l’a fait crash.', true, 'Tu crash sous sa tour : la wave suivante repart vers toi.'],
    ['Il y a toujours une réponse : après votre play, ils jouent ailleurs.', true, ''],
    ['Les tanks peuvent face check, les squishy restent derrière.', true, ''],
    ['Sous une R de zone, il faut se regrouper.', false, 'Ne te regroupe jamais sous une R de zone.'],
    ['Smite sur le Grump avant qu’il soit mort pour récupérer de la vie.', true, ''],
    ['Le swap lane mid/bot se fait souvent vers 15 min, quand la première tour tombe.', true, ''],
    ['Tu es 10-0 en early : tu peux attendre tranquillement le late game.', false, 'Prends tes responsabilités : crée du jeu, snowball.'],
    ['Pour un reset : slow push, stack, puis fast push la 3e wave.', true, ''],
    ['Contre une lane poke, le long trade est à l’avantage de la lane all-in.', true, ''],
    ['Le jungler doit garder tous les camps jusqu’à la fin de la game.', false, 'À un moment, il laisse les ressources aux laners (sauf s’il scale très fort).'],
    ['Le blue buff donne de la régénération de mana et de la réduction des cooldowns.', true, ''],
    ['Le red buff ralentit et met des dégâts sur les auto-attaques.', true, ''],
    ['Il faut toujours face check les buissons pour avoir l’info.', false, 'Pas de face check : doute de tout.']
  ];
  const QUOI_Q = [
    { m: [{ x: 0.2, y: 0.09, t: 'Fiddlesticks', c: 'r' }, { x: 0.5, y: 0.5, t: 'Toi (ADC)', c: 'b' }], q: 'Fiddlesticks a été vu au top. Tu es ADC au mid. Où te places-tu ?', ch: ['Vers le bas de la mid lane', 'Vers le haut de la mid lane', 'Je vais ward seul vers le top'], why: 'Tu restes au mid, mais tu joues à l’opposé de la menace.' },
    { m: [{ x: 0.663, y: 0.703, t: 'Dragon 0:40', c: 'o' }, { x: 0.82, y: 0.9, t: 'Ta bot (prio)', c: 'b' }, { x: 0.55, y: 0.45, t: 'Ton mid', c: 'b' }], q: 'Dragon dans 40 secondes. Ta bot lane a la prio.', ch: ['On pousse les waves et on se place au dragon avant eux', 'On attend qu’il apparaisse pour bouger', 'Chacun continue de farmer'], why: 'Les vagues servent les objectifs : push, puis place-toi avant eux, rapproche-toi de tes alliés.' },
    { m: [{ x: 0.337, y: 0.296, t: 'Baron', c: 'o' }, { x: 0.3, y: 0.12, t: 'Ennemis', c: 'r' }, { x: 0.36, y: 0.33, t: 'Ton équipe', c: 'b' }], q: 'Ton équipe commence le Baron. Les ennemis arrivent par le haut. Tu es l’ADC.', ch: ['Je me place à l’opposé, côté bas du pit', 'Je face check le buisson du haut', 'Je quitte le Baron seul'], why: 'Objectif commencé : anticipe leur arrivée et place-toi à l’opposé. Ni trop loin, ni trop près.' },
    { m: [{ x: 0.9, y: 0.6, t: 'Toi (side)', c: 'b' }], q: 'Tu es seul en side bot. 4 ennemis ne sont plus visibles sur la carte.', ch: ['Je recule et je ne face check pas', 'Je push jusqu’à l’inhibiteur', 'Je vais ward seul dans leur jungle'], why: 'Pas d’info ? Doute de tout. Ne va jamais chercher une wave seul sans shadow.' },
    { m: [{ x: 0.78, y: 0.92, t: 'Wave canon', c: 'o' }, { x: 0.7, y: 0.92, t: 'Toi : 1400 g', c: 'b' }], q: 'La wave canon arrive, tu as 1400 golds et tu peux crash.', ch: ['Je crash la wave canon puis je back', 'Je back tout de suite', 'Je reste avec mes golds'], why: 'Toujours crash ta wave, back sur une wave canon si possible, et ne reste pas avec tes golds.' },
    { m: [{ x: 0.86, y: 0.85, t: 'ADC sans flash', c: 'r' }, { x: 0.74, y: 0.74, t: 'Ton jungler', c: 'b' }], q: 'L’ADC adverse n’a pas de flash et ton jungler est tout proche.', ch: ['On le call et on joue sur lui', 'On l’ignore', 'Je back'], why: 'Un ennemi sans flash : s’il fait une erreur de placement, on peut le tuer. Call-le.' },
    { m: [{ x: 0.3, y: 0.36, t: 'Carapateur top', c: 'o' }, { x: 0.5, y: 0.5, t: 'Prio mid', c: 'b' }, { x: 0.12, y: 0.15, t: 'Prio top', c: 'b' }], q: 'Tu es jungler. Tu as la prio mid et la prio top.', ch: ['Je prends le carapateur top', 'Je prends le carapateur bot', 'Je ne bouge pas'], why: 'Carapateur top : prio mid + top. Et pousse-le vers la lane où tu as la prio, pour que ton laner décale.' },
    { m: [{ x: 0.5, y: 0.5, t: 'Toi : 10-0', c: 'b' }], q: 'Tu es 10-0 à 15 minutes.', ch: ['Je crée du jeu : objectifs, on finit avant le late', 'Je farme tranquille jusqu’au late', 'J’attends que l’équipe fasse le travail'], why: 'Prends tes responsabilités : tu as toutes les ressources pour carry, snowball.' }
  ];
  const SUPS = { allin: ['Leona', 'Nautilus', 'Alistar', 'Rakan', 'Rell', 'Pyke', 'Thresh', 'Blitzcrank'], poke: ['Lux', 'Xerath', "Vel'Koz", 'Brand', 'Zyra', 'Karma'], sustain: ['Soraka', 'Yuumi', 'Sona', 'Nami', 'Milio', 'Janna'] };
  const ADCS = ['Jinx', 'Caitlyn', "Kai'Sa", 'Draven', 'Ezreal', 'Ashe', 'Zeri', 'Miss Fortune', 'Xayah', 'Jhin'];
  const BTYPE = { allin: ['🔥', 'All-in'], poke: ['💧', 'Poke'], sustain: ['🌿', 'Sustain'] };
  const BEATS = { allin: 'sustain', sustain: 'poke', poke: 'allin' };

  // Une « question » : texte, visuel, choix (le bon est le premier, mélangé à l'affichage), explication.
  function lNext(mode) {
    const st = L.st[mode] = L.st[mode] || { ok: 0, n: 0, streak: 0, idx: shuffle([...Array(99).keys()]), k: 0 };
    let q;
    if (mode === 'wave') { const x = WAVE_Q[st.idx.filter((i) => i < WAVE_Q.length)[st.k++ % WAVE_Q.length]]; q = { ...x, vis: 'lane' }; }
    if (mode === 'quoi') { const x = QUOI_Q[st.idx.filter((i) => i < QUOI_Q.length)[st.k++ % QUOI_Q.length]]; q = { ...x, vis: 'rift' }; }
    if (mode === 'trade') { const x = TRADE_Q[st.idx.filter((i) => i < TRADE_Q.length)[st.k++ % TRADE_Q.length]]; q = { q: x[0], ch: x[1] ? ['⚔️ Trade !', '🛡️ Pas trade'] : ['🛡️ Pas trade', '⚔️ Trade !'], why: x[2], fixed: true, timer: 8 }; }
    if (mode === 'vf') { const x = VF_Q[st.idx.filter((i) => i < VF_Q.length)[st.k++ % VF_Q.length]]; q = { q: x[0], ch: x[1] ? ['✅ Vrai', '❌ Faux'] : ['❌ Faux', '✅ Vrai'], why: x[2], fixed: true, timer: 10 }; }
    if (mode === 'bot') q = lBot();
    if (mode === 'jgl') q = lJungle();
    q.order = q.fixed ? (q.ch[0].includes('Trade !') || q.ch[0].includes('Vrai') ? [0, 1] : [1, 0]) : shuffle(q.ch.map((_, i) => i));
    q.start = Date.now();
    st.q = q; st.ans = null;
    return q;
  }
  function lBot() {
    const r = Math.random();
    const t = pick(Object.keys(SUPS)), adc = pick(ADCS), sup = pick(SUPS[t]);
    if (r < 0.45) return { duo: [[adc, sup]], q: `${adc} + ${sup} : c’est quel type de bot lane ?`, ch: [BTYPE[t].join(' '), ...Object.keys(BTYPE).filter((k) => k !== t).map((k) => BTYPE[k].join(' '))], why: `C’est le support qui change la bot lane : ${sup} rend ce duo ${BTYPE[t][1].toLowerCase()}.` };
    if (r < 0.9) {
      let t2 = pick(Object.keys(SUPS)); while (t2 === t) t2 = pick(Object.keys(SUPS));
      const adc2 = pick(ADCS.filter((x) => x !== adc)), sup2 = pick(SUPS[t2]);
      const win = BEATS[t] === t2 ? 0 : 1;
      const lab = (a, s, k) => `${a} + ${s} (${BTYPE[k][1]})`;
      return { duo: [[adc, sup], [adc2, sup2]], q: `${lab(adc, sup, t)} contre ${lab(adc2, sup2, t2)} : qui a l’avantage en lane ?`, ch: [win === 0 ? 'Le premier duo' : 'Le second duo', win === 0 ? 'Le second duo' : 'Le premier duo', 'Aucun, c’est égal'], why: 'Le feu brûle la nature (all-in bat sustain), la nature absorbe l’eau (sustain bat poke), l’eau éteint le feu (poke bat all-in).' };
    }
    return { duo: [['Caitlyn', 'Shaco']], q: 'Shaco + Caitlyn en face : à première vue ça poke. En vrai ?', ch: ['C’est un bait : une bot lane qui reçoit', 'C’est du poke pur', 'C’est du all-in'], why: 'Il y a des bot lanes qui ont l’air poke mais qui sont un bait : elles reçoivent.' };
  }
  function lJungle() {
    const kind = pick(['gm', 'ga', 'f']);
    const KN = { gm: 'ganker monocible', ga: 'ganker AOE', f: 'farmeur AOE' };
    const step = pick(kind === 'f' ? ['camps', 'crabe', 'gankf'] : ['start', 'camps', 'crabe', 'gank']);
    if (step === 'start') return { q: `Ton champion est ${KN[kind]}. Tu commences où ?`, ch: kind === 'gm' ? ['🔵 Au Blue', '🔴 Au Red', '🦀 Au carapateur'] : ['🔴 Au Red', '🔵 Au Blue', '🦀 Au carapateur'], why: kind === 'gm' ? 'Monocible : start Blue (Blue, Grump, loups : peu de cibles). Et ward à l’opposé, côté Red.' : 'Ganker AOE : start Red, puis Krugs, Corbins, Loups, Blue, puis carapateur ou gank.' };
    if (step === 'camps') return kind === 'f' ? { q: 'Tu joues un farmeur. Ta priorité en début de game ?', ch: ['Mon farm, je gank seulement si kill ou flash sûr', 'Ganker toutes les lanes', 'Le carapateur à tout prix'], why: 'Le farmeur priorise le farm et s’adapte au rythme de la partie, sans être obnubilé par ses camps.' }
      : { q: `Tu joues un ${KN[kind]}. Combien de camps avant d’aller gank ou au carapateur ?`, ch: ['4 à 5 camps, full clear seulement s’il est propre', 'Toujours les 6 camps', 'Aucun, je gank niveau 1'], why: 'Ganker : au minimum 4 à 5 camps. Sinon priorise les ganks : ton perso est un ganker.' };
    if (step === 'crabe') {
      const pr = { top: Math.random() < 0.5, mid: Math.random() < 0.6, bot: Math.random() < 0.5 };
      const ans = pr.mid && pr.bot ? 'Carapateur bot' : pr.mid && pr.top ? 'Carapateur top' : 'Pas de carapateur : je joue ailleurs';
      const all = ['Carapateur bot', 'Carapateur top', 'Pas de carapateur : je joue ailleurs'];
      return { prios: pr, q: 'Voici tes prios de lane. Quel carapateur tu vas chercher ?', ch: [ans, ...all.filter((x) => x !== ans)], why: 'Carapateur bot : prio mid + bot. Carapateur top : prio mid + top. Pas de prio : n’y va pas. Et pousse-le vers la lane où tu as la prio.' };
    }
    // Une seule lane est clairement la bonne : prête (freeze) avec au moins un bonus ; les autres sont pas prêtes ou sans bonus.
    const bi = Math.floor(Math.random() * 3);
    const bonus = shuffle(['feed', 'cc', 'noflash']).slice(0, 1 + Math.floor(Math.random() * 2));
    const lanes = ['Top', 'Mid', 'Bot'].map((n, i) => i === bi ? { n, freeze: true, feed: bonus.includes('feed'), cc: bonus.includes('cc'), noflash: bonus.includes('noflash') }
      : (Math.random() < 0.5 ? { n, freeze: false, feed: Math.random() < 0.4, cc: Math.random() < 0.4, noflash: false } : { n, freeze: true, feed: false, cc: false, noflash: false }));
    if (step === 'gankf') {
      const ok = lanes.find((l) => l.freeze && l.noflash);
      return { lanes, q: 'Tu es farmeur. Tu ganks ou tu farmes ?', ch: ok ? [`Gank ${ok.n} : kill ou flash sûr`, 'Je farme', `Gank ${lanes.find((l) => l !== ok).n}`] : ['Je farme', ...lanes.slice(0, 2).map((l) => `Gank ${l.n}`)], why: 'Le farmeur gank seulement s’il est sûr de prendre un kill ou de faire claquer un flash, sans perdre de temps.' };
    }
    const best = lanes[bi];
    return { lanes, q: 'Tu es ganker. Quelle lane tu vas gank ?', ch: [`Gank ${best.n}`, ...lanes.filter((l) => l !== best).map((l) => `Gank ${l.n}`)], why: 'Une lane prête à être gank (freeze installé). Puis la plus feed, ou la plus facile : allié avec un CC, adversaire sans flash.' };
  }

  function lVisual(q) {
    if (q.vis === 'lane') {
      const dots = (n, cls) => h('div', { class: 'lw-g ' + cls }, Array.from({ length: n }, () => h('i')));
      return h('div', { class: 'lw' }, h('div', { class: 'lw-t b' }, '🏰', h('span', null, 'Ta tour')), h('div', { class: 'lw-road' },
        h('div', { class: 'lw-wave', style: `left:${q.pos}%` }, dots(q.mine, 'b'), dots(q.theirs, 'r'))), h('div', { class: 'lw-t r' }, '🏰', h('span', null, 'Sa tour')));
    }
    if (q.vis === 'rift') {
      const src = (S.assets && S.assets.rift) || null;
      return h('div', { class: 'lr' }, src ? h('img', { src, alt: '' }) : h('div', { class: 'lr-ph' }),
        q.m.map((m) => h('div', { class: 'lr-m ' + m.c, style: `left:${m.x * 100}%;top:${m.y * 100}%` }, h('i'), h('span', null, m.t))));
    }
    if (q.duo) return h('div', { class: 'lb' }, q.duo.map((d, i) => h('div', { class: 'lb-d' }, i ? h('b', { class: 'lb-vs' }, 'VS') : null, d.map((c) => J.data ? wIcon(c, 64) : h('b', null, c)))));
    if (q.prios) return h('div', { class: 'lj' }, ['top', 'mid', 'bot'].map((k) => h('div', { class: 'lj-l ' + (q.prios[k] ? 'ok' : 'ko') }, h('b', null, cap(k)), h('span', null, q.prios[k] ? '✅ prio' : '❌ pas de prio'))));
    if (q.lanes) return h('div', { class: 'lj' }, q.lanes.map((l) => h('div', { class: 'lj-l' }, h('b', null, l.n),
      h('span', null, l.freeze ? '🧊 freeze devant sa tour' : '⚡ wave qui pousse'), l.feed ? h('span', null, '🔥 adversaire feed') : null, l.cc ? h('span', null, '🪝 ton allié a un CC') : null, l.noflash ? h('span', null, '⚡ adversaire sans flash') : null)));
    return null;
  }

  function renderLearn(mode) {
    if (mode === 'bot' && !J.data) loadJeux();
    const st = L.st[mode];
    const q = st && st.q ? st.q : lNext(mode);
    const s2 = L.st[mode];
    const answered = s2.ans != null;
    const pickAns = (i) => {
      if (s2.ans != null) return;
      s2.ans = i; s2.n++;
      if (i === 0) { s2.ok++; s2.streak++; } else s2.streak = 0;
      clearInterval(L.timer);
      render();
    };
    const out = [h('p', { class: 'muted small jeu-stats' }, s2.n ? `✅ ${s2.ok} / ${s2.n} bonnes réponses · 🔥 série : ${s2.streak}` : 'Les réponses viennent des carnets du coach. À toi de jouer !')];
    const timer = q.timer && !answered ? h('div', { class: 'lt-bar' }, h('i', { style: `animation-duration:${q.timer}s` })) : null;
    if (timer) { clearInterval(L.timer); L.timer = setTimeout(() => { if (s2.q === q && s2.ans == null && S.section === 'jeux' && J.tab === mode) pickAns(-1); }, q.timer * 1000); }
    out.push(h('div', { class: 'card l-card' }, timer, h('h3', null, q.q), lVisual(q),
      h('div', { class: 'l-ch' }, q.order.map((i) => h('button', { class: 'l-btn' + (answered ? (i === 0 ? ' ok' : i === s2.ans ? ' ko' : ' dim') : ''), disabled: answered ? true : null, onclick: () => pickAns(i) }, q.ch[i]))),
      answered ? h('div', { class: 'l-fb ' + (s2.ans === 0 ? 'ok' : 'ko') }, h('b', null, s2.ans === 0 ? '✅ Bien joué !' : s2.ans === -1 ? '⏱️ Trop tard !' : '❌ Pas tout à fait.'), q.why ? h('p', null, q.why) : null,
        h('button', { class: 'btn-fire small-btn', onclick: () => { lNext(mode); render(); } }, 'Question suivante ▶')) : null));
    return out;
  }

  // ----- Worlds : résultats, compos et lecture de chaque game (données Leaguepedia, CC BY-SA) -----
  const W = { year: new Date().getFullYear(), seasons: {}, loading: {}, err: {}, open: null, game: 0 };
  async function loadWorlds(y, force) {
    if (W.loading[y] || (W.seasons[y] && !force)) return;
    W.loading[y] = true; W.err[y] = '';
    let r;
    try { r = await window.fire.worlds(y, !!force); } catch (e) { r = { ok: false, error: String(e) }; }
    W.loading[y] = false;
    if (r && r.ok) W.seasons[y] = { ...wParse(r.pages), at: r.at, offline: r.offline };
    else W.err[y] = (r && r.error) || 'résultats indisponibles';
    if (S.section === 'worlds' && !typing()) render();
  }
  const wNum = (t) => { t = String(t || '').trim().toLowerCase(); const m = t.match(/([\d.]+)\s*k/); return m ? Math.round(parseFloat(m[1]) * 1000) : (parseInt(t, 10) || 0); };
  function wParseBoards(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = [];
    for (const sb of doc.querySelectorAll('table.sb')) {
      const teams = [...sb.querySelectorAll('tr:first-child .sb-teamname .teamname')].map((e) => e.textContent.trim());
      const groups = {};
      for (const tr of sb.querySelectorAll(':scope > tbody > tr')) { const m = tr.className.match(/sb-w\d+-g(\d+)(?!\S)/); if (!m) continue; (groups[m[1]] = groups[m[1]] || []).push(tr); }
      for (const rows of Object.values(groups)) {
        const hd = rows.find((r) => r.querySelector('.sb-header'));
        if (!hd) continue;
        const th = [...hd.querySelectorAll(':scope > th')];
        const side = (i) => ({ win: /Victory/i.test(th[i].textContent), gold: wNum((th[i].querySelector('.sb-header-Gold') || {}).textContent), kills: wNum((th[i].querySelector('.sb-header-Kills') || {}).textContent) });
        const pr = rows.find((r) => r.querySelector('.sb-p'));
        const pl = pr ? [...pr.querySelectorAll(':scope > td')].map((td) => [...td.querySelectorAll('.sb-p')].map((p) => {
          const k = ((p.querySelector('.sb-p-stat-kda') || {}).textContent || '0/0/0').trim().split('/').map((x) => parseInt(x, 10) || 0);
          return { champ: (p.querySelector('.sb-p-champion [title]') || {}).title || '?', name: ((p.querySelector('.sb-p-name') || {}).textContent || '').trim(), k: k[0], d: k[1], a: k[2], cs: wNum((p.querySelector('.sb-p-stat-cs') || {}).textContent), gold: wNum((p.querySelector('.sb-p-stat-gold') || {}).textContent) };
        })) : [[], []];
        const fr = rows.find((r) => r.querySelector('.sb-footer'));
        const ft = fr ? [...fr.querySelectorAll('.sb-footer')].map((f) => { const o = { bans: [...f.querySelectorAll('.sb-footer-bans [title]')].map((x) => x.title).filter(Boolean) }; f.querySelectorAll('.sb-footer-item').forEach((it) => { o[it.className.replace(/.*sb-footer-item-/, '')] = wNum(it.textContent); }); return o; }) : [{}, {}];
        const meta = rows.find((r) => /Patch/.test(r.textContent));
        const vodA = meta ? [...meta.querySelectorAll('a[href^="http"]')].find((a) => /youtu|twitch|vod/i.test(a.href) || /Link/i.test(a.textContent)) : null;
        out.push({ teams, dur: ((th[1] || {}).textContent || '').trim(),
          patch: meta ? (meta.textContent.match(/Patch\s*([\d.]+)/) || [])[1] : null,
          date: meta ? (meta.textContent.match(/(\d{4}),(\d+),(\d+)/) || []).slice(1, 4).map((x, i) => i ? String(x).padStart(2, '0') : x).join('-') : null,
          vod: vodA ? vodA.href : null,
          sides: [{ team: teams[0], ...side(0), players: pl[0] || [], ...ft[0] }, { team: teams[1], ...side(2), players: pl[1] || [], ...ft[1] }] });
      }
    }
    return out;
  }
  function wParse(pages) {
    const stages = [];
    for (const pg of pages || []) {
      const games = wParseBoards(pg.html || '');
      if (!games.length) continue;
      const series = [];
      for (const g of games) {
        const key = g.teams.slice().sort().join(' vs ');
        let s0 = series[series.length - 1];
        if (!s0 || s0.key !== key) { s0 = { key, teams: g.teams.slice(), games: [] }; series.push(s0); }
        s0.games.push(g);
      }
      series.forEach((x) => { x.score = x.teams.map((t) => x.games.filter((g) => g.sides.find((sd) => sd.team === t && sd.win)).length); x.date = x.games[0].date; });
      const label = pg.stage === 'Play-In' ? 'Play-In' + (pg.name ? ' · ' + pg.name : '') : (pg.name || 'Rounds 1-2');
      stages.push({ label: label.replace('Semifinals and Finals', 'Demi-finales et finale').replace('Quarterfinals', 'Quarts de finale').replace(/^Round/, 'Ronde').replace('Rounds', 'Rondes'), series });
    }
    return { stages };
  }
  const WSPEC = { MonkeyKing: 'wukong', Renata: 'renataglasc', Nunu: 'nunuwillump' };
  function wChampId(name) {
    if (!J.data) return null;
    const n = jn(name);
    const c = J.data.champs.find((x) => jn(x.id) === n || jn(x.name) === n || WSPEC[x.id] === n);
    return c ? c.id : null;
  }
  function wIcon(name, size) {
    const id = wChampId(name);
    const sz = size || 40;
    if (!id) return h('span', { class: 'cico-l', style: `width:${sz}px;height:${sz}px;font-size:${Math.round(sz / 2.3)}px`, title: name }, (name || '?').charAt(0));
    return h('img', { class: 'w-ico', src: `${DD}/cdn/${J.data.version}/img/champion/${id}.png`, alt: name, title: name, width: sz, height: sz });
  }
  const wk = (n) => (n >= 1000 ? (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k' : String(n));
  const wMin = (dur) => { const m = String(dur || '').match(/(\d+):(\d+)/); return m ? +m[1] + +m[2] / 60 : null; };

  // Lecture automatique d'une game, tirée des chiffres de fin de partie (pas de la timeline).
  function wAnalyze(g) {
    const Wn = g.sides.find((x) => x.win) || g.sides[0], L = g.sides.find((x) => x !== Wn);
    const good = [], bad = [], learn = [];
    const dg = Wn.gold - L.gold, min = wMin(g.dur);
    const ratio = (p) => (p.k + p.a) / Math.max(1, p.d);
    const mvp = Wn.players.slice().sort((a, b) => ratio(b) - ratio(a) || b.gold - a.gold)[0];
    if (mvp) good.push(`⭐ MVP : ${mvp.name} sur ${mvp.champ}, ${mvp.k}/${mvp.d}/${mvp.a}.`);
    if ((Wn.dragons || 0) - (L.dragons || 0) >= 2) good.push(`🐉 Contrôle des dragons : ${Wn.dragons} contre ${L.dragons || 0}${Wn.dragons >= 4 ? ' (âme du dragon)' : ''}.`);
    if ((Wn.barons || 0) > (L.barons || 0)) good.push(`🟣 Baron pris${Wn.barons > 1 ? ` ${Wn.barons} fois` : ''} : c'est lui qui ouvre la base.`);
    if ((Wn.voidgrubs || 0) >= 3 && Wn.voidgrubs > (L.voidgrubs || 0)) good.push(`🪲 ${Wn.voidgrubs} larves du Néant : la pression early sur les tours.`);
    if ((Wn.riftheralds || 0) > (L.riftheralds || 0)) good.push('👁️ Héraut pris : une tour gratuite et du rythme.');
    if ((Wn.towers || 0) - (L.towers || 0) >= 4) good.push(`🏰 Pression sur la carte : ${Wn.towers} tours contre ${L.towers || 0}.`);
    if (dg >= 8000) good.push(`💰 ${wk(dg)} golds d'avance à la fin : l'avance a été convertie, pas gaspillée.`);
    if (Wn.kills < L.kills) good.push(`🎯 Victoire avec moins de kills (${Wn.kills} contre ${L.kills}) : les objectifs gagnent les games, pas les kills.`);
    if (min && min < 27) good.push(`⚡ Game pliée en ${g.dur} : snowball propre, l'avance a été jouée tout de suite.`);
    if (min && min > 38) good.push(`🐢 Game longue (${g.dur}) : patience et scaling jusqu'au bon fight.`);
    if (!(L.dragons)) bad.push('🐉 Aucun dragon pris.');
    if ((L.towers || 0) <= 3) bad.push(`🏰 Seulement ${L.towers || 0} tour${(L.towers || 0) > 1 ? 's' : ''} détruite${(L.towers || 0) > 1 ? 's' : ''} : peu de pression sur la carte.`);
    if (!(L.barons) && Wn.barons) bad.push('🟣 Baron laissé à l\'adversaire.');
    if (L.kills > Wn.kills) bad.push(`⚔️ Plus de kills (${L.kills} contre ${Wn.kills}) mais défaite : les kills n'ont pas été transformés en objectifs.`);
    if (L.gold > Wn.gold) bad.push('💰 Plus de golds mais défaite : un fight ou un Baron a tout renversé à la fin.');
    const dead = L.players.slice().sort((a, b) => b.d - a.d)[0];
    if (dead && dead.d >= 6) bad.push(`💀 ${dead.name} (${dead.champ}) meurt ${dead.d} fois.`);
    if (Wn.kills < L.kills || L.kills > Wn.kills) learn.push('Carnet ADC et Jungle : un kill ne sert que s\'il devient un objectif (tour, dragon, Baron).');
    if ((Wn.dragons || 0) - (L.dragons || 0) >= 2) learn.push('Les vagues servent les objectifs : pousser sa lane avant le dragon, c\'est ce qui permet de le prendre.');
    if ((Wn.voidgrubs || 0) >= 3) learn.push('Jungle : les prios de lane avant les larves et le carapateur, comme dans ton carnet.');
    if (dead && dead.d >= 6) learn.push('Fights : check R et flash, jamais de face check, se rapprocher de ses alliés.');
    if (!learn.length) learn.push('Regarde la VOD : repère les moments où le gagnant prend un objectif juste après un kill. Il y a toujours une réponse.');
    return { Wn, L, good, bad, learn };
  }

  function renderWorlds() {
    const view = $('view');
    const y = W.year, data = W.seasons[y];
    const years = [];
    for (let k = new Date().getFullYear(); k >= 2020; k--) years.push(k);
    const nodes = [h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🏆'),
      h('div', null, h('h1', { class: 'title' }, `E-sport · Worlds ${y}`), h('p', { class: 'muted' }, 'Les résultats, les compos et la lecture de chaque game : regarde ce que font les pros.'))),
      h('div', { class: 'row' }, h('div', { class: 'chips' }, years.map((k) => h('button', { class: 'chip', 'aria-pressed': String(k === y), onclick: () => { W.year = k; W.open = null; loadWorlds(k); render(); } }, String(k)))),
        h('button', { class: 'btn-ghost', disabled: W.loading[y] ? true : null, onclick: () => { loadWorlds(y, true); render(); } }, W.loading[y] ? 'Chargement…' : '🔄 Actualiser'))];
    if (!J.data) loadJeux();
    if (!data) {
      nodes.push(h('div', { class: 'card' }, W.err[y] ? h('p', { class: 'bad' }, '⚠ ' + W.err[y]) : h('p', { class: 'muted' }, 'Chargement des résultats depuis Leaguepedia… (la première fois, ça peut prendre une minute)')));
      if (!W.loading[y] && !W.err[y]) loadWorlds(y);
      view.replaceChildren(...nodes); return;
    }
    if (W.err[y]) nodes.push(h('p', { class: 'muted small' }, '⚠ ' + W.err[y]));
    if (data.offline) nodes.push(h('p', { class: 'muted small' }, 'Hors ligne : derniers résultats enregistrés.'));
    for (const st of data.stages.slice().reverse()) {
      nodes.push(h('h2', { class: 'team-h' }, st.label));
      nodes.push(h('div', { class: 'w-series' }, st.series.map((sr) => {
        const id = st.label + '|' + sr.key + '|' + sr.date;
        const open = W.open === id;
        const win = sr.score[0] > sr.score[1] ? 0 : sr.score[1] > sr.score[0] ? 1 : -1;
        const card = h('div', { class: 'card w-card' + (open ? ' open' : '') },
          h('button', { class: 'w-head', onclick: () => { W.open = open ? null : id; W.game = 0; render(); } },
            h('span', { class: 'w-team' + (win === 0 ? ' win' : '') }, sr.teams[0]),
            h('span', { class: 'w-score' }, `${sr.score[0]} – ${sr.score[1]}`),
            h('span', { class: 'w-team r' + (win === 1 ? ' win' : '') }, sr.teams[1]),
            h('span', { class: 'muted small w-date' }, sr.date ? dateFr(sr.date) : '', sr.games.length > 1 ? ` · ${sr.games.length} games` : ''), h('span', { class: 'w-chev' }, open ? '▲' : '▼')));
        if (open) card.append(wGame(sr));
        return card;
      })));
    }
    nodes.push(h('p', { class: 'muted small' }, 'Données : Leaguepedia (lol.fandom.com), licence CC BY-SA. Lecture des games calculée automatiquement à partir des chiffres de fin de partie.'));
    view.replaceChildren(...nodes);
  }

  function wGame(sr) {
    const gi = Math.min(W.game, sr.games.length - 1);
    const g = sr.games[gi];
    const A = wAnalyze(g);
    const tabs = sr.games.length > 1 ? h('div', { class: 'chips' }, sr.games.map((x, i) => h('button', { class: 'chip', 'aria-pressed': String(i === gi), onclick: () => { W.game = i; render(); } }, `Game ${i + 1}`))) : null;
    const ROLES5 = ['🛡️', '🌲', '✨', '🏹', '💞'];
    const sideCol = (sd, i) => h('div', { class: 'w-side ' + (i ? 'red' : 'blue') + (sd.win ? ' win' : '') },
      h('div', { class: 'w-side-h' }, h('b', null, sd.team), h('span', { class: sd.win ? 'good' : 'bad' }, sd.win ? 'Victoire' : 'Défaite'), h('span', { class: 'muted small' }, `${sd.kills} kills · ${wk(sd.gold)} golds`)),
      sd.players.map((p, k) => h('div', { class: 'w-p' }, h('span', { class: 'w-role' }, ROLES5[k] || ''), wIcon(p.champ, 40),
        h('div', { class: 'w-pn' }, h('b', null, p.champ), h('span', { class: 'muted small' }, p.name)),
        h('div', { class: 'w-ps' }, h('b', null, `${p.k}/${p.d}/${p.a}`), h('span', { class: 'muted small' }, `${p.cs} CS · ${wk(p.gold)}`)))),
      h('div', { class: 'w-bans' }, h('span', { class: 'muted small' }, 'Bans '), (sd.bans || []).map((b) => wIcon(b, 26))));
    const obj = [['towers', '🏰 Tours'], ['dragons', '🐉 Dragons'], ['barons', '🟣 Barons'], ['voidgrubs', '🪲 Larves'], ['riftheralds', '👁️ Héraut'], ['inhibitors', '🧱 Inhibiteurs']];
    const objRows = h('div', { class: 'w-obj' }, obj.map(([k, l]) => {
      const a = g.sides[0][k] || 0, b = g.sides[1][k] || 0, t = Math.max(1, a + b);
      return h('div', { class: 'w-or' }, h('b', { class: a > b ? 'good' : '' }, String(a)),
        h('div', { class: 'w-bar' }, h('i', { class: 'blue', style: `width:${(a / t) * 100}%` }), h('i', { class: 'red', style: `width:${(b / t) * 100}%` })),
        h('b', { class: b > a ? 'good' : '' }, String(b)), h('span', { class: 'muted small' }, l));
    }));
    return h('div', { class: 'w-game' }, tabs,
      h('div', { class: 'row w-meta' }, h('span', { class: 'muted small' }, `⏱️ ${g.dur}${g.patch ? ' · patch ' + g.patch : ''}${g.date ? ' · ' + dateFr(g.date) : ''}`),
        g.vod ? h('a', { class: 'btn-ghost', href: g.vod, target: '_blank' }, '▶ Voir la VOD') : null),
      h('div', { class: 'w-sides' }, sideCol(g.sides[0], 0), sideCol(g.sides[1], 1)),
      objRows,
      h('div', { class: 'w-ana' },
        h('div', { class: 'card w-a good' }, h('h3', null, `✅ Ce qu'a bien fait ${A.Wn.team}`), A.good.map((x) => h('p', null, x))),
        h('div', { class: 'card w-a bad' }, h('h3', null, `⚠️ Ce qui a manqué à ${A.L.team}`), A.bad.length ? A.bad.map((x) => h('p', null, x)) : h('p', { class: 'muted' }, 'Rien de flagrant dans les chiffres : la game s\'est jouée sur les détails, à voir en VOD.')),
        h('div', { class: 'card w-a learn' }, h('h3', null, '🎓 À retenir pour FIRE'), A.learn.map((x) => h('p', null, x)))));
  }

  // ----- Détente : devine le champion (comme Loldle, en illimité) et lore des champions -----
  const DD = 'https://ddragon.leagueoflegends.com';
  const J = { data: null, err: '', loading: false, tab: 'classique', r: {}, lore: {}, loreSel: null, loreQ: '', loreReg: '' };
  const JMODES = [['classique', '🎯 Classique'], ['sort', '✨ Sort'], ['passif', '🔮 Passif'], ['phrase', '💬 Phrase'], ['splash', '🖼️ Splash'], ['emoji', '😀 Emoji'], ['ombre', '🌑 Ombre'], ['listen', '🎧 Listen'], ['lore', '📖 Lore']];
  const TAGFR = { Fighter: 'Combattant', Tank: 'Tank', Mage: 'Mage', Assassin: 'Assassin', Marksman: 'Tireur', Support: 'Support' };
  const jn = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const jimg = (type, f) => `${DD}/cdn/${J.data.version}/img/${type}/${f}`;
  const jsq = (c) => jimg('champion', c.id + '.png');
  const jsplash = (c, num) => `${DD}/cdn/img/champion/splash/${c.id}_${num || 0}.jpg`;
  // Place le point (fx %, fy %) du splash au centre du cadre, sans laisser de bord vide.
  const splashZoom = (sc, fx, fy) => {
    const cl = (v) => Math.min(0, Math.max(100 - 100 * sc, v));
    return `transform-origin:0 0;transform:translate(${cl(50 - sc * fx)}%, ${cl(50 - sc * fy)}%) scale(${sc})`;
  };
  const jstats = () => load('fire.jeux', {});

  async function loadJeux() {
    if (J.data || J.loading) return;
    J.loading = true; J.err = '';
    let r;
    try { r = await window.fire.jeux.data(); } catch (e) { r = { ok: false, error: String(e) }; }
    J.loading = false;
    if (r && r.ok) J.data = r; else J.err = (r && r.error) || 'données indisponibles';
    if (S.section === 'jeux' && !typing()) render();
  }
  async function jLore(c) {
    if (J.lore[c.id]) return J.lore[c.id];
    let r;
    try { r = await window.fire.jeux.lore(c.slug); } catch (e) { r = { ok: false }; }
    J.lore[c.id] = r && r.ok ? r : { ok: false, races: [], quote: '', full: '', short: '' };
    return J.lore[c.id];
  }
  const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
  function jMask(text, c) {
    let t = String(text || '');
    const words = [c.name, c.id, ...c.name.split(/[\s'’.-]+/).filter((w) => w.length >= 3)];
    for (const w of words) t = t.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '•••');
    return t;
  }

  async function jNew(mode) {
    const cs = mode === 'emoji' ? J.data.champs.filter((x) => x.emo) : J.data.champs;
    const prev = J.r[mode] && J.r[mode].target;
    let c = pick(cs);
    if (prev && cs.length > 1) while (c.id === prev.id) c = pick(cs);
    const r = { target: c, guesses: [], done: false, gaveUp: false, at: Date.now() };
    if (J.audio) { try { J.audio.pause(); } catch (e) { /* rien */ } }
    if (mode === 'sort') { r.spell = pick(c.spells); r.rot = pick([90, 180, 270]); }
    // League of Listen : les bruitages du champion (sorts, attaques) joués à la sélection.
    if (mode === 'listen') {
      r.sfx = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-sfx-audios/${c.key}.ogg`;
      r.vo = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/fr_fr/v1/champion-choose-vo/${c.key}.ogg`;
      r.cut = Math.random(); // en difficile : où commence l'extrait d'un seul sort
    }
    if (mode === 'emoji') r.emo = [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(c.emo)].map((x) => x.segment);
    if (mode === 'ombre') { const sk = c.skins.filter((x) => x.num > 0); r.skin = Math.random() < 0.5 || !sk.length ? (c.skins[0] || { num: 0 }) : pick(sk); }
    if (mode === 'splash') {
      const sk = c.skins.filter((x) => x.num > 0);
      r.skin = sk.length ? pick(sk) : c.skins[0];
      // Zoom centré sur le champion du skin (pas sur le décor ni sur l'autre personnage d'un splash à deux).
      const jit = () => Math.round((Math.random() - 0.5) * 8);
      r.ox = Math.min(92, Math.max(8, (r.skin.fx == null ? 50 : r.skin.fx) + jit()));
      r.oy = Math.min(92, Math.max(8, (r.skin.fy == null ? 40 : r.skin.fy) + jit()));
      r.flip = true; // image à l'envers jusqu'à la bonne réponse
    }
    J.r[mode] = r;
    if (mode === 'phrase') {
      if (J.audio) { try { J.audio.pause(); } catch (e) { /* rien */ } }
      // La phrase affichée est exactement la réplique audio (sélection ou bannissement, en français).
      const line = (c.vo || []).length ? pick(c.vo) : null;
      if (line) {
        r.vo = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/fr_fr/v1/champion-${line.kind}-vo/${c.key}.ogg`;
        r.quote = jMask(line.text, c); r.fromBio = false;
      } else {
        // Pas de réplique fiable pour ce champion : citation du lore, sans audio.
        r.vo = null;
        r.wait = true; render();
        const l = await jLore(c);
        const src = l.quote || (l.short || c.lore || '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
        r.quote = jMask(src, c); r.fromBio = !l.quote; r.wait = false;
      }
    }
    render();
  }

  async function jGuess(mode, raw) {
    const r = J.r[mode];
    if (!r || r.done) return;
    const q = jn(raw);
    if (!q) return;
    const cs = J.data.champs;
    let c = cs.find((x) => jn(x.name) === q || jn(x.id) === q);
    if (!c) { const st = cs.filter((x) => jn(x.name).startsWith(q)); if (st.length === 1) c = st[0]; }
    if (!c) { J.msg = 'Champion inconnu : choisis un nom dans la liste.'; render(); return; }
    if (r.guesses.some((g) => g.id === c.id)) { J.msg = 'Déjà proposé.'; render(); return; }
    J.msg = '';
    r.guesses.push(c);
    if (c.id === r.target.id) {
      r.done = true;
      const st = jstats(); const m = st[mode] || { wins: 0, tries: 0, streak: 0, best: 0 };
      m.wins++; m.tries += r.guesses.length; m.streak++; m.best = Math.max(m.best, m.streak); st[mode] = m; save('fire.jeux', st);
    }
    render();
    later(() => { const i = $('jeu-in'); if (i && !r.done) i.focus(); });
  }
  function jGiveUp(mode) {
    const r = J.r[mode];
    if (!r || r.done) return;
    r.done = true; r.gaveUp = true;
    const st = jstats(); const m = st[mode] || { wins: 0, tries: 0, streak: 0, best: 0 };
    m.streak = 0; st[mode] = m; save('fire.jeux', st);
    render();
  }

  // Accueil de Détente : tous les jeux en cartes ; un jeu ouvert prend toute la page (retour en un clic).
  const JDESC = {
    wr: 'Deux champions face à face dans la même lane : estime le taux de victoire du matchup (stats Émeraude+ du patch).',
    classique: 'Devine le champion : chaque essai te dit ce qui est pareil, proche ou différent.', sort: 'Retrouve le champion à partir de l’icône d’un de ses sorts.',
    passif: 'Son passif, en icône : à qui est-il ?', phrase: 'Une réplique du champion : qui parle ?', splash: 'Un bout de splash art qui se dévoile petit à petit.',
    emoji: 'Le champion en quelques emojis.', ombre: 'Sa silhouette seulement.', listen: 'Les sons de ses sorts : à l’oreille !', lore: 'Les histoires des champions et des régions de Runeterra.',
    wave: 'La wave pousse vers qui ? Freeze, slow push, crash : lis la situation.', jgl: 'Où est le jungler adverse ? Lis les indices de la carte.', bot: 'Les situations de la bot lane : que faire ?',
    trade: 'Ce trade est-il bon ou mauvais ?', vf: 'Vrai ou faux sur les mécaniques du jeu.', quoi: 'Une situation de partie : quelle est la bonne décision ?',
  };

  // ----- Quiz façon TierTest : 10 questions chronométrées, un rang de Fer à Challenger à la fin -----
  // Données Data Dragon (temps de recharge, stats de base, prix et recettes des objets).
  const QMODES = [['cdq', '⏱️ Temps de recharge'], ['prix', '💰 Prix des objets'], ['stat', '📊 Stats des champions'], ['recette', '🧪 Recettes d’objets']];
  Object.assign(JDESC, {
    cdq: 'Deux sorts : lequel a le plus long (ou le plus court) temps de recharge ?', prix: 'Combien coûte cet objet ? Au po près.',
    stat: 'Vitesse, portée, PV, armure… quel champion en a le plus ?', recette: 'Il manque un composant dans la recette : lequel ?',
  });
  const QN = 10, QT = 12;
  const QRANKS = [['Fer', '#6b6b6b'], ['Bronze', '#a0673d'], ['Argent', '#9aa7b4'], ['Or', '#e0b44c'], ['Platine', '#3fb6a8'], ['Émeraude', '#2fbf71'], ['Diamant', '#6b8cff'], ['Maître', '#b05cff'], ['Grand Maître', '#ff4d5e'], ['Challenger', '#5ad0ff']];
  const qRank = (ok) => QRANKS[Math.max(0, Math.min(QRANKS.length - 1, ok - 1))];
  const Q = {};
  const qImg = (kind, img) => `${DD}/cdn/${J.data.version}/img/${kind}/${img}`;
  const qNum = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const QSTATS = [['ms', 'la plus grande vitesse de déplacement', 'Vitesse'], ['rg', 'la plus grande portée d’attaque', 'Portée'], ['hp', 'le plus de PV au niveau 1', 'PV'],
    ['ar', 'le plus d’armure au niveau 1', 'Armure'], ['ad', 'le plus de dégâts d’attaque au niveau 1', 'AD'], ['as', 'la meilleure vitesse d’attaque de base', 'Vit. d’attaque']];
  function qMake(mode) {
    const D = J.data;
    for (let tries = 0; tries < 60; tries++) {
      if (mode === 'cdq') {
        const sp = () => { const c = pick(D.champs); const s0 = pick(c.spells.filter((x) => x.cd && x.cd[0] > 0)); return s0 ? { c, s: s0, v: s0.cd[0] } : null; };
        const a = sp(), b2 = sp();
        if (!a || !b2 || a.c.id === b2.c.id || Math.abs(a.v - b2.v) < 1) continue;
        const long = Math.random() < 0.6;
        const good = (long ? a.v > b2.v : a.v < b2.v) ? 0 : 1;
        return { kind: 'duel', q: `Quel sort a le plus ${long ? 'long' : 'court'} temps de recharge (rang 1) ?`, good,
          opts: [a, b2].map((x) => ({ img: qImg('spell', x.s.img), t: x.s.name, sub: `${x.c.name} · ${x.s.key}`, val: qNum(x.v) + ' s' })) };
      }
      if (mode === 'stat') {
        const [k, txt] = pick(QSTATS);
        const cs = D.champs.filter((c) => c.st && c.st[k] != null);
        const a = pick(cs), b2 = pick(cs);
        if (a.id === b2.id || a.st[k] === b2.st[k]) continue;
        const good = a.st[k] > b2.st[k] ? 0 : 1;
        return { kind: 'duel', q: `Quel champion a ${txt} ?`, good,
          opts: [a, b2].map((c) => ({ img: qImg('champion', c.id + '.png'), t: c.name, sub: c.title, val: qNum(c.st[k]) })) };
      }
      const items = (D.items || []);
      if (!items.length) return null;
      if (mode === 'prix') {
        const it = pick(items.filter((x) => x.gold >= 300));
        const step = it.gold >= 1500 ? 100 : 50;
        const set = new Set([it.gold]);
        while (set.size < 4) { const d = (1 + Math.floor(Math.random() * 6)) * step * (Math.random() < 0.5 ? -1 : 1); const v = it.gold + d; if (v > 0) set.add(v); }
        const vals = [...set].sort((x, y) => x - y);
        return { kind: 'choice', q: `Combien coûte ${it.name} ?`, item: it, good: vals.indexOf(it.gold), opts: vals.map((v) => ({ t: v.toLocaleString('fr-FR') + ' po' })) };
      }
      if (mode === 'recette') {
        const byId = Object.fromEntries(items.map((x) => [x.id, x]));
        const it = pick(items.filter((x) => x.from.length >= 2));
        const hide = Math.floor(Math.random() * it.from.length);
        const ans = byId[it.from[hide]];
        const pool = items.filter((x) => x.id !== ans.id && !it.from.includes(x.id) && x.id !== it.id && Math.abs(x.depth - ans.depth) <= 1 && x.gold < it.gold);
        if (pool.length < 3) continue;
        const near = shuffle(pool.filter((x) => x.tags.some((t) => ans.tags.includes(t)))).slice(0, 3);
        const wrong = near.length >= 3 ? near : shuffle(pool).slice(0, 3);
        const opts = shuffle([ans, ...wrong]);
        return { kind: 'choice', q: `Quel objet manque dans la recette de ${it.name} ?`, item: it, recipe: it.from.map((f, i) => (i === hide ? null : byId[f])), recipeAns: ans,
          good: opts.indexOf(ans), opts: opts.map((x) => ({ img: qImg('item', x.img), t: x.name, val: x.gold.toLocaleString('fr-FR') + ' po' })) };
      }
    }
    return null;
  }
  function qStart(mode) {
    clearTimeout(Q.timer);
    Q[mode] = { i: 0, ok: 0, q: qMake(mode), ans: null, log: [], done: false };
    newsMark('jeux', ['f:' + mode]);
  }
  function qBest() { return load('fire.quiz', {}); }
  function renderQuiz(mode) {
    const out = [];
    if (mode === 'prix' || mode === 'recette') { if (!(J.data.items || []).length) return [h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Les objets ne sont pas encore chargés. Relance l’application avec Internet pour mettre à jour les données.'))]; }
    const best = qBest()[mode];
    let R = Q[mode];
    if (!R) {
      out.push(h('div', { class: 'card qz-intro' }, h('h3', null, JDESC[mode]),
        h('p', { class: 'muted' }, `${QN} questions, ${QT} secondes chacune. Ton score donne ton rang : de Fer (0-1) à Challenger (10/10).`),
        best ? h('p', null, 'Ton record : ', h('b', { style: `color:${qRank(best.ok)[1]}` }, `${qRank(best.ok)[0]} · ${best.ok}/${QN}`)) : null,
        h('button', { class: 'btn-fire', onclick: () => { qStart(mode); render(); } }, '▶ Lancer le quiz')));
      return out;
    }
    if (R.done) {
      const [rk, col] = qRank(R.ok);
      out.push(h('div', { class: 'card qz-end', style: `--rk:${col}` }, h('div', { class: 'qz-rank' }, rk), h('p', { class: 'qz-score' }, `${R.ok} / ${QN} bonnes réponses`),
        best && best.ok >= R.ok && !R.record ? h('p', { class: 'muted small' }, `Ton record : ${qRank(best.ok)[0]} (${best.ok}/${QN})`) : R.record ? h('p', { class: 'qz-rec' }, '🏆 Nouveau record !') : null,
        h('div', { class: 'qz-log' }, R.log.map((x) => h('span', { class: x ? 'ok' : 'ko' }, x ? '✓' : '✗'))),
        h('div', { class: 'row' }, h('button', { class: 'btn-fire', onclick: () => { qStart(mode); render(); } }, '🔁 Rejouer'), h('button', { class: 'btn-ghost', onclick: () => { Q[mode] = null; render(); } }, 'Retour'))));
      return out;
    }
    const q = R.q;
    if (!q) return [h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Pas assez de données pour ce quiz.'))];
    const answered = R.ans != null;
    const choose = (i) => {
      if (R.ans != null) return;
      clearTimeout(Q.timer);
      R.ans = i; const good = i === q.good; if (good) R.ok++; R.log.push(good);
      render();
    };
    const next = () => {
      R.i++;
      if (R.i >= QN) {
        R.done = true;
        const all = qBest();
        if (!all[mode] || R.ok > all[mode].ok) { all[mode] = { ok: R.ok, at: Date.now() }; save('fire.quiz', all); R.record = true; }
        actLog('jeu', `Quiz ${(QMODES.find(([k]) => k === mode) || [, mode])[1].replace(/^\S+\s/, '')} : ${R.ok}/${QN} (${qRank(R.ok)[0]})`);
      } else { R.q = qMake(mode); R.ans = null; }
      render();
    };
    if (!answered) { clearTimeout(Q.timer); Q.timer = setTimeout(() => { if (Q[mode] === R && R.q === q && R.ans == null && S.section === 'jeux' && J.tab === mode) choose(-1); }, QT * 1000); }
    const cls = (i) => answered ? (i === q.good ? ' ok' : i === R.ans ? ' ko' : ' dim') : '';
    let body;
    if (q.kind === 'duel') {
      body = h('div', { class: 'qz-duel' }, q.opts.map((o, i) => [i ? h('b', { class: 'qz-vs' }, 'VS') : null,
        h('button', { class: 'qz-opt' + cls(i), disabled: answered ? true : null, onclick: () => choose(i) }, h('img', { src: o.img, alt: '', width: 72, height: 72 }),
          h('b', null, o.t), h('small', { class: 'muted' }, o.sub), answered ? h('span', { class: 'qz-val' }, o.val) : null)]));
    } else {
      const head = h('div', { class: 'qz-item' }, h('img', { src: qImg('item', q.item.img), alt: '', width: 64, height: 64 }), h('b', null, q.item.name),
        q.recipe ? h('div', { class: 'qz-recipe' }, q.recipe.map((x) => x ? h('img', { src: qImg('item', x.img), alt: x.name, title: x.name, width: 44, height: 44 })
          : answered ? h('img', { class: 'qz-hole ok', src: qImg('item', q.recipeAns.img), alt: q.recipeAns.name, title: q.recipeAns.name, width: 44, height: 44 }) : h('span', { class: 'qz-hole' }, '?'))) : null,
        answered && q.recipe ? h('small', { class: 'muted' }, `${q.item.name} : ${q.item.gold.toLocaleString('fr-FR')} po au total`) : null);
      body = h('div', null, head, h('div', { class: 'qz-ch' + (q.opts[0].img ? ' img' : '') }, q.opts.map((o, i) => h('button', { class: 'l-btn qz-c' + cls(i), disabled: answered ? true : null, onclick: () => choose(i) },
        o.img ? h('img', { src: o.img, alt: '', width: 36, height: 36 }) : null, h('span', null, o.t), o.val && answered ? h('small', { class: 'muted' }, ' ' + o.val) : null))));
    }
    out.push(h('div', { class: 'card l-card qz-card' },
      h('div', { class: 'qz-top' }, h('span', null, `Question ${R.i + 1} / ${QN}`), h('div', { class: 'qz-log' }, R.log.map((x) => h('span', { class: x ? 'ok' : 'ko' }, x ? '✓' : '✗'))), h('b', null, `${R.ok} ✓`)),
      !answered ? h('div', { class: 'lt-bar' }, h('i', { style: `animation-duration:${QT}s` })) : null,
      h('h3', null, q.q), body,
      answered ? h('div', { class: 'l-fb ' + (R.ans === q.good ? 'ok' : 'ko') }, h('b', null, R.ans === q.good ? '✅ Bien vu !' : R.ans === -1 ? '⏱️ Trop tard !' : '❌ Raté.'),
        h('button', { class: 'btn-fire small-btn', onclick: next }, R.i + 1 >= QN ? 'Voir mon rang ▶' : 'Question suivante ▶')) : null));
    return out;
  }

  // ===== « Qui a le meilleur winrate ? » : estimer le taux de victoire d'un vrai matchup (LoLalytics, Émeraude+) =====
  const WRN = 10, WRT = 20;
  const WRG = { st: null };
  const WR_LANES = [['top', 'Top'], ['jungle', 'Jungle'], ['middle', 'Mid'], ['bottom', 'ADC'], ['support', 'Support']];
  function wrPick() {
    const D = TL.data && TL.data.data;
    const reg = (D && (D.euw || D.kr)) || {};
    const byElo = reg.emerald_plus || reg.all || {};
    const [lane, laneFr] = WR_LANES[Math.floor(Math.random() * WR_LANES.length)];
    const rows = (byElo[lane] || []).filter((r) => r.id && (r.lane == null || r.lane >= 10)).sort((a, b) => (b.pick || 0) - (a.pick || 0)).slice(0, 22);
    if (rows.length < 4) return null;
    const a = rows[Math.floor(Math.random() * rows.length)];
    let b = a; while (b.id === a.id) b = rows[Math.floor(Math.random() * rows.length)];
    return { a: a.id, b: b.id, lane, laneFr };
  }
  // On prépare les matchups à l'avance (2 d'avance) pour ne jamais attendre entre deux questions.
  async function wrFill() {
    const g = WRG.st; if (!g || g.filling) return;
    g.filling = true;
    try {
      for (let tries = 0; g.queue.length < 3 && tries < 12 && WRG.st === g; tries++) {
        const m = wrPick(); if (!m) break;
        const r = await window.fire.matchup(m.a, m.b, m.lane).catch(() => null);
        if (r && r.ok && r.wr != null && (r.games || 0) >= 300) g.queue.push({ ...m, wr: Number(r.wr), games: r.games, patch: r.patch, elo: r.elo });
      }
    } finally { g.filling = false; }
    if (WRG.st === g && S.section === 'jeux' && J.tab === 'wr' && !g.cur) { wrNext(); }
  }
  function wrStart() {
    WRG.st = { i: -1, pts: 0, good: 0, log: [], queue: [], cur: null, val: 50, ans: null, t0: 0 };
    if (!TL.data && !TL.loading) { TL.loading = true; window.fire.tierlist().then((d) => { TL.data = d || { data: {} }; }).catch(() => { TL.data = { data: {} }; }).finally(() => { TL.loading = false; wrFill(); }); }
    else wrFill();
    render();
  }
  function wrNext() {
    const g = WRG.st; if (!g) return;
    if (g.i + 1 >= WRN) { g.done = true; g.cur = null; const best = load('fire.wr.best', 0); if (g.pts > best) save('fire.wr.best', g.pts); render(); return; }
    const m = g.queue.shift();
    if (!m) { g.cur = null; render(); wrFill(); return; }
    g.i++; g.cur = m; g.val = 50; g.ans = null; g.t0 = Date.now();
    clearInterval(g.timer);
    g.timer = setInterval(() => { if (!g.cur || g.ans != null || WRG.st !== g) { clearInterval(g.timer); return; } const left = WRT - Math.floor((Date.now() - g.t0) / 1000); const el = document.querySelector('.wr-left'); if (el) el.textContent = Math.max(0, left) + ' s restantes'; if (left <= 0) wrConfirm(); }, 250);
    render(); wrFill();
  }
  function wrConfirm() {
    const g = WRG.st; if (!g || !g.cur || g.ans != null) return;
    clearInterval(g.timer);
    const diff = Math.abs(g.val - g.cur.wr);
    const side = (g.val >= 50) === (g.cur.wr >= 50) || diff <= 0.5;
    const pts = diff <= 0.5 ? 100 : Math.max(0, Math.round(100 - diff * 18));
    g.ans = { diff, side, pts };
    g.pts += pts; if (side) g.good++;
    g.log.push(pts >= 70 ? 'ok' : side ? 'mid' : 'ko');
    render();
  }
  function renderWrGame() {
    const g = WRG.st;
    const splash = (id) => h('div', { class: 'wr-splash', style: `background-image:url(https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg)` });
    if (!g) return [h('div', { class: 'card wr-intro' }, h('h3', null, '📊 Qui a le meilleur winrate ?'),
      h('p', { class: 'muted' }, `${WRN} matchups tirés au hasard parmi les champions les plus joués de chaque lane. Déplace le curseur pour estimer le taux de victoire du champion de gauche contre celui de droite, puis confirme (${WRT} s par matchup). Les stats sont les vraies, Émeraude+, du patch en cours.`),
      load('fire.wr.best', 0) ? h('p', { class: 'small' }, `🏆 Ton record : ${load('fire.wr.best', 0)} points`) : null,
      h('button', { class: 'btn-fire small-btn', onclick: wrStart }, '▶ Jouer'))];
    if (g.done) {
      const best = load('fire.wr.best', 0);
      const rank = g.pts >= 800 ? ['Challenger', '#5ad0ff'] : g.pts >= 650 ? ['Maître', '#b05cff'] : g.pts >= 500 ? ['Diamant', '#6b8cff'] : g.pts >= 350 ? ['Platine', '#2fbf9f'] : g.pts >= 200 ? ['Or', '#e8b44a'] : ['Fer', '#888'];
      return [h('div', { class: 'card wr-end' }, h('h3', null, 'Partie terminée'),
        h('div', { class: 'wr-big', style: `color:${rank[1]}` }, rank[0]),
        h('p', null, `${g.pts} points · ${g.good} / ${WRN} bons côtés (plus ou moins de 50 %)`), g.pts >= best ? h('p', { class: 'good small' }, '🏆 Nouveau record !') : h('p', { class: 'muted small' }, `Record : ${best} points`),
        h('button', { class: 'btn-fire small-btn', onclick: wrStart }, '↻ Rejouer'))];
    }
    if (!g.cur) return [h('div', { class: 'card' }, h('p', { class: 'muted' }, g.filling || TL.loading ? '⏳ Préparation des matchups (vraies stats LoLalytics)…' : '⚠ Stats indisponibles pour l’instant (connexion ?).'),
      !g.filling && !TL.loading ? h('button', { class: 'btn-ghost', onclick: wrFill }, 'Réessayer') : null)];
    const m = g.cur, A = FC.champName(m.a), B = FC.champName(m.b);
    const out = h('b', { class: 'wr-val' }, `${fr(g.val, 1)} %`), out2 = h('b', { class: 'wr-val' }, `${fr(100 - g.val, 1)} %`);
    const slider = h('input', { type: 'range', min: 35, max: 65, step: 0.5, value: g.val, class: 'wr-range', disabled: g.ans ? true : null,
      oninput: (e) => { g.val = Number(e.target.value); out.textContent = `${fr(g.val, 1)} %`; out2.textContent = `${fr(100 - g.val, 1)} %`; },
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); wrConfirm(); } } });
    setTimeout(() => { if (!g.ans) slider.focus(); }, 30);
    return [h('div', { class: 'wr' },
      h('div', { class: 'wr-top' }, h('span', { class: 'muted' }, `Matchup ${g.i + 1} sur ${WRN} · ${g.pts} points`), h('div', { class: 'qz-log' }, g.log.map((x) => h('span', { class: x === 'ok' ? 'ok' : x === 'ko' ? 'ko' : 'mid' }, x === 'ok' ? '✓' : x === 'ko' ? '✗' : '~')))),
      h('h2', null, 'Qui a le meilleur winrate ?'),
      h('div', { class: 'muted' }, `${m.laneFr} · patch ${m.patch || '?'} `, !g.ans ? h('small', { class: 'wr-left' }, WRT + ' s restantes') : null),
      h('div', { class: 'wr-row' },
        h('div', { class: 'wr-champ' }, splash(m.a), h('b', null, A)),
        h('div', { class: 'wr-mid' },
          h('div', { class: 'muted' }, `Estime le taux de victoire de ${A}`),
          h('div', { class: 'wr-vals' }, out, out2), slider,
          g.ans ? h('div', { class: 'wr-res ' + (g.ans.pts >= 70 ? 'ok' : g.ans.side ? 'mid' : 'ko') },
            h('div', null, `Réponse : ${A} `, h('b', null, `${fr(m.wr, 1)} %`), ` contre ${B}`),
            h('small', null, `Écart ${fr(g.ans.diff, 1)} pt · +${g.ans.pts} points${g.ans.side ? '' : ' · mauvais côté'}`),
            h('button', { class: 'btn-fire small-btn', onclick: wrNext }, g.i + 1 >= WRN ? 'Voir mon rang ▶' : 'Matchup suivant ▶'))
            : [h('small', { class: 'muted' }, 'Ajuste ton estimation, puis confirme. Clavier : flèches puis Entrée.'), h('button', { class: 'btn-fire small-btn wr-ok', onclick: wrConfirm }, 'Confirmer l’estimation')]),
        h('div', { class: 'wr-champ' }, splash(m.b), h('b', null, B))),
      h('p', { class: 'muted small' }, `${(m.games || 0).toLocaleString('fr-FR')} parties classées · ${m.elo ? m.elo.replace('EMERALD+', 'Émeraude+') : 'Émeraude+'} · stats LoLalytics du patch.`))];
  }

  function jeuxHome() {
    const card = ([k, l], learn) => {
      const m = String(l).match(/^(\S+)\s+(.*)$/) || [null, '🎮', l];
      return h('button', { class: 'jg-card' + (learn ? ' learn' : ''), onclick: () => { J.home = false; J.tab = k; render(); window.scrollTo(0, 0); } },
        h('span', { class: 'jg-ico' }, m[1]), h('span', { class: 'jg-txt' }, h('b', null, m[2], newsFresh('jeux').includes('f:' + k) ? h('span', { class: 'new-tag' }, 'Nouveau') : null), h('small', { class: 'muted' }, JDESC[k] || ''),
          QMODES.some(([q]) => q === k) && qBest()[k] ? h('small', { class: 'jg-rec', style: `color:${qRank(qBest()[k].ok)[1]}` }, `🏆 Record : ${qRank(qBest()[k].ok)[0]} (${qBest()[k].ok}/${QN})`) : null),
        h('span', { class: 'jg-go' }, 'Jouer'));
    };
    return [
      h('h2', { class: 'hub-sec' }, h('span', null, '🧠 Quiz de connaissances'), h('small', { class: 'muted' }, '10 questions, un rang de Fer à Challenger')),
      h('div', { class: 'jg-grid' }, QMODES.map((x) => card(x, false))),
      h('h2', { class: 'hub-sec' }, h('span', null, '📊 Les stats'), h('small', { class: 'muted' }, 'le vrai taux de victoire des matchups')),
      h('div', { class: 'jg-grid' }, [['wr', '📊 Qui a le meilleur winrate ?']].map((x) => card(x, false))),
      h('h2', { class: 'hub-sec' }, h('span', null, '🎮 Deviner le champion'), h('small', { class: 'muted' }, 'autant de parties que tu veux')),
      h('div', { class: 'jg-grid' }, JMODES.map((x) => card(x, false))),
      ...(SUB() ? [] : [h('h2', { class: 'hub-sec' }, h('span', null, '🎓 Apprendre en jouant'), h('small', { class: 'muted' }, 'des situations de vraies parties')),
        h('div', { class: 'jg-grid' }, LMODES.map((x) => card(x, true)))]),
    ];
  }
  function renderJeux() {
    const view = $('view');
    const cur = JMODES.concat(LMODES, QMODES, [['wr', '📊 Qui a le meilleur winrate ?']]).find(([k]) => k === J.tab);
    const nodes = [h('header', { class: 'sec-hero' + (J.home ? '' : ' compact') }, h('div', { class: 'sec-ico' }, '🎮'),
      h('div', null, h('h1', { class: 'title' }, 'Détente'), J.home ? h('p', { class: 'muted' }, 'Des jeux rapides pour se détendre entre deux games, et d’autres pour progresser en jouant.') : null))];
    if (J.home) { nodes.push(...jeuxHome()); view.replaceChildren(...nodes); return; }
    nodes.push(h('div', { class: 'row jg-bar' }, h('button', { class: 'btn-ghost', onclick: () => { J.home = true; render(); window.scrollTo(0, 0); } }, '← Tous les jeux'),
      cur ? h('b', { class: 'jg-cur' }, cur[1]) : null));
    if (false) nodes.push(h('div', { class: 'chips jeu-tabs' }, h('span', { class: 'jt-label' }, '🎮 Deviner le champion'), JMODES.map(([k, l]) => h('button', { class: 'chip', 'aria-pressed': String(J.tab === k), onclick: () => { J.tab = k; J.msg = ''; render(); } }, l))));
    if (false) nodes.push(h('div', { class: 'chips jeu-tabs learn' }, h('span', { class: 'jt-label' }, '🎓 Apprendre en jouant'), LMODES.map(([k, l]) => h('button', { class: 'chip', 'aria-pressed': String(J.tab === k), onclick: () => { J.tab = k; J.msg = ''; render(); } }, l))));
    if (SUB() && LMODES.some(([k]) => k === J.tab)) { J.home = true; render(); return; }
    if (J.tab === 'wr') { nodes.push(...renderWrGame()); view.replaceChildren(...nodes); return; }
    if (LMODES.some(([k]) => k === J.tab)) { nodes.push(...renderLearn(J.tab)); view.replaceChildren(...nodes); return; }
    if (!J.data) {
      nodes.push(h('div', { class: 'card' }, J.loading || !J.err ? h('p', { class: 'muted' }, 'Chargement des champions…') : h('p', { class: 'bad' }, '⚠ ' + J.err, ' ', h('button', { class: 'btn-ghost', onclick: () => { J.err = ''; loadJeux(); render(); } }, 'Réessayer'))));
      view.replaceChildren(...nodes);
      if (!J.loading && !J.err) loadJeux();
      return;
    }
    if (J.tab === 'lore') { nodes.push(...renderLore()); view.replaceChildren(...nodes); return; }
    if (QMODES.some(([k]) => k === J.tab)) { nodes.push(...renderQuiz(J.tab)); view.replaceChildren(...nodes); return; }
    // League of Listen : le vrai jeu (sons de chaque sort Q W E R, site lynge.tv) intégré dans l'app,
    // ou notre version avec les bruitages de l'écran de sélection.
    if (J.tab === 'listen') {
      const src = load('fire.listen.src', 'site');
      const pickSrc = (v) => { save('fire.listen.src', v); render(); };
      nodes.push(h('div', { class: 'chips ll-src' },
        h('button', { class: 'chip', 'aria-pressed': String(src === 'site'), onclick: () => pickSrc('site') }, '🎧 League of Listen : sons de chaque sort (Q W E R)'),
        h('button', { class: 'chip', 'aria-pressed': String(src !== 'site'), onclick: () => pickSrc('fire') }, '🔊 Version FIRE : bruitages de sélection')));
      if (src === 'site') {
        nodes.push(h('div', { class: 'card ll-site' },
          h('iframe', { class: 'll-iframe', src: 'https://lynge.tv/listen/', title: 'League of Listen', allow: 'autoplay; fullscreen' }),
          h('p', { class: 'muted small' }, 'Clique dans le jeu puis appuie sur Q, W, E ou R (ou clique sur un sort) pour écouter. Jeu fan-made par ',
            h('a', { href: 'https://lynge.tv/listen/', target: '_blank' }, 'lynge.tv'), ', intégré tel quel dans FIRE.')));
        view.replaceChildren(...nodes); return;
      }
    }
    const mode = J.tab;
    if (!J.r[mode]) { jNew(mode); }
    const r = J.r[mode];
    const st = jstats()[mode];
    if (st && st.wins) nodes.push(h('p', { class: 'muted small jeu-stats' }, `🏆 ${st.wins} trouvé${st.wins > 1 ? 's' : ''} · ${(st.tries / st.wins).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} essais en moyenne · 🔥 série : ${st.streak} (record ${st.best})`));
    if (!r) { view.replaceChildren(...nodes); return; }
    const wrong = r.guesses.filter((g) => g.id !== r.target.id).length;
    const t = r.target;
    // L'indice
    let clue = null;
    if (mode === 'classique') clue = h('div', { class: 'card jeu-clue' }, h('h3', null, 'Devine le champion du jour… enfin, de maintenant !'),
      h('p', { class: 'muted' }, 'Propose un champion : chaque case te dit si tu chauffes. 🟩 pareil · 🟧 en partie · 🟥 différent · ↑↓ plus récent ou plus ancien.'));
    if (mode === 'sort') {
      const blur = r.done ? 0 : Math.max(0, 8 - 2 * wrong);
      clue = h('div', { class: 'card jeu-clue' }, h('h3', null, 'À quel champion appartient ce sort ?'),
        h('img', { class: 'jeu-ico', src: jimg('spell', r.spell.img), alt: '', style: `transform:rotate(${r.done || wrong >= 2 ? 0 : r.rot}deg);filter:grayscale(${r.done || wrong >= 4 ? 0 : 1}) blur(${blur}px)` }),
        h('p', { class: 'muted small' }, r.done ? `${r.spell.name} (${r.spell.key})` : wrong >= 2 ? 'Remis à l’endroit.' : 'Tourné, en noir et blanc : il s’éclaircit à chaque essai.'));
    }
    if (mode === 'listen') {
      const hard = load('fire.listen.diff', 'facile') === 'difficile';
      const CLIP = 1.6;
      // Joue le son ; en difficile, seulement un court extrait (≈ un seul sort), toujours le même pour la manche.
      const play = (src, btn, label, clip) => {
        if (J.audio) { try { J.audio.pause(); } catch (e) { /* rien */ } }
        clearTimeout(J.audioStop);
        if (!J.audio || J.audio.dataset.src !== src) { J.audio = new Audio(src); J.audio.dataset.src = src; J.audio.volume = 0.8; }
        const a = J.audio;
        const go = () => {
          a.currentTime = clip ? Math.max(0, r.cut * Math.max(0, (a.duration || 4) - CLIP)) : 0;
          btn.classList.add('playing');
          a.onended = () => btn.classList.remove('playing');
          a.play().then(() => {
            btn.querySelector('.ll-l').textContent = label;
            if (clip) J.audioStop = setTimeout(() => { a.pause(); btn.classList.remove('playing'); }, CLIP * 1000);
          }).catch(() => { btn.classList.remove('playing'); btn.querySelector('.ll-l').textContent = '⚠ Son indisponible'; });
        };
        if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true });
        if (a.readyState < 1) a.load();
      };
      const voiceAt = hard ? 5 : 3;
      const voiceOk = wrong >= voiceAt || r.done;
      const clip = hard && !r.done;
      const setDiff = (d) => { save('fire.listen.diff', d); jNew('listen'); };
      clue = h('div', { class: 'card jeu-clue' }, h('h3', null, '🎧 League of Listen : à quel champion appartiennent ces bruitages ?'),
        h('div', { class: 'chips ll-diff' },
          h('button', { class: 'chip', 'aria-pressed': String(!hard), onclick: () => setDiff('facile') }, '😊 Facile : tous les bruitages'),
          h('button', { class: 'chip', 'aria-pressed': String(hard), onclick: () => setDiff('difficile') }, '😈 Difficile : un seul sort')),
        h('div', { class: 'll-row' },
          h('button', { class: 'll-btn', onclick: (e) => play(r.sfx, e.currentTarget, clip ? 'Réécouter l’extrait' : 'Réécouter les bruitages', clip) }, h('span', { class: 'll-ico' }, '▶'), h('span', { class: 'll-l' }, clip ? 'Écouter l’extrait' : 'Écouter les bruitages')),
          voiceOk ? h('button', { class: 'll-btn voice', onclick: (e) => play(r.vo, e.currentTarget, 'Réécouter sa voix', false) }, h('span', { class: 'll-ico' }, '🗣️'), h('span', { class: 'll-l' }, 'Indice : sa voix')) : null),
        h('p', { class: 'muted small' }, r.done ? `${t.name} · les bruitages de son écran de sélection${hard ? ' (tu peux maintenant tout écouter)' : ''}.`
          : voiceOk ? 'Indice débloqué : écoute sa voix.'
          : `${hard ? 'Un extrait d’1,6 s, à peu près un seul sort.' : 'Ses sorts et ses attaques, sans un mot.'} Sa voix se débloque après ${voiceAt} essais ratés (encore ${voiceAt - wrong}).`));
    }
    if (mode === 'emoji') {
      // 2 emojis au départ, 1 de plus après 2 puis 4 essais ratés.
      const n = r.done ? 4 : Math.min(4, 2 + (wrong >= 2 ? 1 : 0) + (wrong >= 4 ? 1 : 0));
      clue = h('div', { class: 'card jeu-clue' }, h('h3', null, 'Quel champion se cache derrière ces emojis ?'),
        h('div', { class: 'jeu-emo' }, (r.emo || []).map((e, i) => h('span', { class: i < n ? 'on' : 'off' }, i < n ? e : '❔'))),
        h('p', { class: 'muted small' }, r.done ? 'Tous les emojis sont révélés.' : n < 4 ? `Un emoji de plus après ${n === 2 ? 2 : 4} essais ratés (encore ${(n === 2 ? 2 : 4) - wrong}).` : 'Tous les emojis sont là !'));
    }
    if (mode === 'ombre') {
      // Le champion sort de l'ombre : très sombre au début, il s'éclaire à chaque essai.
      const L = [[0.2, 1.3, 1], [0.26, 1.25, 1], [0.34, 1.2, 1], [0.44, 1.15, 1], [0.58, 1.1, 0.6], [0.75, 1.05, 0.3], [0.9, 1, 0]];
      const [br, ct, gs] = r.done ? [1, 1, 0] : L[Math.min(wrong, L.length - 1)];
      clue = h('div', { class: 'card jeu-clue' }, h('h3', null, 'Qui sort de l’ombre ?'),
        h('div', { class: 'jeu-ombre' }, h('img', { src: `${DD}/cdn/img/champion/loading/${t.id}_${r.skin ? r.skin.num : 0}.jpg`, alt: '',
          style: `filter:grayscale(${gs}) brightness(${br}) contrast(${ct})`, onerror: (e) => { if (r.skin && r.skin.num) { r.skin = { num: 0 }; e.target.src = `${DD}/cdn/img/champion/loading/${t.id}_0.jpg`; } } })),
        h('p', { class: 'muted small' }, r.done ? (r.skin && r.skin.name ? r.skin.name : t.name) : 'Il s’éclaire un peu plus à chaque essai.'));
    }
    if (mode === 'passif') {
      const blur = r.done ? 0 : Math.max(0, 14 - 3 * wrong);
      clue = h('div', { class: 'card jeu-clue' }, h('h3', null, 'À quel champion appartient ce passif ?'),
        h('img', { class: 'jeu-ico', src: jimg('passive', t.passive.img), alt: '', style: `filter:blur(${blur}px)` }),
        h('p', { class: 'muted small' }, r.done || wrong >= 4 ? `Passif : ${t.passive.name}` : `Le nom du passif apparaît après 4 essais (encore ${4 - wrong}).`));
    }
    if (mode === 'phrase') clue = h('div', { class: 'card jeu-clue' }, h('h3', null, r.fromBio ? 'Qui est décrit ici ?' : 'Qui a dit ça ?'),
      r.wait ? h('p', { class: 'muted' }, 'Chargement…') : h('blockquote', { class: 'jeu-quote' }, '« ', r.quote, ' »'),
      r.vo && !r.noVo && !(wrong >= 3 || r.done) ? h('p', { class: 'muted small jeu-vo-lock' }, `🔒 La voix du champion se débloque après 3 essais ratés (encore ${3 - wrong}), ou quand tu as trouvé.`) : null,
      r.vo && !r.noVo && (wrong >= 3 || r.done) ? h('div', { class: 'jeu-vo' },
        h('button', { class: 'btn-fire small-btn', onclick: (e) => {
          const b = e.currentTarget;
          if (!J.audio || J.audio.dataset.src !== r.vo) { J.audio = new Audio(r.vo); J.audio.dataset.src = r.vo; J.audio.volume = 0.8; J.audio.onerror = () => { r.noVo = true; render(); }; }
          J.audio.currentTime = 0;
          J.audio.play().then(() => { b.textContent = '🔊 Réécouter sa voix'; }).catch(() => { r.noVo = true; render(); });
        } }, '🔊 Écouter sa voix'),
        h('span', { class: 'muted small' }, 'La voix du champion dit cette phrase.')) : null,
      // Plus d'indice écrit (titre, région) : la voix débloquée après 3 essais suffit. Le titre s'affiche une fois trouvé.
      r.done ? h('p', { class: 'muted small' }, `« ${t.title} » · ${t.region || 'région inconnue'}`) : null);
    if (mode === 'splash') {
      // Position du champion moins sûre : on part d'un zoom plus large.
      const z0 = r.skin.c != null && r.skin.c < 0.6 ? 3.2 : 5;
      const sc = r.done ? 1 : Math.max(1.4, z0 - 0.6 * wrong);
      clue = h('div', { class: 'card jeu-clue' }, h('h3', null, 'À quel champion appartient ce skin ?'),
        h('div', { class: 'jeu-splash' }, h('div', { class: 'jeu-flip', style: r.done || !r.flip ? '' : 'transform:rotate(180deg)' }, h('img', { src: jsplash(t, r.skin.num), alt: '', style: splashZoom(sc, r.ox, r.oy) + `;filter:blur(${r.done ? 0 : [6, 4.5, 3.2, 2.2, 1.4, 0.8, 0.4][wrong] || 0}px)`, onerror: () => { if (!r.done && !r.badImg) { r.badImg = true; jNew('splash'); } } }))),
        h('p', { class: 'muted small' }, r.done ? r.skin.name : 'Flou, zoomé et à l’envers : ça devient net et ça dézoome à chaque essai. L’image se remet à l’endroit quand tu trouves.'));
    }
    nodes.push(clue);
    // Saisie
    if (!r.done) {
      const inp = h('input', { id: 'jeu-in', class: 'inp jeu-in', list: 'jeu-list', placeholder: 'Nom du champion…', autocomplete: 'off' });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); jGuess(mode, inp.value); } });
      const dl = h('datalist', { id: 'jeu-list' }, J.data.champs.filter((c) => !r.guesses.some((g) => g.id === c.id)).map((c) => h('option', { value: c.name })));
      nodes.push(h('div', { class: 'row jeu-row' }, inp, dl, h('button', { class: 'btn-fire small-btn', onclick: () => jGuess(mode, inp.value) }, 'Valider'),
        h('button', { class: 'btn-ghost', onclick: () => jGiveUp(mode) }, 'Je donne ma langue au chat'), J.msg ? h('span', { class: 'bad small' }, J.msg) : null));
      later(() => { if (S.section === 'jeux' && document.activeElement === document.body) inp.focus(); });
    } else {
      const bonus = mode === 'sort' && !r.gaveUp ? h('div', { class: 'jeu-bonus' }, h('span', null, '⭐ Bonus : c’était quelle touche ?'),
        'QWER'.split('').map((k) => h('button', { class: 'chip' + (r.bonus ? (k === r.spell.key ? ' ok' : k === r.bonus ? ' ko' : '') : ''), disabled: r.bonus ? true : null, onclick: () => { r.bonus = k; render(); } }, k)),
        r.bonus ? h('b', { class: r.bonus === r.spell.key ? 'good' : 'bad' }, r.bonus === r.spell.key ? ' Bien vu !' : ` Raté, c’était ${r.spell.key}.`) : null) : null;
      nodes.push(h('div', { class: 'card jeu-win ' + (r.gaveUp ? 'lost' : 'won') },
        h('img', { class: 'jeu-sq', src: jsq(t), alt: '' }),
        h('div', null, h('h3', null, r.gaveUp ? `C’était ${t.name}` : `🎉 Bravo ! C’était ${t.name}`), h('p', { class: 'muted' }, t.title + (r.gaveUp ? '' : ` · trouvé en ${r.guesses.length} essai${r.guesses.length > 1 ? 's' : ''}`)), bonus),
        h('div', { class: 'jeu-win-btns' }, h('button', { class: 'btn-fire small-btn', onclick: () => jNew(mode) }, '▶ Champion suivant'),
          h('button', { class: 'btn-ghost', onclick: () => { J.tab = 'lore'; J.loreSel = t.id; render(); } }, '📖 Son lore'))));
    }
    // Essais
    if (mode === 'classique') nodes.push(jClassicTable(r));
    else if (r.guesses.length) nodes.push(h('div', { class: 'jeu-guesses' }, r.guesses.slice().reverse().map((g) => h('span', { class: 'jeu-g ' + (g.id === t.id ? 'ok' : 'ko') }, h('img', { src: jsq(g), alt: '' }), g.name))));
    view.replaceChildren(...nodes);
  }

  function jClassicTable(r) {
    const t = r.target;
    const lt = J.lore[t.id] || { races: [] };
    const setCmp = (a, b) => { const A = new Set(a), B = new Set(b); if (A.size === B.size && [...A].every((x) => B.has(x))) return 'ok'; return [...A].some((x) => B.has(x)) ? 'mid' : 'ko'; };
    const cell = (cls, txt) => h('div', { class: 'jc ' + cls }, txt);
    const head = h('div', { class: 'jc-row jc-head' }, ['Champion', 'Lane', 'Classes', 'Ressource', 'Portée', 'Région', 'Sortie'].map((x) => h('div', { class: 'jc' }, x)));
    const rows = r.guesses.slice().reverse().map((g) => {
      const lg = J.lore[g.id] || { races: [] };
      const yc = g.year && t.year ? (g.year === t.year ? 'ok' : 'ko') : 'ko';
      const arrow = g.year && t.year && g.year !== t.year ? (t.year > g.year ? ' ↑' : ' ↓') : '';
      return h('div', { class: 'jc-row' },
        h('div', { class: 'jc jc-champ ' + (g.id === t.id ? 'ok' : '') }, h('img', { src: jsq(g), alt: '' }), h('span', null, g.name)),
        cell((g.lanes || []).length || (t.lanes || []).length ? setCmp(g.lanes || [], t.lanes || []) : 'ko', (g.lanes || []).join(', ') || '—'),
        cell(setCmp(g.tags, t.tags), g.tags.map((x) => TAGFR[x] || x).join(', ')),
        cell(g.partype === t.partype ? 'ok' : 'ko', g.partype || '—'),
        cell(g.range === t.range ? 'ok' : 'ko', g.range),
        cell((g.region || '?') === (t.region || '?') ? 'ok' : 'ko', g.region || '—'),
        cell(yc, (g.year || '—') + arrow));
    });
    return h('div', { class: 'jc-table' }, r.guesses.length ? [head, ...rows] : null);
  }

  function renderLore() {
    const cs = J.data.champs;
    if (J.loreSel) {
      const c = cs.find((x) => x.id === J.loreSel);
      if (c) {
        const l = J.lore[c.id];
        if (!l) jLore(c).then(() => { if (S.section === 'jeux' && J.tab === 'lore') render(); });
        const text = l && l.ok && l.full ? l.full : c.lore;
        return [h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => { J.loreSel = null; render(); } }, '← Tous les champions')),
          h('div', { class: 'card lore-card' },
            h('div', { class: 'lore-hero', style: `background-image:url('${jsplash(c, 0)}')` },
              h('div', { class: 'lore-hero-in' }, h('h2', null, c.name), h('p', null, cap(c.title)),
                h('div', { class: 'lore-tags' }, [c.region, c.year ? `Sorti en ${c.year}` : null, ...c.tags.map((x) => TAGFR[x] || x), ...((l && l.races) || [])].filter(Boolean).map((x) => h('span', { class: 'tag' }, x))))),
            c.regionSlug && JREG[c.regionSlug] ? h('div', { class: 'lore-mini' },
              h('div', null, h('b', null, `${JREG[c.regionSlug].ico} ${c.region}`), h('p', { class: 'muted small' }, 'Sa région : retrouve-la sur la carte officielle de Runeterra, en haut de l’onglet Lore.'),
                h('button', { class: 'btn-ghost', onclick: () => { J.loreSel = null; J.loreReg = c.regionSlug; render(); window.scrollTo(0, 0); } }, 'Voir la région et ses champions →'))) : null,
            l && l.quote ? h('blockquote', { class: 'jeu-quote' }, '« ', l.quote, ' »', l.quoteAuthor ? h('span', { class: 'muted small' }, ' — ' + l.quoteAuthor) : null) : null,
            !l ? h('p', { class: 'muted small' }, 'Chargement de la biographie complète…') : null,
            h('div', { class: 'lore-text' }, String(text || '').split(/\n\n+/).map((p) => h('p', null, p))),
            h('div', { class: 'lore-abil' }, h('h3', null, 'Ses compétences'),
              h('div', { class: 'lore-sp' }, h('img', { src: jimg('passive', c.passive.img), alt: '' }), h('div', null, h('b', null, 'Passif · ' + c.passive.name), h('p', { class: 'muted small' }, c.passive.desc))),
              c.spells.map((sp) => h('div', { class: 'lore-sp' }, h('img', { src: jimg('spell', sp.img), alt: '' }), h('div', null, h('b', null, `${sp.key} · ${sp.name}`))))))];
      }
    }
    const facs = J.data.factions || [];
    const inp = h('input', { class: 'inp', id: 'lore-q', placeholder: 'Chercher un champion…', value: J.loreQ });
    const match = (c) => (!J.loreReg || c.regionSlug === J.loreReg) && (!jn(J.loreQ) || jn(c.name).includes(jn(J.loreQ)) || jn(c.title).includes(jn(J.loreQ)));
    const loreCards = () => cs.filter(match).map((c) => h('button', { class: 'lore-c', onclick: () => { J.loreSel = c.id; render(); window.scrollTo(0, 0); } }, h('img', { src: jsq(c), alt: '' }), h('b', null, c.name), h('span', { class: 'muted small' }, cap(c.title))));
    // Seules ces zones se redessinent : la carte (iframe) n'est jamais rechargée quand on change de région ou qu'on cherche.
    const regionBox = h('div'), chipsBox = h('div', { class: 'chips' }), grid = h('div', { class: 'lore-grid', id: 'lore-grid' }), count = h('span', { class: 'muted small' });
    const refresh = () => {
      const fac = facs.find((f) => f.slug === J.loreReg);
      regionBox.replaceChildren(...(fac ? [h('div', { class: 'card lore-region', id: 'lore-region' },
        fac.img ? h('div', { class: 'lore-hero small', style: `background-image:url('${fac.img}')` }, h('div', { class: 'lore-hero-in' }, h('h2', null, (JREG[fac.slug] || {}).ico || '', ' ', fac.name), h('p', null, `${cs.filter((c) => c.regionSlug === fac.slug).length} champions`))) : h('h2', null, fac.name),
        fac.desc ? h('p', { class: 'lore-text' }, fac.desc) : null,
        h('div', { class: 'row', style: 'padding:0 24px 16px' }, h('button', { class: 'btn-ghost', onclick: () => pickReg('') }, '✕ Toutes les régions')))] : []));
      chipsBox.replaceChildren(h('button', { class: 'chip', 'aria-pressed': String(!J.loreReg), onclick: () => pickReg('') }, 'Toutes les régions'),
        ...facs.slice().sort((x, y) => x.name.localeCompare(y.name, 'fr')).map((f) => h('button', { class: 'chip', 'aria-pressed': String(J.loreReg === f.slug), onclick: () => pickReg(J.loreReg === f.slug ? '' : f.slug) }, `${(JREG[f.slug] || {}).ico || ''} ${f.name}`)));
      grid.replaceChildren(...loreCards());
      count.textContent = `${cs.filter(match).length} champions`;
    };
    const pickReg = (slug) => { J.loreReg = slug; refresh(); if (slug) later(() => regionBox.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
    inp.addEventListener('input', () => { J.loreQ = inp.value; grid.replaceChildren(...loreCards()); count.textContent = `${cs.filter(match).length} champions`; });
    const fb = h('button', { class: 'btn-ghost' }, J.mapFull ? '✕ Fermer le plein écran' : '⛶ Plein écran');
    const card = h('div', { class: 'card lore-mapcard' + (J.mapFull ? ' full' : '') },
      h('div', { class: 'lore-maphead' }, h('h3', null, '🗺️ La carte de Runeterra'), h('span', { class: 'muted small' }, 'La carte interactive officielle de Riot : zoome, survole les régions, clique sur les champions.'),
        fb, h('a', { class: 'btn-ghost', href: 'https://map.leagueoflegends.com/fr_FR/', target: '_blank' }, 'Ouvrir dans le navigateur ↗')),
      h('iframe', { class: 'lore-iframe', src: 'https://map.leagueoflegends.com/fr_FR/', title: 'Carte de Runeterra', allow: 'fullscreen; autoplay', allowfullscreen: true }));
    fb.addEventListener('click', () => { J.mapFull = !J.mapFull; card.classList.toggle('full', J.mapFull); fb.textContent = J.mapFull ? '✕ Fermer le plein écran' : '⛶ Plein écran'; });
    refresh();
    return [card, regionBox, h('div', { class: 'row' }, inp, count), chipsBox, grid];
  }

  // Carte simplifiée de Runeterra (positions des régions comme sur la carte officielle).
  const JREG = {
    freljord: { x: 380, y: 92, c: '#8fd3f4', ico: '❄️' }, demacia: { x: 215, y: 245, c: '#e8d48b', ico: '🛡️' },
    noxus: { x: 505, y: 225, c: '#e0574a', ico: '⚔️' }, ionia: { x: 860, y: 215, c: '#f29cc0', ico: '🌸' },
    piltover: { x: 625, y: 338, c: '#f0b04a', ico: '⚙️' }, zaun: { x: 590, y: 372, c: '#6fd07a', ico: '🧪' },
    'mount-targon': { x: 205, y: 445, c: '#a8a8ff', ico: '⛰️' }, shurima: { x: 420, y: 500, c: '#f2c45a', ico: '☀️' },
    ixtal: { x: 670, y: 450, c: '#45c08a', ico: '🌿' }, 'bandle-city': { x: 725, y: 360, c: '#c9a0f0', ico: '🍄' },
    bilgewater: { x: 815, y: 462, c: '#5ab8dd', ico: '🏴‍☠️' }, 'shadow-isles': { x: 925, y: 552, c: '#45e0b5', ico: '👻' },
    void: { x: 630, y: 566, c: '#b066e0', ico: '🌀' }
  };
  function jMap(sel, onPick, small) {
    const names = {};
    (J.data.factions || []).forEach((f) => { names[f.slug] = f.name; });
    const land = 'fill="#2b3a2e" stroke="#5d7a5f" stroke-width="2"';
    const pins = Object.entries(JREG).map(([k, r]) => {
      const on = sel === k, dim = sel && !on;
      return `<g class="jm-reg${on ? ' on' : ''}" data-reg="${k}" style="cursor:pointer;opacity:${dim ? 0.45 : 1}">
        <circle cx="${r.x}" cy="${r.y}" r="${on ? 62 : 46}" fill="${r.c}" fill-opacity="${on ? 0.38 : 0.2}" stroke="${r.c}" stroke-opacity=".7" stroke-width="${on ? 3 : 1.5}"${k === 'bandle-city' ? ' stroke-dasharray="6 5"' : ''}/>
        <circle cx="${r.x}" cy="${r.y}" r="${on ? 9 : 6}" fill="${r.c}" stroke="#0c0a09" stroke-width="2"/>
        ${small && !on ? '' : `<text x="${r.x}" y="${r.y + (on ? 30 : 24)}" text-anchor="middle" font-size="${on ? 22 : 17}" font-weight="700" fill="#f5ede6" stroke="#0c0a09" stroke-width="4" paint-order="stroke">${(names[k] || k).replace(/&/g, '&amp;')}</text>`}
      </g>`;
    }).join('');
    const svg = `<svg viewBox="0 0 1000 620" class="jm${small ? ' small' : ''}" role="img" aria-label="Carte de Runeterra">
      <defs><radialGradient id="jmsea" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#16324a"/><stop offset="1" stop-color="#081422"/></radialGradient></defs>
      <rect width="1000" height="620" fill="url(#jmsea)" rx="18"/>
      <path ${land} d="M120,62 C250,22 600,20 705,72 C765,112 712,168 662,192 C705,252 690,330 648,382 C600,402 520,398 480,384 C400,392 300,372 220,344 C150,322 108,252 128,192 C98,142 90,92 120,62 Z"/>
      <path ${land} d="M150,404 C222,384 420,398 520,412 C620,404 702,404 724,444 C744,502 694,562 622,592 C500,612 330,602 240,572 C170,542 128,472 150,404 Z"/>
      <path ${land} d="M772,142 C822,112 902,122 932,172 C952,232 922,302 862,312 C812,302 772,262 762,212 C757,182 762,157 772,142 Z"/>
      <ellipse ${land} cx="808" cy="462" rx="44" ry="24"/><ellipse ${land} cx="862" cy="488" rx="18" ry="11"/><ellipse ${land} cx="770" cy="490" rx="16" ry="10"/>
      <ellipse fill="#1f3a33" stroke="#3b7d6a" stroke-width="2" cx="925" cy="552" rx="40" ry="22"/><ellipse fill="#1f3a33" stroke="#3b7d6a" stroke-width="2" cx="965" cy="520" rx="14" ry="9"/>
      <path d="M170,398 C300,388 470,398 640,396" stroke="#8b8b7a" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round" fill="none"/>
      <text x="420" y="412" text-anchor="middle" font-size="12" fill="#b9b2a2" font-style="italic">la Grande Barrière</text>
      <text x="745" y="120" font-size="13" fill="#6d8aa3" font-style="italic">Mer des Gardiens</text>
      ${pins}</svg>`;
    const box = h('div', { class: 'jm-box' });
    box.innerHTML = svg;
    box.querySelectorAll('[data-reg]').forEach((g) => g.addEventListener('click', () => onPick(g.getAttribute('data-reg'))));
    return box;
  }

  // ----- Planning : le coach coche les jours / heures, les joueurs répondent -----
  const PLAN_ST = { present: { ico: '✅', txt: 'Présent', cls: 'st-ok' }, incertain: { ico: '❔', txt: 'Incertain', cls: 'st-warn' }, absent: { ico: '❌', txt: 'Absent', cls: 'st-bad' } };
  const PLAN_TYPES = [['flex', '🔁 Flex'], ['5c5', '🏆 5c5'], ['scrim', '⚔️ Scrim'], ['review', '🎥 Review'], ['autre', '📌 Autre']];
  // Toutes les heures, de 0h à 23h (un coach peut être dispo à 3h du matin). La grille défile et s'ouvre sur 10h.
  const PLAN_HOURS = Array.from({ length: 24 }, (_, i) => i);
  const ymdL = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dOf = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const mondayOf = (ymd) => { const d = dOf(ymd); return addDays(ymd, -((d.getDay() + 6) % 7)); };
  const weekDays = (mon) => [0, 1, 2, 3, 4, 5, 6].map((k) => addDays(mon, k));
  const dayFr = (ymd, o) => dOf(ymd).toLocaleDateString('fr-FR', o || { weekday: 'long', day: 'numeric', month: 'long' });
  const planCanWrite = () => S.planWrite || (S.coachState.coach && S.coachState.github);
  // Accès chef d'équipe : visible seulement pour le joueur qui a le bandeau de chef (et sur le PC où il a mis son code).
  function chefAccess() {
    const me = S.players.find((p) => p.slug === S.moi);
    if (S.coachState.coach || !me || !me.capitaine) return null;
    if (S.coachState.chef) {
      return h('p', { class: 'muted small chef-on' }, '👑 Mode chef d’équipe : tu peux modifier le planning. ',
        h('button', { class: 'linkbtn', onclick: async () => { S.coachState = await window.fire.coach.chefLeave(); render(); } }, 'Quitter le mode chef'));
    }
    const inp = h('input', { class: 'inp', type: 'password', placeholder: 'Code chef d’équipe', autocomplete: 'off', style: 'max-width:240px' });
    const err = h('span', { class: 'bad small' });
    const goChef = async () => {
      const r = await window.fire.coach.chefUnlock(inp.value);
      if (r && r.ok) { S.coachState = r; S.flash = '👑 Mode chef d’équipe activé : tu peux modifier le planning.'; render(); } else { err.textContent = 'Code incorrect.'; inp.select(); }
    };
    inp.addEventListener('keydown', (e) => { err.textContent = ''; if (e.key === 'Enter') goChef(); });
    return h('details', { class: 'coach-access' }, h('summary', null, '👑 Je suis le chef d’équipe : modifier le planning'),
      h('div', { class: 'row' }, inp, h('button', { class: 'btn-ghost', onclick: goChef }, 'Activer'), err));
  }

  // Heures cochées → plages lisibles : [20,21,22] → « 20h – 23h ».
  function hourBlocks(hs) {
    const out = [];
    for (const x of (hs || []).slice().sort((a, b) => a - b)) {
      const last = out[out.length - 1];
      if (last && last[1] === x) last[1] = x + 1; else out.push([x, x + 1]);
    }
    return out.map(([a, b]) => `${a}h – ${b === 24 ? '0h' : b + 'h'}`).join(' · ');
  }

  async function loadPlanning() {
    if (SUB()) { const b = load('fire.remp', null); S.plan = planFrom((b && b.planning) || {}); renderNav(); if (S.section === 'planning' && !typing()) render(); return; }
    let r;
    try { r = await window.fire.planning(); } catch (e) { r = { ok: false, error: String(e) }; }
    if (r && r.ok) { S.plan = planFrom(r); S.planErr = r.offline ? 'Hors ligne : dernier planning enregistré.' : ''; if (!r.offline) { notifPlanning(false); notifResas(false); } }
    else { S.plan = S.plan || planFrom({}); S.planErr = (r && r.error) || 'planning indisponible'; }
    S.planWrite = !!(r && r.peutEcrire);
    renderNav();
    if (typing() || S.planEdit) return;
    if (S.section === 'planning') render();
  }

  // Jours à venir (14 jours) où je n'ai pas encore répondu : pastille dans le menu (+ demandes de créneaux à traiter pour un coach).
  function planTodo() {
    if (!S.plan || SUB()) return 0;
    const t = todayYmd(), lim = addDays(t, 14);
    const team = S.moi && !isCoachUser() ? Object.keys(S.plan.jours).filter((d) => d >= t && d <= lim && !((S.plan.reponses[d] || {})[S.moi])).length : 0;
    return team + coachPending();
  }
  function coachPending() { return S.coachState.coach ? resaList().filter((x) => x.st === 'attente').length : 0; }
  function planFrom(r) { return { jours: r.jours || {}, reponses: r.reponses || {}, coachs: r.coachs || {}, resas: r.resas || {} }; }

  async function answer(date, slug, statut) {
    const rep = (S.plan.reponses[date] = S.plan.reponses[date] || {});
    const before = rep[slug];
    if (statut) rep[slug] = { statut, at: Date.now() }; else delete rep[slug];
    render();
    actLog('plan', `Planning : ${statut} le ${date}`);
    const r = await window.fire.savePlanning({ type: 'reponse', date, slug, statut });
    if (r && r.ok) S.plan = planFrom(r);
    else { if (before) rep[slug] = before; else delete rep[slug]; S.flash = 'Réponse non enregistrée : ' + ((r && r.error) || 'erreur'); }
    if (!S.planEdit && S.section === 'planning') render(); else renderNav();
  }

  function renderPlanning() {
    const view = $('view');
    if (SUB()) { renderPlanningSub(view); return; }
    if (S.planEdit) { renderPlanEditor(view); return; }
    const t = todayYmd();
    const mon = S.planWeek || mondayOf(t);
    S.planWeek = mon;
    const days = weekDays(mon);
    // Le coach et le chef d'équipe (code chef activé sur ce PC) peuvent modifier le planning.
    const coach = S.coachState.coach || S.coachState.chef;
    const roster = S.players.filter((x) => x.slug);
    const tabC = S.planTab === 'coachs';
    const pend = coachPending();
    const nodes = [h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, tabC ? '🎓' : '🗓️'),
      h('div', null, h('h1', { class: 'title' }, 'Planning'),
        h('p', { class: 'muted' }, tabC ? (S.coachState.coach ? 'Coche tes dispos, puis valide ou refuse les créneaux que les joueurs demandent.' : 'Les coachs mettent leurs dispos : demande un créneau, le coach le valide.')
          : coach ? 'Coche les jours et heures de jeu, puis regarde qui sera là.' : 'Dis au coach si tu seras là : ✅ présent · ❔ incertain · ❌ absent.'))),
      h('div', { class: 'row plan-tabs' },
        h('button', { class: 'plan-tab', 'aria-pressed': String(!tabC), onclick: () => { S.planTab = 'equipe'; render(); } }, '🗓️ Planning d’équipe'),
        h('button', { class: 'plan-tab', 'aria-pressed': String(tabC), onclick: () => { S.planTab = 'coachs'; render(); } }, '🎓 Dispos des coachs', pend ? h('span', { class: 'plan-tab-n' }, String(pend)) : null))];
    const chefBox = chefAccess();
    if (chefBox) nodes.push(chefBox);
    if (S.flash) nodes.push(h('div', { class: 'flash' }, S.flash, h('button', { class: 'flash-x', onclick: () => { S.flash = ''; render(); } }, '✕')));
    if (S.planErr) nodes.push(h('p', { class: 'muted small' }, '⚠ ' + S.planErr));

    nodes.push(h('div', { class: 'row me-row' }, h('label', { class: 'fld-inline' }, '👤 Je suis ', meSelect()),
      !S.moi ? h('span', { class: 'muted small' }, '← choisis ton pseudo pour répondre') : null,
      S.moi && !planCanWrite() ? h('span', { class: 'muted small' }, "Les réponses s'ouvriront dès que le coach aura activé le jeton d'équipe.") : null));

    const nav = h('div', { class: 'row plan-nav' },
      h('button', { class: 'btn-ghost', onclick: () => { S.planWeek = addDays(mon, -7); render(); } }, '←'),
      h('b', { class: 'plan-week' }, `Semaine du ${dayFr(days[0], { day: 'numeric', month: 'long' })} au ${dayFr(days[6], { day: 'numeric', month: 'long' })}`),
      h('button', { class: 'btn-ghost', onclick: () => { S.planWeek = addDays(mon, 7); render(); } }, '→'),
      mon !== mondayOf(t) ? h('button', { class: 'chip', onclick: () => { S.planWeek = mondayOf(t); render(); } }, "Aujourd'hui") : null,
      coach && !tabC ? h('button', { class: 'btn-fire small-btn', disabled: planCanWrite() ? null : true, onclick: () => startPlanEdit(mon) }, '✏️ Cocher les jours et heures') : null,
      (tabC ? S.coachState.coach : coach) && !planCanWrite() ? h('span', { class: 'bad small' }, S.coachState.coach ? 'Ajoute le jeton GitHub (ou le jeton d\'équipe) dans les réglages coach.' : 'Le coach doit d\'abord activer le jeton d\'équipe.') : null);
    nodes.push(nav);
    if (tabC) { coachPlanning(nodes, days, t, mon); view.replaceChildren(...nodes); return; }

    const planned = days.filter((d) => S.plan && S.plan.jours[d]);
    if (!planned.length) {
      nodes.push(h('div', { class: 'card plan-empty' }, h('p', { class: 'muted' }, coach ? 'Rien de prévu cette semaine. Clique sur « Cocher les jours et heures » pour créer le planning.' : 'Le coach n\'a encore rien prévu cette semaine.')));
    }
    for (const d of planned) {
      const j = S.plan.jours[d];
      const rep = S.plan.reponses[d] || {};
      const past = d < t;
      const cnt = { present: 0, incertain: 0, absent: 0, none: 0 };
      roster.forEach((p) => { const r = rep[p.slug]; cnt[r ? r.statut : 'none']++; });
      const mine = S.moi ? rep[S.moi] : null;
      const type = PLAN_TYPES.find((x) => x[0] === j.type) || PLAN_TYPES[0];
      const full = cnt.present >= 5;
      const btns = S.moi && !past && S.players.some((x) => x.slug === S.moi) ? h('div', { class: 'plan-me' }, h('span', { class: 'muted small' }, 'Moi : '),
        Object.entries(PLAN_ST).map(([k, v]) => h('button', { class: 'plan-btn ' + v.cls, 'aria-pressed': String(!!(mine && mine.statut === k)), disabled: planCanWrite() ? null : true,
          onclick: () => answer(d, S.moi, mine && mine.statut === k ? null : k) }, v.ico + ' ' + v.txt))) : null;
      const people = h('div', { class: 'plan-people' }, roster.map((p) => {
        const r = rep[p.slug];
        const st = r ? PLAN_ST[r.statut] : null;
        const cycle = coach && planCanWrite() && !past ? () => { const order = [null, 'present', 'incertain', 'absent']; answer(d, p.slug, order[(order.indexOf(r ? r.statut : null) + 1) % 4]); } : null;
        return h(cycle ? 'button' : 'span', { class: 'plan-p ' + (st ? st.cls : 'st-none'), onclick: cycle, title: cycle ? 'Clique pour changer sa réponse' : null },
          h('span', null, st ? st.ico : '⏳'), ' ', roleOf(p).ico, ' ', p.pseudo);
      }));
      nodes.push(h('div', { class: 'card plan-day' + (past ? ' past' : '') + (d === t ? ' today' : '') },
        h('div', { class: 'plan-head' },
          h('div', null, h('div', { class: 'plan-date' }, cap(dayFr(d)), d === t ? h('span', { class: 'plan-tag' }, "aujourd'hui") : null,
              // La note du coach, en gros à côté de la date : c'est l'info importante du jour.
              j.note ? h('span', { class: 'plan-note' }, '📝 ' + j.note) : null),
            h('div', { class: 'plan-hours' }, '🕒 ', hourBlocks(j.heures), h('span', { class: 'plan-type' }, type[1]))),
          h('div', { class: 'plan-count' },
            h('span', { class: 'st-ok' }, `✅ ${cnt.present}`), h('span', { class: 'st-warn' }, `❔ ${cnt.incertain}`), h('span', { class: 'st-bad' }, `❌ ${cnt.absent}`),
            cnt.none ? h('span', { class: 'muted' }, `⏳ ${cnt.none}`) : null,
            h('span', { class: full ? 'plan-five ok' : 'plan-five' }, full ? '5 joueurs ✓' : `${cnt.present}/5`))),
        btns, people));
    }
    view.replaceChildren(...nodes);
  }

  // ----- Second panel : dispos des coachs, demandes des joueurs, validation par le coach -----
  const RESA_ST = { attente: { ico: '⏳', txt: 'En attente', cls: 'st-warn' }, ok: { ico: '✅', txt: 'Validé', cls: 'st-ok' }, refus: { ico: '❌', txt: 'Refusé', cls: 'st-bad' } };
  async function resaAct(a) {
    if (S.planBusy) return;
    S.planBusy = true; render();
    let r;
    try { r = await window.fire.savePlanning(a); } catch (e) { r = { ok: false, error: String(e) }; }
    S.planBusy = false;
    if (r && r.ok) { S.plan = planFrom(r); notifResas(true); }
    else S.flash = 'Non enregistré : ' + ((r && r.error) || 'erreur');
    if (S.section === 'planning' && !S.planEdit) render(); else renderNav();
  }
  function coachPlanning(nodes, days, t, mon) {
    if (!S.plan) S.plan = planFrom({});
    const coachMode = !!S.coachState.coach;
    const meP = S.moi && S.players.some((x) => x.slug === S.moi);
    const can = planCanWrite() && !S.planBusy;
    const list = S.coachs || [];
    if (!list.length) { nodes.push(h('div', { class: 'card plan-empty' }, h('p', { class: 'muted' }, 'Aucun coach dans l’équipe pour le moment.'))); return; }
    if (!coachMode && S.moi && !meP && coachOf(S.moi)) nodes.push(h('p', { class: 'muted small' }, '🎓 Pour mettre tes dispos et valider les demandes, active le code coach sur ce PC (onglet « Parole du coach »).'));
    for (const c of list) {
      const daysOn = days.filter((d) => (S.plan.coachs[d] || {})[c.slug]);
      const slotEl = (d, hr, past) => {
        const who = (((S.plan.resas[d] || {})[c.slug]) || {})[hr] || {};
        const all = Object.entries(who);
        const oks = all.filter(([, x]) => x.statut === 'ok');
        const waiting = all.filter(([, x]) => x.statut === 'attente');
        const mine = meP ? who[S.moi] : null;
        const lab = `${hr}h – ${hr + 1 === 24 ? '0h' : hr + 1 + 'h'}`;
        const act = (o) => resaAct({ date: d, coach: c.slug, heure: hr, ...o });
        let me = null;
        if (meP && !past) {
          if (mine && mine.statut === 'attente') me = h('div', { class: 'pc-me' }, h('span', { class: 'st-warn' }, '⏳ Ta demande attend le coach'), h('button', { class: 'linkbtn small', disabled: can ? null : true, onclick: () => act({ type: 'demande', slug: S.moi, on: false }) }, 'Annuler'));
          else if (mine && mine.statut === 'ok') me = h('div', { class: 'pc-me' }, h('span', { class: 'st-ok' }, '✅ Validé pour toi'), h('button', { class: 'linkbtn small', disabled: can ? null : true, onclick: () => act({ type: 'demande', slug: S.moi, on: false }) }, 'Me désister'));
          else if (mine && mine.statut === 'refus') me = h('div', { class: 'pc-me' }, h('span', { class: 'st-bad' }, '❌ Refusé'), h('button', { class: 'linkbtn small', disabled: can ? null : true, onclick: () => act({ type: 'demande', slug: S.moi, on: true }) }, 'Redemander'));
          else if (!mine) me = h('button', { class: 'btn-fire small-btn pc-take', disabled: can ? null : true, onclick: () => act({ type: 'demande', slug: S.moi, on: true }) }, '🙋 Je prends ce créneau');
        }
        const reqs = coachMode && all.length ? h('div', { class: 'pc-reqs' }, all.sort((a, b) => (['ok', 'attente', 'refus'].indexOf(a[1].statut) - ['ok', 'attente', 'refus'].indexOf(b[1].statut)) || a[1].at - b[1].at).map(([s, x]) => {
          const st = RESA_ST[x.statut] || RESA_ST.attente;
          return h('div', { class: 'pc-req' }, h('span', { class: st.cls }, st.ico), ' ', h('b', null, vocalName(s)),
            past ? null : h('span', { class: 'pc-req-btns' },
              x.statut !== 'ok' ? h('button', { class: 'plan-btn st-ok', disabled: can ? null : true, onclick: () => act({ type: 'decision', slug: s, statut: 'ok' }) }, '✓ Valider') : null,
              x.statut !== 'refus' ? h('button', { class: 'plan-btn st-bad', disabled: can ? null : true, onclick: () => act({ type: 'decision', slug: s, statut: 'refus' }) }, '✕ Refuser') : null));
        })) : null;
        const state = h('span', { class: 'pc-state' },
          oks.length ? h('span', { class: 'st-ok' }, `✅ ${oks.map(([s]) => vocalName(s)).join(', ')}`) : null,
          waiting.length ? h('span', { class: 'st-warn' }, `⏳ ${waiting.length} demande${waiting.length > 1 ? 's' : ''}`) : null,
          !oks.length && !waiting.length ? h('span', { class: 'muted' }, 'Libre') : null);
        return h('div', { class: 'pc-slot ' + (oks.length ? 'taken' : waiting.length ? 'asked' : 'free') + (mine ? ' mine-' + mine.statut : '') },
          h('div', { class: 'pc-slot-top' }, h('b', { class: 'pc-hr' }, '🕒 ' + lab), state), me, reqs);
      };
      const body = !daysOn.length ? [h('p', { class: 'muted' }, `${c.pseudo} n’a pas encore mis de dispos cette semaine.`)]
        : daysOn.map((d) => {
          const off = S.plan.coachs[d][c.slug];
          const past = d < t;
          return h('div', { class: 'pc-day' + (past ? ' past' : '') + (d === t ? ' today' : '') },
            h('div', { class: 'plan-date' }, cap(dayFr(d)), d === t ? h('span', { class: 'plan-tag' }, "aujourd'hui") : null, off.note ? h('span', { class: 'plan-note' }, '📝 ' + off.note) : null),
            h('div', { class: 'pc-slots' }, off.heures.slice().sort((a, b) => a - b).map((hr) => slotEl(d, hr, past))));
        });
      nodes.push(h('div', { class: 'card pc-coach' },
        h('div', { class: 'row pc-head' }, h('h2', { class: 'pc-name' }, '🎓 ' + c.pseudo),
          coachMode ? h('button', { class: 'btn-fire small-btn', disabled: planCanWrite() ? null : true, onclick: () => startPlanEdit(mon, c.slug) }, S.moi === c.slug ? '✏️ Mes dispos' : `✏️ Dispos de ${c.pseudo}`) : null),
        ...body));
    }
    if (!meP && !coachMode) nodes.push(h('p', { class: 'muted small' }, '👤 Choisis ton pseudo dans « Je suis » pour demander un créneau.'));
  }

  function startPlanEdit(mon, coach) {
    const jours = {};
    for (const d of weekDays(mon)) {
      const j = S.plan && (coach ? (S.plan.coachs[d] || {})[coach] : S.plan.jours[d]);
      jours[d] = { heures: j ? j.heures.slice() : [], type: j && j.type ? j.type : 'flex', note: j ? j.note || '' : '' };
    }
    S.planEdit = { mon, jours, busy: false, err: '', coach: coach || null };
    render();
  }

  function renderPlanEditor(view) {
    const e = S.planEdit;
    const days = weekDays(e.mon);
    const t = todayYmd();
    let paint = null;
    const stop = () => { paint = null; };
    window.addEventListener('mouseup', stop, { once: true });
    const setCell = (cell, d, hr, on) => {
      const hs = e.jours[d].heures;
      const i = hs.indexOf(hr);
      if (on && i < 0) hs.push(hr); else if (!on && i >= 0) hs.splice(i, 1);
      cell.classList.toggle('on', on);
      const lab = view.querySelector(`[data-sum="${d}"]`);
      if (lab) lab.textContent = hs.length ? hourBlocks(hs) : '—';
    };
    const grid = h('table', { class: 'plan-grid' },
      h('thead', null, h('tr', null, h('th', null, ''), days.map((d) => h('th', { class: d === t ? 'today' : null },
        h('div', null, cap(dayFr(d, { weekday: 'short' }))), h('div', { class: 'muted small' }, dayFr(d, { day: 'numeric', month: 'short' })))))),
      h('tbody', null, PLAN_HOURS.map((hr) => h('tr', { class: hr < 8 ? 'night' : null, 'data-hr': hr }, h('th', { class: 'plan-hr' }, (hr < 8 ? '🌙 ' : '') + hr + 'h'), days.map((d) => {
        const cell = h('td', { class: 'plan-cell' + (e.jours[d].heures.includes(hr) ? ' on' : '') + (d < t ? ' past' : '') });
        cell.addEventListener('mousedown', (ev) => { ev.preventDefault(); paint = !cell.classList.contains('on'); setCell(cell, d, hr, paint); window.addEventListener('mouseup', stop, { once: true }); });
        cell.addEventListener('mouseenter', () => { if (paint !== null) setCell(cell, d, hr, paint); });
        return cell;
      })))));
    const quick = (d, a, b) => () => { e.jours[d].heures = []; for (let x = a; x < b; x++) e.jours[d].heures.push(x); render(); };
    const rows = days.map((d) => {
      const j = e.jours[d];
      const type = e.coach ? null : h('select', null, PLAN_TYPES.map(([k, v]) => h('option', { value: k }, v)));
      if (type) type.value = j.type;
      if (type) type.addEventListener('change', () => { j.type = type.value; });
      const note = h('input', { class: 'inp', placeholder: 'Note (facultatif)', maxlength: 200, value: j.note });
      note.addEventListener('input', () => { j.note = note.value; });
      return h('div', { class: 'plan-erow' },
        h('b', { class: 'plan-eday' }, cap(dayFr(d, { weekday: 'long', day: 'numeric' }))),
        h('span', { class: 'plan-esum', 'data-sum': d }, j.heures.length ? hourBlocks(j.heures) : '—'),
        h('button', { class: 'chip', onclick: quick(d, 20, 23) }, '20h–23h'),
        h('button', { class: 'chip', onclick: quick(d, 14, 18) }, '14h–18h'),
        h('button', { class: 'chip', onclick: quick(d, 0, 0) }, 'Vider'),
        type, note);
    });
    const save = h('button', { class: 'btn-fire small-btn', disabled: e.busy ? true : null, onclick: async () => {
      e.busy = true; e.err = ''; render();
      actLog('plan', e.coach ? 'Disponibilités de coach publiées' : 'Semaine de planning publiée');
      const r = await window.fire.savePlanning(e.coach ? { type: 'dispos', coach: e.coach, debut: e.mon, jours: e.jours } : { type: 'semaine', debut: e.mon, jours: e.jours });
      e.busy = false;
      if (r && r.ok) { S.plan = planFrom(r); if (!e.coach) notifPlanning(true); S.planWeek = e.mon; S.planEdit = null; S.flash = e.coach ? 'Dispos publiées ✓ Les joueurs peuvent demander un créneau.' : 'Planning publié ✓ Les joueurs peuvent répondre.'; }
      else e.err = (r && r.error) || 'erreur';
      render();
    } }, e.busy ? 'Publication…' : e.coach ? '📣 Publier mes dispos' : "📣 Publier le planning");
    // La grille garde sa position de défilement entre deux affichages ; au départ, elle montre 10h (ou la 1re heure cochée si plus tôt).
    const wrap = h('div', { class: 'card plan-gridwrap' }, grid);
    wrap.addEventListener('scroll', () => { e.scroll = wrap.scrollTop; });
    requestAnimationFrame(() => {
      if (e.scroll == null) {
        const first = Math.min(10, ...days.flatMap((d) => e.jours[d].heures));
        const row = wrap.querySelector(`tr[data-hr="${first}"]`);
        e.scroll = row ? Math.max(0, row.offsetTop - 40) : 0;
      }
      wrap.scrollTop = e.scroll;
    });
    const asked = e.coach ? days.some((d) => Object.keys(((S.plan.resas[d] || {})[e.coach]) || {}).length) : false;
    view.replaceChildren(...[
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, e.coach ? '🎓' : '✏️'), h('div', null, h('h1', { class: 'title' }, e.coach ? `Dispos de ${vocalName(e.coach)}` : 'Jours et heures de jeu'),
        h('p', { class: 'muted' }, `Semaine du ${dayFr(days[0], { day: 'numeric', month: 'long' })}. ` + (e.coach
          ? 'Clique (ou glisse) sur les cases pour cocher les heures où tu es disponible : chaque heure devient un créneau que les joueurs peuvent demander.'
          : "Clique (ou glisse) sur les cases pour cocher les heures où l'équipe joue.")))),
      asked ? h('p', { class: 'muted small' }, '⚠ Si tu retires une heure déjà demandée par un joueur, sa demande disparaît.') : null,
      wrap,
      h('div', { class: 'card plan-edays' }, rows),
      h('div', { class: 'row' }, save, h('button', { class: 'btn-ghost', onclick: () => { S.planEdit = null; render(); } }, 'Annuler'),
        e.err ? h('span', { class: 'bad small' }, '⚠ ' + e.err) : null)].filter(Boolean));
  }

  async function loadPools() {
    let r;
    try { r = await window.fire.pools(); } catch (e) { r = { ok: false, error: String(e) }; }
    if (r && r.ok) { S.pools = r.semaines || []; S.bonus = r.bonus || {}; S.poolsErr = r.offline ? 'Hors ligne : derniers pools enregistrés.' : ''; }
    else { S.pools = S.pools || []; S.poolsErr = (r && r.error) || 'pools indisponibles'; }
    S.poolWrite = !!(r && r.peutEcrire);
    applyWeek();
    if (typing()) return;
    if (S.section === 'pool' || S.section === 'stats') render();
  }

  async function loadChampions() {
    try { const r = await window.fire.champions(); if (r && r.list) S.champList = r; } catch (e) { /* icônes facultatives */ }
    if (S.section === 'pool' && !typing()) render();
  }

  function champIcon(id, size) {
    const sz = size || 28;
    const letter = h('span', { class: 'cico-l', style: `width:${sz}px;height:${sz}px;font-size:${Math.round(sz / 2.3)}px` }, (FC.champName(id) || '?').charAt(0));
    if (!S.champList || !S.champList.version) return letter;
    const img = h('img', { class: 'cico', width: sz, height: sz, alt: '', src: `https://ddragon.leagueoflegends.com/cdn/${S.champList.version}/img/champion/${id}.png` });
    img.addEventListener('error', () => img.replaceWith(letter));
    return img;
  }

  function champIdFromName(txt) {
    const n = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const t = n(txt);
    if (!t) return null;
    const list = (S.champList && S.champList.list) || [];
    const hit = list.find((c) => n(c.name) === t || n(c.id) === t) || list.find((c) => n(c.name).startsWith(t));
    if (hit) return hit.id;
    const known = Object.entries(FC.NAMES).find(([id, name]) => n(name) === t || n(id) === t);
    return known ? known[0] : String(txt).replace(/[^A-Za-z0-9]/g, '');
  }

  function weekRange(w) {
    if (!w) return { start: S.cfgObj ? new Date(S.cfgObj.debut + 'T00:00:00').getTime() : Date.now() - 7 * 86400000, end: null, fin: null };
    const nx = nextWeekOf(w);
    return { start: new Date(w.debut + 'T00:00:00').getTime(), end: nx ? new Date(nx.debut + 'T00:00:00').getTime() : null, fin: nx ? addDays(nx.debut, -1) : null };
  }

  const canEdit = (slug) => S.coachState.coach ? (S.poolWrite || S.coachState.github) : (S.poolWrite && S.moi === slug);

  function meSelect() {
    const sel = h('select', { 'aria-label': 'Qui es-tu ?' }, h('option', { value: '' }, '— choisis —'), S.players.filter((x) => x.slug).map((p) => h('option', { value: p.slug }, `${roleOf(p).ico} ${p.pseudo}`)),
      (S.coachs || []).map((c) => h('option', { value: c.slug }, `🎓 ${c.pseudo} (coach)`)));
    sel.value = S.moi || '';
    sel.addEventListener('change', () => { S.moi = sel.value || null; save('fire.moi', S.moi); render(); });
    return sel;
  }

  // Au premier lancement : on demande une seule fois qui utilise l'app, pour ouvrir directement sa tierlist.
  // ----- Discussion de l'équipe : panneau en bas à gauche, sur toutes les pages, ouvert ou replié -----
  // Les messages arrivent tout de suite par les FIRE ouverts (voice.js) et l'historique est relu toutes les 2 minutes.
  // conv : 'team' (toute l'équipe) ou le slug d'un membre (messages privés entre vous deux). seenBy : dernier message lu par conversation.
  const CH = { open: load('fire.chat.open', false), msgs: [], seen: load('fire.chat.seen', 0), seenBy: load('fire.chat.seenBy', {}), conv: 'team', err: '', sending: false, el: null, list: null, inp: null, told: new Set(), ready: false, headKey: '' };
  // Messages privés refusés (Paramètres › Confidentialité) : ceux des expéditeurs non autorisés ne s'affichent pas.
  const dmAllowedFrom = (from) => UX.dm === 'all' || (UX.dm === 'coach' && !!coachOf(from));
  // Salons de l'équipe (comme Discord) : #général (« team »), #stratégie, #games, #détente ; puis les messages privés.
  const CHANNELS = [['team', '💬', 'général', 'Toute l’équipe, tous les sujets'], ['ch:strat', '🧠', 'stratégie', 'Compos, drafts, plans de jeu, ce qu’on retient des games'],
    ['ch:games', '🎮', 'games', 'On lance une game ? Résultats, clips, invitations'], ['ch:detente', '😄', 'détente', 'Memes, musique, tout et n’importe quoi']];
  const isChan = (c) => CHANNELS.some(([id]) => id === c);
  // Salons créés par le coach ou le chef d'équipe (salons.json) ; sans fichier, ceux par défaut.
  const SAL_DEF = { texte: [{ id: 'strat', ico: '🧠', name: 'stratégie', desc: 'Compos, drafts, plans de jeu, ce qu’on retient des games' }, { id: 'games', ico: '🎮', name: 'games', desc: 'On lance une game ? Résultats, clips, invitations' },
    { id: 'detente', ico: '😄', name: 'détente', desc: 'Memes, musique, tout et n’importe quoi' }],
    voix: [{ id: 'duo1', ico: '🎧', name: 'Duo 1', desc: '2 places', max: 2 }, { id: 'duo2', ico: '🎧', name: 'Duo 2', desc: '2 places', max: 2 }, { id: 'coaching', ico: '🎓', name: 'Coaching perso', desc: '2 places · en tête-à-tête', max: 2 }] };
  const SAL = { data: load('fire.salons', null), gerer: false };
  function applySalons(d) {
    const x = d && (Array.isArray(d.texte) || Array.isArray(d.voix)) ? d : SAL_DEF;
    CHANNELS.splice(1, CHANNELS.length - 1, ...(x.texte || []).map((c) => ['ch:' + c.id, c.ico || '💬', c.name, c.desc || '']));
    ROOMS.splice(1, ROOMS.length - 1, ...(x.voix || []).map((r) => ({ id: r.id, ico: r.ico || '🔊', name: r.name, sub: r.desc || (r.max ? `${r.max} places` : 'Places illimitées'), max: Number(r.max) || 0 })));
  }
  async function salonsLoad() {
    if (!window.fire.salons) return;
    let r;
    try { r = await window.fire.salons.list(); } catch (e) { return; }
    if (!r || !r.ok) return;
    SAL.gerer = !!r.gerer;
    if (r.salons) { SAL.data = r.salons; save('fire.salons', r.salons); }
    applySalons(SAL.data);
    if (S.section === 'chat' || S.section === 'vocal') { if (!typing()) render(); } else chatPaint();
  }
  const canManageSalons = () => !!(SAL.gerer || S.coachState.coach || S.coachState.chef);
  // Éditeur des salons (coach et chef d'équipe) : ajouter, renommer, réordonner, supprimer ; texte et vocal.
  function openSalons() {
    document.querySelectorAll('.sal-pop').forEach((x) => x.remove());
    const base = SAL.data && (SAL.data.texte || SAL.data.voix) ? SAL.data : SAL_DEF;
    const E = { texte: (base.texte || []).map((x) => ({ ...x })), voix: (base.voix || []).map((x) => ({ ...x })), busy: false, err: '' };
    const box = h('div', { class: 'sal-pop', onmousedown: (e) => { if (e.target === box) box.remove(); } });
    const paint = () => {
      const row = (kind, x, i) => {
        const list = E[kind];
        return h('div', { class: 'sal-row' },
          h('input', { class: 'inp sal-ico', value: x.ico || '', maxlength: 4, title: 'Emoji', oninput: (e) => { x.ico = e.target.value; } }),
          h('input', { class: 'inp sal-name', value: x.name || '', maxlength: 30, placeholder: kind === 'texte' ? 'nom-du-salon' : 'Nom du salon', oninput: (e) => { x.name = e.target.value; } }),
          h('input', { class: 'inp sal-desc', value: x.desc || '', maxlength: 90, placeholder: kind === 'texte' ? 'À quoi sert ce salon ?' : 'Petite description', oninput: (e) => { x.desc = e.target.value; } }),
          kind === 'voix' ? h('select', { class: 'inp sal-max', title: 'Places', onchange: (e) => { x.max = Number(e.target.value); } },
            [0, 2, 3, 4, 5, 6, 8, 10].map((n) => h('option', { value: String(n), selected: Number(x.max || 0) === n ? true : null }, n ? `${n} places` : 'Illimité'))) : null,
          h('button', { class: 'sal-b', title: 'Monter', disabled: i === 0 ? true : null, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; paint(); } }, '↑'),
          h('button', { class: 'sal-b', title: 'Descendre', disabled: i === list.length - 1 ? true : null, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; paint(); } }, '↓'),
          h('button', { class: 'sal-b del', title: 'Supprimer', onclick: () => { list.splice(i, 1); paint(); } }, '🗑'));
      };
      box.replaceChildren(h('div', { class: 'sal-card' },
        h('h2', null, '⚙️ Gérer les salons'),
        h('p', { class: 'muted small' }, 'Les salons de toute l’équipe. #général et le Salon de l’équipe sont toujours là. Les messages d’un salon supprimé restent cachés.'),
        h('h3', null, '💬 Salons textuels'),
        h('div', { class: 'sal-fixed muted small' }, '# général · toujours là'),
        E.texte.map((x, i) => row('texte', x, i)),
        E.texte.length < 15 ? h('button', { class: 'btn-ghost', onclick: () => { E.texte.push({ id: '', ico: '💬', name: '', desc: '' }); paint(); } }, '➕ Ajouter un salon textuel') : null,
        h('h3', null, '🔊 Salons vocaux'),
        h('div', { class: 'sal-fixed muted small' }, '🔊 Salon de l’équipe · toujours là'),
        E.voix.map((x, i) => row('voix', x, i)),
        E.voix.length < 12 ? h('button', { class: 'btn-ghost', onclick: () => { E.voix.push({ id: '', ico: '🔊', name: '', desc: '', max: 0 }); paint(); } }, '➕ Ajouter un salon vocal') : null,
        E.err ? h('p', { class: 'bad small' }, '⚠ ' + E.err) : null,
        h('div', { class: 'row sal-act' },
          h('button', { class: 'btn-fire small-btn', disabled: E.busy ? true : null, onclick: async () => {
            const slug = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
            const clean = (l) => l.filter((x) => String(x.name || '').trim()).map((x) => ({ ...x, id: slug(x.id || x.name) }));
            E.busy = true; E.err = ''; paint();
            const r = await window.fire.salons.save({ texte: clean(E.texte), voix: clean(E.voix) }).catch((e) => ({ ok: false, error: String(e) }));
            E.busy = false;
            if (r && r.ok) { SAL.data = r.salons; save('fire.salons', r.salons); applySalons(r.salons); box.remove(); render(); popup('✅ Salons enregistrés', 'Toute l’équipe les voit à la prochaine mise à jour (2 minutes au plus).', null); }
            else { E.err = (r && r.error) || 'enregistrement impossible'; paint(); }
          } }, E.busy ? 'Enregistrement…' : '💾 Enregistrer pour l’équipe'),
          h('button', { class: 'btn-ghost', onclick: () => box.remove() }, 'Annuler'))));
    };
    paint();
    document.body.append(box);
  }
  const chatConvOf = (m, me) => (!m.to ? (m.ch ? (isChan('ch:' + m.ch) ? 'ch:' + m.ch : null) : 'team') : m.from === me ? m.to : m.to === me ? (dmAllowedFrom(m.from) ? m.from : null) : null);
  const chatVisible = (m, me) => chatConvOf(m, me) != null;
  const chatSeenAt = (conv) => (conv === 'team' ? CH.seen : (CH.seenBy[conv] || 0));
  function chatMerge(list, live) {
    const by = new Map(CH.msgs.map((m) => [m.id, m]));
    const fresh = [];
    for (const m of list || []) if (m && m.id && m.text && !by.has(m.id) && !(CH.deleted && CH.deleted.has(m.id))) { by.set(m.id, m); fresh.push(m); }
    if (!fresh.length) return;
    CH.msgs = [...by.values()].sort((a, b) => a.at - b.at).slice(-300);
    // Notification Windows pour les messages des autres, si FIRE n'est pas au premier plan (une seule fois par message).
    if (CH.ready) {
      const others = fresh.filter((m) => m.from !== vocalMe() && chatVisible(m, vocalMe()) && m.at > Date.now() - 15 * 60000 && !CH.told.has(m.id));
      others.forEach((m) => CH.told.add(m.id));
      const p = notifPrefs();
      const wanted = others.filter((m) => (m.to ? p.dm !== false : p.chat));
      if (wanted.length && p.on && !document.hasFocus() && window.fire.notify) {
        const m = wanted[wanted.length - 1];
        deskNotify({ title: `💬 ${vocalName(m.from)}${m.to ? ' (privé)' : ''}`, body: (wanted.length > 1 ? `(${wanted.length} messages) ` : '') + m.text.slice(0, 160), section: 'chat' }).catch(() => {});
      }
    }
    chatPaint(live);
  }
  async function chatLoad() {
    if (!window.fire.chat) return;
    let r;
    try { r = await window.fire.chat.list(); } catch (e) { r = { ok: false, error: String(e) }; }
    if (r && r.ok) {
      CH.err = r.offline ? 'Hors ligne : derniers messages enregistrés.' : '';
      // La liste en ligne fait foi : un message supprimé par la modération disparaît aussi ici (sauf ceux des 2 dernières minutes, pas encore enregistrés).
      if (!r.offline && Array.isArray(r.msgs)) { const ids = new Set(r.msgs.map((m) => m.id)); const before = CH.msgs.length; CH.msgs = CH.msgs.filter((m) => ids.has(m.id) || m.at > Date.now() - 120000); if (CH.msgs.length !== before) chatPaint(); }
      chatMerge(r.msgs);
    }
    else CH.err = (r && r.error) || 'discussion indisponible';
    CH.ready = true;
    chatPaint();
  }
  function chatUnreadIn(conv) { const me = vocalMe(); const t = chatSeenAt(conv); return CH.msgs.filter((m) => m.from !== me && m.at > t && chatConvOf(m, me) === conv).length; }
  function chatUnread() { const me = vocalMe(); return CH.msgs.filter((m) => { const c = chatConvOf(m, me); return c && m.from !== me && m.at > chatSeenAt(c); }).length; }
  function chatSeen() {
    if (!CH.open && S.section !== 'chat') return;
    const me = vocalMe();
    const mine = CH.msgs.filter((m) => chatConvOf(m, me) === CH.conv);
    if (!mine.length) return;
    const t = mine[mine.length - 1].at;
    if (CH.conv === 'team') { if (t > CH.seen) { CH.seen = t; save('fire.chat.seen', t); } }
    else if (t > (CH.seenBy[CH.conv] || 0)) { CH.seenBy[CH.conv] = t; save('fire.chat.seenBy', CH.seenBy); }
  }
  function chatConv(c) { CH.conv = c; chatPaint(true); setTimeout(() => { const i = chatInput(); if (i && !i.disabled) i.focus(); }, 30); }
  function chatOpen(v) { CH.open = v; save('fire.chat.open', v); chatPaint(); if (v) setTimeout(() => { if (CH.inp) CH.inp.focus(); }, 50); }
  async function chatSend() {
    const me = vocalMe();
    const inp = chatInput();
    const text = inp.value.trim().slice(0, 500);
    if (!text || !me || CH.sending) return;
    if (modBlocked()) { CH.err = `Tu es exclu de la discussion jusqu’à ${hm(MOD.me.until)}.`; chatPaint(); return; }
    const msg = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), from: me, text, at: Date.now() };
    if (CH.conv.startsWith('ch:')) msg.ch = CH.conv.slice(3);
    else if (CH.conv !== 'team') msg.to = CH.conv;
    actLog('msg', msg.to ? `Message privé à ${vocalName(msg.to)}` : `Dans ${convName(CH.conv)} : « ${text.slice(0, 70)} »`);
    inp.value = ''; chatGrow();
    chatMerge([msg], true);
    try { if (FV() && FV().chatSend) FV().chatSend(msg); } catch (e) { /* hall pas prêt */ }
    CH.sending = true;
    const r = await window.fire.chat.send(msg).catch((e) => ({ ok: false, error: String(e) }));
    CH.sending = false;
    if (r && r.ok) { CH.err = ''; chatMerge(r.msgs); } else CH.err = 'Message pas enregistré (' + ((r && r.error) || 'erreur') + ') : seuls ceux qui ont FIRE ouvert l’ont reçu.';
    chatPaint();
  }
  // La zone de saisie active : celle de la page « Discussion » si elle est ouverte, sinon celle du panneau.
  const chatInput = () => (S.section === 'chat' && CHP.inp ? CHP.inp : CH.inp);
  function chatGrow() { const i = chatInput(); if (!i) return; i.style.height = 'auto'; i.style.height = Math.min(160, i.scrollHeight) + 'px'; }
  function chatDay(t) {
    const d = new Date(t), today = new Date(); const y = new Date(); y.setDate(y.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === y.toDateString()) return 'Hier';
    return cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
  }
  function chatWho(slug) { const c = coachOf(slug); if (c || slug === 'coach') return '🎓 ' + vocalName(slug); const p = S.players.find((x) => x.slug === slug); return (p ? roleOf(p).ico + ' ' : '') + vocalName(slug); }
  // Les conversations : les salons, puis un message privé avec chaque membre (joueurs et coachs).
  function chatPeople(me) {
    return S.players.filter((x) => x.slug).map((p) => [p.slug, roleOf(p).ico, String(p.pseudo).split('#')[0]])
      .concat((S.coachs || []).map((c) => [c.slug, '🎓', c.pseudo])).filter(([slug]) => slug !== me);
  }
  const convName = (c) => { const ch = CHANNELS.find(([id]) => id === c); return ch ? '#' + ch[2] : vocalName(c); };
  function chatRefuse(me) {
    if (CH.conv === 'team' || isChan(CH.conv)) return false;
    const x = statusOf(CH.conv);
    return x.dm === 'none' || (x.dm === 'coach' && !coachOf(me));
  }
  const chatPlaceholder = (me, refuse) => refuse ? `${vocalName(CH.conv)} ne reçoit pas de messages privés.` : isChan(CH.conv) ? `Écrire dans ${convName(CH.conv)}… (Entrée pour envoyer)` : `Message privé à ${vocalName(CH.conv)}…`;
  // Les messages d'une conversation (jour, auteur en couleur, messages groupés).
  function chatRows(me) {
    const rows = [];
    const stc = {};
    const st = (slug) => (stc[slug] = stc[slug] || statusOf(slug));
    let lastDay = '', last = null;
    for (const m of CH.msgs) {
      if (chatConvOf(m, me) !== CH.conv) continue;
      const day = chatDay(m.at);
      if (day !== lastDay) { rows.push(h('div', { class: 'chat-day' }, day)); lastDay = day; last = null; }
      const grouped = last && last.from === m.from && m.at - last.at < 5 * 60000;
      const col = st(m.from).color;
      rows.push(h('div', { class: 'chat-m' + (m.from === me ? ' mine' : '') + (grouped ? ' grp' : '') },
        grouped ? null : h('div', { class: 'chat-mh' }, h('b', { class: 'chat-who-n', style: col ? `color:${col}` : '', title: 'Voir sa carte de profil (clic droit : plus d’options)', onclick: () => openProfile(m.from), oncontextmenu: (e) => { if (m.from === vocalMe()) return; e.preventDefault(); personMenu({ slug: m.from }, e.clientX, e.clientY); } }, chatWho(m.from)), roleBadge(m.from), h('span', { class: 'muted' }, hm(m.at)),
          isStaff() && !m.to ? h('button', { class: 'chat-del', title: 'Supprimer ce message (modération)', onclick: () => chatModDelete(m) }, '🗑') : null),
        h('div', { class: 'chat-tx' }, m.text)));
      last = m;
    }
    if (!rows.length) rows.push(h('p', { class: 'muted small chat-empty' }, !CH.ready ? 'Chargement…' : isChan(CH.conv) ? `Aucun message dans ${convName(CH.conv)} pour l’instant. Lance la discussion 👋`
      : `Aucun message privé avec ${vocalName(CH.conv)}. Seuls vous deux les voyez dans FIRE.`));
    if (!isChan(CH.conv)) rows.unshift(h('div', { class: 'chat-day chat-priv' }, `🔒 Conversation privée avec ${vocalName(CH.conv)}`));
    return rows;
  }
  // Une zone de saisie : créée une seule fois puis jamais déplacée (la déplacer lui faisait perdre le clavier : on ne pouvait plus écrire).
  function chatComposer(cls) {
    const inp = h('textarea', { class: 'chat-inp ' + (cls || ''), rows: 1, maxlength: 500 });
    inp.addEventListener('input', chatGrow);
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSend(); } if (e.key === 'Escape' && !cls) chatOpen(false); });
    const form = h('div', { class: 'chat-form' }, inp, h('button', { class: 'btn-fire chat-send', title: 'Envoyer', onclick: chatSend }, '➤'));
    const who = h('button', { class: 'btn-ghost chat-who', onclick: askWho }, '👤 Choisis qui tu es pour écrire');
    const err = h('p', { class: 'chat-err', hidden: true });
    return { inp, form, who, err, foot: h('div', { class: 'chat-foot' }, err, form, who) };
  }
  function composerSync(c, me) {
    const refuse = chatRefuse(me);
    c.form.hidden = !me; c.who.hidden = !!me;
    c.err.hidden = !CH.err; c.err.textContent = CH.err ? '⚠ ' + CH.err : '';
    c.inp.disabled = !!refuse;
    const ph = chatPlaceholder(me, refuse);
    if (c.inp.placeholder !== ph) c.inp.placeholder = ph;
  }
  function chatConvButtons(me, cls, full) {
    const btn = (id, ico, label, title, dot) => { const n = chatUnreadIn(id); return h('button', { class: cls + (CH.conv === id ? ' on' : ''), title, onclick: () => chatConv(id), oncontextmenu: dot ? (e) => { e.preventDefault(); personMenu({ slug: id }, e.clientX, e.clientY); } : null },
      h('span', { class: 'chat-cv-i' }, ico), h('span', { class: 'chat-cv-l' }, label), dot ? stDot(id) : null, n && CH.conv !== id ? h('span', { class: 'chat-cv-n' }, String(n)) : null); };
    const chans = CHANNELS.map(([id, ico, label, desc]) => btn(id, full ? '#' : ico, full ? label : '#' + label, desc, false));
    const dms = me ? chatPeople(me).map(([slug, ico, label]) => btn(slug, ico, label, 'Message privé avec ' + label, true)) : [];
    return full ? [h('div', { class: 'cp-gt' }, h('span', null, 'Salons'), canManageSalons() ? h('button', { class: 'cp-add', title: 'Gérer les salons', onclick: openSalons }, '⚙') : null), ...chans, h('div', { class: 'cp-gt' }, 'Messages privés'), ...dms] : [...chans, ...dms];
  }
  function chatHead(un) {
    CH.el.classList.toggle('open', !!CH.open);
    CH.el.classList.toggle('unread', !CH.open && un > 0);
    // On ne reconstruit la barre que si elle change : la remplacer pendant un clic annulait le clic.
    const headKey = (CH.open ? 'o' : 'c') + (CH.open ? 0 : un);
    if (headKey !== CH.headKey) {
      CH.headKey = headKey;
      CH.head.replaceChildren(...[h('span', { class: 'chat-t' }, '💬 Discussion de l’équipe'), un && !CH.open ? h('span', { class: 'chat-n' }, String(un)) : null, h('span', { class: 'chat-chev' }, CH.open ? '▾' : '▴')].filter(Boolean));
    }
  }
  function chatPaint(live) {
    if (!S.players || !S.players.length || !window.fire.chat) return;
    if (!CH.el) {
      CH.list = h('div', { class: 'chat-list', role: 'log', 'aria-live': 'polite' });
      CH.comp = chatComposer();
      CH.inp = CH.comp.inp;
      CH.head = h('button', { class: 'chat-bar', onclick: () => chatOpen(!CH.open) });
      CH.convs = h('div', { class: 'chat-convs' });
      CH.el = h('div', { id: 'chat' }, CH.head, h('div', { class: 'chat-body' }, CH.convs, CH.list, CH.comp.foot));
      document.body.append(CH.el);
      // Un clic dans la discussion : messages lus et pastille à jour, sans rien reconstruire (la saisie garde le clavier).
      CH.el.addEventListener('mousedown', () => { chatSeen(); setTimeout(() => chatHead(chatUnread()), 0); });
    }
    const me = vocalMe();
    if (CH.open || S.section === 'chat') chatSeen();
    const un = chatUnread();
    if (!isChan(CH.conv) && !chatPeople(me).some(([slug]) => slug === CH.conv)) CH.conv = 'team';
    CH.el.classList.toggle('priv', !isChan(CH.conv));
    chatHead(un);
    renderNavBadges();
    if (S.section === 'chat') { chatPagePaint(live); return; }
    if (!CH.open) return;
    const stSig = chatPeople(me).map(([sl]) => { const x = statusOf(sl); return sl + chatUnreadIn(sl) + (x.game ? 'g' : '') + x.st; }).join(',');
    const convKey = CH.conv + '|' + CHANNELS.map(([id, ico, n]) => id + ico + n + chatUnreadIn(id)).join(',') + '|' + me + '|' + stSig;
    if (convKey !== CH.convKey) { CH.convKey = convKey; CH.convs.replaceChildren(...chatConvButtons(me, 'chat-cv', false)); }
    composerSync(CH.comp, me);
    const atBottom = CH.list.scrollHeight - CH.list.scrollTop - CH.list.clientHeight < 40;
    CH.list.replaceChildren(...chatRows(me));
    if (atBottom || live) CH.list.scrollTop = CH.list.scrollHeight;
  }
  // ----- Page « Discussion » (menu de gauche) : salons et messages privés à gauche, la conversation en grand -----
  const CHP = { root: null, side: null, head: null, list: null, comp: null, inp: null, key: '' };
  function renderChatPage() {
    const view = $('view');
    if (!CHP.root) {
      CHP.side = h('nav', { class: 'cp-side' });
      CHP.head = h('div', { class: 'cp-head' });
      CHP.list = h('div', { class: 'chat-list cp-list', role: 'log', 'aria-live': 'polite' });
      CHP.comp = chatComposer('cp-inp');
      CHP.inp = CHP.comp.inp;
      CHP.root = h('div', { class: 'cp' }, CHP.side, h('div', { class: 'cp-main' }, CHP.head, CHP.list, CHP.comp.foot));
      CHP.root.addEventListener('mousedown', () => { chatSeen(); setTimeout(() => { chatHead(chatUnread()); renderNavBadges(); }, 0); });
    }
    if (view.firstChild !== CHP.root || view.childNodes.length !== 1) view.replaceChildren(CHP.root);
    CHP.key = '';
    chatPagePaint(true);
    setTimeout(() => { if (!CHP.inp.disabled) CHP.inp.focus(); }, 30);
  }
  function chatPagePaint(live) {
    if (!CHP.root || S.section !== 'chat') return;
    const me = vocalMe();
    const stSig = chatPeople(me).map(([sl]) => { const x = statusOf(sl); return sl + chatUnreadIn(sl) + (x.game ? 'g' : '') + x.st; }).join(',');
    const key = CH.conv + '|' + CHANNELS.map(([id, ico, n]) => id + ico + n + chatUnreadIn(id)).join(',') + '|' + me + '|' + stSig + canManageSalons();
    if (key !== CHP.key) { CHP.key = key; CHP.side.replaceChildren(...chatConvButtons(me, 'cp-cv', true)); }
    const ch = CHANNELS.find(([id]) => id === CH.conv);
    CHP.head.replaceChildren(ch ? h('div', null, h('b', null, '# ' + ch[2]), h('span', { class: 'muted' }, ' · ' + ch[3]))
      : h('div', { class: 'cp-dm' }, h('b', { class: 'chat-who-n', onclick: () => openProfile(CH.conv) }, '@ ' + vocalName(CH.conv)), stDot(CH.conv), h('span', { class: 'muted' }, ' · 🔒 messages privés')));
    composerSync(CHP.comp, me);
    const atBottom = CHP.list.scrollHeight - CHP.list.scrollTop - CHP.list.clientHeight < 60;
    CHP.list.replaceChildren(...chatRows(me));
    if (atBottom || live) CHP.list.scrollTop = CHP.list.scrollHeight;
  }
  // Pastille du menu « Discussion » : messages non lus (sans redessiner tout le menu).
  function renderNavBadges() {
    const n = chatUnread();
    if (n === CH.navN) return;
    CH.navN = n;
    try { renderNav(); } catch (e) { /* */ }
  }

  // ----- Statut et carte de profil (Paramètres › Mon profil), envoyés aux FIRE ouverts de l'équipe -----
  // En ligne · Occupé (pas de notifications) · Absent · Invisible ; « En game » s'ajoute tout seul pendant une partie.
  const ST_LABEL = { online: ['🟢', 'En ligne'], busy: ['⛔', 'Occupé'], away: ['🌙', 'Absent'], invisible: ['⚫', 'Invisible'], offline: ['⚪', 'Hors ligne'] };
  function statusPush() {
    try {
      if (!FV() || !FV().statusSend || !vocalMe()) return;
      if (UX.status === 'invisible') { FV().statusSend(null); return; }
      FV().statusSend({ st: UX.status, game: !!(LIVE.mine), bio: UX.bio || '', color: UX.color || '', banner: UX.banner || null, dm: UX.dm || 'all', games: UX.games || [] });
    } catch (e) { /* hall pas prêt */ }
  }
  const ST_CACHE = { at: 0, st: {}, prof: {} };
  function statusOf(slug) {
    if (slug === vocalMe()) return { st: UX.status === 'invisible' ? 'invisible' : UX.status, game: !!LIVE.mine, bio: UX.bio, color: UX.color, banner: UX.banner, dm: UX.dm, games: UX.games || [] };
    // Lus au plus deux fois par seconde (FV().state() et le stockage local coûtent cher appelés pour chaque nom).
    if (!ST_CACHE.at || Date.now() - ST_CACHE.at > 500) { let st = {}; try { st = (FV() && FV().state().statuses) || {}; } catch (e) { /* */ } ST_CACHE.st = st; ST_CACHE.prof = load('fire.profiles', {}) || {}; ST_CACHE.at = Date.now(); }
    const live = ST_CACHE.st[slug] || null;
    const cached = ST_CACHE.prof[slug] || {};
    return live ? { ...cached, ...live } : { ...cached, st: 'offline', game: false };
  }
  // Les cartes de profil reçues restent affichées même quand le coéquipier est hors ligne.
  function profilesKeep() {
    try {
      const st = (FV() && FV().state().statuses) || {};
      if (!Object.keys(st).length) return;
      const all = load('fire.profiles', {}) || {};
      let ch = false;
      for (const [k, x] of Object.entries(st)) { const v = { bio: x.bio || '', color: x.color || '', banner: x.banner || null, dm: x.dm || 'all', games: x.games || [] }; if (JSON.stringify(all[k]) !== JSON.stringify(v)) { all[k] = v; ch = true; } }
      if (ch) save('fire.profiles', all);
    } catch (e) { /* */ }
  }
  const stDot = (slug) => { const x = statusOf(slug); const k = x.game ? 'game' : x.st || 'offline'; return h('i', { class: 'st-dot st-' + k, title: x.game ? 'En game' : (ST_LABEL[x.st] || ST_LABEL.offline)[1] }); };
  // Ses stats LoL pour la carte de profil (dpm.lol, déjà chargées par FIRE) : champions du split en classé solo,
  // temps de jeu sur son champion le plus joué, meilleur KDA (5 games ou plus) et meilleur taux de victoire (20 games ou plus).
  function profileLol(slug) {
    const d = S.data[slug];
    if (!d) return null;
    const champs = (d.champs || []).filter((c) => c && c.id && c.games > 0).slice().sort((a, b) => b.games - a.games);
    const matches = d.matches || [];
    const avgDur = matches.length ? matches.reduce((n, m) => n + (Number(m.d) || 0), 0) / matches.length : 1800;
    const games = champs.reduce((n, c) => n + c.games, 0), wins = champs.reduce((n, c) => n + (c.wins || 0), 0);
    const top = champs[0] || null;
    let topTime = null;
    if (top) {
      const mine = matches.filter((m) => m.championName === top.id && Number(m.d) > 0);
      const avg = mine.length ? mine.reduce((n, m) => n + Number(m.d), 0) / mine.length : avgDur;
      topTime = { sec: Math.round(top.games * avg), exact: false };
    }
    const kdaPool = champs.filter((c) => c.games >= 5 && Number.isFinite(c.kda));
    const bestKda = kdaPool.sort((a, b) => b.kda - a.kda)[0] || null;
    const wrPool = champs.filter((c) => c.games >= 20);
    const bestWr = wrPool.map((c) => ({ ...c, wr: (c.wins || 0) / c.games * 100 })).sort((a, b) => b.wr - a.wr || b.games - a.games)[0] || null;
    return { rank: d.rank || '', record: d.record || '', champs, games, wr: games ? wins / games * 100 : null, top, topTime, bestKda, bestWr };
  }
  const champName = (id) => (((S.champList && S.champList.list) || []).find((c) => c.id === id) || {}).name || id;
  const hrs = (sec) => { const m = Math.round(sec / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
  // Jeux auxquels on joue (Paramètres › Profil) : affichés sur la carte de profil.
  const GAME_LIST = [['League of Legends', '⚔️'], ['TFT', '♟️'], ['Valorant', '🎯'], ['2XKO', '🥊'], ['Legends of Runeterra', '🃏'], ['Counter-Strike 2', '🔫'], ['Fortnite', '🏗️'], ['Rocket League', '🚗'],
    ['Apex Legends', '🪂'], ['Overwatch 2', '🛡️'], ['Minecraft', '⛏️'], ['EA Sports FC', '⚽'], ['Call of Duty', '🎖️'], ['Rainbow Six Siege', '🧨'], ['Genshin Impact', '🌸'], ['Elden Ring', '🗡️']];
  const gameIco = (g) => (GAME_LIST.find(([n]) => n === g) || [, '🎮'])[1];
  function openProfile(slug) {
    document.querySelectorAll('.prof-pop').forEach((x) => x.remove());
    const x = statusOf(slug);
    const p = S.players.find((y) => y.slug === slug);
    const close = () => box.remove();
    const banner = x.banner ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${x.banner.c}_${x.banner.n}.jpg` : null;
    const me = vocalMe();
    const canDm = slug !== me && (x.dm === 'all' || !x.dm || (x.dm === 'coach' && !!coachOf(me)));
    const L = profileLol(slug);
    const stat = (label, big, sub, icon) => h('div', { class: 'pf-stat' }, icon ? champIcon(icon, 40) : null, h('div', null, h('small', { class: 'muted' }, label), h('b', null, big), sub ? h('small', { class: 'muted' }, sub) : null));
    const lol = L ? h('div', { class: 'pf-lol' },
      h('div', { class: 'pf-h' }, h('b', null, '⚔️ League of Legends'), h('small', { class: 'muted' }, L.rank ? `${L.rank}${L.record ? ' · ' + L.record : ''}` : 'Classé solo · ce split')),
      L.champs.length ? [
        h('div', { class: 'pf-stats' },
          L.top ? stat('Champion le plus joué', champName(L.top.id), `${L.top.games} games · ≈ ${hrs(L.topTime.sec)} de jeu`, L.top.id) : null,
          L.bestKda ? stat('Meilleur KDA', `${fr(L.bestKda.kda, 2)} sur ${champName(L.bestKda.id)}`, `${L.bestKda.games} games (5 minimum)`, L.bestKda.id) : null,
          L.bestWr ? stat('Meilleur taux de victoire', `${fr(L.bestWr.wr, 1)} % sur ${champName(L.bestWr.id)}`, `${L.bestWr.games} games (20 minimum)`, L.bestWr.id)
            : h('div', { class: 'pf-stat' }, h('div', null, h('small', { class: 'muted' }, 'Meilleur taux de victoire'), h('b', null, '—'), h('small', { class: 'muted' }, 'Aucun champion à 20 games ce split')))),
        h('div', { class: 'pf-sum muted small' }, `${L.games} games ce split en classé solo` + (L.wr != null ? ` · ${fr(L.wr, 1)} % de victoires` : '')),
        h('div', { class: 'pf-champs' }, L.champs.slice(0, 8).map((c) => h('div', { class: 'pf-ch', title: `${champName(c.id)} : ${c.games} games, ${fr((c.wins || 0) / c.games * 100, 0)} % de victoires, KDA ${fr(c.kda, 2)}` },
          champIcon(c.id, 44), h('small', null, `${c.games} g`), h('small', { class: (c.wins || 0) / c.games >= 0.5 ? 'good' : 'bad' }, `${fr((c.wins || 0) / c.games * 100, 0)} %`))))]
        : h('p', { class: 'muted small' }, 'Pas encore de games classées ce split.')) : null;
    const games = (x.games || []).filter(Boolean);
    const box = h('div', { class: 'prof-pop', onclick: (e) => { if (e.target === box) close(); } },
      h('div', { class: 'prof-card pf-wide' },
        h('div', { class: 'prof-ban', style: banner ? `background-image:url('${banner}')` : '' }),
        h('div', { class: 'prof-body' },
          h('div', { class: 'prof-name', style: x.color ? `color:${x.color}` : '' }, vocalName(slug), stDot(slug), roleBadge(slug)),
          h('div', { class: 'muted small' }, (p ? (p.role || roleOf(p).label) + ' · ' : coachOf(slug) ? 'Coach · ' : '') + (x.game ? '🎮 En game' : (ST_LABEL[x.st] || ST_LABEL.offline).join(' '))),
          x.bio ? h('p', { class: 'prof-bio' }, x.bio) : null,
          games.length ? h('div', { class: 'pf-games' }, h('small', { class: 'muted' }, 'Ses jeux'), h('div', { class: 'pf-gl' }, games.map((g) => h('span', { class: 'pf-g' }, gameIco(g) + ' ' + g)))) : null,
          lol,
          load('fire.unotes', {})[slug] ? h('p', { class: 'prof-note' }, h('small', { class: 'muted' }, '📝 Ta note (visible seulement par toi)'), h('br'), load('fire.unotes', {})[slug]) : null,
          h('div', { class: 'row' },
            canDm ? h('button', { class: 'btn-fire small-btn', onclick: () => { close(); CH.conv = slug; go('chat'); } }, '💬 Message privé') : slug !== me ? h('span', { class: 'muted small' }, '🔒 Ne reçoit pas de messages privés') : null,
            p ? h('button', { class: 'btn-ghost', onclick: () => { close(); go('stats'); openPlayer(slug); } }, '📊 Toutes ses stats') : null,
            slug === me ? h('button', { class: 'btn-ghost', onclick: () => { close(); S.setTab = 'profil'; S.setSub = 'carte'; go('settings'); } }, '✏️ Modifier mon profil') : null,
            h('button', { class: 'btn-ghost', onclick: close }, 'Fermer')))));
    document.body.append(box);
  }

  // ----- Recherche rapide (Ctrl+K) et Ctrl+1…9 pour changer de page, comme dans Discord -----
  const QS = { el: null, q: '', i: 0 };
  function qsItems() {
    const out = [];
    const add = (ico, label, sub, run) => out.push({ ico, label, sub, run });
    document.querySelectorAll('.navbtn').forEach((b) => { const id = b.dataset.sec || b.getAttribute('data-id'); const t = (b.querySelector('.v2-lab') || b).textContent.replace(/\d+$/, '').trim(); if (t) add('📄', t, 'Page', () => b.click()); });
    S.players.filter((p) => p.slug).forEach((p) => add(roleOf(p).ico, String(p.pseudo).split('#')[0], 'Stats du joueur', () => { go('stats'); openPlayer(p.slug); }));
    S.players.concat(S.coachs || []).filter((p) => p.slug && p.slug !== vocalMe()).forEach((p) => add('💬', 'Message à ' + String(p.pseudo).split('#')[0], 'Message privé', () => { CH.conv = p.slug; go('chat'); }));
    CHANNELS.forEach(([id, ico, l]) => add(ico, '#' + l, 'Salon de discussion', () => { CH.conv = id; go('chat'); }));
    [['tier', 'Tier list'], ['matchup', 'Matchups'], ['otp', 'One-tricks'], ['puzzle', 'Puzzles de draft'], ['live', 'Draft en direct']].forEach(([k, l]) => add('⚡', l, 'Draft', () => { S.drTab = k; go('draft'); }));
    JMODES.concat(LMODES, QMODES).forEach(([k, l]) => add('🎮', l.replace(/^\S+\s/, ''), 'Détente', () => { go('jeux'); J.home = false; J.tab = k; render(); }));
    SET_TABS.forEach(([k, ico, l]) => add(ico, l, 'Paramètres', () => { S.setTab = k; go('settings'); }));
    THEMES.forEach(([id, l]) => add('🎨', 'Thème ' + l, 'Thème', () => { save('fire.theme', id); applyTheme(id); if (S.section === 'settings') renderSettings(); }));
    return out;
  }
  function qsOpen() {
    if (QS.el) { QS.el.querySelector('input').focus(); return; }
    QS.q = ''; QS.i = 0;
    const list = h('div', { class: 'qs-list' });
    const norm = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const items = qsItems();
    const paint = () => {
      const q = norm(QS.q);
      const res = (q ? items.filter((x) => norm(x.label + ' ' + x.sub).includes(q)) : items.filter((x) => x.sub === 'Page')).slice(0, 12);
      QS.res = res; QS.i = Math.min(QS.i, Math.max(0, res.length - 1));
      list.replaceChildren(...(res.length ? res.map((x, i) => h('button', { class: 'qs-it' + (i === QS.i ? ' on' : ''), onmouseenter: () => { QS.i = i; paint(); }, onclick: () => pickIt(x) },
        h('span', { class: 'qs-ico' }, x.ico), h('b', null, x.label), h('small', { class: 'muted' }, x.sub))) : [h('p', { class: 'muted small qs-none' }, 'Rien trouvé.')]));
    };
    const close = () => { if (QS.el) QS.el.remove(); QS.el = null; };
    const pickIt = (x) => { close(); try { x.run(); } catch (e) { console.error(e); } };
    const inp = h('input', { class: 'inp qs-inp', placeholder: 'Où veux-tu aller ? Une page, un joueur, un jeu, un réglage…', oninput: (e) => { QS.q = e.target.value; QS.i = 0; paint(); } });
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); QS.i = Math.min((QS.res || []).length - 1, QS.i + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); QS.i = Math.max(0, QS.i - 1); paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); const x = (QS.res || [])[QS.i]; if (x) pickIt(x); }
    });
    QS.el = h('div', { class: 'qs', onmousedown: (e) => { if (e.target === QS.el) close(); } },
      h('div', { class: 'qs-box' }, inp, list, h('p', { class: 'muted small qs-help' }, '↑↓ pour choisir · Entrée pour ouvrir · Échap pour fermer · Ctrl+1 à 9 : pages du menu')));
    document.body.append(QS.el);
    paint();
    setTimeout(() => inp.focus(), 0);
  }
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
    if (e.key === 'k' || e.key === 'K') { e.preventDefault(); qsOpen(); return; }
    if (/^[1-9]$/.test(e.key) && !$('app').hidden) {
      const btns = [...document.querySelectorAll('.navbtn')];
      const b = btns[Number(e.key) - 1];
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  function chatInit() {
    if (CH.started || !window.fire.chat) return;
    CH.started = true;
    try { if (FV() && FV().onChat) FV().onChat((m) => chatMerge([m], true)); } catch (e) { /* */ }
    applySalons(SAL.data);
    chatLoad(); salonsLoad(); membresLoad(); pendingRetry();
    setInterval(() => { chatLoad(); salonsLoad(); membresLoad(); pendingRetry(); subPush(); }, 2 * 60 * 1000);
    setTimeout(subPush, 20000);
    if (FV().onRemp) FV().onRemp(subRecv);
    if (window.fire.parties && window.fire.parties.onNew) window.fire.parties.onNew((id) => { setTimeout(() => rvAutoShare(id), 25000); RV.list = null; if (S.section === 'revue' && !RV.g) renderRevue(); vocalToast('🎞️ Partie enregistrée : revois-la dans Outils › Revue de parties', true); });
    // Statut : envoyé tout de suite, puis chaque minute ; les cartes reçues sont gardées.
    setTimeout(statusPush, 4000);
    setInterval(() => { statusPush(); profilesKeep(); chatPaint(); }, 60000);
    // Les cartes reçues sont gardées au plus toutes les 10 s (le vocal prévient très souvent : on ne relit pas tout à chaque fois).
    try { let t = 0; FV().onChange(() => { if (Date.now() - t > 10000) { t = Date.now(); profilesKeep(); } }); } catch (e) { /* */ }
    // Mode streamer automatique : FIRE regarde si OBS ou Streamlabs est ouvert.
    if (window.fire.streamer) {
      window.fire.streamer.on((v) => { STREAM.detected = v; applyUx(); chatPaint(); if (S.section === 'settings' && !typing()) renderSettings(); });
      if (UX.streamer === 'auto') window.fire.streamer.watch(true).then((v) => { STREAM.detected = !!v; applyUx(); }).catch(() => {});
    }
    chatPaint();
  }


  // ===== Nouveaux membres : « Qui es-tu ? » → lien dpm.lol, rôle ; validé par le créateur, un coach ou le chef d'équipe =====
  // En attendant, le profil du nouveau se charge chez lui (ses stats, sa carte) ; les autres le voient une fois accepté.
  const roleIdOf = (role) => ({ top: 'top', jungle: 'jungle', mid: 'mid', adc: 'adc', support: 'support' })[String(role || '').split(' ')[0].toLowerCase()] || 'mid';

  // ===== Remplaçants : code à part, accès limité =====
  // Avec le code remplaçant, FIRE n'a pas la clé de l'équipe : fiches du coach, pools, discussion et planning complet
  // restent chiffrés et illisibles. Les titulaires leur envoient de PC à PC un petit paquet chiffré pour eux :
  // les séances du planning d'équipe (sans les dispos des coachs ni les réponses de chacun).
  const SUB = () => !!(S.coachState && S.coachState.remplacant);
  const SUB_OK = new Set(['stats', 'planning', 'jeux', 'puzzle', 'train', 'clips', 'vocal', 'worlds', 'lolpatch', 'patch', 'settings', 'web', 'outils']);
  const roomOk = (r) => !SUB() || (r && r.id !== 'coaching' && !r.staff);
  const subSlugs = () => S.players.filter((p) => p.slug && isSub(p)).map((p) => p.slug);
  function subInit() {
    if (S.subInit) return; S.subInit = true;
    document.documentElement.classList.add('sub-mode');
    if (!S.moi || !S.players.some((p) => p.slug === S.moi && isSub(p))) { S.moi = null; save('fire.moi', null); setTimeout(() => askWho(), 300); }
    loadPlanning();
  }
  function subBanner() {
    return h('div', { class: 'card sub-banner' }, h('b', null, '🔁 Accès remplaçant'),
      h('p', { class: 'muted small' }, 'Tu as tes stats, le planning des séances, le vocal (salon de l’équipe et duos), les quiz et « Deviner le champion », les clips, l’e-sport et les patchs. Le reste est réservé aux titulaires.'));
  }
  function subHub(start) {
    const me = S.players.find((p) => p.slug === S.moi);
    return [h('h2', { class: 'hub-sec subs' }, h('span', null, '📊 Mes stats')),
      me ? h('div', { class: 'hub-grid' + (S.hubMore ? '' : ' compact') }, hubCard(me, start)) : h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Choisis ton pseudo pour voir tes stats.'), h('button', { class: 'btn-fire small-btn', onclick: () => askWho() }, 'Qui es-tu ?'))];
  }
  function renderPlanningSub(view) {
    const t = todayYmd();
    const mon = S.planWeek || mondayOf(t); S.planWeek = mon;
    const days = weekDays(mon);
    const b = load('fire.remp', null);
    const planned = days.filter((d) => S.plan && S.plan.jours[d]);
    view.replaceChildren(h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🗓️'), h('div', null, h('h1', { class: 'title' }, 'Planning'),
      h('p', { class: 'muted' }, 'Les séances de l’équipe. Tu n’as rien à remplir : le coach te préviendra s’il a besoin de toi.'))),
      h('div', { class: 'row plan-nav' },
        h('button', { class: 'btn-ghost', onclick: () => { S.planWeek = addDays(mon, -7); render(); } }, '←'),
        h('b', { class: 'plan-week' }, `Semaine du ${dayFr(days[0], { day: 'numeric', month: 'long' })} au ${dayFr(days[6], { day: 'numeric', month: 'long' })}`),
        h('button', { class: 'btn-ghost', onclick: () => { S.planWeek = addDays(mon, 7); render(); } }, '→'),
        mon !== mondayOf(t) ? h('button', { class: 'chip', onclick: () => { S.planWeek = mondayOf(t); render(); } }, "Aujourd'hui") : null),
      !b ? h('p', { class: 'muted small' }, '⏳ Le planning arrive dès qu’un titulaire a FIRE ouvert en même temps que toi.') : h('p', { class: 'muted small' }, `Mis à jour ${dayFrT(b.at)} à ${hm(b.at)}.`),
      ...(planned.length ? planned.map((d) => { const j = S.plan.jours[d]; const type = PLAN_TYPES.find((x) => x[0] === j.type) || PLAN_TYPES[0];
        return h('div', { class: 'card plan-day' + (d < t ? ' past' : '') + (d === t ? ' today' : '') }, h('div', { class: 'plan-head' }, h('div', null,
          h('div', { class: 'plan-date' }, cap(dayFr(d)), d === t ? h('span', { class: 'plan-tag' }, "aujourd'hui") : null, j.note ? h('span', { class: 'plan-note' }, '📝 ' + j.note) : null),
          h('div', { class: 'plan-hours' }, '🕒 ', hourBlocks(j.heures), h('span', { class: 'plan-type' }, type[1]))))); })
        : [h('div', { class: 'card plan-empty' }, h('p', { class: 'muted' }, 'Rien de prévu cette semaine.'))]));
  }
  // Titulaire : envoie le paquet des remplaçants à ceux qui ont FIRE ouvert.
  async function subPush() {
    if (SUB() || !S.plan || !window.fire.staff || !window.fire.staff.rempSeal || !FV().hallSend) return;
    const subs = subSlugs().filter((x) => x !== vocalMe());
    if (!subs.length) return;
    const t = addDays(todayYmd(), -7), jours = {};
    for (const [d, j] of Object.entries(S.plan.jours || {})) if (d >= t) jours[d] = { heures: j.heures, type: j.type, note: j.note || '' };
    const box = await window.fire.staff.rempSeal({ at: Date.now(), planning: { jours } }).catch(() => null);
    if (!box) return;
    for (const x of subs) FV().hallSend(x, { t: 'remp', box }).catch(() => {});
  }
  // Remplaçant : reçoit le paquet d'un titulaire ou d'un coach.
  async function subRecv(from, box) {
    if (!SUB()) return;
    const sender = S.players.find((p) => p.slug === from);
    if (!(sender && !isSub(sender)) && !(S.coachs || []).some((c) => c.slug === from) && from !== 'coach') return;
    const b = await window.fire.staff.rempOpen(box).catch(() => null);
    if (!b || !b.planning) return;
    const cur = load('fire.remp', null);
    if (cur && cur.at >= b.at) return;
    save('fire.remp', b);
    loadPlanning();
  }

  function membresMerge(list, prune) {
    // Liste fraîche du serveur : un membre retiré ou dont le lien a été corrigé disparaît sous son ancien identifiant.
    if (prune) S.players = S.players.filter((p) => !p.nouveau || (list || []).some((m) => m.slug === p.slug && m.statut === 'ok'));
    const known = new Set(S.players.map((p) => p.slug));
    for (const m of (list || []).filter((x) => x.statut === 'ok')) {
      if (known.has(m.slug)) continue;
      S.players.push({ slug: m.slug, pseudo: m.pseudo, role: m.role, role_id: roleIdOf(m.role), nouveau: true });
      known.add(m.slug);
    }
    // Ma demande en attente : mon profil se charge pour moi seul.
    const pend = load('fire.pending', null);
    if (pend && pend.slug && !known.has(pend.slug)) S.players.push({ slug: pend.slug, pseudo: pend.pseudo, role: pend.role, role_id: roleIdOf(pend.role), pending: true });
  }
  const NM = { list: load('fire.membres', []), loading: false, seen: load('fire.membres.vus', []) };
  async function membresLoad() {
    if (!window.fire.staff || !window.fire.staff.membres || NM.loading) return;
    NM.loading = true;
    let r; try { r = await window.fire.staff.membres(); } catch (e) { r = null; }
    NM.loading = false;
    if (!r || !r.ok) return;
    NM.list = r.membres || []; save('fire.membres', NM.list);
    const before = S.players.map((p) => p.slug).join('|');
    const pend = load('fire.pending', null);
    if (pend) {
      const mine = NM.list.find((m) => m.slug === pend.slug);
      if (mine && mine.statut === 'ok') { save('fire.pending', null); const pl = S.players.find((p) => p.slug === pend.slug); if (pl) { delete pl.pending; pl.role = mine.role; pl.role_id = roleIdOf(mine.role); } popup('🎉 Bienvenue dans l’équipe !', `Ton profil a été validé${mine.par ? ' par ' + vocalName(mine.par) : ''}. Toute l’équipe te voit maintenant.`, 'stats'); }
      if (mine && mine.statut === 'refus') { popup('Demande refusée', 'Le staff n’a pas validé ta demande. Parles-en à un coach ou au chef d’équipe.', null); }
    }
    membresMerge(NM.list, true);
    // Staff : une nouvelle demande arrive → notification.
    const waiting = NM.list.filter((m) => m.statut === 'attente');
    if (isStaff()) {
      const fresh = waiting.filter((m) => !NM.seen.includes(m.slug));
      if (fresh.length) { notifyDesk('coach', '🆕 Demande pour rejoindre l’équipe', `${fresh.map((m) => m.pseudo).join(', ')} attend ta validation dans le carnet de bord.`, 'carnet'); NM.seen = NM.seen.concat(fresh.map((m) => m.slug)).slice(-100); save('fire.membres.vus', NM.seen); }
    }
    if (S.players.map((p) => p.slug).join('|') !== before) { refreshAll(); }
    renderNav();
    if (S.section === 'carnet' && STF.tab === 'demandes' && !typing()) renderCarnet();
  }
  const pendingCount = () => (isStaff() ? NM.list.filter((m) => m.statut === 'attente').length : 0);
  // Lien dpm.lol (ou Riot ID « Pseudo#TAG ») → identifiant dpm.lol et pseudo.
  function dpmParse(txt) {
    let t = String(txt || '').trim();
    if (!t) return null;
    let slug = '';
    const m = t.match(/dpm\.lol\/(?:[a-z]{2}\/)?([^?#]+)/i);
    if (m) slug = m[1].replace(/\/+$/, '').split('/')[0];
    else if (/#/.test(t)) { const j = t.lastIndexOf('#'); const n = t.slice(0, j), tag = t.slice(j + 1); if (!n.trim() || !tag.trim()) return null; slug = encodeURIComponent(n.trim()) + '-' + encodeURIComponent(tag.trim()); }
    else return null;
    let dec = slug; try { dec = decodeURIComponent(slug); } catch (e) { /* */ }
    const i = dec.lastIndexOf('-');
    if (i < 1) return null;
    const name = dec.slice(0, i).trim(), tag = dec.slice(i + 1).trim();
    if (!name || !tag) return null;
    // Toujours la même forme que dpm.lol (espaces et accents encodés), sinon le profil est introuvable.
    return { slug: encodeURIComponent(name) + '-' + encodeURIComponent(tag), pseudo: name + '#' + tag };
  }
  function askNew(prev, pre) {
    const box = h('div', { class: 'who' });
    const st = { link: pre ? 'https://dpm.lol/' + pre.slug : '', role: pre ? String(pre.role || 'Mid').split(' ')[0] : 'Mid', sub: !!(pre && /Rempla/.test(pre.role || '')), note: (pre && pre.note) || '', err: '', busy: false };
    const paint = () => {
      const parsed = dpmParse(st.link);
      box.replaceChildren(h('div', { class: 'who-card nm-card' },
        h('div', { class: 'who-t' }, '🆕 Rejoindre l’équipe'),
        h('p', { class: 'muted' }, 'Colle le lien de ton profil dpm.lol (ou ton Riot ID « Pseudo#TAG »). Ton profil se charge tout de suite pour toi. Le créateur, un coach ou le chef d’équipe le valide ensuite pour toute l’équipe.'),
        h('label', { class: 'fld' }, h('span', null, 'Ton lien dpm.lol'), h('input', { class: 'inp', placeholder: 'https://dpm.lol/Pseudo-TAG', value: st.link, oninput: (e) => { st.link = e.target.value; st.err = ''; const k = document.querySelector('.nm-who'); const pp = dpmParse(st.link); if (k) k.textContent = pp ? '✓ ' + pp.pseudo : ''; } })),
        h('div', { class: 'nm-who good small' }, parsed ? '✓ ' + parsed.pseudo : ''),
        h('label', { class: 'fld' }, h('span', null, 'Ton poste'), h('div', { class: 'row ux-seg' }, ['Top', 'Jungle', 'Mid', 'ADC', 'Support'].map((r) => h('button', { class: 'chip', 'aria-pressed': String(st.role === r), onclick: () => { st.role = r; paint(); } }, (FC.ROLES[roleIdOf(r)] || {}).ico + ' ' + r)))),
        h('label', { class: 'nrow' }, h('input', { type: 'checkbox', checked: st.sub ? true : null, onchange: (e) => { st.sub = e.target.checked; } }), h('span', null, 'Je suis remplaçant')),
        h('label', { class: 'fld' }, h('span', null, 'Un mot pour le staff (facultatif)'), h('input', { class: 'inp', maxlength: 140, value: st.note, placeholder: 'Ex. : je suis le pote de Frost, main ADC', oninput: (e) => { st.note = e.target.value; } })),
        st.err ? h('p', { class: 'bad small' }, '⚠ ' + st.err) : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn-fire small-btn', disabled: st.busy ? true : null, onclick: async () => {
            const pp = dpmParse(st.link);
            if (!pp) { st.err = 'Colle un lien dpm.lol (ex. https://dpm.lol/Pseudo-TAG) ou ton Riot ID Pseudo#TAG.'; paint(); return; }
            if (S.players.some((p) => p.slug === pp.slug && !p.pending)) { st.err = 'Ce joueur est déjà dans l’équipe : choisis-le dans la liste.'; paint(); return; }
            st.busy = true; paint();
            const role = st.role + (st.sub ? ' (Remplaçant)' : '');
            const r = await window.fire.staff.demande({ slug: pp.slug, pseudo: pp.pseudo, role, note: st.note, old: pre && pre.slug !== pp.slug ? pre.slug : '' }).catch((e) => ({ ok: false, error: String(e) }));
            if (pre && pre.slug !== pp.slug) { S.players = S.players.filter((x) => !(x.pending && x.slug === pre.slug)); delete S.data[pre.slug]; delete S.status[pre.slug]; }
            st.busy = false;
            // Même sans réseau, le profil se charge chez lui : la demande repartira à la prochaine ouverture.
            save('fire.pending', { slug: pp.slug, pseudo: pp.pseudo, role, note: st.note, sent: !!(r && r.ok) });
            save('fire.moi.demande', true);
            S.moi = pp.slug; save('fire.moi', pp.slug);
            membresMerge([]);
            box.remove();
            popup('⏳ Demande envoyée', (r && r.ok) ? 'Ton profil se charge. Il sera visible par toute l’équipe dès qu’un membre du staff l’aura validé.' : 'Ton profil se charge. La demande sera renvoyée automatiquement (' + ((r && r.error) || 'hors ligne') + ').', 'stats');
            refreshAll(); go('stats');
          } }, st.busy ? 'Envoi…' : '✅ Envoyer ma demande'),
          h('button', { class: 'btn-ghost', onclick: () => { box.remove(); if (prev) askWho(); } }, '← Retour'))));
    };
    paint();
    document.body.append(box);
  }
  // Demande pas encore partie (hors ligne au moment de l'envoi) : on la renvoie.
  async function pendingRetry() {
    const pend = load('fire.pending', null);
    if (!pend || pend.sent || !window.fire.staff) return;
    const r = await window.fire.staff.demande(pend).catch(() => null);
    if (r && r.ok) save('fire.pending', { ...pend, sent: true });
  }

  function askWho() {
    if (document.querySelector('.who')) return;
    const close = (slug) => {
      save('fire.moi.demande', true);
      if (slug) { S.moi = slug; save('fire.moi', slug); }
      box.remove();
      render();
    };
    const box = h('div', { class: 'who' }, h('div', { class: 'who-card' },
      h('div', { class: 'who-t' }, '👋 Qui es-tu ?'),
      h('p', { class: 'muted' }, 'Choisis ton pseudo : l’app te reconnaîtra, et dans POOL un seul bouton « ✏️ Faire ma tierlist » suffira. Tu pourras changer plus tard.'),
      h('div', { class: 'who-grid' }, S.players.filter((x) => x.slug && !x.pending && (!SUB() || isSub(x))).map((p) => h('button', { class: 'who-p', onclick: () => close(p.slug) },
        h('span', { class: 'who-ico' }, roleOf(p).ico), h('span', { class: 'who-n' }, String(p.pseudo).split('#')[0]), h('span', { class: 'muted small' }, p.role || roleOf(p).label))),
        (SUB() ? [] : (S.coachs || [])).map((c) => h('button', { class: 'who-p coach', onclick: () => close(c.slug) },
          h('span', { class: 'who-ico' }, '🎓'), h('span', { class: 'who-n' }, c.pseudo), h('span', { class: 'muted small' }, 'Coach')))),
      h('div', { class: 'row' }, SUB() ? null : h('button', { class: 'btn-fire small-btn', onclick: () => { box.remove(); askNew(true); } }, '🆕 Je ne suis pas dans la liste'), h('button', { class: 'btn-ghost', onclick: () => close(null) }, 'Plus tard'))));
    document.body.append(box);
  }

  function renderPool() {
    const view = $('view');
    const weeks = S.pools || [];
    if (S.poolEdit) { renderPoolEditor(view); return; }
    const cur = currentWeek();
    let wid = S.poolWeek;
    if (!wid || (wid !== 'config' && !weeks.some((w) => w.id === wid))) wid = cur ? cur.id : (weeks.length ? weeks[weeks.length - 1].id : 'config');
    const w = wid === 'config' ? null : weeks.find((x) => x.id === wid);
    const prev = w ? weeks.filter((x) => x.debut < w.debut).pop() : null;
    const rng = weekRange(w);
    const coach = S.coachState.coach;

    const nodes = [h('header', { class: 'sec-hero pool-hero' },
      h('div', { class: 'sec-ico' }, '🧙'),
      h('div', null, h('h1', { class: 'title' }, 'POOL'),
        h('p', { class: 'muted' }, '🎯 Obligatoires : comptent pour l\'objectif · ⭐ Maîtrisés : ses champions sûrs · 🛠️ À travailler : en apprentissage · ❔ Autres : le reste')))];
    if (S.flash) nodes.push(h('div', { class: 'flash' }, S.flash, h('button', { class: 'flash-x', onclick: () => { S.flash = ''; render(); } }, '✕')));
    if (S.poolsErr) nodes.push(h('p', { class: 'muted small' }, '⚠ ' + S.poolsErr));

    nodes.push(h('div', { class: 'row me-row' }, h('label', { class: 'fld-inline' }, '👤 Je suis ', meSelect()),
      !coach && S.moi && !S.poolWrite ? h('span', { class: 'muted small' }, "Le coach n'a pas encore ouvert l'écriture des tierlists aux joueurs.") : null,
      !coach && S.moi && S.poolWrite && !S.cardEdit ? h('button', { class: 'btn-fire big-cta', onclick: () => editMine(w) }, '✏️ Faire ma tierlist') : null,
      !coach && !S.moi ? h('span', { class: 'muted small' }, '← choisis ton pseudo pour faire ta tierlist') : null));

    const chips = weeks.slice().reverse().map((x) => h('button', { class: 'chip', 'aria-pressed': String(x.id === wid), onclick: () => { S.poolWeek = x.id; S.confirm = null; S.cardEdit = null; render(); } },
      weekLabel(x) + (cur && x.id === cur.id ? ' · en cours' : x.debut > todayYmd() ? ' · à venir' : '')));
    if (!weeks.length) chips.push(h('button', { class: 'chip', 'aria-pressed': 'true' }, 'Pool actuel'));
    const tools = [];
    if (coach) {
      tools.push(h('button', { class: 'btn-fire small-btn', onclick: () => startPoolEdit(null) }, '➕ Nouvelle semaine'));
      if (w) {
        tools.push(h('button', { class: 'btn-ghost', onclick: () => startPoolEdit(w) }, '✏️ Modifier la semaine'));
        const c = S.confirm === 'delpool:' + w.id;
        tools.push(h('button', { class: c ? 'btn-danger' : 'btn-ghost', onclick: async () => {
          if (!c) { S.confirm = 'delpool:' + w.id; render(); return; }
          S.confirm = null;
          actLog('pool', 'Semaine de pool supprimée');
          const r = await window.fire.coach.savePools({ type: 'delete', id: w.id });
          S.flash = r.ok ? 'Semaine supprimée.' : 'Suppression impossible : ' + r.error;
          if (r.ok) { S.pools = r.semaines; S.poolWeek = null; applyWeek(); }
          render();
        } }, c ? 'Confirmer la suppression' : 'Supprimer'));
      }
      if (S.coachState.claude) tools.push(h('button', { class: 'btn-ghost', onclick: () => prepareAnalysis(w, rng) }, '🧠 Analyse avec Claude'));
    }
    nodes.push(h('div', { class: 'chips' }, chips), tools.length ? h('div', { class: 'row' }, tools) : null);

    const obj = w ? (w.objectif ? { debut: w.debut, games: w.objectif, fin: rng.fin } : null) : (S.cfgObj ? { ...S.cfgObj } : null);
    nodes.push(h('div', { class: 'card week-banner' + ((S.poolFresh || []).length ? ' is-new' : '') },
      (S.poolFresh || []).length ? h('span', { class: 'new-tag wb-new' }, (S.poolFresh || []).some((x) => x.startsWith('week:')) ? 'Nouvelle semaine' : 'Mis à jour') : null,
      h('div', { class: 'wb-main' },
        h('div', { class: 'wb-big' }, obj && obj.games ? String(obj.games) : '—'),
        h('div', null, h('div', { class: 'wb-t' }, w ? `${weekLabel(w)}${rng.fin ? ' → ' + dateFr(rng.fin) : ''}` : `Depuis le ${obj ? dateFr(obj.debut) : '—'}`),
          h('div', { class: 'muted small' }, obj && obj.games ? 'games à jouer sur les champions 🎯 obligatoires, réparties comme chacun veut' : 'pas d\'objectif de games'))),
      w && w.note ? h('div', { class: 'wb-note md' }, md(w.note)) : null,
      !w ? h('p', { class: 'muted small' }, coach ? 'Aucune tierlist publiée : crée la première semaine avec « Nouvelle semaine ».' : 'Pas encore de tierlist publiée : voici le pool de départ et son analyse.') : null));

    // Accès direct : un clic sur un pseudo amène à sa carte (la barre reste en haut pendant le défilement).
    const poolPlayers = S.players.filter((x) => x.slug);
    nodes.splice(1, 0, h('nav', { class: 'pool-jump', 'aria-label': 'Aller au joueur' }, poolPlayers.map((p) => h('button', { class: 'pj-btn' + (S.moi === p.slug ? ' me' : ''),
      onclick: () => { const el = document.getElementById('pool-' + p.slug); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
      h('span', { class: 'pj-ico' }, roleOf(p).ico), p.pseudo.split('#')[0]))));
    for (const p of poolPlayers) nodes.push(poolCard(p, w, prev, rng, obj));
    view.replaceChildren(...nodes.filter(Boolean));
  }

  function tierLabel(k) {
    return h('div', { class: 'tier tl' + k }, h('span', { class: 'tier-ico' }, TI[k].ico), h('span', null, TI[k].label), h('small', null, k === 'O' ? "compte pour l'objectif" : k === 'M' ? 'ses champions sûrs' : 'en apprentissage'));
  }

  function wrBar(c) {
    const pct = c.games ? Math.max(4, Math.min(100, c.wr)) : 0;
    return h('div', { class: 'wrbar' }, h('i', { class: c.games ? (c.wr >= 50 ? 'ok' : 'ko') : '', style: `width:${pct}%` }), h('span', { class: 'wr50' }));
  }

  function champCard(c, small) {
    const v = c.verdict || FC.verdict(c);
    return h('div', { class: `ccard v-${v.kind}${small ? ' small' : ''}` },
      h('div', { class: 'cc-top' }, champIcon(c.id, small ? 36 : 46),
        h('div', { class: 'cc-name' }, h('b', null, c.champion, c.oblig && c.maitrise ? h('span', { class: 'mini-tag', title: 'Obligatoire et maîtrisé' }, ' 🎯⭐') : null),
          h('span', { class: 'verdict v-' + v.kind }, `${v.ico} ${v.txt}`))),
      c.games ? h('div', { class: 'cc-wr' }, h('span', { class: 'cc-pct ' + (c.wr >= 50 ? 'good' : 'bad') }, `${fr(c.wr)} %`), h('span', { class: 'muted small' }, `${c.wins} V – ${c.losses} D`)) : h('div', { class: 'cc-wr muted small' }, 'Pas joué sur la période'),
      wrBar(c),
      c.games && !small ? h('div', { class: 'cc-stats' },
        h('span', null, h('small', null, 'KDA'), h('b', null, fr(c.kda, 2))),
        h('span', null, h('small', null, 'CS/min'), h('b', null, fr(c.cs_min, 1))),
        h('span', null, h('small', null, 'Golds @15'), h('b', { class: c.gold15 > 0 ? 'good' : c.gold15 < 0 ? 'bad' : '' }, sg(c.gold15)))) : null,
      c.split && !small ? h('div', { class: 'muted small' }, `Ce split : ${c.split.games} games · ${fr(c.split.wr)} %`) : null);
  }

  function catBar(t) {
    const tot = t.oblig + t.maitrise + (t.travail || 0) + t.autres;
    if (!tot) return null;
    const seg = (n, cls, lab) => n ? h('i', { class: cls, style: `flex:${n}`, title: `${lab} : ${n}` }, n) : null;
    return h('div', { class: 'catbar-wrap' },
      h('div', { class: 'catbar' }, seg(t.oblig, 'c-o', 'Obligatoires'), seg(t.maitrise, 'c-m', 'Maîtrisés'), seg(t.travail || 0, 'c-t', 'À travailler'), seg(t.autres, 'c-a', 'Autres')),
      h('div', { class: 'catleg' }, h('span', null, h('i', { class: 'c-o' }), `🎯 ${t.oblig} obligatoire${t.oblig > 1 ? 's' : ''}`),  h('span', null, h('i', { class: 'c-m' }), `⭐ ${t.maitrise} maîtrisé${t.maitrise > 1 ? 's' : ''}`), t.travail ? h('span', null, h('i', { class: 'c-t' }), `🛠️ ${t.travail} à travailler`) : null, h('span', null, h('i', { class: 'c-a' }), `❔ ${t.autres} autre${t.autres > 1 ? 's' : ''}`)));
  }

  function alertPills(notes) {
    if (!notes || !notes.length) return null;
    return h('div', { class: 'apills' }, notes.map((n) => h('div', { class: 'apill k-' + n.kind }, h('span', { class: 'apill-ico' }, n.ico || '•'), h('span', null, n.text))));
  }

  function cardTiers(p, w) {
    const raw = w ? (w.joueurs || {})[p.slug] : null;
    const cfgT = { O: [...((p._cfg && p._cfg.pool_ids) || p.pool_ids || [])], M: [...((p._cfg && p._cfg.maitrise_ids) || [])], T: [...((p._cfg && p._cfg.travail_ids) || [])] };
    return (w && FC.normTiers(raw)) || cfgT;
  }

  function editMine(w) {
    const p = S.players.find((x) => x.slug === S.moi);
    if (!p) return;
    const t = cardTiers(p, w);
    S.cardEdit = { slug: p.slug, O: [...t.O], M: [...t.M], T: [...(t.T || [])] };
    S.pickQ = ''; S.pickRow = 'O';
    render();
    later(() => { const el = document.querySelector('.pool-card.editing'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  }

  function poolCard(p, w, prev, rng, obj) {
    const R = roleOf(p);
    const raw = w ? (w.joueurs || {})[p.slug] : null;
    const tiers = cardTiers(p, w);
    const fallback = !!w && !raw;
    const d = S.data[p.slug];
    const editing = S.cardEdit && S.cardEdit.slug === p.slug;
    const mine = S.moi === p.slug;
    const head = h('div', { class: 'pc-head' },
      h('div', { class: 'pc-who' }, h('span', { class: 'pc-ico' }, R.ico), h('div', null, h('div', { class: 'pname' }, p.pseudo, mine ? h('span', { class: 'me-tag' }, "C'est toi") : null), h('div', { class: 'muted small' }, p.role || R.label))),
      raw && raw.par === 'joueur' ? h('span', { class: 'tag' }, `✍️ faite par le joueur${raw.maj ? ' · ' + new Date(raw.maj).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}`) : null,
      !editing && canEdit(p.slug) ? h('button', { class: 'btn-ghost', onclick: () => { S.cardEdit = { slug: p.slug, O: [...(tiers ? tiers.O : [])], M: [...(tiers ? tiers.M : [])], T: [...(tiers && tiers.T ? tiers.T : [])] }; S.pickQ = ''; S.pickRow = 'O'; render(); } }, mine && !S.coachState.coach ? '✏️ Modifier ma tierlist' : '✏️ Modifier') : null);
    if (editing) return h('article', { class: 'card pool-card editing' }, head, cardEditor(p, w));

    const ch = w && prev ? FC.poolChanges((prev.joueurs || {})[p.slug], raw) : null;
    const changes = ch && ch.length ? h('div', { class: 'changes' }, h('span', { class: 'muted small' }, 'Depuis la semaine d’avant :'),
      ch.map((c) => h('span', { class: 'chg ' + (c.type === 'add' ? 'add' : 'del') }, `${c.type === 'add' ? '+' : '−'} ${c.champion} ${TI[c.k].ico}`))) : null;

    const A = d ? FC.poolAnalysis(p, d.matches, d.champs, tiers, rng.start, rng.end) : null;
    const chipOf = (id, k) => {
      const c = A ? (k === 'O' ? A.oblig : k === 'M' ? A.maitrise : [...A.travail, ...A.oblig, ...A.maitrise]).find((x) => x.id === id) : null;
      return h('span', { class: 'pchip' + (c && c.verdict ? ' v-' + c.verdict.kind : '') }, champIcon(id, 34),
        h('span', null, h('b', null, FC.champName(id)), h('span', { class: 'muted small' }, c && c.games ? ` ${c.games} g · ${fr(c.wr)} %` : ' pas joué')));
    };
    const tierRows = h('div', { class: 'tiers' }, TIERS.map((k) => h('div', { class: 'tier-row r' + k }, tierLabel(k),
      h('div', { class: 'tier-chips' }, (tiers[k] || []).length ? tiers[k].map((id) => chipOf(id, k)) : h('span', { class: 'muted small' }, k === 'O' ? 'aucun champion obligatoire' : k === 'M' ? 'aucun champion maîtrisé' : 'aucun champion à travailler')))));
    // Même calcul que « Stats des joueurs » : l'objectif se compte du lundi au dimanche (pas depuis le début de la tierlist),
    // avec les games ajoutées ou retirées par le coach. Semaine passée : sa dernière semaine du lundi au dimanche.
    const objW = (() => {
      if (!obj || !obj.games) return null;
      const ref = rng.fin && rng.fin < todayYmd() ? rng.fin : todayYmd();
      const mon = mondayOf(ref);
      const b = bonusFor(p.slug, mon);
      return { debut: obj.debut && obj.debut > mon ? obj.debut : mon, fin: addDays(mon, 6), games: Math.max(0, (Number(obj.games) || 0) + b), bonus: b };
    })();
    const o = d && objW ? FC.objectif({ ...p, pool_ids: tiers.O }, d.matches, objW) : null;
    if (o) o.bonus = objW.bonus;
    const sup = p.role_id === 'support';
    const group = (title, list, small, empty) => h('div', { class: 'cgroup' }, h('h3', null, title), list.length ? h('div', { class: 'cgrid' + (small ? ' small' : '') }, list.map((c) => champCard(c, small))) : h('p', { class: 'muted small' }, empty));
    // Le détail (répartition, alertes, cartes champion, tableau) est replié : bouton « Détails ».
    S.poolOpen = S.poolOpen || {};
    const open = !!S.poolOpen[p.slug];
    const alerts = A ? A.notes.filter((n) => n.kind === 'bad' || n.kind === 'warn').length : 0;
    const toggle = A ? h('button', { class: 'btn-ghost pool-more' + (open ? ' on' : ''), 'aria-expanded': String(open), onclick: () => { S.poolOpen[p.slug] = !open; render(); } },
      open ? '➖ Masquer les détails' : '➕ Détails', !open && alerts ? h('span', { class: 'pm-n' }, `${alerts} à surveiller`) : null) : null;
    const body = A ? [
      o ? progress(o, true) : null,
      toggle,
      ...(!open ? [] : [catBar({ oblig: A.tot.oblig.games, maitrise: A.tot.maitrise.games, travail: A.tot.travail.games, autres: A.tot.autres.games }),
      alertPills(A.notes),
      group('🎯 Obligatoires', A.oblig, false, 'Aucun champion obligatoire.'),
      group('⭐ Maîtrisés', A.maitrise, false, 'Aucun champion maîtrisé.'),
      A.travail.length ? group('🛠️ À travailler', A.travail, false, '') : null,
      A.autres.length ? group('❔ Autres champions joués', A.autres, true, '') : null,
      h('details', { class: 'more' }, h('summary', null, 'Tableau détaillé'), h('div', { class: 'scroll' }, h('table', { class: 't' },
        h('thead', null, h('tr', null, h('th', { class: 'l' }, 'Champion'), ['Ligne', 'Games', 'V – D', 'Win rate %', 'KDA', sup ? 'Vision' : 'CS/min', 'Golds @15', 'Ce split'].map((x) => h('th', null, x)))),
        h('tbody', null, [...A.oblig.map((c) => ['🎯', c]), ...A.maitrise.map((c) => ['⭐', c]), ...A.travail.map((c) => ['🛠️', c]), ...A.autres.map((c) => ['❔', c])].map(([k, c]) => h('tr', null,
          h('td', { class: 'l' }, h('span', { class: 'tcell' }, champIcon(c.id, 22), c.champion)), h('td', null, k), h('td', null, c.games), h('td', null, c.games ? `${c.wins} – ${c.losses}` : '—'),
          h('td', { class: c.wr == null ? '' : c.wr >= 50 ? 'good' : 'bad' }, fr(c.wr, 1)), h('td', null, fr(c.kda, 2)), h('td', null, sup ? fr(c.vision, 1) : fr(c.cs_min, 1)),
          h('td', { class: c.gold15 > 0 ? 'good' : c.gold15 < 0 ? 'bad' : '' }, sg(c.gold15)), h('td', null, c.split ? `${c.split.games} g · ${fr(c.split.wr)} %` : '—')))))))])
    ] : [h('p', { class: 'muted small' }, 'Lecture des stats sur dpm.lol…')];
    return h('article', { class: 'card pool-card', id: 'pool-' + p.slug }, head, changes,
      fallback ? h('p', { class: 'muted small' }, 'Pas encore de tierlist pour cette semaine : voici son pool de départ.' + (canEdit(p.slug) ? ' Clique sur ✏️ pour la créer.' : '')) : null,
      tierRows, ...body.filter(Boolean));
  }

  // ----- Édition d'une tierlist (joueur pour la sienne, coach pour tout le monde) -----
  // Éditeur de tierlist : on choisit la ligne (🎯 ou ⭐), puis on clique sur les portraits. Rien à taper.
  function tierEditor(t, onChange) {
    const rowsBox = h('div', { class: 'tiers' });
    const grid = h('div', { class: 'pk-grid' });
    const list = ((S.champList && S.champList.list) || []).slice().sort((x, y) => x.name.localeCompare(y.name, 'fr'));
    const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const changed = () => { drawRows(); drawGrid(); if (onChange && onChange !== render) onChange(); };
    function drawRows() {
      rowsBox.replaceChildren(...TIERS.map((k) => h('div', { class: 'tier-row r' + k }, tierLabel(k), h('div', { class: 'tier-chips' },
        (t[k] = t[k] || []).length ? t[k].map((id) => {
          const other = k === 'O' ? 'M' : k === 'M' ? 'O' : null;
          const both = other && t[other].includes(id);
          return h('span', { class: 'pchip edit' }, champIcon(id, 30), h('b', null, FC.champName(id)),
            other ? h('button', { class: 'ibtn' + (both ? ' on' : ''), title: both ? `Retirer de ${TI[other].label}` : `Ajouter aussi en ${TI[other].label}`, onclick: () => { if (both) t[other] = t[other].filter((x) => x !== id); else t[other].push(id); changed(); } }, TI[other].ico) : null,
            h('button', { class: 'ibtn', title: 'Retirer', onclick: () => { t[k] = t[k].filter((x) => x !== id); changed(); } }, '✕'));
        }) : h('span', { class: 'muted small' }, k === 'O' ? 'vide : clique sur des portraits ci-dessous' : 'vide'))))); 
    }
    function drawGrid() {
      const q = norm(S.pickQ);
      const row = S.pickRow || 'O';
      const shown = list.filter((c) => !q || norm(c.name).includes(q) || norm(c.id).includes(q));
      grid.replaceChildren(...(shown.length ? shown.map((c) => {
        const inO = t.O.includes(c.id), inM = t.M.includes(c.id), inT = (t.T || []).includes(c.id);
        return h('button', { class: 'pk' + (inO ? ' inO' : '') + (inM ? ' inM' : '') + (inT ? ' inT' : '') + ((row === 'O' ? inO : row === 'M' ? inM : inT) ? ' sel' : ''), title: c.name,
          onclick: () => { const arr = (t[row] = t[row] || []); if (arr.includes(c.id)) t[row] = arr.filter((x) => x !== c.id); else { arr.push(c.id); if (row === 'T') { t.O = t.O.filter((x) => x !== c.id); t.M = t.M.filter((x) => x !== c.id); } else if (t.T) t.T = t.T.filter((x) => x !== c.id); } changed(); } },
          champIcon(c.id, 48), h('span', { class: 'pk-n' }, c.name), inO || inM || inT ? h('span', { class: 'pk-b' }, (inO ? '🎯' : '') + (inM ? '⭐' : '') + (inT ? '🛠️' : '')) : null);
      }) : [h('p', { class: 'muted small' }, list.length ? 'Aucun champion trouvé.' : 'Chargement des champions…')]));
    }
    const modeBtn = (k, label) => h('button', { class: 'pk-mode m' + k, 'aria-pressed': String((S.pickRow || 'O') === k), onclick: (ev) => {
      S.pickRow = k;
      ev.currentTarget.parentElement.querySelectorAll('.pk-mode').forEach((x) => x.setAttribute('aria-pressed', String(x === ev.currentTarget)));
      drawGrid();
    } }, label);
    const search = h('input', { class: 'inp pk-search', type: 'search', placeholder: '🔎 Chercher un champion…', value: S.pickQ || '' });
    search.addEventListener('input', () => { S.pickQ = search.value; drawGrid(); });
    drawRows(); drawGrid();
    return h('div', { class: 'tier-editor' }, rowsBox,
      h('div', { class: 'pk-bar' }, h('span', { class: 'muted small' }, 'Je clique pour ajouter en :'), modeBtn('O', '🎯 Obligatoires'), modeBtn('M', '⭐ Maîtrisés'), modeBtn('T', '🛠️ À travailler'), search),
      h('p', { class: 'muted small' }, 'Un clic ajoute le champion dans la ligne choisie, un 2e clic l’enlève. Un champion peut être à la fois 🎯 et ⭐ ; un champion 🛠️ à travailler est à part (il ne compte pas pour l’objectif).'),
      grid);
  }

  function cardEditor(p, w) {
    const e = S.cardEdit;
    const debut = w ? w.debut : (currentWeek() ? currentWeek().debut : (S.cfgObj ? S.cfgObj.debut : todayYmd()));
    return h('div', { class: 'card-editor' },
      h('p', { class: 'muted small' }, `Tierlist de ${p.pseudo} pour la semaine du ${dateFr(debut)}. Un champion peut être à la fois 🎯 obligatoire et ⭐ maîtrisé.`),
      tierEditor(e, render),
      h('div', { class: 'row' },
        h('button', { class: 'btn-fire small-btn', disabled: e.busy ? true : null, onclick: async () => {
          e.busy = true; e.err = ''; render();
          actLog('pool', S.moi === p.slug ? 'Tierlist POOL modifiée' : `Tierlist POOL de ${vocalName(p.slug)} modifiée`);
          const r = await window.fire.coach.savePools({ type: 'joueur', slug: p.slug, debut, objectif: (w && w.objectif) || (S.cfgObj && S.cfgObj.games) || 20, tiers: { O: e.O, M: e.M, T: e.T || [] }, par: S.coachState.coach && S.moi !== p.slug ? 'coach' : 'joueur' });
          e.busy = false;
          if (r.ok) { S.pools = r.semaines; S.cardEdit = null; const nw = r.semaines.find((x) => x.debut === debut); if (nw) S.poolWeek = nw.id; S.flash = `Tierlist de ${p.pseudo} enregistrée ✓ Toute l'équipe la verra à sa prochaine ouverture.`; applyWeek(); }
          else e.err = r.error;
          render();
        } }, e.busy ? 'Enregistrement…' : '💾 Enregistrer'),
        h('button', { class: 'btn-ghost', onclick: () => { S.cardEdit = null; render(); } }, 'Annuler'),
        e.err ? h('span', { class: 'bad small' }, '⚠ ' + e.err) : null));
  }

  function startPoolEdit(w) {
    const weeks = S.pools || [];
    const base = w || weeks[weeks.length - 1] || null;
    const joueurs = {};
    for (const p of S.players.filter((x) => x.slug)) {
      const t = FC.normTiers(base && base.joueurs && base.joueurs[p.slug]);
      joueurs[p.slug] = t ? { O: [...t.O], M: [...t.M], T: [...(t.T || [])], par: (base.joueurs[p.slug] || {}).par, maj: (base.joueurs[p.slug] || {}).maj } : { O: [...((p._cfg && p._cfg.pool_ids) || p.pool_ids || [])], M: [...((p._cfg && p._cfg.maitrise_ids) || [])], T: [...((p._cfg && p._cfg.travail_ids) || [])] };
    }
    const debut = w ? w.debut : (base ? addDays(base.debut, 7) : todayYmd());
    S.poolEdit = { id: w ? w.id : null, debut, objectif: (w || base || {}).objectif || (S.cfgObj && S.cfgObj.games) || 20, note: w ? (w.note || '') : '', joueurs, err: '', busy: false };
    if (!S.champList) loadChampions();
    render();
    window.scrollTo(0, 0);
  }

  function renderPoolEditor(view) {
    const e = S.poolEdit;
    const debut = h('input', { type: 'date', value: e.debut });
    debut.addEventListener('change', () => { e.debut = debut.value; });
    const obj = h('input', { type: 'number', class: 'inp num', min: 0, max: 200, value: e.objectif });
    obj.addEventListener('input', () => { e.objectif = obj.value; });
    const note = h('textarea', { class: 'inp', rows: 2, placeholder: 'Consigne de la semaine (facultatif), ex. : 3 games minimum sur chaque champion obligatoire.' });
    note.value = e.note;
    note.addEventListener('input', () => { e.note = note.value; });
    const blocks = S.players.filter((x) => x.slug).map((p) => {
      const t = e.joueurs[p.slug];
      return h('div', { class: 'card pool-card' }, h('div', { class: 'pc-who' }, h('span', { class: 'pc-ico' }, roleOf(p).ico), h('div', { class: 'pname' }, p.pseudo)),
        tierEditor(t, () => { t.par = 'coach'; t.maj = Date.now(); }));
    });
    const save = h('button', { class: 'btn-fire small-btn', disabled: e.busy || !(S.poolWrite || S.coachState.github) ? true : null, onclick: async () => {
      e.busy = true; e.err = ''; render();
      actLog('pool', 'Semaine de pool publiée');
      const r = await window.fire.coach.savePools({ type: 'save', semaine: { id: e.id, debut: e.debut, objectif: e.objectif, note: e.note, joueurs: e.joueurs } });
      e.busy = false;
      if (r.ok) { S.pools = r.semaines; const w = r.semaines.find((x) => x.debut === e.debut); S.poolWeek = w ? w.id : null; S.poolEdit = null; S.flash = 'Semaine publiée ✓ Les joueurs la verront à leur prochaine ouverture.'; applyWeek(); }
      else e.err = r.error;
      render();
    } }, e.busy ? 'Publication…' : "📣 Publier pour l'équipe");
    view.replaceChildren(
      h('header', { class: 'sec-hero pool-hero' }, h('div', { class: 'sec-ico' }, e.id ? '✏️' : '➕'), h('div', null, h('h1', { class: 'title' }, e.id ? 'Modifier la semaine' : 'Nouvelle semaine'),
        h('p', { class: 'muted' }, "🎯 La ligne OBLIGATOIRE compte pour l'objectif. ⭐ MAÎTRISÉS : les champions sûrs du joueur. 🛠️ À TRAVAILLER : ceux qu'il apprend. Un champion peut être 🎯 et ⭐ à la fois."))),
      h('div', { class: 'card composer' },
        h('div', { class: 'row' }, h('label', { class: 'fld-inline' }, 'Début ', debut), h('label', { class: 'fld-inline' }, 'Objectif ', obj, ' games obligatoires')),
        note),
      ...blocks,
      h('div', { class: 'row' }, save, h('button', { class: 'btn-ghost', onclick: () => { S.poolEdit = null; render(); } }, 'Annuler'),
        e.err ? h('span', { class: 'bad small' }, '⚠ ' + e.err) : null));
  }

  // Prépare une fiche d'analyse des pools pour le générateur (Parole du coach).
  function prepareAnalysis(w, rng) {
    const lines = [];
    for (const p of S.players.filter((x) => x.slug)) {
      const d = S.data[p.slug];
      if (!d) continue;
      const t = w ? FC.normTiers((w.joueurs || {})[p.slug]) : null;
      const A = FC.poolAnalysis(p, d.matches, d.champs, t, rng.start, rng.end);
      const fmt = (c) => `${c.champion} ${c.games} games${c.games ? ' ' + fr(c.wr) + ' % WR, KDA ' + fr(c.kda, 2) : ''}`;
      lines.push(`${p.role} ${p.pseudo} : obligatoires [${A.oblig.map(fmt).join(' ; ')}] ; maîtrisés [${A.maitrise.map(fmt).join(' ; ')}]` + (A.travail.length ? ` ; à travailler [${A.travail.map(fmt).join(' ; ')}]` : '') + (A.autres.length ? ` ; autres [${A.autres.map(fmt).join(' ; ')}]` : ''));
    }
    const d = ensureDraft();
    d.mode = 'fiche';
    d.fiche = null;
    d.cible = "Toute l'équipe";
    d.sujet = `Analyse les champion pools de l'équipe ${w ? 'pour la ' + weekLabel(w).toLowerCase() : ''} : pour chaque joueur, ce qui marche, ce qu'il faut travailler, et des conseils concrets sur ses champions obligatoires et maîtrisés (matchups, erreurs fréquentes, quand les choisir). Données classé Solo/Duo :\n` + lines.join('\n');
    S.section = 'coach';
    S.ficheId = null;
    render();
    window.scrollTo(0, 0);
  }

  start();
})();
