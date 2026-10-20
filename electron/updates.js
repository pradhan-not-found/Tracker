'use strict';
/* =============================================================
   Tracker: update notifications
   Tells you when a new version is out and waits for you.
   - Windows installer: downloads only after you click Download,
     installs only after you click Restart (electron-updater).
   - macOS and the portable .exe: unsigned builds cannot replace
     themselves, so Download opens the right file in the browser.
   Your data lives outside the app and is backed up before installing.
============================================================= */
const { app, net, shell, BrowserWindow } = require('electron');

const OWNER = 'pradhan-not-found';
const REPO = 'Tracker';
const RELEASES = `https://github.com/${OWNER}/${REPO}/releases`;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
// Tracker's own version (app.getVersion() can report Electron's when launched indirectly).
const APP_VERSION = require('../package.json').version;

const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const canSelfUpdate = process.platform === 'win32' && app.isPackaged && !isPortable;

function newer(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

function assetFor(platform, arch) {
  if (platform === 'darwin') return arch === 'arm64' ? 'Tracker-macos-arm64.dmg' : 'Tracker-macos-x64.dmg';
  if (platform === 'win32') return isPortable ? 'Tracker-windows-x64-portable.exe' : 'Tracker-windows-x64-setup.exe';
  return null;
}

class Updates {
  constructor({ beforeInstall, notify }) {
    this.beforeInstall = beforeInstall;
    this.notify = notify || (() => {});
    this.notified = new Set();
    this.state = { status: 'idle', current: APP_VERSION, mode: canSelfUpdate ? 'install' : 'download' };
    this.updater = null;
    this.timer = null;
    if (canSelfUpdate) this._initUpdater();
  }

  _initUpdater() {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;          // wait for the person to choose
    autoUpdater.autoInstallOnAppQuit = false;  // never install behind their back
    autoUpdater.allowPrerelease = false;
    autoUpdater.logger = null;
    autoUpdater.on('update-available', info => this._available(info.version, info.releaseNotes, null));
    autoUpdater.on('update-not-available', () => this._set({ status: 'none', checkedAt: Date.now() }));
    autoUpdater.on('download-progress', p => this._set({ status: 'downloading', percent: Math.round(p.percent || 0) }));
    autoUpdater.on('update-downloaded', info => this._set({ status: 'ready', version: info.version }));
    autoUpdater.on('error', err => this._set({ status: 'error', message: String(err?.message || err).split('\n')[0] }));
    this.updater = autoUpdater;
  }

  _set(patch) {
    const prev = this.state.status;
    this.state = { ...this.state, ...patch };
    this._announce(prev);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('tracker:update-state', this.state));
  }

  // One system notification per version and stage, so you hear about it even
  // when Tracker is in the background. Nothing installs until you choose.
  _announce(prev) {
    const { status, version } = this.state;
    if (status === prev || !version) return;
    const key = `${status}:${version}`;
    if (this.notified.has(key)) return;
    if (status === 'available' && !this.state.manual) {
      this.notified.add(key);
      this.notify(`Tracker ${version} is available`, this.state.mode === 'install'
        ? 'Open Tracker to download it. Nothing installs until you choose.'
        : 'Open Tracker to download the new version. Your data stays as it is.');
    }
    if (status === 'ready') {
      this.notified.add(key);
      this.notify('Update ready to install', `Restart Tracker when you're ready to finish updating to ${version}.`);
    }
  }

  _available(version, notes, url) {
    const text = Array.isArray(notes) ? notes.map(n => n.note).join('\n') : String(notes || '');
    this._set({
      status: 'available', version, url,
      notes: text.replace(/<[^>]+>/g, '').replace(/\r/g, '').trim().slice(0, 1200),
      releaseUrl: `${RELEASES}/tag/v${version}`,
      checkedAt: Date.now()
    });
  }

  // Ask GitHub for the latest release (used where the app can't install itself).
  async _checkGitHub() {
    const res = await net.fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': `Tracker/${APP_VERSION}` }
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const rel = await res.json();
    const version = String(rel.tag_name || '').replace(/^v/, '');
    if (!version || !newer(version, APP_VERSION)) { this._set({ status: 'none', checkedAt: Date.now() }); return; }
    const name = assetFor(process.platform, process.arch);
    const asset = (rel.assets || []).find(a => a.name === name);
    this._available(version, rel.body, asset ? asset.browser_download_url : `${RELEASES}/latest`);
  }

  async check({ manual = false } = {}) {
    if (['checking', 'downloading', 'ready'].includes(this.state.status)) return this.state;
    this._set({ status: 'checking', manual });
    try {
      if (this.updater) await this.updater.checkForUpdates();
      else await this._checkGitHub();
    } catch (err) {
      this._set({ status: 'error', message: String(err?.message || err).split('\n')[0] });
    }
    return this.state;
  }

  async download() {
    if (this.state.status !== 'available') return this.state;
    if (this.updater) {
      this._set({ status: 'downloading', percent: 0 });
      this.updater.downloadUpdate().catch(err => this._set({ status: 'error', message: String(err?.message || err) }));
    } else if (this.state.url) {
      await shell.openExternal(this.state.url);
      this._set({ status: 'opened' });
    }
    return this.state;
  }

  install() {
    if (this.state.status !== 'ready' || !this.updater) return;
    try { this.beforeInstall?.(); } catch {}
    setImmediate(() => this.updater.quitAndInstall(false, true));
  }

  start() {
    // Quietly check shortly after launch, then a few times a day. Never in development.
    if (!app.isPackaged && !process.env.TRACKER_UPDATE_TEST) return;
    setTimeout(() => this.check(), 10000).unref?.();
    this.timer = setInterval(() => this.check(), CHECK_EVERY_MS);
    this.timer.unref?.();
  }
}

module.exports = { Updates, newer };
