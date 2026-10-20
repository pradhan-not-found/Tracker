'use strict';
/* =============================================================
   Tracker: "What's new"
   - After an update, the first launch shows what changed since the
     version you used before (never on a brand-new install).
============================================================= */
const WhatsNew = {
  RELEASES: 'https://github.com/pradhan-not-found/Tracker/releases',

  _cmp(a, b) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
    return 0;
  },

  async currentVersion() {
    const st = await window.trackerDesktop?.updates?.get().catch(() => null);
    return st?.current || CHANGELOG[0].version;
  },

  // Called once per sign-in, after the app has loaded.
  async check() {
    const current = await WhatsNew.currentVersion();
    let last = await Settings.get('last_seen_version');
    if (!last) {
      // No record yet: a brand-new install stays quiet; an existing install
      // (it already has data) has just been updated from an older version.
      const hasData = (await sql('SELECT COUNT(*) FROM tracker_workspaces')).rows[0][0] > 0 ||
                      (await sql('SELECT COUNT(*) FROM tracker_activity')).rows[0][0] > 0;
      if (!hasData) { await Settings.set('last_seen_version', current); return; }
      last = '0.0.0';
    }
    if (WhatsNew._cmp(current, last) <= 0) return;
    await Settings.set('last_seen_version', current);
    const entries = CHANGELOG.filter(e => WhatsNew._cmp(e.version, current) <= 0 && WhatsNew._cmp(e.version, last) > 0);
    if (entries.length) setTimeout(() => WhatsNew.show(entries, { previous: last === '0.0.0' ? null : last }), 700);
  },

  show(entries, { previous = null } = {}) {
    const top = entries[0];
    const older = entries.slice(1);
    document.getElementById('wnKicker').textContent = previous ? `Updated from ${previous}` : 'Updated';
    document.getElementById('wnTitle').textContent = top.title || `Tracker ${top.version}`;
    document.getElementById('wnSummary').textContent = top.summary || '';
    document.getElementById('wnVersion').textContent = `Version ${top.version}`;
    document.getElementById('wnBody').innerHTML = WhatsNew._entryHtml(top) + (older.length ? `
      <div class="wn-older">
        <span class="wn-sec">Also since your last update</span>
        ${older.map(e => `<div class="wn-older-item"><b>${escH(e.version)}</b><span>${escH(e.summary || '')}</span></div>`).join('')}
      </div>` : '');
    document.getElementById('wnNotes').onclick = () => window.open(`${WhatsNew.RELEASES}/tag/v${top.version}`, '_blank');
    document.getElementById('wnOk').firstElementChild.textContent = 'Got it';
    Modal.open('modalWhatsNew');
    Motion.stagger(document.querySelectorAll('#modalWhatsNew .wn-hl, #modalWhatsNew .wn-list li'), { y: 8, duration: .5, stagger: .05, delay: .15 });
  },

  _entryHtml(e) {
    const hl = (e.highlights || []).map(h => `
      <div class="wn-hl"><span class="wn-ic">${icon(h.icon || 'sparkle', 15, 1.8)}</span>
        <span class="wn-hl-txt"><b>${escH(h.title)}</b><span>${escH(h.text)}</span></span></div>`).join('');
    const list = (title, items) => items?.length ? `<span class="wn-sec">${title}</span><ul class="wn-list">${items.map(i => `<li>${escH(i)}</li>`).join('')}</ul>` : '';
    return `${hl ? `<div class="wn-hls">${hl}</div>` : ''}${list('Improvements', e.improvements)}${list('Fixes', e.fixes)}`;
  },

  ok() { Modal.close('modalWhatsNew'); },

  // Small, safe markdown subset: headings, bullets, bold, links (as text).
  _markdown(md) {
    if (!md) return '';
    const inline = s => escH(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`([^`]+)`/g, '<code>$1</code>');
    let html = '', inList = false;
    for (const raw of String(md).split('\n')) {
      const line = raw.trim();
      if (/^\|/.test(line)) continue; // tables (download links) are skipped in-app
      const bullet = line.match(/^[-*]\s+(.*)/);
      if (bullet) { if (!inList) { html += '<ul class="wn-list">'; inList = true; } html += `<li>${inline(bullet[1])}</li>`; continue; }
      if (inList) { html += '</ul>'; inList = false; }
      const h = line.match(/^#{1,4}\s+(.*)/);
      if (h) { if (!/^download/i.test(h[1])) html += `<span class="wn-sec">${inline(h[1])}</span>`; continue; }
      if (line) html += `<p class="wn-p">${inline(line)}</p>`;
    }
    if (inList) html += '</ul>';
    return html;
  }
};
