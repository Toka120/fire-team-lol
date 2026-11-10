// FIRE LoL - salon vocal de l'équipe.
// Les voix passent directement d'un PC à l'autre (WebRTC, chiffré), sans serveur à nous.
// Le serveur public PeerJS sert seulement à se trouver : chaque membre a une adresse dérivée du code
// du salon et de son pseudo. Sans le code, impossible de deviner les adresses, donc d'entrer.
(function () {
  'use strict';
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }];
  const V = {
    on: false, joining: false, err: '', me: null, prefix: '', ids: [], peer: null, stream: null,
    mute: false, deaf: false, conns: {}, vols: {}, speaking: {}, listeners: [], ctx: null, timer: null, probe: null
  };
  const emit = () => V.listeners.forEach((f) => { try { f(); } catch (e) { /* vue */ } });

  async function sha(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  const pid = (slug) => V.prefix + slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  const slugOf = (id) => V.ids.find((s) => pid(s) === id) || null;

  // Un petit son quand quelqu'un arrive ou part (comme Discord), généré sans fichier.
  function blip(up) {
    try {
      const c = audioCtx(); const o = c.createOscillator(); const g = c.createGain();
      o.frequency.setValueAtTime(up ? 520 : 660, c.currentTime); o.frequency.linearRampToValueAtTime(up ? 780 : 440, c.currentTime + 0.14);
      g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.25);
    } catch (e) { /* pas de son */ }
  }
  function audioCtx() { if (!V.ctx) V.ctx = new AudioContext(); if (V.ctx.state === 'suspended') V.ctx.resume().catch(() => {}); return V.ctx; }

  // Niveau sonore : sert à allumer la pastille de celui qui parle.
  function meter(stream) {
    const c = audioCtx(); const src = c.createMediaStreamSource(stream); const an = c.createAnalyser();
    an.fftSize = 512; src.connect(an); const buf = new Uint8Array(an.fftSize);
    return () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); return m; };
  }

  function playRemote(slug, stream) {
    const c = audioCtx();
    // Chrome ne fait circuler un flux WebRTC dans Web Audio que s'il est aussi branché sur un élément audio.
    const el = new Audio(); el.muted = true; el.srcObject = stream; el.play().catch(() => {});
    const src = c.createMediaStreamSource(stream); const g = c.createGain();
    g.gain.value = V.deaf ? 0 : (V.vols[slug] ?? 1); src.connect(g); g.connect(c.destination);
    return { el, src, g, level: meter(stream) };
  }

  function drop(slug, sound) {
    const k = V.conns[slug]; if (!k) return;
    delete V.conns[slug]; delete V.speaking[slug];
    try { k.call.close(); } catch (e) { /* déjà fermé */ }
    if (k.out) { try { k.out.src.disconnect(); k.out.g.disconnect(); k.out.el.srcObject = null; } catch (e) { /* */ } }
    if (sound) blip(false);
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
      else if (st === 'connected' || st === 'completed') { clearTimeout(lost); if (V.conns[slug]) { V.conns[slug].ok = true; emit(); } }
    };
    if (pc) pc.addEventListener('iceconnectionstatechange', check);
    call.on('stream', (st) => {
      const k = V.conns[slug]; if (!k || k.call !== call || k.out) return;
      k.out = playRemote(slug, st); k.ok = true; blip(true); emit();
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
    V.conns[slug] = { call, ok: false, out: null, mine: outgoing, t: Date.now() };
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
    const call = V.peer.call(pid(slug), V.stream, { metadata: { s: V.me } });
    if (call) keep(slug, call, true);
  }

  async function join(opts) {
    if (V.on || V.joining) return;
    V.joining = true; V.err = ''; emit();
    try {
      if (!window.Peer) throw new Error('module vocal absent');
      V.me = opts.me; V.ids = [...new Set(opts.ids.concat(opts.me))];
      V.prefix = 'firelol-' + (await sha('FIRE-vocal:' + opts.code.trim().toUpperCase())).slice(0, 24) + '-';
      V.stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: opts.mic ? { exact: opts.mic } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false
      });
      V.stream.getAudioTracks().forEach((t) => { t.enabled = !V.mute; });
      const myLevel = meter(V.stream);
      V.peer = await new Promise((ok, ko) => {
        const p = new window.Peer(pid(V.me), { debug: 0, config: { iceServers: ICE } });
        const t = setTimeout(() => ko(new Error('serveur de connexion injoignable')), 15000);
        p.on('open', () => { clearTimeout(t); ok(p); });
        p.on('error', (e) => {
          clearTimeout(t);
          if (e.type === 'unavailable-id') ko(new Error('tu es déjà dans le salon depuis un autre PC ou une autre fenêtre'));
          else if (e.type === 'peer-unavailable') { unavailable(e); }
          else if (!V.on) ko(new Error(e.type === 'network' || e.type === 'server-error' ? 'serveur de connexion injoignable' : (e.message || e.type)));
        });
      });
      V.on = true;
      V.peer.on('call', (call) => {
        const from = slugOf(call.peer);
        if (!from || from === V.me) { try { call.close(); } catch (e) { /* */ } return; }
        if (keep(from, call, false)) call.answer(V.stream);
      });
      V.peer.on('disconnected', () => { if (V.on) setTimeout(() => { try { if (V.on && V.peer && V.peer.disconnected) V.peer.reconnect(); } catch (e) { /* */ } }, 2000); });
      V.ids.forEach(ring);
      // Toutes les 20 s, on rappelle ceux qui ne sont pas là : un membre qui revient après une coupure est retrouvé.
      V.probe = setInterval(() => V.ids.forEach(ring), 20000);
      V.timer = setInterval(() => {
        let ch = false;
        const set = (k, v) => { if (!!V.speaking[k] !== v) { V.speaking[k] = v; ch = true; } };
        set(V.me, !V.mute && myLevel() > 9);
        for (const [s, k] of Object.entries(V.conns)) set(s, !!(k.out && k.out.level() > 9));
        if (ch) emit();
      }, 150);
      blip(true);
    } catch (e) {
      V.err = (e && e.name === 'NotAllowedError') ? 'accès au micro refusé (Windows › Paramètres › Confidentialité › Microphone)' : (e && e.name === 'NotFoundError') ? 'aucun micro trouvé' : (e && e.message) || String(e);
      cleanup();
    }
    V.joining = false; emit();
  }

  function cleanup() {
    clearInterval(V.timer); clearInterval(V.probe); V.timer = V.probe = null;
    Object.keys(V.conns).forEach((s) => drop(s, false));
    if (V.peer) { try { V.peer.destroy(); } catch (e) { /* */ } }
    if (V.stream) V.stream.getTracks().forEach((t) => t.stop());
    V.peer = V.stream = null; V.on = false; V.speaking = {};
  }
  function leave() { if (!V.on) return; blip(false); cleanup(); emit(); }

  function setMute(m) { V.mute = !!m; if (V.stream) V.stream.getAudioTracks().forEach((t) => { t.enabled = !V.mute; }); emit(); }
  function setDeaf(d) {
    V.deaf = !!d;
    for (const [s, k] of Object.entries(V.conns)) if (k.out) k.out.g.gain.value = V.deaf ? 0 : (V.vols[s] ?? 1);
    emit();
  }
  function setVol(slug, v) { V.vols[slug] = v; const k = V.conns[slug]; if (k && k.out && !V.deaf) k.out.g.gain.value = v; emit(); }

  async function mics() {
    try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput'); } catch (e) { return []; }
  }

  window.FireVoice = {
    join, leave, setMute, setDeaf, setVol, mics,
    onChange: (f) => V.listeners.push(f),
    state: () => ({
      on: V.on, joining: V.joining, err: V.err, me: V.me, mute: V.mute, deaf: V.deaf, vols: { ...V.vols },
      speaking: { ...V.speaking }, members: Object.entries(V.conns).map(([s, k]) => ({ slug: s, ok: k.ok && !!k.out }))
    })
  };
  window.addEventListener('beforeunload', () => { try { cleanup(); } catch (e) { /* */ } });
})();
