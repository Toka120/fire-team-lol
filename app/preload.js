const { contextBridge, ipcRenderer } = require('electron');

const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('fire', {
  config: call('config'),
  guides: call('guides'),
  hash: call('hash'),
  version: call('version'),
  fetchPlayer: call('dpm:fetch'),
  unlock: call('unlock'),
  unlocked: call('unlocked'),
  fiches: call('fiches'),
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
    save: call('coach:save'),
    generate: call('coach:generate'),
    message: call('coach:message'),
    publish: call('coach:publish'),
    unpublish: call('coach:unpublish')
  }
});
