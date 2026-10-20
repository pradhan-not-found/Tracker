'use strict';
/* =============================================================
   Tracker: new-sheet wizard (templates + live preview),
   import (CSV / Excel) and export (CSV / Excel / JSON)
============================================================= */

// ─────────────────────────────────────────────────────────────
// NEW SHEET WIZARD
// ─────────────────────────────────────────────────────────────
const SheetWizard = {
  tpl: 'blank',
  cols: [],          // working copy of columns
  importData: null,  // { file, headers, rows } when creating from a file

  open(tplId = 'blank') {
    SheetWizard.importData = null;
    document.getElementById('sheetName').value = '';
    document.getElementById('wizFileName').textContent = '';
    SheetWizard.pick(tplId, true);
    Modal.open('modalSheet');
  },

  pick(id, silent) {
    const tpl = TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
    SheetWizard.tpl = tpl.id;
    if (tpl.id !== 'import') {
      SheetWizard.importData = null;
      SheetWizard.cols = tpl.columns.map(c => ({ ...c, options: c.options ? JSON.parse(JSON.stringify(c.options)) : undefined }));
    } else if (!SheetWizard.importData) {
      SheetWizard.cols = [];
    }
    const name = document.getElementById('sheetName');
    if (!name.value || TEMPLATES.some(t => t.name === name.value)) name.value = tpl.id === 'blank' || tpl.id === 'import' ? '' : tpl.name;
    document.getElementById('wizTemplates').innerHTML = TEMPLATES.map(t => `
      <button type="button" class="tpl-opt${t.id === tpl.id ? ' on' : ''}" onclick="SheetWizard.pick('${t.id}')">
        <span class="tpl-ic">${icon(t.icon, 16)}</span>
        <span class="tpl-txt"><b>${escH(t.name)}</b><small>${escH(t.desc)}</small></span>
      </button>`).join('');
    document.getElementById('wizImport').style.display = tpl.id === 'import' ? '' : 'none';
    SheetWizard.renderCols();
    if (!silent) Motion.enter(document.getElementById('wizPreview'), { y: 8, duration: .45 });
  },

  renderCols() {
    const list = document.getElementById('sheetColList');
    list.innerHTML = SheetWizard.cols.map((c, i) => `
      <div class="col-row">
        <input class="field-inp col-name-inp" type="text" value="${escA(c.name)}" placeholder="Column name" oninput="SheetWizard.cols[${i}].name=this.value;SheetWizard.renderPreview()">
        <select class="field-sel" onchange="SheetWizard.setKind(${i}, this.value)">
          ${Object.entries(KINDS).map(([k, m]) => `<option value="${k}"${k === c.kind ? ' selected' : ''}>${m.label}</option>`).join('')}
        </select>
        <span class="col-kind-ic">${icon(KINDS[c.kind]?.icon || 'text', 14)}</span>
        <button class="btn-col-del" onclick="SheetWizard.removeCol(${i})" title="Remove">${icon('x', 13, 2)}</button>
      </div>`).join('') || `<div class="sb-empty">${SheetWizard.tpl === 'import' ? 'Choose a file to detect its columns.' : 'No columns yet.'}</div>`;
    SheetWizard.renderPreview();
  },

  setKind(i, kind) {
    const c = SheetWizard.cols[i];
    c.kind = kind;
    if (kind === 'select' && !c.options?.choices) c.options = { choices: [{ label: 'To do', color: 'gray' }, { label: 'Done', color: 'green', done: true }] };
    if (kind === 'marks' && !c.options?.max) c.options = { max: 100 };
    SheetWizard.renderCols();
  },
  addCol() {
    SheetWizard.cols.push({ name: '', kind: 'text' });
    SheetWizard.renderCols();
    const inputs = document.querySelectorAll('#sheetColList .col-name-inp');
    inputs[inputs.length - 1]?.focus();
  },
  removeCol(i) { SheetWizard.cols.splice(i, 1); SheetWizard.renderCols(); },

  // Live preview: what the empty sheet will look like (no data is stored).
  renderPreview() {
    const cols = SheetWizard.cols.filter(c => c.name.trim());
    const sampleRows = SheetWizard.importData ? SheetWizard.importData.rows.slice(0, 3) : null;
    const cell = (c, i) => {
      if (sampleRows) return escH(String(sampleRows[i]?.[c.src ?? c.name] ?? ''));
      if (c.kind === 'checkbox') return '<span class="cb sm"></span>';
      if (c.kind === 'select') { const ch = c.options?.choices?.[0]; return ch ? `<span class="pill pill-${ch.color}">${escH(ch.label)}</span>` : ''; }
      if (c.kind === 'marks') return `<span class="pv-ph">0 / ${c.options?.max || 100}</span>`;
      if (c.kind === 'file') return `<span class="pv-ph">${icon('paperclip', 11)} Upload</span>`;
      if (c.kind === 'date') return '<span class="pv-ph">dd/mm/yyyy</span>';
      return '<span class="pv-line"></span>';
    };
    const views = [['table', 'Table'], ['calendar', 'Calendar'], ['chart', 'Dashboard']]
      .filter(([v]) => v !== 'calendar' || cols.some(c => c.kind === 'date'));
    const reminds = !!deadlineCol(cols, SheetWizard.tpl) && !!completionCol(cols);
    document.getElementById('wizPreview').innerHTML = cols.length ? `
      <div class="pv-table-wrap"><table class="pv-table">
        <thead><tr>${cols.map(c => `<th>${icon(KINDS[c.kind]?.icon || 'text', 11)} ${escH(c.name)}</th>`).join('')}</tr></thead>
        <tbody>${[0, 1, 2].map(i => `<tr>${cols.map(c => `<td>${cell(c, i)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <div class="pv-notes">
        <span class="pv-note">${icon('grid', 13)} Views: ${views.map(v => v[1]).join(' · ')}</span>
        ${reminds ? `<span class="pv-note">${icon('bell', 13)} You'll be reminded when items are due</span>` : ''}
        ${SheetWizard.importData ? `<span class="pv-note">${icon('upload', 13)} ${plural(SheetWizard.importData.rows.length, 'record')} will be imported</span>` : `<span class="pv-note">${icon('activity', 13)} Every change is tracked</span>`}
      </div>` : `<div class="pv-empty">${icon('columns', 20, 1.4)}<span>Your columns will preview here</span></div>`;
  },

  async onFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { headers, rows } = await IO.readFile(file);
      if (!headers.length) { toast('No columns found in that file', 'error'); return; }
      SheetWizard.importData = { file: file.name, headers, rows };
      SheetWizard.cols = headers.map(h => ({ name: h, src: h, ...IO.inferKind(rows.map(r => r[h])) }));
      document.getElementById('wizFileName').textContent = `${file.name} · ${plural(rows.length, 'row')}`;
      const name = document.getElementById('sheetName');
      if (!name.value) name.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      SheetWizard.renderCols();
    } catch (err) { toast('Could not read file: ' + err.message, 'error'); }
  },

  async create() {
    const display = document.getElementById('sheetName').value.trim();
    if (!display) { toast('Give your sheet a name', 'error'); document.getElementById('sheetName').focus(); return; }
    const cols = SheetWizard.cols.filter(c => c.name.trim());
    if (!cols.length) { toast('Add at least one column', 'error'); return; }
    const btn = document.querySelector('#modalSheet .modal-primary');
    btn.disabled = true;
    try {
      const { table, columns } = await Schema.createSheet(S.activeWs, display, SheetWizard.tpl, cols);
      await Activity.log('sheet.create', { table, detail: { sheet: display, template: SheetWizard.tpl } });
      if (SheetWizard.importData) {
        const mapped = columns.map((c, i) => ({ ...c, src: cols[i].src }));
        const n = await IO.insertRows(table, mapped, SheetWizard.importData.rows);
        await Activity.log('import', { table, detail: { sheet: display, count: n, file: SheetWizard.importData.file } });
      }
      Modal.close('modalSheet');
      await App.loadSheets();
      await App.refreshAllSheets();
      await App.selectSheet(table, 'table');
      Inbox.scan();
      toast(`“${display}” created`, 'success');
    } catch (err) { toast('Could not create sheet: ' + err.message, 'error'); }
    finally { btn.disabled = false; }
  }
};

// ─────────────────────────────────────────────────────────────
// IMPORT / EXPORT
// ─────────────────────────────────────────────────────────────
const IO = {
  // Parse CSV / XLSX / XLS into { headers, rows:[{header:value}] }
  async readFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    let matrix;
    if (window.XLSX && ['xlsx', 'xls', 'xlsm', 'ods'].includes(ext)) {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' });
    } else if (window.XLSX) {
      const wb = XLSX.read(await file.text(), { type: 'string', raw: true });
      matrix = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
    } else {
      matrix = IO.parseCsv(await file.text());
    }
    matrix = matrix.filter(r => r.some(v => String(v).trim() !== ''));
    if (!matrix.length) return { headers: [], rows: [] };
    const seen = {};
    const headers = matrix[0].map((h, i) => {
      let k = String(h).trim() || `Column ${i + 1}`;
      if (seen[k]) k = `${k} ${++seen[k]}`; else seen[k] = 1;
      return k;
    });
    const rows = matrix.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] === undefined ? '' : String(r[i]).trim()])));
    return { headers, rows };
  },

  parseCsv(text) {
    const out = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); out.push(row); row = []; cur = '';
      } else cur += c;
    }
    if (cur || row.length) { row.push(cur); out.push(row); }
    return out;
  },

  inferKind(values) {
    const vals = values.map(v => String(v ?? '').trim()).filter(Boolean);
    if (!vals.length) return { kind: 'text' };
    if (vals.every(v => /^-?\d+(\.\d+)?$/.test(v.replace(/,/g, '')))) return { kind: 'number' };
    if (vals.every(v => /^\d{4}-\d{1,2}-\d{1,2}/.test(v) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(v))) return { kind: 'date' };
    if (vals.every(v => /^(true|false|yes|no|y|n|1|0|✓|x)$/i.test(v))) return { kind: 'checkbox' };
    if (vals.every(v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))) return { kind: 'email' };
    if (vals.every(v => /^https?:\/\//i.test(v))) return { kind: 'url' };
    const distinct = [...new Set(vals)];
    if (vals.length >= 4 && distinct.length <= 8 && distinct.length <= vals.length / 2 && distinct.every(v => v.length <= 24)) {
      return { kind: 'select', options: { choices: distinct.map((label, i) => ({ label, color: CHOICE_COLORS[i % CHOICE_COLORS.length], done: DONE_WORDS.test(label) })) } };
    }
    return { kind: 'text' };
  },

  normalize(col, raw) {
    const v = String(raw ?? '').trim();
    if (v === '') return null;
    if (col.kind === 'number' || col.kind === 'marks') { const n = Number(v.replace(/,/g, '')); return isNaN(n) ? null : n; }
    if (col.kind === 'checkbox') return /^(true|yes|y|1|✓|x)$/i.test(v) ? 1 : 0;
    if (col.kind === 'date') {
      if (/^\d{4}-\d{1,2}-\d{1,2}/.test(v)) { const d = parseDay(v); return d ? todayStr(d) : v; }
      const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
      if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return todayStr(new Date(y, +m[2] - 1, +m[1])); }
      const d = new Date(v); return isNaN(d) ? v : todayStr(d);
    }
    return v;
  },

  // Insert rows in chunks; `cols` carry `src` = source header.
  async insertRows(table, cols, rows) {
    const now = nowIso();
    const names = ['_created_at', '_updated_at', ...cols.map(c => c.name)];
    let n = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200).map(r =>
        `(${[sqlv(now), sqlv(now), ...cols.map(c => sqlv(IO.normalize(c, r[c.src])))].join(',')})`);
      await sql(`INSERT INTO ${qi(table)} (${names.map(qi).join(',')}) VALUES ${chunk.join(',')}`);
      n += chunk.length;
    }
    return n;
  },

  // ── import into current sheet ──
  openImport() { document.getElementById('importInput').click(); },

  async onImportFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || !S.activeSheet) return;
    try {
      const { headers, rows } = await IO.readFile(file);
      if (!rows.length) { toast('That file has no rows to import', 'error'); return; }
      const vis = visibleCols(S.columns);
      const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = [], missing = [];
      headers.forEach(h => {
        const col = vis.find(c => norm(c.name) === norm(h));
        if (col) matched.push({ ...col, src: h }); else missing.push(h);
      });
      let created = 0;
      for (const h of missing) {
        const inferred = IO.inferKind(rows.map(r => r[h]));
        const key = await Schema.addColumn(S.activeSheet, h, inferred.kind, inferred.options);
        matched.push({ name: key, kind: inferred.kind, options: inferred.options, src: h });
        created++;
      }
      const n = await IO.insertRows(S.activeSheet, matched, rows);
      await Activity.log('import', { table: S.activeSheet, detail: { sheet: S.sheetMeta?.displayName, count: n, file: file.name } });
      await App.loadData({ animate: true });
      Inbox.scan();
      toast(`Imported ${plural(n, 'record')}${created ? ` · ${plural(created, 'new column')}` : ''}`, 'success');
    } catch (err) { toast('Import failed: ' + err.message, 'error'); }
  },

  // ── export ──
  exportMenu(btn) {
    Pop.open(btn, `
      <div class="pop-title">${icon('download', 13)} <span>Export “${escH(S.sheetMeta?.displayName || 'sheet')}”</span></div>
      <button class="pm-item" onclick="Pop.close();IO.exportSheet('xlsx')">${icon('grid', 15)} Excel workbook <span class="pm-hint">.xlsx</span></button>
      <button class="pm-item" onclick="Pop.close();IO.exportSheet('csv')">${icon('table', 15)} CSV <span class="pm-hint">.csv</span></button>
      <button class="pm-item" onclick="Pop.close();IO.exportSheet('json')">${icon('json', 15)} JSON <span class="pm-hint">.json</span></button>
      <div class="pm-sep"></div>
      <button class="pm-item" onclick="Pop.close();IO.exportWorkspace()">${icon('folder', 15)} Whole workspace <span class="pm-hint">.xlsx</span></button>`, { width: 240, align: 'end' });
  },

  _matrix(cols, rows) {
    return [
      [...cols.map(c => c.name.replace(/_/g, ' ')), 'Created', 'Last edited'],
      ...rows.map(r => [...cols.map(c => {
        const v = r[c.name];
        if (c.kind === 'number' || c.kind === 'marks') return v === null || v === '' ? '' : Number(v);
        return displayValue(c, v);
      }), r._created_at || '', r._updated_at || ''])
    ];
  },

  _fileBase(name) { return String(name).replace(/[\\/:*?"<>|]+/g, '').trim() || 'export'; },

  async exportSheet(format) {
    const cols = visibleCols(S.columns), rows = S.rows;
    const base = IO._fileBase(S.sheetMeta?.displayName || 'sheet');
    if (format === 'csv') {
      const csv = IO._matrix(cols, rows).map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
      downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), base + '.csv');
    } else if (format === 'json') {
      const data = {
        sheet: S.sheetMeta?.displayName, workspace: S.activeWs?.name, exportedAt: nowIso(),
        columns: cols.map(c => ({ name: c.name, type: c.kind, options: c.options })),
        records: rows.map(r => Object.fromEntries([['id', r.id], ...cols.map(c => [c.name, c.kind === 'file' ? parseFileCell(r[c.name]) : r[c.name]]), ['createdAt', r._created_at], ['updatedAt', r._updated_at]]))
      };
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), base + '.json');
    } else {
      if (!window.XLSX) { toast('Excel export is unavailable', 'error'); return; }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, IO._xlsxSheet(cols, rows), base.slice(0, 31));
      IO._writeXlsx(wb, base + '.xlsx');
    }
    Activity.log('export', { table: S.activeSheet, detail: { what: S.sheetMeta?.displayName, format: format.toUpperCase() } });
    toast(`Exported ${plural(rows.length, 'record')}`, 'success');
  },

  _xlsxSheet(cols, rows) {
    const ws = XLSX.utils.aoa_to_sheet(IO._matrix(cols, rows));
    ws['!cols'] = [...cols, {}, {}].map(c => ({ wch: Math.min(40, Math.max(10, (c.name || '').length + 4)) }));
    return ws;
  },

  _writeXlsx(wb, filename) {
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  },

  async exportWorkspace() {
    if (!S.activeWs || !window.XLSX) return;
    const sheets = await Schema.sheetsFor(S.activeWs);
    if (!sheets.length) { toast('This workspace has no sheets yet', 'info'); return; }
    const wb = XLSX.utils.book_new();
    const used = new Set();
    let total = 0;
    for (const sh of sheets) {
      const cols = visibleCols(await Schema.columns(sh.fullName));
      const rows = await sqlObjects(`SELECT * FROM ${qi(sh.fullName)} ORDER BY id`);
      total += rows.length;
      let name = IO._fileBase(sh.displayName).slice(0, 28) || 'Sheet', i = 2;
      while (used.has(name.toLowerCase())) name = name.slice(0, 26) + ' ' + i++;
      used.add(name.toLowerCase());
      XLSX.utils.book_append_sheet(wb, IO._xlsxSheet(cols, rows), name);
    }
    IO._writeXlsx(wb, IO._fileBase(S.activeWs.name) + '.xlsx');
    Activity.log('export', { detail: { what: S.activeWs.name + ' (workspace)', format: 'XLSX' } });
    toast(`Exported ${plural(sheets.length, 'sheet')} · ${plural(total, 'record')}`, 'success');
  }
};
