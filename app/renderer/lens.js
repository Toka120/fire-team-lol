// FIRE — arbre des points forts (inspiré de DPM Lens) : 6 domaines notés sur 100 à partir des games du joueur.
// Chaque note compare ses moyennes à un repère par rôle (niveau Émeraude environ) : 50 = au repère, 75 = nettement
// au-dessus, 25 = nettement en dessous. Le domaine le plus faible est signalé « à travailler ».
(function () {
  'use strict';
  const clamp = (x) => Math.max(0, Math.min(100, Math.round(x)));
  // Repères par rôle : [valeur moyenne, écart pour ±25 points].
  const REF = {
    top:     { kda: [2.6, 1.0], dpm: [650, 220], dmgp: [24, 6], solo: [0.6, 0.6], cs15: [0, 12], gold15: [0, 700], xp15: [0, 500], csm: [7.2, 1.2], gpm: [400, 70], vis: [22, 10], pink: [1.5, 1.2], wkill: [2, 1.5], deaths: [5, 1.8], kp: [48, 12], drag: [0.4, 0.4], hord: [0.8, 0.8], plates: [2, 1.5] },
    jungle:  { kda: [3.0, 1.1], dpm: [520, 180], dmgp: [18, 5], solo: [0.3, 0.4], cs15: [0, 12], gold15: [0, 700], xp15: [0, 500], csm: [5.8, 1.0], gpm: [390, 60], vis: [32, 12], pink: [2.5, 1.5], wkill: [3, 2], deaths: [5, 1.8], kp: [60, 12], drag: [1.6, 0.8], hord: [2.2, 1.2], plates: [0.5, 0.8] },
    mid:     { kda: [2.9, 1.1], dpm: [720, 240], dmgp: [26, 6], solo: [0.6, 0.6], cs15: [0, 12], gold15: [0, 700], xp15: [0, 500], csm: [7.5, 1.2], gpm: [410, 70], vis: [24, 10], pink: [1.5, 1.2], wkill: [2, 1.5], deaths: [4.8, 1.8], kp: [55, 12], drag: [0.6, 0.5], hord: [0.4, 0.5], plates: [1.5, 1.2] },
    adc:     { kda: [3.0, 1.1], dpm: [750, 240], dmgp: [27, 6], solo: [0.3, 0.4], cs15: [0, 12], gold15: [0, 700], xp15: [0, 500], csm: [7.8, 1.2], gpm: [420, 70], vis: [20, 9], pink: [1.2, 1.0], wkill: [1.5, 1.2], deaths: [4.8, 1.8], kp: [55, 12], drag: [0.6, 0.5], hord: [0.2, 0.4], plates: [1.5, 1.2] },
    support: { kda: [3.0, 1.2], dpm: [300, 140], dmgp: [10, 5], solo: [0.1, 0.3], cs15: [0, 8], gold15: [0, 500], xp15: [0, 450], csm: [1.2, 0.8], gpm: [280, 50], vis: [65, 20], pink: [4.5, 2], wkill: [5, 3], deaths: [5.5, 2], kp: [62, 12], drag: [0.4, 0.4], hord: [0.2, 0.3], plates: [0.4, 0.6] },
  };
  const DOMAINS = [
    { id: 'combat', label: 'Combat', ico: '⚔️', color: '#579DFF', stats: [['kda', 'KDA'], ['dpm', 'Dégâts / min'], ['solo', 'Solo kills / game']] },
    { id: 'lane', label: 'Phase de lane', ico: '🛡️', color: '#F59E0B', stats: [['cs15', 'Écart de CS à 15 min'], ['gold15', 'Écart de golds à 15 min'], ['xp15', 'Écart d’XP à 15 min']] },
    { id: 'eco', label: 'Farm et golds', ico: '💰', color: '#E8C56A', stats: [['csm', 'CS / min'], ['gpm', 'Golds / min']] },
    { id: 'obj', label: 'Objectifs', ico: '🐉', color: '#39C58A', stats: [['drag', 'Dragons / game'], ['hord', 'Larves / game'], ['plates', 'Plaques / game']] },
    { id: 'vision', label: 'Vision', ico: '👁️', color: '#63D8D5', stats: [['vis', 'Score de vision'], ['pink', 'Pinks posées'], ['wkill', 'Wards détruites']] },
    { id: 'survie', label: 'Survie', ico: '❤️', color: '#EF6A9D', stats: [['deaths', 'Morts / game', true]] },
    { id: 'equipe', label: 'Impact d’équipe', ico: '🤝', color: '#A78BFA', stats: [['kp', 'Participation aux kills %'], ['dmgp', 'Part des dégâts %']] },
  ];
  const avg = (rows, k) => { const xs = rows.map((r) => r[k]).filter((x) => x != null && Number.isFinite(Number(x))).map(Number); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  function values(rows) {
    const kda = (() => { const K = rows.reduce((s, r) => s + (r.kills || 0), 0), D = rows.reduce((s, r) => s + (r.morts || 0), 0), A = rows.reduce((s, r) => s + (r.assists || 0), 0); return rows.length ? (K + A) / Math.max(1, D) : null; })();
    return {
      kda, dpm: avg(rows, 'degats_min'), dmgp: avg(rows, 'part_degats'), solo: avg(rows, 'solo_kills'),
      cs15: avg(rows, 'cs15'), gold15: avg(rows, 'gold15'), xp15: avg(rows, 'xp15'),
      csm: avg(rows, 'cs_min'), gpm: avg(rows, 'gold_min'),
      vis: avg(rows, 'vision'), pink: avg(rows, 'pinks'), wkill: avg(rows, 'wards_detruites'),
      deaths: avg(rows, 'morts'), kp: avg(rows, 'kp'), drag: avg(rows, 'drakes'), hord: avg(rows, 'larves'), plates: avg(rows, 'plates'),
    };
  }
  function analyse(rows, role) {
    const ref = REF[role] || REF.mid;
    const v = values(rows);
    const domains = DOMAINS.map((d) => {
      const stats = d.stats.map(([k, label, lowBetter]) => {
        const val = v[k];
        if (val == null || !ref[k]) return { k, label, val: null, score: null };
        const [m, sp] = ref[k];
        const z = (val - m) / sp;
        return { k, label, val, score: clamp(50 + (lowBetter ? -z : z) * 25) };
      }).filter((x) => x.val != null);
      const sc = stats.filter((x) => x.score != null);
      // Le support ne farme pas : on ne lui note pas « Farm et golds ».
      const skip = role === 'support' && d.id === 'eco';
      return { ...d, stats, score: !skip && sc.length ? clamp(sc.reduce((a, x) => a + x.score, 0) / sc.length) : null };
    }).filter((d) => d.score != null);
    const overall = domains.length ? Math.round(domains.reduce((a, d) => a + d.score, 0) / domains.length * 10) / 10 : null;
    const weakest = domains.slice().sort((a, b) => a.score - b.score)[0];
    const best = domains.slice().sort((a, b) => b.score - a.score)[0];
    return { domains, overall, weakest: weakest && weakest.id, best: best && best.id, games: rows.length };
  }

  // ----- Dessin de l'arbre (SVG) : la note globale au centre, un domaine par branche, ses stats en feuilles -----
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); (kids || []).forEach((c) => c && e.append(c)); return e; };
  const txt = (x, y, t, attrs) => { const e = el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...(attrs || {}) }); e.textContent = t; return e; };
  const fmt = (k, v) => (v == null ? '—' : ['cs15', 'gold15', 'xp15'].includes(k) ? (v > 0 ? '+' : '') + Math.round(v) : k === 'kda' ? v.toFixed(2).replace('.', ',') : (Math.round(v * 10) / 10).toString().replace('.', ','));
  function tree(A, opts) {
    const W = 720, H = 560, cx = W / 2, cy = H / 2;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lens-svg', role: 'img', 'aria-label': 'Arbre des points forts' });
    const n = A.domains.length;
    const g = el('g');
    A.domains.forEach((d, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const r1 = 150, r2 = 235;
      const x1 = cx + Math.cos(ang) * r1, y1 = cy + Math.sin(ang) * r1;
      // Branche principale (courbe douce)
      const mx = cx + Math.cos(ang + 0.25) * 70, my = cy + Math.sin(ang + 0.25) * 70;
      g.append(el('path', { d: `M${cx},${cy} Q${mx},${my} ${x1},${y1}`, stroke: d.color, 'stroke-width': 3, fill: 'none', opacity: 0.85, class: 'lens-branch' }));
      // Feuilles : chaque stat du domaine
      d.stats.forEach((s, j) => {
        const spread = 0.42;
        const a2 = ang + (d.stats.length > 1 ? (j / (d.stats.length - 1) - 0.5) * spread : 0);
        const x2 = cx + Math.cos(a2) * r2, y2 = cy + Math.sin(a2) * r2;
        g.append(el('line', { x1, y1, x2, y2, stroke: d.color, 'stroke-width': 1.5, opacity: 0.5 }));
        const col = s.score == null ? '#5b6472' : s.score >= 60 ? '#39C58A' : s.score < 40 ? '#EF6670' : '#E8C56A';
        const leaf = el('g', { class: 'lens-leaf' }, [
          el('circle', { cx: x2, cy: y2, r: 15, fill: '#12161C', stroke: col, 'stroke-width': 2 }),
          txt(x2, y2, s.score == null ? '—' : String(s.score), { 'font-size': 11, 'font-weight': 700, fill: '#F2F4F7' }),
        ]);
        const tt = el('title'); tt.textContent = `${s.label} : ${fmt(s.k, s.val)} (note ${s.score == null ? '—' : s.score}/100)`; leaf.append(tt);
        g.append(leaf);
      });
      // Nœud du domaine
      const weak = A.weakest === d.id;
      const node = el('g', { class: 'lens-node' + (weak ? ' weak' : '') }, [
        el('rect', { x: x1 - 34, y: y1 - 26, width: 68, height: 52, rx: 12, fill: '#1A2029', stroke: d.color, 'stroke-width': weak ? 3 : 2 }),
        txt(x1, y1 - 9, d.ico, { 'font-size': 15 }),
        txt(x1, y1 + 11, String(d.score), { 'font-size': 15, 'font-weight': 800, fill: d.color }),
      ]);
      const tt = el('title'); tt.textContent = `${d.label} : ${d.score}/100`; node.append(tt);
      g.append(node);
    });
    svg.append(g);
    // Centre : note globale
    svg.append(el('circle', { cx, cy, r: 52, fill: '#0B0D10', stroke: '#F5A524', 'stroke-width': 3 }));
    svg.append(txt(cx, cy - 6, A.overall == null ? '—' : String(A.overall).replace('.', ','), { 'font-size': 30, 'font-weight': 800, fill: '#F2F4F7' }));
    svg.append(txt(cx, cy + 22, 'sur 100', { 'font-size': 11, fill: '#A2ADBC' }));
    return svg;
  }
  window.FireLens = { analyse, tree, DOMAINS, fmt };
}());
