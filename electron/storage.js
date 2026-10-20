'use strict';
/* =============================================================
   Tracker: durable storage for the SQLite database
   - durable writes (temp file + fsync + atomic rename)
   - integrity check on open, automatic recovery from backups
   - rotating backups in <userData>/backups
============================================================= */
const path = require('path');
const fs = require('fs');

const KEEP_BACKUPS = 30;
const BACKUP_EVERY_MS = 4 * 60 * 60 * 1000;   // periodic, while the app is running
const BACKUP_AFTER_EDIT_MS = 30 * 60 * 1000;   // after changes: at most this much work is ever at risk
const BACKUP_RE = /^tracker-\d{8}-\d{6}(?:-[a-z-]+)?\.db$/;

function stamp(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Write bytes so that a crash or power cut leaves either the old file or the new one, never half of each.
function writeFileDurable(file, bytes) {
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, bytes, 0, bytes.length, 0);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
  try { // make the rename itself durable where the OS supports it
    const dfd = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
  } catch {}
}

class Storage {
  constructor(SQL, userData) {
    this.SQL = SQL;
    this.dir = userData;
    this.dbPath = path.join(userData, 'tracker.db');
    this.backupDir = path.join(userData, 'backups');
    this.db = null;
    this.dirty = false;
    this.changedSinceBackup = false;
    this.persistTimer = null;
    this.editBackupTimer = null;
    this.backupTimer = null;
    this.lastBackupAt = 0;
    this.recovery = null; // set when the database had to be restored on open
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  // ── open / validate ─────────────────────────────────────────
  _load(bytes) {
    const db = new this.SQL.Database(bytes);
    const res = db.exec('PRAGMA integrity_check');
    const ok = res[0]?.values?.[0]?.[0] === 'ok';
    if (!ok) { db.close(); throw new Error('Integrity check failed'); }
    return db;
  }

  open() {
    const exists = fs.existsSync(this.dbPath);
    if (exists) {
      try {
        this.db = this._load(fs.readFileSync(this.dbPath));
      } catch (err) {
        // Keep the damaged file for inspection, then fall back to the newest good backup.
        const kept = `${this.dbPath}.damaged-${stamp()}`;
        try { fs.copyFileSync(this.dbPath, kept); } catch {}
        this.db = this._restoreLatest(`The database could not be read (${err.message}).`);
      }
    } else if (this.listBackups().length) {
      // The database file is missing but backups exist: bring the data back.
      this.db = this._restoreLatest('The database file was missing.');
    }
    if (!this.db) this.db = new this.SQL.Database();
    this.db.run('PRAGMA foreign_keys = ON');
    if (this.recovery) this.flush();
    this.lastBackupAt = this.listBackups()[0]?.mtime || 0;
    return this.db;
  }

  _restoreLatest(reason) {
    for (const b of this.listBackups()) {
      try {
        const db = this._load(fs.readFileSync(path.join(this.backupDir, b.name)));
        this.recovery = { reason, restoredFrom: b.name, at: new Date().toISOString() };
        return db;
      } catch {}
    }
    this.recovery = { reason, restoredFrom: null, at: new Date().toISOString() };
    return null;
  }

  // ── writes ─────────────────────────────────────────────────
  markDirty() {
    this.dirty = true;
    this.changedSinceBackup = true;
    if (!this.persistTimer) this.persistTimer = setTimeout(() => this.flush(), 250);
    // Back up soon after changes, never more often than every 30 minutes.
    if (!this.editBackupTimer) {
      const wait = Math.max(5000, BACKUP_AFTER_EDIT_MS - (Date.now() - this.lastBackupAt));
      this.editBackupTimer = setTimeout(() => { this.editBackupTimer = null; this.backup('auto'); }, wait);
      this.editBackupTimer.unref?.();
    }
  }

  // True once the person has created anything (an account at least).
  _hasData() {
    try {
      const r = this.db.exec("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tracker_users'");
      if (!r[0]?.values?.[0]?.[0]) return false;
      return this.db.exec('SELECT COUNT(*) FROM tracker_users')[0].values[0][0] > 0;
    } catch { return false; }
  }

  flush() {
    clearTimeout(this.persistTimer);
    this.persistTimer = null;
    if (!this.db) return;
    writeFileDurable(this.dbPath, Buffer.from(this.db.export()));
    this.dirty = false;
  }

  // ── backups ────────────────────────────────────────────────
  listBackups() {
    let names = [];
    try { names = fs.readdirSync(this.backupDir).filter(n => BACKUP_RE.test(n)); } catch {}
    return names.map(name => {
      const st = fs.statSync(path.join(this.backupDir, name));
      const reason = (name.match(/-\d{6}-([a-z-]+)\.db$/) || [])[1] || 'manual';
      return { name, size: st.size, mtime: st.mtimeMs, reason };
    }).sort((a, b) => b.mtime - a.mtime);
  }

  backup(reason = 'manual') {
    if (!this.db) return null;
    if (reason !== 'manual' && !this._hasData()) return null; // nothing worth keeping yet
    const name = `tracker-${stamp()}-${reason}.db`;
    writeFileDurable(path.join(this.backupDir, name), Buffer.from(this.db.export()));
    this.lastBackupAt = Date.now();
    this.changedSinceBackup = false;
    this._prune();
    return name;
  }

  _prune() {
    this.listBackups().slice(KEEP_BACKUPS).forEach(b => {
      try { fs.unlinkSync(path.join(this.backupDir, b.name)); } catch {}
    });
  }

  startSchedule() {
    // One backup per launch (unless one was made in the last hour), then every few hours.
    if (Date.now() - this.lastBackupAt > 60 * 60 * 1000) this.backup('launch');
    this.backupTimer = setInterval(() => { if (this.changedSinceBackup) this.backup('auto'); }, BACKUP_EVERY_MS);
    this.backupTimer.unref?.();
  }

  _backupPath(name) {
    if (!BACKUP_RE.test(String(name))) throw new Error('Unknown backup');
    const p = path.join(this.backupDir, path.basename(name));
    if (!fs.existsSync(p)) throw new Error('Backup not found');
    return p;
  }

  // Replace the live database with `bytes` after validating them. The current data is backed up first.
  replaceWith(bytes, reason) {
    const next = this._load(bytes);
    this.backup(reason);
    this.db.close();
    this.db = next;
    this.db.run('PRAGMA foreign_keys = ON');
    this.flush();
  }

  restore(name) {
    this.replaceWith(fs.readFileSync(this._backupPath(name)), 'before-restore');
  }

  info() {
    let size = 0;
    try { size = fs.statSync(this.dbPath).size; } catch {}
    return {
      dbPath: this.dbPath,
      dataDir: this.dir,
      backupDir: this.backupDir,
      size,
      backups: this.listBackups(),
      lastBackupAt: this.lastBackupAt || null,
      recovery: this.recovery
    };
  }

  // Safe to call repeatedly (window close, quit, sleep, exit): only writes what changed.
  close() {
    clearTimeout(this.editBackupTimer);
    this.editBackupTimer = null;
    if (this.dirty) this.flush();
    if (this.changedSinceBackup) this.backup('exit');
  }
}

module.exports = { Storage };
