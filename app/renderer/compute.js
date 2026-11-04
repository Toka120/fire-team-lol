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
          adversaire: m.opponentChampionName ? champName(m.opponentChampionName) : '—',
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
      hors_pool: rows.filter((r) => !r.pool).length
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
      .map(([id, rs]) => ({ id, champion: rs[0].champion, pool: rs[0].pool, rows: rs, ...stats(rs) }))
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
  const TIERS = ['S', 'A', 'B', 'C'];
  const poolIds = (tiers) => TIERS.flatMap((t) => (tiers && tiers[t]) || []);

  function verdict(st) {
    if (!st.games) return { kind: 'neutre', txt: 'Pas encore joué' };
    if (st.games < 3) return { kind: 'neutre', txt: 'Peu de games' };
    if (st.wr >= 55) return { kind: 'good', txt: 'Solide' };
    if (st.wr < 45) return { kind: 'bad', txt: 'À travailler' };
    return { kind: 'neutre', txt: 'Correct' };
  }

  // Analyse d'un pool sur une période : stats par champion, champions hors pool, remarques (toujours vraies).
  function poolAnalysis(player, matches, champs, tiers, start, end) {
    const ids = tiers ? poolIds(tiers) : (player.pool_ids || []);
    const tierOf = (id) => (tiers ? TIERS.find((t) => (tiers[t] || []).includes(id)) || null : null);
    const rows = toRows({ ...player, pool_ids: ids }, matches, start, end);
    const per = ids.map((id) => {
      const st = stats(rows.filter((r) => r.champ_id === id));
      const sp = (champs || []).find((c) => c.id === id);
      return { id, champion: champName(id), tier: tierOf(id), ...st, verdict: verdict(st),
        split: sp && sp.games ? { games: sp.games, wins: sp.wins, wr: r1((sp.wins / sp.games) * 100), kda: sp.kda == null ? null : r1(sp.kda, 2) } : null };
    });
    const poolRows = rows.filter((r) => r.pool);
    const hors = byChamp(rows.filter((r) => !r.pool)).map((c) => ({ id: c.id, champion: c.champion, games: c.games, wins: c.wins, wr: c.wr }));
    const total = stats(poolRows);
    const notes = [];
    const pctW = (x) => `${fr(x.wr)} %`;
    for (const c of per) {
      if (c.tier === 'S' && c.games >= 4 && c.wr < 45) notes.push({ kind: 'bad', text: `${c.champion} est classé S mais gagne ${pctW(c)} de ses ${c.games} games : à revoir avec le coach.` });
      if ((c.tier === 'B' || c.tier === 'C') && c.games >= 4 && c.wr >= 60) notes.push({ kind: 'good', text: `${c.champion} (tier ${c.tier}) gagne ${pctW(c)} de ses ${c.games} games : il mérite peut-être de monter.` });
      if (c.games >= 5 && c.wr < 40 && c.tier !== 'S') notes.push({ kind: 'bad', text: `${c.champion} : ${c.wins} victoire${c.wins > 1 ? 's' : ''} sur ${c.games} games. À travailler, ou à remplacer dans le pool.` });
    }
    const best = per.filter((c) => c.games >= 3).sort((a, b) => b.wr - a.wr || b.games - a.games)[0];
    if (best && best.wr >= 55) notes.push({ kind: 'good', text: `Meilleur champion du pool sur la période : ${best.champion}, ${pctW(best)} sur ${best.games} games.` });
    if (tiers && total.games >= 5) {
      const sGames = poolRows.filter((r) => (tiers.S || []).includes(r.champ_id)).length;
      notes.push({ kind: 'neutre', text: `${Math.round((sGames / total.games) * 100)} % de ses games de pool sont sur ses champions S.` });
    }
    const jamais = per.filter((c) => !c.games).map((c) => c.champion);
    if (jamais.length && rows.length) notes.push({ kind: 'neutre', text: `Pas encore joué sur la période : ${jamais.join(', ')}.` });
    if (hors.length) notes.push({ kind: hors.reduce((s, c) => s + c.games, 0) > total.games ? 'bad' : 'neutre', text: `${pl(hors.reduce((s, c) => s + c.games, 0), 'game', 'games')} hors pool : ${hors.slice(0, 4).map((c) => `${c.champion} (${c.games})`).join(', ')}.` });
    const cand = (champs || []).filter((c) => !ids.includes(c.id) && c.games >= 8 && c.wins / c.games >= 0.55).sort((a, b) => b.games - a.games).slice(0, 2);
    cand.forEach((c) => notes.push({ kind: 'good', text: `Candidat possible pour le pool : ${champName(c.id)}, ${fr((c.wins / c.games) * 100)} % de victoires sur ${c.games} games ce split.` }));
    return { per, hors, total, notes, rows: rows.length };
  }

  // Changements d'une semaine à l'autre : champions ajoutés, retirés, changés de tier.
  function poolChanges(prev, cur) {
    if (!prev || !cur) return null;
    const tp = (t, id) => TIERS.find((k) => (t[k] || []).includes(id));
    const a = poolIds(cur), b = poolIds(prev);
    return {
      ajoutes: a.filter((id) => !b.includes(id)).map((id) => ({ id, champion: champName(id), tier: tp(cur, id) })),
      retires: b.filter((id) => !a.includes(id)).map((id) => ({ id, champion: champName(id), tier: tp(prev, id) })),
      deplaces: a.filter((id) => b.includes(id) && tp(cur, id) !== tp(prev, id)).map((id) => ({ id, champion: champName(id), de: tp(prev, id), vers: tp(cur, id) }))
    };
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
      if (obj.done >= obj.target) out.push({ kind: 'plus', ico: '🎯', title: 'Objectif atteint', text: `${obj.done} games sur son pool depuis le ${depuis} (objectif : ${obj.target}).` });
      else out.push({ kind: obj.done >= obj.target / 2 ? 'info' : 'warn', ico: '🎯', title: `Objectif : ${obj.done} / ${obj.target}`, text: `${obj.done} ${obj.done > 1 ? 'games' : 'game'} sur son pool depuis le ${depuis} : il en reste ${obj.reste} à jouer.` });
    }
    if (!s.games) return out.concat([{ kind: 'info', ico: '😴', title: 'Pas de game', text: 'Aucune game classée Solo/Duo sur cette période.' }]);

    if (s.morts_moy > rep.morts_moy.v) out.push({ kind: 'warn', ico: '💀', title: 'Il meurt trop', text: `${fr(s.morts_moy, 1)} morts par game en moyenne, pour un KDA de ${fr(s.kda, 2)}.` });
    else out.push({ kind: 'plus', ico: '🛡️', title: 'Point fort : il meurt peu', text: `${fr(s.morts_moy, 1)} morts par game en moyenne, pour un KDA de ${fr(s.kda, 2)}.` });

    if (s.gold15 != null) {
      if (s.gold15 < 0) {
        let t = `En retard de golds à 15 min dans ${s.gold15_neg} ${s.gold15_neg > 1 ? 'games' : 'game'} sur ${s.games} (${sg(s.gold15)} en moyenne ${R.face}).`;
        if (role !== 'support' && s.cs15 != null) t += s.cs15 >= 0 ? ` Il a pourtant ${sg(s.cs15, 1)} CS d'écart à 15 min : le retard vient des fights et des morts, pas du farm.` : ` Il perd aussi au farm (${sg(s.cs15, 1)} CS à 15 min).`;
        out.push({ kind: 'warn', ico: '⏱️', title: 'Début de partie', text: t });
      } else {
        out.push({ kind: 'plus', ico: '✅', title: role === 'jungle' ? 'Point fort : son début de partie' : 'Point fort : sa lane', text: `En moyenne ${sg(s.gold15)} golds${role !== 'support' && s.cs15 != null ? ` et ${sg(s.cs15, 1)} CS` : ''} d'écart ${R.sur} à 15 min.` });
      }
    }

    if (role === 'support') {
      if (s.pinks_moy < rep.pinks_moy.v || s.vision < rep.vision.v) out.push({ kind: 'warn', ico: '👁️', title: 'Vision', text: `${pl(s.pinks, 'pink posée', 'pinks posées')} en ${s.games} games (${fr(s.pinks_moy, 1)} par game) et ${fr(s.vision, 1)} de score de vision par game.` });
      else out.push({ kind: 'plus', ico: '✅', title: 'Point fort : la vision', text: `${pl(s.pinks, 'pink posée', 'pinks posées')} en ${s.games} games (${fr(s.pinks_moy, 1)} par game) et ${fr(s.vision, 1)} de score de vision par game.` });
    } else {
      if (s.pinks_moy < rep.pinks_moy.v) out.push({ kind: 'warn', ico: '👁️', title: 'Vision', text: `${pl(s.pinks, 'pink posée', 'pinks posées')} en ${s.games} games.` });
      if (R.cs && s.cs_min != null && s.cs_min < R.cs) out.push({ kind: 'warn', ico: '🌾', title: 'Farm', text: `${fr(s.cs_min, 1)} CS par minute en moyenne (repère ≥ ${R.cs}).` });
    }

    const pc = byChamp(rows);
    const missing = (player.pool_ids || []).filter((id) => !rows.some((r) => r.champ_id === id)).map(champName);
    if (s.hors_pool > 0) {
      const off = pc.filter((c) => !c.pool).map((c) => `${c.champion} ${c.games}`).join(', ');
      out.push({ kind: 'warn', ico: '🧙', title: 'Champion pool', text: `${s.hors_pool} ${s.hors_pool > 1 ? 'games' : 'game'} sur ${s.games} hors de son pool (${off}).${missing.length ? ` Pas joué : ${missing.join(', ')}.` : ''}` });
    } else {
      out.push({ kind: 'plus', ico: '✅', title: 'Il joue son pool', text: `Toutes ses games sont sur son pool imposé.${missing.length ? ` Pas joué : ${missing.join(', ')}.` : ''}` });
    }
    pc.filter((c) => c.pool && c.games >= 3 && c.wr < 35).forEach((c) => out.push({ kind: 'warn', ico: '⚠️', title: c.champion, text: `${c.wins} V – ${c.losses} D sur la période avec ce champion du pool.` }));

    const off = rows.filter((r) => r.lane && r.lane !== R.lane);
    if (off.length) {
      const lanes = [...group(off, 'lane').entries()].map(([l, rs]) => `${rs.length} en ${l}`).join(', ');
      out.push({ kind: 'warn', ico: '🔁', title: 'Rôle', text: `${off.length} ${off.length > 1 ? 'games jouées' : 'game jouée'} hors de son rôle (${lanes}).` });
    }
    if (s.games < 5) out.push({ kind: 'info', ico: '📉', title: 'Peu de games', text: `Seulement ${pl(s.games, 'game', 'games')} sur la période : les moyennes sont à prendre avec prudence.` });
    return out;
  }

  function lead(player, s) {
    if (!s.games) return 'Aucune game classée Solo/Duo sur cette période.';
    const parts = [`${pl(s.wins, 'victoire', 'victoires')}, ${pl(s.losses, 'défaite', 'défaites')} (${fr(s.wr, 1)} %), KDA ${fr(s.kda, 2)}.`];
    const R = ROLES[player.role_id];
    if (s.gold15 != null) parts.push(s.gold15 < 0 ? `En moyenne ${sg(s.gold15)} golds à 15 min ${R.face}.` : `En moyenne ${sg(s.gold15)} golds d'avance à 15 min ${R.sur}.`);
    if (s.hors_pool) parts.push(`${s.hors_pool} ${s.hors_pool > 1 ? 'games' : 'game'} hors de son pool.`);
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

  const api = { TIERS, poolIds, poolAnalysis, poolChanges, verdict, NAMES, champName, ROLES, LANE, reperes, toRows, stats, byDay, byChamp, poolSplit, splitTotals, objectif, insights, lead, badges, fr, sg, pl, ymd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FC = api;
})(typeof window !== 'undefined' ? window : globalThis);
