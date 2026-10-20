'use strict';
/* =============================================================
   Tracker — activity log (every change is tracked) + reminders
============================================================= */
// icon + tone (a pill tint) per action, so the timeline reads at a glance
const ACTION_META = {
  'workspace.create': { icon: 'folderAdd', tone: 'gray',   verb: 'created workspace' },
  'workspace.delete': { icon: 'rowDel',    tone: 'red',    verb: 'deleted workspace' },
  'sheet.create':     { icon: 'sheetAdd',  tone: 'gray',   verb: 'created sheet' },
  'sheet.delete':     { icon: 'rowDel',    tone: 'red',    verb: 'deleted sheet' },
  'row.create':       { icon: 'rowAdd',    tone: 'green',  verb: 'added a record to' },
  'row.update':       { icon: 'rowEdit',   tone: 'blue',   verb: 'edited' },
  'row.delete':       { icon: 'rowDel',    tone: 'red',    verb: 'deleted a record from' },
  'column.add':       { icon: 'colEdit',   tone: 'violet', verb: 'added a column to' },
  'column.rename':    { icon: 'colEdit',   tone: 'violet', verb: 'renamed a column in' },
  'column.delete':    { icon: 'colEdit',   tone: 'red',    verb: 'removed a column from' },
  'column.update':    { icon: 'colEdit',   tone: 'violet', verb: 'changed a column in' },
  'import':           { icon: 'importIn',  tone: 'amber',  verb: 'imported into' },
  'export':           { icon: 'exportOut', tone: 'amber',  verb: 'exported' }
};

const Activity = {
  async log(action, { ws = S.activeWs, table = null, rowId = null, detail = null } = {}) {
    try {
      await sql(`INSERT INTO tracker_activity (at, user_email, workspace_id, table_name, row_id, action, detail)
        VALUES ('${nowIso()}', ${sqlv(_currentUser?.email)}, ${ws ? ws.id : 'NULL'}, ${sqlv(table)}, ${rowId ?? 'NULL'},
        '${esc(action)}', ${sqlv(detail ? JSON.stringify(detail) : null)})`);
      Inbox.bump();
    } catch (err) { console.warn('activity log failed', err); }
  },

  async list({ wsId = null, table = null, rowId = null, limit = 200 } = {}) {
    const where = [];
    const myWs = S.workspaces.map(w => w.id);
    if (wsId) where.push(`workspace_id=${wsId}`);
    else where.push(`(workspace_id IS NULL OR workspace_id IN (${myWs.join(',') || 'NULL'}))`);
    if (table) where.push(`table_name='${esc(table)}'`);
    if (rowId !== null) where.push(`row_id=${rowId}`);
    const rows = await sqlObjects(`SELECT * FROM tracker_activity WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ${limit}`);
    return rows.map(r => { let d = null; try { d = r.detail ? JSON.parse(r.detail) : null; } catch {} return { ...r, detail: d }; });
  },

  sheetName(table) {
    const s = S.allSheets.find(x => x.fullName === table);
    return s ? s.displayName : (table ? table.replace(/^ws_[^_]+_/, '').replace(/_/g, ' ') : '');
  },

  describe(a) {
    const meta = ACTION_META[a.action] || { icon: 'info', tone: 'gray', verb: a.action };
    const d = a.detail || {};
    let target = '';
    if (a.action.startsWith('workspace')) target = d.name || '';
    else if (a.action === 'export') target = d.what || Activity.sheetName(a.table_name);
    else target = d.sheet || Activity.sheetName(a.table_name);
    let extra = '';
    if (a.action === 'row.update' && d.column) extra = `<span class="act-change"><b>${escH(d.column)}</b> ${d.from ? `<s>${escH(String(d.from).slice(0, 40))}</s> → ` : '→ '}${escH(String(d.to ?? '').slice(0, 60)) || '<i>empty</i>'}</span>`;
    if (a.action.startsWith('column') && d.column) extra = `<span class="act-change"><b>${escH(d.column)}</b>${d.to ? ' → ' + escH(d.to) : ''}${d.kind ? ' · ' + escH(KINDS[d.kind]?.label || d.kind) : ''}</span>`;
    if (a.action === 'import' && d.count !== undefined) extra = `<span class="act-change">${plural(d.count, 'record')}${d.file ? ' from ' + escH(d.file) : ''}</span>`;
    if (a.action === 'export' && d.format) extra = `<span class="act-change">as ${escH(d.format)}</span>`;
    if (a.action === 'row.create' && d.label) extra = `<span class="act-change">${escH(d.label)}</span>`;
    if (a.action === 'row.delete' && d.label) extra = `<span class="act-change"><s>${escH(d.label)}</s></span>`;
    const who = a.user_email === _currentUser?.email ? 'You' : escH(a.user_email || 'Someone');
    return { icon: meta.icon, tone: meta.tone, html: `<span class="act-who">${who}</span> ${meta.verb} <span class="act-target">${escH(target)}</span>`, extra };
  },

  renderList(items, { compact = false } = {}) {
    if (!items.length) return `<div class="act-empty"><span class="act-empty-ic">${icon('activity', 17, 1.7)}</span><span>No activity yet. Every record you add, edit or delete is tracked here.</span></div>`;
    let html = '', lastDay = '';
    items.forEach(a => {
      const day = todayStr(new Date(a.at));
      if (!compact && day !== lastDay) {
        lastDay = day;
        const label = day === todayStr() ? 'Today' : day === todayStr(new Date(Date.now() - 864e5)) ? 'Yesterday' : fmtDate(day);
        html += `<div class="act-day">${label}</div>`;
      }
      const d = Activity.describe(a);
      const clickable = a.table_name && a.action !== 'sheet.delete' && S.allSheets.some(s => s.fullName === a.table_name);
      html += `<div class="act-item${clickable ? ' clickable' : ''}" ${clickable ? `onclick="App.openFromActivity('${escA(a.table_name)}', ${a.row_id ?? 'null'}, ${a.workspace_id ?? 'null'})"` : ''}>
        <span class="act-ic pill-${d.tone}">${icon(d.icon, 14, 1.75)}</span>
        <div class="act-body"><div class="act-line">${d.html}</div>${d.extra}</div>
        <span class="act-time" title="${escA(new Date(a.at).toLocaleString())}">${compact ? timeAgo(a.at) : fmtTime(a.at)}</span>
      </div>`;
    });
    return html;
  }
};

