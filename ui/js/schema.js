'use strict';
/* =============================================================
   Tracker: schema: metadata tables, column kinds, templates
============================================================= */

// Column kinds. `sql` is the storage affinity; everything else is UI.
const KINDS = {
  text:     { label: 'Text',      icon: 'text',      sql: 'TEXT',    desc: 'Names, notes, anything' },
  number:   { label: 'Number',    icon: 'hash',      sql: 'REAL',    desc: 'Quantities, prices, scores' },
  marks:    { label: 'Marks',     icon: 'award',     sql: 'REAL',    desc: 'Score out of a maximum' },
  date:     { label: 'Date',      icon: 'calendar',  sql: 'TEXT',    desc: 'Due dates and events for the calendar' },
  checkbox: { label: 'Checkbox',  icon: 'checkbox',  sql: 'INTEGER', desc: 'Done / not done' },
  select:   { label: 'Status',    icon: 'tag',       sql: 'TEXT',    desc: 'Pick one from a list' },
  file:     { label: 'File',      icon: 'paperclip', sql: 'TEXT',    desc: 'Upload a document or image' },
  email:    { label: 'Email',     icon: 'mail',      sql: 'TEXT',    desc: 'Email addresses' },
  url:      { label: 'Link',      icon: 'link',      sql: 'TEXT',    desc: 'Web addresses' }
};

// Soft pill tints for select options, assigned in order.
const CHOICE_COLORS = ['gray', 'blue', 'amber', 'green', 'red', 'violet', 'pink', 'teal'];
const DONE_WORDS = /^(done|complete|completed|finished|closed|resolved|present|paid|delivered|passed|shipped|in stock)$/i;

const TEMPLATES = [
  {
    id: 'blank', name: 'Blank sheet', icon: 'table',
    desc: 'Start from scratch and add the columns you need.',
    columns: [{ name: 'Name', kind: 'text' }]
  },
  {
    id: 'todo', name: 'To-do list', icon: 'checkbox',
    desc: 'Tasks with status, priority and due dates. Get reminded when things are due.',
    columns: [
      { name: 'Task', kind: 'text' },
      { name: 'Status', kind: 'select', options: { choices: [
        { label: 'To do', color: 'gray' }, { label: 'In progress', color: 'blue' }, { label: 'Done', color: 'green', done: true }] } },
      { name: 'Priority', kind: 'select', options: { choices: [
        { label: 'Low', color: 'gray' }, { label: 'Medium', color: 'amber' }, { label: 'High', color: 'red' }] } },
      { name: 'Due date', kind: 'date' },
      { name: 'Assignee', kind: 'text' },
      { name: 'Notes', kind: 'text' }
    ]
  },
  {
    id: 'marks', name: 'Marks & grades', icon: 'award',
    desc: 'Record student scores out of a maximum. Averages and distribution on the dashboard.',
    columns: [
      { name: 'Student', kind: 'text' },
      { name: 'Roll no', kind: 'text' },
      { name: 'Subject', kind: 'text' },
      { name: 'Marks', kind: 'marks', options: { max: 100 } },
      { name: 'Result', kind: 'select', options: { choices: [
        { label: 'Pass', color: 'green', done: true }, { label: 'Fail', color: 'red' }, { label: 'Pending', color: 'gray' }] } },
      { name: 'Exam date', kind: 'date' },
      { name: 'Remarks', kind: 'text' }
    ]
  },
  {
    id: 'attendance', name: 'Attendance', icon: 'users',
    desc: 'Daily presence for a class or team, laid out on the calendar.',
    columns: [
      { name: 'Name', kind: 'text' },
      { name: 'Member ID', kind: 'text' },
      { name: 'Date', kind: 'date' },
      { name: 'Status', kind: 'select', options: { choices: [
        { label: 'Present', color: 'green', done: true }, { label: 'Absent', color: 'red' }, { label: 'Late', color: 'amber' }, { label: 'Leave', color: 'violet' }] } },
      { name: 'Notes', kind: 'text' }
    ]
  },
  {
    id: 'inventory', name: 'Inventory', icon: 'box',
    desc: 'Items, quantities, prices and photos, so you know what you have.',
    columns: [
      { name: 'Item', kind: 'text' },
      { name: 'SKU', kind: 'text' },
      { name: 'Category', kind: 'select', options: { choices: [
        { label: 'General', color: 'gray' }, { label: 'Electronics', color: 'blue' }, { label: 'Supplies', color: 'teal' }] } },
      { name: 'Quantity', kind: 'number' },
      { name: 'Unit price', kind: 'number' },
      { name: 'Last restocked', kind: 'date' },
      { name: 'Photo', kind: 'file' }
    ]
  },
  {
    id: 'import', name: 'Import a file', icon: 'upload',
    desc: 'Create a sheet from a CSV or Excel file. Column types are detected for you.',
    columns: []
  }
];

