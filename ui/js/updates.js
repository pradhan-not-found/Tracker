'use strict';
/* =============================================================
   Tracker: updates (desktop app only)
   - A new version opens the update window on every launch until it
     is installed. "Later" only hides it until Tracker opens again.
   - Once downloaded, Tracker restarts on its own after a short
     countdown and installs silently. Nothing to confirm: your data
     is saved and backed up first.
============================================================= */
const Updater = {
  get api() { return window.trackerDesktop?.updates || null; },
  state: null,
  promptedFor: null,   // version the update window was shown for this session
  hidden: false,       // card closed for this session
  countdown: null,
  RESTART_IN: 5,

  async init() {
    if (!Updater.api) return;
    Updater.api.onState(st => Updater.apply(st));
    Updater.apply(await Updater.api.get());
  },

  _logo(size = 14) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><rect width="24" height="24" fill="currentColor" mask="url(#tracker-mark-cut)"/></svg>`;
  },

  apply(st) {
    const prev = Updater.state;
    Updater.state = st;

    // Results of a manual check are reported with a toast.
    if (st.manual && prev?.status === 'checking') {
      if (st.status === 'none') toast(`You're up to date. Tracker ${st.current} is the latest version.`, 'success');
      if (st.status === 'error') toast(`Couldn't check for updates: ${st.message}`, 'error');
    }
    if (st.status === 'error' && prev?.status === 'downloading') toast(`The update couldn't be downloaded: ${st.message}`, 'error');

    // A new version: open the update window once per launch.
    if (st.status === 'available' && (Updater.promptedFor !== st.version || st.manual)) {
      Updater.promptedFor = st.version;
      Updater.prompt();
    }
    if (st.status === 'ready' && prev?.status !== 'ready') Updater.startCountdown();
    Updater.render();
  },

  render() {
    const st = Updater.state;
    const el = document.getElementById('updateCard');
    if (!el || !st) return;
    const logo = `<span class="upd-ic upd-ic-logo">${Updater._logo()}</span>`;
    let html = '';
    if (st.status === 'available') {
      if (Updater.hidden) { Updater.hide(); return; }
      html = `
        <div class="upd-hd">${logo}<span class="upd-title">Tracker ${escH(st.version)} is available</span>
          <button class="icon-btn icon-btn-xs" onclick="Updater.close()" title="Later" aria-label="Later">${icon('x', 12, 2)}</button></div>
        <p class="upd-text">You're on ${escH(st.current)}. Updating takes a moment and your data stays exactly as it is.</p>
        <div class="upd-actions">
          <button class="rich-btn rich-btn-sm" onclick="Updater.download()"><span>Update now</span></button>
          <button class="btn btn-ghost btn-sm" onclick="Updater.prompt()">What's new</button>
        </div>`;
    } else if (st.status === 'downloading') {
      html = `
        <div class="upd-hd">${logo}<span class="upd-title">Downloading ${escH(st.version || 'update')}</span><span class="upd-pct">${st.percent || 0}%</span></div>
        <span class="progress"><i style="width:${st.percent || 0}%"></i></span>
        <p class="upd-text">You can keep working. Tracker restarts by itself when it's ready.</p>`;
    } else if (st.status === 'ready') {
      const secs = Updater.countdown?.left ?? 0;
      const mac = window.trackerDesktop?.platform === 'darwin';
      html = `
        <div class="upd-hd"><span class="upd-ic upd-ic-ready">${icon('check', 14, 2.2)}</span><span class="upd-title">${secs ? `Restarting in ${secs}s` : 'Restarting…'}</span></div>
        <p class="upd-text">${st.mode === 'install'
          ? `Tracker ${escH(st.version)} installs and opens again. Your data is saved and backed up.`
          : mac
            ? `Tracker ${escH(st.version)} opens in a new window: drag Tracker to Applications to finish.`
            : `Tracker ${escH(st.version)} opens in place of this copy. Your data stays as it is.`}</p>
        <div class="upd-actions">
          <button class="rich-btn rich-btn-sm" onclick="Updater.install()"><span>Restart now</span></button>
        </div>`;
    } else {
      Updater.hide(); return;
    }
    const show = el.style.display === 'none' || !el.innerHTML;
    el.innerHTML = html;
    el.style.display = '';
    if (show) Motion.from(el, { opacity: 0, y: 10, duration: .5, ease: 'power3.out' });
  },

  // The update window: logo, version, release notes, "Update now".
  prompt() {
    const st = Updater.state;
    if (!st || st.status !== 'available') return;
    document.getElementById('updTitle').textContent = `Tracker ${st.version} is available`;
    document.getElementById('updSub').textContent = `You're on ${st.current}. Your data stays exactly as it is.`;
    document.getElementById('updNotes').innerHTML = WhatsNew._markdown(st.notes) ||
      `<p class="wn-p">This update includes improvements and fixes.</p>`;
    Modal.open('modalUpdate');
  },

  later() {
    Modal.close('modalUpdate');
    toast('You can update anytime from the card in the sidebar.', 'info');
  },

  close() { Updater.hidden = true; Updater.hide(); },

  hide() {
    const el = document.getElementById('updateCard');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  },

  async check() {
    if (!Updater.api) return;
    Updater.hidden = false;
    toast('Checking for updates…', 'info');
    await Updater.api.check();
  },

  async download() {
    Modal.close('modalUpdate');
    Updater.hidden = false;
    await Updater.api.download();
  },

  startCountdown() {
    clearInterval(Updater.countdown?.timer);
    Updater.countdown = { left: Updater.RESTART_IN };
    Updater.countdown.timer = setInterval(() => {
      Updater.countdown.left -= 1;
      if (Updater.countdown.left <= 0) Updater.install();
      else Updater.render();
    }, 1000);
  },

  install() {
    clearInterval(Updater.countdown?.timer);
    if (Updater.countdown) Updater.countdown.left = 0;
    Updater.render();
    Updater.api.install();
  },

  // "What's new" on the card.
  notes() { Updater.prompt(); }
};
