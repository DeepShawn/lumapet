const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lumaDesktop', {
  setIgnoreMouse: (ignore) => ipcRenderer.send('lumapet:ignore-mouse', Boolean(ignore)),
  notify: (title, body) => ipcRenderer.send('lumapet:notify', title, body),
  quit: () => ipcRenderer.send('lumapet:quit'),
  onCommand: (handler) => ipcRenderer.on('lumapet:command', (_event, command) => handler(String(command)))
});
