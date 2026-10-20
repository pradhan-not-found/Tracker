'use strict';
/* =============================================================
   Tracker: Data & backups (desktop app only)
   Where the data lives, automatic backups, restore, export/import.
============================================================= */
const DataPanel = {
  get api() { return window.trackerDesktop?.data || null; },

  async open() {
    if (!DataPanel.api) { toast('Backups are available in the desktop app', 'info'); return; }
    Modal.open('modalData');
    await DataPanel.render();
  },

  async render() {
    const info = await DataPanel.api.info();
    const reasonLabel = { launch: 'At launch', auto: 'Automatic', exit: 'When Tracker closed', 'before-update': 'Before an update', manual: 'Manual', 'before-restore': 'Before a restore', 'before-import': 'Before an import' };
    document.getElementById('dataPath').textContent = info.dbPath;
    document.getElementById('dataSize').textContent = fmtBytes(info.size);
    document.getElementById('dataLast').textContent = info.lastBackupAt ? timeAgo(new Date(info.lastBackupAt).toISOString()) : 'Never';
    document.getElementById('dataCount').textContent = plural(info.backups.length, 'backup');
    document.getElementById('dataBackups').innerHTML = info.backups.length ? info.backups.map(b => `
      <div class="bk-row">
        <span class="bk-ic">${icon('clock', 14)}</span>
        <span class="bk-main"><span class="bk-date">${escH(new Date(b.mtime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))}</span>
          <span class="bk-sub">${escH(reasonLabel[b.reason] || 'Backup')} · ${fmtBytes(b.size)}</span></span>
        <button class="btn btn-soft btn-sm" onclick="DataPanel.restore('${escA(b.name)}')">Restore</button>
      </div>`).join('')
      : `<div class="act-empty"><span class="act-empty-ic">${icon('clock', 16)}</span><span>No backups yet. They're made automatically as you work and when Tracker closes.</span></div>`;
  },

  async backupNow(btn) {
    btn.disabled = true;
    try { await DataPanel.api.backupNow(); toast('Backup saved', 'success'); await DataPanel.render(); }
    catch (err) { toast('Backup failed: ' + err.message, 'error'); }
    finally { btn.disabled = false; }
  },

  async restore(name) {
    const ok = await Confirm.ask({
      title: 'Restore this backup?',
      body: 'Your data will go back to how it was at that moment. Your current data is backed up first, so you can undo this.',
      action: 'Restore'
    });
    if (!ok) return;
    await DataPanel._swap(() => DataPanel.api.restore(name), 'Backup restored');
  },

  async exportFile() {
    try {
      const file = await DataPanel.api.exportFile();
      if (file) toast('Backup file saved', 'success');
    } catch (err) { toast('Could not save the backup: ' + err.message, 'error'); }
  },

  async importFile() {
    const ok = await Confirm.ask({
      title: 'Restore from a backup file?',
      body: 'All data on this computer will be replaced by the file you choose. Your current data is backed up first.',
      action: 'Choose file'
    });
    if (!ok) return;
    await DataPanel._swap(() => DataPanel.api.importFile(), 'Data restored from file');
  },

  // Replace the database, keep the current person signed in if they exist in it, then reload.
  async _swap(fn, message) {
    const email = _currentUser?.email;
    try {
      const res = await fn();
      if (res === null) return; // cancelled
      const rows = email ? await sqlObjects(`SELECT email FROM tracker_users WHERE email='${esc(email)}' LIMIT 1`) : [];
      await Schema.init();
      if (rows.length) await Settings.set('session', { email, since: nowIso() });
      try { sessionStorage.setItem('tracker_notice', message); } catch {}
      location.reload();
    } catch (err) {
      toast('That did not work: ' + err.message, 'error');
    }
  },

  // Tell the person if their data had to be recovered when the app opened.
  async announce() {
    try {
      const notice = sessionStorage.getItem('tracker_notice');
      if (notice) { sessionStorage.removeItem('tracker_notice'); toast(notice, 'success'); }
    } catch {}
    if (!DataPanel.api) return;
    const info = await DataPanel.api.info();
    if (!info.recovery) return;
    const seen = await Settings.get('recovery_seen');
    if (seen === info.recovery.at) return;
    await Settings.set('recovery_seen', info.recovery.at);
    toast(info.recovery.restoredFrom
      ? 'Your data was recovered from the latest backup.'
      : 'Your data file could not be read and no backup was available.', info.recovery.restoredFrom ? 'info' : 'error');
  }
};
