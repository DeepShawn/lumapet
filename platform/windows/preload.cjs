const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lumaDesktop', {
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('toggle-always-on-top', enabled),
  toggleOverlay: (enabled) => ipcRenderer.invoke('toggle-overlay', enabled)
});
