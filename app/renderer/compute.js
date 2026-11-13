// FIRE LoL - calculs des stats à partir des games lues sur dpm.lol.
(function (root) {
  const NAMES = {
    MonkeyKing: 'Wukong', JarvanIV: 'Jarvan IV', LeeSin: 'Lee Sin', MasterYi: 'Master Yi', MissFortune: 'Miss Fortune',
    TwistedFate: 'Twisted Fate', XinZhao: 'Xin Zhao', DrMundo: 'Dr. Mundo', Kaisa: "Kai'Sa", Velkoz: "Vel'Koz",
    Belveth: "Bel'Veth", FiddleSticks: 'Fiddlesticks', Khazix: "Kha'Zix", Chogath: "Cho'Gath", KogMaw: "Kog'Maw",
    RekSai: "Rek'Sai", KSante: "K'Sante", AurelionSol: 'Aurelion Sol', TahmKench: 'Tahm Kench', Nunu: 'Nunu & Willump',
    Renata: 'Renata Glasc', Leblanc: 'LeBlanc'
  };
  const champName = (id) => NAMES[id] || String(id || '').replace(/([a-z])([A-Z])/g, '$1 $2');

  const LANE = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Support' };

  const ROLES = {
    top: { label: 'Top', ico: '🛡️', lane: 'Top', face: 'face à son adversaire de lane', sur: 'sur son adversaire de lane', cs: 7 },
    jungle: { label: 'Jungle', ico: '🌲', lane: 'Jungle', face: 'face au jungler adverse', sur: 'sur le jungler adverse', cs: 6 },
    mid: { label: 'Mid', ico: '✨', lane: 'Mid', face: 'face à son adversaire de lane', sur: 'sur son adversaire de lane', cs: 7 },
    adc: { label: 'ADC', ico: '🏹', lane: 'ADC', face: "face à l'ADC adverse", sur: "sur l'ADC adverse", cs: 7 },
    support: { label: 'Support', ico: '💞', lane: 'Support', face: 'face au support adverse', sur: 'sur le support adverse', cs: null }
  };

  // Repères indicatifs (choisis pour FIRE LoL, pas des règles officielles).
  function reperes(role) {
    return {
      wr: { v: 50, dir: 'up', min: 0, max: 100, d: 0, u: ' %' },
      kda: { v: 2.5, dir: 'up', min: 0, max: 5, d: 1, u: '' },
      morts_moy: { v: 6, dir: 'down', min: 0, max: 12, d: 0, u: '' },
      cs_min: ROLES[role].cs ? { v: ROLES[role].cs, dir: 'up', min: 0, max: 10, d: 0, u: '' } : null,
      gold15: { v: 0, dir: 'up', min: -1500, max: 1500, d: 0, u: '', signed: true },
      pinks_moy: role === 'support' ? { v: 3, dir: 'up', min: 0, max: 8, d: 0, u: '' } : { v: 1, dir: 'up', min: 0, max: 3, d: 0, u: '' },
      vision: role === 'support' ? { v: 50, dir: 'up', min: 0, max: 120, d: 0, u: '' } : null
    };
  }

  const r1 = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const dayLabel = (dt) => `${JOURS[dt.getDay()]} ${dt.getDate() === 1 ? '1er' : dt.getDate()} ${MOIS[dt.getMonth()]}`;
  const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const dayShort = (dt) => `${JOURS[dt.getDay()].slice(0, 3)}. ${dt.getDate() === 1 ? '1er' : dt.getDate()} ${MOIS_C[dt.getMonth()]}`;
  const num = (x) => (x == null || x === '' || isNaN(Number(x)) ? null : Number(x));

  function toRows(player, matches, start, end) {
    const pool = new Set(player.pool_ids || []);
    const maitrise = new Set(player.maitrise_ids || []);
    const travail = new Set(player.travail_ids || []);
    return (matches || [])
      .filter((m) => m.q === 420 && m.t >= start && (!end || m.t < end))
      .sort((a, b) => a.t - b.t)
      .map((m) => {
        const min = Math.max(1, m.d / 60);
        const cs = (num(m.totalMinionsKilled) || 0) + (num(m.neutralMinionsKilled) || 0);
        const dt = new Date(m.t);
        const lane = LANE[m.lane] || '';
        return {
          id: 'EUW1_' + m.id, t: m.t, jour: ymd(dt), jour_label: dayLabel(dt), jour_court: dayShort(dt),
          heure: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
          champion: champName(m.championName), champ_id: m.championName, pool: pool.has(m.championName), lane,
          maitrise: maitrise.has(m.championName), travail: travail.has(m.championName),
          cat: pool.has(m.championName) ? 'oblig' : maitrise.has(m.championName) ? 'maitrise' : travail.has(m.championName) ? 'travail' : 'autre',
          adversaire: m.opponentChampionName ? champName(m.opponentChampionName) : '—', adv_id: m.opponentChampionName || null,
          win: !!m.win, duree: `${Math.floor(m.d / 60)}:${pad(m.d % 60)}`,
          kills: num(m.kills) || 0, morts: num(m.deaths) || 0, assists: num(m.assists) || 0,
          kda: r1(((num(m.kills) || 0) + (num(m.assists) || 0)) / Math.max(1, num(m.deaths) || 0), 2),
          kp: num(m.killParticipation) == null ? null : r1(m.killParticipation),
          cs, cs_min: r1(cs / min),
          cs10: lane === 'Jungle' ? num(m.jungleCsBefore10Minutes) : num(m.laneMinionsFirst10Minutes),
          gold_min: num(m.goldPerMinute) == null ? null : Math.round(m.goldPerMinute),
          degats_min: num(m.damagePerMinute) == null ? null : Math.round(m.damagePerMinute),
          part_degats: num(m.teamDamagePercentage) == null ? null : r1(m.teamDamagePercentage),
          vision: r1((num(m.visionScorePerMinute) || 0) * min),
          pinks: num(m.controlWardsPlaced) || 0, wards: num(m.stealthWardsPlaced) || 0, wards_detruites: num(m.wardTakedowns) || 0,
          cs15: num(m.csDiffAt15), gold15: num(m.goldDiffAt15), xp15: num(m.xpDiffAt15),
          crabes: num(m.scuttleCrabKills), drakes: num(m.dragon), larves: num(m.horde),
          solo_kills: num(m.soloKills), plates: num(m.turretPlatesTaken),
          score: num(m.dpmScore) == null ? null : r1(m.dpmScore)
        };
      });
  }

  function stats(rows) {
    const n = rows.length;
    const wins = rows.filter((r) => r.win).length;
    const sum = (k) => rows.reduce((s, r) => s + (num(r[k]) || 0), 0);
    const avg = (k, d = 1) => {
      const xs = rows.map((r) => num(r[k])).filter((x) => x != null);
      return xs.length ? r1(xs.reduce((a, b) => a + b, 0) / xs.length, d) : null;
    };
    const K = sum('kills'), D = sum('morts'), A = sum('assists');
    return {
      games: n, wins, losses: n - wins, wr: n ? r1((wins / n) * 100) : null,
      kills: K, morts: D, assists: A, kda: n ? r1((K + A) / Math.max(1, D), 2) : null,
      morts_moy: avg('morts'), cs_min: avg('cs_min'), cs10: avg('cs10'),
      gold15: avg('gold15', 0), cs15: avg('cs15'), xp15: avg('xp15', 0),
      gold15_neg: rows.filter((r) => r.gold15 != null && r.gold15 < 0).length,
      degats_min: avg('degats_min', 0), kp: avg('kp'), vision: avg('vision'),
      pinks: sum('pinks'), pinks_moy: avg('pinks'),
      hors_pool: rows.filter((r) => !r.pool).length,
      oblig: rows.filter((r) => r.cat === 'oblig').length,
      maitrise_g: rows.filter((r) => r.cat === 'maitrise').length,
      travail_g: rows.filter((r) => r.cat === 'travail').length,
      autres: rows.filter((r) => r.cat === 'autre').length
    };
  }

  function group(rows, key) {
    const m = new Map();
    rows.forEach((r) => { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); });
    return m;
  }

  function byDay(rows) {
    return [...group(rows, 'jour').entries()].map(([jour, rs]) => ({
      jour, label: rs[0].jour_label, court: rs[0].jour_court, rows: rs, ...stats(rs)
    }));
  }

  function byChamp(rows) {
    return [...group(rows, 'champ_id').entries()]
      .map(([id, rs]) => ({ id, champion: rs[0].champion, pool: rs[0].pool, maitrise: rs[0].maitrise, cat: rs[0].cat, rows: rs, ...stats(rs) }))
      .sort((a, b) => b.games - a.games || b.wins - a.wins);
  }

  function poolSplit(player, champs) {
    return (player.pool_ids || []).map((id) => {
      const c = (champs || []).find((x) => x.id === id);
      if (!c || !c.games) return { id, champion: champName(id), games: 0, wins: 0, losses: 0, wr: null, kda: null, morts: null, cs_min: null, kp: null, goldDiff: null, recent: [] };
      return {
        id, champion: champName(id), games: c.games, wins: c.wins, losses: c.games - c.wins,
        wr: r1((c.wins / c.games) * 100), kda: c.kda == null ? null : r1(c.kda, 2), morts: c.deaths == null ? null : r1(c.deaths),
        cs_min: c.csm == null ? null : r1(c.csm), kp: c.kp == null ? null : r1(c.kp),
        goldDiff: c.goldDiff == null ? null : Math.round(c.goldDiff), recent: c.recent || []
      };
    });
  }

  function splitTotals(champs) {
    const games = (champs || []).reduce((s, c) => s + (c.games || 0), 0);
    const top = (champs || []).slice().sort((a, b) => (b.games || 0) - (a.games || 0))[0];
    return { games, top: top ? { champion: champName(top.id), games: top.games, wr: top.games ? r1((top.wins / top.games) * 100) : null } : null };
  }

  // Objectif du coach : N games sur le pool imposé, en Solo/Duo, depuis une date donnée.
  function objectif(player, matches, obj) {
    if (!obj || !obj.debut) return null;
    const start = new Date(obj.debut + 'T00:00:00').getTime();
    const end = obj.fin ? new Date(obj.fin + 'T00:00:00').getTime() + 86400000 : null;
    const rows = toRows(player, matches, start, end);
    const poolRows = rows.filter((r) => r.pool);
    const per = (player.pool_ids || []).map((id) => {
      const rs = poolRows.filter((r) => r.champ_id === id);
      return { id, champion: champName(id), ...stats(rs) };
    });
    const target = Number(obj.games) || 0;
    const done = poolRows.length;
    return { start, debut: obj.debut, target, done, reste: Math.max(0, target - done), pct: target ? Math.min(100, Math.round((done / target) * 100)) : null,
      hors_pool: rows.length - done, total: rows.length, per, ...(() => { const st = stats(poolRows); return { wins: st.wins, losses: st.losses, wr: st.wr }; })() };
  }

  // ---------- Tierlists des pools (rubrique POOL) ----------
  // Ligne 1 : OBLIGATOIRE (comptée pour l'objectif de la semaine). Ligne 2 : MAÎTRISÉS. Un champion peut être dans les deux.
  const TIERS = ['O', 'M', 'T'];
  const TIER_INFO = { O: { label: 'OBLIGATOIRE', ico: '🎯', court: 'Obligatoire' }, M: { label: 'MAÎTRISÉS', ico: '⭐', court: 'Maîtrisé' }, T: { label: 'À TRAVAILLER', ico: '🛠️', court: 'À travailler' } };
  const normTiers = (t) => {
    if (!t) return null;
    if (Array.isArray(t.O) || Array.isArray(t.M) || Array.isArray(t.T)) return { O: [...(t.O || [])], M: [...(t.M || [])], T: [...(t.T || [])], par: t.par, maj: t.maj };
    return { O: ['S', 'A', 'B', 'C'].flatMap((k) => t[k] || []), M: [], T: [] }; // ancien format S/A/B/C
  };
  const poolIds = (t) => { const n = normTiers(t); return n ? n.O : []; };
  const maitriseIds = (t) => { const n = normTiers(t); return n ? n.M : []; };

  function verdict(st) {
    if (!st.games) return { kind: 'neutre', txt: 'Pas encore joué', ico: '💤' };
    if (st.games < 3) return { kind: 'neutre', txt: 'Peu de games', ico: '🔎' };
    if (st.wr >= 55) return { kind: 'good', txt: 'Solide', ico: '💪' };
    if (st.wr < 45) return { kind: 'bad', txt: 'À travailler', ico: '⚠️' };
    return { kind: 'neutre', txt: 'Correct', ico: '👌' };
  }

  // Analyse d'un pool sur une période : obligatoires, maîtrisés et autres champions joués, avec des remarques (toujours vraies).
  function poolAnalysis(player, matches, champs, tiers, start, end) {
    const t = normTiers(tiers) || { O: player.pool_ids || [], M: player.maitrise_ids || [], T: player.travail_ids || [] };
    t.T = t.T || [];
    const rows = toRows({ ...player, pool_ids: t.O, maitrise_ids: t.M, travail_ids: t.T }, matches, start, end);
    const card = (id) => {
      const st = stats(rows.filter((r) => r.champ_id === id));
      const sp = (champs || []).find((c) => c.id === id);
      return { id, champion: champName(id), oblig: t.O.includes(id), maitrise: t.M.includes(id), travail: t.T.includes(id), ...st, verdict: verdict(st),
        split: sp && sp.games ? { games: sp.games, wins: sp.wins, wr: r1((sp.wins / sp.games) * 100), kda: sp.kda == null ? null : r1(sp.kda, 2) } : null };
    };
    const oblig = t.O.map(card);
    const maitrise = t.M.map(card);
    // À travailler : champions en apprentissage (hors obligatoires et maîtrisés), suivis à part, sans compter pour l'objectif.
    const travail = t.T.filter((id) => !t.O.includes(id) && !t.M.includes(id)).map(card);
    const autres = byChamp(rows.filter((r) => r.cat === 'autre')).map((c) => ({ id: c.id, champion: c.champion, ...stats(c.rows), verdict: verdict(stats(c.rows)) }));
    const tot = { oblig: stats(rows.filter((r) => r.cat === 'oblig')), maitrise: stats(rows.filter((r) => r.cat === 'maitrise')), travail: stats(rows.filter((r) => r.cat === 'travail')), autres: stats(rows.filter((r) => r.cat === 'autre')), all: stats(rows) };
    const notes = [];
    const pctW = (x) => `${fr(x.wr)} %`;
    for (const c of oblig) {
      if (c.games >= 4 && c.wr < 40) notes.push({ kind: 'bad', ico: '⚠️', text: `${c.champion} (obligatoire) : ${c.wins} V – ${c.losses} D. À travailler en priorité.` });
      if (c.games >= 3 && c.wr >= 60) notes.push({ kind: 'good', ico: '🔥', text: `${c.champion} (obligatoire) marche très bien : ${pctW(c)} sur ${c.games} games.` });
    }
    for (const c of maitrise) {
      if (!c.oblig && c.games >= 3 && c.wr < 40) notes.push({ kind: 'bad', ico: '⚠️', text: `${c.champion} est noté maîtrisé mais gagne ${pctW(c)} de ses ${c.games} games.` });
      if (!c.oblig && c.games >= 3 && c.wr >= 60) notes.push({ kind: 'good', ico: '⭐', text: `${c.champion} confirme sa maîtrise : ${pctW(c)} sur ${c.games} games.` });
    }
    for (const c of travail) {
      if (c.games >= 3 && c.wr >= 55) notes.push({ kind: 'good', ico: '🛠️', text: `${c.champion} (à travailler) progresse : ${pctW(c)} sur ${c.games} games.` });
      else if (c.games >= 3) notes.push({ kind: 'warn', ico: '🛠️', text: `${c.champion} (à travailler) : ${c.wins} V – ${c.losses} D sur ${c.games} games, on continue.` });
    }
    const jamais = oblig.filter((c) => !c.games).map((c) => c.champion);
    if (jamais.length && rows.length) notes.push({ kind: 'warn', ico: '💤', text: `Obligatoire${jamais.length > 1 ? 's' : ''} pas encore joué${jamais.length > 1 ? 's' : ''} : ${jamais.join(', ')}.` });
    if (tot.autres.games) {
      const part = Math.round((tot.autres.games / Math.max(1, rows.length)) * 100);
      notes.push({ kind: part >= 30 ? 'bad' : 'warn', ico: '❔', text: `${pl(tot.autres.games, 'game', 'games')} sur d'autres champions (${part} %) : ${autres.slice(0, 4).map((c) => `${c.champion} ${c.games}`).join(', ')}.` });
    }
    if (rows.length && !tot.autres.games) notes.push({ kind: 'good', ico: '✅', text: 'Aucune game en dehors de ses champions obligatoires, maîtrisés et à travailler.' });
    const ids = [...t.O, ...t.M, ...t.T];
    const cand = (champs || []).filter((c) => !ids.includes(c.id) && c.games >= 8 && c.wins / c.games >= 0.55).sort((a, b) => b.games - a.games).slice(0, 2);
    cand.forEach((c) => notes.push({ kind: 'good', ico: '💡', text: `Candidat aux maîtrisés : ${champName(c.id)}, ${fr((c.wins / c.games) * 100)} % de victoires sur ${c.games} games ce split.` }));
    return { oblig, maitrise, travail, autres, tot, notes, rows: rows.length };
  }

  // Changements d'une semaine à l'autre, ligne par ligne.
  function poolChanges(prev, cur) {
    const a = normTiers(cur), b = normTiers(prev);
    if (!a || !b) return null;
    const out = [];
    for (const k of TIERS) {
      (a[k] || []).filter((id) => !(b[k] || []).includes(id)).forEach((id) => out.push({ type: 'add', k, id, champion: champName(id) }));
      (b[k] || []).filter((id) => !(a[k] || []).includes(id)).forEach((id) => out.push({ type: 'del', k, id, champion: champName(id) }));
    }
    return out;
  }

  // ---------- Formats ----------
  const fr = (n, d = 0) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const sg = (n, d = 0) => (n == null || isNaN(n) ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + fr(Math.abs(n), d));
  const pl = (n, one, many) => `${fr(n)} ${n > 1 ? many : one}`;

  // ---------- Points à travailler et points forts (calculés, donc toujours vrais) ----------
  function insights(player, rows, s, champs, obj) {
    const role = player.role_id;
    const R = ROLES[role];
    const rep = reperes(role);
    const out = [];
    if (obj && obj.target) {
      const d = new Date(obj.start);
      const depuis = `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`;
      if (obj.done >= obj.target) out.push({ kind: 'plus', ico: '🎯', title: 'Objectif atteint', chip: `${obj.done} / ${obj.target}`, text: `${obj.done} games sur ses champions obligatoires cette semaine, depuis lundi ${depuis} (objectif : ${obj.target}).` });
      else out.push({ kind: obj.done >= obj.target / 2 ? 'info' : 'warn', ico: '🎯', title: 'Objectif de la semaine', chip: `${obj.done} / ${obj.target}`, text: `${obj.done} ${obj.done > 1 ? 'games' : 'game'} sur ses champions obligatoires cette semaine (depuis le ${depuis}) : il en reste ${obj.reste} à jouer d'ici dimanche.` });
    }
    if (!s.games) return out.concat([{ kind: 'info', ico: '😴', title: 'Pas de game', text: 'Aucune game classée Solo/Duo sur cette période.' }]);

    if (s.morts_moy > rep.morts_moy.v) out.push({ kind: 'warn', ico: '💀', title: 'Moins mourir', chip: `${fr(s.morts_moy, 1)} morts/game`, text: `${fr(s.morts_moy, 1)} morts par game en moyenne, pour un KDA de ${fr(s.kda, 2)}.` });
    else out.push({ kind: 'plus', ico: '🛡️', title: 'Il meurt peu', chip: `${fr(s.morts_moy, 1)} morts/game`, text: `${fr(s.morts_moy, 1)} morts par game en moyenne, pour un KDA de ${fr(s.kda, 2)}.` });

    if (s.gold15 != null) {
      if (s.gold15 < 0) {
        let t = `En retard de golds à 15 min dans ${s.gold15_neg} ${s.gold15_neg > 1 ? 'games' : 'game'} sur ${s.games} (${sg(s.gold15)} en moyenne ${R.face}).`;
        if (role !== 'support' && s.cs15 != null) t += s.cs15 >= 0 ? ` Il a pourtant ${sg(s.cs15, 1)} CS d'écart à 15 min : le retard vient des fights et des morts, pas du farm.` : ` Il perd aussi au farm (${sg(s.cs15, 1)} CS à 15 min).`;
        out.push({ kind: 'warn', ico: '⏱️', title: 'Début de partie', chip: `${sg(s.gold15)} golds @15`, text: t });
      } else {
        out.push({ kind: 'plus', ico: '✅', title: role === 'jungle' ? 'Son début de partie' : 'Sa lane', chip: `${sg(s.gold15)} golds @15`, text: `En moyenne ${sg(s.gold15)} golds${role !== 'support' && s.cs15 != null ? ` et ${sg(s.cs15, 1)} CS` : ''} d'écart ${R.sur} à 15 min.` });
      }
    }

    if (role === 'support') {
      if (s.pinks_moy < rep.pinks_moy.v || s.vision < rep.vision.v) out.push({ kind: 'warn', ico: '👁️', title: 'Vision', chip: `${fr(s.vision, 1)} vision/game`, text: `${pl(s.pinks, 'pink posée', 'pinks posées')} en ${s.games} games (${fr(s.pinks_moy, 1)} par game) et ${fr(s.vision, 1)} de score de vision par game.` });
      else out.push({ kind: 'plus', ico: '✅', title: 'La vision', chip: `${fr(s.vision, 1)} vision/game`, text: `${pl(s.pinks, 'pink posée', 'pinks posées')} en ${s.games} games (${fr(s.pinks_moy, 1)} par game) et ${fr(s.vision, 1)} de score de vision par game.` });
    } else {
      if (s.pinks_moy < rep.pinks_moy.v) out.push({ kind: 'warn', ico: '👁️', title: 'Vision', chip: `${fr(s.pinks_moy, 1)} pink/game`, text: `${pl(s.pinks, 'pink posée', 'pinks posées')} en ${s.games} games.` });
      if (R.cs && s.cs_min != null && s.cs_min < R.cs) out.push({ kind: 'warn', ico: '🌾', title: 'Farm', chip: `${fr(s.cs_min, 1)} CS/min`, text: `${fr(s.cs_min, 1)} CS par minute en moyenne (repère ≥ ${R.cs}).` });
    }

    const pc = byChamp(rows);
    const missing = (player.pool_ids || []).filter((id) => !rows.some((r) => r.champ_id === id)).map(champName);
    const split = `🎯 ${s.oblig} obligatoire${s.oblig > 1 ? 's' : ''} · ⭐ ${s.maitrise_g} maîtrisé${s.maitrise_g > 1 ? 's' : ''} · ❔ ${s.autres} autre${s.autres > 1 ? 's' : ''}`;
    if (s.autres > 0) {
      const off = pc.filter((c) => c.cat === 'autre').map((c) => `${c.champion} ${c.games}`).join(', ');
      out.push({ kind: 'warn', ico: '🧙', title: 'Champions hors pool', chip: split, text: `${s.autres} ${s.autres > 1 ? 'games' : 'game'} sur des champions ni obligatoires ni maîtrisés (${off}).${missing.length ? ` Obligatoires pas joués : ${missing.join(', ')}.` : ''}` });
    } else {
      out.push({ kind: 'plus', ico: '✅', title: 'Il joue son pool', chip: split, text: `Toutes ses games sont sur ses champions obligatoires ou maîtrisés.${missing.length ? ` Obligatoires pas joués : ${missing.join(', ')}.` : ''}` });
    }
    pc.filter((c) => c.pool && c.games >= 3 && c.wr < 35).forEach((c) => out.push({ kind: 'warn', ico: '⚠️', title: c.champion, text: `${c.wins} V – ${c.losses} D sur la période avec ce champion obligatoire.` }));

    const off = rows.filter((r) => r.lane && r.lane !== R.lane);
    if (off.length) {
      const lanes = [...group(off, 'lane').entries()].map(([l, rs]) => `${rs.length} en ${l}`).join(', ');
      out.push({ kind: 'warn', ico: '🔁', title: 'Rôle', text: `${off.length} ${off.length > 1 ? 'games jouées' : 'game jouée'} hors de son rôle (${lanes}).` });
    }
    if (s.games < 5) out.push({ kind: 'info', ico: '📉', title: 'Peu de games', text: `Seulement ${pl(s.games, 'game', 'games')} sur la période : les moyennes sont à prendre avec prudence.` });
    positives(out, player, rows, s, pc, R, rep);
    return out;
  }

  // Toujours des points forts (vrais, tirés des chiffres) : au moins 3, et au moins autant que de points à travailler.
  function positives(out, player, rows, s, pc, R, rep) {
    const want = Math.min(5, Math.max(3, out.filter((x) => x.kind === 'warn').length));
    const has = () => out.filter((x) => x.kind === 'plus').length;
    const add = (x) => { if (has() < want) out.push({ kind: 'plus', ...x }); };
    const cands = [];
    if (s.wr != null && s.wr >= 50) cands.push({ ico: '🏆', title: 'Il gagne plus qu\'il ne perd', chip: `${fr(s.wr, 1)} %`, text: `${pl(s.wins, 'victoire', 'victoires')} pour ${pl(s.losses, 'défaite', 'défaites')} sur la période.` });
    if (s.kda != null && s.kda >= rep.kda.v) cands.push({ ico: '⚔️', title: 'Bon KDA', chip: `KDA ${fr(s.kda, 2)}`, text: `${s.kills} / ${s.morts} / ${s.assists} au total : il participe beaucoup plus qu'il ne meurt.` });
    if (s.kp != null && s.kp >= 50) cands.push({ ico: '🤝', title: 'Présent pour l\'équipe', chip: `${fr(s.kp)} % KP`, text: `Il participe à ${fr(s.kp)} % des kills de son équipe en moyenne.` });
    if (R.cs && s.cs_min != null && s.cs_min >= R.cs) cands.push({ ico: '🌾', title: 'Bon farm', chip: `${fr(s.cs_min, 1)} CS/min`, text: `${fr(s.cs_min, 1)} CS par minute en moyenne (repère ≥ ${R.cs}).` });
    if (player.role_id !== 'support' && s.pinks_moy != null && s.pinks_moy >= rep.pinks_moy.v) cands.push({ ico: '👁️', title: 'Il pose ses pinks', chip: `${fr(s.pinks_moy, 1)} pink/game`, text: `${pl(s.pinks, 'pink posée', 'pinks posées')} en ${s.games} games.` });
    const best = pc.filter((c) => c.wins > 0).sort((a, b) => b.wins - a.wins || b.wr - a.wr || b.kda - a.kda)[0];
    if (best) cands.push({ ico: '⭐', title: `Son point d'appui : ${best.champion}`, chip: `${best.wins} V – ${best.losses} D`, text: `Son champion qui lui rapporte le plus de victoires sur la période (KDA ${fr(best.kda, 2)}).` });
    if (rows.length >= 4) {
      const h = Math.floor(rows.length / 2), a = stats(rows.slice(0, h)), b = stats(rows.slice(h));
      if (b.morts_moy != null && a.morts_moy != null && b.morts_moy < a.morts_moy - 0.4) cands.push({ ico: '📈', title: 'En progrès', chip: `${fr(a.morts_moy, 1)} → ${fr(b.morts_moy, 1)} morts`, text: `Il meurt moins sur ses dernières games que sur les premières de la période.` });
      else if (b.kda != null && a.kda != null && b.kda > a.kda + 0.3) cands.push({ ico: '📈', title: 'En progrès', chip: `KDA ${fr(a.kda, 2)} → ${fr(b.kda, 2)}`, text: `Son KDA monte sur ses dernières games.` });
      else if (b.wr != null && a.wr != null && b.wr > a.wr) cands.push({ ico: '📈', title: 'En progrès', chip: `${fr(a.wr)} % → ${fr(b.wr)} %`, text: `Il gagne plus sur ses dernières games que sur les premières de la période.` });
    }
    const top = rows.filter((r) => r.win).sort((x, y) => y.kda - x.kda)[0];
    if (top) cands.push({ ico: '🔥', title: 'Sa meilleure game', chip: `${top.kills} / ${top.morts} / ${top.assists}`, text: `${top.champion}, ${top.jour_label.toLowerCase()}, victoire en ${top.duree} : la preuve de ce qu'il sait faire.` });
    cands.push({ ico: '💪', title: 'Il ne lâche rien', chip: pl(s.games, 'game', 'games'), text: `${pl(s.games, 'game classée jouée', 'games classées jouées')} sur la période : chaque game est une occasion de progresser.` });
    const seen = new Set(out.filter((x) => x.kind === 'plus').map((x) => x.title));
    cands.forEach((c) => { if (!seen.has(c.title)) add(c); });
  }

  function lead(player, s) {
    if (!s.games) return 'Aucune game classée Solo/Duo sur cette période.';
    const parts = [`${pl(s.wins, 'victoire', 'victoires')}, ${pl(s.losses, 'défaite', 'défaites')} (${fr(s.wr, 1)} %), KDA ${fr(s.kda, 2)}.`];
    const R = ROLES[player.role_id];
    if (s.gold15 != null) parts.push(s.gold15 < 0 ? `En moyenne ${sg(s.gold15)} golds à 15 min ${R.face}.` : `En moyenne ${sg(s.gold15)} golds d'avance à 15 min ${R.sur}.`);
    if (s.autres) parts.push(`${s.autres} ${s.autres > 1 ? 'games' : 'game'} hors de ses champions obligatoires et maîtrisés.`);
    return parts.join(' ');
  }

  function badges(player, g) {
    const role = player.role_id;
    const R = ROLES[role];
    const b = [];
    if (g.kills >= 10) b.push('🔥 Gros carry');
    if (g.morts <= 3) b.push('🛡️ Presque intouchable');
    if (g.morts >= 10) b.push('💀 Beaucoup de morts');
    if (g.gold15 != null && g.gold15 >= 500) b.push('⏱️ Gros early');
    if (g.gold15 != null && g.gold15 <= -1000) b.push('🐢 Early difficile');
    if (R.cs && g.cs_min >= R.cs) b.push('🌾 Bon farm');
    if (role === 'support') { if (g.vision >= 80) b.push('🔦 Grosse vision'); if (g.pinks >= 5) b.push('👁️ Contrôle de la carte'); }
    else if (g.pinks >= 1) b.push('👁️ Pink posée');
    if (g.assists >= 15) b.push('🤝 Roi des assists');
    if (g.solo_kills >= 3) b.push('⚔️ Roi du solo kill');
    if (g.plates >= 3) b.push('🏰 Plates arrachées');
    if (role === 'jungle' && g.drakes >= 3) b.push('🐉 Chasseur de drakes');
    if (g.lane && g.lane !== R.lane) b.push(`🔁 Joué en ${g.lane}`);
    return b;
  }

  const api = { TIERS, TIER_INFO, normTiers, poolIds, maitriseIds, poolAnalysis, poolChanges, verdict, NAMES, champName, ROLES, LANE, reperes, toRows, stats, byDay, byChamp, poolSplit, splitTotals, objectif, insights, lead, badges, fr, sg, pl, ymd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FC = api;
})(typeof window !== 'undefined' ? window : globalThis);
