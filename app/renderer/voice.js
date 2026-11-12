// FIRE LoL - salon vocal de l'équipe, avec caméra et partage d'écran.
// Voix et images passent directement d'un PC à l'autre (WebRTC, chiffré), sans serveur à nous.
// Le serveur public PeerJS sert seulement à se trouver : chaque membre a une adresse dérivée du nom
// du salon et de son pseudo.
//
// Le micro passe par une petite chaîne Web Audio (filtre, gain, porte de bruit) avant d'être envoyé :
// on peut changer de micro ou de réglage en plein appel sans couper les autres.
(function () {
  'use strict';
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }];
  const CFG_KEY = 'fire.vocal.cfg', VOL_KEY = 'fire.vocal.vols', LMUTE_KEY = 'fire.vocal.lmute';
  const DEF = { mic: '', out: '', cam: '', ns: true, ai: true, vad: 'auto', recvQ: 'auto', streamSound: true, duck: true, duckAmt: 0.5, ec: true, agc: true, hp: true, gain: 1, gate: 20, outVol: 1, sounds: true, screenFps: 15 };
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* plein */ } };

  const V = {
    on: false, joining: false, err: '', me: null, prefix: '', ids: [], peer: null,
    cfg: (() => { const c = Object.assign({}, DEF, rd(CFG_KEY, {})); if (!c.vad) { c.vad = 'auto'; c.gate = 20; } return c; })(), vols: rd(VOL_KEY, {}), lmute: rd(LMUTE_KEY, {}),
    mute: false, deaf: false, monitor: false, level: 0, gateOpen: false, gateUntil: 0,
    conns: {}, vout: {}, vin: {}, cam: null, screen: null, speaking: {}, listeners: [],
    ctx: null, g: null, raw: null, rawSrc: null, timer: null, probe: null
  };
  const emit = () => V.listeners.forEach((f) => { try { f(); } catch (e) { /* vue */ } });

  async function sha(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  const pid = (slug) => V.prefix + slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  const slugOf = (id) => V.ids.find((s) => pid(s) === id) || null;

  // ---------- Audio ----------
  // Chaîne du micro : [suppression du bruit par IA (RNNoise)] → filtre anti-souffle → volume → (analyse)
  //                    → petit retard de 80 ms → porte de bruit → envoi.
  // Le retard laisse le temps de reconnaître une voix avant d'ouvrir la porte : le début des phrases n'est pas coupé,
  // et un clic de clavier (trop court pour être une voix) ne l'ouvre pas.
  function audioCtx() {
    if (!V.ctx) {
      let c;
      try { c = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' }); } catch (e) { c = new AudioContext(); }
      V.ctx = c;
      const g = V.g = {};
      g.master = c.createGain(); g.master.gain.value = V.cfg.outVol; g.master.connect(c.destination);
      g.hp = c.createBiquadFilter(); g.hp.type = 'highpass'; g.hp.frequency.value = V.cfg.hp ? 90 : 1;
      g.inGain = c.createGain(); g.inGain.gain.value = V.cfg.gain;
      g.delay = c.createDelay(0.5); g.delay.delayTime.value = V.cfg.vad === 'off' ? 0 : 0.08;
      g.gate = c.createGain(); g.gate.gain.value = 0;
      g.an = c.createAnalyser(); g.an.fftSize = 1024; g.an.smoothingTimeConstant = 0;
      g.td = new Float32Array(1024); g.fd = new Float32Array(512);
      g.send = c.createMediaStreamDestination();
      g.hp.connect(g.inGain); g.inGain.connect(g.an); g.inGain.connect(g.delay); g.delay.connect(g.gate); g.gate.connect(g.send);
      if (V.cfg.out && c.setSinkId) c.setSinkId(V.cfg.out).catch(() => {});
      loadAi();
    }
    if (V.ctx.state === 'suspended') V.ctx.resume().catch(() => {});
    return V.ctx;
  }
  function blip(up) {
    if (!V.cfg.sounds) return;
    try {
      const c = audioCtx(); const o = c.createOscillator(); const g = c.createGain();
      o.frequency.setValueAtTime(up ? 520 : 660, c.currentTime); o.frequency.linearRampToValueAtTime(up ? 780 : 440, c.currentTime + 0.14);
      g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
      o.connect(g); g.connect(V.g.master); o.start(); o.stop(c.currentTime + 0.25);
    } catch (e) { /* pas de son */ }
  }
  // Petit signal sonore quand on change un réglage au clavier (utile en pleine partie, sans regarder FIRE).
  function cue(on) {
    try {
      const c = audioCtx();
      [0, 0.09].forEach((d, k) => {
        const o = c.createOscillator(); const g = c.createGain(); const t = c.currentTime + d;
        o.frequency.value = on ? (k ? 880 : 660) : (k ? 440 : 600);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        o.connect(g); g.connect(V.g.master); o.start(t); o.stop(t + 0.1);
      });
    } catch (e) { /* pas de son */ }
  }
  function meter(stream) {
    const c = audioCtx(); const src = c.createMediaStreamSource(stream); const an = c.createAnalyser();
    an.fftSize = 512; src.connect(an); const buf = new Uint8Array(512);
    return () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); return m; };
  }
  // (Re)branche le micro. Le flux envoyé aux autres ne change pas : pas besoin de les rappeler.
  async function openMic() {
    audioCtx();
    const c = V.cfg;
    const raw = await navigator.mediaDevices.getUserMedia({ video: false, audio: {
      deviceId: c.mic ? { exact: c.mic } : undefined, echoCancellation: c.ec, noiseSuppression: c.ns, autoGainControl: c.agc, channelCount: 1 } });
    if (V.rawSrc) { try { V.rawSrc.disconnect(); } catch (e) { /* */ } }
    if (V.raw) V.raw.getTracks().forEach((t) => t.stop());
    V.raw = raw; V.rawSrc = V.ctx.createMediaStreamSource(raw);
    wireMic();
  }
  // ---------- Suppression du bruit par IA (RNNoise, comme dans Jitsi) : efface clavier, souris, ventilateur ----------
  const AI = { ready: false, loading: null, node: null, wasm: null };
  function xhrBuf(url) {
    return new Promise((ok, ko) => { const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer'; x.onload = () => (x.status === 0 || x.status === 200 ? ok(x.response) : ko(new Error('HTTP ' + x.status))); x.onerror = () => ko(new Error('chargement')); x.send(); });
  }
  function loadAi() {
    if (AI.loading || !V.ctx || !V.ctx.audioWorklet) return AI.loading;
    const simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
    AI.loading = Promise.all([xhrBuf(simd ? 'vendor/rnnoise_simd.wasm' : 'vendor/rnnoise.wasm'), V.ctx.audioWorklet.addModule('vendor/rnnoise-worklet.js')])
      .then(([wasm]) => { AI.wasm = wasm; AI.ready = true; wireMic(); })
      .catch(() => { AI.ready = false; });
    return AI.loading;
  }
  // Branche le micro sur la chaîne, avec ou sans l'IA selon le réglage.
  function wireMic() {
    if (!V.rawSrc || !V.g) return;
    try { V.rawSrc.disconnect(); } catch (e) { /* */ }
    if (AI.node) { try { AI.node.disconnect(); AI.node.port.postMessage('destroy'); } catch (e) { /* */ } AI.node = null; }
    if (V.cfg.ai && AI.ready && V.ctx.sampleRate === 48000) {
      try {
        AI.node = new AudioWorkletNode(V.ctx, '@sapphi-red/web-noise-suppressor/rnnoise', { processorOptions: { maxChannels: 1, wasmBinary: AI.wasm.slice(0) } });
        V.rawSrc.connect(AI.node); AI.node.connect(V.g.hp); return;
      } catch (e) { AI.node = null; }
    }
    V.rawSrc.connect(V.g.hp);
  }
  function closeMic() {
    if (V.rawSrc) { try { V.rawSrc.disconnect(); } catch (e) { /* */ } }
    if (AI.node) { try { AI.node.disconnect(); AI.node.port.postMessage('destroy'); } catch (e) { /* */ } AI.node = null; }
    if (V.raw) V.raw.getTracks().forEach((t) => t.stop());
    V.raw = V.rawSrc = null;
  }
  function remoteGain(slug) { return V.deaf || V.lmute[slug] ? 0 : Math.min(1, (V.vols[slug] ?? 1) * (V.cfg.outVol ?? 1)); }
  // Les voix des autres sont jouées par un élément audio (et non par Web Audio) : c'est ce son-là que
  // l'annulation d'écho de Windows/Chrome connaît et retire de ton micro. Sinon, avec des haut-parleurs
  // ou un casque fort, ton micro renvoie leurs voix et ils s'entendent en écho.
  function sinkOf(el) { if (V.cfg.out && el.setSinkId) el.setSinkId(V.cfg.out).catch(() => {}); }
  function playRemote(slug, stream) {
    audioCtx();
    const el = new Audio(); el.autoplay = true; el.srcObject = stream; el.volume = remoteGain(slug); sinkOf(el); el.play().catch(() => {});
    return { el, level: meter(stream) };
  }
  function applyGains() { for (const [s, k] of Object.entries(V.conns)) if (k.out) k.out.el.volume = remoteGain(s); }

  // Porte de bruit, niveau du micro et pastilles « parle » : toutes les 50 ms.
  // Détection de la voix, toutes les 20 ms :
  // - niveau RMS (énergie réelle, pas le pic : un clic de clavier a un gros pic mais peu d'énergie) ;
  // - part de l'énergie dans les fréquences de la voix (250-3500 Hz) : le clavier est surtout dans les aigus ;
  // - il faut 3 mesures de suite (60 ms) pour ouvrir : un clic dure moins longtemps qu'une syllabe ;
  // - en automatique, le seuil suit le bruit de fond de la pièce.
  const VAD = { run: 0, nf: -70 };
  function tick() {
    if (!V.g || !V.raw) return;
    const g = V.g, c = V.cfg;
    g.an.getFloatTimeDomainData(g.td);
    let sq = 0; for (const x of g.td) sq += x * x;
    const db = 10 * Math.log10(sq / g.td.length + 1e-12);
    V.level = Math.max(0, Math.min(128, (db + 60) / 60 * 128));
    g.an.getFloatFrequencyData(g.fd);
    const hz = V.ctx.sampleRate / g.an.fftSize;
    let voice = 0, all = 0;
    for (let i = 1; i < g.fd.length; i++) { const f = i * hz; if (f < 100 || f > 12000) continue; const p = Math.pow(10, g.fd[i] / 10); all += p; if (f >= 250 && f <= 3500) voice += p; }
    const ratio = all > 0 ? voice / all : 0;
    // Bruit de fond : descend vite vers les moments calmes, remonte très lentement.
    if (db < VAD.nf) VAD.nf = VAD.nf * 0.7 + db * 0.3; else VAD.nf = Math.min(db, VAD.nf + 0.04);
    const now = performance.now();
    let speech;
    if (c.vad === 'manual') speech = db > -60 + (c.gate || 0) && ratio > 0.45;
    else speech = db > Math.max(VAD.nf + 11, -58) && ratio > 0.55;
    VAD.run = speech ? VAD.run + 1 : 0;
    if (c.vad === 'off') V.gateOpen = true;
    else { if (VAD.run >= 3) V.gateUntil = now + 450; V.gateOpen = now < V.gateUntil; }
    const target = V.mute ? 0 : V.gateOpen ? 1 : 0;
    g.gate.gain.setTargetAtTime(target, V.ctx.currentTime, target ? 0.004 : 0.05);
    let ch = false;
    const set = (k, v) => { if (!!V.speaking[k] !== v) { V.speaking[k] = v; ch = true; } };
    if (V.on) {
      set(V.me, !V.mute && V.gateOpen && V.level > 25);
      for (const [s, k] of Object.entries(V.conns)) set(s, !!(k.out && !V.lmute[s] && k.out.level() > 9));
    }
    duckTick();
    if (ch) emit();
  }
  function startTick() { if (!V.timer) V.timer = setInterval(tick, 20); }

  // ---------- Contrôle (micro coupé, caméra, écran…) : un petit canal de données par membre ----------
  function myState() { return { t: 'st', mute: V.mute, deaf: V.deaf, cam: !!V.cam, screen: !!V.screen, q: V.cfg.recvQ || 'auto' }; }
  function broadcast() { for (const k of Object.values(V.conns)) if (k.ctl && k.ctl.open) { try { k.ctl.send(myState()); } catch (e) { /* */ } } }
  function bindCtl(slug, dc) {
    const k = V.conns[slug];
    if (!k) { try { dc.close(); } catch (e) { /* */ } return; }
    if (k.ctl && k.ctl !== dc) { try { k.ctl.close(); } catch (e) { /* */ } }
    k.ctl = dc;
    dc.on('open', () => { try { dc.send(myState()); } catch (e) { /* */ } });
    dc.on('data', (msg) => {
      // Un spectateur demande le son de mon partage d'écran : c'est moi qui décide (fenêtre de confirmation).
      if (msg && msg.t === 'snd?' && V.screen && V.onSndReq) { V.onSndReq(slug); return; }
      // Un spectateur qui avait arrêté de regarder veut revoir mon écran : on lui renvoie le flux.
      if (msg && msg.t === 'resend' && V.screen) { closeVout(slug, 'screen'); setTimeout(() => sendVideo(slug, 'screen'), 300); return; }
      const kk = V.conns[slug]; if (!kk || !msg || msg.t !== 'st') return;
      const qBefore = kk.remote && kk.remote.q;
      kk.remote = { mute: !!msg.mute, deaf: !!msg.deaf, cam: !!msg.cam, screen: !!msg.screen, q: ['auto', 'high', 'medium', 'low'].includes(msg.q) ? msg.q : 'auto' };
      if (kk.remote.q !== qBefore) { retune('screen'); retune('cam'); }
      if (!msg.cam) closeVin(slug, 'cam');
      if (!msg.screen) closeVin(slug, 'screen');
      emit();
    });
    dc.on('close', () => { const kk = V.conns[slug]; if (kk && kk.ctl === dc) kk.ctl = null; });
  }

  // ---------- Vidéo : un appel à part par flux (caméra, écran), lancé par celui qui montre ----------
  function closeVin(slug, kind) {
    const key = slug + ':' + kind; const v = V.vin[key]; if (!v) return;
    dropSnd(v); delete V.vin[key]; try { v.call.close(); } catch (e) { /* */ } emit();
  }
  // Son des streams : chacun choisit s'il l'entend (réglage par défaut) et son volume, stream par stream.
  const SV_KEY = 'fire.vocal.svol';
  V.svol = rd(SV_KEY, {});
  function streamGain(key) {
    const slug = key.split(':')[0];
    const o = V.svol[slug] || {};
    const on = o.on == null ? V.cfg.streamSound !== false : o.on;
    return V.deaf || !on ? 0 : (o.vol ?? 0.8) * (V.duckF || 1);
  }
  // Atténuation : quand quelqu'un parle dans le salon, le son des streams baisse (réglable), puis remonte doucement.
  V.duckF = 1;
  function duckTick() {
    const talking = V.cfg.duck !== false && Object.values(V.speaking).some(Boolean);
    const target = talking ? 1 - Math.max(0, Math.min(1, V.cfg.duckAmt ?? 0.5)) : 1;
    if (Math.abs(target - V.duckF) < 0.01) return;
    // Descente rapide quand quelqu'un parle, remontée douce ensuite.
    V.duckF = target < V.duckF ? Math.max(target, V.duckF - 0.25) : Math.min(target, V.duckF + 0.04);
    applyStreamGains();
  }
  // Arrêter de regarder un stream (on ne le reçoit plus du tout) ou le regarder de nouveau.
  V.unwatch = {};
  function watchStream(slug, on) {
    if (on) {
      delete V.unwatch[slug];
      const k = V.conns[slug];
      if (k && k.ctl && k.ctl.open) { try { k.ctl.send({ t: 'resend' }); } catch (e) { /* */ } }
    } else { V.unwatch[slug] = true; closeVin(slug, 'screen'); }
    emit();
  }
  function dropSnd(v) { if (v && v.snd) { try { v.snd.el.pause(); v.snd.el.srcObject = null; } catch (e) { /* */ } v.snd = null; } }
  function applyStreamGains() { for (const [k, v] of Object.entries(V.vin)) if (v.snd) v.snd.el.volume = Math.min(1, streamGain(k)); }
  // Demander le son du stream à celui qui partage (il doit accepter).
  function requestSound(slug) {
    const k = V.conns[slug];
    if (!k || !k.ctl || !k.ctl.open) return false;
    try { k.ctl.send({ t: 'snd?' }); return true; } catch (e) { return false; }
  }
  // Ajoute le son du PC à mon partage en cours : on relance la capture du même écran, avec le son.
  async function addScreenSound() {
    if (!V.screen || V.screen.getAudioTracks().length) return;
    const src = V.screenSrc;
    stopScreen();
    await new Promise((r) => setTimeout(r, 300));
    await startScreen(src, true);
  }
  function setStreamSound(slug, patch) { V.svol[slug] = Object.assign({}, V.svol[slug] || {}, patch); wr(SV_KEY, V.svol); applyStreamGains(); emit(); }
  function closeVout(slug, kind) {
    for (const key of Object.keys(V.vout)) {
      const [s, k] = key.split(':');
      if ((slug == null || s === slug) && (kind == null || k === kind)) { try { V.vout[key].close(); } catch (e) { /* */ } delete V.vout[key]; }
    }
    retune('cam'); retune('screen');
  }
  // Réglage de l'envoi vidéo, recalculé quand le nombre de spectateurs change.
  // Chaque spectateur reçoit sa propre copie (et son propre encodage) : à plusieurs, on partage un budget
  // d'envoi et on baisse un peu la définition, sinon la connexion sature et l'image prend du retard et saccade.
  const UP_BUDGET = 9000000;
  // Qualité par spectateur : chacun reçoit sa propre copie, on l'adapte donc à SA connexion.
  // Le spectateur choisit (Haute, Moyenne 720p, Faible connexion 480p) ou laisse en Auto : FIRE mesure alors
  // la connexion vers lui (débit disponible, retard, pertes) et baisse ou remonte la qualité tout seul.
  const QLV = [{ maxH: 4320, rate: Infinity, fps: Infinity }, { maxH: 720, rate: 1800000, fps: 30 }, { maxH: 480, rate: 650000, fps: 20 }];
  const QFIX = { high: 0, medium: 1, low: 2 };
  V.qlvl = {}; V.qbad = {}; V.qgood = {};
  function levelFor(slug) {
    const q = (V.conns[slug] && V.conns[slug].remote && V.conns[slug].remote.q) || 'auto';
    return q in QFIX ? QFIX[q] : (V.qlvl[slug] || 0);
  }
  function videoPlan(kind, slug) {
    const fps = kind === 'cam' ? 24 : (V.cfg.screenFps || 15);
    const viewers = Math.max(1, Object.keys(V.vout).filter((k) => k.endsWith(':' + kind)).length);
    const want = kind === 'cam' ? 450000 : fps >= 120 ? 8000000 : fps >= 60 ? 5000000 : fps >= 30 ? 3000000 : 1800000;
    let rate = Math.max(kind === 'cam' ? 250000 : 1200000, Math.min(want, Math.floor(UP_BUDGET / viewers)));
    let scale = kind === 'cam' ? 1 : viewers >= 4 ? 2 : viewers >= 3 ? 1.5 : 1;
    let mfps = fps;
    const lv = QLV[levelFor(slug)];
    if (kind === 'screen') {
      const tr = V.screen && V.screen.getVideoTracks()[0];
      const srcH = (tr && tr.getSettings && tr.getSettings().height) || 1080;
      if (srcH / scale > lv.maxH) scale = srcH / lv.maxH;
      rate = Math.min(rate, lv.rate); mfps = Math.min(fps, lv.fps);
    } else if (levelFor(slug) >= 2) { rate = 200000; scale = 1.5; }
    // Jeu en direct : on garde la fluidité (images/s) ; texte et replays à 15 images/s : on garde la netteté.
    return { rate, fps: mfps, scale, pref: kind === 'cam' || fps >= 30 ? 'maintain-framerate' : 'maintain-resolution' };
  }
  function tuneSender(call, kind, slug) {
    const pc = call && call.peerConnection; if (!pc || pc.connectionState !== 'connected') return;
    const pl = videoPlan(kind, slug);
    pc.getSenders().forEach((sd) => {
      if (!sd.track || sd.track.kind !== 'video') return;
      const p = sd.getParameters(); p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}];
      p.encodings[0].maxBitrate = pl.rate; p.encodings[0].maxFramerate = pl.fps; p.encodings[0].scaleResolutionDownBy = pl.scale;
      p.degradationPreference = pl.pref;
      sd.setParameters(p).catch(() => {});
    });
  }
  function retune(kind) { for (const [key, call] of Object.entries(V.vout)) if (key.endsWith(':' + kind)) tuneSender(call, kind, key.split(':')[0]); }
  // Mode Auto : toutes les 2 s, on regarde la connexion vers chaque spectateur de notre écran.
  async function adapt() {
    for (const [key, call] of Object.entries(V.vout)) {
      const [slug, kind] = key.split(':');
      if (kind !== 'screen' || !call.peerConnection || levelFor(slug) !== (V.qlvl[slug] || 0)) continue;
      // Les 12 premières secondes, le débit monte en puissance : on ne juge pas encore la connexion.
      if (!call.__t0) call.__t0 = Date.now();
      if (Date.now() - call.__t0 < 12000) continue;
      const q = (V.conns[slug] && V.conns[slug].remote && V.conns[slug].remote.q) || 'auto';
      if (q !== 'auto') continue;
      let avail = 0, rtt = 0, lost = 0, limit = '';
      try {
        const st = await call.peerConnection.getStats();
        st.forEach((x) => {
          if (x.type === 'candidate-pair' && x.nominated && x.state === 'succeeded') { avail = x.availableOutgoingBitrate || avail; rtt = x.currentRoundTripTime || rtt; }
          if (x.type === 'remote-inbound-rtp' && x.kind === 'video') { lost = x.fractionLost || 0; rtt = Math.max(rtt, x.roundTripTime || 0); }
          if (x.type === 'outbound-rtp' && x.kind === 'video') limit = x.qualityLimitationReason || '';
        });
      } catch (e) { continue; }
      const lv = V.qlvl[slug] || 0;
      const plan = videoPlan('screen', slug);
      const bad = (avail && avail < plan.rate * 0.6 && limit === 'bandwidth') || rtt > 0.35 || lost > 0.05;
      const up = QLV[Math.max(0, lv - 1)];
      const good = lv > 0 && avail > Math.min(up.rate === Infinity ? 4000000 : up.rate, 4000000) * 1.5 && rtt < 0.15 && lost < 0.01 && limit !== 'bandwidth';
      V.qbad[slug] = bad ? (V.qbad[slug] || 0) + 1 : 0;
      V.qgood[slug] = good ? (V.qgood[slug] || 0) + 1 : 0;
      if (V.qbad[slug] >= 3 && lv < 2) { V.qlvl[slug] = lv + 1; V.qbad[slug] = 0; tuneSender(call, 'screen', slug); }
      else if (V.qgood[slug] >= 6) { V.qlvl[slug] = lv - 1; V.qgood[slug] = 0; tuneSender(call, 'screen', slug); }
    }
  }
  setInterval(() => { if (V.on && V.screen) adapt(); }, 2000);
  function capBitrate(call, kind) {
    const pc = call.peerConnection; if (!pc) return;
    pc.addEventListener('connectionstatechange', () => { if (pc.connectionState === 'connected') retune(kind); });
  }
  // Encodage matériel : on propose d'abord le H.264 (la carte graphique s'en charge sur presque tous les PC),
  // ce qui évite que le processeur sature et que l'image saccade.
  function preferH264(sdp) {
    try {
      const lines = sdp.split('\r\n');
      const mi = lines.findIndex((l) => l.startsWith('m=video'));
      if (mi < 0) return sdp;
      const h264 = lines.filter((l) => /^a=rtpmap:\d+ H264\/90000/.test(l)).map((l) => l.match(/^a=rtpmap:(\d+)/)[1])
        .filter((pt) => lines.some((l) => l.startsWith('a=fmtp:' + pt + ' ') && /packetization-mode=1/.test(l)));
      if (!h264.length) return sdp;
      const parts = lines[mi].split(' ');
      const head = parts.slice(0, 3), pts = parts.slice(3);
      lines[mi] = head.concat(h264.filter((x) => pts.includes(x)), pts.filter((x) => !h264.includes(x))).join(' ');
      return lines.join('\r\n');
    } catch (e) { return sdp; }
  }
  // Côté spectateur : on demande au navigateur de garder le moins de retard possible avant d'afficher l'image.
  function lowLatency(call) {
    const pc = call && call.peerConnection; if (!pc) return;
    pc.getReceivers().forEach((r) => { try { if ('jitterBufferTarget' in r) r.jitterBufferTarget = 0; if ('playoutDelayHint' in r) r.playoutDelayHint = 0; } catch (e) { /* ancien navigateur */ } });
  }
  function sendVideo(slug, kind) {
    const stream = kind === 'cam' ? V.cam : V.screen;
    const key = slug + ':' + kind;
    if (!stream || V.vout[key] || !V.conns[slug] || !V.conns[slug].out) return;
    const call = V.peer.call(pid(slug), stream, { metadata: { s: V.me, k: kind }, sdpTransform: preferH264 });
    if (!call) return;
    V.vout[key] = call;
    capBitrate(call, kind);
    retune(kind);
    const gone = () => { if (V.vout[key] === call) { delete V.vout[key]; retune(kind); } };
    call.on('close', gone);
    call.on('error', gone);
  }
  function takeVideo(from, kind, call) {
    if (!V.conns[from] || (kind === 'screen' && V.unwatch[from])) { try { call.close(); } catch (e) { /* */ } return; }
    const key = from + ':' + kind;
    if (V.vin[key]) { try { V.vin[key].call.close(); } catch (e) { /* */ } }
    V.vin[key] = { call, stream: null };
    call.answer(undefined, { sdpTransform: preferH264 });
    call.on('stream', (st) => {
      lowLatency(call);
      const vin = V.vin[key];
      if (!vin || vin.call !== call) return;
      vin.stream = st;
      // Son du stream (si celui qui partage a coché « son de mon PC ») : il passe par son propre volume.
      if (st.getAudioTracks().length && !vin.snd) {
        const el = new Audio(); el.autoplay = true; el.srcObject = new MediaStream(st.getAudioTracks()); el.volume = Math.min(1, streamGain(key)); sinkOf(el); el.play().catch(() => {});
        vin.snd = { el };
      }
      emit();
    });
    const done = () => { if (V.vin[key] && V.vin[key].call === call) { dropSnd(V.vin[key]); delete V.vin[key]; emit(); } };
    call.on('close', done); call.on('error', done);
    const pc = call.peerConnection;
    if (pc) pc.addEventListener('iceconnectionstatechange', () => { if (/failed|closed/.test(pc.iceConnectionState)) done(); });
  }
  function shareAll(kind) { for (const [s, k] of Object.entries(V.conns)) if (k.out) sendVideo(s, kind); }

  async function startCam() {
    if (!V.on || V.cam) return;
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
        deviceId: V.cfg.cam ? { exact: V.cfg.cam } : undefined, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } } });
      V.cam = st; st.getVideoTracks().forEach((t) => { t.onended = stopCam; });
      shareAll('cam'); broadcast(); emit();
    } catch (e) { V.err = e && e.name === 'NotAllowedError' ? 'accès à la caméra refusé (Windows › Confidentialité › Caméra)' : e && e.name === 'NotFoundError' ? 'aucune caméra trouvée' : 'caméra indisponible'; emit(); }
  }
  function stopCam() {
    if (!V.cam) return;
    V.cam.getTracks().forEach((t) => t.stop()); V.cam = null;
    closeVout(null, 'cam'); broadcast(); emit();
  }
  // Partage d'écran : l'app choisit l'écran ou la fenêtre (window.fire.screen), puis le navigateur capture.
  async function startScreen(sourceId, withAudio) {
    if (!V.on || V.screen) return;
    try {
      const fs = window.fire && window.fire.screen;
      const audio = !!withAudio && !!fs;
      const fps = V.cfg.screenFps || 15;
      const video = { frameRate: { ideal: fps, max: fps }, width: { max: 1920 }, height: { max: 1080 } };
      // Le son du PC est capté SANS le son de FIRE (voix du salon, sons de l'app, streams regardés) : piste séparée,
      // comme Discord. Windows trop ancien : on retombe sur « tout le son du PC » et on le signale.
      const own = audio && fs.ownAudio ? await fs.ownAudio().catch(() => false) : false;
      const grab = async (restrict) => {
        if (fs && sourceId) await fs.pick(sourceId, audio);
        return navigator.mediaDevices.getDisplayMedia({ audio: audio ? (restrict ? { restrictOwnAudio: true, suppressLocalAudioPlayback: false } : true) : false, video });
      };
      let st;
      try { st = await grab(own); } catch (e) { if (!own || (e && e.name === 'AbortError')) throw e; st = await grab(false); }
      const at = st.getAudioTracks()[0];
      let iso = false;
      try { iso = !!(at && at.getSettings().restrictOwnAudio); } catch (e) { /* ancien moteur */ }
      V.screenMix = !!at && !iso;
      st.getVideoTracks().forEach((t) => { t.contentHint = fps > 20 ? 'motion' : 'detail'; t.onended = stopScreen; });
      V.screen = st; V.screenSrc = sourceId; shareAll('screen'); broadcast(); emit();
    } catch (e) { if (!(e && e.name === 'AbortError')) { V.err = 'partage d’écran impossible'; emit(); } }
  }
  function stopScreen() {
    if (!V.screen) return;
    V.screen.getTracks().forEach((t) => t.stop()); V.screen = null;
    closeVout(null, 'screen'); broadcast(); emit();
  }

  // ---------- Connexions voix ----------
  function drop(slug, sound) {
    const k = V.conns[slug]; if (!k) return;
    delete V.conns[slug]; delete V.speaking[slug];
    try { k.call.close(); } catch (e) { /* déjà fermé */ }
    if (k.ctl) { try { k.ctl.close(); } catch (e) { /* */ } }
    if (k.out) { try { k.out.el.pause(); k.out.el.srcObject = null; } catch (e) { /* */ } }
    closeVout(slug, null); closeVin(slug, 'cam'); closeVin(slug, 'screen');
    if (sound && k.out) blip(false);
    emit();
  }
  function watch(slug, call) {
    const pc = call.peerConnection;
    let lost = null;
    const check = () => {
      if (V.conns[slug] && V.conns[slug].call !== call) return;
      const st = pc && pc.iceConnectionState;
      if (st === 'failed' || st === 'closed') drop(slug, true);
      else if (st === 'disconnected') { clearTimeout(lost); lost = setTimeout(() => { if (pc.iceConnectionState === 'disconnected') drop(slug, true); }, 6000); }
      else if (st === 'connected' || st === 'completed') clearTimeout(lost);
    };
    if (pc) pc.addEventListener('iceconnectionstatechange', check);
    call.on('stream', (st) => {
      const k = V.conns[slug]; if (!k || k.call !== call || k.out) return;
      k.out = playRemote(slug, st); blip(true);
      // Le plus petit pseudo ouvre le canal de contrôle ; on envoie aussi nos vidéos en cours au nouvel arrivant.
      if (V.me < slug && !k.ctl) bindCtl(slug, V.peer.connect(pid(slug), { metadata: { s: V.me, k: 'ctl' }, reliable: true }));
      if (V.cam) sendVideo(slug, 'cam');
      if (V.screen) sendVideo(slug, 'screen');
      emit();
    });
    call.on('close', () => { if (V.conns[slug] && V.conns[slug].call === call) drop(slug, true); });
    call.on('error', () => { if (V.conns[slug] && V.conns[slug].call === call) drop(slug, false); });
  }
  // Deux membres qui arrivent en même temps s'appellent l'un l'autre : on garde l'appel lancé par le plus petit pseudo.
  function keep(slug, call, outgoing) {
    const cur = V.conns[slug];
    if (cur) {
      // Un appel à nous resté sans réponse depuis plus de 4 s est périmé (lancé avant que l'autre soit connecté) : on prend le sien.
      const stale = !cur.out && cur.mine && Date.now() - cur.t > 4000;
      const mineWins = V.me < slug && !stale;
      if (cur.out || (outgoing && !mineWins) || (!outgoing && mineWins)) { try { call.close(); } catch (e) { /* */ } return false; }
      drop(slug, false);
    }
    V.conns[slug] = { call, out: null, mine: outgoing, t: Date.now(), ctl: null, remote: {} };
    watch(slug, call); emit();
    // Membre absent (ou PC injoignable) : pas de voix au bout de 25 s, on libère la place pour réessayer plus tard.
    setTimeout(() => { const k = V.conns[slug]; if (k && k.call === call && !k.out) drop(slug, false); }, 25000);
    return true;
  }
  // Membre pas connecté : le serveur répond tout de suite, on libère sa place pour pouvoir l'accueillir quand il arrive.
  function unavailable(e) {
    const m = String((e && e.message) || '').match(/firelol-[a-f0-9]+-[A-Za-z0-9]+/);
    const s = m && slugOf(m[0]);
    if (s && V.conns[s] && !V.conns[s].out) drop(s, false);
  }
  function ring(slug) {
    if (!V.on || slug === V.me || V.conns[slug]) return;
    const call = V.peer.call(pid(slug), V.g.send.stream, { metadata: { s: V.me, k: 'voice' } });
    if (call) keep(slug, call, true);
  }

  async function join(opts) {
    if (V.on || V.joining) return;
    V.joining = true; V.err = ''; emit();
    try {
      if (!window.Peer) throw new Error('module vocal absent');
      V.me = opts.me; V.ids = [...new Set(opts.ids.concat(opts.me))]; V.room = opts.room || 'equipe';
      V.prefix = 'firelol-' + (await sha('FIRE-vocal:' + opts.code.trim().toUpperCase())).slice(0, 24) + '-';
      if (!V.raw) await openMic();
      startTick();
      // Après un plantage ou une relance rapide, l'ancienne connexion peut garder notre adresse quelques secondes : on réessaie.
      const open = () => new Promise((ok, ko) => {
        const p = new window.Peer(pid(V.me), { debug: 0, config: { iceServers: ICE } });
        const t = setTimeout(() => ko(new Error('serveur de connexion injoignable')), 15000);
        p.on('open', () => { clearTimeout(t); ok(p); });
        p.on('error', (e) => {
          clearTimeout(t);
          if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) { /* */ } ko(new Error('tu es déjà dans le salon depuis un autre PC ou une autre fenêtre')); }
          else if (e.type === 'peer-unavailable') unavailable(e);
          else if (!V.on) ko(new Error(e.type === 'network' || e.type === 'server-error' ? 'serveur de connexion injoignable' : (e.message || e.type)));
        });
      });
      for (let k = 0; ; k++) {
        try { V.peer = await open(); break; } catch (e) {
          if (k >= 4 || !/autre PC/.test(e.message)) throw e;
          await new Promise((r) => setTimeout(r, 4000));
        }
      }
      V.on = true;
      V.peer.on('call', (call) => {
        const from = slugOf(call.peer);
        if (!from || from === V.me) { try { call.close(); } catch (e) { /* */ } return; }
        const kind = call.metadata && call.metadata.k;
        if (kind === 'cam' || kind === 'screen') return takeVideo(from, kind, call);
        if (keep(from, call, false)) call.answer(V.g.send.stream);
      });
      V.peer.on('connection', (dc) => {
        const from = slugOf(dc.peer);
        if (!from || from === V.me) { try { dc.close(); } catch (e) { /* */ } return; }
        bindCtl(from, dc);
      });
      V.peer.on('disconnected', () => { if (V.on) setTimeout(() => { try { if (V.on && V.peer && V.peer.disconnected) V.peer.reconnect(); } catch (e) { /* */ } }, 2000); });
      V.ids.forEach(ring);
      // Toutes les 20 s, on rappelle ceux qui ne sont pas là : un membre qui revient après une coupure est retrouvé.
      V.probe = setInterval(() => V.ids.forEach(ring), 20000);
      blip(true);
      presenceLoop();
    } catch (e) {
      V.err = (e && e.name === 'NotAllowedError') ? 'accès au micro refusé (Windows › Paramètres › Confidentialité › Microphone)' : (e && e.name === 'NotFoundError') ? 'aucun micro trouvé' : (e && e.message) || String(e);
      cleanup();
    }
    V.joining = false; emit();
  }
  function cleanup() {
    clearInterval(V.probe); V.probe = null;
    stopCam(); stopScreen();
    Object.keys(V.conns).forEach((s) => drop(s, false));
    if (V.peer) { try { V.peer.destroy(); } catch (e) { /* */ } }
    V.peer = null; V.on = false; V.speaking = {}; V.unwatch = {};
    if (!V.monitor) { closeMic(); clearInterval(V.timer); V.timer = null; V.level = 0; }
  }
  function leave() { if (!V.on) return; blip(false); clearInterval(L.beat); beacon(false); cleanup(); emit(); }

  // ---------- Réglages ----------
  function setMute(m) { V.mute = !!m; if (!V.mute && V.deaf) { V.deaf = false; applyGains(); } broadcast(); emit(); }
  function setDeaf(d) { V.deaf = !!d; V.mute = V.deaf; applyGains(); applyStreamGains(); broadcast(); emit(); }
  function setVol(slug, v) { V.vols[slug] = v; wr(VOL_KEY, V.vols); applyGains(); emit(); }
  function setLocalMute(slug, m) { if (m) V.lmute[slug] = true; else delete V.lmute[slug]; wr(LMUTE_KEY, V.lmute); applyGains(); emit(); }
  async function setCfg(patch) {
    const old = V.cfg; V.cfg = Object.assign({}, old, patch); wr(CFG_KEY, V.cfg);
    const c = V.cfg;
    if (V.g) {
      V.g.inGain.gain.value = c.gain; V.g.master.gain.value = c.outVol; V.g.hp.frequency.value = c.hp ? 90 : 1;
      if (c.out !== old.out && V.ctx.setSinkId) V.ctx.setSinkId(c.out || '').catch(() => {});
      if (c.out !== old.out) { for (const k of Object.values(V.conns)) if (k.out && k.out.el.setSinkId) k.out.el.setSinkId(c.out || '').catch(() => {}); for (const x of Object.values(V.vin)) if (x.snd && x.snd.el.setSinkId) x.snd.el.setSinkId(c.out || '').catch(() => {}); }
      if (c.outVol !== old.outVol) { applyGains(); applyStreamGains(); }
    }
    if (c.ai !== old.ai) wireMic();
    if (c.recvQ !== old.recvQ) broadcast();
    if (c.streamSound !== old.streamSound || c.duck !== old.duck || c.duckAmt !== old.duckAmt) applyStreamGains();
    if (V.g && c.vad !== old.vad) V.g.delay.delayTime.value = c.vad === 'off' ? 0 : 0.08;
    if (V.raw && (c.mic !== old.mic || c.ns !== old.ns || c.ec !== old.ec || c.agc !== old.agc)) {
      try { await openMic(); } catch (e) { V.err = 'ce micro ne répond pas'; }
    }
    if (V.cam && c.cam !== old.cam) { stopCam(); startCam(); }
    // Qualité du partage changée en plein partage : on l'applique tout de suite.
    if (V.screen && c.screenFps !== old.screenFps) {
      V.screen.getVideoTracks().forEach((t) => { t.contentHint = c.screenFps > 20 ? 'motion' : 'detail'; t.applyConstraints({ frameRate: { ideal: c.screenFps, max: c.screenFps } }).catch(() => {}); });
      retune('screen');
    }
    emit();
  }
  // « Tester mon micro » : tu t'entends (avec les réglages), même hors du salon.
  async function setMonitor(on) {
    try {
      if (on) {
        if (!V.raw) await openMic();
        startTick(); V.g.gate.connect(V.g.master); V.monitor = true;
      } else if (V.monitor) {
        try { V.g.gate.disconnect(V.g.master); } catch (e) { /* */ }
        V.monitor = false;
        if (!V.on) { closeMic(); clearInterval(V.timer); V.timer = null; V.level = 0; }
      }
    } catch (e) { V.err = e && e.name === 'NotAllowedError' ? 'accès au micro refusé (Windows › Paramètres › Confidentialité › Microphone)' : 'micro indisponible'; V.monitor = false; }
    emit();
  }
  async function devices() {
    try {
      const d = await navigator.mediaDevices.enumerateDevices();
      const f = (k) => d.filter((x) => x.kind === k && x.deviceId && x.deviceId !== 'default' && x.deviceId !== 'communications');
      return { mics: f('audioinput'), outs: f('audiooutput'), cams: f('videoinput') };
    } catch (e) { return { mics: [], outs: [], cams: [] }; }
  }

  // ---------- Invitations : chaque FIRE ouvert garde une petite adresse « hall » pour recevoir une invitation ----------
  const L = { peer: null, prefix: '', me: null, ids: [], onInvite: null, last: {}, timer: null, links: {}, here: {}, beat: null };
  // Présence : qui est en vocal, vu depuis n'importe quel FIRE ouvert (même sans être dans le salon).
  // Chaque membre en appel prévient les autres toutes les 20 s ; sans nouvelle depuis 60 s, on le considère parti.
  function onHall(from, m) {
    if (!m) return;
    if (m.t === 'invite' && L.onInvite) L.onInvite(from, String(m.room || 'equipe').slice(0, 20));
    if (m.t === 'chat' && m.msg && L.onChat && m.msg.from === from) L.onChat(m.msg);
    if (m.t === 'here') { if (m.on) L.here[from] = { t: Date.now() + 60000, room: String(m.room || 'equipe').slice(0, 20) }; else delete L.here[from]; emit(); }
  }
  function link(slug) {
    const cur = L.links[slug];
    if (cur && cur.open) return Promise.resolve(cur);
    return new Promise((ok) => {
      if (!L.peer || L.peer.destroyed || !L.peer.open) return ok(null);
      const dc = L.peer.connect(lid(slug), { reliable: true });
      const t = setTimeout(() => ok(null), 8000);
      dc.on('open', () => { clearTimeout(t); L.links[slug] = dc; dc.on('data', (m) => onHall(slug, m)); dc.on('close', () => { if (L.links[slug] === dc) delete L.links[slug]; }); ok(dc); });
      dc.on('error', () => { clearTimeout(t); ok(null); });
    });
  }
  async function beacon(on) {
    const others = L.ids.filter((x) => x !== L.me);
    const room = V.room;
    await Promise.all(others.map(async (x) => { const dc = await link(x); if (dc) { try { dc.send({ t: 'here', on, room }); } catch (e) { /* */ } } }));
  }
  function presenceLoop() {
    clearInterval(L.beat);
    if (V.on) { beacon(true); L.beat = setInterval(() => { if (V.on) beacon(true); }, 20000); }
  }
  setInterval(() => { const now = Date.now(); let ch = false; for (const [k, x] of Object.entries(L.here)) if (x.t < now) { delete L.here[k]; ch = true; } if (ch) emit(); }, 5000);
  const lid = (slug) => L.prefix + 'hall' + slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  async function lobby(opts) {
    if (!window.Peer || !opts || !opts.me) return;
    const prefix = 'firelol-' + (await sha('FIRE-vocal:' + opts.code.trim().toUpperCase())).slice(0, 24) + '-';
    L.ids = [...new Set(opts.ids.concat(opts.me))]; L.onInvite = opts.onInvite || L.onInvite;
    if (L.peer && !L.peer.destroyed && L.me === opts.me && L.prefix === prefix) return;
    if (L.peer) { try { L.peer.destroy(); } catch (e) { /* */ } }
    L.prefix = prefix; L.me = opts.me;
    const start = () => {
      const p = L.peer = new window.Peer(lid(L.me), { debug: 0, config: { iceServers: ICE } });
      p.on('connection', (dc) => {
        const from = L.ids.find((x) => lid(x) === dc.peer);
        if (!from || from === L.me) { try { dc.close(); } catch (e) { /* */ } return; }
        L.links[from] = dc;
        dc.on('data', (m) => onHall(from, m));
        dc.on('close', () => { if (L.links[from] === dc) delete L.links[from]; });
      });
      p.on('disconnected', () => { setTimeout(() => { try { if (L.peer === p && !p.destroyed) p.reconnect(); } catch (e) { /* */ } }, 3000); });
      // Adresse encore prise (relance rapide) ou serveur coupé : on réessaie un peu plus tard.
      p.on('error', (e) => { if (e.type === 'unavailable-id' || e.type === 'network' || e.type === 'server-error') { clearTimeout(L.timer); L.timer = setTimeout(() => { if (L.peer === p) { try { p.destroy(); } catch (x) { /* */ } start(); } }, 15000); } });
    };
    start();
  }
  // Envoie une invitation : renvoie 'ok', 'off' (FIRE fermé chez lui) ou 'wait' (déjà invité il y a moins de 30 s).
  function invite(slug) {
    return new Promise((ok) => {
      if (!L.peer || L.peer.destroyed || !L.peer.open) return ok('off');
      if (Date.now() - (L.last[slug] || 0) < 30000) return ok('wait');
      L.last[slug] = Date.now();
      let done = false;
      const end = (r) => { if (!done) { done = true; ok(r); } };
      link(slug).then((dc) => { if (!dc) return end('off'); try { dc.send({ t: 'invite', room: V.room || 'equipe' }); end('ok'); } catch (e) { end('off'); } });
    });
  }

  // Discussion écrite : le message part tout de suite vers chaque FIRE ouvert (l'historique est enregistré à part).
  async function chatSend(msg) {
    const others = L.ids.filter((x) => x !== L.me);
    let n = 0;
    await Promise.all(others.map(async (x) => { const dc = await link(x); if (dc) { try { dc.send({ t: 'chat', msg }); n++; } catch (e) { /* */ } } }));
    return n;
  }

  window.FireVoice = {
    join, leave, setMute, setDeaf, setVol, setLocalMute, setCfg, setMonitor, devices, startCam, stopCam, startScreen, stopScreen, cue, setStreamSound, requestSound, addScreenSound, watchStream,
    onSoundRequest: (f) => { V.onSndReq = f; }, lobby, invite, chatSend, onChat: (f) => { L.onChat = f; },
    clearErr: () => { V.err = ''; emit(); },
    // Définition et images/s de chaque écran partagé que je reçois (affichées sur la vidéo).
    recvInfo: async () => {
      const out = {};
      for (const [key, v] of Object.entries(V.vin)) {
        const pc = v.call && v.call.peerConnection; if (!pc) continue;
        try { const st = await pc.getStats(); st.forEach((x) => { if (x.type === 'inbound-rtp' && x.kind === 'video') out[key] = { h: x.frameHeight || 0, fps: Math.round(x.framesPerSecond || 0) }; }); } catch (e) { /* */ }
      }
      return out;
    },
    // Diagnostic (console) : codec, débit et images/s de chaque vidéo envoyée ou reçue.
    _stats: async () => {
      const one = async (call, dir) => {
        const pc = call && call.peerConnection; if (!pc) return null;
        const r = await pc.getStats(); const out = { dir };
        r.forEach((x) => {
          if (x.type === (dir === 'out' ? 'outbound-rtp' : 'inbound-rtp') && x.kind === 'video') { out.fps = x.framesPerSecond; out.w = x.frameWidth; out.h = x.frameHeight; out.codecId = x.codecId; out.limit = x.qualityLimitationReason; }
        });
        if (out.codecId) { const c = r.get(out.codecId); out.codec = c && c.mimeType; delete out.codecId; }
        if (dir === 'out') { const sd = pc.getSenders().find((x) => x.track && x.track.kind === 'video'); if (sd) { const p = sd.getParameters(); out.max = p.encodings && p.encodings[0] && p.encodings[0].maxBitrate; out.pref = p.degradationPreference; } }
        return out;
      };
      const res = {};
      for (const [k, c] of Object.entries(V.vout)) res['→' + k] = await one(c, 'out');
      for (const [k, v] of Object.entries(V.vin)) res['←' + k] = await one(v.call, 'in');
      return res;
    },
    level: () => V.level, gateOpen: () => V.gateOpen,
    onChange: (f) => V.listeners.push(f),
    state: () => ({
      on: V.on, joining: V.joining, err: V.err, me: V.me, mute: V.mute, deaf: V.deaf, monitor: V.monitor,
      cfg: Object.assign({}, V.cfg), vols: Object.assign({}, V.vols), lmute: Object.assign({}, V.lmute), speaking: Object.assign({}, V.speaking),
      cam: V.cam, screen: V.screen, ai: !!AI.node,
      members: Object.entries(V.conns).map(([s, k]) => ({ slug: s, ok: !!k.out, remote: k.remote || {} })),
      here: Object.keys(L.here).filter((x) => x !== V.me && L.here[x].t > Date.now()),
      rooms: Object.fromEntries(Object.entries(L.here).filter(([x, e]) => x !== V.me && e.t > Date.now()).map(([x, e]) => [x, e.room])),
      room: V.room,
      videos: Object.entries(V.vin).filter(([, v]) => v.stream).map(([key, v]) => ({ slug: key.split(':')[0], kind: key.split(':')[1], stream: v.stream, sound: !!v.snd })),
      screenAudio: !!(V.screen && V.screen.getAudioTracks().length),
      screenMix: !!(V.screen && V.screen.getAudioTracks().length && V.screenMix),
      unwatch: Object.keys(V.unwatch),
      svol: Object.assign({}, V.svol)
    })
  };
  window.addEventListener('beforeunload', () => { try { if (V.on) beacon(false); V.monitor = false; cleanup(); } catch (e) { /* */ } });
})();
