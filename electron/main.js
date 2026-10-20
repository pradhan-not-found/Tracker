'use strict';
/* =============================================================
   Tracker — Electron main process
   Hosts ui/ in a frameless-feel window and serves the SQLite
   bridge (sql.js, stored durably in the user's app-data folder,
   with automatic backups: see storage.js).
============================================================= */
const { app, BrowserWindow, ipcMain, nativeTheme, shell, Menu, dialog, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const { Storage } = require('./storage');

const isMac = process.platform === 'darwin';
const isDev = process.argv.includes('--dev');

// Lets tests run against a throwaway data folder.
if (process.env.TRACKER_USER_DATA) app.setPath('userData', process.env.TRACKER_USER_DATA);

const APP_ID = 'com.tracker.attendance';
const ASSETS = path.join(__dirname, '..', 'assets');
// Windows wants the multi-size .ico for crisp taskbar/alt-tab icons.
const APP_ICON = path.join(ASSETS, process.platform === 'win32' ? 'icon.ico' : 'icon.png');

let storage = null;
let mainWindow = null;

// ─────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────
async function openDatabase() {
  const initSqlJs = require('sql.js/dist/sql-wasm.js');
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm').replace('app.asar', 'app.asar.unpacked');
  const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) });
  storage = new Storage(SQL, app.getPath('userData'));
  storage.open();
  storage.startSchedule();
}

function flushDatabase() {
  try { storage?.close(); } catch (err) { console.error('Could not save the database', err); }
}

const READ_ONLY = /^\s*(SELECT|PRAGMA\s+table_info|WITH)\b/i;

// Mirrors the Swift bridge: { columns, rows } with rows as positional arrays.
function runQuery(query) {
  if (typeof query !== 'string' || !query.trim()) throw new Error('Empty query');
  const stmt = storage.db.prepare(query);
  try {
    const columns = stmt.getColumnNames();
    const rows = [];
    while (stmt.step()) rows.push(stmt.get());
    return { columns, rows };
  } finally {
    stmt.free();
    if (!READ_ONLY.test(query)) storage.markDirty();
  }
}

ipcMain.handle('tracker:query', (_e, query) => runQuery(query));
// ── data & backups ──────────────────────────────────────────
ipcMain.handle('tracker:data-info', () => storage.info());
ipcMain.handle('tracker:backup-now', () => { storage.flush(); return storage.backup('manual'); });
ipcMain.handle('tracker:open-data-folder', () => shell.openPath(storage.dir));
ipcMain.handle('tracker:restore-backup', (_e, name) => { storage.restore(name); return true; });

ipcMain.handle('tracker:export-backup', async e => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const d = new Date();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save a backup of your Tracker data',
    defaultPath: path.join(app.getPath('documents'), `Tracker backup ${d.toISOString().slice(0, 10)}.trackerdb`),
    filters: [{ name: 'Tracker backup', extensions: ['trackerdb', 'db'] }]
  });
  if (canceled || !filePath) return null;
  storage.flush();
  fs.copyFileSync(storage.dbPath, filePath);
  return filePath;
});

ipcMain.handle('tracker:import-backup', async e => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Restore Tracker data from a backup file',
    properties: ['openFile'],
    filters: [{ name: 'Tracker backup', extensions: ['trackerdb', 'db', 'sqlite'] }]
  });
  if (canceled || !filePaths?.[0]) return null;
  storage.replaceWith(fs.readFileSync(filePaths[0]), 'before-import');
  return path.basename(filePaths[0]);
});

ipcMain.handle('tracker:open-external', (_e, url) => {
  if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
});
ipcMain.on('tracker:window', (e, action) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  if (action === 'minimize') win.minimize();
  if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
  if (action === 'close') win.close();
});

// ─────────────────────────────────────────────────────────────
// WINDOW
// ─────────────────────────────────────────────────────────────
function themeColors() {
  return nativeTheme.shouldUseDarkColors
    ? { bg: '#171717', symbol: '#EAE8E3' }
    : { bg: '#FAF9F6', symbol: '#2E2E2D' };
}

function createWindow() {
  const colors = themeColors();
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 860,
    minWidth: 1020,
    minHeight: 660,
    show: false,
    title: 'Tracker',
    backgroundColor: colors.bg,
    autoHideMenuBar: true,
    // Native controls on both platforms; the page draws its own title bar.
    titleBarStyle: 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 16, y: 14 } }
      : { titleBarOverlay: { color: '#00000000', symbolColor: colors.symbol, height: 40 } }),
    icon: isMac ? undefined : APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  // Windows groups taskbar buttons by AppUserModelID and, without a matching
  // shortcut (e.g. `npm start`), falls back to electron.exe's icon. Give the
  // window explicit taskbar details so Tracker's icon always shows.
  if (process.platform === 'win32') {
    mainWindow.setAppDetails({
      appId: APP_ID,
      appIconPath: path.join(ASSETS, 'icon.ico'),
      appIconIndex: 0,
      relaunchDisplayName: 'Tracker'
    });
  }

  // Save any pending change the moment the window starts closing.
  mainWindow.on('close', flushDatabase);

  mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });

  const sendState = () => mainWindow.webContents.send('tracker:window-state', {
    maximized: mainWindow.isMaximized(),
    fullscreen: mainWindow.isFullScreen()
  });
  ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach(ev => mainWindow.on(ev, sendState));
}

nativeTheme.on('updated', () => {
  if (!mainWindow || isMac) return;
  const colors = themeColors();
  mainWindow.setTitleBarOverlay({ color: '#00000000', symbolColor: colors.symbol, height: 40 });
});

ipcMain.on('tracker:theme', (_e, mode) => {
  nativeTheme.themeSource = ['light', 'dark'].includes(mode) ? mode : 'system';
});

function buildMenu() {
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─────────────────────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
    // Packaged builds take the icon from the bundle; in development show ours, not Electron's.
    if (isMac && !app.isPackaged) app.dock?.setIcon(path.join(ASSETS, 'icon-mac.png'));
    app.setAboutPanelOptions({
      applicationName: 'Tracker',
      applicationVersion: app.getVersion(),
      copyright: 'Your data stays on this computer.',
      iconPath: path.join(ASSETS, isMac ? 'icon-mac.png' : 'icon.png')
    });
    await openDatabase();
    buildMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });

  app.on('before-quit', flushDatabase);
  // Never lose the last edits to sleep, shutdown, logoff or a crash.
  app.whenReady().then(() => {
    ['suspend', 'shutdown', 'lock-screen'].forEach(ev => powerMonitor.on(ev, flushDatabase));
  });
  process.on('exit', flushDatabase);
  process.on('uncaughtException', err => { console.error(err); flushDatabase(); });
}
