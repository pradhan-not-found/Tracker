'use strict';
/* =============================================================
   Tracker: updates
   Checks right after launch and a few times a day; the app asks on
   every launch until the update is installed.
   - Windows installer: downloads in the app, then installs silently
     and reopens (electron-updater). No installer screens.
   - macOS and the portable .exe: unsigned builds cannot replace
     themselves, so Tracker downloads the new file itself and opens it.
   Your data lives outside the app and is backed up before installing.
============================================================= */
const { app, net, shell, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

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
  constructor({ beforeInstall }) {
    this.beforeInstall = beforeInstall;
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
    this.state = { ...this.state, ...patch };
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('tracker:update-state', this.state));
  }

  _available(version, notes, url) {
    const text = Array.isArray(notes) ? notes.map(n => n.note).join('\n') : String(notes || '');
    this._set({
      status: 'available', version, url, file: null,
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
    this._set({ status: 'downloading', percent: 0 });
    if (this.updater) {
      this.updater.downloadUpdate().catch(err => this._set({ status: 'error', message: String(err?.message || err).split('\n')[0] }));
    } else if (this.state.url) {
      this._downloadFile(this.state.url).catch(err => this._set({ status: 'error', message: String(err?.message || err).split('\n')[0] }));
    }
    return this.state;
  }

  // macOS / portable: fetch the new .dmg or .exe into Downloads with progress.
  async _downloadFile(url) {
    const res = await net.fetch(url, { headers: { 'User-Agent': `Tracker/${APP_VERSION}` } });
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
    const total = Number(res.headers.get('content-length')) || 0;
    const name = decodeURIComponent(new URL(res.url || url).pathname.split('/').pop() || 'Tracker-update');
    const dest = path.join(app.getPath('downloads'), name);
    const part = `${dest}.download`;
    const out = fs.createWriteStream(part);
    let got = 0, lastPct = -1;
    try {
      for await (const chunk of res.body) {
        got += chunk.length;
        if (!out.write(chunk)) await new Promise(r => out.once('drain', r));
        const pct = total ? Math.floor((got / total) * 100) : 0;
        if (pct !== lastPct) { lastPct = pct; this._set({ status: 'downloading', percent: pct }); }
      }
      await new Promise((resolve, reject) => out.end(err => (err ? reject(err) : resolve())));
    } catch (err) {
      out.destroy(); try { fs.unlinkSync(part); } catch {}
      throw err;
    }
    try { fs.unlinkSync(dest); } catch {}
    fs.renameSync(part, dest);
    this._set({ status: 'ready', file: dest });
  }

  // Installs without asking anything: data is saved and backed up first.
  install() {
    if (this.state.status !== 'ready') return;
    try { this.beforeInstall?.(); } catch {}
    if (this.updater) {
      // Silent install into the same folder, then Tracker opens again.
      setImmediate(() => this.updater.quitAndInstall(true, true));
    } else if (this.state.file) {
      // macOS: the disk image opens so Tracker can be replaced in Applications.
      // Portable: the new copy starts. Either way this copy closes.
      shell.openPath(this.state.file).then(err => {
        if (err) this._set({ status: 'error', message: err });
        else setTimeout(() => app.quit(), 800);
      });
    }
  }

  start() {
    // Check right after launch, then a few times a day. Never in development.
    if (!app.isPackaged && !process.env.TRACKER_UPDATE_TEST) return;
    setTimeout(() => this.check(), 3000).unref?.();
    this.timer = setInterval(() => this.check(), CHECK_EVERY_MS);
    this.timer.unref?.();
  }
}

module.exports = { Updates, newer };
