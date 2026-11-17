// FIRE LoL sur téléphone : coque d'application mobile autour de l'interface du PC.
// Barre du haut avec le titre de la rubrique, barre d'onglets en bas (icônes du menu du PC), menu « Plus » en plein écran
// avec toutes les rubriques par catégorie, tirer vers le bas pour mettre à jour, bouton retour d'Android qui ferme le menu.
(function () {
  const H = document.documentElement;
  // Onglets par identifiant de rubrique (le créateur peut renommer les rubriques dans le menu Admin).
  const TABS = [['accueil', 'Accueil'], ['stats', 'Stats'], ['planning', 'Planning'], ['chat', 'Discussion'], ['__plus', 'Plus']];
  const PLUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" class="v2i"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  const navBtns = () => [...document.querySelectorAll('#nav .navbtn')];
  const titleOf = (b) => (b.getAttribute('title') || b.textContent || '').trim();
  const idOf = (b) => (b && b.dataset.id) || '';
  const navBtn = (t) => navBtns().find((b) => idOf(b) === t || titleOf(b) === t);
  const activeBtn = () => navBtns().find((b) => b.getAttribute('aria-current') === 'page' || b.classList.contains('on'));
  const badgeOf = (b) => { const x = b && b.querySelector('.v2-badge, .badge, .nbadge'); return x && !x.hidden ? x.textContent.trim() : ''; };
  const svgOf = (b) => { const s = b && b.querySelector('svg'); return s ? s.outerHTML : ''; };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  let sheet = null, bar = null, title = null;

  function go(t) {
    const n = navBtn(t); if (n) n.click();
    closeSheet();
    window.scrollTo({ top: 0 });
  }

  // ----- Menu « Plus » : toutes les rubriques, par catégorie -----
  function openSheet() {
    if (sheet) return;
    sheet = el('div', 'mob-sheet');
    const inner = el('div', 'mob-sheet-in');
    const head = el('div', 'mob-sheet-h', '<b>Toutes les rubriques</b>');
    const x = el('button', 'mob-sheet-x', '✕'); x.setAttribute('aria-label', 'Fermer'); x.onclick = () => closeSheet(true);
    head.append(x); inner.append(head);
    for (const g of document.querySelectorAll('#nav .v2-group')) {
      const t = g.querySelector('.v2-group-t');
      const btns = [...g.querySelectorAll('.navbtn')];
      if (!btns.length) continue;
      if (t) inner.append(el('p', 'mob-sheet-gt', t.textContent));
      const grid = el('div', 'mob-sheet-grid');
      for (const b of btns) {
        const name = titleOf(b);
        const it = el('button', 'mob-tile' + (b === activeBtn() ? ' on' : ''), svgOf(b) + `<span>${name}</span>`);
        const bd = badgeOf(b); if (bd) it.append(el('b', 'mob-badge', bd));
        it.onclick = () => go(idOf(b) || name);
        grid.append(it);
      }
      inner.append(grid);
    }
    // Profil, réglages, patch notes : le menu du profil en haut à droite.
    const me = document.getElementById('me-btn');
    if (me) { const p = el('button', 'mob-sheet-me', '⚙️ <span>Mon profil, paramètres et patch notes</span>'); p.onclick = () => { closeSheet(); setTimeout(() => me.click(), 60); }; inner.append(p); }
    sheet.append(inner);
    sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(true); });
    document.body.append(sheet);
    requestAnimationFrame(() => sheet && sheet.classList.add('open'));
    H.classList.add('mob-sheet-on');
    try { history.pushState({ mobSheet: 1 }, ''); } catch (e) { /* */ }
    sync();
  }
  function closeSheet(viaUser) {
    if (!sheet) return;
    const s = sheet; sheet = null;
    s.classList.remove('open'); H.classList.remove('mob-sheet-on');
    setTimeout(() => s.remove(), 220);
    if (viaUser) { try { if (history.state && history.state.mobSheet) history.back(); } catch (e) { /* */ } }
    sync();
  }
  let fromPop = false;
  // Bouton retour du téléphone : ferme le menu « Plus », sinon revient à la rubrique précédente.
  window.addEventListener('popstate', (e) => {
    if (sheet) { closeSheet(false); return; }
    const sec = e.state && e.state.mobSec;
    const back = document.getElementById('back');
    if (back && !back.hidden && sec === lastSec) { back.click(); return; }
    if (sec && sec !== lastSec && navBtn(sec)) { fromPop = true; navBtn(sec).click(); window.scrollTo({ top: 0 }); }
  });

  function setup() {
    const top = document.querySelector('.topbar');
    if (!top || !navBtns().length) return false;
    if (!title) {
      title = el('div', 'mob-title'); top.prepend(title);
      bar = el('nav', 'mob-tabs'); bar.setAttribute('aria-label', 'Onglets');
      for (const [t, lab] of TABS) {
        const b = el('button', 'mob-tab'); b.dataset.t = t;
        b.innerHTML = `<span class="mob-ti">${t === '__plus' ? PLUS_SVG : svgOf(navBtn(t))}</span><span class="mob-tl">${lab}</span>`;
        b.onclick = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* */ } if (t === '__plus') { if (sheet) closeSheet(true); else openSheet(); return; } if (sheet) closeSheet(true); go(t); };
        bar.append(b);
      }
      document.body.append(bar);
      pullToRefresh();
    }
    return true;
  }
  let lastSec = '';
  function sync() {
    if (!bar) return;
    const a = activeBtn();
    const name = a ? titleOf(a) : '';
    const aid = a ? idOf(a) : '';
    const inTabs = TABS.some(([t]) => t === aid);
    for (const b of bar.querySelectorAll('.mob-tab')) {
      const t = b.dataset.t;
      const on = t === '__plus' ? (!!sheet || (!!aid && !inTabs)) : (!sheet && t === aid);
      b.classList.toggle('on', on);
      let bd = '';
      if (t === '__plus') bd = navBtns().filter((n) => !TABS.some(([x]) => x === idOf(n)) && badgeOf(n)).length ? '•' : '';
      else bd = badgeOf(navBtn(t));
      let e = b.querySelector('.mob-badge');
      if (bd && !e) { e = el('b', 'mob-badge'); b.append(e); }
      if (e) { if (bd) e.textContent = bd; else e.remove(); }
    }
    if (title) {
      const back = document.getElementById('back');
      title.textContent = back && !back.hidden ? '' : name;
      H.classList.toggle('mob-has-back', !!(back && !back.hidden));
    }
    if (aid && aid !== lastSec) {
      const prev = lastSec; lastSec = aid; H.dataset.sec = aid;
      if (prev && !fromPop) { try { history.pushState({ mobSec: aid }, ''); } catch (e) { /* */ } }
      else if (!prev) { try { history.replaceState({ mobSec: aid }, ''); } catch (e) { /* */ } }
      fromPop = false;
    }
  }

  // ----- Tirer vers le bas en haut de la page : tout mettre à jour -----
  function pullToRefresh() {
    const ind = el('div', 'mob-ptr', '⟳'); document.body.append(ind);
    let y0 = null, dy = 0;
    document.addEventListener('touchstart', (e) => { if (sheet || window.scrollY > 0 || e.touches.length !== 1) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0 || window.scrollY > 0) { ind.style.opacity = 0; return; }
      const k = Math.min(1, dy / 90);
      ind.style.opacity = k; ind.style.transform = `translate(-50%, ${Math.min(70, dy * 0.6)}px) rotate(${dy * 3}deg)`;
      ind.classList.toggle('ready', k >= 1);
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (y0 != null && dy >= 90 && window.scrollY <= 0) { const r = document.getElementById('refresh'); if (r) r.click(); ind.classList.add('spin'); setTimeout(() => ind.classList.remove('spin'), 1200); }
      y0 = null; ind.style.opacity = 0; ind.style.transform = ''; ind.classList.remove('ready');
    });
  }

  // Écran du code : « sur ce téléphone » plutôt que « sur cet ordinateur ».
  for (const n of document.querySelectorAll('#lock .lock-note')) n.textContent = n.textContent.replace('sur cet ordinateur', 'sur ce téléphone');
  // Textes d'aide trop longs pour un écran de téléphone (« (Entrée pour envoyer) »…).
  let phT = 0;
  const trimPh = () => { phT = 0; for (const x of document.querySelectorAll('textarea[placeholder], input[placeholder]')) { const v = x.getAttribute('placeholder'); const n = v.replace(/\s*\((?:Entrée|Maj|Ctrl)[^)]*\)/g, '').replace(/…\s*$/, '…'); if (n !== v) x.setAttribute('placeholder', n); } };
  new MutationObserver(() => { if (!phT) phT = requestAnimationFrame(trimPh); }).observe(document.body, { childList: true, subtree: true });
  // iPhone dans Safari : petit conseil pour installer FIRE sur l'écran d'accueil (une seule fois).
  try {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    if (ios && !standalone && !localStorage.getItem('fire.web.a2hs')) {
      setTimeout(() => {
        const tip = el('div', 'mob-a2hs', '<b>Installe FIRE comme une app</b><span>Touche <i>Partager</i> ⬆️ puis « Sur l’écran d’accueil ». Tu auras l’icône, le plein écran et les notifications.</span>');
        const x = el('button', '', '✕'); x.onclick = () => { tip.remove(); localStorage.setItem('fire.web.a2hs', '1'); }; tip.append(x); document.body.append(tip);
      }, 4000);
    }
  } catch (e) { /* */ }
  const t = setInterval(() => {
    if (!setup()) return;
    clearInterval(t); sync();
    new MutationObserver(sync).observe(document.getElementById('nav'), { subtree: true, childList: true, attributes: true, characterData: true });
    const back = document.getElementById('back'); if (back) new MutationObserver(sync).observe(back, { attributes: true, childList: true });
  }, 150);
  // Notifications : la permission est demandée au premier geste (iPhone : seulement une fois l'app ajoutée à l'écran d'accueil).
  document.addEventListener('click', function ask() { document.removeEventListener('click', ask); try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { /* */ } }, { once: true });
})();
