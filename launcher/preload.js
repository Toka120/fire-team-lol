// FIRE Launcher : ce que l'interface a le droit de demander au launcher.
const { contextBridge, ipcRenderer } = require('electron');
const on = (ch) => (cb) => { const f = (e, m) => cb(m); ipcRenderer.on(ch, f); return () => ipcRenderer.removeListener(ch, f); };
contextBridge.exposeInMainWorld('fl', {
  state: () => ipcRenderer.invoke('apps:state'),
  play: (id, opts) => ipcRenderer.invoke('apps:play', id, opts || {}),
  folder: (id) => ipcRenderer.invoke('apps:folder', id),
  uninstall: (id) => ipcRenderer.invoke('apps:uninstall', id),
  patchnotes: () => ipcRenderer.invoke('data:patchnotes'),
  prefs: { get: () => ipcRenderer.invoke('prefs:get'), set: (p) => ipcRenderer.invoke('prefs:set', p) },
  open: (u) => ipcRenderer.invoke('open:url', u),
  win: { min: () => ipcRenderer.invoke('win:min'), max: () => ipcRenderer.invoke('win:max'), close: () => ipcRenderer.invoke('win:close') },
  selfInstall: () => ipcRenderer.invoke('self:install'),
  admin: { keys: () => ipcRenderer.invoke('admin:keys'), outbox: () => ipcRenderer.invoke('admin:outbox') },
  onProgress: on('apps:progress'),
  onSelf: on('self'),
  onWin: on('win'),
});
