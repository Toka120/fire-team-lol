// Visionnage des partages : aucun nouveau flux WebRTC, audio conservé par le salon.
(function () {
  'use strict';
  let root, grid, toolbar, back, timer, previousFocus, focused = null, native = false;
  const videos = new Map();
  const button = (label, action) => {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = label; el.onclick = action;
    return el;
  };
  function reveal() {
    if (!root) return;
    root.classList.remove('idle'); clearTimeout(timer);
    timer = setTimeout(() => { if (root) root.classList.add('idle'); }, 2400);
  }
  function arrange() {
    if (!root) return;
    const items = [...videos.values()];
    if (!videos.has(focused)) focused = null;
    back.hidden = !focused;
    const visible = items.filter((x) => !focused || x.key === focused);
    items.forEach((x) => { x.tile.hidden = !visible.includes(x); });
    // Choisir la grille qui donne le plus de surface aux images réelles, sans les rogner.
    const w = grid.clientWidth, h = grid.clientHeight, n = visible.length;
    let best = -1, cols = 1, rows = 1;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), cw = w / c, ch = h / r;
      const area = visible.reduce((sum, x) => {
        const ratio = x.video.videoWidth / x.video.videoHeight || 16 / 9;
        const vw = Math.min(cw, ch * ratio);
        return sum + vw * vw / ratio;
      }, 0);
      if (area > best + 0.5 || (Math.abs(area - best) <= 0.5 && r < rows)) { best = area; cols = c; rows = r; }
    }
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
    root.dataset.focus = focused || '';
  }
  function close() {
    if (!root) return;
    const old = root; root = null; clearTimeout(timer);
    window.removeEventListener('resize', arrange);
    document.removeEventListener('fullscreenchange', changed);
    document.removeEventListener('keydown', keydown, true);
    videos.forEach((x) => { x.video.srcObject = null; }); videos.clear();
    if (document.fullscreenElement === old) document.exitFullscreen().catch(() => {});
    old.remove(); focused = null; native = false;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function changed() {
    if (!root) return;
    if (document.fullscreenElement === root) { native = true; arrange(); }
    else if (native) close();
  }
  function keydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }
  function sync(streams) {
    if (!root) return;
    const keys = new Set(streams.map((x) => x.key));
    for (const [key, x] of videos) if (!keys.has(key)) {
      x.video.srcObject = null; x.tile.remove(); videos.delete(key);
    }
    if (!streams.length) { close(); return; }
    for (const stream of streams) {
      let x = videos.get(stream.key);
      if (!x) {
        const tile = document.createElement('button'), video = document.createElement('video');
        tile.type = 'button'; tile.className = 'streams-tile'; tile.dataset.stream = stream.key;
        tile.onclick = () => { focused = focused === stream.key ? null : stream.key; arrange(); reveal(); };
        video.autoplay = true; video.playsInline = true; video.muted = true;
        video.onloadedmetadata = arrange; video.onresize = arrange;
        const name = document.createElement('span'); name.className = 'streams-name';
        tile.append(video, name); grid.append(tile);
        x = { key: stream.key, tile, video, name }; videos.set(stream.key, x);
      }
      x.tile.setAttribute('aria-label', `Agrandir ou réduire : ${stream.name}`);
      x.name.textContent = stream.name;
      grid.append(x.tile);
      if (x.video.srcObject !== stream.stream) {
        x.video.srcObject = stream.stream; x.video.play().catch(() => {});
      }
    }
    arrange();
  }
  function open(streams) {
    if (!streams.length) return;
    if (root) { sync(streams); return; }
    previousFocus = document.activeElement;
    root = document.createElement('section'); root.className = 'streams-view';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Partages d’écran en plein écran');
    root.onpointermove = reveal; root.onpointerdown = reveal;
    root.onkeydown = (e) => {
      reveal();
      if (e.key !== 'Tab') return;
      const controls = [...root.querySelectorAll('button')].filter((x) => !x.hidden);
      const i = controls.indexOf(document.activeElement);
      e.preventDefault(); controls[(i + (e.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
    };
    grid = document.createElement('div'); grid.className = 'streams-grid';
    toolbar = document.createElement('div'); toolbar.className = 'streams-tools';
    back = button('Tous les partages', () => { focused = null; arrange(); reveal(); });
    const exit = button('Quitter le plein écran · Échap', close);
    toolbar.append(back, exit); root.append(grid, toolbar); document.body.append(root);
    window.addEventListener('resize', arrange);
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('keydown', keydown, true);
    sync(streams); exit.focus({ preventScroll: true }); reveal();
    // Le repli couvre toute la fenêtre si le système refuse le plein écran natif.
    if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  }
  window.FireStreams = { open, sync, close, get active() { return !!root; } };
})();
