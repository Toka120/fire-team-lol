// FIRE LoL sur téléphone : bouton menu (tiroir) et barre d'onglets en bas.
(function () {
  const H = document.documentElement;
  const TABS = [['Stats des joueurs', '📊', 'Stats'], ['Planning', '📅', 'Planning'], ['Discussion', '💬', 'Discussion'], ['Revue de parties', '🎞️', 'Revues'], ['__menu', '☰', 'Plus']];
  const navBtn = (t) => [...document.querySelectorAll('#nav .navbtn')].find((b) => (b.getAttribute('title') || '').trim() === t);
  function setup() {
    const top = document.querySelector('.topbar'); const side = document.querySelector('.v2-side');
    if (!top || !side) return false;
    if (!document.querySelector('.mob-menu')) {
      const m = document.createElement('button'); m.className = 'mob-menu'; m.setAttribute('aria-label', 'Menu'); m.textContent = '☰';
      m.onclick = () => H.classList.toggle('nav-open'); top.prepend(m);
      const scrim = document.createElement('div'); scrim.className = 'mob-scrim'; scrim.onclick = () => H.classList.remove('nav-open'); document.body.append(scrim);
      document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#nav .navbtn')) H.classList.remove('nav-open'); });
      const bar = document.createElement('nav'); bar.className = 'mob-tabs';
      for (const [t, ico, lab] of TABS) {
        const b = document.createElement('button'); b.dataset.t = t;
        b.innerHTML = `<span class="i">${ico}</span><span>${lab}</span>`;
        b.onclick = () => { if (t === '__menu') { H.classList.toggle('nav-open'); return; } const n = navBtn(t); if (n) n.click(); H.classList.remove('nav-open'); window.scrollTo(0, 0); };
        bar.append(b);
      }
      document.body.append(bar);
    }
    return true;
  }
  function sync() {
    for (const b of document.querySelectorAll('.mob-tabs button')) {
      const n = b.dataset.t !== '__menu' && navBtn(b.dataset.t);
      b.classList.toggle('on', !!(n && (n.classList.contains('on') || n.getAttribute('aria-current'))));
      const badge = n && n.querySelector('.v2-badge, .badge, .nbadge'); let el = b.querySelector('b');
      const txt = badge ? badge.textContent.trim() : '';
      if (txt && !el) { el = document.createElement('b'); b.append(el); }
      if (el) { if (txt) el.textContent = txt; else el.remove(); }
    }
  }
  const t = setInterval(() => { if (setup()) { clearInterval(t); sync(); new MutationObserver(() => sync()).observe(document.getElementById('nav'), { subtree: true, childList: true, attributes: true }); } }, 200);
  // Demande la permission des notifications au premier geste (iPhone : seulement une fois l'app ajoutée à l'écran d'accueil).
  document.addEventListener('click', function ask() { document.removeEventListener('click', ask); try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { /* */ } }, { once: true });
})();
