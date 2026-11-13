const { contextBridge, ipcRenderer, webFrame } = require('electron');

const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('fire', {
  config: call('config'),
  // Navigateur intégré : les liens s'ouvrent dans FIRE.
  web: { load: call('web:load'), bounds: call('web:bounds'), nav: call('web:nav'), hide: call('web:hide'), close: call('web:close'),
    onOpen: (cb) => ipcRenderer.on('web:open', (e, u) => cb(u)), onState: (cb) => ipcRenderer.on('web:state', (e, st) => cb(st)), onEsc: (cb) => ipcRenderer.on('web:esc', () => cb()) },
  // Taille du texte (Paramètres › Polices d'écriture) : vrai zoom de la fenêtre, les clics restent justes partout.
  win: { displays: call('window:displays'), setDisplay: call('window:setDisplay'), soundComms: call('win:soundComms') },
  adv: { gpu: call('gpu:get'), setGpu: call('gpu:set'), restart: call('app:restart'), clearCache: call('cache:clear'), cacheSize: call('cache:size') },
  streamer: { watch: call('streamer:watch'), on: (cb) => ipcRenderer.on('streamer:state', (e, v) => cb(!!v)) },
  zoom: (f) => { const z = Number(f); if (z >= 0.8 && z <= 1.3) webFrame.setZoomFactor(z); },
  guides: call('guides'),
  patchnotes: call('patchnotes'),
  lolpatch: { list: call('lolpatch:list'), get: call('lolpatch:get') },
  screen: { sources: call('screen:sources'), pick: call('screen:pick'), ownAudio: call('screen:ownAudio') },
  keys: { set: call('keys:set'), on: (cb) => ipcRenderer.on('keys:hit', (e, a) => cb(a)) },
  lcu: { draft: call('lcu:draft'), runes: call('lcu:runes'), import: call('lcu:import'), stats: call('lcu:stats') },
  bugs: { send: call('bug:send'), list: call('bug:list'), close: call('bug:close') },
  hash: call('hash'),
  version: call('version'),
  fetchPlayer: call('dpm:fetch'),
  team: call('dpm:team'),
  unlock: call('unlock'),
  unlocked: call('unlocked'),
  fiches: call('fiches'),
  pools: call('pools'),
  planning: call('planning'),
  puzzles: call('puzzles:draft'),
  tierlist: call('tierlist'),
  otp: call('otp'),
  matchup: call('matchup'),
  live: { on: (cb) => ipcRenderer.on('live:update', (e, g) => cb(g)) },
  clips: { save: call('clips:save'), list: call('clips:list'), read: call('clips:read'), show: call('clips:show'), del: call('clips:delete') },
  chat: { list: call('chat'), send: call('chat:send') },
  salons: { list: call('salons'), save: call('salons:save') },
  staff: { adminSetup: call('admin:setup'), roles: call('roles'), rolesSave: call('roles:save'), actPush: call('act:push'), actAll: call('act:all'),
    notes: call('staff:notes'), noteSave: call('staff:save'), chatDelete: call('chat:delete') },
  savePlanning: call('planning:save'),
  champions: call('champions'),
  jeux: { data: call('jeux:data'), lore: call('jeux:lore') },
  worlds: call('worlds:season'),
  notify: call('notify'),
  onNotifyGo: (cb) => ipcRenderer.on('notify:go', (e, sec) => cb(sec)),
  background: { get: call('bg:get'), set: call('bg:set') },
  update: {
    state: call('update:state'),
    install: call('update:install'),
    check: call('update:check'),
    on: (cb) => ipcRenderer.on('update', (e, m) => cb(m))
  },
  coach: {
    state: call('coach:state'),
    unlock: call('coach:unlock'),
    leave: call('coach:leave'),
    chefUnlock: call('chef:unlock'),
    chefLeave: call('chef:leave'),
    save: call('coach:save'),
    generate: call('coach:generate'),
    message: call('coach:message'),
    publish: call('coach:publish'),
    unpublish: call('coach:unpublish'),
    savePools: call('coach:savePools')
  }
});
