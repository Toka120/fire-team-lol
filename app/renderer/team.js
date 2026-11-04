// FIRE LoL - stats de l'équipe : les parties classées Flex jouées ensemble (au moins 2 joueurs de FIRE dans la même équipe).
// Entrée : le résumé de chaque partie lu sur dpm.lol (les 10 joueurs, objectifs des deux équipes), voir app/teamgrab.js.
(function (root) {
  const FLEX = 440;
  const LEAD = 1000;     // avance (ou retard) d'or à 15 min qu'on considère comme nette
  const MIN_N = 4;       // nombre de games minimum pour tirer une conclusion
  const LONG = 32 * 60;  // game longue
  const SHORT = 25 * 60; // game courte

  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const avg = (xs) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);
  const r1 = (x) => Math.round(x * 10) / 10;
  const fr1 = (x) => String(r1(x)).replace('.', ',');
  const signed = (x) => (x > 0 ? '+' : '') + Math.round(x).toLocaleString('fr-FR');
  const plural = (n, a, b) => `${n} ${n > 1 ? b : a}`;

  // Repère les parties Flex communes à partir de l'historique de chaque joueur (l'app le garde déjà).
  // players : [{ slug, puuid }] ; data : { slug: { matches: [{ id, q, t, win }] } }
  function candidates(players, data) {
    const by = {};
    for (const p of players) {
      if (!p.slug || !p.puuid) continue;
      for (const m of (data[p.slug] && data[p.slug].matches) || []) {
        if (m.q !== FLEX || !m.id) continue;
        const g = (by[m.id] = by[m.id] || { id: String(m.id), t: m.t, who: [] });
        if (!g.who.includes(p.puuid)) g.who.push(p.puuid);
      }
    }
    return Object.values(by).filter((g) => g.who.length >= 2).sort((a, b) => b.t - a.t);
  }

  // Une partie vue depuis notre équipe.
  function view(g, roster) {
    const byPuuid = new Map(roster.map((p) => [p.puuid, p]));
    const mine = g.p.filter((x) => byPuuid.has(x.id));
    if (mine.length < 2) return null;
    const side = mine[0].side;
    if (mine.some((x) => x.side !== side)) return null; // joueurs FIRE dans les deux équipes : ce n'est pas une game d'équipe
    const us = side === 100 ? g.s100 : g.s200;
    const them = side === 100 ? g.s200 : g.s100;
    return {
      id: g.id, t: g.t, dur: g.d, win: us.win, size: mine.length, us, them,
      members: mine.map((x) => ({ ...x, slug: byPuuid.get(x.id).slug, pseudo: byPuuid.get(x.id).pseudo })),
      allies: g.p.filter((x) => x.side === side), enemies: g.p.filter((x) => x.side !== side),
      gd15: us.gd15
    };
  }

  function wr(list) {
    const w = list.filter((g) => g.win).length;
    return { n: list.length, w, l: list.length - w, wr: pct(w, list.length) };
  }

  function analyze(rawGames, roster) {
    const games = rawGames.map((g) => view(g, roster)).filter(Boolean).sort((a, b) => b.t - a.t);
    const all = wr(games);
    const res = { games, all, good: [], bad: [], forts: [], plan: [] };
    if (!games.length) return res;
    const W = games.filter((g) => g.win), L = games.filter((g) => !g.win);

    // ---- chiffres clés ----
    const k = {
      kills: avg(games.map((g) => g.us.k)), deaths: avg(games.map((g) => g.us.d)),
      deathsW: avg(W.map((g) => g.us.d)), deathsL: avg(L.map((g) => g.us.d)),
      dragUs: avg(games.map((g) => g.us.drag)), dragThem: avg(games.map((g) => g.them.drag)),
      grubsUs: avg(games.map((g) => g.us.grubs)), grubsThem: avg(games.map((g) => g.them.grubs)),
      heraldUs: avg(games.map((g) => g.us.herald)), heraldThem: avg(games.map((g) => g.them.herald)),
      baronUs: avg(games.map((g) => g.us.baron)), baronThem: avg(games.map((g) => g.them.baron)),
      towersUs: avg(games.map((g) => g.us.towers)), towersThem: avg(games.map((g) => g.them.towers)),
      visUs: avg(games.map((g) => g.us.vis / (g.dur / 60))), visThem: avg(games.map((g) => g.them.vis / (g.dur / 60))),
      cw: avg(games.map((g) => g.us.cw)), cwThem: avg(games.map((g) => g.them.cw)),
      gd15: avg(games.map((g) => g.gd15)), dur: avg(games.map((g) => g.dur / 60)),
      fb: pct(games.filter((g) => g.us.fb).length, games.length)
    };
    res.k = k;

    // ---- winrates par situation ----
    const S = {
      fb: wr(games.filter((g) => g.us.fb)), noFb: wr(games.filter((g) => !g.us.fb)),
      ahead: wr(games.filter((g) => g.gd15 >= LEAD)), behind: wr(games.filter((g) => g.gd15 <= -LEAD)), even: wr(games.filter((g) => Math.abs(g.gd15) < LEAD)),
      moreDrag: wr(games.filter((g) => g.us.drag > g.them.drag)), lessDrag: wr(games.filter((g) => g.us.drag < g.them.drag)),
      moreGrubs: wr(games.filter((g) => g.us.grubs > g.them.grubs)), lessGrubs: wr(games.filter((g) => g.us.grubs < g.them.grubs)),
      baron: wr(games.filter((g) => g.us.baron > 0)), theirBaron: wr(games.filter((g) => g.them.baron > 0)),
      short: wr(games.filter((g) => g.dur < SHORT)), mid: wr(games.filter((g) => g.dur >= SHORT && g.dur < LONG)), long: wr(games.filter((g) => g.dur >= LONG)),
      recent: wr(games.slice(0, 10))
    };
    res.S = S;
    res.throws = games.filter((g) => g.gd15 >= LEAD && !g.win);
    res.comebacks = games.filter((g) => g.gd15 <= -LEAD && g.win);

    // ---- par taille de groupe, par joueur, par duo ----
    res.bySize = [2, 3, 4, 5].map((n) => ({ size: n, ...wr(games.filter((g) => g.size === n)) })).filter((x) => x.n);
    res.byMember = roster.map((p) => {
      const gs = games.filter((g) => g.members.some((m) => m.slug === p.slug));
      const ms = gs.map((g) => g.members.find((m) => m.slug === p.slug));
      return { slug: p.slug, pseudo: p.pseudo, ...wr(gs), kp: avg(ms.map((m) => (m.kp <= 1 ? m.kp * 100 : m.kp))), deaths: avg(ms.map((m) => m.d)), g15: avg(ms.map((m) => m.g15)),
        kda: ms.length ? (ms.reduce((a, m) => a + m.k + m.a, 0) / Math.max(1, ms.reduce((a, m) => a + m.d, 0))) : 0 };
    }).filter((x) => x.n);
    const pairs = {};
    for (const g of games) {
      const ms = g.members.map((m) => m.slug).sort();
      for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) (pairs[ms[i] + '|' + ms[j]] = pairs[ms[i] + '|' + ms[j]] || []).push(g);
    }
    const name = (slug) => (roster.find((p) => p.slug === slug) || {}).pseudo || slug;
    const short = (slug) => name(slug).split('#')[0];
    res.pairs = Object.entries(pairs).map(([k2, gs]) => ({ a: k2.split('|')[0], b: k2.split('|')[1], label: k2.split('|').map(short).join(' + '), ...wr(gs) }))
      .sort((x, y) => y.n - x.n || y.wr - x.wr);
    const champs = {};
    for (const g of games) for (const m of g.members) (champs[m.slug + '|' + m.c] = champs[m.slug + '|' + m.c] || []).push(g);
    res.champs = Object.entries(champs).map(([k2, gs]) => ({ slug: k2.split('|')[0], who: short(k2.split('|')[0]), c: k2.split('|')[1], ...wr(gs) }))
      .filter((x) => x.n >= 2).sort((x, y) => y.wr - x.wr || y.n - x.n);

    // ---- bonnes et mauvaises actions, avec la stratégie à prendre ----
    const good = (titre, detail, garder) => res.good.push({ titre, detail, garder });
    const bad = (titre, detail, strat, poids) => res.bad.push({ titre, detail, strat, poids });
    const n = games.length;

    if (S.ahead.n >= 3 && S.ahead.wr < 70 && res.throws.length >= 2) {
      bad('Vous perdez des games où vous étiez devant',
        `${plural(res.throws.length, 'game perdue', 'games perdues')} avec plus de ${LEAD.toLocaleString('fr-FR')} golds d'avance à 15 min (victoire dans ${S.ahead.wr} % des games où vous êtes devant).`,
        ['Après un avantage : on se regroupe et on prend un objectif (dragon, larves, tour), pas un kill de plus.',
          'Plus de poursuites dans la jungle adverse sans vision : on recule dès que 2 adversaires disparaissent.',
          'Avant le Baron : wards et pinks autour de la fosse, et les lanes de côté poussées.',
          'Un seul appel à la fois : celui qui shotcall dit « on fait X », les autres suivent.'], 3 + res.throws.length);
    }
    if (n >= MIN_N && (k.gd15 <= -500 || (S.behind.n >= Math.max(2, n * 0.4)))) {
      bad('Début de partie difficile',
        `Vous êtes en moyenne à ${signed(k.gd15)} golds à 15 min, et derrière de plus de ${LEAD.toLocaleString('fr-FR')} golds dans ${pct(S.behind.n, n)} % des games.`,
        ['Niveaux 1 à 3 plus prudents : on ne force pas sans prio de lane.',
          'Ward dans la rivière vers 2:45, avant l\'arrivée du jungler adverse.',
          'Le jungler commence du côté de la lane la plus forte et y fait son premier gank.',
          'On échange : s\'ils prennent un objectif, on prend autre chose de l\'autre côté.'], 2.5);
    }
    if (n >= MIN_N && k.dragThem - k.dragUs >= 0.6) {
      bad('Les dragons partent chez l\'adversaire',
        `${fr1(k.dragUs)} dragon par game pour vous contre ${fr1(k.dragThem)} pour eux. Quand ils ont plus de dragons, vous gagnez ${S.lessDrag.wr} % du temps.`,
        ['1 minute avant le dragon : bot et mid poussent leur wave.',
          'Le support et le jungler posent wards et pink autour de la fosse.',
          'Le jungler garde son Smite pour la fin du dragon.',
          'Si vous ne pouvez pas contester : prenez larves, Héraut ou une tour en haut à la place.'], 2.4);
    }
    if (n >= MIN_N && k.grubsThem - k.grubsUs >= 1.5) {
      bad('Les larves du Néant vous échappent',
        `${fr1(k.grubsUs)} larves par game pour vous contre ${fr1(k.grubsThem)} pour eux.`,
        ['À 7:30, top et mid poussent leur wave pour que le jungler y aille avec eux.',
          'Ward du côté de la fosse du haut vers 7:00.',
          'Si le jungler adverse est vu en bas : larves gratuites.'], 1.5);
    }
    if (n >= MIN_N && L.length >= 2 && k.deathsL >= 25) {
      bad('Trop de morts dans les défaites',
        `${Math.round(k.deathsL)} morts en moyenne quand vous perdez, contre ${Math.round(k.deathsW)} quand vous gagnez.`,
        ['Pas de fight à 4 contre 5 : on attend le 5e ou on recule.',
          'En side lane : ward devant soi, et on recule si 2 adversaires disparaissent.',
          'Après un fight perdu : on lâche l\'objectif et on farm en sécurité.'], 2.2);
    }
    if (n >= MIN_N && k.visThem - k.visUs >= 0.25) {
      bad('Vous voyez moins que l\'adversaire',
        `Score de vision de l\'équipe : ${fr1(k.visUs)} par minute contre ${fr1(k.visThem)} pour eux ; ${fr1(k.cw)} pinks par game contre ${fr1(k.cwThem)}.`,
        ['Une pink achetée à chaque back, par tout le monde.',
          'Le support et le jungler passent au trinket de balayage en milieu de partie.',
          'Avant chaque objectif : on éclaire d\'abord, on entre ensuite.'], 1.8);
    }
    if (S.long.n >= 3 && S.long.wr <= 40) {
      bad('Les fins de game vous échappent',
        `Victoire dans ${S.long.wr} % des games de plus de ${LONG / 60} min (${S.long.w} sur ${S.long.n}).`,
        ['En fin de partie : on joue groupé autour du prochain objectif, une seule lane de côté.',
          'Personne ne meurt seul avant un Baron ou un Dragon ancestral : un mort = objectif perdu.',
          'Avec un avantage : on finit la game avec le Baron au lieu d\'attendre.'], 1.7);
    }
    if (n >= MIN_N && k.fb <= 35) {
      bad('Le premier sang est souvent pour eux',
        `Vous ne prenez le premier sang que dans ${k.fb} % des games (victoire dans ${S.noFb.wr} % des games sans premier sang).`,
        ['Au niveau 1 : pas d\'invasion sans les 5, et toujours un ward sur l\'entrée de votre jungle.',
          'En lane : on ne joue pas l\'échange au niveau 2 si l\'adversaire l\'atteint en premier.'], 1.2);
    }
    if (n >= MIN_N && k.towersThem - k.towersUs >= 1.5) {
      bad('Vous perdez plus de tours que vous n\'en prenez',
        `${fr1(k.towersUs)} tours prises par game contre ${fr1(k.towersThem)} perdues.`,
        ['Après chaque kill ou objectif : on pousse une tour avant de back.',
          'Le Héraut sert à prendre une tour : on le lance sur la lane où votre équipe est.'], 1.3);
    }

    if (S.ahead.n >= 3 && S.ahead.wr >= 70) good('Vous concluez quand vous êtes devant', `Victoire dans ${S.ahead.wr} % des games où vous avez plus de ${LEAD.toLocaleString('fr-FR')} golds d'avance à 15 min (${S.ahead.w} sur ${S.ahead.n}).`, 'Continuez à jouer les objectifs juste après un avantage.');
    if (res.comebacks.length >= 2 || (S.behind.n >= 3 && S.behind.wr >= 40)) good('Vous ne lâchez rien', `${plural(res.comebacks.length, 'victoire', 'victoires')} en étant derrière de plus de ${LEAD.toLocaleString('fr-FR')} golds à 15 min.`, 'Gardez le calme quand le début se passe mal : la game n\'est jamais finie à 15 min.');
    if (n >= MIN_N && k.dragUs - k.dragThem >= 0.6) good('Vous contrôlez les dragons', `${fr1(k.dragUs)} dragons par game pour vous contre ${fr1(k.dragThem)} pour eux ; victoire dans ${S.moreDrag.wr} % des games où vous en avez plus.`, 'Gardez le même rituel avant chaque dragon : waves poussées, vision, Smite.');
    if (n >= MIN_N && k.grubsUs - k.grubsThem >= 1.5) good('Les larves sont pour vous', `${fr1(k.grubsUs)} larves par game contre ${fr1(k.grubsThem)} pour eux.`, 'Utilisez les larves pour prendre les tours du haut tôt.');
    if (n >= MIN_N && k.visUs - k.visThem >= 0.25) good('Vous voyez mieux que l\'adversaire', `Vision de l\'équipe : ${fr1(k.visUs)} par minute contre ${fr1(k.visThem)}.`, 'Servez-vous de cette vision pour attraper des adversaires isolés.');
    if (n >= MIN_N && k.fb >= 55 && S.fb.wr >= all.wr + 5) good('Vous prenez le premier sang', `Premier sang dans ${k.fb} % des games (victoire dans ${S.fb.wr} % de ces games).`, 'Transformez ce premier avantage en objectif : dragon ou larves juste après.');
    if (n >= MIN_N && k.gd15 >= 500) good('Bon début de partie', `En moyenne ${signed(k.gd15)} golds à 15 min pour l'équipe.`, 'Accélérez : plus vite vous prenez les objectifs, moins l\'adversaire peut revenir.');
    if (S.short.n >= 3 && S.short.wr >= 65) good('Vous gagnez les games rapides', `Victoire dans ${S.short.wr} % des games de moins de ${SHORT / 60} min.`, 'Jouez pour finir tôt : Héraut, tours, puis Baron dès qu\'il apparaît.');
    if (S.long.n >= 3 && S.long.wr >= 60) good('Vous êtes forts en fin de game', `Victoire dans ${S.long.wr} % des games de plus de ${LONG / 60} min.`, 'Pas besoin de forcer tôt : farmez, gardez la vision, et attendez vos power spikes.');
    if (n >= MIN_N && L.length >= 2 && W.length >= 2 && k.deathsW <= 15) good('Peu de morts quand vous gagnez', `${Math.round(k.deathsW)} morts en moyenne dans vos victoires.`, 'C\'est la clé : quand personne ne meurt pour rien, vous gagnez.');
    // Ce qui décide vos games : on compare le winrate selon qui prend l'objectif.
    if (S.moreDrag.n >= 3 && S.lessDrag.n >= 3 && S.moreDrag.wr - S.lessDrag.wr >= 30) {
      const t = `Victoire dans ${S.moreDrag.wr} % des games où vous avez plus de dragons, ${S.lessDrag.wr} % quand ils en ont plus (${S.lessDrag.n} games).`;
      if (k.dragThem >= k.dragUs) bad('Les dragons décident vos games, et ils en prennent plus', t,
        ['1 minute avant chaque dragon : bot et mid poussent, wards et pink autour de la fosse.',
          'Tout le monde arrive ensemble ; le jungler garde son Smite pour la fin.',
          'Dragon impossible ? Prenez larves, Héraut ou une tour en haut, mais annoncez-le avant.'], 2.8);
      else good('Les dragons font gagner vos games', t, 'Gardez le même rituel avant chaque dragon : waves poussées, vision, Smite.');
    }
    if (S.baron.n >= 3 && S.theirBaron.n >= 3 && S.baron.wr - S.theirBaron.wr >= 30) {
      bad('Le Baron décide la game',
        `Victoire dans ${S.baron.wr} % des games où vous prenez le Baron, ${S.theirBaron.wr} % quand ils le prennent (${S.theirBaron.n} games).`,
        ['À partir de 20 min : wards et pinks autour du Baron avant chaque back.',
          'Personne ne part seul en side lane quand le Baron est en vie et l\'adversaire est groupé.',
          'S\'ils commencent le Baron : on y va tous ensemble, ou on prend deux tours de l\'autre côté.'], 2.6);
    }
    if (S.behind.n >= 4 && S.behind.wr <= 20) {
      bad('Derrière à 15 min, vous ne revenez pas',
        `Seulement ${S.behind.w} victoire${S.behind.w > 1 ? 's' : ''} sur ${S.behind.n} games où vous étiez derrière de plus de ${LEAD.toLocaleString('fr-FR')} golds à 15 min.`,
        ['En retard : on ne cherche plus le fight, on farm et on garde la vision chez soi.',
          'On lâche le dragon s\'il est perdu d\'avance, et on prend quelque chose de l\'autre côté.',
          'On attend l\'erreur adverse : un adversaire seul en side, un Baron mal préparé.'], 2.3);
    }
    if (n >= MIN_N && k.fb >= 50 && S.fb.wr < all.wr) {
      bad('Le premier sang ne vous rapporte rien',
        `Vous prenez le premier sang dans ${k.fb} % des games, mais vous ne gagnez que ${S.fb.wr} % de ces games.`,
        ['Après un kill tôt : on prend tout de suite quelque chose (plates, dragon, larves), pas un 2e kill.',
          'Le joueur qui a le kill ne reste pas sur la carte avec ses golds : il back et achète.'], 1.6);
    }
    if (S.recent.n >= 6 && S.recent.wr <= 30) {
      bad('Mauvaise série en ce moment',
        `${S.recent.w} victoire${S.recent.w > 1 ? 's' : ''} sur vos ${S.recent.n} dernières flex ensemble.`,
        ['Pause de 10 minutes après 2 défaites de suite, et on relance à tête reposée.',
          'Revoir ensemble 2 minutes de replay sur un moment clé de la dernière défaite.',
          'Une seule consigne d\'équipe pour la prochaine session (par exemple : jouer chaque dragon).'], 2.0);
    }
    res.bad.sort((a, b) => b.poids - a.poids);

    // ---- points forts : duos, champions, joueurs ----
    const bestPair = res.pairs.filter((x) => x.n >= 3).sort((a, b) => b.wr - a.wr || b.n - a.n)[0];
    if (bestPair && bestPair.wr >= 55) res.forts.push({ ico: '🤝', titre: `Meilleur duo : ${bestPair.label}`, detail: `${bestPair.wr} % de victoires ensemble (${bestPair.w} sur ${bestPair.n}).` });
    const bestSize = res.bySize.filter((x) => x.n >= 3).sort((a, b) => b.wr - a.wr)[0];
    if (bestSize && bestSize.wr >= 50) res.forts.push({ ico: '👥', titre: `Le mieux : jouer à ${bestSize.size}`, detail: `${bestSize.wr} % de victoires à ${bestSize.size} joueurs de FIRE (${bestSize.n} games).` });
    const worstSize = res.bySize.filter((x) => x.n >= 4).sort((a, b) => a.wr - b.wr)[0];
    res.worstSize = worstSize && worstSize.wr <= 35 ? worstSize : null;
    const bestChamp = res.champs.filter((x) => x.n >= 3 && x.wr >= 60)[0] || res.champs.filter((x) => x.n >= 2 && x.wr >= 60)[0];
    if (bestChamp) res.forts.push({ ico: '⭐', titre: `${bestChamp.who} sur ${bestChamp.c}`, detail: `${bestChamp.wr} % de victoires en flex (${bestChamp.w} sur ${bestChamp.n}).` });
    const kpTop = res.byMember.filter((x) => x.n >= 3).sort((a, b) => b.kp - a.kp)[0];
    if (kpTop && kpTop.kp >= 55) res.forts.push({ ico: '⚔️', titre: `${kpTop.pseudo.split('#')[0]} est dans tous les fights`, detail: `${Math.round(kpTop.kp)} % de participation aux kills en flex.` });
    const safe = res.byMember.filter((x) => x.n >= 3).sort((a, b) => a.deaths - b.deaths)[0];
    if (safe) res.forts.push({ ico: '🛡️', titre: `${safe.pseudo.split('#')[0]} meurt le moins`, detail: `${fr1(safe.deaths)} morts par game en flex.` });
    if (k.dragUs > k.dragThem + 0.3) res.forts.push({ ico: '🐉', titre: 'Les dragons', detail: `${fr1(k.dragUs)} par game contre ${fr1(k.dragThem)}.` });
    if (k.towersUs > k.towersThem + 1) res.forts.push({ ico: '🏰', titre: 'La pression sur les tours', detail: `${fr1(k.towersUs)} tours prises par game contre ${fr1(k.towersThem)}.` });

    // ---- plan de jeu conseillé ----
    const early = (S.short.n >= 2 && S.short.wr >= 60) || k.gd15 >= 300;
    const late = (S.long.n >= 2 && S.long.wr >= 60) || (k.gd15 < 0 && S.long.wr >= 50);
    if (early && !late) res.plan.push('Vous êtes une équipe de début de partie : jouez les larves, le Héraut et les premiers dragons, et cherchez à finir avant 30 min.');
    else if (late && !early) res.plan.push('Vous êtes une équipe de fin de partie : pas de fight forcé avant vos objets, gardez la vision, et jouez les objectifs à partir de 20 min.');
    else res.plan.push('Pas de profil clair début ou fin de partie : jouez autour du prochain objectif, chaque fois avec waves poussées et vision.');
    if (res.bad[0]) res.plan.push(`Priorité de la semaine : ${res.bad[0].titre.toLowerCase()}. ${res.bad[0].strat[0]}`);
    if (res.worstSize && bestSize && bestSize.size !== res.worstSize.size) res.plan.push(`À ${res.worstSize.size} joueurs de FIRE vous gagnez peu (${res.worstSize.wr} %) : visez plutôt des flex à ${bestSize.size}.`);
    if (bestPair && bestPair.wr >= 55) res.plan.push(`Faites des flex avec ${bestPair.label} le plus souvent possible.`);
    return res;
  }

  const api = { FLEX, LEAD, candidates, analyze, view };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FT = api;
})(typeof window !== 'undefined' ? window : globalThis);
