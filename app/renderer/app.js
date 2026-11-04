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
    section: 'stats', version: '0', guides: null, theme: null,
    fiches: null, fichesErr: '', fichesLoading: false, ficheId: null, seen: new Set(load('fire.vus', [])),
    coachState: { coach: false, claude: false, github: false }, draft: null, flash: '', settingsMsg: '', confirm: null
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
      h('div', { class: 'objline' }, h('span', null, `🎯 Objectif : ${o.done} / ${o.target} games sur le pool`), h('span', { class: 'muted small' }, o.done >= o.target ? 'atteint ✓' : `reste ${o.reste}`)),
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
    if (S.period === 'obj' && S.obj) return new Date(S.obj.debut + 'T00:00:00').getTime();
    if (S.period === 'since' && S.since) return new Date(S.since + 'T00:00:00').getTime();
    if (S.period === '1') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    const n = S.period === 'since' ? 7 : Number(S.period);
    return Date.now() - n * 86400000;
  }
  function periodLabel() {
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
    if (S.obj) S.period = 'obj';
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
    refreshAll();
    S.timer = setInterval(refreshContent, REFRESH_EVERY);
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
      if (S.section === 'stats') { S.view = 'hub'; S.player = null; } else if (S.section === 'guides') S.theme = null; else S.ficheId = null;
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
      if (S.section === 'guides' && !typing()) render();
    }).catch(() => { S.guides = S.guides || []; });
  }

  async function refreshContent() {
    try {
      const c = await window.fire.config();
      if (c && Array.isArray(c.joueurs) && c.joueurs.length) {
        S.cfg = c;
        S.players = c.joueurs;
        const o = (c.objectif && c.objectif.debut) ? c.objectif : null;
        S.obj = o;
        const opt = $('period').querySelector('option[value=obj]');
        if (opt && o) opt.textContent = `Objectif (depuis le ${dateFr(o.debut)})`;
        renderUpdate();
      }
    } catch (e) { /* hors ligne : on garde la configuration actuelle */ }
    loadGuides();
    loadFiches();
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
      h('div', null, h('h1', { class: 'title' }, '⚙️ Paramètres')),
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
    $('period-box').hidden = S.section !== 'stats';
    const back = $('back');
    back.hidden = S.section === 'settings' || !(S.section === 'stats' ? S.view === 'player' : S.section === 'guides' ? !!S.theme : !!S.ficheId);
    back.textContent = S.section === 'stats' ? '← Équipe' : S.section === 'guides' ? '← Lanes et principes' : '← Parole du coach';
    if (S.section === 'settings') renderSettings();
    else if (S.section === 'guides') { if (S.theme) renderTheme(); else renderGuides(); }
    else if (S.section === 'coach') { if (S.ficheId) renderFicheView(); else renderCoach(); }
    else if (S.view === 'player') renderPlayer();
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
      h('div', null,
        h('h1', { class: 'title' }, "L'équipe"),
        h('p', { class: 'muted' }, `Classé Solo/Duo · ${periodLabel()} · clique sur un joueur pour voir tout le détail.`),
        S.obj && S.obj.games ? h('p', { class: 'muted small' }, `🎯 Objectif du coach : ${S.obj.games} games sur le pool imposé depuis le ${dateFr(S.obj.debut)}, réparties comme chacun veut sur ses champions.`) : null),
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
      roleLine(p, R), h('div', { class: 'pname' }, p.pseudo), p.pool ? h('div', { class: 'muted small' }, 'Pool : ' + p.pool) : null);
    if (d) {
      const s = FC.stats(FC.toRows(p, d.matches, start));
      const box = h('div');
      card.append(h('div', { class: 'mini' }, box, h('div', { class: 'mini-info' },
        h('div', null, s.games ? `${pl(s.wins, 'victoire', 'victoires')} · ${pl(s.losses, 'défaite', 'défaites')}` : 'Aucune game'),
        h('div', { class: 'muted small' }, s.games ? `KDA ${fr(s.kda, 2)} · ${fr(s.morts_moy, 1)} morts/game` : periodLabel()),
        d.rank ? h('div', { class: 'muted small' }, d.rank) : null)));
      later(() => ring(box, s, 84));
      card.append(progress(FC.objectif(p, d.matches, S.obj)));
    }
    card.append(h('div', { class: 'pstatus ' + ((st && st.state) || '') }, statusText(st, d)));
    return card;
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
        h('div', { class: 'tags' }, tag(`${R.ico} ${p.role || R.label}`), tag('Classé Solo/Duo'), p.pool ? tag('Pool : ' + p.pool) : null, d.rank ? tag(d.rank) : null),
        h('h1', { class: 'title' }, p.pseudo),
        h('p', { class: 'muted small' }, `${cap(periodLabel())} · ${pl(s.games, 'game', 'games')} · stats dpm.lol de ${hm(d.at)} · `,
          h('a', { href: 'https://dpm.lol/' + p.slug, target: '_blank' }, 'voir sur dpm.lol')),
        h('p', { class: 'lead' }, FC.lead(p, s)),
        progress(obj, true)),
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

    page.append(h('div', { class: 'card' },
      h('h2', null, '🎯 Points forts et points à travailler'),
      h('p', { class: 'muted small' }, 'Calculés automatiquement à partir des chiffres de la période, à confirmer au replay.'),
      h('div', { class: 'alerts' }, FC.insights(p, rows, s, d.champs, obj).map((x) => h('div', { class: 'alert ' + x.kind }, h('div', { class: 'alert-h' }, `${x.ico} ${x.title}`), h('p', null, x.text))))));

    if (days.length) {
      const c = h('div', { class: 'chart' });
      page.append(h('div', { class: 'card' }, h('h2', null, 'Victoires et défaites par jour'), h('p', { class: 'muted small' }, 'Clique sur une barre pour voir les games du jour.'), c));
      later(() => dayChart(c, days));
    }
  }

  function pageJours(page, p, R, rows, s, days) {
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
        h('h2', null, `🎯 Objectif du coach : ${obj.target} games sur le pool`),
        h('p', { class: 'muted small' }, `Compté en Solo/Duo depuis le ${dateFr(obj.debut)}, uniquement sur les champions du pool imposé${p.pool ? ' (' + p.pool + ')' : ''}, répartis comme il veut. Les games hors pool ne comptent pas.`),
        progress(obj, true),
        h('p', { class: 'small' }, `${obj.wins} V – ${obj.losses} D sur ces games de pool${obj.wr != null ? ` (${fr(obj.wr, 1)} %)` : ''}. ${obj.hors_pool ? `${pl(obj.hors_pool, 'game hors pool', 'games hors pool')} en plus, non comptée${obj.hors_pool > 1 ? 's' : ''}.` : 'Aucune game hors pool.'}`),
        chart,
        h('div', { class: 'scroll' }, h('table', { class: 't' },
          h('thead', null, h('tr', null, h('th', { class: 'l' }, 'Champion du pool'), ['Games', 'V', 'D', 'Win rate %', 'KDA', 'Morts', p.role_id === 'support' ? 'Vision' : 'CS/min', 'Golds @15'].map((x) => h('th', null, x)))),
          h('tbody', null, obj.per.map((c) => h('tr', null, h('td', { class: 'l' }, c.champion), h('td', null, c.games), h('td', null, c.wins), h('td', null, c.losses),
            h('td', { class: c.wr == null ? '' : c.wr >= 50 ? 'good' : 'bad' }, fr(c.wr, 1)), h('td', null, fr(c.kda, 2)), h('td', null, fr(c.morts_moy, 1)),
            h('td', null, p.role_id === 'support' ? fr(c.vision, 1) : fr(c.cs_min, 1)), h('td', { class: c.gold15 > 0 ? 'good' : c.gold15 < 0 ? 'bad' : '' }, sg(c.gold15)))))))));
      later(() => objChart(chart, obj));
    }
    const grid = h('div', { class: 'champs' });
    champs.forEach((c) => {
      const box = h('div');
      grid.append(h('div', { class: 'card cc' }, box, h('div', null, h('div', { class: 'n' }, c.champion), h('div', { class: 'm' },
        h('span', null, c.pool ? '✅ Pool imposé' : '⚠️ Hors pool'),
        h('span', null, `${pl(c.games, 'game', 'games')} · ${c.wins} V – ${c.losses} D`),
        h('span', null, `KDA ${fr(c.kda, 2)} · ${fr(c.morts_moy, 1)} morts/game`),
        h('span', null, p.role_id === 'support' ? `Vision ${fr(c.vision, 1)} · golds @15 ${sg(c.gold15)}` : `${fr(c.cs_min, 1)} CS/min · golds @15 ${sg(c.gold15)}`)))));
      later(() => ring(box, c, 84));
    });
    page.append(h('div', { class: 'card' }, h('h2', null, `Tous ses champions ${periodLabel()}`), h('p', { class: 'muted small' }, 'Le cercle montre le win rate. Moyennes par game. Les champions hors pool apparaissent aussi ici.'),
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
      ['🧙 Pool imposé', `Les champions que le coach lui demande de jouer${p.pool ? ' : ' + p.pool : ''}.`]
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
    if (sec === 'guides') S.theme = null;
    if (sec === 'coach') S.ficheId = null;
    if (sec === 'stats') { S.view = 'hub'; S.player = null; }
    render();
    window.scrollTo(0, 0);
  }

  function renderNav() {
    const n = unseen().length;
    const b = (id, label, badge) => h('button', { class: 'navbtn', 'aria-current': S.section === id ? 'page' : null, onclick: () => go(id) }, label, badge ? h('span', { class: 'nbadge' }, badge) : null);
    const u = S.upd || {};
    const upd = (u.auto && u.state === 'ready') || (u.latest && newer(u.latest, S.version)) ? '1' : null;
    $('nav').replaceChildren(b('stats', '📊 Stats des joueurs'), b('guides', '📚 Lanes et principes'), b('coach', '📣 Parole du coach', n || null), b('settings', '⚙️ Paramètres', upd));
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

  const svgSrc = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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

  // ----- Lanes et principes -----
  function renderGuides() {
    const view = $('view');
    const head = h('div', null, h('h1', { class: 'title' }, '📚 Lanes et principes'),
      h('p', { class: 'muted' }, 'Tous les principes de LoL, expliqués simplement, avec des schémas. Clique sur un thème. À jour pour la saison 2026.'));
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
      ...docNodes(t),
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
    const nodes = [h('div', null, h('h1', { class: 'title' }, '📣 Parole du coach'),
      h('p', { class: 'muted' }, "Les fiches et les messages du coach pour l'équipe. Les nouvelles fiches arrivent toutes seules à l'ouverture de l'application.")) ];
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
    const btn = h('button', { class: 'btn-ghost', onclick: async () => {
      if (!a.value && !g.value) return;
      btn.disabled = true; btn.textContent = 'Vérification…';
      const r = await window.fire.coach.save({ anthropic: a.value, github: g.value });
      S.coachState = { coach: r.coach, claude: r.claude, github: r.github };
      S.settingsMsg = (r.messages || []).join(' ') || r.error || '';
      render();
    } }, 'Enregistrer');
    return h('details', { class: 'card settings', open: !(st.claude && st.github) ? true : null },
      h('summary', null, `⚙️ Réglages coach · Claude ${st.claude ? '✓' : '✗'} · GitHub ${st.github ? '✓' : '✗'}`),
      h('p', { class: 'muted small' }, "Ces clés restent sur cet ordinateur, chiffrées par Windows. Elles ne sont jamais envoyées aux joueurs."),
      h('label', { class: 'fld' }, h('span', null, "Clé de l'API Claude (pour les fiches avec recherche)"), a),
      h('label', { class: 'fld' }, h('span', null, 'Jeton GitHub (pour publier les fiches)'), g),
      h('div', { class: 'row' }, btn, S.settingsMsg ? h('span', { class: 'small' }, S.settingsMsg) : null),
      h('details', { class: 'help' }, h('summary', null, 'Comment obtenir ces clés ?'),
        h('ol', { class: 'small' },
          h('li', null, 'Clé Claude : sur ', h('a', { href: 'https://console.anthropic.com/settings/keys', target: '_blank' }, 'console.anthropic.com'), ', crée un compte, ajoute du crédit (Billing), puis « Create Key ». Chaque fiche générée est facturée sur ce compte.'),
          h('li', null, 'Jeton GitHub : sur ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank' }, 'github.com → Fine-grained token'), ', choisis « Only select repositories » → Toka120/fire-team-lol, puis Permissions → Contents : « Read and write ». Le propriétaire du dépôt (Toka120) doit le créer ou donner accès au coach.'))));
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

  start();
})();
