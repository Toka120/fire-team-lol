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
    refreshing: false, lastRefresh: null, timer: null
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
    S.players = (S.cfg && S.cfg.joueurs) || [];
    S.obj = (S.cfg && S.cfg.objectif && S.cfg.objectif.debut) ? S.cfg.objectif : null;
    if (S.obj) S.period = 'obj';
    const need = S.cfg && S.cfg.code_sha256;
    if (need && load('fire.unlock', null) !== need) showLock();
    else showApp();
  }

  function showLock() {
    $('lock').hidden = false;
    $('app').hidden = true;
    const inp = $('code');
    setTimeout(() => inp.focus(), 50);
    const go = async () => {
      const v = inp.value.replace(/[^a-z0-9]/gi, '').toUpperCase();
      if (!v) return;
      const hsh = await window.fire.hash(v);
      if (hsh === S.cfg.code_sha256) {
        save('fire.unlock', hsh);
        $('lock').hidden = true;
        showApp();
      } else {
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
    render();
    refreshAll();
    S.timer = setInterval(refreshAll, REFRESH_EVERY);
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
    $('refresh').onclick = () => refreshAll();
    $('back').onclick = () => { S.view = 'hub'; S.player = null; render(); window.scrollTo(0, 0); };
    let t = null;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 200); });
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
    if (S.view === 'hub') render();
    let i = 0;
    const worker = async () => {
      while (i < list.length) {
        const p = list[i++];
        S.status[p.slug] = { state: 'loading' };
        renderStatus();
        if (S.view === 'hub') render();
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
        if (S.view === 'hub' || S.player === p.slug) render();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    S.refreshing = false;
    S.lastRefresh = Date.now();
    $('refresh').disabled = false;
    renderStatus();
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
    $('back').hidden = S.view !== 'player';
    if (S.view === 'player') renderPlayer();
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
    view.replaceChildren(
      h('div', null,
        h('h1', { class: 'title' }, "L'équipe"),
        h('p', { class: 'muted' }, `Classé Solo/Duo · ${periodLabel()} · clique sur un joueur pour voir tout le détail.`),
        S.obj && S.obj.games ? h('p', { class: 'muted small' }, `🎯 Objectif du coach : ${S.obj.games} games sur le pool imposé depuis le ${dateFr(S.obj.debut)}, réparties comme chacun veut sur ses champions.`) : null),
      h('div', { class: 'hub-grid' }, S.players.map((p) => hubCard(p, start)))
    );
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

  start();
})();
