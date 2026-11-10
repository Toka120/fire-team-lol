const { contextBridge, ipcRenderer } = require('electron');

const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('fire', {
  config: call('config'),
  guides: call('guides'),
  patchnotes: call('patchnotes'),
  lolpatch: { list: call('lolpatch:list'), get: call('lolpatch:get') },
  screen: { sources: call('screen:sources'), pick: call('screen:pick') },
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
