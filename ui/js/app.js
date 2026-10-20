'use strict';
/* =============================================================
   Tracker: app shell: state, navigation, workspaces, sheets,
   home & workspace overviews, record operations
============================================================= */
const S = {
  workspaces:   [],
  activeWs:     null,      // { id, name, desc }
  sheets:       [],        // sheets of active workspace
  allSheets:    [],        // every sheet the user can see (for reminders/activity)
  activeSheet:  null,      // table name
  sheetMeta:    null,      // { fullName, displayName, template }
  columns:      [],
  rows:         [],
  filteredRows: [],
  sortCol:      null,
  sortDir:      'asc',
  page:         0,
  pageSize:     200,
  view:         'table',   // table | calendar | dashboard
  main:         'home'     // home | workspace | sheet | activity
};

// ─────────────────────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────────────────────
let showScreen = function (id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  screen.classList.add('active');
  if (id === 'screen-login') {
    Motion.reveal(screen);
    setTimeout(() => screen.querySelector('.auth-content:not([style*="none"]) .field-inp')?.focus(), 250);
  }
  if (id === 'screen-app' && Motion.on && screen.offsetParent !== null) {
    gsap.fromTo(screen.querySelectorAll('.sidebar-head, .sb-nav, .sidebar-body, .sidebar-foot'),
      { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .7, ease: 'power3.out', stagger: .06, clearProps: 'transform,opacity' });
    gsap.fromTo(screen.querySelector('.main-panel'),
      { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', delay: .08, clearProps: 'transform,opacity' });
  }
};

// ─────────────────────────────────────────────────────────────
// UI CHROME  (theme, sidebar, profile menu)
// ─────────────────────────────────────────────────────────────
const UI = {
  theme() {
    try { return localStorage.getItem('tracker_theme') || 'system'; } catch { return 'system'; }
  },
  setTheme(mode) {
    try { localStorage.setItem('tracker_theme', mode); } catch {}
    if (mode === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    document.querySelectorAll('[data-theme-opt]').forEach(b => b.classList.toggle('on', b.dataset.themeOpt === mode));
    window.trackerDesktop?.setTheme(mode);
    if (S.main === 'sheet' && S.view === 'dashboard') Dashboard.render();
  },
  toggleSidebar() {
    document.getElementById('screen-app').classList.toggle('sb-collapsed');
  },
  toggleSection(id) {
    document.getElementById(id).classList.toggle('collapsed');
  },
  toggleProfileMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('profileMenu');
    if (menu.classList.contains('open')) { UI.closeProfileMenu(); return; }
    Pop.close();
    menu.classList.add('open');
    document.querySelector('.sb-user-card').classList.add('open');
    Motion.from(menu, { opacity: 0, y: 8, scale: .97, duration: .3, ease: 'power3.out' });
  },
  closeProfileMenu() {
    document.getElementById('profileMenu').classList.remove('open');
    document.querySelector('.sb-user-card').classList.remove('open');
  },
  _filter: '',
  filterSidebar(q) {
    UI._filter = q.toLowerCase().trim();
    _renderWorkspaces();
    _renderSheets();
  }
};

// ─────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────
const App = {
  async init() {
    await App.loadWorkspaces();
    await App.refreshAllSheets();
    let last = null;
    try { last = JSON.parse(localStorage.getItem('tracker_last_' + _currentUser.email) || 'null'); } catch {}
    const ws = last && S.workspaces.find(w => w.id === last.ws);
    if (ws) {
      await App.selectWorkspace(ws, { silent: true });
      if (last.sheet && S.sheets.some(s => s.fullName === last.sheet)) await App.selectSheet(last.sheet, last.view);
    } else {
      App.showHome();
    }
    Inbox.scan();
  },

  reset() {
    Object.assign(S, { workspaces: [], activeWs: null, sheets: [], allSheets: [], activeSheet: null, sheetMeta: null,
      columns: [], rows: [], filteredRows: [], main: 'home' });
    Inbox.items = []; Inbox._notified = false; Inbox.renderBadge();
    document.getElementById('sbWorkspaceList').innerHTML = '';
    document.getElementById('sbSheetList').innerHTML = '';
    document.getElementById('sbSheetsSection').style.display = 'none';
    Drawer.close();
    Pop.close();
  },

  _remember() {
    if (!_currentUser) return;
    try {
      localStorage.setItem('tracker_last_' + _currentUser.email, JSON.stringify({
        ws: S.activeWs?.id ?? null, sheet: S.main === 'sheet' ? S.activeSheet : null, view: S.view }));
    } catch {}
  },

  // ── main view switching ──────────────────────────────
  _setMain(which) {
    const changed = S.main !== which;
    S.main = which;
    const ids = { home: 'viewHome', workspace: 'viewWorkspace', sheet: 'viewSheet', activity: 'viewActivity' };
    Object.entries(ids).forEach(([k, id]) => document.getElementById(id).style.display = k === which ? '' : 'none');
    document.getElementById('viewTabs').style.display = which === 'sheet' ? '' : 'none';
    document.getElementById('topbarRight').style.display = which === 'sheet' ? '' : 'none';
    document.getElementById('navHome').classList.toggle('active', which === 'home');
    document.getElementById('navActivity').classList.toggle('active', which === 'activity');
    if (changed && which !== 'sheet') Motion.enter(document.getElementById(ids[which]), { y: 14 });
    _setBreadcrumb();
    App._remember();
  },

  async showHome() {
    S.activeWs = null; S.activeSheet = null;
    document.getElementById('sbSheetsSection').style.display = 'none';
    _renderWorkspaces();
    App._setMain('home');
    await Home.render();
  },

  async showActivity() {
    App._setMain('activity');
    await ActivityView.render();
  },

  // ── workspaces ───────────────────────────────────────
  async loadWorkspaces() {
    const me = esc(_currentUser.email);
    const rows = await sqlObjects(`SELECT id, name, description FROM tracker_workspaces
      WHERE owner_email IS NULL OR owner_email='${me}' COLLATE NOCASE ORDER BY created_at ASC, id ASC`);
    S.workspaces = rows.map(r => ({ id: r.id, name: r.name, desc: r.description || '' }));
    _renderWorkspaces();
  },

  async refreshAllSheets() {
    const all = [];
    for (const ws of S.workspaces) {
      (await Schema.sheetsFor(ws)).forEach(s => all.push({ ...s, wsId: ws.id, wsName: ws.name }));
    }
    S.allSheets = all;
  },

  newWorkspace() {
    document.getElementById('wsName').value = '';
    document.getElementById('wsDesc').value = '';
    Modal.open('modalWorkspace');
  },

  async createWorkspace() {
    const name = document.getElementById('wsName').value.trim();
    const desc = document.getElementById('wsDesc').value.trim();
    if (!name) { toast('Enter a workspace name', 'error'); return; }
    try {
      await sql(`INSERT INTO tracker_workspaces (name, description, owner_email, created_at)
        VALUES ('${esc(name)}', '${esc(desc)}', '${esc(_currentUser.email)}', '${nowIso()}')`);
      Modal.close('modalWorkspace');
      await App.loadWorkspaces();
      const ws = S.workspaces.find(w => w.name === name);
      await Activity.log('workspace.create', { ws, detail: { name } });
      if (ws) await App.selectWorkspace(ws);
      toast('Workspace created', 'success');
    } catch (err) {
      toast(/UNIQUE/.test(err.message) ? 'A workspace with that name already exists' : 'Could not create workspace', 'error');
    }
  },

  async selectWorkspace(ws, { silent } = {}) {
    S.activeWs = ws;
    S.activeSheet = null;
    S.rows = []; S.filteredRows = []; S.columns = [];
    Drawer.close();
    document.getElementById('sbSheetsSection').style.display = '';
    _renderWorkspaces();
    await App.loadSheets();
    App._setMain('workspace');
    await WorkspaceView.render();
  },

  async deleteWorkspace(id, e) {
    e?.stopPropagation();
    const ws = S.workspaces.find(w => w.id === id);
    if (!ws) return;
    const ok = await Confirm.ask({
      title: `Delete “${ws.name}”?`,
      body: 'This workspace and every sheet inside it will be permanently removed. This cannot be undone.',
      action: 'Delete workspace'
    });
    if (!ok) return;
    try {
      for (const sh of await Schema.sheetsFor(ws)) await Schema.dropSheet(sh.fullName);
      await sql(`DELETE FROM tracker_workspaces WHERE id=${id}`);
      await Activity.log('workspace.delete', { ws: null, detail: { name: ws.name } });
      await App.loadWorkspaces();
      await App.refreshAllSheets();
      if (S.activeWs?.id === id) await App.showHome();
      else if (S.main === 'home') Home.render();
      Inbox.scan();
      toast('Workspace deleted', 'success');
    } catch (err) { toast('Could not delete workspace: ' + err.message, 'error'); }
  },

  // ── sheets ───────────────────────────────────────────
  async loadSheets() {
    if (!S.activeWs) return;
    S.sheets = await Schema.sheetsFor(S.activeWs);
    _renderSheets();
  },

  newSheet(templateId = 'blank') {
    if (!S.activeWs) { toast('Create or pick a workspace first', 'info'); App.newWorkspace(); return; }
    SheetWizard.open(templateId);
  },

  async selectSheet(table, view) {
    S.activeSheet = table;
    S.sheetMeta = S.sheets.find(s => s.fullName === table) || null;
    S.page = 0; S.sortCol = null; S.sortDir = 'asc';
    if (view) S.view = view;
    document.getElementById('gridSearch').value = '';
    Drawer.close();
    _renderSheets();
    App._setMain('sheet');
    _syncTabs();
    await App.loadData({ animate: true });
  },

  async deleteSheet(table, e) {
    e?.stopPropagation();
    const sh = S.sheets.find(s => s.fullName === table);
    const ok = await Confirm.ask({
      title: `Delete “${sh?.displayName || table}”?`,
      body: 'All records in this sheet will be permanently removed. This cannot be undone.',
      action: 'Delete sheet'
    });
    if (!ok) return;
    try {
      await Schema.dropSheet(table);
      await Activity.log('sheet.delete', { table, detail: { sheet: sh?.displayName } });
      await App.loadSheets();
      await App.refreshAllSheets();
      if (S.activeSheet === table) { S.activeSheet = null; App._setMain('workspace'); }
      if (S.main === 'workspace') WorkspaceView.render();
      Inbox.scan();
      toast('Sheet deleted', 'success');
    } catch (err) { toast('Could not delete sheet: ' + err.message, 'error'); }
  },

  setView(view) {
    if (S.view === view) return;
    S.view = view;
    _syncTabs();
    App._remember();
    App.renderSheetView(true);
  },

  // ── data ─────────────────────────────────────────────
  async loadData({ animate = false } = {}) {
    if (!S.activeSheet) return;
    try {
      S.columns = await Schema.columns(S.activeSheet);
      const rows = await sqlObjects(`SELECT * FROM ${qi(S.activeSheet)} ORDER BY id ASC LIMIT 20000`);
      S.rows = rows;
      App.applyFilter();
      App.renderSheetView(animate);
    } catch (err) {
      toast('Could not load sheet: ' + err.message, 'error');
    }
  },

  applyFilter() {
    const term = document.getElementById('gridSearch').value.toLowerCase().trim();
    const vis = visibleCols(S.columns);
    S.filteredRows = term
      ? S.rows.filter(r => vis.some(c => String(displayValue(c, r[c.name])).toLowerCase().includes(term)))
      : [...S.rows];
    if (S.sortCol) {
      const col = S.columns.find(c => c.name === S.sortCol);
      S.filteredRows.sort((a, b) => {
        const va = a[S.sortCol] ?? '', vb = b[S.sortCol] ?? '';
        if (va === '' && vb !== '') return 1;
        if (vb === '' && va !== '') return -1;
        const numeric = col && ['number', 'marks', 'checkbox'].includes(col.kind);
        const cmp = numeric ? (parseFloat(va) || 0) - (parseFloat(vb) || 0) : String(displayValue(col || {}, va)).localeCompare(String(displayValue(col || {}, vb)), undefined, { numeric: true });
        return S.sortDir === 'asc' ? cmp : -cmp;
      });
    }
  },

  renderSheetView(animate) {
    ['table', 'calendar', 'dashboard'].forEach(v => document.getElementById('sv-' + v).style.display = v === S.view ? '' : 'none');
    document.getElementById('gridSearchWrap').style.display = S.view === 'table' ? '' : 'none';
    if (S.view === 'table') Table.render(animate);
    if (S.view === 'calendar') Calendar.render(animate);
    if (S.view === 'dashboard') Dashboard.render(animate);
  },

  search() {
    S.page = 0;
    App.applyFilter();
    Table.renderBody();
    Table.renderFoot();
  },

  // ── record operations (shared by table, calendar, drawer) ──
  async addRow(values = {}, { focus = true } = {}) {
    if (!S.activeSheet) return null;
    const now = nowIso();
    const data = { _created_at: now, _updated_at: now };
    const vis = visibleCols(S.columns);
    vis.forEach(c => {
      if (values[c.name] !== undefined) data[c.name] = values[c.name];
      else if (c.kind === 'select' && c.options?.choices?.length && c.options.defaultFirst !== false) data[c.name] = c.options.choices[0].label;
      else if (c.kind === 'checkbox') data[c.name] = 0;
    });
    const names = Object.keys(data);
    try {
      await sql(`INSERT INTO ${qi(S.activeSheet)} (${names.map(qi).join(',')}) VALUES (${names.map(n => sqlv(data[n])).join(',')})`);
      const id = (await sql('SELECT last_insert_rowid()')).rows[0][0];
      const pc = primaryCol(S.columns);
      Activity.log('row.create', { table: S.activeSheet, rowId: id, detail: { sheet: S.sheetMeta?.displayName, label: pc ? data[pc.name] : null } });
      document.getElementById('gridSearch').value = '';
      await App.loadData();
      if (S.view === 'table' && focus) Table.focusRow(id);
      return id;
    } catch (err) { toast('Could not add record: ' + err.message, 'error'); return null; }
  },

  _saveTimers: {},
  async updateCell(rowId, colName, value) {
    const row = S.rows.find(r => r.id == rowId);
    const col = S.columns.find(c => c.name === colName);
    if (!row || !col) return;
    const prev = row[colName];
    if (String(prev ?? '') === String(value ?? '')) return;
    row[colName] = value;
    row._updated_at = nowIso();
    _setStatus('Saving…', 'saving');
    try {
      await sql(`UPDATE ${qi(S.activeSheet)} SET ${qi(colName)}=${sqlv(value)}, _updated_at='${row._updated_at}' WHERE id=${rowId}`);
      _setStatus('All changes saved');
      const show = v => col.kind === 'file' ? (parseFileCell(v)?.name || '') : displayValue(col, v);
      // Coalesce rapid edits of the same cell into one activity entry.
      const key = rowId + ':' + colName;
      const t = App._saveTimers[key];
      const from = t ? t.from : show(prev);
      clearTimeout(t?.timer);
      App._saveTimers[key] = { from, timer: setTimeout(() => {
        delete App._saveTimers[key];
        Activity.log('row.update', { table: S.activeSheet, rowId, detail: { sheet: S.sheetMeta?.displayName, column: colName, from, to: show(row[colName]) } });
      }, 1500) };
      if (col.kind === 'date' || col.kind === 'checkbox' || col.kind === 'select') Inbox.scan();
      Table.renderFoot();
      if (Drawer.rowId == rowId) Drawer.refreshHeader();
    } catch (err) {
      row[colName] = prev;
      _setStatus('Could not save', 'error');
      toast('Could not save: ' + err.message, 'error');
    }
  },

  async deleteRow(rowId, { confirm = true } = {}) {
    if (confirm) {
      const ok = await Confirm.ask({ title: 'Delete this record?', body: 'It will be permanently removed from this sheet.', action: 'Delete record' });
      if (!ok) return false;
    }
    const row = S.rows.find(r => r.id == rowId);
    const pc = primaryCol(S.columns);
    try {
      await sql(`DELETE FROM ${qi(S.activeSheet)} WHERE id=${rowId}`);
      Activity.log('row.delete', { table: S.activeSheet, rowId, detail: { sheet: S.sheetMeta?.displayName, label: row && pc ? row[pc.name] : null } });
      const tr = document.querySelector(`#gridBody tr[data-row="${rowId}"]`);
      if (tr) await Motion.to(tr, { opacity: 0, x: 12, duration: .22, ease: 'power2.in' });
      if (Drawer.rowId == rowId) Drawer.close();
      await App.loadData();
      Inbox.scan();
      toast('Record deleted', 'success');
      return true;
    } catch (err) { toast('Could not delete: ' + err.message, 'error'); return false; }
  },

  // jump from activity / reminders to a sheet (and optionally a row)
  async openFromActivity(table, rowId, wsId) {
    const sh = S.allSheets.find(s => s.fullName === table);
    if (!sh) { toast('That sheet no longer exists', 'info'); return; }
    const ws = S.workspaces.find(w => w.id === (wsId ?? sh.wsId)) || S.workspaces.find(w => w.id === sh.wsId);
    if (!ws) return;
    if (S.activeWs?.id !== ws.id) await App.selectWorkspace(ws, { silent: true });
    if (S.activeSheet !== table || S.main !== 'sheet') await App.selectSheet(table);
    if (rowId && S.rows.some(r => r.id == rowId)) Drawer.open(rowId);
  }
};

// ─────────────────────────────────────────────────────────────
// SIDEBAR + TOPBAR RENDERING
// ─────────────────────────────────────────────────────────────
const _seenItems = new Set();
function _animateNew(el, key, i) {
  if (_seenItems.has(key)) return;
  _seenItems.add(key);
  Motion.from(el, { opacity: 0, x: -8, duration: .45, ease: 'power3.out', delay: i * .035 });
}

function _renderWorkspaces() {
  const list = document.getElementById('sbWorkspaceList');
  document.getElementById('sbWsCount').textContent = S.workspaces.length;
  const items = S.workspaces.filter(ws => !UI._filter || ws.name.toLowerCase().includes(UI._filter));
  list.innerHTML = items.length ? '' : `<div class="sb-empty">${S.workspaces.length ? 'No matches' : 'No workspaces yet'}</div>`;
  items.forEach((ws, i) => {
    const div = document.createElement('div');
    div.className = 'sb-item' + (S.activeWs?.id === ws.id ? ' active' : '');
    div.innerHTML = `<span class="sb-item-icon">${icon('folder', 15)}</span>
      <span class="sb-item-name" title="${escA(ws.name)}">${escH(ws.name)}</span>
      <button class="sb-item-del" title="Delete workspace">${icon('x', 12, 2)}</button>`;
    div.querySelector('.sb-item-del').addEventListener('click', e => App.deleteWorkspace(ws.id, e));
    div.addEventListener('click', () => App.selectWorkspace(ws));
    list.appendChild(div);
    _animateNew(div, 'ws:' + ws.id, i);
  });
}

function _renderSheets() {
  const list = document.getElementById('sbSheetList');
  document.getElementById('sbSheetCount').textContent = S.sheets.length;
  document.getElementById('sbSheetsLbl').textContent = S.activeWs ? S.activeWs.name : 'Sheets';
  const items = S.sheets.filter(t => !UI._filter || t.displayName.toLowerCase().includes(UI._filter));
  list.innerHTML = items.length ? '' : `<div class="sb-empty">${S.sheets.length ? 'No matches' : 'No sheets yet'}</div>`;
  items.forEach((t, i) => {
    const tpl = TEMPLATES.find(x => x.id === t.template);
    const div = document.createElement('div');
    div.className = 'sb-item' + (S.main === 'sheet' && S.activeSheet === t.fullName ? ' active' : '');
    div.innerHTML = `<span class="sb-item-icon">${icon(tpl && tpl.id !== 'import' ? tpl.icon : 'table', 15)}</span>
      <span class="sb-item-name" title="${escA(t.displayName)}">${escH(t.displayName)}</span>
      <button class="sb-item-del" title="Delete sheet">${icon('x', 12, 2)}</button>`;
    div.querySelector('.sb-item-del').addEventListener('click', e => App.deleteSheet(t.fullName, e));
    div.addEventListener('click', () => App.selectSheet(t.fullName));
    list.appendChild(div);
    _animateNew(div, 'sh:' + t.fullName, i);
  });
}

function _setBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  if (S.main === 'home') { el.innerHTML = '<span class="bc-sheet">Home</span>'; return; }
  if (S.main === 'activity') { el.innerHTML = '<span class="bc-sheet">Activity</span>'; return; }
  if (!S.activeWs) { el.innerHTML = ''; return; }
  if (S.main === 'workspace' || !S.sheetMeta) {
    el.innerHTML = `<span class="bc-sheet">${escH(S.activeWs.name)}</span>`; return;
  }
  el.innerHTML = `<button class="bc-ws" onclick="App.selectWorkspace(S.activeWs)">${escH(S.activeWs.name)}</button>
    <span class="bc-sep">/</span>
    <span class="bc-sheet">${escH(S.sheetMeta.displayName)}</span>`;
  Motion.from(el.lastElementChild, { opacity: 0, x: -6, duration: .4, ease: 'power3.out' });
}

function _syncTabs() {
  const tabs = document.getElementById('viewTabs');
  tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.view === S.view));
  const on = tabs.querySelector('button.on');
  const ind = tabs.querySelector('.tab-ind');
  if (on && ind) {
    const target = { x: on.offsetLeft, width: on.offsetWidth };
    if (Motion.on && ind.dataset.ready) gsap.to(ind, { ...target, duration: .45, ease: 'power3.out' });
    else { ind.style.transform = `translateX(${target.x}px)`; ind.style.width = target.width + 'px'; if (window.gsap) gsap.set(ind, target); }
    ind.dataset.ready = '1';
  }
}

