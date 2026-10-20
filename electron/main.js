'use strict';
/* =============================================================
   Tracker — Electron main process
   Hosts ui/ in a frameless-feel window and serves the SQLite
   bridge (sql.js, persisted to the user's app-data folder).
============================================================= */
const { app, BrowserWindow, ipcMain, nativeTheme, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';
const isDev = process.argv.includes('--dev');

// Lets tests run against a throwaway data folder.
if (process.env.TRACKER_USER_DATA) app.setPath('userData', process.env.TRACKER_USER_DATA);

const ASSETS = path.join(__dirname, '..', 'assets');
// Windows wants the multi-size .ico for crisp taskbar/alt-tab icons.
const APP_ICON = path.join(ASSETS, process.platform === 'win32' ? 'icon.ico' : 'icon.png');

let db = null;
let dbPath = '';
let mainWindow = null;

// ─────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────
async function openDatabase() {
  const initSqlJs = require('sql.js/dist/sql-wasm.js');
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm').replace('app.asar', 'app.asar.unpacked');
  const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) });

  dbPath = path.join(app.getPath('userData'), 'tracker.db');
  db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
}

// Writes are coalesced: the whole database is serialised at most every 250ms,
// and always flushed before quit.
let persistTimer = null;
function flushDatabase() {
  clearTimeout(persistTimer);
  persistTimer = null;
  if (!db) return;
  const tmp = dbPath + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  fs.renameSync(tmp, dbPath);
}
function persistDatabase() {
  if (!persistTimer) persistTimer = setTimeout(flushDatabase, 250);
}

const READ_ONLY = /^\s*(SELECT|PRAGMA\s+table_info|WITH)\b/i;

// Mirrors the Swift bridge: { columns, rows } with rows as positional arrays.
function runQuery(query) {
  if (typeof query !== 'string' || !query.trim()) throw new Error('Empty query');
  const stmt = db.prepare(query);
  try {
    const columns = stmt.getColumnNames();
    const rows = [];
    while (stmt.step()) rows.push(stmt.get());
    return { columns, rows };
  } finally {
    stmt.free();
    if (!READ_ONLY.test(query)) persistDatabase();
  }
}

ipcMain.handle('tracker:query', (_e, query) => runQuery(query));
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
    if (process.platform === 'win32') app.setAppUserModelId('com.tracker.attendance');
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
}
