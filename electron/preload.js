'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trackerDesktop', {
  platform: process.platform,
  query: (sql) => ipcRenderer.invoke('tracker:query', sql),
  setTheme: (mode) => ipcRenderer.send('tracker:theme', mode),
  windowAction: (action) => ipcRenderer.send('tracker:window', action),
  onWindowState: (cb) => ipcRenderer.on('tracker:window-state', (_e, state) => cb(state))
});