// ─────────────────────────────────────────────────────────────
// INBOX  — reminders for due / overdue items + recent activity
// ─────────────────────────────────────────────────────────────
const Inbox = {
  items: [],      // [{ ws, sheet, rowId, label, date, overdue }]
  _notified: false,

  async scan() {
    const out = [];
    const today = parseDay(todayStr());
    for (const sh of S.allSheets) {
      try {
        const cols = await Schema.columns(sh.fullName);
        const dc = deadlineCol(cols, sh.template);
        const cc = completionCol(cols);
        if (!dc || !cc) continue;
        const pc = primaryCol(cols);
        const rows = await sqlObjects(`SELECT * FROM ${qi(sh.fullName)} WHERE ${qi(dc.name)} IS NOT NULL AND ${qi(dc.name)} <> '' AND ${qi(dc.name)} <= '${todayStr()}' LIMIT 500`);
        rows.forEach(r => {
          if (isRowDone(cc, r)) return;
          const d = parseDay(r[dc.name]);
          if (!d) return;
          out.push({ ws: sh.wsId, wsName: sh.wsName, sheet: sh.fullName, sheetName: sh.displayName, rowId: r.id,
            label: String(r[pc?.name] ?? '') || `Record #${r.id}`, date: r[dc.name], overdue: d < today });
        });
      } catch {}
    }
    out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    Inbox.items = out;
    Inbox.renderBadge();
    if (!Inbox._notified && out.length) {
      Inbox._notified = true;
      const overdue = out.filter(i => i.overdue).length, due = out.length - overdue;
      const msg = [due && `${due} due today`, overdue && `${overdue} overdue`].filter(Boolean).join(' · ');
      toast(`Reminders: ${msg}`, 'info');
      try {
        if ('Notification' in window) {
          const show = () => new Notification('Tracker', { body: `You have ${msg}.`, silent: false });
          if (Notification.permission === 'granted') show();
          else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => p === 'granted' && show());
        }
      } catch {}
    }
  },

  unseen: 0,
  bump() { Inbox.unseen++; Inbox.renderBadge(); },

  renderBadge() {
    const n = Inbox.items.length;
    const b = document.getElementById('inboxBadge');
    b.textContent = n > 99 ? '99+' : n;
    b.style.display = n ? '' : 'none';
    b.classList.toggle('urgent', Inbox.items.some(i => i.overdue));
  },

  async open(anchor) {
    const recent = await Activity.list({ limit: 6 });
    const rem = Inbox.items.slice(0, 12);
    const remHtml = rem.length ? rem.map(i => `
      <button class="inbox-item" onclick="Pop.close();App.openFromActivity('${escA(i.sheet)}', ${i.rowId}, ${i.ws})">
        <span class="inbox-dot ${i.overdue ? 'overdue' : 'today'}"></span>
        <span class="inbox-main"><span class="inbox-label">${escH(i.label)}</span><span class="inbox-sub">${escH(i.sheetName)} · ${escH(i.wsName)}</span></span>
        <span class="inbox-when ${i.overdue ? 'overdue' : ''}">${i.overdue ? 'Overdue · ' + escH(fmtDate(i.date)) : 'Today'}</span>
      </button>`).join('')
      : `<div class="inbox-empty">${icon('check', 16, 2)}<span>You're all caught up</span></div>`;
    Pop.open(anchor, `
      <div class="inbox-hd"><span>Reminders</span><span class="sb-count">${Inbox.items.length}</span></div>
      <div class="inbox-list">${remHtml}</div>
      <div class="inbox-hd inbox-hd-2"><span>Recent activity</span><button class="link-btn" onclick="Pop.close();App.showActivity()">View all</button></div>
      <div class="inbox-act">${Activity.renderList(recent, { compact: true })}</div>`, { width: 360, className: 'inbox-pop' });
    Inbox.unseen = 0;
  }
};
