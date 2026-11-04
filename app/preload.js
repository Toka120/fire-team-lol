const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fire', {
  config: () => ipcRenderer.invoke('config'),
  hash: (text) => ipcRenderer.invoke('hash', text),
  version: () => ipcRenderer.invoke('version'),
  fetchPlayer: (player, days) => ipcRenderer.invoke('dpm:fetch', player, days)
});