const SYS_COLS = new Set(['id', '_created_at', '_updated_at']);

const Schema = {
  async init() {
    await sql(`CREATE TABLE IF NOT EXISTS tracker_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password TEXT NOT NULL,
      avatar_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await sql(`CREATE TABLE IF NOT EXISTS tracker_workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await Schema._ensureColumn('tracker_workspaces', 'owner_email', 'TEXT');
    await sql(`CREATE TABLE IF NOT EXISTS tracker_sheets (
      table_name TEXT PRIMARY KEY,
      workspace_id INTEGER,
      display_name TEXT,
      template TEXT DEFAULT 'blank',
      created_at TEXT
    )`);
    await sql(`CREATE TABLE IF NOT EXISTS tracker_columns (
      table_name TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text',
      options TEXT,
      position INTEGER DEFAULT 0,
      PRIMARY KEY (table_name, name)
    )`);
    await sql(`CREATE TABLE IF NOT EXISTS tracker_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      user_email TEXT,
      workspace_id INTEGER,
      table_name TEXT,
      row_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT
    )`);
    await sql(`CREATE TABLE IF NOT EXISTS tracker_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
    await sql('CREATE INDEX IF NOT EXISTS idx_activity_at ON tracker_activity(at)');
    await sql('CREATE INDEX IF NOT EXISTS idx_activity_table ON tracker_activity(table_name, row_id)');
  },

  async _ensureColumn(table, col, type) {
    const info = await sql(`PRAGMA table_info(${qi(table)})`);
    if (!(info.rows || []).some(r => r[1] === col)) {
      await sql(`ALTER TABLE ${qi(table)} ADD COLUMN ${qi(col)} ${type}`);
    }
  },

  prefix(wsName) { return 'ws_' + slug(wsName); },

  // All sheets for a workspace, registered ones plus legacy tables found by prefix.
  async sheetsFor(ws) {
    const reg = await sqlObjects(`SELECT table_name, display_name, template, created_at FROM tracker_sheets WHERE workspace_id=${ws.id}`);
    const known = new Set(reg.map(r => r.table_name));
    const prefix = Schema.prefix(ws.name) + '_';
    const legacy = await sql(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '${esc(prefix)}%'`);
    for (const [name] of legacy.rows || []) {
      if (known.has(name)) continue;
      const display = name.slice(prefix.length).replace(/_/g, ' ');
      await sql(`INSERT OR IGNORE INTO tracker_sheets (table_name, workspace_id, display_name, template, created_at)
        VALUES ('${esc(name)}', ${ws.id}, '${esc(display)}', 'blank', '${nowIso()}')`);
      reg.push({ table_name: name, display_name: display, template: 'blank', created_at: nowIso() });
    }
    const existing = new Set((await sql(`SELECT name FROM sqlite_master WHERE type='table'`)).rows.map(r => r[0]));
    return reg
      .filter(r => existing.has(r.table_name))
      .map(r => ({ fullName: r.table_name, displayName: r.display_name || r.table_name, template: r.template || 'blank', createdAt: r.created_at }))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  },

  async uniqueTableName(ws, display) {
    const base = Schema.prefix(ws.name) + '_' + slug(display);
    const names = new Set((await sql(`SELECT name FROM sqlite_master WHERE type='table'`)).rows.map(r => r[0]));
    let name = base, i = 2;
    while (names.has(name)) name = `${base}_${i++}`;
    return name;
  },

  async createSheet(ws, display, template, columns) {
    const table = await Schema.uniqueTableName(ws, display);
    const used = new Set(SYS_COLS);
    const cols = [];
    columns.forEach(c => {
      let key = colKey(c.name);
      if (!key) return;
      let k = key, i = 2;
      while (used.has(k.toLowerCase())) k = `${key}_${i++}`;
      used.add(k.toLowerCase());
      cols.push({ ...c, name: k });
    });
    const defs = ['id INTEGER PRIMARY KEY AUTOINCREMENT', '_created_at TEXT', '_updated_at TEXT',
      ...cols.map(c => `${qi(c.name)} ${KINDS[c.kind]?.sql || 'TEXT'}`)];
    await sql(`CREATE TABLE ${qi(table)} (${defs.join(', ')})`);
    await sql(`INSERT INTO tracker_sheets (table_name, workspace_id, display_name, template, created_at)
      VALUES ('${esc(table)}', ${ws.id}, '${esc(display)}', '${esc(template)}', '${nowIso()}')`);
    for (let i = 0; i < cols.length; i++) await Schema.saveColumnMeta(table, cols[i].name, cols[i].kind, cols[i].options, i + 1);
    return { table, columns: cols };
  },

  async saveColumnMeta(table, name, kind, options, position) {
    await sql(`INSERT INTO tracker_columns (table_name, name, kind, options, position)
      VALUES ('${esc(table)}', '${esc(name)}', '${esc(kind)}', ${sqlv(options ? JSON.stringify(options) : null)}, ${position ?? 0})
      ON CONFLICT(table_name, name) DO UPDATE SET kind=excluded.kind, options=excluded.options${position !== undefined ? ', position=excluded.position' : ''}`);
  },

  // Load column definitions for a sheet, merging SQL schema with stored kinds.
  async columns(table) {
    await Schema._ensureColumn(table, '_created_at', 'TEXT');
    await Schema._ensureColumn(table, '_updated_at', 'TEXT');
    const info = await sql(`PRAGMA table_info(${qi(table)})`);
    const meta = await sqlObjects(`SELECT name, kind, options, position FROM tracker_columns WHERE table_name='${esc(table)}'`);
    const byName = Object.fromEntries(meta.map(m => [m.name, m]));
    return (info.rows || []).map((r, i) => {
      const name = r[1], type = String(r[2] || '').toUpperCase(), m = byName[name];
      let kind = m?.kind;
      if (!kind || !KINDS[kind]) kind = /INT|REAL|NUM|FLOAT|DOUB/.test(type) ? 'number' : /DATE/.test(type) ? 'date' : 'text';
      let options = {};
      try { options = m?.options ? JSON.parse(m.options) : {}; } catch {}
      return { name, type, kind, options, pk: !!r[5], sys: SYS_COLS.has(name), position: m?.position ?? (100 + i) };
    }).sort((a, b) => (a.sys - b.sys) || a.position - b.position);
  },

  async addColumn(table, name, kind, options) {
    const key = colKey(name);
    if (!key) throw new Error('Enter a column name');
    if (SYS_COLS.has(key.toLowerCase())) throw new Error('That name is reserved');
    await sql(`ALTER TABLE ${qi(table)} ADD COLUMN ${qi(key)} ${KINDS[kind]?.sql || 'TEXT'}`);
    const pos = await sql(`SELECT COALESCE(MAX(position), 0) + 1 FROM tracker_columns WHERE table_name='${esc(table)}'`);
    await Schema.saveColumnMeta(table, key, kind, options, pos.rows[0][0]);
    return key;
  },

  async renameColumn(table, from, to) {
    const key = colKey(to);
    if (!key || key === from) return from;
    await sql(`ALTER TABLE ${qi(table)} RENAME COLUMN ${qi(from)} TO ${qi(key)}`);
    await sql(`UPDATE tracker_columns SET name='${esc(key)}' WHERE table_name='${esc(table)}' AND name='${esc(from)}'`);
    return key;
  },

  async dropColumn(table, name) {
    await sql(`ALTER TABLE ${qi(table)} DROP COLUMN ${qi(name)}`);
    await sql(`DELETE FROM tracker_columns WHERE table_name='${esc(table)}' AND name='${esc(name)}'`);
  },

  async dropSheet(table) {
    await sql(`DROP TABLE IF EXISTS ${qi(table)}`);
    await sql(`DELETE FROM tracker_sheets WHERE table_name='${esc(table)}'`);
    await sql(`DELETE FROM tracker_columns WHERE table_name='${esc(table)}'`);
  }
};

// Small key/value store kept inside the database, so it travels with the data
// (sessions, the remembered account) instead of living in browser storage.
const Settings = {
  async get(key) {
    const r = await sql(`SELECT value FROM tracker_settings WHERE key='${esc(key)}'`);
    const v = r.rows?.[0]?.[0];
    if (v === undefined || v === null) return null;
    try { return JSON.parse(v); } catch { return null; }
  },
  async set(key, value) {
    await sql(`INSERT INTO tracker_settings (key, value) VALUES ('${esc(key)}', '${esc(JSON.stringify(value))}')
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  },
  async del(key) {
    await sql(`DELETE FROM tracker_settings WHERE key='${esc(key)}'`);
  }
};

// ── column helpers ──────────────────────────────────────────
function visibleCols(cols) { return cols.filter(c => !c.sys); }
function primaryCol(cols) { return visibleCols(cols).find(c => c.kind === 'text') || visibleCols(cols)[0]; }
function dateCols(cols) { return visibleCols(cols).filter(c => c.kind === 'date'); }
function choiceOf(col, value) {
  return (col.options?.choices || []).find(ch => ch.label === value);
}
function isDoneChoice(col, value) {
  const ch = choiceOf(col, value);
  return ch ? !!ch.done || DONE_WORDS.test(ch.label) : DONE_WORDS.test(String(value || ''));
}
// The column that says whether a row is "complete": first checkbox, else first status with a done option.
function completionCol(cols) {
  const v = visibleCols(cols);
  return v.find(c => c.kind === 'checkbox') ||
         v.find(c => c.kind === 'select' && (c.options?.choices || []).some(ch => ch.done || DONE_WORDS.test(ch.label)));
}
// The date column that represents a deadline (drives reminders): any date column
// in a to-do sheet, otherwise one whose name reads like a deadline.
function deadlineCol(cols, template) {
  const dcs = dateCols(cols);
  return dcs.find(c => /due|deadline|remind|expir|until|end|target|submit/i.test(c.name)) ||
         (template === 'todo' ? dcs[0] : null);
}
function isRowDone(col, row) {
  if (!col) return false;
  const v = row[col.name];
  return col.kind === 'checkbox' ? v === 1 || v === '1' || v === true : isDoneChoice(col, v);
}
function parseFileCell(v) {
  if (!v) return null;
  try { const f = JSON.parse(v); return f && f.data ? f : null; } catch { return null; }
}
function displayValue(col, v) {
  if (v === null || v === undefined || v === '') return '';
  if (col.kind === 'checkbox') return (v === 1 || v === '1') ? 'Yes' : 'No';
  if (col.kind === 'file') return parseFileCell(v)?.name || '';
  if (col.kind === 'date') return String(v).slice(0, 10);
  return v;
}
