// FIRE — fonds animés des thèmes : une toile derrière l'application, dessinée par FIRE (aucune vidéo téléchargée).
// Sakura : pétales qui tombent en tournoyant. Freljord : neige. Abysses : bulles et rayons. Matrix : pluie de code.
// Synthwave : grille qui défile et soleil. Bagarre : braises. Hextech : étincelles or et bleu. Arcane : particules chimiques.
// Void : poussière aspirée par le Néant. Néon / RGB : orbes lumineux. Futuriste : balayage et données. Café : vapeur.
// Léger : 30 images/s au plus, en pause quand FIRE est caché ou pendant une partie, coupé avec « Réduire les animations ».
(function () {
  'use strict';
  const FX = { on: false, theme: '', level: 1, cv: null, ctx: null, w: 0, h: 0, parts: [], t0: 0, last: 0, raf: 0, paused: false, scene: null, extra: {} };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const TAU = Math.PI * 2;

  // ---------- Les scènes ----------
  // init(n) : crée les particules ; step(p, dt) : les fait bouger ; draw(c, p) : les dessine ; bg(c, t) : décor sous les particules.
  const SCENES = {
    sakura: {
      n: 64,
      make(fresh) {
        return { x: rnd(-0.1, 1.1) * FX.w, y: fresh ? rnd(-FX.h, FX.h) : rnd(-80, -20), s: rnd(7, 15), vy: rnd(22, 48), vx: rnd(8, 26), rot: rnd(0, TAU), vr: rnd(-1.4, 1.4),
          flip: rnd(0, TAU), vf: rnd(1.5, 3.5), sway: rnd(0, TAU), sw: rnd(0.6, 1.4), hue: pick(['#ffc2d9', '#ffb3cf', '#ffd6e5', '#ff9fc2', '#fbe3ec']), a: rnd(0.65, 1) };
      },
      step(p, dt, t) {
        p.sway += dt * p.sw; p.flip += dt * p.vf; p.rot += dt * p.vr;
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.sway) * 30 + FX.extra.wind) * dt;
        return p.y < FX.h + 40 && p.x < FX.w + 60;
      },
      draw(c, p) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(Math.cos(p.flip), 1); c.globalAlpha = p.a;
        const s = p.s;
        c.beginPath(); c.moveTo(0, -s); c.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.5, 0, s); c.bezierCurveTo(-s * 0.7, s * 0.5, -s * 0.9, -s * 0.6, 0, -s);
        // petite encoche en haut, comme un vrai pétale de cerisier
        c.fillStyle = p.hue; c.fill();
        c.globalAlpha = p.a * 0.35; c.strokeStyle = '#ff7fae'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -s * 0.6); c.lineTo(0, s * 0.7); c.stroke();
        c.restore();
      },
      bg(c, t) {
        FX.extra.wind = Math.sin(t / 7) * 18 + Math.sin(t / 2.3) * 6;
        // Lumière douce et quelques fleurs floues au loin
        const g = c.createRadialGradient(FX.w * 0.82, FX.h * 0.08, 10, FX.w * 0.82, FX.h * 0.08, FX.h * 0.9);
        g.addColorStop(0, 'rgba(255,190,215,.20)'); g.addColorStop(1, 'rgba(255,190,215,0)');
        c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h);
        for (const b of FX.extra.bokeh || []) {
          const y = b.y + Math.sin(t * b.f + b.o) * 12;
          const gr = c.createRadialGradient(b.x, y, 0, b.x, y, b.r);
          gr.addColorStop(0, `rgba(255,170,205,${b.a})`); gr.addColorStop(1, 'rgba(255,170,205,0)');
          c.fillStyle = gr; c.beginPath(); c.arc(b.x, y, b.r, 0, TAU); c.fill();
        }
        // Branche de cerisier dans le coin, dessinée une fois puis réutilisée
        if (FX.extra.branch) c.drawImage(FX.extra.branch, 0, 0);
      },
      setup() {
        FX.extra.wind = 0;
        FX.extra.bokeh = Array.from({ length: 9 }, () => ({ x: rnd(0, FX.w), y: rnd(0, FX.h), r: rnd(30, 90), a: rnd(0.05, 0.12), f: rnd(0.2, 0.5), o: rnd(0, TAU) }));
        FX.extra.branch = branch();
      },
    },
    givre: {
      n: 110,
      make(fresh) { const z = rnd(0.3, 1); return { x: rnd(0, FX.w), y: fresh ? rnd(0, FX.h) : -10, z, r: 1 + z * 2.6, vy: 14 + z * 46, sway: rnd(0, TAU), a: 0.35 + z * 0.6 }; },
      step(p, dt) { p.sway += dt; p.y += p.vy * dt; p.x += (Math.sin(p.sway) * 12 * p.z + FX.extra.wind * p.z) * dt; return p.y < FX.h + 10; },
      draw(c, p) { c.globalAlpha = p.a; c.fillStyle = '#eaf7ff'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); },
      bg(c, t) { FX.extra.wind = Math.sin(t / 5) * 20; c.globalAlpha = 1; const g = c.createLinearGradient(0, FX.h * 0.75, 0, FX.h); g.addColorStop(0, 'rgba(180,225,255,0)'); g.addColorStop(1, 'rgba(180,225,255,.10)'); c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h); },
    },
    ocean: {
      n: 45,
      make(fresh) { return { x: rnd(0, FX.w), y: fresh ? rnd(0, FX.h) : FX.h + 20, r: rnd(2, 8), vy: rnd(18, 55), sway: rnd(0, TAU), a: rnd(0.25, 0.6) }; },
      step(p, dt) { p.sway += dt * 1.6; p.y -= p.vy * dt; p.x += Math.sin(p.sway) * 14 * dt; return p.y > -20; },
      draw(c, p) { c.globalAlpha = p.a; c.strokeStyle = '#9ff7ff'; c.lineWidth = 1.2; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.stroke(); c.globalAlpha = p.a * 0.6; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, TAU); c.fill(); },
      bg(c, t) {
        for (let i = 0; i < 5; i++) {
          const x = FX.w * (0.15 + i * 0.18) + Math.sin(t / 3 + i) * 60;
          c.globalAlpha = 0.05 + 0.03 * Math.sin(t / 2 + i * 1.7);
          const g = c.createLinearGradient(0, 0, 0, FX.h); g.addColorStop(0, '#7ff5ff'); g.addColorStop(1, 'rgba(127,245,255,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x + 30, 0); c.lineTo(x + 170, FX.h); c.lineTo(x + 40, FX.h); c.closePath(); c.fill();
        }
      },
    },
    matrix: {
      n: 0,
      setup() { const fs = 16; FX.extra.fs = fs; FX.extra.cols = Array.from({ length: Math.ceil(FX.w / fs) }, () => ({ y: rnd(-FX.h, 0), v: rnd(60, 160) })); FX.extra.chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789FIRE<>/=+*'; },
      bg(c, t, dt) {
        const fs = FX.extra.fs; c.font = `${fs}px 'JetBrains Mono', Consolas, monospace`;
        FX.extra.cols.forEach((col, i) => {
          col.y += col.v * dt;
          if (col.y - 24 * fs > FX.h) { col.y = rnd(-200, 0); col.v = rnd(60, 160); }
          for (let k = 0; k < 24; k++) {
            const y = col.y - k * fs; if (y < -fs || y > FX.h + fs) continue;
            c.globalAlpha = k === 0 ? 0.55 : Math.max(0, 0.32 - k * 0.013);
            c.fillStyle = k === 0 ? '#d8ffd8' : '#39ff6a';
            c.fillText(FX.extra.chars[(Math.floor(t * 8) + i * 7 + k * 13) % FX.extra.chars.length], i * fs, y);
          }
        });
      },
    },
    synthwave: {
      n: 60,
      make() { return { x: rnd(0, FX.w), y: rnd(0, FX.h * 0.55), r: rnd(0.5, 1.6), tw: rnd(0, TAU) }; },
      step(p, dt) { p.tw += dt * 2; return true; },
      draw(c, p) { c.globalAlpha = 0.25 + 0.35 * (1 + Math.sin(p.tw)) / 2; c.fillStyle = '#ffe1f4'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); },
      bg(c, t) {
        const hz = FX.h * 0.62, cx = FX.w / 2;
        // Soleil rayé
        const r = Math.min(FX.w, FX.h) * 0.16, sy = hz - r * 0.55;
        const g = c.createLinearGradient(0, sy - r, 0, sy + r); g.addColorStop(0, 'rgba(255,214,102,.55)'); g.addColorStop(1, 'rgba(255,79,154,.45)');
        c.globalAlpha = 1; c.save(); c.beginPath(); c.arc(cx, sy, r, 0, TAU); c.clip(); c.fillStyle = g; c.fillRect(cx - r, sy - r, r * 2, r * 2);
        c.fillStyle = 'rgba(18,5,31,.9)'; for (let i = 0; i < 6; i++) { const yy = sy + r * (0.1 + i * 0.16); c.fillRect(cx - r, yy, r * 2, 2 + i * 1.5); } c.restore();
        // Grille qui défile vers nous
        c.strokeStyle = 'rgba(255,110,199,.35)'; c.lineWidth = 1;
        const sp = (t * 0.35) % 1;
        for (let i = 0; i < 16; i++) { const k = (i + sp) / 16; const y = hz + (FX.h - hz) * k * k; c.globalAlpha = 0.15 + k * 0.5; c.beginPath(); c.moveTo(0, y); c.lineTo(FX.w, y); c.stroke(); }
        c.globalAlpha = 0.4;
        for (let i = -14; i <= 14; i++) { c.beginPath(); c.moveTo(cx + i * 18, hz); c.lineTo(cx + i * FX.w * 0.09, FX.h); c.stroke(); }
      },
    },
    bagarre: {
      n: 55,
      make(fresh) { return { x: rnd(0, FX.w), y: fresh ? rnd(0, FX.h) : FX.h + 10, r: rnd(1, 3.2), vy: rnd(30, 90), vx: rnd(-15, 15), life: rnd(3, 7), age: 0, hue: pick(['#ff3b1f', '#ff7a1f', '#ffc21f']) }; },
      step(p, dt, t) { p.age += dt; p.y -= p.vy * dt; p.x += (p.vx + Math.sin(t * 2 + p.y / 50) * 20) * dt; return p.age < p.life && p.y > -10; },
      draw(c, p) { const a = Math.max(0, 1 - p.age / p.life); c.globalAlpha = a; c.fillStyle = p.hue; c.shadowColor = p.hue; c.shadowBlur = 10; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.shadowBlur = 0; },
      bg(c) { const g = c.createLinearGradient(0, FX.h * 0.7, 0, FX.h); g.addColorStop(0, 'rgba(255,59,31,0)'); g.addColorStop(1, 'rgba(255,59,31,.14)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h); },
    },
    hextech: {
      n: 40,
      make(fresh) { return { x: rnd(0, FX.w), y: fresh ? rnd(0, FX.h) : FX.h + 10, s: rnd(3, 7), vy: rnd(10, 30), rot: rnd(0, TAU), vr: rnd(-0.6, 0.6), col: pick(['#c8aa6e', '#f0e6d2', '#0ac8b9']), a: rnd(0.25, 0.6) }; },
      step(p, dt) { p.y -= p.vy * dt; p.rot += p.vr * dt; return p.y > -20; },
      draw(c, p) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = p.a; c.strokeStyle = p.col; c.lineWidth = 1.2; c.shadowColor = p.col; c.shadowBlur = 8; c.beginPath(); for (let i = 0; i < 6; i++) { const an = i * TAU / 6; c.lineTo(Math.cos(an) * p.s, Math.sin(an) * p.s); } c.closePath(); c.stroke(); c.restore(); },
    },
    arcane: {
      n: 50,
      make(fresh) { return { x: rnd(0, FX.w), y: fresh ? rnd(0, FX.h) : FX.h + 10, r: rnd(1.5, 4), vy: rnd(8, 26), sway: rnd(0, TAU), col: Math.random() < 0.65 ? '#3ef0c8' : '#ff4fa3', a: rnd(0.3, 0.7) }; },
      step(p, dt) { p.sway += dt; p.y -= p.vy * dt; p.x += Math.sin(p.sway) * 10 * dt; return p.y > -10; },
      draw(c, p) { c.globalAlpha = p.a; c.fillStyle = p.col; c.shadowColor = p.col; c.shadowBlur = 14; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.shadowBlur = 0; },
    },
    violet: {
      n: 90,
      make() { const an = rnd(0, TAU), d = rnd(0.35, 0.75) * Math.max(FX.w, FX.h); return { an, d, v: rnd(0.08, 0.25), dv: rnd(18, 45), r: rnd(0.8, 2.2), col: Math.random() < 0.7 ? '#b48cff' : '#ff5cc8' }; },
      step(p, dt) { p.an += p.v * dt; p.d -= p.dv * dt; return p.d > 8; },
      draw(c, p) { const x = FX.w / 2 + Math.cos(p.an) * p.d, y = FX.h / 2 + Math.sin(p.an) * p.d * 0.6; c.globalAlpha = Math.min(0.8, p.d / 300); c.fillStyle = p.col; c.beginPath(); c.arc(x, y, p.r, 0, TAU); c.fill(); },
      bg(c, t) { const g = c.createRadialGradient(FX.w / 2, FX.h / 2, 0, FX.w / 2, FX.h / 2, Math.min(FX.w, FX.h) * 0.35); g.addColorStop(0, `rgba(157,92,255,${0.16 + 0.05 * Math.sin(t)})`); g.addColorStop(1, 'rgba(157,92,255,0)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h); },
    },
    neon: {
      n: 22,
      make() { return { x: rnd(0, FX.w), y: rnd(0, FX.h), r: rnd(30, 110), vx: rnd(-12, 12), vy: rnd(-12, 12), col: Math.random() < 0.5 ? '255,43,214' : '34,230,255', a: rnd(0.05, 0.12) }; },
      step(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < -p.r) p.x = FX.w + p.r; if (p.x > FX.w + p.r) p.x = -p.r; if (p.y < -p.r) p.y = FX.h + p.r; if (p.y > FX.h + p.r) p.y = -p.r; return true; },
      draw(c, p) { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(${p.col},${p.a * 2})`); g.addColorStop(1, `rgba(${p.col},0)`); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); },
    },
    rgb: {
      n: 26,
      make() { return { x: rnd(0, FX.w), y: rnd(0, FX.h), r: rnd(30, 100), vx: rnd(-14, 14), vy: rnd(-14, 14), h0: rnd(0, 360) }; },
      step(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < -p.r) p.x = FX.w + p.r; if (p.x > FX.w + p.r) p.x = -p.r; if (p.y < -p.r) p.y = FX.h + p.r; if (p.y > FX.h + p.r) p.y = -p.r; return true; },
      draw(c, p, t) { const hue = (p.h0 + t * 40) % 360; const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `hsla(${hue},100%,60%,.16)`); g.addColorStop(1, `hsla(${hue},100%,60%,0)`); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); },
    },
    futur: {
      n: 30,
      make(fresh) { return { x: Math.round(rnd(0, FX.w) / 36) * 36, y: fresh ? rnd(0, FX.h) : -20, len: rnd(20, 90), vy: rnd(60, 160), a: rnd(0.15, 0.4) }; },
      step(p, dt) { p.y += p.vy * dt; return p.y - p.len < FX.h; },
      draw(c, p) { const g = c.createLinearGradient(0, p.y - p.len, 0, p.y); g.addColorStop(0, 'rgba(0,229,255,0)'); g.addColorStop(1, `rgba(0,229,255,${p.a})`); c.globalAlpha = 1; c.strokeStyle = g; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x, p.y - p.len); c.lineTo(p.x, p.y); c.stroke(); },
      bg(c, t) { const y = ((t * 90) % (FX.h + 200)) - 100; const g = c.createLinearGradient(0, y - 60, 0, y + 4); g.addColorStop(0, 'rgba(0,229,255,0)'); g.addColorStop(1, 'rgba(0,229,255,.10)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, y - 60, FX.w, 64); },
    },
    cafe: {
      n: 30,
      make(fresh) { return { x: rnd(0, FX.w), y: fresh ? rnd(0, FX.h) : FX.h + 10, r: rnd(1, 2.6), vy: rnd(6, 16), sway: rnd(0, TAU), a: rnd(0.15, 0.4) }; },
      step(p, dt) { p.sway += dt * 0.6; p.y -= p.vy * dt; p.x += Math.sin(p.sway) * 8 * dt; return p.y > -10; },
      draw(c, p) { c.globalAlpha = p.a; c.fillStyle = '#f3d9b1'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); },
      bg(c, t) {
        for (let i = 0; i < 3; i++) {
          const x = FX.w * (0.7 + i * 0.07); c.globalAlpha = 0.07; c.strokeStyle = '#f3d9b1'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath();
          for (let k = 0; k <= 20; k++) { const y = FX.h - k * FX.h * 0.03; const xx = x + Math.sin(t * 0.8 + k * 0.5 + i) * 18 * (k / 20); if (k) c.lineTo(xx, y); else c.moveTo(xx, y); }
          c.stroke();
        }
      },
    },
    aurore: {
      n: 70,
      make() { return { x: rnd(0, FX.w), y: rnd(0, FX.h * 0.7), r: rnd(0.4, 1.4), tw: rnd(0, TAU) }; },
      step(p, dt) { p.tw += dt * 1.5; return true; },
      draw(c, p) { c.globalAlpha = 0.2 + 0.4 * (1 + Math.sin(p.tw)) / 2; c.fillStyle = '#e8fff6'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); },
      bg(c, t) {
        // Rideaux de lumière qui ondulent
        const bands = [['46,255,170', 0.16, 0.22], ['80,200,255', 0.12, 0.3], ['190,110,255', 0.09, 0.38]];
        bands.forEach(([col, a, yy], k) => {
          c.globalAlpha = 1;
          for (let x = 0; x <= FX.w; x += 6) {
            const y = FX.h * yy + Math.sin(x / 180 + t * 0.4 + k) * 40 + Math.sin(x / 70 + t * 0.9 + k * 2) * 12;
            const hgt = 120 + Math.sin(x / 120 + t * 0.6 + k) * 60;
            const g = c.createLinearGradient(0, y - hgt, 0, y + 30);
            g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.7, `rgba(${col},${a * (0.6 + 0.4 * Math.sin(x / 50 + t + k))})`); g.addColorStop(1, `rgba(${col},0)`);
            c.fillStyle = g; c.fillRect(x, y - hgt, 6, hgt + 30);
          }
        });
      },
    },
    nuit: {
      n: 120,
      make() { return { x: rnd(0, FX.w), y: rnd(0, FX.h), r: rnd(0.4, 1.6), tw: rnd(0, TAU), sp: rnd(0.6, 2) }; },
      step(p, dt) { p.tw += dt * p.sp; return true; },
      draw(c, p) { c.globalAlpha = 0.25 + 0.6 * (1 + Math.sin(p.tw)) / 2; c.fillStyle = '#fff8e0'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); },
      bg(c, t, dt) {
        // Étoiles filantes de temps en temps
        const E = FX.extra;
        E.st = E.st || [];
        if (Math.random() < dt * 0.25) E.st.push({ x: rnd(FX.w * 0.2, FX.w), y: rnd(0, FX.h * 0.4), v: rnd(500, 800), age: 0 });
        E.st = E.st.filter((s) => (s.age += dt) < 1.2);
        for (const s of E.st) {
          const x = s.x - s.v * s.age, y = s.y + s.v * 0.45 * s.age, a = Math.max(0, 1 - s.age / 1.2);
          const g = c.createLinearGradient(x, y, x + 120, y - 54); g.addColorStop(0, `rgba(255,248,224,${a})`); g.addColorStop(1, 'rgba(255,248,224,0)');
          c.globalAlpha = 1; c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 120, y - 54); c.stroke();
        }
        // Lune
        const mx = FX.w * 0.85, my = FX.h * 0.16, r = Math.min(FX.w, FX.h) * 0.06;
        const g = c.createRadialGradient(mx, my, r * 0.2, mx, my, r * 3); g.addColorStop(0, 'rgba(255,240,200,.25)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(mx, my, r * 3, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,244,214,.85)'; c.beginPath(); c.arc(mx, my, r, 0, TAU); c.fill();
        c.fillStyle = 'rgba(10,12,30,.9)'; c.beginPath(); c.arc(mx + r * 0.42, my - r * 0.2, r * 0.9, 0, TAU); c.fill();
      },
    },
    orage: {
      n: 160,
      make(fresh) { return { x: rnd(-100, FX.w), y: fresh ? rnd(0, FX.h) : rnd(-60, -10), len: rnd(10, 22), v: rnd(700, 1000) }; },
      step(p, dt) { p.y += p.v * dt; p.x += p.v * 0.18 * dt; return p.y < FX.h + 30; },
      draw(c, p) { c.globalAlpha = 0.28; c.strokeStyle = '#bcd7ff'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.len * 0.18, p.y + p.len); c.stroke(); },
      bg(c, t, dt) {
        const E = FX.extra;
        if (!E.flash && Math.random() < dt * 0.12) { E.flash = 1; E.bolt = bolt(); }
        if (E.flash) {
          E.flash -= dt * 2.2;
          c.globalAlpha = Math.max(0, E.flash) * 0.18; c.fillStyle = '#dfe9ff'; c.fillRect(0, 0, FX.w, FX.h);
          if (E.flash > 0.45) { c.globalAlpha = Math.min(1, E.flash); c.strokeStyle = '#eef4ff'; c.lineWidth = 2.2; c.shadowColor = '#9fc0ff'; c.shadowBlur = 18; c.beginPath(); E.bolt.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.shadowBlur = 0; }
          if (E.flash <= 0) E.flash = 0;
        }
      },
    },
    lucioles: {
      n: 38,
      make() { return { x: rnd(0, FX.w), y: rnd(FX.h * 0.25, FX.h), vx: rnd(-12, 12), vy: rnd(-10, 10), ph: rnd(0, TAU), sp: rnd(0.8, 2) }; },
      step(p, dt, t) { p.ph += dt * p.sp; p.vx += rnd(-6, 6) * dt; p.vy += rnd(-6, 6) * dt; p.vx = Math.max(-18, Math.min(18, p.vx)); p.vy = Math.max(-14, Math.min(14, p.vy)); p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -10) p.x = FX.w + 10; if (p.x > FX.w + 10) p.x = -10; if (p.y < FX.h * 0.15) p.vy = Math.abs(p.vy); if (p.y > FX.h + 10) p.vy = -Math.abs(p.vy); return true; },
      draw(c, p) { const a = Math.max(0, Math.sin(p.ph)); const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14); g.addColorStop(0, `rgba(220,255,120,${a * 0.9})`); g.addColorStop(1, 'rgba(220,255,120,0)'); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 14, 0, TAU); c.fill(); },
      bg(c) { const g = c.createLinearGradient(0, FX.h * 0.6, 0, FX.h); g.addColorStop(0, 'rgba(20,60,30,0)'); g.addColorStop(1, 'rgba(20,60,30,.35)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h); },
    },
    galaxie: {
      n: 220,
      make() { const a = rnd(0, TAU), d = Math.pow(Math.random(), 0.6) * Math.max(FX.w, FX.h) * 0.6; return { a: a + d / 140, d, r: rnd(0.4, 1.6), col: pick(['#ffffff', '#cfd8ff', '#ffd6f5', '#b8a6ff', '#9fe8ff']), sp: 0.02 + 18 / (d + 60) }; },
      step(p, dt) { p.a += p.sp * dt; return true; },
      draw(c, p) { const x = FX.w / 2 + Math.cos(p.a) * p.d, y = FX.h / 2 + Math.sin(p.a) * p.d * 0.45; c.globalAlpha = 0.75; c.fillStyle = p.col; c.beginPath(); c.arc(x, y, p.r, 0, TAU); c.fill(); },
      bg(c, t) { const g = c.createRadialGradient(FX.w / 2, FX.h / 2, 0, FX.w / 2, FX.h / 2, Math.min(FX.w, FX.h) * 0.5); g.addColorStop(0, 'rgba(255,214,245,.18)'); g.addColorStop(0.4, 'rgba(140,110,255,.08)'); g.addColorStop(1, 'rgba(140,110,255,0)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h); },
    },
    // Pantins : un petit théâtre de marionnettes (rideaux de velours, projecteur, pantins de bois au bout de leurs fils).
    pantins: {
      n: 40,
      make(fresh) { return { x: FX.w / 2 + rnd(-0.22, 0.22) * FX.w, y: fresh ? rnd(0.1, 1) * FX.h : FX.h * 1.02, r: rnd(0.6, 1.8), vy: rnd(4, 12), sway: rnd(0, TAU), a: rnd(0.2, 0.55) }; },
      step(p, dt) { p.sway += dt * 0.7; p.y -= p.vy * dt; p.x += Math.sin(p.sway) * 6 * dt; return p.y > FX.h * 0.08; },
      draw(c, p) {
        // poussière : visible seulement dans le faisceau du projecteur
        const k = 1 - Math.min(1, Math.abs(p.x - FX.w / 2) / (FX.w * (0.06 + 0.2 * p.y / FX.h)));
        if (k <= 0) return;
        c.globalAlpha = p.a * k; c.fillStyle = '#ffe6b0'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
      },
      bg(c, t) {
        const W = FX.w, H = FX.h;
        c.globalAlpha = 1;
        // projecteur
        const top = H * 0.07, sw = W * 0.05, bw = W * 0.26;
        const g = c.createLinearGradient(0, top, 0, H);
        g.addColorStop(0, `rgba(255,214,140,${0.16 + 0.015 * Math.sin(t * 1.3)})`); g.addColorStop(1, 'rgba(255,214,140,0.02)');
        c.fillStyle = g; c.beginPath(); c.moveTo(W / 2 - sw, top); c.lineTo(W / 2 + sw, top); c.lineTo(W / 2 + bw, H); c.lineTo(W / 2 - bw, H); c.closePath(); c.fill();
        const fl = c.createRadialGradient(W / 2, H * 0.97, 0, W / 2, H * 0.97, bw * 1.1);
        fl.addColorStop(0, 'rgba(255,214,140,.14)'); fl.addColorStop(1, 'rgba(255,214,140,0)');
        c.fillStyle = fl; c.fillRect(0, 0, W, H);
        // planches de la scène
        const st = c.createLinearGradient(0, H * 0.9, 0, H);
        st.addColorStop(0, 'rgba(90,52,28,0)'); st.addColorStop(1, 'rgba(90,52,28,.35)');
        c.fillStyle = st; c.fillRect(0, H * 0.9, W, H * 0.1);
        // pantins
        const P = FX.extra.puppets || (FX.extra.puppets = [[0.2, 0.3, 1, 0], [0.5, 0.36, 1.25, 2.1], [0.8, 0.28, 0.95, 4.2]]);
        for (const [fx, fl2, sc, ph] of P) puppet(c, W * fx, H * 0.075, H * fl2, Math.max(0.8, Math.min(1.6, H / 700)) * sc, t, ph);
        // rideaux et lambrequin
        curtain(c, t, false); curtain(c, t, true);
        const vh = H * 0.075;
        const vg = c.createLinearGradient(0, 0, 0, vh);
        vg.addColorStop(0, '#3a0808'); vg.addColorStop(1, '#6e1414');
        c.globalAlpha = 0.92; c.fillStyle = vg; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, vh * 0.7);
        const n = Math.max(6, Math.round(W / 140));
        for (let i = n; i >= 0; i--) { const x = (i / n) * W; c.quadraticCurveTo(x + W / n / 2, vh * 1.25, x, vh * 0.7); }
        c.closePath(); c.fill();
        c.globalAlpha = 0.8; c.strokeStyle = '#d9a640'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, vh * 0.7);
        for (let i = 0; i < n; i++) { const x = (i / n) * W; c.quadraticCurveTo(x + W / n / 2, vh * 1.25, x + W / n, vh * 0.7); }
        c.stroke();
        c.globalAlpha = 1;
      },
    },
    hantee: {
      n: 9,
      make() { return { x: rnd(0.05, 0.95) * FX.w, y: rnd(0.12, 0.92) * FX.h, s: rnd(0.6, 1.3), life: rnd(5, 10), age: rnd(-6, 0), col: Math.random() < 0.75 ? '125,255,106' : '255,59,59', bl: rnd(1.5, 4) }; },
      step(p, dt) { p.age += dt; return p.age < p.life; },
      draw(c, p) {
        if (p.age < 0) return;
        const t = p.age, fade = Math.min(1, t / 1.2, (p.life - t) / 1.2);
        const ph = (t % p.bl) / p.bl; const open = ph > 0.92 ? Math.abs(Math.cos((ph - 0.92) / 0.08 * Math.PI)) : 1;
        const w = 18 * p.s, hh = 7 * p.s * open, gap = 26 * p.s;
        c.save(); c.globalAlpha = Math.max(0, fade) * 0.9;
        for (const dx of [-gap / 2, gap / 2]) {
          const x = p.x + dx, y = p.y;
          const g = c.createRadialGradient(x, y, 0, x, y, w * 1.6); g.addColorStop(0, `rgba(${p.col},.35)`); g.addColorStop(1, `rgba(${p.col},0)`);
          c.fillStyle = g; c.beginPath(); c.arc(x, y, w * 1.6, 0, TAU); c.fill();
          c.beginPath(); c.moveTo(x - w / 2, y); c.quadraticCurveTo(x, y - hh * 1.6, x + w / 2, y); c.quadraticCurveTo(x, y + hh * 1.6, x - w / 2, y); c.closePath();
          c.fillStyle = `rgba(${p.col},.95)`; c.fill();
          c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y, 1.6 * p.s, Math.max(0.3, hh * 0.9), 0, 0, TAU); c.fill();
        }
        c.restore();
      },
      bg(c, t) {
        for (let i = 0; i < 3; i++) {
          const x = ((t * (8 + i * 4)) % (FX.w * 1.6)) - FX.w * 0.3, y = FX.h * (0.65 + i * 0.12);
          const g = c.createRadialGradient(x, y, 0, x, y, FX.w * 0.35); g.addColorStop(0, 'rgba(170,200,180,.08)'); g.addColorStop(1, 'rgba(170,200,180,0)');
          c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h);
        }
      },
    },
    tenebres: {
      n: 34,
      make(fresh) { return { x: rnd(0, FX.w), y: fresh ? rnd(0, FX.h) : FX.h + 10, r: rnd(1, 2.6), vy: rnd(10, 30), sway: rnd(0, TAU), life: rnd(6, 12), age: 0 }; },
      step(p, dt) { p.age += dt; p.sway += dt; p.y -= p.vy * dt; p.x += Math.sin(p.sway) * 8 * dt; return p.age < p.life && p.y > -10; },
      draw(c, p) { const a = Math.min(1, p.age, (p.life - p.age)) * 0.7; c.globalAlpha = Math.max(0, a); c.fillStyle = '#ff2a2a'; c.shadowColor = '#ff0000'; c.shadowBlur = 8; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.shadowBlur = 0; },
      bg(c, t) { const g = c.createRadialGradient(FX.w / 2, FX.h * 1.1, 0, FX.w / 2, FX.h * 1.1, FX.h); g.addColorStop(0, `rgba(120,0,0,${0.18 + 0.04 * Math.sin(t)})`); g.addColorStop(1, 'rgba(120,0,0,0)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h); },
    },
    abime: {
      n: 50,
      make() { return { x: rnd(0, FX.w), y: rnd(0, FX.h), r: rnd(0.5, 1.6), vx: rnd(-4, 4), vy: rnd(-6, -1), tw: rnd(0, TAU) }; },
      step(p, dt) { p.tw += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y < -5) { p.y = FX.h + 5; p.x = rnd(0, FX.w); } return true; },
      draw(c, p) { c.globalAlpha = 0.25 + 0.3 * (1 + Math.sin(p.tw)) / 2; c.fillStyle = '#9d7bff'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); },
      bg(c) { const g = c.createRadialGradient(FX.w / 2, FX.h / 2, Math.min(FX.w, FX.h) * 0.2, FX.w / 2, FX.h / 2, Math.max(FX.w, FX.h) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, FX.w, FX.h); },
    },
  };

  // ----- Pantins : rideau et marionnette -----
  function curtain(c, t, right) {
    const W = FX.w, H = FX.h, cw = Math.max(50, W * 0.075);
    c.save();
    if (right) { c.translate(W, 0); c.scale(-1, 1); }
    const folds = 5, wave = Math.sin(t * 0.6) * 4;
    const g = c.createLinearGradient(0, 0, cw, 0);
    for (let i = 0; i <= folds; i++) { g.addColorStop(i / folds, i % 2 ? '#7a1616' : '#3c0707'); }
    c.globalAlpha = 0.9; c.fillStyle = g;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(cw, 0);
    c.bezierCurveTo(cw + wave, H * 0.35, cw * 0.45 + wave, H * 0.55, cw * 0.55, H * 0.66); // embrasse
    c.bezierCurveTo(cw * 0.8, H * 0.8, cw * 0.95 + wave, H * 0.92, cw * 1.05, H);
    c.lineTo(0, H); c.closePath(); c.fill();
    c.globalAlpha = 0.9; c.strokeStyle = '#d9a640'; c.lineWidth = 3; c.beginPath(); c.moveTo(cw * 0.15, H * 0.64); c.quadraticCurveTo(cw * 0.45, H * 0.69, cw * 0.62, H * 0.655); c.stroke();
    c.restore();
  }
  function puppet(c, x0, y0, L, s, t, ph) {
    const sway = 0.1 * Math.sin(t * 0.9 + ph) + 0.03 * Math.sin(t * 2.1 + ph * 2);
    const cx = x0 + Math.sin(t * 0.7 + ph) * 10 * s, cy = y0 + 6 * s, rot = 0.22 * Math.sin(t * 0.9 + ph + 0.5);
    const nx = cx + Math.sin(sway) * L, ny = cy + Math.cos(sway) * L;
    const bodyR = -sway * 0.7;
    const Wp = (px, py) => [nx + px * Math.cos(bodyR) - py * Math.sin(bodyR), ny + px * Math.sin(bodyR) + py * Math.cos(bodyR)];
    const arm = (side) => { const a = side * (0.3 + 0.22 * Math.sin(t * 1.7 + ph + side)); const sx = side * 8 * s, sy = 3 * s;
      const ex = sx + Math.sin(a) * 12 * s, ey = sy + Math.cos(a) * 12 * s; const b = a * 0.4 + side * 0.15 * Math.sin(t * 2.3 + ph);
      return [[sx, sy], [ex, ey], [ex + Math.sin(b) * 11 * s, ey + Math.cos(b) * 11 * s]]; };
    const leg = (side) => { const a = side * 0.06 + 0.16 * Math.sin(t * 1.3 + ph + (side > 0 ? 0 : Math.PI)); const hx = side * 4.5 * s, hy = 26 * s;
      const kx = hx + Math.sin(a) * 13 * s, ky = hy + Math.cos(a) * 13 * s; const b = a * 0.3 - 0.1;
      return [[hx, hy], [kx, ky], [kx + Math.sin(b) * 13 * s, ky + Math.cos(b) * 13 * s]]; };
    const A = [arm(-1), arm(1)], Lg = [leg(-1), leg(1)];
    // croix de manipulation
    const cr = (dx, dy) => [cx + dx * Math.cos(rot) - dy * Math.sin(rot), cy + dx * Math.sin(rot) + dy * Math.cos(rot)];
    const ends = [cr(-22 * s, 0), cr(22 * s, 0), cr(0, -10 * s), cr(0, 14 * s)];
    c.globalAlpha = 0.85; c.strokeStyle = '#6b4424'; c.lineWidth = 4 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(...ends[0]); c.lineTo(...ends[1]); c.moveTo(...ends[2]); c.lineTo(...ends[3]); c.stroke();
    // fils
    c.globalAlpha = 0.4; c.strokeStyle = '#f3e3c0'; c.lineWidth = 0.8;
    const head = Wp(0, -12 * s);
    c.beginPath();
    c.moveTo(...ends[2]); c.lineTo(...head);
    c.moveTo(...ends[0]); c.lineTo(...Wp(...A[0][2]));
    c.moveTo(...ends[1]); c.lineTo(...Wp(...A[1][2]));
    c.moveTo(...ends[3]); c.lineTo(...Wp(...Lg[0][1])); c.moveTo(...ends[3]); c.lineTo(...Wp(...Lg[1][1]));
    c.stroke();
    // corps en bois
    c.save(); c.translate(nx, ny); c.rotate(bodyR); c.globalAlpha = 0.9;
    const wood = '#c9965c', dark = '#7a5230';
    c.lineCap = 'round';
    for (const seg of [...Lg, ...A]) { c.strokeStyle = wood; c.lineWidth = 4.6 * s; c.beginPath(); c.moveTo(...seg[0]); c.lineTo(...seg[1]); c.lineTo(...seg[2]); c.stroke();
      c.fillStyle = dark; for (const j of seg) { c.beginPath(); c.arc(j[0], j[1], 2.4 * s, 0, TAU); c.fill(); } }
    c.fillStyle = wood; c.strokeStyle = dark; c.lineWidth = 1.2 * s;
    c.beginPath(); c.moveTo(-8 * s, 0); c.lineTo(8 * s, 0); c.lineTo(6 * s, 26 * s); c.lineTo(-6 * s, 26 * s); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-5 * s, 9 * s); c.lineTo(5 * s, 9 * s); c.stroke(); // ceinture
    c.beginPath(); c.arc(0, -12 * s, 9.5 * s, 0, TAU); c.fill(); c.stroke();
    // visage : deux yeux cousus et un sourire en fil
    c.strokeStyle = '#2a1608'; c.lineWidth = 1.3 * s;
    for (const ex of [-3.5, 3.5]) { c.beginPath(); c.moveTo((ex - 1.6) * s, -14.5 * s); c.lineTo((ex + 1.6) * s, -12 * s); c.moveTo((ex + 1.6) * s, -14.5 * s); c.lineTo((ex - 1.6) * s, -12 * s); c.stroke(); }
    c.beginPath(); c.arc(0, -10.5 * s, 4 * s, 0.2, Math.PI - 0.2); c.stroke();
    c.restore();
  }
  // Un éclair : une ligne brisée du haut vers le bas.
  function bolt() { const pts = []; let x = rnd(FX.w * 0.2, FX.w * 0.9), y = 0; while (y < FX.h * rnd(0.45, 0.8)) { pts.push([x, y]); x += rnd(-40, 40); y += rnd(20, 50); } return pts; }
  // Une branche de cerisier en fleurs, dessinée une fois sur une toile à part (coin en haut à gauche).
  function branch() {
    const cv = document.createElement('canvas'); cv.width = FX.w; cv.height = FX.h;
    const c = cv.getContext('2d');
    const s = Math.min(FX.w, FX.h) / 900;
    c.strokeStyle = 'rgba(62,30,38,.45)'; c.lineCap = 'round';
    const limb = (x, y, an, len, w, depth) => {
      if (depth > 4 || len < 14) return;
      const x2 = x + Math.cos(an) * len, y2 = y + Math.sin(an) * len;
      c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + x2) / 2 + Math.sin(an) * 12, (y + y2) / 2 - Math.cos(an) * 12, x2, y2); c.stroke();
      for (let i = 0; i < (depth > 1 ? 4 : 1); i++) {
        const fx = x + (x2 - x) * (0.4 + i * 0.18) + rnd(-8, 8), fy = y + (y2 - y) * (0.4 + i * 0.18) + rnd(-8, 8);
        for (let k = 0; k < 5; k++) { const a = k * TAU / 5, r = 5 * s + 3; c.fillStyle = `rgba(255,${180 + Math.floor(Math.random() * 40)},${205 + Math.floor(Math.random() * 30)},.4)`; c.beginPath(); c.ellipse(fx + Math.cos(a) * r, fy + Math.sin(a) * r, r, r * 0.7, a, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(255,240,200,.6)'; c.beginPath(); c.arc(fx, fy, 2, 0, TAU); c.fill();
      }
      limb(x2, y2, an + rnd(0.2, 0.6), len * 0.72, w * 0.68, depth + 1);
      limb(x2, y2, an - rnd(0.1, 0.5), len * 0.66, w * 0.68, depth + 1);
    };
    limb(FX.w + 20, 40 * s, Math.PI - 0.35, 230 * s, 9 * s + 2, 0);
    return cv;
  }

  // ---------- Boucle ----------
  function size() {
    if (!FX.cv) return;
    const w = window.innerWidth, h = window.innerHeight;
    FX.cv.width = w; FX.cv.height = h; FX.w = w; FX.h = h;
    if (FX.scene) restart();
  }
  function restart() {
    const sc = FX.scene;
    FX.extra = {};
    if (sc.setup) sc.setup();
    const n = Math.round((sc.n || 0) * FX.level * (window.FIRE_MOBILE ? 0.5 : 1));
    FX.parts = sc.make ? Array.from({ length: n }, () => sc.make(true)) : [];
  }
  function frame(now) {
    FX.raf = 0;
    if (!FX.on || FX.paused) return;
    const dt = Math.min(0.1, (now - (FX.last || now)) / 1000);
    if (now - FX.last < 31) { FX.raf = requestAnimationFrame(frame); return; } // 30 images/s au plus
    FX.last = now;
    const t = (now - FX.t0) / 1000;
    const c = FX.ctx, sc = FX.scene;
    c.clearRect(0, 0, FX.w, FX.h);
    c.save();
    if (sc.bg) sc.bg(c, t, dt);
    if (sc.make) {
      const keep = [];
      for (const p of FX.parts) { if (sc.step(p, dt, t)) keep.push(p); }
      const n = Math.round((sc.n || 0) * FX.level * (window.FIRE_MOBILE ? 0.5 : 1));
      while (keep.length < n) keep.push(sc.make(false));
      FX.parts = keep;
      for (const p of FX.parts) sc.draw(c, p, t);
    }
    c.restore();
    FX.raf = requestAnimationFrame(frame);
  }
  function kick() { if (FX.on && !FX.paused && !FX.raf) { FX.last = 0; FX.raf = requestAnimationFrame(frame); } }

  window.FireFX = {
    scenes: Object.keys(SCENES),
    // theme : identifiant du thème ; level : 0 (coupé), 0.5 (léger), 1 (normal), 1.6 (beaucoup).
    set(theme, level) {
      const sc = SCENES[theme];
      const on = !!sc && level > 0;
      if (!on) {
        FX.on = false; FX.theme = '';
        if (FX.raf) cancelAnimationFrame(FX.raf); FX.raf = 0;
        if (FX.cv) { FX.cv.remove(); FX.cv = null; }
        return;
      }
      if (!FX.cv) {
        FX.cv = document.createElement('canvas'); FX.cv.id = 'fire-fx'; FX.cv.setAttribute('aria-hidden', 'true');
        document.body.prepend(FX.cv); FX.ctx = FX.cv.getContext('2d');
        window.addEventListener('resize', () => { clearTimeout(FX.rz); FX.rz = setTimeout(size, 200); });
        document.addEventListener('visibilitychange', () => { FX.hidden = document.hidden; FireFX.pause(FX.userPause); });
      }
      const changed = FX.theme !== theme || FX.level !== level;
      FX.on = true; FX.theme = theme; FX.level = level; FX.scene = sc; FX.t0 = FX.t0 || performance.now();
      if (!FX.w) size(); else if (changed) restart();
      kick();
    },
    // En pause (partie en cours, FIRE caché) : la toile garde sa dernière image, rien ne tourne.
    pause(on) { FX.userPause = !!on; FX.paused = FX.userPause || !!FX.hidden; if (!FX.paused) kick(); },
  };
}());
