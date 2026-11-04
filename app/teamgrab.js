// Exécutée DANS la page dpm.lol (même origine que son API). Doit rester autonome : pas de variable extérieure.
// Lit le détail complet (10 joueurs) des parties demandées et en garde un résumé par équipe.
async function teamGrab(puuid, ids, platform) {
  const n = (x) => (typeof x === 'number' && isFinite(x) ? x : 0);
  const out = {};
  for (const id of ids) {
    try {
      const r = await fetch(`/v1/players/${puuid}/match/${platform}_${id}`, { cache: 'no-store' });
      if (!r.ok) { out[id] = { err: r.status }; continue; }
      const m = await r.json();
      const ps = m.participants || [];
      const min = Math.max(1, (m.gameDuration || 0) / 60);
      const side = (t) => {
        const team = ps.filter((p) => p.teamId === t);
        const one = team[0] || {};
        const sum = (k) => team.reduce((a, p) => a + n(p[k]), 0);
        return {
          win: !!one.win,
          k: sum('kills'), d: sum('deaths'), a: sum('assists'),
          gold: sum('goldEarned'), dmg: sum('totalDamageDealtToChampions'),
          vis: Math.round(team.reduce((a, p) => a + n(p.visionScorePerMinute) * min, 0)),
          cw: sum('controlWardsPlaced'), wk: sum('wardTakedowns'),
          gd15: sum('goldDiffAt15'),
          // objectifs : même valeur chez les 5 joueurs d'une équipe
          drag: n(one.dragon), baron: n(one.baron), herald: n(one.riftHerald), grubs: n(one.horde), towers: n(one.tower), atakhan: n(one.atakhan),
          fb: team.some((p) => p.firstBlood),
          plates: sum('turretPlatesTaken'), steals: sum('epicMonsterSteals'), picks: sum('pickKillWithAlly'), saves: sum('saveAllyFromDeath'),
          pings: sum('enemyMissingPings') + sum('onMyWayPings')
        };
      };
      out[id] = {
        id, t: m.gameCreation, d: m.gameDuration, q: m.queueId,
        s100: side(100), s200: side(200),
        p: ps.map((p) => ({
          id: p.puuid, side: p.teamId, c: p.championName, lane: p.lane || p.role || '',
          k: n(p.kills), d: n(p.deaths), a: n(p.assists), kp: n(p.killParticipation),
          g15: n(p.goldDiffAt15), cs15: n(p.csDiffAt15), vpm: n(p.visionScorePerMinute), cw: n(p.controlWardsPlaced),
          dmg: n(p.totalDamageDealtToChampions), dpm: n(p.dpmScore), fb: !!p.firstBlood, solo: n(p.soloKills)
        }))
      };
    } catch (e) {
      out[id] = { err: String(e && e.message || e) };
    }
  }
  return out;
}

module.exports = { teamGrab };
