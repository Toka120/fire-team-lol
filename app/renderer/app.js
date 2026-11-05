// FIRE LoL - interface : écran du code, accueil de l'équipe, page de chaque joueur.
(() => {
  const FC = window.FC;
  const { fr, sg, pl } = FC;
  const $ = (id) => document.getElementById(id);
  const REFRESH_EVERY = 10 * 60 * 1000;
  const FETCH_DAYS = 31;

  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* plein */ } };

  const S = {
    cfg: null, players: [], period: '7', since: null, obj: null,
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
  const hm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const tag = (t) => h('span', { class: 'tag' }, t);
  const dateFr = (ymd) => { const d = new Date(ymd + 'T00:00:00'); return `${d.getDate() === 1 ? '1er' : d.getDate()} ${d.toLocaleDateString('fr-FR', { month: 'long' })}`; };
  function progress(o, big) {
    if (!o || !o.target) return null;
    const bar = h('div', { class: 'prog' + (o.done >= o.target ? ' done' : '') }, h('i', { style: `width:${o.pct}%` }));
    return h('div', { class: 'objbox' + (big ? ' big' : '') },
      h('div', { class: 'objline' }, h('span', null, `🎯 Objectif : ${o.done} / ${o.target} games obligatoires`), h('span', { class: 'muted small' }, o.done >= o.target ? 'atteint ✓' : `reste ${o.reste}`)),
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
  function periodStart() {
    if (S.period === 'debut' && S.debut) return new Date(S.debut + 'T00:00:00').getTime();
    if (S.period === 'obj' && S.obj) return new Date(S.obj.debut + 'T00:00:00').getTime();
    if (S.period === 'since' && S.since) return new Date(S.since + 'T00:00:00').getTime();
    if (S.period === '1') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    const n = S.period === 'since' ? 7 : Number(S.period);
    return Date.now() - n * 86400000;
  }
  function periodLabel() {
    if (S.period === 'debut' && S.debut) return `depuis le ${dateFr(S.debut)}`;
    if (S.period === 'obj' && S.obj) return `depuis le ${dateFr(S.obj.debut)}`;
    if (S.period === 'since' && S.since) { const d = new Date(S.since + 'T00:00:00'); return `depuis le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`; }
    if (S.period === '1') return "aujourd'hui";
    return `les ${S.period === 'since' ? 7 : S.period} derniers jours`;
  }

  // ---------- Démarrage, code d'accès ----------
  async function start() {
    S.cfg = await window.fire.config();
    try { S.version = await window.fire.version(); } catch (e) { /* inconnue */ }
    S.players = (S.cfg && S.cfg.joueurs) || [];
    S.obj = (S.cfg && S.cfg.objectif && S.cfg.objectif.debut) ? S.cfg.objectif : null;
    S.cfgObj = S.obj;
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
      window.fire.update.state().then((m) => { S.upd = { ...m, ...S.upd, auto: m.auto, portable: m.portable }; renderUpdate(); }).catch(() => {});
    }
    renderUpdate();
    render();
    loadGuides();
    window.fire.coach.state().then((c) => { S.coachState = c; if (S.section === 'coach' && !typing()) render(); }).catch(() => {});
    loadFiches();
    loadPools();
    loadPlanning();
    loadChampions();
    window.fire.team([]).then((r) => { if (r && r.games) { S.teamGames = r.games; if (S.section === 'stats' && !typing()) render(); } }).catch(() => {});
    refreshAll();
    S.timer = setInterval(refreshContent, REFRESH_EVERY);
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
      o.textContent = `Objectif (depuis le ${dateFr(S.obj.debut)})`;
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
        S.players = c.joueurs;
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
  function installNow() { stopCountdown(); window.fire.update.install(); }
  function startCountdown() {
    if (countdown) return;
    S.updLeft = 15;
    countdown = setInterval(() => {
      if (typing() || (S.draft && S.draft.busy)) { renderUpdate(); return; } // on n'interrompt pas quelqu'un qui écrit
      S.updLeft--;
      if (S.updLeft <= 0) installNow(); else renderUpdate();
    }, 1000);
  }
  function renderUpdate() {
    const box = $('update');
    const u = S.upd || {};
    let node = null;
    if (u.auto && (u.state === 'available' || u.state === 'progress')) {
      node = h('span', null, `⬇ Nouvelle version ${u.version || ''} : téléchargement en cours… ${u.percent || 0} %`);
    } else if (u.auto && u.state === 'ready') {
      const now = h('button', { class: 'linkbtn', onclick: installNow }, 'Redémarrer maintenant');
      if (S.updLater) node = h('span', null, `✓ La version ${u.version} s'installera à la fermeture de FIRE LoL. `, now);
      else {
        startCountdown();
        const paused = typing() || (S.draft && S.draft.busy);
        node = h('span', null, `✓ Version ${u.version} prête : FIRE LoL redémarre ${paused ? 'dès que tu as fini d\'écrire' : `dans ${S.updLeft} s`} pour l'installer. `, now, ' · ',
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
    else if (!r.auto) S.updMsg = (r.latest && newer(r.latest, S.version)) ? `La version ${r.latest} est disponible : télécharge-la avec le bouton ci-dessous.` : 'Tu as déjà la dernière version ✓';
    else if (r.state === 'ready') S.updMsg = 'La nouvelle version est prête : clique sur « Redémarrer et installer ».';
    else if (r.state === 'progress' || r.state === 'available') S.updMsg = 'Téléchargement déjà en cours…';
    else if (r.found && newer(r.found, S.version)) S.updMsg = `Version ${r.found} trouvée : téléchargement en cours, puis installation.`;
    else S.updMsg = 'Tu as déjà la dernière version ✓';
    S.updLater = false;
    renderUpdate();
    renderSettings();
  }

  function renderSettings() {
    if (S.section !== 'settings') return;
    const u = S.upd || {};
    const view = $('view');
    const latest = u.latest || (S.cfg && S.cfg.derniere_version) || null;
    const behind = latest && newer(latest, S.version);
    const row = (k, v) => h('div', { class: 'srow' }, h('span', { class: 'muted' }, k), h('span', { class: 'sval' }, v));
    let state = '';
    if (u.auto && (u.state === 'available' || u.state === 'progress')) state = `Téléchargement de la version ${u.version || ''} : ${u.percent || 0} %`;
    else if (u.auto && u.state === 'ready') state = `Version ${u.version} téléchargée, prête à installer`;
    else if (u.auto && u.state === 'checking') state = 'Vérification en cours…';
    else if (u.auto && u.state === 'error') state = 'Dernière vérification en erreur : ' + (u.error || '');
    else if (u.auto) state = behind ? 'Nouvelle version disponible' : 'À jour ✓';
    else state = u.portable ? 'Version portable : mise à jour manuelle' : (behind ? 'Nouvelle version disponible' : 'À jour ✓');

    const buttons = [];
    if (u.auto && u.state === 'ready') buttons.push(h('button', { class: 'btn-fire small-btn', onclick: installNow }, '🔄 Redémarrer et installer maintenant'));
    else if (u.auto) buttons.push(h('button', { class: 'btn-fire small-btn', disabled: (S.updChecking || u.state === 'progress' || u.state === 'available') ? true : null, onclick: checkUpdate }, '⬇ Installer la dernière version'));
    else {
      buttons.push(h('button', { class: 'btn-ghost', disabled: S.updChecking ? true : null, onclick: checkUpdate }, 'Vérifier'));
      buttons.push(h('a', { class: 'btn-fire small-btn linklike', href: SETUP_URL, target: '_blank' }, '⬇ Télécharger la dernière version'));
    }

    const st = S.coachState || {};
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '⚙️'), h('div', null, h('h1', { class: 'title' }, 'Paramètres'), h('p', { class: 'muted' }, 'Version, mises à jour, accès et profil.'))),
      h('div', { class: 'card settings-card' }, h('h2', null, '👤 Mon profil'), h('p', { class: 'muted small' }, 'Choisis qui tu es : tu pourras modifier ta propre tierlist dans 🧙 POOL.'), h('div', { class: 'row' }, meSelect())),
      h('div', { class: 'card settings-card' },
        h('h2', null, "🔄 Version de l'application"),
        row('Version installée', 'v' + S.version),
        row('Dernière version publiée', latest ? 'v' + latest : '…'),
        row('État', state),
        h('div', { class: 'row' }, buttons),
        S.updMsg ? h('p', { class: 'small' }, S.updMsg) : null,
        h('p', { class: 'muted small' }, u.portable
          ? "La version portable ne peut pas s'installer toute seule : télécharge FIRE-LoL-Setup.exe, qui se mettra ensuite à jour automatiquement."
          : "L'application cherche aussi les nouvelles versions toute seule, à chaque ouverture et toutes les 30 minutes.")),
      h('div', { class: 'card settings-card' },
        h('h2', null, '📊 Stats et contenu'),
        row('Stats dpm.lol', S.refreshing ? 'mise à jour en cours…' : (S.lastRefresh ? 'à jour à ' + hm(S.lastRefresh) : '—')),
        row('Thèmes « Lanes et principes »', S.guides ? `${S.guides.length} thèmes` : '…'),
        row('Fiches du coach', S.fiches ? String(S.fiches.length) : '…'),
        h('div', { class: 'row' }, h('button', { class: 'btn-ghost', disabled: S.refreshing ? true : null, onclick: () => { refreshContent(); setTimeout(renderSettings, 300); } }, '⟳ Tout mettre à jour maintenant')),
        h('p', { class: 'muted small' }, 'Tout se met aussi à jour tout seul à chaque ouverture, puis toutes les 10 minutes.')),
      h('div', { class: 'card settings-card' },
        h('h2', null, '🔐 Accès'),
        row("Code d'équipe", 'enregistré sur cet ordinateur ✓'),
        row('Mode coach', st.coach ? `activé (Claude ${st.claude ? '✓' : '✗'} · GitHub ${st.github ? '✓' : '✗'})` : 'non activé'),
        coachAccess()),
      h('div', { class: 'card settings-card' },
        h('h2', null, 'ℹ️ À propos'),
        h('p', { class: 'small' }, 'FIRE LoL · ', h('a', { href: 'https://toka120.github.io/fire-team-lol/', target: '_blank' }, 'page de téléchargement'), ' · ',
          h('a', { href: 'https://github.com/Toka120/fire-team-lol/releases', target: '_blank' }, 'toutes les versions'))));
  }

  // ---------- Lecture dpm.lol ----------
  function fetchDays() {
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
        try { res = await window.fire.fetchPlayer({ slug: p.slug, puuid: p.puuid || null }, fetchDays()); } catch (e) { res = { ok: false, error: String(e) }; }
        if (res && res.ok) {
          S.data[p.slug] = { matches: res.matches, champs: res.champs, rank: res.rank, record: res.record, at: res.at };
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
    $('period-box').hidden = S.section !== 'stats' || S.view === 'team';
    const back = $('back');
    back.hidden = S.section === 'settings' || S.section === 'pool' || S.section === 'planning' || S.section === 'jeux' || !(S.section === 'stats' ? (S.view === 'player' || S.view === 'team') : S.section === 'guides' ? !!(S.theme || S.guideCat) : !!S.ficheId);
    const gc = catOf(S.guideCat);
    back.textContent = S.section === 'stats' ? '← Équipe' : S.section === 'guides' ? (S.theme && gc ? `← ${gc.titre}` : '← Lanes et principes') : '← Parole du coach';
    if (S.section === 'settings') renderSettings();
    else if (S.section === 'pool') renderPool();
    else if (S.section === 'planning') renderPlanning();
    else if (S.section === 'jeux') renderJeux();
    else if (S.section === 'guides') { if (S.theme) renderTheme(); else renderGuides(); }
    else if (S.section === 'coach') { if (S.ficheId) renderFicheView(); else renderCoach(); }
    else if (S.view === 'player') renderPlayer();
    else if (S.view === 'team') renderTeam();
    else renderHub();
  }

  function openPlayer(slug) {
    S.view = 'player'; S.player = slug; S.tab = 'resume'; S.jour = 'tous';
    render();
    window.scrollTo(0, 0);
  }

  // ----- Accueil équipe -----
  function renderHub() {
    const start = periodStart();
    const view = $('view');
    view.replaceChildren(...[
      newsBanner(),
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🔥'), h('div', null,
        h('h1', { class: 'title' }, "L'équipe"),
        h('p', { class: 'muted' }, `Classé Solo/Duo · ${periodLabel()} · clique sur un joueur pour voir tout le détail.`),
        S.obj && S.obj.games ? h('p', { class: 'muted small' }, `🎯 Objectif : ${S.obj.games} games sur les champions obligatoires depuis le ${dateFr(S.obj.debut)}, réparties comme chacun veut.`) : null)),
      teamCards(),
      h('div', { class: 'hub-grid' }, S.players.map((p) => hubCard(p, start)))
    ].filter(Boolean));
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
    const card = h('article', { class: 'pcard', tabindex: '0', onclick: () => openPlayer(p.slug), onkeydown: (e) => { if (e.key === 'Enter') openPlayer(p.slug); } },
      roleLine(p, R), h('div', { class: 'pname' }, p.pseudo), p.pool ? h('div', { class: 'muted small' }, '🎯 ' + p.pool) : null,
      (p.maitrise_ids || []).length ? h('div', { class: 'muted small' }, '⭐ ' + p.maitrise_ids.map(FC.champName).join(' · ')) : null);
    if (d) {
      const s = FC.stats(FC.toRows(p, d.matches, start));
      const box = h('div');
      card.append(h('div', { class: 'mini' }, box, h('div', { class: 'mini-info' },
        h('div', null, s.games ? `${pl(s.wins, 'victoire', 'victoires')} · ${pl(s.losses, 'défaite', 'défaites')}` : 'Aucune game'),
        h('div', { class: 'muted small' }, s.games ? `KDA ${fr(s.kda, 2)} · ${fr(s.morts_moy, 1)} morts/game` : periodLabel()),
        d.rank ? h('div', { class: 'muted small' }, d.rank) : null)));
      later(() => ring(box, s, 84));
      const o = FC.objectif(p, d.matches, S.obj);
      card.append(progress(o));
      const cb = s.games ? catBar({ oblig: s.oblig, maitrise: s.maitrise_g, autres: s.autres }) : null;
      if (cb) { cb.classList.add('compact'); card.append(cb); }
      const pills = hubPills(p, FC.toRows(p, d.matches, start), s, o);
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
  const teamRoster = () => S.players.filter((p) => p.slug && p.puuid).map((p) => ({ slug: p.slug, pseudo: p.pseudo, puuid: p.puuid, role_id: p.role_id }));
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
      page.append(h('div', { class: 'team-games' }, A.games.map((g) => {
        const dt = new Date(g.t);
        const m = Math.round(g.dur / 60);
        return h('div', { class: 'card tgame ' + (g.win ? 'w' : 'l') },
          h('div', { class: 'tg-head' }, h('span', { class: 'tg-q q' + g.q }, g.q === 710 ? '🏆 5c5' : '🔁 Flex'), h('span', { class: 'tg-res' }, g.win ? 'Victoire' : 'Défaite'),
            h('span', { class: 'muted small' }, `${dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à ${hm(g.t)} · ${m} min · ${g.size} joueurs de FIRE`)),
          h('div', { class: 'tg-mem' }, g.members.map((x) => h('span', { class: 'tg-p' }, `${shortName(x.pseudo)} · ${FC.champName(x.c)} `, h('b', null, `${x.k}/${x.d}/${x.a}`)))),
          h('div', { class: 'tg-obj' },
            h('span', null, `⚔️ ${g.us.k}–${g.them.k}`), h('span', null, `🐉 ${g.us.drag}–${g.them.drag}`), h('span', null, `🪱 ${g.us.grubs}–${g.them.grubs}`),
            h('span', null, `👾 ${g.us.baron}–${g.them.baron}`), h('span', null, `🏰 ${g.us.towers}–${g.them.towers}`),
            h('span', { class: g.gd15 >= 0 ? 'ok-t' : 'bad-t' }, `⏱️ ${sg(g.gd15)} à 15 min`), g.us.fb ? h('span', null, '🩸 premier sang') : null));
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
    const rows = FC.toRows(p, d.matches, periodStart());
    const s = FC.stats(rows);
    const days = FC.byDay(rows);
    const champs = FC.byChamp(rows);
    const obj = FC.objectif(p, d.matches, S.obj);
    if (S.jour !== 'tous' && !days.some((x) => x.jour === S.jour)) S.jour = 'tous';

    const ringBox = h('div', { class: 'ring' });
    view.replaceChildren(h('header', { class: 'hero' },
      h('div', { class: 'hero-txt' },
        h('div', { class: 'tags' }, tag(`${R.ico} ${p.role || R.label}`), tag('Classé Solo/Duo'), p.pool ? tag('🎯 ' + p.pool) : null, (p.maitrise_ids || []).length ? tag('⭐ ' + p.maitrise_ids.map(FC.champName).join(' · ')) : null, d.rank ? tag(d.rank) : null),
        h('h1', { class: 'title' }, p.pseudo),
        h('p', { class: 'muted small' }, `${cap(periodLabel())} · ${pl(s.games, 'game', 'games')} · stats dpm.lol de ${hm(d.at)} · ${lastGame(d) || 'aucune game Solo/Duo'} · `,
          h('a', { href: 'https://dpm.lol/' + p.slug, target: '_blank' }, 'voir sur dpm.lol')),
        h('p', { class: 'lead' }, FC.lead(p, s)),
        progress(obj, true),
        s.games ? catBar({ oblig: s.oblig, maitrise: s.maitrise_g, autres: s.autres }) : null),
      ringBox));
    later(() => ring(ringBox, s, 170));

    if (s.games) {
      const sb = h('div', { class: 'streak' });
      view.append(h('div', { class: 'card' }, h('h2', null, 'La série, game après game'),
        h('p', { class: 'muted small' }, "Chaque rond est une game, dans l'ordre. Survole pour voir le détail, clique pour l'ouvrir."), sb));
      later(() => streak(sb, rows));
    }

    const tabs = [['resume', '📊 Résumé'], ['jours', '📅 Jour par jour'], ['champions', '🧙 Champions'], ['lexique', '📖 Comprendre les stats']];
    view.append(h('nav', { class: 'tabs' }, tabs.map(([id, l]) => h('button', { class: 'tab', 'aria-selected': String(S.tab === id), onclick: () => { S.tab = id; render(); } }, l))));
    const page = h('section', { class: 'page' });
    view.append(page);
    if (S.tab === 'resume') pageResume(page, p, R, rep, rows, s, days, d, obj);
    else if (S.tab === 'jours') pageJours(page, p, R, rows, s, days);
    else if (S.tab === 'champions') pageChamps(page, p, champs, obj);
    else pageLexique(page, p, R, rep);
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
    page.append(h('div', { class: 'tiles' }, tiles.map(([ico, label, val, r, v, expl]) => {
      const m = h('div', { class: 'meter' });
      if (r && v != null) later(() => meter(m, v, r));
      return h('div', { class: 'card tile' }, h('div', { class: 'tile-h' }, `${ico} ${label}`), h('div', { class: 'num' }, val), m, h('p', { class: 'muted small' }, expl));
    })));

    const ins = FC.insights(p, rows, s, d.champs, obj);
    const acard = (x) => h('div', { class: 'acard k-' + x.kind },
      h('div', { class: 'acard-ico' }, x.ico),
      h('div', { class: 'acard-body' }, h('div', { class: 'acard-t' }, x.title, x.chip ? h('span', { class: 'acard-chip' }, x.chip) : null), h('p', null, x.text)));
    const col = (title, cls, list) => h('div', { class: 'acol ' + cls }, h('h3', null, title, h('span', { class: 'acount' }, list.length)), list.length ? list.map(acard) : h('p', { class: 'muted small' }, 'Rien à signaler.'));
    page.append(h('div', { class: 'card' },
      h('h2', null, '🎯 Le bilan en un coup d\'œil'),
      h('p', { class: 'muted small' }, 'Calculé automatiquement à partir des chiffres de la période, à confirmer au replay.'),
      h('div', { class: 'acols' },
        col('💪 Points forts', 'good', ins.filter((x) => x.kind === 'plus')),
        col('⚠️ À travailler', 'bad', ins.filter((x) => x.kind === 'warn'))),
      ins.some((x) => x.kind === 'info') ? h('div', { class: 'ainfo' }, ins.filter((x) => x.kind === 'info').map(acard)) : null));

    if (days.length) {
      const c = h('div', { class: 'chart' });
      page.append(h('div', { class: 'card' }, h('h2', null, 'Victoires et défaites par jour'), h('p', { class: 'muted small' }, 'Clique sur une barre pour voir les games du jour.'), c));
      later(() => dayChart(c, days));
    }
  }

  function pageJours(page, p, R, rows, s, days) {
    days = days.slice().sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));
    if (!rows.length) { page.append(h('div', { class: 'empty-state' }, 'Aucune game classée Solo/Duo sur cette période.')); return; }
    page.append(h('div', { class: 'chips' },
      h('button', { class: 'chip', 'aria-pressed': String(S.jour === 'tous'), onclick: () => { S.jour = 'tous'; render(); } }, 'Tous les jours'),
      days.map((d) => h('button', { class: 'chip', 'aria-pressed': String(S.jour === d.jour), onclick: () => { S.jour = d.jour; render(); } }, d.court))));
    const cur = S.jour === 'tous' ? { label: 'Tous les jours', ...s } : days.find((d) => d.jour === S.jour);
    const item = (lab, v) => h('div', { class: 'it' }, h('span', { class: 'lab' }, lab), h('span', { class: 'v' }, v));
    page.append(h('div', { class: 'card' }, h('div', { class: 'banner' },
      h('div', { class: 'it' }, h('span', { class: 'lab' }, S.jour === 'tous' ? cap(periodLabel()) : 'Jour sélectionné'), h('span', { class: 'big' }, cur.label)),
      item('Victoires', fr(cur.wins)), item('Défaites', fr(cur.losses)), item('Win rate', fr(cur.wr, 1) + ' %'),
      item('KDA', fr(cur.kda, 2)), item('Morts / game', fr(cur.morts_moy, 1)), item('Golds @15', sg(cur.gold15)))));
    page.append(h('p', { class: 'muted small' }, 'Bordure verte : victoire, rouge : défaite. Les flèches comparent chaque game à sa moyenne sur la période. Ouvre « Toutes les stats » pour le détail complet.'));

    const grid = h('div', { class: 'matches' });
    const list = S.jour === 'tous' ? days : days.filter((d) => d.jour === S.jour);
    list.forEach((d) => {
      if (S.jour === 'tous') grid.append(h('div', { class: 'dayhead' }, h('span', { class: 'd' }, d.label), h('span', { class: 'muted small' }, `${d.wins} V – ${d.losses} D`)));
      d.rows.forEach((g) => grid.append(matchCard(p, R, g, s)));
    });
    page.append(grid);

    page.append(h('div', { class: 'card' }, h('h2', null, 'Tableau récapitulatif par jour'), h('p', { class: 'muted small' }, 'Clique sur une ligne pour afficher ce jour. Moyennes par game.'),
      h('div', { class: 'scroll' }, h('table', { class: 't' },
        h('thead', null, h('tr', null, h('th', { class: 'l' }, 'Jour'), ['Games', 'V', 'D', 'Win rate %', 'KDA', 'Morts', p.role_id === 'support' ? 'Vision' : 'CS/min', 'Golds @15', 'Dégâts/min', 'Pinks'].map((x) => h('th', null, x)))),
        h('tbody', null, days.map((d) => h('tr', { class: 'click', onclick: () => { S.jour = d.jour; render(); window.scrollTo(0, 0); } },
          h('td', { class: 'l' }, d.label), h('td', null, d.games), h('td', null, d.wins), h('td', null, d.losses),
          h('td', { class: d.wr >= 50 ? 'good' : 'bad' }, fr(d.wr, 1)), h('td', null, fr(d.kda, 2)), h('td', null, fr(d.morts_moy, 1)),
          h('td', null, p.role_id === 'support' ? fr(d.vision, 1) : fr(d.cs_min, 1)),
          h('td', { class: d.gold15 > 0 ? 'good' : d.gold15 < 0 ? 'bad' : '' }, sg(d.gold15)), h('td', null, fr(d.degats_min)), h('td', null, d.pinks))))))));
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
      h('div', { class: 'mhead' }, h('span', { class: 'champ' }, g.champion), h('span', { class: 'pill ' + (g.win ? 'good' : 'bad') }, g.win ? 'Victoire' : 'Défaite')),
      h('div', null, h('span', { class: 'catpill c-' + g.cat }, g.cat === 'oblig' ? (g.maitrise ? '🎯⭐ Obligatoire et maîtrisé' : '🎯 Obligatoire') : g.cat === 'maitrise' ? '⭐ Maîtrisé' : '❔ Hors pool')),
      h('div', { class: 'muted small' }, `contre ${g.adversaire} · ${g.heure} · ${g.duree}${g.lane && g.lane !== R.lane ? ' · en ' + g.lane : ''}`),
      h('div', { class: 'kda' }, h('span', { class: 'k' }, `${g.kills} / ${g.morts} / ${g.assists}`), h('span', { class: 'muted small' }, `KDA ${fr(g.kda, 2)}`)),
      h('div', { class: 'mstats' },
        sup ? stat('KP %', g.kp, s.kp, f1) : stat('CS/min', g.cs_min, s.cs_min, f1),
        stat('Golds @15', g.gold15, s.gold15, s0), stat('Dégâts/min', g.degats_min, s.degats_min, f0), stat('Vision', g.vision, s.vision, f1)),
      b.length ? h('div', { class: 'badges' }, b.map((x) => h('span', { class: 'bdg' }, x))) : null,
      h('details', null, h('summary', null, 'Toutes les stats'), h('dl', { class: 'dl' }, dl.map(([k, v]) => [h('dt', null, k), h('dd', null, v)]))));
  }

  function openGame(g) {
    S.tab = 'jours'; S.jour = g.jour;
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
        h('h2', null, `🎯 Objectif : ${obj.target} games sur les champions obligatoires`),
        h('p', { class: 'muted small' }, `Compté en Solo/Duo depuis le ${dateFr(obj.debut)}, uniquement sur les champions 🎯 obligatoires${p.pool ? ' (' + p.pool + ')' : ''}, répartis comme il veut. Les champions ⭐ maîtrisés et les autres ne comptent pas.`),
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
    const groups = [['oblig', '🎯 Obligatoires', 'comptent pour l\'objectif'], ['maitrise', '⭐ Maîtrisés', 'ses champions sûrs'], ['autre', '❔ Autres champions', 'ni obligatoires ni maîtrisés']];
    for (const [cat, title, sub] of groups) {
      const list = champs.filter((c) => c.cat === cat);
      if (!list.length) continue;
      const g = h('div', { class: 'champs' });
      grid.append(h('div', { class: 'cgroup cat-' + cat }, h('h3', null, title, h('span', { class: 'muted small' }, ` · ${sub} · ${list.reduce((a, c) => a + c.games, 0)} games`)), g));
      list.forEach((c) => {
      const box = h('div');
      g.append(h('div', { class: 'card cc cat-' + cat }, box, h('div', null, h('div', { class: 'n' }, c.champion), h('div', { class: 'm' },
        h('span', null, c.cat === 'oblig' ? (c.maitrise ? '🎯⭐ Obligatoire et maîtrisé' : '🎯 Obligatoire') : c.cat === 'maitrise' ? '⭐ Maîtrisé' : '❔ Hors pool'),
        h('span', null, `${pl(c.games, 'game', 'games')} · ${c.wins} V – ${c.losses} D`),
        h('span', null, `KDA ${fr(c.kda, 2)} · ${fr(c.morts_moy, 1)} morts/game`),
        h('span', null, p.role_id === 'support' ? `Vision ${fr(c.vision, 1)} · golds @15 ${sg(c.gold15)}` : `${fr(c.cs_min, 1)} CS/min · golds @15 ${sg(c.gold15)}`)))));
      later(() => ring(box, c, 84));
      });
    }
    page.append(h('div', { class: 'card' }, h('h2', null, `Tous ses champions ${periodLabel()}`), h('p', { class: 'muted small' }, 'Le cercle montre le win rate. Moyennes par game. Classés en 🎯 obligatoires, ⭐ maîtrisés et ❔ autres.'),
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
    S.section = sec;
    if (sec === 'guides') { S.theme = null; S.guideCat = null; }
    if (sec === 'coach') S.ficheId = null;
    if (sec === 'stats') { S.view = 'hub'; S.player = null; }
    if (sec === 'planning') { S.planEdit = null; loadPlanning(); }
    if (sec === 'jeux') loadJeux();
    render();
    window.scrollTo(0, 0);
  }

  function renderNav() {
    const n = unseen().length;
    const b = (id, label, badge) => h('button', { class: 'navbtn', 'aria-current': S.section === id ? 'page' : null, onclick: () => go(id) }, label, badge ? h('span', { class: 'nbadge' }, badge) : null);
    const u = S.upd || {};
    const upd = (u.auto && u.state === 'ready') || (u.latest && newer(u.latest, S.version)) ? '1' : null;
    $('nav').replaceChildren(b('stats', '📊 Stats des joueurs'), b('pool', '🧙 POOL'), b('planning', '📅 Planning', planTodo() || null), b('jeux', '🎮 Détente'), b('guides', '📚 Lanes et principes'), b('coach', '📣 Parole du coach', n || null), b('settings', '⚙️ Paramètres', upd));
  }

  function newsBanner() {
    const u = unseen();
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
    if (r && r.ok) { S.fiches = r.fiches; S.fichesErr = r.offline ? 'Hors ligne : seules les fiches déjà téléchargées sont affichées.' : ''; }
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
  const openTheme = (id) => { S.theme = id; render(); window.scrollTo(0, 0); };

  function renderGuides() {
    if (S.guideCats && S.guideCats.length && S.guideCat !== 'all') {
      if (S.guideCat) { renderCategory(catOf(S.guideCat)); return; }
      renderCategories();
      return;
    }
    renderAllThemes();
  }

  function renderCategories() {
    const view = $('view');
    const role = myRole();
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '📚'), h('div', null, h('h1', { class: 'title' }, 'Lanes et principes'),
        h('p', { class: 'muted' }, 'Choisis ta lane : tous les principes utiles pour ton rôle, avec des conseils adaptés et des schémas animés.'))),
      h('div', { class: 'cat-grid' }, S.guideCats.map((c) => {
        const mine = role && (c.roles || []).includes(role);
        return h('button', { class: 'catcard' + (mine ? ' mine' : ''), onclick: () => { S.guideCat = c.id; S.theme = null; render(); window.scrollTo(0, 0); } },
          mine ? h('span', { class: 'me-tag' }, 'Ta lane') : null,
          c.diapo ? h('span', { class: 'diapo-tag' }, `🎞️ diaporama · ${c.diapo.slides.length} slides`) : null,
          h('div', { class: 'cat-ico' }, c.ico),
          h('div', { class: 'cat-t' }, c.titre),
          h('p', { class: 'muted small' }, c.intro),
          h('div', { class: 'cat-chips' }, c.themes.map((x) => { const t = themeOf(x.id); return t ? h('span', { class: 'cchip' }, `${t.ico} ${t.titre.replace(/ \(.*\)$/, '')}`) : null; })));
      })),
      h('p', { class: 'muted small' }, h('button', { class: 'linkbtn', onclick: () => { S.guideCat = 'all'; render(); } }, 'Voir tous les thèmes sans catégorie')));
  }

  function renderCategory(c) {
    const view = $('view');
    if (!c) { S.guideCat = null; renderCategories(); return; }
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, c.ico), h('div', null, h('h1', { class: 'title' }, c.titre), h('p', { class: 'muted' }, c.intro))),
      diapoCard(c),
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
      return h('button', { class: 'tcard', onclick: () => { S.theme = t.id; render(); window.scrollTo(0, 0); } },
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
  function ficheCard(f) {
    const th = f.rubrique ? themeOf(f.rubrique) : null;
    return h('button', { class: 'fcard', onclick: () => openFiche(f.id) },
      h('div', { class: 'fmeta' }, h('span', { class: 'muted small' }, f.at ? dateLong(f.at) : ''), !S.seen.has(f.id) ? h('span', { class: 'pill-new' }, 'Nouveau') : null),
      h('div', { class: 'fname' }, (f.type === 'message' ? '💬 ' : '📘 ') + f.titre),
      f.accroche ? h('p', { class: 'muted small' }, f.accroche) : null,
      h('div', { class: 'tags' }, tag('Pour : ' + (f.cible || "Toute l'équipe")), th ? tag(`${th.ico} ${th.titre}`) : null));
  }

  function renderFicheView() {
    const f = (S.fiches || []).find((x) => x.id === S.ficheId);
    const view = $('view');
    if (!f) { S.ficheId = null; renderCoach(); return; }
    const th = f.rubrique ? themeOf(f.rubrique) : null;
    const nodes = [h('header', { class: 'doc-head' },
      h('div', { class: 'tags' }, tag(f.type === 'message' ? '💬 Message du coach' : '📘 Fiche du coach'), tag('Pour : ' + (f.cible || "Toute l'équipe")), th ? tag(`${th.ico} ${th.titre}`) : null),
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
      h('p', { class: 'muted' }, "Les fiches et les messages du coach pour l'équipe. Les nouvelles arrivent toutes seules à l'ouverture de l'application."))) ];
    if (S.flash) nodes.push(h('div', { class: 'flash' }, S.flash, h('button', { class: 'flash-x', onclick: () => { S.flash = ''; render(); } }, '✕')));
    if (S.coachState.coach) nodes.push(composerCard(), settingsCard());
    if (S.fichesErr) nodes.push(h('p', { class: 'muted small' }, '⚠ ' + S.fichesErr));
    if (!S.fiches) nodes.push(h('div', { class: 'empty-state' }, 'Chargement des fiches du coach…'));
    else if (!S.fiches.length) nodes.push(h('div', { class: 'empty-state' }, "Le coach n'a encore rien publié."));
    else nodes.push(h('div', { class: 'fgrid' }, S.fiches.map(ficheCard)));
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
      placeholder: d.mode === 'message' ? 'Ton message pour l\'équipe (ex. : scrim demain à 20 h, soyez là 10 min avant).' : 'Ex. : comment gérer sa wave en top quand on est en retard ; ou : explique le tempo jungle avec Jarvan IV.' });
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
      h('div', { class: 'segs' }, seg('fiche', '🔎 Fiche avec recherche et schémas'), seg('message', '💬 Message simple')),
      d.mode === 'fiche' ? h('p', { class: 'muted small' }, "Écris ton sujet : l'application cherche sur le web (guides, vidéos), rédige une fiche claire et dessine des schémas. Tu relis l'aperçu avant de publier.") : h('p', { class: 'muted small' }, 'Ton message est publié tel quel. Tu peux utiliser **gras** et des listes avec « - ».'),
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
        h('h1', { class: 'title' }, (d.fiche.type === 'message' ? '💬 ' : '📘 ') + d.fiche.titre),
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
    if (!d.sujet.trim()) { d.err = d.mode === 'message' ? 'Écris ton message.' : 'Écris un sujet.'; render(); return; }
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
  function applyWeek() {
    const w = currentWeek();
    for (const p of S.players) {
      if (!p._cfg) p._cfg = { pool_ids: p.pool_ids || [], pool: p.pool || '', maitrise_ids: p.maitrise_ids || [] };
      const t = FC.normTiers(w && w.joueurs && w.joueurs[p.slug]);
      if (t && (t.O.length || t.M.length)) {
        p.pool_ids = t.O; p.maitrise_ids = t.M; p._tiers = t;
        p.pool = t.O.map(FC.champName).join(' · ');
      } else { p.pool_ids = p._cfg.pool_ids; p.maitrise_ids = p._cfg.maitrise_ids; p.pool = p._cfg.pool; p._tiers = null; }
    }
    S.obj = w && w.objectif ? { debut: w.debut, games: w.objectif, description: w.note || '' } : S.cfgObj;
    const sel = $('period');
    let opt = sel.querySelector('option[value=obj]');
    if (S.obj && !opt) { opt = document.createElement('option'); opt.value = 'obj'; sel.insertBefore(opt, sel.firstChild); }
    if (opt) { if (S.obj) opt.textContent = `Objectif (depuis le ${dateFr(S.obj.debut)})`; else opt.remove(); }
  }

  // ----- Détente : devine le champion (comme Loldle, en illimité) et lore des champions -----
  const DD = 'https://ddragon.leagueoflegends.com';
  const J = { data: null, err: '', loading: false, tab: 'classique', r: {}, lore: {}, loreSel: null, loreQ: '', loreReg: '' };
  const JMODES = [['classique', '🎯 Classique'], ['sort', '✨ Sort'], ['passif', '🔮 Passif'], ['phrase', '💬 Phrase'], ['splash', '🖼️ Splash'], ['lore', '📖 Lore']];
  const TAGFR = { Fighter: 'Combattant', Tank: 'Tank', Mage: 'Mage', Assassin: 'Assassin', Marksman: 'Tireur', Support: 'Support' };
  const jn = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const jimg = (type, f) => `${DD}/cdn/${J.data.version}/img/${type}/${f}`;
  const jsq = (c) => jimg('champion', c.id + '.png');
  const jsplash = (c, num) => `${DD}/cdn/img/champion/splash/${c.id}_${num || 0}.jpg`;
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
    const cs = J.data.champs;
    const prev = J.r[mode] && J.r[mode].target;
    let c = pick(cs);
    if (prev && cs.length > 1) while (c.id === prev.id) c = pick(cs);
    const r = { target: c, guesses: [], done: false, gaveUp: false, at: Date.now() };
    if (mode === 'sort') { r.spell = pick(c.spells); r.rot = pick([90, 180, 270]); }
    if (mode === 'splash') { const sk = c.skins.filter((x) => x.num > 0); r.skin = sk.length ? pick(sk) : c.skins[0]; r.ox = 20 + Math.round(Math.random() * 60); r.oy = 20 + Math.round(Math.random() * 60); }
    J.r[mode] = r;
    if (mode === 'phrase') {
      r.wait = true; render();
      const l = await jLore(c);
      const src = l.quote || (l.short || c.lore || '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      r.quote = jMask(src, c); r.fromBio = !l.quote; r.wait = false;
    }
    if (mode === 'classique') jLore(c);
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
    if (mode === 'classique') { await jLore(c); await jLore(r.target); }
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

  function renderJeux() {
    const view = $('view');
    const nodes = [h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🎮'),
      h('div', null, h('h1', { class: 'title' }, 'Détente'), h('p', { class: 'muted' }, 'Devine le champion autant de fois que tu veux, ou plonge dans le lore de Runeterra.')))];
    nodes.push(h('div', { class: 'chips jeu-tabs' }, JMODES.map(([k, l]) => h('button', { class: 'chip', 'aria-pressed': String(J.tab === k), onclick: () => { J.tab = k; J.msg = ''; render(); } }, l))));
    if (!J.data) {
      nodes.push(h('div', { class: 'card' }, J.loading || !J.err ? h('p', { class: 'muted' }, 'Chargement des champions…') : h('p', { class: 'bad' }, '⚠ ' + J.err, ' ', h('button', { class: 'btn-ghost', onclick: () => { J.err = ''; loadJeux(); render(); } }, 'Réessayer'))));
      view.replaceChildren(...nodes);
      if (!J.loading && !J.err) loadJeux();
      return;
    }
    if (J.tab === 'lore') { nodes.push(...renderLore()); view.replaceChildren(...nodes); return; }
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
    if (mode === 'passif') {
      const blur = r.done ? 0 : Math.max(0, 14 - 3 * wrong);
      clue = h('div', { class: 'card jeu-clue' }, h('h3', null, 'À quel champion appartient ce passif ?'),
        h('img', { class: 'jeu-ico', src: jimg('passive', t.passive.img), alt: '', style: `filter:blur(${blur}px)` }),
        h('p', { class: 'muted small' }, r.done || wrong >= 4 ? `Passif : ${t.passive.name}` : `Le nom du passif apparaît après 4 essais (encore ${4 - wrong}).`));
    }
    if (mode === 'phrase') clue = h('div', { class: 'card jeu-clue' }, h('h3', null, r.fromBio ? 'Qui est décrit ici ?' : 'Qui a dit ça ?'),
      r.wait ? h('p', { class: 'muted' }, 'Chargement…') : h('blockquote', { class: 'jeu-quote' }, '« ', r.quote, ' »'),
      wrong >= 3 || r.done ? h('p', { class: 'muted small' }, `Indice : « ${t.title} »${wrong >= 6 || r.done ? ` · ${t.region || 'région inconnue'}` : ''}`) : h('p', { class: 'muted small' }, `Un indice arrive après 3 essais (encore ${3 - wrong}).`));
    if (mode === 'splash') {
      const sc = r.done ? 1 : Math.max(1.4, 5 - 0.6 * wrong);
      clue = h('div', { class: 'card jeu-clue' }, h('h3', null, 'À quel champion appartient ce skin ?'),
        h('div', { class: 'jeu-splash' }, h('img', { src: jsplash(t, r.skin.num), alt: '', style: `transform:scale(${sc});transform-origin:${r.ox}% ${r.oy}%` })),
        h('p', { class: 'muted small' }, r.done ? r.skin.name : 'Ça dézoome à chaque essai.'));
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
    const head = h('div', { class: 'jc-row jc-head' }, ['Champion', 'Classes', 'Ressource', 'Portée', 'Région', 'Espèce', 'Sortie'].map((x) => h('div', { class: 'jc' }, x)));
    const rows = r.guesses.slice().reverse().map((g) => {
      const lg = J.lore[g.id] || { races: [] };
      const yc = g.year && t.year ? (g.year === t.year ? 'ok' : 'ko') : 'ko';
      const arrow = g.year && t.year && g.year !== t.year ? (t.year > g.year ? ' ↑' : ' ↓') : '';
      return h('div', { class: 'jc-row' },
        h('div', { class: 'jc jc-champ ' + (g.id === t.id ? 'ok' : '') }, h('img', { src: jsq(g), alt: '' }), h('span', null, g.name)),
        cell(setCmp(g.tags, t.tags), g.tags.map((x) => TAGFR[x] || x).join(', ')),
        cell(g.partype === t.partype ? 'ok' : 'ko', g.partype || '—'),
        cell(g.range === t.range ? 'ok' : 'ko', g.range),
        cell((g.region || '?') === (t.region || '?') ? 'ok' : 'ko', g.region || '—'),
        cell(lg.races.length || lt.races.length ? setCmp(lg.races, lt.races) : 'ko', lg.races.join(', ') || '—'),
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
            l && l.quote ? h('blockquote', { class: 'jeu-quote' }, '« ', l.quote, ' »', l.quoteAuthor ? h('span', { class: 'muted small' }, ' — ' + l.quoteAuthor) : null) : null,
            !l ? h('p', { class: 'muted small' }, 'Chargement de la biographie complète…') : null,
            h('div', { class: 'lore-text' }, String(text || '').split(/\n\n+/).map((p) => h('p', null, p))),
            h('div', { class: 'lore-abil' }, h('h3', null, 'Ses compétences'),
              h('div', { class: 'lore-sp' }, h('img', { src: jimg('passive', c.passive.img), alt: '' }), h('div', null, h('b', null, 'Passif · ' + c.passive.name), h('p', { class: 'muted small' }, c.passive.desc))),
              c.spells.map((sp) => h('div', { class: 'lore-sp' }, h('img', { src: jimg('spell', sp.img), alt: '' }), h('div', null, h('b', null, `${sp.key} · ${sp.name}`))))))];
      }
    }
    const regs = [...new Set(cs.map((c) => c.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    const q = jn(J.loreQ);
    const list = cs.filter((c) => (!J.loreReg || c.region === J.loreReg) && (!q || jn(c.name).includes(q) || jn(c.title).includes(q)));
    const inp = h('input', { class: 'inp', id: 'lore-q', placeholder: 'Chercher un champion…', value: J.loreQ });
    inp.addEventListener('input', () => { J.loreQ = inp.value; const g = $('lore-grid'); if (g) g.replaceChildren(...loreCards()); });
    const loreCards = () => cs.filter((c) => (!J.loreReg || c.region === J.loreReg) && (!jn(J.loreQ) || jn(c.name).includes(jn(J.loreQ)) || jn(c.title).includes(jn(J.loreQ))))
      .map((c) => h('button', { class: 'lore-c', onclick: () => { J.loreSel = c.id; render(); window.scrollTo(0, 0); } }, h('img', { src: jsq(c), alt: '' }), h('b', null, c.name), h('span', { class: 'muted small' }, cap(c.title))));
    return [h('div', { class: 'row' }, inp, h('span', { class: 'muted small' }, `${list.length} champions`)),
      h('div', { class: 'chips' }, h('button', { class: 'chip', 'aria-pressed': String(!J.loreReg), onclick: () => { J.loreReg = ''; render(); } }, 'Toutes les régions'),
        regs.map((g) => h('button', { class: 'chip', 'aria-pressed': String(J.loreReg === g), onclick: () => { J.loreReg = g; render(); } }, g))),
      h('div', { class: 'lore-grid', id: 'lore-grid' }, loreCards())];
  }

  // ----- Planning : le coach coche les jours / heures, les joueurs répondent -----
  const PLAN_ST = { present: { ico: '✅', txt: 'Présent', cls: 'st-ok' }, incertain: { ico: '❔', txt: 'Incertain', cls: 'st-warn' }, absent: { ico: '❌', txt: 'Absent', cls: 'st-bad' } };
  const PLAN_TYPES = [['flex', '🔁 Flex'], ['5c5', '🏆 5c5'], ['scrim', '⚔️ Scrim'], ['review', '🎥 Review'], ['autre', '📌 Autre']];
  const PLAN_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const ymdL = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dOf = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const mondayOf = (ymd) => { const d = dOf(ymd); return addDays(ymd, -((d.getDay() + 6) % 7)); };
  const weekDays = (mon) => [0, 1, 2, 3, 4, 5, 6].map((k) => addDays(mon, k));
  const dayFr = (ymd, o) => dOf(ymd).toLocaleDateString('fr-FR', o || { weekday: 'long', day: 'numeric', month: 'long' });
  const planCanWrite = () => S.planWrite || (S.coachState.coach && S.coachState.github);

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
    let r;
    try { r = await window.fire.planning(); } catch (e) { r = { ok: false, error: String(e) }; }
    if (r && r.ok) { S.plan = { jours: r.jours || {}, reponses: r.reponses || {} }; S.planErr = r.offline ? 'Hors ligne : dernier planning enregistré.' : ''; }
    else { S.plan = S.plan || { jours: {}, reponses: {} }; S.planErr = (r && r.error) || 'planning indisponible'; }
    S.planWrite = !!(r && r.peutEcrire);
    renderNav();
    if (typing() || S.planEdit) return;
    if (S.section === 'planning') render();
  }

  // Jours à venir (14 jours) où je n'ai pas encore répondu : pastille dans le menu.
  function planTodo() {
    if (!S.moi || !S.plan) return 0;
    const t = todayYmd(), lim = addDays(t, 14);
    return Object.keys(S.plan.jours).filter((d) => d >= t && d <= lim && !((S.plan.reponses[d] || {})[S.moi])).length;
  }

  async function answer(date, slug, statut) {
    const rep = (S.plan.reponses[date] = S.plan.reponses[date] || {});
    const before = rep[slug];
    if (statut) rep[slug] = { statut, at: Date.now() }; else delete rep[slug];
    render();
    const r = await window.fire.savePlanning({ type: 'reponse', date, slug, statut });
    if (r && r.ok) S.plan = { jours: r.jours, reponses: r.reponses };
    else { if (before) rep[slug] = before; else delete rep[slug]; S.flash = 'Réponse non enregistrée : ' + ((r && r.error) || 'erreur'); }
    if (!S.planEdit && S.section === 'planning') render(); else renderNav();
  }

  function renderPlanning() {
    const view = $('view');
    if (S.planEdit) { renderPlanEditor(view); return; }
    const t = todayYmd();
    const mon = S.planWeek || mondayOf(t);
    S.planWeek = mon;
    const days = weekDays(mon);
    const coach = S.coachState.coach;
    const roster = S.players.filter((x) => x.slug);
    const nodes = [h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '🗓️'),
      h('div', null, h('h1', { class: 'title' }, 'Planning'),
        h('p', { class: 'muted' }, coach ? 'Coche les jours et heures de jeu, puis regarde qui sera là.' : 'Dis au coach si tu seras là : ✅ présent · ❔ incertain · ❌ absent.')))];
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
      coach ? h('button', { class: 'btn-fire small-btn', disabled: planCanWrite() ? null : true, onclick: () => startPlanEdit(mon) }, '✏️ Cocher les jours et heures') : null,
      coach && !planCanWrite() ? h('span', { class: 'bad small' }, 'Ajoute le jeton GitHub (ou le jeton d\'équipe) dans les réglages coach.') : null);
    nodes.push(nav);

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
      const btns = S.moi && !past ? h('div', { class: 'plan-me' }, h('span', { class: 'muted small' }, 'Moi : '),
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
          h('div', null, h('div', { class: 'plan-date' }, cap(dayFr(d)), d === t ? h('span', { class: 'plan-tag' }, "aujourd'hui") : null),
            h('div', { class: 'plan-hours' }, '🕒 ', hourBlocks(j.heures), h('span', { class: 'plan-type' }, type[1])),
            j.note ? h('div', { class: 'muted small' }, '📝 ' + j.note) : null),
          h('div', { class: 'plan-count' },
            h('span', { class: 'st-ok' }, `✅ ${cnt.present}`), h('span', { class: 'st-warn' }, `❔ ${cnt.incertain}`), h('span', { class: 'st-bad' }, `❌ ${cnt.absent}`),
            cnt.none ? h('span', { class: 'muted' }, `⏳ ${cnt.none}`) : null,
            h('span', { class: full ? 'plan-five ok' : 'plan-five' }, full ? '5 joueurs ✓' : `${cnt.present}/5`))),
        btns, people));
    }
    view.replaceChildren(...nodes);
  }

  function startPlanEdit(mon) {
    const jours = {};
    for (const d of weekDays(mon)) {
      const j = S.plan && S.plan.jours[d];
      jours[d] = { heures: j ? j.heures.slice() : [], type: j ? j.type : 'flex', note: j ? j.note || '' : '' };
    }
    S.planEdit = { mon, jours, busy: false, err: '' };
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
      h('tbody', null, PLAN_HOURS.map((hr) => h('tr', null, h('th', { class: 'plan-hr' }, hr + 'h'), days.map((d) => {
        const cell = h('td', { class: 'plan-cell' + (e.jours[d].heures.includes(hr) ? ' on' : '') + (d < t ? ' past' : '') });
        cell.addEventListener('mousedown', (ev) => { ev.preventDefault(); paint = !cell.classList.contains('on'); setCell(cell, d, hr, paint); window.addEventListener('mouseup', stop, { once: true }); });
        cell.addEventListener('mouseenter', () => { if (paint !== null) setCell(cell, d, hr, paint); });
        return cell;
      })))));
    const quick = (d, a, b) => () => { e.jours[d].heures = []; for (let x = a; x < b; x++) e.jours[d].heures.push(x); render(); };
    const rows = days.map((d) => {
      const j = e.jours[d];
      const type = h('select', null, PLAN_TYPES.map(([k, v]) => h('option', { value: k }, v)));
      type.value = j.type;
      type.addEventListener('change', () => { j.type = type.value; });
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
      const r = await window.fire.savePlanning({ type: 'semaine', debut: e.mon, jours: e.jours });
      e.busy = false;
      if (r && r.ok) { S.plan = { jours: r.jours, reponses: r.reponses }; S.planWeek = e.mon; S.planEdit = null; S.flash = 'Planning publié ✓ Les joueurs peuvent répondre.'; }
      else e.err = (r && r.error) || 'erreur';
      render();
    } }, e.busy ? 'Publication…' : "📣 Publier le planning");
    view.replaceChildren(
      h('header', { class: 'sec-hero' }, h('div', { class: 'sec-ico' }, '✏️'), h('div', null, h('h1', { class: 'title' }, 'Jours et heures de jeu'),
        h('p', { class: 'muted' }, `Semaine du ${dayFr(days[0], { day: 'numeric', month: 'long' })}. Clique (ou glisse) sur les cases pour cocher les heures où l'équipe joue.`))),
      h('div', { class: 'card plan-gridwrap' }, grid),
      h('div', { class: 'card plan-edays' }, rows),
      h('div', { class: 'row' }, save, h('button', { class: 'btn-ghost', onclick: () => { S.planEdit = null; render(); } }, 'Annuler'),
        e.err ? h('span', { class: 'bad small' }, '⚠ ' + e.err) : null));
  }

  async function loadPools() {
    let r;
    try { r = await window.fire.pools(); } catch (e) { r = { ok: false, error: String(e) }; }
    if (r && r.ok) { S.pools = r.semaines || []; S.poolsErr = r.offline ? 'Hors ligne : derniers pools enregistrés.' : ''; }
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
    const sel = h('select', { 'aria-label': 'Qui es-tu ?' }, h('option', { value: '' }, '— choisis —'), S.players.filter((x) => x.slug).map((p) => h('option', { value: p.slug }, `${roleOf(p).ico} ${p.pseudo}`)));
    sel.value = S.moi || '';
    sel.addEventListener('change', () => { S.moi = sel.value || null; save('fire.moi', S.moi); render(); });
    return sel;
  }

  // Au premier lancement : on demande une seule fois qui utilise l'app, pour ouvrir directement sa tierlist.
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
      h('div', { class: 'who-grid' }, S.players.filter((x) => x.slug).map((p) => h('button', { class: 'who-p', onclick: () => close(p.slug) },
        h('span', { class: 'who-ico' }, roleOf(p).ico), h('span', { class: 'who-n' }, String(p.pseudo).split('#')[0]), h('span', { class: 'muted small' }, p.role || roleOf(p).label)))),
      h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => close(null) }, 'Je suis le coach / plus tard'))));
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
        h('p', { class: 'muted' }, '🎯 Obligatoires : comptent pour l\'objectif · ⭐ Maîtrisés : ses champions sûrs · ❔ Autres : le reste')))];
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
    nodes.push(h('div', { class: 'card week-banner' },
      h('div', { class: 'wb-main' },
        h('div', { class: 'wb-big' }, obj && obj.games ? String(obj.games) : '—'),
        h('div', null, h('div', { class: 'wb-t' }, w ? `${weekLabel(w)}${rng.fin ? ' → ' + dateFr(rng.fin) : ''}` : `Depuis le ${obj ? dateFr(obj.debut) : '—'}`),
          h('div', { class: 'muted small' }, obj && obj.games ? 'games à jouer sur les champions 🎯 obligatoires, réparties comme chacun veut' : 'pas d\'objectif de games'))),
      w && w.note ? h('div', { class: 'wb-note md' }, md(w.note)) : null,
      !w ? h('p', { class: 'muted small' }, coach ? 'Aucune tierlist publiée : crée la première semaine avec « Nouvelle semaine ».' : 'Pas encore de tierlist publiée : voici le pool de départ et son analyse.') : null));

    for (const p of S.players.filter((x) => x.slug)) nodes.push(poolCard(p, w, prev, rng, obj));
    view.replaceChildren(...nodes.filter(Boolean));
  }

  function tierLabel(k) {
    return h('div', { class: 'tier tl' + k }, h('span', { class: 'tier-ico' }, TI[k].ico), h('span', null, TI[k].label), k === 'O' ? h('small', null, "compte pour l'objectif") : h('small', null, 'ses champions sûrs'));
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
    const tot = t.oblig + t.maitrise + t.autres;
    if (!tot) return null;
    const seg = (n, cls, lab) => n ? h('i', { class: cls, style: `flex:${n}`, title: `${lab} : ${n}` }, n) : null;
    return h('div', { class: 'catbar-wrap' },
      h('div', { class: 'catbar' }, seg(t.oblig, 'c-o', 'Obligatoires'), seg(t.maitrise, 'c-m', 'Maîtrisés'), seg(t.autres, 'c-a', 'Autres')),
      h('div', { class: 'catleg' }, h('span', null, h('i', { class: 'c-o' }), `🎯 ${t.oblig} obligatoire${t.oblig > 1 ? 's' : ''}`), h('span', null, h('i', { class: 'c-m' }), `⭐ ${t.maitrise} maîtrisé${t.maitrise > 1 ? 's' : ''}`), h('span', null, h('i', { class: 'c-a' }), `❔ ${t.autres} autre${t.autres > 1 ? 's' : ''}`)));
  }

  function alertPills(notes) {
    if (!notes || !notes.length) return null;
    return h('div', { class: 'apills' }, notes.map((n) => h('div', { class: 'apill k-' + n.kind }, h('span', { class: 'apill-ico' }, n.ico || '•'), h('span', null, n.text))));
  }

  function cardTiers(p, w) {
    const raw = w ? (w.joueurs || {})[p.slug] : null;
    const cfgT = { O: [...((p._cfg && p._cfg.pool_ids) || p.pool_ids || [])], M: [...((p._cfg && p._cfg.maitrise_ids) || [])] };
    return (w && FC.normTiers(raw)) || cfgT;
  }

  function editMine(w) {
    const p = S.players.find((x) => x.slug === S.moi);
    if (!p) return;
    const t = cardTiers(p, w);
    S.cardEdit = { slug: p.slug, O: [...t.O], M: [...t.M] };
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
      !editing && canEdit(p.slug) ? h('button', { class: 'btn-ghost', onclick: () => { S.cardEdit = { slug: p.slug, O: [...(tiers ? tiers.O : [])], M: [...(tiers ? tiers.M : [])] }; S.pickQ = ''; S.pickRow = 'O'; render(); } }, mine && !S.coachState.coach ? '✏️ Modifier ma tierlist' : '✏️ Modifier') : null);
    if (editing) return h('article', { class: 'card pool-card editing' }, head, cardEditor(p, w));

    const ch = w && prev ? FC.poolChanges((prev.joueurs || {})[p.slug], raw) : null;
    const changes = ch && ch.length ? h('div', { class: 'changes' }, h('span', { class: 'muted small' }, 'Depuis la semaine d’avant :'),
      ch.map((c) => h('span', { class: 'chg ' + (c.type === 'add' ? 'add' : 'del') }, `${c.type === 'add' ? '+' : '−'} ${c.champion} ${TI[c.k].ico}`))) : null;

    const A = d ? FC.poolAnalysis(p, d.matches, d.champs, tiers, rng.start, rng.end) : null;
    const chipOf = (id, k) => {
      const c = A ? (k === 'O' ? A.oblig : A.maitrise).find((x) => x.id === id) : null;
      return h('span', { class: 'pchip' + (c && c.verdict ? ' v-' + c.verdict.kind : '') }, champIcon(id, 34),
        h('span', null, h('b', null, FC.champName(id)), h('span', { class: 'muted small' }, c && c.games ? ` ${c.games} g · ${fr(c.wr)} %` : ' pas joué')));
    };
    const tierRows = h('div', { class: 'tiers' }, TIERS.map((k) => h('div', { class: 'tier-row r' + k }, tierLabel(k),
      h('div', { class: 'tier-chips' }, (tiers[k] || []).length ? tiers[k].map((id) => chipOf(id, k)) : h('span', { class: 'muted small' }, k === 'O' ? 'aucun champion obligatoire' : 'aucun champion maîtrisé')))));
    const o = d && obj ? FC.objectif({ ...p, pool_ids: tiers.O }, d.matches, obj) : null;
    const sup = p.role_id === 'support';
    const group = (title, list, small, empty) => h('div', { class: 'cgroup' }, h('h3', null, title), list.length ? h('div', { class: 'cgrid' + (small ? ' small' : '') }, list.map((c) => champCard(c, small))) : h('p', { class: 'muted small' }, empty));
    const body = A ? [
      o ? progress(o, true) : null,
      catBar({ oblig: A.tot.oblig.games, maitrise: A.tot.maitrise.games, autres: A.tot.autres.games }),
      alertPills(A.notes),
      group('🎯 Obligatoires', A.oblig, false, 'Aucun champion obligatoire.'),
      group('⭐ Maîtrisés', A.maitrise, false, 'Aucun champion maîtrisé.'),
      A.autres.length ? group('❔ Autres champions joués', A.autres, true, '') : null,
      h('details', { class: 'more' }, h('summary', null, 'Tableau détaillé'), h('div', { class: 'scroll' }, h('table', { class: 't' },
        h('thead', null, h('tr', null, h('th', { class: 'l' }, 'Champion'), ['Ligne', 'Games', 'V – D', 'Win rate %', 'KDA', sup ? 'Vision' : 'CS/min', 'Golds @15', 'Ce split'].map((x) => h('th', null, x)))),
        h('tbody', null, [...A.oblig.map((c) => ['🎯', c]), ...A.maitrise.map((c) => ['⭐', c]), ...A.autres.map((c) => ['❔', c])].map(([k, c]) => h('tr', null,
          h('td', { class: 'l' }, h('span', { class: 'tcell' }, champIcon(c.id, 22), c.champion)), h('td', null, k), h('td', null, c.games), h('td', null, c.games ? `${c.wins} – ${c.losses}` : '—'),
          h('td', { class: c.wr == null ? '' : c.wr >= 50 ? 'good' : 'bad' }, fr(c.wr, 1)), h('td', null, fr(c.kda, 2)), h('td', null, sup ? fr(c.vision, 1) : fr(c.cs_min, 1)),
          h('td', { class: c.gold15 > 0 ? 'good' : c.gold15 < 0 ? 'bad' : '' }, sg(c.gold15)), h('td', null, c.split ? `${c.split.games} g · ${fr(c.split.wr)} %` : '—')))))))
    ] : [h('p', { class: 'muted small' }, 'Lecture des stats sur dpm.lol…')];
    return h('article', { class: 'card pool-card' }, head, changes,
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
        t[k].length ? t[k].map((id) => {
          const other = k === 'O' ? 'M' : 'O';
          const both = t[other].includes(id);
          return h('span', { class: 'pchip edit' }, champIcon(id, 30), h('b', null, FC.champName(id)),
            h('button', { class: 'ibtn' + (both ? ' on' : ''), title: both ? `Retirer de ${TI[other].label}` : `Ajouter aussi en ${TI[other].label}`, onclick: () => { if (both) t[other] = t[other].filter((x) => x !== id); else t[other].push(id); changed(); } }, TI[other].ico),
            h('button', { class: 'ibtn', title: 'Retirer', onclick: () => { t[k] = t[k].filter((x) => x !== id); changed(); } }, '✕'));
        }) : h('span', { class: 'muted small' }, k === 'O' ? 'vide : clique sur des portraits ci-dessous' : 'vide'))))); 
    }
    function drawGrid() {
      const q = norm(S.pickQ);
      const row = S.pickRow || 'O';
      const shown = list.filter((c) => !q || norm(c.name).includes(q) || norm(c.id).includes(q));
      grid.replaceChildren(...(shown.length ? shown.map((c) => {
        const inO = t.O.includes(c.id), inM = t.M.includes(c.id);
        return h('button', { class: 'pk' + (inO ? ' inO' : '') + (inM ? ' inM' : '') + ((row === 'O' ? inO : inM) ? ' sel' : ''), title: c.name,
          onclick: () => { const arr = t[row]; if (arr.includes(c.id)) t[row] = arr.filter((x) => x !== c.id); else arr.push(c.id); changed(); } },
          champIcon(c.id, 48), h('span', { class: 'pk-n' }, c.name), inO || inM ? h('span', { class: 'pk-b' }, (inO ? '🎯' : '') + (inM ? '⭐' : '')) : null);
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
      h('div', { class: 'pk-bar' }, h('span', { class: 'muted small' }, 'Je clique pour ajouter en :'), modeBtn('O', '🎯 Obligatoires'), modeBtn('M', '⭐ Maîtrisés'), search),
      h('p', { class: 'muted small' }, 'Un clic ajoute le champion dans la ligne choisie, un 2e clic l’enlève. Un champion peut être dans les deux lignes.'),
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
          const r = await window.fire.coach.savePools({ type: 'joueur', slug: p.slug, debut, objectif: (w && w.objectif) || (S.cfgObj && S.cfgObj.games) || 20, tiers: { O: e.O, M: e.M }, par: S.coachState.coach && S.moi !== p.slug ? 'coach' : 'joueur' });
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
      joueurs[p.slug] = t ? { O: [...t.O], M: [...t.M], par: (base.joueurs[p.slug] || {}).par, maj: (base.joueurs[p.slug] || {}).maj } : { O: [...((p._cfg && p._cfg.pool_ids) || p.pool_ids || [])], M: [...((p._cfg && p._cfg.maitrise_ids) || [])] };
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
      const r = await window.fire.coach.savePools({ type: 'save', semaine: { id: e.id, debut: e.debut, objectif: e.objectif, note: e.note, joueurs: e.joueurs } });
      e.busy = false;
      if (r.ok) { S.pools = r.semaines; const w = r.semaines.find((x) => x.debut === e.debut); S.poolWeek = w ? w.id : null; S.poolEdit = null; S.flash = 'Semaine publiée ✓ Les joueurs la verront à leur prochaine ouverture.'; applyWeek(); }
      else e.err = r.error;
      render();
    } }, e.busy ? 'Publication…' : "📣 Publier pour l'équipe");
    view.replaceChildren(
      h('header', { class: 'sec-hero pool-hero' }, h('div', { class: 'sec-ico' }, e.id ? '✏️' : '➕'), h('div', null, h('h1', { class: 'title' }, e.id ? 'Modifier la semaine' : 'Nouvelle semaine'),
        h('p', { class: 'muted' }, "🎯 La ligne OBLIGATOIRE compte pour l'objectif. ⭐ MAÎTRISÉS : les champions sûrs du joueur. Un champion peut être dans les deux."))),
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
      lines.push(`${p.role} ${p.pseudo} : obligatoires [${A.oblig.map(fmt).join(' ; ')}] ; maîtrisés [${A.maitrise.map(fmt).join(' ; ')}]` + (A.autres.length ? ` ; autres [${A.autres.map(fmt).join(' ; ')}]` : ''));
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
