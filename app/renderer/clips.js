// FIRE — clips instantanés (comme ShadowPlay) : l'écran, le son du PC et le salon vocal sont encodés en continu
// par la carte graphique (WebCodecs, H.264), et seules les 30 dernières secondes restent en mémoire.
// Au raccourci, ces secondes deviennent un fichier MP4, sans réencodage : c'est instantané.
// Le son : le son du PC (jeu + voix des coéquipiers jouées par FIRE) mélangé à ta propre voix telle que le salon l'entend.
(function () {
  'use strict';
  const C = {
    on: false, starting: null, st: null, opts: null, venc: null, aenc: null, vmeta: null, ameta: null, acodec: null, vcodec: null,
    v: [], a: [], w: 0, h: 0, lastKey: -1e12, ac: null, mix: null, micSrc: null, deskSrc: null, err: '', stopRead: [],
  };
  const QUAL = {
    '720p30': { w: 1280, h: 720, fps: 30, rate: 5e6 },
    '1080p30': { w: 1920, h: 1080, fps: 30, rate: 8e6 },
    '1080p60': { w: 1920, h: 1080, fps: 60, rate: 12e6 },
  };
  const KEY_EVERY = 1e6; // une image clé par seconde : le clip commence au plus près du moment voulu

  function q() { return QUAL[(C.opts && C.opts.quality) || '1080p30'] || QUAL['1080p30']; }
  function secs() { return Math.max(10, Math.min(120, Number(C.opts && C.opts.seconds) || 30)); }

  async function grab() {
    if (C.opts.stream) return C.opts.stream; // tests
    const Q = q();
    return navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'desktop' } },
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: C.opts.sourceId, maxWidth: Q.w, maxHeight: Q.h, maxFrameRate: Q.fps } },
    }).catch(() => navigator.mediaDevices.getUserMedia({ // sans le son du PC si Windows le refuse
      audio: false,
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: C.opts.sourceId, maxWidth: Q.w, maxHeight: Q.h, maxFrameRate: Q.fps } },
    })).catch(async () => { // dernier recours : la capture du partage d'écran (même écran, son du PC compris)
      const fs = window.fire && window.fire.screen;
      if (!fs) throw new Error('capture');
      await fs.pick(C.opts.sourceId, true);
      return navigator.mediaDevices.getDisplayMedia({ audio: true, video: { frameRate: { ideal: Q.fps, max: Q.fps }, width: { max: Q.w }, height: { max: Q.h } } });
    });
  }

  async function pickVideoCodec(w, h) {
    const Q = q();
    const tries = [['avc', 'avc1.640033'], ['avc', 'avc1.640028'], ['avc', 'avc1.4d0028'], ['avc', 'avc1.42e01f'], ['vp9', 'vp09.00.41.08']];
    for (const hw of ['prefer-hardware', 'no-preference']) {
      for (const [kind, codec] of tries) {
        const cfg = { codec, width: w, height: h, bitrate: Q.rate, framerate: Q.fps, hardwareAcceleration: hw, latencyMode: 'realtime', bitrateMode: 'variable' };
        if (kind === 'avc') cfg.avc = { format: 'avc' };
        try { const r = await VideoEncoder.isConfigSupported(cfg); if (r && r.supported) return { kind, cfg }; } catch (e) { /* suivant */ }
      }
    }
    return null;
  }
  async function pickAudioCodec() {
    for (const [kind, codec] of [['aac', 'mp4a.40.2'], ['opus', 'opus']]) {
      const cfg = { codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 };
      try { const r = await AudioEncoder.isConfigSupported(cfg); if (r && r.supported) return { kind, cfg }; } catch (e) { /* suivant */ }
    }
    return null;
  }

  // Garde seulement la fenêtre utile (durée du clip + 3 s), en commençant toujours par une image clé.
  function prune() {
    if (!C.v.length) return;
    const keepFrom = C.v[C.v.length - 1].ts - (secs() + 3) * 1e6;
    let i = 0;
    for (let k = 0; k < C.v.length; k++) { if (C.v[k].ts > keepFrom) break; if (C.v[k].key) i = k; }
    if (i > 0) C.v.splice(0, i);
    const vt = C.v.length ? C.v[0].ts : 0;
    let j = 0; while (j < C.a.length && C.a[j].ts < vt) j++;
    if (j > 0) C.a.splice(0, j);
  }

  async function startVideo(track) {
    const proc = new MediaStreamTrackProcessor({ track });
    const reader = proc.readable.getReader();
    let stop = false; C.stopRead.push(() => { stop = true; try { reader.cancel(); } catch (e) { /* */ } });
    const Q = q();
    let minGap = 1e6 / Q.fps * 0.8, lastTs = -1e12;
    (async () => {
      for (;;) {
        let r; try { r = await reader.read(); } catch (e) { break; }
        if (r.done || stop) { if (r.value) r.value.close(); break; }
        const f = r.value;
        try {
          if (f.timestamp - lastTs < minGap) continue;
          // Taille paire (exigée par H.264) ; si l'écran change de définition, l'encodeur repart.
          const w = f.displayWidth & ~1, h = f.displayHeight & ~1;
          if (!C.venc || w !== C.w || h !== C.h) {
            if (C.venc) { try { C.venc.close(); } catch (e) { /* */ } C.venc = null; C.v = []; C.a = []; }
            const pick = await pickVideoCodec(w, h);
            if (!pick) { C.err = 'encodeur vidéo indisponible'; changed(); continue; }
            C.vcodec = pick.kind; C.w = w; C.h = h; C.vmeta = null; C.lastKey = -1e12;
            C.venc = new VideoEncoder({
              output: (chunk, meta) => {
                const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d);
                if (meta && meta.decoderConfig) C.vmeta = meta;
                C.v.push({ d, ts: chunk.timestamp, dur: chunk.duration || Math.round(1e6 / Q.fps), key: chunk.type === 'key' });
                prune();
              },
              error: () => { C.err = 'erreur de l’encodeur vidéo'; changed(); },
            });
            C.venc.configure(pick.cfg);
          }
          if (C.venc.encodeQueueSize > 4) continue; // la carte graphique est occupée : on saute une image
          const key = f.timestamp - C.lastKey >= KEY_EVERY;
          if (key) C.lastKey = f.timestamp;
          lastTs = f.timestamp;
          C.venc.encode(f, { keyFrame: key });
        } finally { f.close(); }
      }
    })();
  }

  async function startAudio(deskTrack) {
    const pick = await pickAudioCodec();
    if (!pick) return;
    C.acodec = pick.kind;
    C.ac = new AudioContext({ sampleRate: 48000 });
    C.mix = C.ac.createMediaStreamDestination();
    C.mix.channelCount = 2;
    if (deskTrack) { C.deskSrc = C.ac.createMediaStreamSource(new MediaStream([deskTrack])); C.deskSrc.connect(C.mix); }
    setMic(C.opts.mic ? C.opts.mic() : null);
    // Un son silencieux permanent : la piste audio ne s'arrête jamais, même sans son.
    const sil = C.ac.createConstantSource(); sil.offset.value = 0; sil.connect(C.mix); sil.start();
    C.aenc = new AudioEncoder({
      output: (chunk, meta) => {
        const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d);
        if (meta && meta.decoderConfig) C.ameta = meta;
        C.a.push({ d, ts: chunk.timestamp, dur: chunk.duration || 0 });
      },
      error: () => { C.err = 'erreur de l’encodeur audio'; },
    });
    C.aenc.configure(pick.cfg);
    const reader = new MediaStreamTrackProcessor({ track: C.mix.stream.getAudioTracks()[0] }).readable.getReader();
    let stop = false; C.stopRead.push(() => { stop = true; try { reader.cancel(); } catch (e) { /* */ } });
    (async () => {
      for (;;) {
        let r; try { r = await reader.read(); } catch (e) { break; }
        if (r.done || stop) { if (r.value) r.value.close(); break; }
        const ad = r.value;
        try { if (C.aenc && C.aenc.state === 'configured') C.aenc.encode(ad); } catch (e) { /* */ } finally { ad.close(); }
      }
    })();
  }
  // Ta voix (celle que le salon entend) : branchée quand tu es en appel, retirée après.
  function setMic(stream) {
    if (!C.ac) return;
    if (C.micSrc) { try { C.micSrc.disconnect(); } catch (e) { /* */ } C.micSrc = null; }
    if (stream && stream.getAudioTracks().length) { C.micSrc = C.ac.createMediaStreamSource(stream); C.micSrc.connect(C.mix); }
  }

  async function start(opts) {
    if (C.on || C.starting) return C.starting;
    C.opts = opts || {}; C.err = '';
    if (!window.VideoEncoder || !window.MediaStreamTrackProcessor) { C.err = 'ton PC ne permet pas l’enregistrement'; changed(); return false; }
    C.starting = (async () => {
      try {
        C.st = await grab();
        const vt = C.st.getVideoTracks()[0];
        if (!vt) throw new Error('écran introuvable');
        C.on = true;
        await startVideo(vt);
        await startAudio(C.st.getAudioTracks()[0] || null);
        vt.onended = () => stop();
        changed();
        return true;
      } catch (e) { C.err = 'capture de l’écran impossible'; stop(); return false; } finally { C.starting = null; }
    })();
    return C.starting;
  }
  function stop() {
    C.stopRead.forEach((f) => f()); C.stopRead = [];
    if (C.st && !(C.opts && C.opts.stream)) C.st.getTracks().forEach((t) => t.stop());
    C.st = null;
    for (const k of ['venc', 'aenc']) { if (C[k]) { try { C[k].close(); } catch (e) { /* */ } C[k] = null; } }
    if (C.ac) { C.ac.close().catch(() => {}); C.ac = null; }
    C.mix = C.micSrc = C.deskSrc = null;
    C.v = []; C.a = []; C.w = C.h = 0; C.on = false;
    changed();
  }

  // Les N dernières secondes → MP4 (pas de réencodage : les images déjà compressées sont rangées dans le fichier).
  async function save() {
    if (!C.on || !C.v.length || !C.vmeta) return null;
    try { await C.venc.flush(); } catch (e) { /* encodeur fermé entre-temps */ }
    try { if (C.aenc) await C.aenc.flush(); } catch (e) { /* */ }
    const v = C.v.slice(), a = C.a.slice();
    const end = v[v.length - 1].ts;
    const want = end - secs() * 1e6;
    let s = 0;
    for (let k = 0; k < v.length; k++) { if (v[k].ts > want) break; if (v[k].key) s = k; }
    if (!v[s].key) s = v.findIndex((x) => x.key);
    if (s < 0) return null;
    const vids = v.slice(s);
    const t0 = vids[0].ts;
    const auds = C.ameta ? a.filter((x) => x.ts >= t0 && x.ts <= end + 1e5) : [];
    const M = window.Mp4Muxer;
    const target = new M.ArrayBufferTarget();
    const Q = q();
    const muxer = new M.Muxer({
      target,
      video: { codec: C.vcodec, width: C.w, height: C.h },
      audio: auds.length ? { codec: C.acodec, sampleRate: 48000, numberOfChannels: 2 } : undefined,
      fastStart: 'in-memory',
      firstTimestampBehavior: 'cross-track-offset',
    });
    vids.forEach((x, i) => {
      const next = vids[i + 1];
      const dur = next ? Math.max(1, next.ts - x.ts) : x.dur;
      muxer.addVideoChunkRaw(x.d, x.key ? 'key' : 'delta', x.ts - t0, dur, i === 0 ? C.vmeta : undefined);
    });
    auds.forEach((x, i) => muxer.addAudioChunkRaw(x.d, 'key', x.ts - t0, x.dur, i === 0 ? C.ameta : undefined));
    muxer.finalize();
    return { buf: target.buffer, seconds: Math.round((end - t0) / 1e6), w: C.w, h: C.h };
  }

  let onChange = null;
  function changed() { if (onChange) try { onChange(); } catch (e) { /* */ } }

  window.FireClips = {
    start, stop, save, setMic,
    state: () => ({ on: C.on, starting: !!C.starting, err: C.err, buffered: C.v.length ? Math.round((C.v[C.v.length - 1].ts - C.v[0].ts) / 1e6) : 0, w: C.w, h: C.h, vcodec: C.vcodec, acodec: C.acodec }),
    onChange: (f) => { onChange = f; },
    supported: () => !!(window.VideoEncoder && window.AudioEncoder && window.MediaStreamTrackProcessor && window.Mp4Muxer),
  };
}());
