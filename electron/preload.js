'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trackerDesktop', {
  platform: process.platform,
  query: (sql) => ipcRenderer.invoke('tracker:query', sql),
  setTheme: (mode) => ipcRenderer.send('tracker:theme', mode),
  windowAction: (action) => ipcRenderer.send('tracker:window', action),
  onWindowState: (cb) => ipcRenderer.on('tracker:window-state', (_e, state) => cb(state)),
  notify: (title, body) => ipcRenderer.send('tracker:notify', { title, body }),
  onSaveState: (cb) => ipcRenderer.on('tracker:save-state', (_e, state) => cb(state)),
  updates: {
    get: () => ipcRenderer.invoke('tracker:update-get'),
    check: () => ipcRenderer.invoke('tracker:update-check'),
    download: () => ipcRenderer.invoke('tracker:update-download'),
    install: () => ipcRenderer.invoke('tracker:update-install'),
    onState: (cb) => ipcRenderer.on('tracker:update-state', (_e, state) => cb(state))
  },
  data: {
    info: () => ipcRenderer.invoke('tracker:data-info'),
    backupNow: () => ipcRenderer.invoke('tracker:backup-now'),
    restore: (name) => ipcRenderer.invoke('tracker:restore-backup', name),
    exportFile: () => ipcRenderer.invoke('tracker:export-backup'),
    importFile: () => ipcRenderer.invoke('tracker:import-backup'),
    openFolder: () => ipcRenderer.invoke('tracker:open-data-folder')
  }
});
