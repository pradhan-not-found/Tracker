'use strict';
/* =============================================================
   Tracker — Complete App Logic
   Auth (local), Workspaces, Sheets, Excel Grid
============================================================= */

// ─────────────────────────────────────────────────────────────
// NATIVE BRIDGE  (SQLite via Swift WebKit message handler)
// ─────────────────────────────────────────────────────────────
const _cbs = {};
let _cbN = 0;

function callNative(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = 'cb_' + (++_cbN);
    _cbs[id] = { resolve, reject };
    if (window.webkit?.messageHandlers?.trackerNative) {
      window.webkit.messageHandlers.trackerNative.postMessage({ action, callbackId: id, payload });
    } else {
      // fallback: resolve empty so UI doesn't freeze
      setTimeout(() => window.onNativeResponse(id, null, { columns: [], rows: [], status: 'ok' }), 20);
    }
  });
}

window.onNativeResponse = function(id, err, result) {
  const cb = _cbs[id];
  if (!cb) return;
  delete _cbs[id];
  if (err) cb.reject(new Error(typeof err === 'string' ? err : JSON.stringify(err)));
  else cb.resolve(result || {});
};

async function sql(query) {
  return callNative('db_query', { query });
}

function esc(s)    { return String(s ?? '').replace(/'/g, "''"); }
function escH(s)   { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escA(s)   { return String(s ?? '').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function toast(msg, type = 'default') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toastRoot').appendChild(el);
  setTimeout(() => { el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(() => el.remove(), 350); }, 3000);
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────
const Modal = {
  open(id)  { document.getElementById(id).classList.add('open'); },
  close(id) { document.getElementById(id).classList.remove('open'); },
  bg(e, id) { if (e.target.id === id) Modal.close(id); },
  closeAll() { document.querySelectorAll('.overlay.open').forEach(m => m.classList.remove('open')); }
};

// ─────────────────────────────────────────────────────────────
// SCREEN SWITCH
// ─────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function switchForm(which) {
  document.getElementById('formSignIn').style.display   = which === 'signin'   ? '' : 'none';
  document.getElementById('formRegister').style.display = which === 'register' ? '' : 'none';
}

// ─────────────────────────────────────────────────────────────
// AUTH  (stored locally in SQLite)
// ─────────────────────────────────────────────────────────────
let _currentUser = null;
let _pendingAvatarDataUrl = null; // for register form

const Auth = {
  async init() {
    // Create users table if needed
    await sql(`CREATE TABLE IF NOT EXISTS tracker_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password TEXT NOT NULL,
      avatar_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Check remembered session
    const session = localStorage.getItem('tracker_session');
    if (session) {
      try {
        const { email } = JSON.parse(session);
        const res = await sql(`SELECT id,first_name,last_name,email,avatar_data FROM tracker_users WHERE email='${esc(email)}' LIMIT 1`);
        if (res.rows && res.rows.length > 0) {
          Auth._setUser(res.rows[0]);
          showScreen('screen-app');
          App.init();
          return;
        }
      } catch {}
      localStorage.removeItem('tracker_session');
    }
    showScreen('screen-login');
  },

  _setUser(row) {
    _currentUser = {
      id:         row[0],
      firstName:  row[1],
      lastName:   row[2] || '',
      email:      row[3],
      avatarData: row[4] || null
    };
    Auth._updateSidebarUI();
  },

  _updateSidebarUI() {
    if (!_currentUser) return;
    const fullName = (_currentUser.firstName + ' ' + _currentUser.lastName).trim();
    document.getElementById('sbUserName').textContent  = fullName;
    document.getElementById('sbUserEmail').textContent = _currentUser.email;

    const initial = _currentUser.firstName[0].toUpperCase();
    document.getElementById('sbUserAvatarInitial').textContent = initial;

    const img = document.getElementById('sbUserAvatarImg');
    if (_currentUser.avatarData) {
      img.src = _currentUser.avatarData;
      img.style.display = '';
      document.getElementById('sbUserAvatarInitial').style.display = 'none';
    } else {
      img.style.display = 'none';
      document.getElementById('sbUserAvatarInitial').style.display = '';
    }
  },

  async signIn(e) {
    e.preventDefault();
    const email = document.getElementById('siEmail').value.trim();
    const pass  = document.getElementById('siPass').value;
    const errEl = document.getElementById('siErr');
    errEl.textContent = '';

    if (!email || !pass) { errEl.textContent = 'Please fill in all fields.'; return; }

    try {
      const res = await sql(`SELECT id,first_name,last_name,email,avatar_data FROM tracker_users WHERE email='${esc(email)}' AND password='${esc(pass)}' LIMIT 1`);
      if (!res.rows || res.rows.length === 0) {
        errEl.textContent = 'Incorrect email or password.'; return;
      }
      Auth._setUser(res.rows[0]);
      localStorage.setItem('tracker_session', JSON.stringify({ email }));
      showScreen('screen-app');
      App.init();
    } catch(err) {
      errEl.textContent = 'Sign in failed. Please try again.';
    }
  },

  async register(e) {
    e.preventDefault();
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName  = document.getElementById('regLastName').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const pass      = document.getElementById('regPass').value;
    const errEl     = document.getElementById('regErr');
    errEl.textContent = '';

    if (!firstName) { errEl.textContent = 'First name is required.'; return; }
    if (!email || !email.includes('@')) { errEl.textContent = 'Enter a valid email address.'; return; }
    if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }

    const avatarData = _pendingAvatarDataUrl || null;

    try {
      await sql(`INSERT INTO tracker_users (first_name,last_name,email,password,avatar_data)
        VALUES ('${esc(firstName)}','${esc(lastName)}','${esc(email)}','${esc(pass)}',${avatarData ? `'${esc(avatarData)}'` : 'NULL'})`);

      const res = await sql(`SELECT id,first_name,last_name,email,avatar_data FROM tracker_users WHERE email='${esc(email)}' LIMIT 1`);
      Auth._setUser(res.rows[0]);
      localStorage.setItem('tracker_session', JSON.stringify({ email }));
      showScreen('screen-app');
      App.init();
      toast('Account created successfully', 'success');
    } catch(err) {
      if (err.message.includes('UNIQUE')) {
        errEl.textContent = 'An account with this email already exists.';
      } else {
        errEl.textContent = 'Registration failed. Please try again.';
      }
    }
  },

  logout() {
    _currentUser = null;
    localStorage.removeItem('tracker_session');
    // Reset app state
    S.activeWs = null; S.activeSheet = null; S.rows = []; S.filteredRows = []; S.columns = [];
    document.getElementById('sbWorkspaceList').innerHTML = '';
    document.getElementById('sbSheetList').innerHTML = '';
    document.getElementById('sbSheetsSection').style.display = 'none';
    document.getElementById('topbarRight').style.display = 'none';
    _setView('noWorkspace');
    showScreen('screen-login');
    // Clear forms
    document.getElementById('siEmail').value = '';
    document.getElementById('siPass').value  = '';
    document.getElementById('regErr').textContent = '';
    document.getElementById('siErr').textContent  = '';
    switchForm('signin');
  },

  async saveProfile() {
    if (!_currentUser) return;
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName  = document.getElementById('editLastName').value.trim();
    const pass      = document.getElementById('editPass').value;
    const avatarEl  = document.getElementById('editAvatarImg');

    if (!firstName) { toast('First name is required', 'error'); return; }

    let avatarData = _currentUser.avatarData;
    if (avatarEl.dataset.changed === '1') {
      avatarData = avatarEl.src || null;
    }

    let query = `UPDATE tracker_users SET
      first_name='${esc(firstName)}',
      last_name='${esc(lastName)}',
      avatar_data=${avatarData ? `'${esc(avatarData)}'` : 'NULL'}`;
    if (pass) query += `, password='${esc(pass)}'`;
    query += ` WHERE id=${_currentUser.id}`;

    try {
      await sql(query);
      _currentUser.firstName  = firstName;
      _currentUser.lastName   = lastName;
      _currentUser.avatarData = avatarData;
      Auth._updateSidebarUI();
      Modal.close('modalProfile');
      toast('Profile updated', 'success');
    } catch(err) {
      toast('Could not save profile', 'error');
    }
  }
};

// ─────────────────────────────────────────────────────────────
// AVATAR UPLOAD HELPERS
// ─────────────────────────────────────────────────────────────
function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    _pendingAvatarDataUrl = e.target.result;
    const preview = document.getElementById('avatarPreview');
    const img = preview.querySelector('img') || (() => { const i=document.createElement('img'); preview.appendChild(i); return i; })();
    img.src = _pendingAvatarDataUrl;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    document.getElementById('avatarInitial').style.display = 'none';
    document.getElementById('avatarRemoveBtn').style.display = '';
    // Update initial letter in registration form
    updateRegisterAvatarInitial();
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  _pendingAvatarDataUrl = null;
  const preview = document.getElementById('avatarPreview');
  const img = preview.querySelector('img');
  if (img) img.style.display = 'none';
  document.getElementById('avatarInitial').style.display = '';
  document.getElementById('avatarRemoveBtn').style.display = 'none';
}

function updateRegisterAvatarInitial() {
  const fn = document.getElementById('regFirstName').value.trim();
  document.getElementById('avatarInitial').textContent = fn ? fn[0].toUpperCase() : '?';
}

function handleEditAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('editAvatarImg');
    img.src = e.target.result;
    img.style.display = '';
    img.dataset.changed = '1';
    document.getElementById('editAvatarInitial').style.display = 'none';
    document.getElementById('editAvatarRemoveBtn').style.display = '';
  };
  reader.readAsDataURL(file);
}

function removeEditAvatar() {
  const img = document.getElementById('editAvatarImg');
  img.src = '';
  img.style.display = 'none';
  img.dataset.changed = '1';
  document.getElementById('editAvatarInitial').style.display = '';
  document.getElementById('editAvatarRemoveBtn').style.display = 'none';
}

function showProfileModal() {
  if (!_currentUser) return;
  document.getElementById('editFirstName').value = _currentUser.firstName;
  document.getElementById('editLastName').value  = _currentUser.lastName;
  document.getElementById('editEmail').value     = _currentUser.email;
  document.getElementById('editPass').value      = '';

  const img = document.getElementById('editAvatarImg');
  const ini = document.getElementById('editAvatarInitial');
  img.dataset.changed = '0';
  if (_currentUser.avatarData) {
    img.src = _currentUser.avatarData;
    img.style.display = '';
    ini.style.display = 'none';
    document.getElementById('editAvatarRemoveBtn').style.display = '';
  } else {
    img.src = '';
    img.style.display = 'none';
    ini.style.display = '';
    ini.textContent = _currentUser.firstName[0].toUpperCase();
    document.getElementById('editAvatarRemoveBtn').style.display = 'none';
  }
  Modal.open('modalProfile');
}

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.querySelector('svg').style.opacity = isPass ? '0.4' : '1';
}

// ─────────────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────────────
const S = {
  workspaces:   [],
  activeWs:     null,   // { id, name }
  sheets:       [],
  activeSheet:  null,   // full table name string
  columns:      [],     // [{name,type,pk}]
  rows:         [],     // all rows
  filteredRows: [],
  sortCol:      null,
  sortDir:      'asc',
  page:         0,
  pageSize:     250,
  pendingDelRow:null,
};

// ─────────────────────────────────────────────────────────────
// COLUMN BUILDER (shared between New Sheet & Manage Columns)
// ─────────────────────────────────────────────────────────────
const ColBuilder = {
  add(listId) {
    const list = document.getElementById(listId);
    const row = document.createElement('div');
    row.className = 'col-row';
    row.innerHTML = `
      <input class="field-inp col-name-inp" type="text" placeholder="column_name">
      <select class="field-sel">
        <option value="TEXT">TEXT</option>
        <option value="INTEGER">INTEGER</option>
        <option value="REAL">REAL</option>
        <option value="DATE">DATE</option>
        <option value="DATETIME">DATETIME</option>
      </select>
      <span style="width:22px"></span>
      <button class="btn-col-del" onclick="this.closest('.col-row').remove()" title="Remove">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    list.appendChild(row);
    row.querySelector('input').focus();
  }
};

// ─────────────────────────────────────────────────────────────
// VIEW SWITCHER
// ─────────────────────────────────────────────────────────────
function _setView(which) {
  document.getElementById('stateNoWorkspace').style.display = which === 'noWorkspace' ? '' : 'none';
  document.getElementById('stateNoSheet').style.display     = which === 'noSheet'     ? '' : 'none';
  document.getElementById('stateGrid').style.display        = which === 'grid'        ? '' : 'none';
  document.getElementById('topbarRight').style.display      = which === 'grid'        ? '' : 'none';
}

function _setBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  if (!S.activeWs) {
    el.innerHTML = '<span class="bc-idle">Select a workspace</span>'; return;
  }
  if (!S.activeSheet) {
    el.innerHTML = `<span class="bc-ws">${escH(S.activeWs.name)}</span>`; return;
  }
  const prefix = _prefix(S.activeWs.name) + '_';
  const sheetDisplay = S.activeSheet.startsWith(prefix) ? S.activeSheet.slice(prefix.length) : S.activeSheet;
  el.innerHTML = `<span class="bc-ws">${escH(S.activeWs.name)}</span>
    <span class="bc-sep">/</span>
    <span class="bc-sheet">${escH(sheetDisplay)}</span>`;
}

function _prefix(wsName) {
  return 'ws_' + wsName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 48);
}

// ─────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────
const App = {
  async init() {
    await sql(`CREATE TABLE IF NOT EXISTS tracker_workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await App.loadWorkspaces();
    _setView('noWorkspace');
    _setBreadcrumb();
  },

  // ── WORKSPACES ──────────────────────────────────────
  async loadWorkspaces() {
    try {
      const res = await sql('SELECT id,name,description FROM tracker_workspaces ORDER BY created_at ASC');
      S.workspaces = (res.rows || []).map(r => ({ id: r[0], name: r[1], desc: r[2] || '' }));
    } catch { S.workspaces = []; }
    _renderWorkspaces();
  },

  newWorkspace() {
    document.getElementById('wsName').value = '';
    document.getElementById('wsDesc').value = '';
    Modal.open('modalWorkspace');
    setTimeout(() => document.getElementById('wsName').focus(), 60);
  },

  async createWorkspace() {
    const name = document.getElementById('wsName').value.trim();
    const desc = document.getElementById('wsDesc').value.trim();
    if (!name) { toast('Enter a workspace name', 'error'); return; }
    try {
      await sql(`INSERT INTO tracker_workspaces (name,description) VALUES ('${esc(name)}','${esc(desc)}')`);
      Modal.close('modalWorkspace');
      await App.loadWorkspaces();
      const ws = S.workspaces.find(w => w.name === name);
      if (ws) await App.selectWorkspace(ws);
      toast('Workspace created', 'success');
    } catch(err) {
      if (err.message.includes('UNIQUE')) toast('A workspace with that name already exists', 'error');
      else toast('Could not create workspace', 'error');
    }
  },

  async selectWorkspace(ws) {
    S.activeWs    = ws;
    S.activeSheet = null;
    S.rows        = [];
    S.filteredRows= [];
    S.columns     = [];
    _renderWorkspaces();
    _setBreadcrumb();
    document.getElementById('sbSheetsSection').style.display = '';
    await App.loadSheets();
    _setView('noSheet');
  },

  async deleteWorkspace(id, name, e) {
    e.stopPropagation();
    if (!confirm(`Delete workspace "${name}"? All sheets and data will be permanently removed.`)) return;
    const prefix = _prefix(name);
    try {
      const res = await sql(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '${prefix}_%'`);
      for (const row of res.rows || []) {
        await sql(`DROP TABLE IF EXISTS "${row[0]}"`);
      }
      await sql(`DELETE FROM tracker_workspaces WHERE id=${id}`);
      if (S.activeWs?.id === id) {
        S.activeWs = null; S.activeSheet = null;
        document.getElementById('sbSheetsSection').style.display = 'none';
        _setView('noWorkspace');
        _setBreadcrumb();
      }
      await App.loadWorkspaces();
      toast('Workspace deleted', 'success');
    } catch { toast('Could not delete workspace', 'error'); }
  },

  // ── SHEETS ──────────────────────────────────────────
  async loadSheets() {
    if (!S.activeWs) return;
    const prefix = _prefix(S.activeWs.name) + '_';
    try {
      const res = await sql(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '${prefix}%' ORDER BY name ASC`);
      S.sheets = (res.rows || []).map(r => ({
        fullName:    r[0],
        displayName: r[0].slice(prefix.length)
      }));
    } catch { S.sheets = []; }
    _renderSheets();
  },

  newSheet() {
    document.getElementById('sheetName').value = '';
    const list = document.getElementById('sheetColList');
    list.innerHTML = `<div class="col-row col-sys">
      <input class="field-inp col-name-inp" type="text" value="id" disabled>
      <select class="field-sel" disabled><option>INTEGER</option></select>
      <span class="col-pk-badge">PK</span>
      <span style="width:22px"></span>
    </div>`;
    Modal.open('modalSheet');
    setTimeout(() => document.getElementById('sheetName').focus(), 60);
  },

  async createSheet() {
    if (!S.activeWs) return;
    const rawName = document.getElementById('sheetName').value.trim();
    if (!rawName) { toast('Enter a sheet name', 'error'); return; }

    const safeRaw   = rawName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 48);
    const tableName = _prefix(S.activeWs.name) + '_' + safeRaw;

    const colRows = document.querySelectorAll('#sheetColList .col-row:not(.col-sys)');
    const defs = ['id INTEGER PRIMARY KEY AUTOINCREMENT'];
    colRows.forEach(row => {
      const cName = row.querySelector('input[type="text"]')?.value.trim().replace(/[^a-zA-Z0-9_]/g, '_');
      const cType = row.querySelector('select')?.value || 'TEXT';
      if (cName) defs.push(`"${cName}" ${cType}`);
    });

    try {
      await sql(`CREATE TABLE IF NOT EXISTS "${tableName}" (${defs.join(',')})`);
      Modal.close('modalSheet');
      await App.loadSheets();
      await App.selectSheet(tableName);
      toast('Sheet created', 'success');
    } catch(err) { toast('Could not create sheet', 'error'); }
  },

  async selectSheet(fullName) {
    S.activeSheet = fullName;
    S.page = 0; S.sortCol = null; S.sortDir = 'asc';
    _renderSheets();
    _setBreadcrumb();
    _setView('grid');
    await App.loadData();
  },

  async deleteSheet(fullName, displayName, e) {
    e.stopPropagation();
    if (!confirm(`Delete sheet "${displayName}"? All data in it will be removed.`)) return;
    try {
      await sql(`DROP TABLE IF EXISTS "${fullName}"`);
      if (S.activeSheet === fullName) {
        S.activeSheet = null;
        _setView('noSheet');
        _setBreadcrumb();
        document.getElementById('topbarRight').style.display = 'none';
      }
      await App.loadSheets();
      toast('Sheet deleted', 'success');
    } catch { toast('Could not delete sheet', 'error'); }
  },

  // ── DATA ────────────────────────────────────────────
  async loadData() {
    if (!S.activeSheet) return;
    try {
      const schRes = await sql(`PRAGMA table_info("${S.activeSheet}")`);
      S.columns = (schRes.rows || []).map(r => ({
        cid: r[0], name: r[1], type: r[2], notnull: r[3], pk: r[5]
      }));

      const datRes = await sql(`SELECT * FROM "${S.activeSheet}" ORDER BY id ASC LIMIT 10000`);
      const cols = datRes.columns || S.columns.map(c => c.name);
      S.rows = (datRes.rows || []).map(r => {
        const obj = {};
        cols.forEach((c, i) => obj[c] = r[i] ?? '');
        return obj;
      });
      S.filteredRows = [...S.rows];
      _renderGrid();
      _setStatus('Ready');
    } catch(err) {
      toast('Could not load data', 'error');
    }
  },

  async addRow() {
    if (!S.activeSheet) return;
    const nonPk = S.columns.filter(c => !c.pk);
    try {
      if (nonPk.length > 0) {
        const names = nonPk.map(c => `"${c.name}"`).join(',');
        const vals  = nonPk.map(() => "''").join(',');
        await sql(`INSERT INTO "${S.activeSheet}" (${names}) VALUES (${vals})`);
      } else {
        await sql(`INSERT INTO "${S.activeSheet}" DEFAULT VALUES`);
      }
      await App.loadData();
      // scroll to bottom
      const scroll = document.getElementById('gridScroll');
      scroll.scrollTop = scroll.scrollHeight;
      _setStatus('Row added');
    } catch(err) { toast('Could not add row', 'error'); }
  },

  _delRowId: null,
  promptDeleteRow(rowId) {
    App._delRowId = rowId;
    Modal.open('modalDelRow');
  },
  async confirmDeleteRow() {
    if (App._delRowId === null) return;
    try {
      await sql(`DELETE FROM "${S.activeSheet}" WHERE id=${App._delRowId}`);
      Modal.close('modalDelRow');
      await App.loadData();
      toast('Row deleted', 'success');
    } catch { toast('Could not delete row', 'error'); }
    App._delRowId = null;
  },

  _saveTimer: null,
  onCellChange(rowId, colName, value) {
    // Update local state immediately
    const row = S.rows.find(r => r['id'] == rowId);
    const fRow = S.filteredRows.find(r => r['id'] == rowId);
    if (row)  row[colName]  = value;
    if (fRow) fRow[colName] = value;
    _setStatus('Saving…');
    clearTimeout(App._saveTimer);
    App._saveTimer = setTimeout(() => App._persistCell(rowId, colName, value), 600);
  },

  async _persistCell(rowId, colName, value) {
    try {
      await sql(`UPDATE "${S.activeSheet}" SET "${colName}"='${esc(value)}' WHERE id=${rowId}`);
      _setStatus('Saved');
    } catch { _setStatus('Save error'); }
  },

  search(q) {
    const term = q.toLowerCase().trim();
    S.filteredRows = term
      ? S.rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(term)))
      : [...S.rows];
    S.page = 0;
    _renderGridBody();
    _renderPagination();
    _updateMeta();
  },

  sortBy(col) {
    if (S.sortCol === col) S.sortDir = S.sortDir === 'asc' ? 'desc' : 'asc';
    else { S.sortCol = col; S.sortDir = 'asc'; }
    S.filteredRows.sort((a, b) => {
      const va = a[col] ?? '', vb = b[col] ?? '';
      const na = parseFloat(va), nb = parseFloat(vb);
      let cmp = (!isNaN(na) && !isNaN(nb)) ? na - nb : String(va).localeCompare(String(vb));
      return S.sortDir === 'asc' ? cmp : -cmp;
    });
    S.page = 0;
    _renderGrid();
  },

  prevPage() {
    if (S.page > 0) { S.page--; _renderGridBody(); _renderPagination(); }
  },
  nextPage() {
    const pages = Math.ceil(S.filteredRows.length / S.pageSize);
    if (S.page < pages - 1) { S.page++; _renderGridBody(); _renderPagination(); }
  },

  manageColumns() {
    const list = document.getElementById('manageColList');
    list.innerHTML = '';
    S.columns.forEach(col => {
      const row = document.createElement('div');
      row.className = 'col-row' + (col.pk ? ' col-sys' : '');
      row.innerHTML = `
        <input class="field-inp col-name-inp" type="text" value="${escH(col.name)}" ${col.pk ? 'disabled' : ''} data-orig="${escA(col.name)}">
        <select class="field-sel" ${col.pk ? 'disabled' : ''}>
          ${['TEXT','INTEGER','REAL','DATE','DATETIME'].map(t => `<option value="${t}"${col.type===t?' selected':''}>${t}</option>`).join('')}
        </select>
        ${col.pk ? '<span class="col-pk-badge">PK</span>' : '<span style="width:22px"></span>'}
        ${col.pk ? '<span style="width:22px"></span>' : `<button class="btn-col-del" onclick="this.closest('.col-row').remove()" title="Remove">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`}`;
      list.appendChild(row);
    });
    Modal.open('modalCols');
  },

  async applyColumns() {
    const rows = document.querySelectorAll('#manageColList .col-row');
    const ops  = [];
    for (const row of rows) {
      const inp  = row.querySelector('input[type="text"]');
      const sel  = row.querySelector('select');
      const orig = inp?.dataset.orig || '';
      const name = inp?.value.trim().replace(/[^a-zA-Z0-9_]/g,'_') || '';
      const type = sel?.value || 'TEXT';
      const isNew = !orig;
      if (isNew && name) ops.push({ op:'add', name, type });
      else if (!isNew && name && name !== orig && !row.classList.contains('col-sys')) ops.push({ op:'rename', from:orig, to:name });
    }
    try {
      for (const op of ops) {
        if (op.op === 'add')    await sql(`ALTER TABLE "${S.activeSheet}" ADD COLUMN "${op.name}" ${op.type}`);
        if (op.op === 'rename') await sql(`ALTER TABLE "${S.activeSheet}" RENAME COLUMN "${op.from}" TO "${op.to}"`);
      }
      Modal.close('modalCols');
      await App.loadData();
      toast('Columns updated', 'success');
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  },

  // ── CSV ─────────────────────────────────────────────
  importCsv() { document.getElementById('csvInput').click(); },

  async onCsvFile(event) {
    const file = event.target.files[0];
    if (!file || !S.activeSheet) return;
    event.target.value = '';
    const text = await file.text();
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast('CSV needs headers + at least one row', 'error'); return; }

    const headers  = parseCsv(lines[0]);
    const nonPkCols = S.columns.filter(c => !c.pk).map(c => c.name);
    const matched  = headers.filter(h => nonPkCols.includes(h));
    if (!matched.length) { toast('No CSV headers match sheet columns', 'error'); return; }

    let inserted = 0;
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsv(lines[i]);
      const cols = matched.map(h => `"${h}"`).join(',');
      const vals2 = matched.map(h => `'${esc(vals[headers.indexOf(h)] ?? '')}'`).join(',');
      try { await sql(`INSERT INTO "${S.activeSheet}" (${cols}) VALUES (${vals2})`); inserted++; }
      catch {}
    }
    await App.loadData();
    toast(`Imported ${inserted} row${inserted !== 1 ? 's' : ''}`, 'success');
  },

  exportCsv() {
    if (!S.activeSheet || !S.rows.length) { toast('No data to export', 'error'); return; }
    const cols = S.columns.map(c => c.name);
    let csv = cols.map(c => `"${c}"`).join(',') + '\n';
    S.rows.forEach(r => { csv += cols.map(c => `"${String(r[c]??'').replace(/"/g,'""')}"`).join(',') + '\n'; });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: (S.activeSheet || 'export') + '.csv' });
    a.click(); URL.revokeObjectURL(url);
    toast('CSV exported', 'success');
  }
};

// ─────────────────────────────────────────────────────────────
// RENDER HELPERS
// ─────────────────────────────────────────────────────────────
function _renderWorkspaces() {
  const list = document.getElementById('sbWorkspaceList');
  list.innerHTML = '';
  S.workspaces.forEach(ws => {
    const div = document.createElement('div');
    div.className = 'sb-item' + (S.activeWs?.id === ws.id ? ' active' : '');
    div.innerHTML = `
      <svg class="sb-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
      <span class="sb-item-name" title="${escA(ws.name)}">${escH(ws.name)}</span>
      <button class="sb-item-del" title="Delete workspace">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    div.querySelector('.sb-item-del').addEventListener('click', e => App.deleteWorkspace(ws.id, ws.name, e));
    div.addEventListener('click', () => App.selectWorkspace(ws));
    list.appendChild(div);
  });
}

function _renderSheets() {
  const list = document.getElementById('sbSheetList');
  list.innerHTML = '';
  S.sheets.forEach(t => {
    const div = document.createElement('div');
    div.className = 'sb-item' + (S.activeSheet === t.fullName ? ' active' : '');
    div.innerHTML = `
      <svg class="sb-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
      </svg>
      <span class="sb-item-name" title="${escA(t.displayName)}">${escH(t.displayName)}</span>
      <button class="sb-item-del" title="Delete sheet">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    div.querySelector('.sb-item-del').addEventListener('click', e => App.deleteSheet(t.fullName, t.displayName, e));
    div.addEventListener('click', () => App.selectSheet(t.fullName));
    list.appendChild(div);
  });
}

function _renderGrid() {
  _renderGridHead();
  _renderGridBody();
  _renderPagination();
  _updateMeta();
}

function _renderGridHead() {
  const thead = document.getElementById('gridHead');
  const cols  = S.columns;
  let html = '<tr><th class="th-rn">#</th>';
  cols.forEach(col => {
    const sorted = S.sortCol === col.name;
    const dir    = S.sortDir;
    html += `<th data-col="${escA(col.name)}" class="${sorted ? 'sort-'+dir : ''}" onclick="App.sortBy('${escA(col.name)}')"
      style="${col.name==='id'?'width:54px;min-width:54px;':'min-width:110px;'}">
      <div class="th-inner">
        <span>${escH(col.name)}</span>
        <svg class="th-sort" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          ${sorted && dir==='desc' ? '<polyline points="6 9 12 15 18 9"/>' : '<polyline points="18 15 12 9 6 15"/>'}
        </svg>
      </div></th>`;
  });
  html += '<th></th></tr>';
  thead.innerHTML = html;
}

function _renderGridBody() {
  const tbody = document.getElementById('gridBody');
  const cols  = S.columns;
  const start = S.page * S.pageSize;
  const slice = S.filteredRows.slice(start, start + S.pageSize);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="${cols.length + 2}" class="grid-empty">No rows yet. Click <strong>Add Row</strong> to insert data.</td></tr>`;
    return;
  }

  let html = '';
  slice.forEach((row, ri) => {
    const globalN = start + ri + 1;
    html += `<tr>`;
    html += `<td class="td-rn">${globalN}</td>`;
    cols.forEach(col => {
      const val = row[col.name] ?? '';
      if (col.pk) {
        html += `<td><input class="cell-inp id-cell" type="text" value="${escA(String(val))}" readonly tabindex="-1"></td>`;
      } else {
        html += `<td><input class="cell-inp" type="text" value="${escA(String(val))}"
          onchange="App.onCellChange(${row['id']},'${escA(col.name)}',this.value)"
          onfocus="this.closest('tr').classList.add('row-sel')"
          onblur="this.closest('tr').classList.remove('row-sel')"></td>`;
      }
    });
    html += `<td class="td-del">
      <button class="btn-del-row" onclick="App.promptDeleteRow(${row['id']})" title="Delete row">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button></td>`;
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

function _renderPagination() {
  const total = S.filteredRows.length;
  const pages = Math.max(1, Math.ceil(total / S.pageSize));
  document.getElementById('pageLabel').textContent = `Page ${S.page + 1} of ${pages}`;
  document.getElementById('btnPrev').disabled = S.page === 0;
  document.getElementById('btnNext').disabled = S.page >= pages - 1;
}

function _updateMeta() {
  const total    = S.rows.length;
  const filtered = S.filteredRows.length;
  const cols     = S.columns.length;
  const rowText  = filtered === total ? `${total} row${total!==1?'s':''}` : `${filtered} of ${total} rows`;
  document.getElementById('gridMeta').textContent = `${rowText}  ·  ${cols} column${cols!==1?'s':''}`;
}

function _setStatus(msg) {
  document.getElementById('gridStatus').textContent = msg;
}

// ─────────────────────────────────────────────────────────────
// CSV PARSER
// ─────────────────────────────────────────────────────────────
function parseCsv(line) {
  const res = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1]==='"') { cur+='"'; i++; } else inQ=!inQ; }
    else if (c === ',' && !inQ) { res.push(cur.trim()); cur=''; }
    else cur+=c;
  }
  res.push(cur.trim());
  return res;
}

// ─────────────────────────────────────────────────────────────
// KEYBOARD
// ─────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') Modal.closeAll();
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    const open = document.querySelector('.overlay.open .modal-ft .btn-primary');
    if (open) open.click();
  }
  // Enter in grid = move down one row
  if (e.key === 'Enter' && document.activeElement?.classList.contains('cell-inp') && !document.activeElement.readOnly) {
    const all = [...document.querySelectorAll('.cell-inp:not([readonly])')];
    const idx = all.indexOf(document.activeElement);
    const nonPkCount = S.columns.filter(c => !c.pk).length;
    const next = all[idx + nonPkCount];
    if (next) { next.focus(); next.select(); }
    e.preventDefault();
  }
});

// ─────────────────────────────────────────────────────────────
// WIRE UP FORMS
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('signInForm').addEventListener('submit',  e => { e.preventDefault(); Auth.signIn(e); });
  document.getElementById('registerForm').addEventListener('submit', e => { e.preventDefault(); Auth.register(e); });

  // Live-update avatar initial as user types first name
  document.getElementById('regFirstName').addEventListener('input', updateRegisterAvatarInitial);

  // Boot
  Auth.init();
});