function _setStatus(msg, state = '') {
  const el = document.getElementById('gridStatus');
  if (!el) return;
  el.className = 'grid-status' + (state ? ' ' + state : '');
  el.lastElementChild.textContent = msg;
}

// ─────────────────────────────────────────────────────────────
// HOME  (overview of everything)
// ─────────────────────────────────────────────────────────────
const Home = {
  async render() {
    const el = document.getElementById('viewHome');
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    let totalRecords = 0;
    const wsStats = {};
    for (const sh of S.allSheets) {
      try {
        const n = (await sql(`SELECT COUNT(*) FROM ${qi(sh.fullName)}`)).rows[0][0];
        totalRecords += n;
        (wsStats[sh.wsId] ||= { sheets: 0, records: 0 });
        wsStats[sh.wsId].sheets++; wsStats[sh.wsId].records += n;
      } catch {}
    }
    const recent = await Activity.list({ limit: 8 });
    const overdue = Inbox.items.filter(i => i.overdue).length;

    if (!S.workspaces.length) {
      el.innerHTML = `
        <div class="home-wrap">
          <div class="home-hero">
            <p class="eyebrow shimmer-text" data-reveal>${greet}, ${escH(_currentUser.firstName)}</p>
            <h1 class="home-title" data-reveal>Build your first tracker</h1>
            <p class="home-sub" data-reveal>Tracker is a private database on your computer. Create a workspace, then add sheets for tasks, marks, attendance, inventory, or anything you can describe in columns.</p>
            <div class="home-actions" data-reveal>
              <button class="rich-btn rich-btn-lg" onclick="App.newWorkspace()">${icon('plus', 15, 2)}<span>Create a workspace</span></button>
            </div>
          </div>
          <div class="steps" data-reveal>
            ${[['folder', 'Create a workspace', 'A home for related sheets, such as a class, a team or a project.'],
               ['grid', 'Pick a template', 'To-do, marks, attendance, inventory, or start blank. Preview before you create.'],
               ['chart', 'Track everything', 'Table, calendar and dashboard views. Every change is logged; reminders keep you on time.']]
              .map(([ic, t, d], i) => `<div class="step"><span class="step-n">${i + 1}</span><span class="step-ic">${icon(ic, 18)}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}
          </div>
        </div>`;
      Motion.reveal(el, { duration: 1, stagger: .12 });
      return;
    }

    el.innerHTML = `
      <div class="home-wrap">
        <div class="home-head" data-reveal>
          <p class="eyebrow">${greet}</p>
          <h1 class="home-title">${escH(_currentUser.firstName)}, here's your overview</h1>
        </div>
        <div class="kpis" data-reveal>
          ${Dashboard.kpi('Workspaces', S.workspaces.length, '')}
          ${Dashboard.kpi('Sheets', S.allSheets.length, '')}
          ${Dashboard.kpi('Records', totalRecords, '')}
          ${Dashboard.kpi('Due & overdue', Inbox.items.length, overdue ? `<span class="kpi-flag">${icon('alert', 12, 2)} ${overdue} overdue</span>` : '<span class="kpi-ok">On track</span>')}
        </div>
        <div class="home-grid">
          <section class="card" data-reveal>
            <div class="card-hd"><h2>Workspaces</h2><button class="btn btn-ghost btn-sm" onclick="App.newWorkspace()">${icon('plus', 13, 2)} New</button></div>
            <div class="ws-cards">
              ${S.workspaces.map(ws => `
                <button class="ws-card" onclick="App.selectWorkspace(S.workspaces.find(w=>w.id===${ws.id}))">
                  <span class="ws-card-ic">${icon('folder', 17)}</span>
                  <span class="ws-card-name">${escH(ws.name)}</span>
                  <span class="ws-card-meta">${plural(wsStats[ws.id]?.sheets || 0, 'sheet')} · ${plural(wsStats[ws.id]?.records || 0, 'record')}</span>
                </button>`).join('')}
            </div>
          </section>
          <section class="card" data-reveal>
            <div class="card-hd"><h2>Reminders</h2><span class="sb-count">${Inbox.items.length}</span></div>
            <div class="rem-list">${Inbox.items.length ? Inbox.items.slice(0, 7).map(i => `
              <button class="inbox-item" onclick="App.openFromActivity('${escA(i.sheet)}', ${i.rowId}, ${i.ws})">
                <span class="inbox-dot ${i.overdue ? 'overdue' : 'today'}"></span>
                <span class="inbox-main"><span class="inbox-label">${escH(i.label)}</span><span class="inbox-sub">${escH(i.sheetName)}</span></span>
                <span class="inbox-when ${i.overdue ? 'overdue' : ''}">${i.overdue ? escH(fmtDate(i.date)) : 'Today'}</span>
              </button>`).join('') : `<div class="inbox-empty">${icon('check', 16, 2)}<span>Nothing due. Sheets with a date and a status or checkbox column show reminders here.</span></div>`}</div>
          </section>
        </div>
        <section class="card" data-reveal>
          <div class="card-hd"><h2>Recent activity</h2><button class="link-btn" onclick="App.showActivity()">View all</button></div>
          <div class="act-list">${Activity.renderList(recent, { compact: true })}</div>
        </section>
      </div>`;
    Motion.reveal(el, { duration: .9, stagger: .08, y: 20 });
  }
};

// ─────────────────────────────────────────────────────────────
// WORKSPACE OVERVIEW
// ─────────────────────────────────────────────────────────────
const WorkspaceView = {
  async render() {
    const el = document.getElementById('viewWorkspace');
    const ws = S.activeWs;
    const cards = [];
    for (const sh of S.sheets) {
      let count = 0, updated = null, pct = null;
      try {
        const r = await sql(`SELECT COUNT(*), MAX(_updated_at) FROM ${qi(sh.fullName)}`);
        [count, updated] = r.rows[0];
        const cols = await Schema.columns(sh.fullName);
        const cc = completionCol(cols);
        if (cc && count) {
          const rows = await sqlObjects(`SELECT ${qi(cc.name)} FROM ${qi(sh.fullName)}`);
          pct = Math.round(rows.filter(x => isRowDone(cc, x)).length / rows.length * 100);
        }
      } catch {}
      cards.push({ sh, count, updated, pct });
    }
    const recent = await Activity.list({ wsId: ws.id, limit: 10 });
    el.innerHTML = `
      <div class="home-wrap">
        <div class="home-head ws-head" data-reveal>
          <div>
            <p class="eyebrow">Workspace</p>
            <h1 class="home-title">${escH(ws.name)}</h1>
            ${ws.desc ? `<p class="home-sub">${escH(ws.desc)}</p>` : ''}
          </div>
          <div class="ws-head-actions">
            <button class="btn btn-soft" onclick="IO.exportWorkspace(this)">${icon('download', 14, 1.7)} Export all</button>
            <button class="rich-btn" onclick="App.newSheet()">${icon('plus', 14, 2)}<span>New sheet</span></button>
          </div>
        </div>
        <div class="sheet-cards" data-reveal>
          ${cards.map(({ sh, count, updated, pct }) => {
            const tpl = TEMPLATES.find(t => t.id === sh.template);
            return `<button class="sheet-card" onclick="App.selectSheet('${escA(sh.fullName)}')">
              <span class="sheet-card-top"><span class="ws-card-ic">${icon(tpl && tpl.id !== 'import' ? tpl.icon : 'table', 17)}</span>
                <span class="sheet-card-tpl">${escH(tpl && tpl.id !== 'blank' && tpl.id !== 'import' ? tpl.name : 'Sheet')}</span></span>
              <span class="ws-card-name">${escH(sh.displayName)}</span>
              <span class="ws-card-meta">${plural(count, 'record')}${updated ? ' · updated ' + timeAgo(updated) : ''}</span>
              ${pct !== null ? `<span class="progress" data-tip="${pct}% complete"><i style="width:${pct}%"></i></span><span class="progress-lbl">${pct}% complete</span>` : ''}
            </button>`;
          }).join('')}
          <button class="sheet-card sheet-card-new" onclick="App.newSheet()">
            <span class="new-plus">${icon('plus', 18, 1.8)}</span>
            <span class="ws-card-name">New sheet</span>
            <span class="ws-card-meta">From a template or blank</span>
          </button>
        </div>
        <section class="card" data-reveal>
          <div class="card-hd"><h2>Activity in this workspace</h2></div>
          <div class="act-list">${Activity.renderList(recent, { compact: true })}</div>
        </section>
      </div>`;
    Motion.reveal(el, { duration: .9, stagger: .08, y: 20 });
  }
};

// ─────────────────────────────────────────────────────────────
// ACTIVITY PAGE
// ─────────────────────────────────────────────────────────────
const ActivityView = {
  filter: '',
  async render() {
    const el = document.getElementById('viewActivity');
    const items = await Activity.list({ table: ActivityView.filter || null, limit: 500 });
    el.innerHTML = `
      <div class="home-wrap">
        <div class="home-head ws-head" data-reveal>
          <div>
            <p class="eyebrow">History</p>
            <h1 class="home-title">Activity</h1>
            <p class="home-sub">Every record you add, edit or delete is tracked here, along with every import and export.</p>
          </div>
          <select class="field-sel" onchange="ActivityView.filter=this.value;ActivityView.render()">
            <option value="">All sheets</option>
            ${S.allSheets.map(s => `<option value="${escA(s.fullName)}" ${ActivityView.filter === s.fullName ? 'selected' : ''}>${escH(s.wsName)} / ${escH(s.displayName)}</option>`).join('')}
          </select>
        </div>
        <section class="card" data-reveal><div class="act-list act-full">${Activity.renderList(items)}</div></section>
      </div>`;
    Motion.reveal(el, { duration: .9, stagger: .1, y: 20 });
  }
};

// ─────────────────────────────────────────────────────────────
// KEYBOARD + BOOT
// ─────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (Pop.el) { Pop.close(); return; }
    if (Modal.isOpen()) { Modal.closeAll(); return; }
    if (Drawer.rowId !== null) { Drawer.close(); return; }
    UI.closeProfileMenu();
  }
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === 'Enter' && Modal.isOpen()) {
    document.querySelector('.overlay.open .modal-primary')?.click();
    e.preventDefault(); return;
  }
  if (e.key === 'Enter' && document.activeElement?.closest('.overlay.open') && document.activeElement.matches('input.field-inp') && !document.activeElement.closest('.col-list, .choice-editor')) {
    document.querySelector('.overlay.open .modal-primary')?.click();
    e.preventDefault(); return;
  }
  if (!_currentUser || Modal.isOpen()) return;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('sbSearch').focus(); }
  if (mod && e.key.toLowerCase() === 'n' && S.main === 'sheet') { e.preventDefault(); App.addRow(); }
});

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('signInForm').addEventListener('submit', e => Auth.signIn(e));
  document.getElementById('registerForm').addEventListener('submit', e => Auth.register(e));
  document.getElementById('regFirstName').addEventListener('input', updateRegisterAvatarInitial);
  document.addEventListener('click', e => { if (!e.target.closest('#profileMenu')) UI.closeProfileMenu(); });
  UI.setTheme(UI.theme());
  window.trackerDesktop?.onWindowState(st => document.documentElement.classList.toggle('is-fullscreen', !!st.fullscreen));
  window.addEventListener('resize', () => S.main === 'sheet' && _syncTabs());

  // Keep the loader up briefly so the first transition never flickers.
  const started = performance.now();
  const _show = showScreen;
  showScreen = id => setTimeout(() => _show(id), Math.max(0, 500 - (performance.now() - started)));
  try {
    await Schema.init();
    await Auth.init();
  } catch (err) {
    document.querySelector('#screen-boot .shimmer-text').textContent = 'Could not open the database: ' + err.message;
  } finally {
    setTimeout(() => { showScreen = _show; }, 520);
  }
});
