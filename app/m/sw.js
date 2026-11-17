// FIRE LoL (téléphone) : réseau d'abord, copie gardée pour s'ouvrir même hors connexion.
const CACHE = 'fire-v3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // GitHub, dpm, Twitch… : jamais en cache ici
  // Toujours redemander au serveur s'il y a plus récent (jamais de vieux fichier gardé par le navigateur).
  let req = e.request; try { req = e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(e.request, { cache: 'no-cache' }); } catch (err) { /* */ }
  e.respondWith(fetch(req).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)).catch(() => {}); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || new Response('Hors connexion', { status: 503 }))));
});
