'use strict';
/* =============================================================
   Tracker: update banner (desktop app only)
   Shows when a new version is out, then waits for you to choose.
============================================================= */
const Updater = {
  get api() { return window.trackerDesktop?.updates || null; },
  state: null,

  async init() {
    if (!Updater.api) return;
    Updater.api.onState(st => Updater.apply(st));
    Updater.apply(await Updater.api.get());
  },

  async dismissed() { return (await Settings.get('update_dismissed')) || null; },

  async apply(st) {
    const prev = Updater.state;
    Updater.state = st;
    const el = document.getElementById('updateCard');
    if (!el) return;

    // Results of a manual check are reported with a toast.
    if (st.manual && prev?.status === 'checking') {
      if (st.status === 'none') toast(`You're up to date. Tracker ${st.current} is the latest version.`, 'success');
      if (st.status === 'error') toast(`Couldn't check for updates: ${st.message}`, 'error');
    }

    let html = '';
    if (st.status === 'available') {
      if (!st.manual && (await Updater.dismissed()) === st.version) { Updater.hide(); return; }
      html = `
        <div class="upd-hd"><span class="upd-ic">${icon('sparkle', 14, 1.8)}</span><span class="upd-title">Tracker ${escH(st.version)} is available</span>
          <button class="icon-btn icon-btn-xs" onclick="Updater.later()" title="Later" aria-label="Remind me later">${icon('x', 12, 2)}</button></div>
        <p class="upd-text">You're on ${escH(st.current)}. ${st.mode === 'install' ? 'Download it now and install when you’re ready.' : 'Download the new version and open it to update.'} Your data stays exactly as it is.</p>
        <div class="upd-actions">
          <button class="rich-btn rich-btn-sm" onclick="Updater.download()"><span>${st.mode === 'install' ? 'Download' : 'Download update'}</span></button>
          <button class="btn btn-ghost btn-sm" onclick="Updater.notes()">What's new</button>
        </div>`;
    } else if (st.status === 'downloading') {
      html = `
        <div class="upd-hd"><span class="upd-ic">${icon('download', 14, 1.8)}</span><span class="upd-title">Downloading ${escH(st.version || Updater.state.version || 'update')}</span><span class="upd-pct">${st.percent || 0}%</span></div>
        <span class="progress"><i style="width:${st.percent || 0}%"></i></span>
        <p class="upd-text">You can keep working. We'll ask before restarting.</p>`;
    } else if (st.status === 'ready') {
      html = `
        <div class="upd-hd"><span class="upd-ic upd-ic-ready">${icon('check', 14, 2.2)}</span><span class="upd-title">Update ready</span></div>
        <p class="upd-text">Tracker ${escH(st.version)} is downloaded. Restart to finish. Your data is backed up first.</p>
        <div class="upd-actions">
          <button class="rich-btn rich-btn-sm" onclick="Updater.install()"><span>Restart to update</span></button>
          <button class="btn btn-ghost btn-sm" onclick="Updater.hide()">Later</button>
        </div>`;
    } else if (st.status === 'opened') {
      html = `
        <div class="upd-hd"><span class="upd-ic">${icon('download', 14, 1.8)}</span><span class="upd-title">Download started in your browser</span>
          <button class="icon-btn icon-btn-xs" onclick="Updater.hide()" aria-label="Close">${icon('x', 12, 2)}</button></div>
        <p class="upd-text">${window.trackerDesktop?.platform === 'darwin'
          ? 'Open the .dmg and drag Tracker to Applications, replacing the old one.'
          : 'Run the new file. Your data stays exactly as it is.'}</p>`;
    } else {
      Updater.hide(); return;
    }
    const show = el.style.display === 'none' || !el.innerHTML;
    el.innerHTML = html;
    el.style.display = '';
    if (show) Motion.from(el, { opacity: 0, y: 10, duration: .5, ease: 'power3.out' });
  },

  hide() {
    const el = document.getElementById('updateCard');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  },

  async later() {
    if (Updater.state?.version) await Settings.set('update_dismissed', Updater.state.version);
    Updater.hide();
  },

  async check() {
    if (!Updater.api) return;
    toast('Checking for updates…', 'info');
    await Updater.api.check();
  },

  async download() { await Updater.api.download(); },

  async install() {
    const ok = await Confirm.ask({
      title: 'Restart to update?',
      body: 'Tracker will close, install the update and open again. Your data is saved and backed up first.',
      action: 'Restart now'
    });
    if (ok) Updater.api.install();
  },

  // Shows the next version's release notes inside Tracker.
  notes() {
    if (Updater.state) WhatsNew.showRemote(Updater.state);
  }
};
