// Version téléphone : remplace les modules d'Electron utilisés par coach.js, jeux.js et worlds.js.
export const app = { getPath: () => '/fire', getVersion: () => 'web' };
export const net = { fetch: (url, opts = {}) => { const o = { ...opts }; if (o.headers) { const hd = { ...o.headers }; delete hd['User-Agent']; o.headers = hd; } delete o.cache; return fetch(url, o); } };
export const safeStorage = { isEncryptionAvailable: () => false, encryptString: () => null, decryptString: () => '' };
export default { app, net, safeStorage };
