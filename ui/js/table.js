'use strict';
/* =============================================================
   Tracker — table view (spreadsheet grid), cell editors,
   column editor, record drawer
============================================================= */

// ── cell editors ─────────────────────────────────────────────
const Cell = {
  // HTML for an editable value. `ci` is the index into S.columns.
  editor(col, ci, row, { inDrawer = false } = {}) {
    const v = row[col.name];
    const id = row.id;
    const base = `data-row="${id}" data-ci="${ci}"`;
    const cls = inDrawer ? 'field-inp' : 'cell-inp';
    switch (col.kind) {
      case 'checkbox': {
        const on = v === 1 || v === '1';
        return `<button class="cb${on ? ' on' : ''}" ${base} onclick="Cell.toggle(this)" role="checkbox" aria-checked="${on}" aria-label="${escA(col.name)}">${icon('check', 12, 3)}</button>`;
      }
      case 'select': {
        const choices = col.options?.choices || [];
        const ch = choiceOf(col, v);
        const opts = ['<option value="">—</option>', ...choices.map(c => `<option value="${escA(c.label)}"${c.label === v ? ' selected' : ''}>${escH(c.label)}</option>`)];
        if (v && !ch) opts.push(`<option value="${escA(v)}" selected>${escH(v)}</option>`);
        return `<span class="pill-sel pill-${ch?.color || 'none'}${v ? '' : ' empty'}"><select ${base} onchange="Cell.change(this)" aria-label="${escA(col.name)}">${opts.join('')}</select></span>`;
      }
      case 'date':
        return `<input class="${cls} cell-date" type="date" ${base} value="${escA(String(v ?? '').slice(0, 10))}" onchange="Cell.change(this)" ${inDrawer ? '' : 'onfocus="Cell.focus(this)" onblur="Cell.blur(this)"'}>`;
      case 'number':
        return `<input class="${cls} cell-num" type="number" step="any" ${base} value="${escA(v ?? '')}" onchange="Cell.change(this)" ${inDrawer ? '' : 'onfocus="Cell.focus(this)" onblur="Cell.blur(this)"'}>`;
      case 'marks': {
        const max = Number(col.options?.max) || 100;
        const pct = v === null || v === '' || v === undefined ? null : Math.max(0, Math.min(100, Number(v) / max * 100));
        return `<span class="marks-cell${inDrawer ? ' in-drawer' : ''}">
          <input class="${cls} cell-num" type="number" step="any" min="0" max="${max}" ${base} value="${escA(v ?? '')}" onchange="Cell.change(this)" ${inDrawer ? '' : 'onfocus="Cell.focus(this)" onblur="Cell.blur(this)"'}>
          <span class="marks-max">/ ${max}</span>
          ${pct !== null ? `<span class="marks-bar"><i style="width:${pct}%"></i></span>` : ''}
        </span>`;
      }
      case 'file': {
        const f = parseFileCell(v);
        if (f) return `<span class="file-chip" ${base}>
            <button class="file-open" onclick="Cell.openFile(this)" title="Open ${escA(f.name)}">${icon(f.type?.startsWith('image/') ? 'file' : 'paperclip', 13)}<span>${escH(f.name)}</span></button>
            <button class="file-x" onclick="Cell.clearFile(this)" title="Remove file">${icon('x', 11, 2)}</button>
          </span>`;
        return `<button class="file-add" ${base} onclick="Cell.pickFile(this)">${icon('upload', 13)}<span>Upload</span></button>`;
      }
      default: {
        const type = col.kind === 'email' ? 'email' : col.kind === 'url' ? 'url' : 'text';
        return `<input class="${cls}${col.kind === 'url' || col.kind === 'email' ? ' cell-link' : ''}" type="${type}" ${base} value="${escA(v ?? '')}" onchange="Cell.change(this)" spellcheck="false" ${inDrawer ? '' : 'onfocus="Cell.focus(this)" onblur="Cell.blur(this)"'}>`;
      }
    }
  },

  _col(el) { return S.columns[+el.dataset.ci]; },

  change(el) {
    const col = Cell._col(el);
    let v = el.value;
    if (col.kind === 'number' || col.kind === 'marks') v = v === '' ? null : Number(v);
    if (col.kind === 'select') {
      const ch = choiceOf(col, v);
      el.parentElement.className = `pill-sel pill-${ch?.color || 'none'}${v ? '' : ' empty'}`;
    }
    if (col.kind === 'marks') {
      const max = Number(col.options?.max) || 100;
      if (v !== null && (v < 0 || v > max)) toast(`Marks should be between 0 and ${max}`, 'info');
      const bar = el.parentElement.querySelector('.marks-bar i');
      if (bar && v !== null) bar.style.width = Math.max(0, Math.min(100, v / max * 100)) + '%';
    }
    App.updateCell(+el.dataset.row, col.name, v);
    Cell._syncTwin(el);
  },

  toggle(el) {
    const on = !el.classList.contains('on');
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', on);
    if (on && Motion.on) gsap.fromTo(el, { scale: .8 }, { scale: 1, duration: .4, ease: 'back.out(3)' });
    App.updateCell(+el.dataset.row, Cell._col(el).name, on ? 1 : 0);
    el.closest('tr')?.classList.toggle('row-done', on && completionCol(S.columns) === Cell._col(el));
    Cell._syncTwin(el);
  },

  // keep the grid and the drawer showing the same value
  _syncTwin(el) {
    const inDrawer = !!el.closest('.drawer');
    if (inDrawer) { Table.renderRow(+el.dataset.row); return; }
    if (Drawer.rowId == el.dataset.row) Drawer.renderFields();
  },

  focus(el) { el.closest('tr')?.classList.add('row-sel'); },
  blur(el) { el.closest('tr')?.classList.remove('row-sel'); },

  _fileTarget: null,
  pickFile(el) {
    Cell._fileTarget = { row: +el.dataset.row, ci: +el.dataset.ci };
    document.getElementById('cellFileInput').click();
  },
  async onFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    const t = Cell._fileTarget;
    if (!file || !t) return;
    if (file.size > 10 * 1024 * 1024) { toast('Files must be under 10MB', 'error'); return; }
    const data = await readFileAsDataUrl(file);
    const col = S.columns[t.ci];
    await App.updateCell(t.row, col.name, JSON.stringify({ name: file.name, type: file.type, size: file.size, data }));
    Table.renderRow(t.row);
    if (Drawer.rowId == t.row) Drawer.renderFields();
    toast(`Uploaded ${file.name}`, 'success');
  },
  async clearFile(el) {
    const host = el.closest('[data-row]');
    const row = +host.dataset.row, col = S.columns[+host.dataset.ci];
    await App.updateCell(row, col.name, null);
    Table.renderRow(row);
    if (Drawer.rowId == row) Drawer.renderFields();
  },
  openFile(el) {
    const host = el.closest('[data-row]');
    const r = S.rows.find(x => x.id == host.dataset.row);
    const f = parseFileCell(r?.[S.columns[+host.dataset.ci].name]);
    if (!f) return;
    fetch(f.data).then(res => res.blob()).then(b => downloadBlob(b, f.name));
  }
};

// ── table ────────────────────────────────────────────────────
const Table = {
  render(animate) {
    Table.renderHead();
    Table.renderBody(animate);
    Table.renderFoot();
  },

  renderHead() {
    const vis = visibleCols(S.columns);
    let html = '<tr><th class="th-rn">#</th>';
    vis.forEach(col => {
      const ci = S.columns.indexOf(col);
      const sorted = S.sortCol === col.name;
      html += `<th class="${sorted ? 'sort-' + S.sortDir : ''} th-${col.kind}" onclick="Table.headerMenu(this, ${ci})">
        <div class="th-inner">
          <span class="th-ic">${icon(KINDS[col.kind]?.icon || 'text', 13)}</span>
          <span class="th-name">${escH(col.name.replace(/_/g, ' '))}</span>
          <span class="th-sort">${icon(sorted && S.sortDir === 'desc' ? 'sortDown' : 'sortUp', 11, 2.4)}</span>
        </div></th>`;
    });
    html += `<th class="th-add"><button class="icon-btn icon-btn-xs" onclick="ColumnEditor.open()" title="Add column" aria-label="Add column">${icon('plus', 13, 2)}</button></th></tr>`;
    document.getElementById('gridHead').innerHTML = html;
  },

  rowHtml(row, n) {
    const vis = visibleCols(S.columns);
    const cc = completionCol(S.columns);
    let html = `<tr data-row="${row.id}" class="${isRowDone(cc, row) && cc?.kind === 'checkbox' ? 'row-done' : ''}">
      <td class="td-rn"><span class="rn-n">${n}</span><button class="rn-open" onclick="Drawer.open(${row.id})" title="Open record" aria-label="Open record">${icon('expand', 12, 2)}</button></td>`;
    vis.forEach(col => {
      html += `<td class="td-${col.kind}">${Cell.editor(col, S.columns.indexOf(col), row)}</td>`;
    });
    html += `<td class="td-del"><button class="btn-del-row" onclick="App.deleteRow(${row.id})" title="Delete record">${icon('trash', 14, 1.7)}</button></td></tr>`;
    return html;
  },

  renderBody(animate) {
    const tbody = document.getElementById('gridBody');
    const vis = visibleCols(S.columns);
    const start = S.page * S.pageSize;
    const slice = S.filteredRows.slice(start, start + S.pageSize);
    if (!slice.length) {
      const searching = document.getElementById('gridSearch').value.trim();
      tbody.innerHTML = `<tr class="tr-empty"><td colspan="${vis.length + 2}" class="grid-empty">
        ${searching ? 'No records match your search.' : `<div class="grid-empty-inner">${icon('table', 22, 1.4)}<b>This sheet is empty</b><span>Add your first record, or import a CSV / Excel file.</span>
        <div class="grid-empty-actions"><button class="rich-btn" onclick="App.addRow()">${icon('plus', 14, 2)}<span>Add record</span></button><button class="btn btn-soft" onclick="IO.openImport()">${icon('upload', 14, 1.7)} Import</button></div></div>`}
      </td></tr>`;
      if (animate) Motion.enter(tbody.querySelector('.grid-empty-inner'));
      return;
    }
    tbody.innerHTML = slice.map((r, i) => Table.rowHtml(r, start + i + 1)).join('');
    if (animate) Motion.stagger([...tbody.rows].slice(0, 24), { y: 8, duration: .5, stagger: .02 });
  },

  renderRow(rowId) {
    const tr = document.querySelector(`#gridBody tr[data-row="${rowId}"]`);
    const row = S.rows.find(r => r.id == rowId);
    if (!tr || !row) return;
    const n = tr.querySelector('.rn-n').textContent;
    tr.outerHTML = Table.rowHtml(row, n);
  },

  renderFoot() {
    const vis = visibleCols(S.columns);
    // summary row: averages for numbers/marks, % for checkboxes, filled count otherwise
    const rows = S.filteredRows;
    let html = '<tr><td class="td-rn"></td>';
    vis.forEach(col => {
      let s = '';
      if (rows.length) {
        if (col.kind === 'number' || col.kind === 'marks') {
          const nums = rows.map(r => r[col.name]).filter(v => v !== null && v !== '' && !isNaN(v)).map(Number);
          if (nums.length) {
            const sum = nums.reduce((a, b) => a + b, 0);
            s = col.kind === 'marks' ? `Avg <b>${fmtNum(sum / nums.length)}</b>` : `Sum <b>${fmtNum(sum, 2)}</b>`;
          }
        } else if (col.kind === 'checkbox') {
          const on = rows.filter(r => r[col.name] === 1 || r[col.name] === '1').length;
          s = `<b>${Math.round(on / rows.length * 100)}%</b> checked`;
        } else {
          const filled = rows.filter(r => r[col.name] !== null && r[col.name] !== '').length;
          s = filled && filled < rows.length ? `<b>${filled}</b> filled` : '';
        }
      }
      html += `<td class="td-sum">${s}</td>`;
    });
    html += '<td></td></tr>';
    document.getElementById('gridFoot').innerHTML = rows.length ? html : '';

    const total = S.rows.length, filtered = rows.length;
    document.getElementById('gridMeta').textContent =
      (filtered === total ? plural(total, 'record') : `${filtered.toLocaleString()} of ${plural(total, 'record')}`) + ' · ' + plural(vis.length, 'column');
    const pages = Math.max(1, Math.ceil(filtered / S.pageSize));
    document.getElementById('pageLabel').textContent = `Page ${S.page + 1} of ${pages}`;
    document.getElementById('btnPrev').disabled = S.page === 0;
    document.getElementById('btnNext').disabled = S.page >= pages - 1;
    document.getElementById('gridPages').style.visibility = pages > 1 ? '' : 'hidden';
  },

  prevPage() { if (S.page > 0) { S.page--; Table.renderBody(true); Table.renderFoot(); } },
  nextPage() {
    const pages = Math.ceil(S.filteredRows.length / S.pageSize);
    if (S.page < pages - 1) { S.page++; Table.renderBody(true); Table.renderFoot(); }
  },

  focusRow(id) {
    const idx = S.filteredRows.findIndex(r => r.id == id);
    if (idx < 0) return;
    const page = Math.floor(idx / S.pageSize);
    if (page !== S.page) { S.page = page; Table.renderBody(); Table.renderFoot(); }
    const tr = document.querySelector(`#gridBody tr[data-row="${id}"]`);
    if (!tr) return;
    tr.scrollIntoView({ block: 'nearest' });
    Motion.from(tr, { opacity: 0, y: -6, duration: .45, ease: 'power3.out' });
    tr.querySelector('input.cell-inp')?.focus();
  },

  sortBy(name, dir) {
    if (dir) { S.sortCol = name; S.sortDir = dir; }
    else if (S.sortCol === name) S.sortDir = S.sortDir === 'asc' ? 'desc' : 'asc';
    else { S.sortCol = name; S.sortDir = 'asc'; }
    S.page = 0;
    App.applyFilter();
    Table.render();
  },

  headerMenu(th, ci) {
    const col = S.columns[ci];
    Pop.open(th, `
      <div class="pop-title">${icon(KINDS[col.kind]?.icon || 'text', 13)} <span>${escH(KINDS[col.kind]?.label || 'Text')}</span></div>
      <button class="pm-item" onclick="Pop.close();Table.sortBy(S.columns[${ci}].name,'asc')">${icon('sortUp', 15)} Sort ascending</button>
      <button class="pm-item" onclick="Pop.close();Table.sortBy(S.columns[${ci}].name,'desc')">${icon('sortDown', 15)} Sort descending</button>
      ${S.sortCol ? `<button class="pm-item" onclick="Pop.close();S.sortCol=null;App.applyFilter();Table.render()">${icon('list', 15)} Clear sort</button>` : ''}
      <div class="pm-sep"></div>
      <button class="pm-item" onclick="Pop.close();ColumnEditor.open(${ci})">${icon('edit', 15)} Edit column</button>
      <button class="pm-item pm-danger" onclick="Pop.close();ColumnEditor.remove(${ci})">${icon('trash', 15)} Delete column</button>`, { width: 210 });
  }
};

// ── column editor (add / edit) ───────────────────────────────
const ColumnEditor = {
  ci: null, kind: 'text',
  open(ci = null) {
    ColumnEditor.ci = ci;
    const col = ci !== null ? S.columns[ci] : null;
    ColumnEditor.kind = col?.kind || 'text';
    document.getElementById('colEdTitle').textContent = col ? 'Edit column' : 'Add column';
    document.getElementById('colEdOk').firstElementChild.textContent = col ? 'Save column' : 'Add column';
    document.getElementById('colEdName').value = col ? col.name.replace(/_/g, ' ') : '';
    document.getElementById('colEdMax').value = col?.options?.max || 100;
    ChoiceEditor.set('colEdChoices', col?.options?.choices || [{ label: 'To do', color: 'gray' }, { label: 'Done', color: 'green', done: true }]);
    ColumnEditor.renderKinds();
    Modal.open('modalColumn');
  },
  renderKinds() {
    document.getElementById('colEdKinds').innerHTML = Object.entries(KINDS).map(([k, m]) => `
      <button type="button" class="kind-opt${k === ColumnEditor.kind ? ' on' : ''}" onclick="ColumnEditor.pick('${k}')">
        <span class="kind-ic">${icon(m.icon, 15)}</span><span class="kind-txt"><b>${m.label}</b><small>${m.desc}</small></span>
      </button>`).join('');
    document.getElementById('colEdMarks').style.display = ColumnEditor.kind === 'marks' ? '' : 'none';
    document.getElementById('colEdChoiceWrap').style.display = ColumnEditor.kind === 'select' ? '' : 'none';
  },
  pick(k) { ColumnEditor.kind = k; ColumnEditor.renderKinds(); },
  options() {
    if (ColumnEditor.kind === 'marks') return { max: Number(document.getElementById('colEdMax').value) || 100 };
    if (ColumnEditor.kind === 'select') return { choices: ChoiceEditor.get('colEdChoices') };
    return null;
  },
  async save() {
    const name = document.getElementById('colEdName').value.trim();
    if (!name) { toast('Enter a column name', 'error'); return; }
    const kind = ColumnEditor.kind, options = ColumnEditor.options();
    if (kind === 'select' && !options.choices.length) { toast('Add at least one option', 'error'); return; }
    const table = S.activeSheet;
    try {
      if (ColumnEditor.ci === null) {
        if (S.columns.some(c => c.name.toLowerCase() === colKey(name).toLowerCase())) { toast('A column with that name exists', 'error'); return; }
        const key = await Schema.addColumn(table, name, kind, options);
        Activity.log('column.add', { table, detail: { sheet: S.sheetMeta?.displayName, column: key, kind } });
        toast('Column added', 'success');
      } else {
        const col = S.columns[ColumnEditor.ci];
        let key = col.name;
        if (colKey(name) !== col.name) {
          key = await Schema.renameColumn(table, col.name, name);
          Activity.log('column.rename', { table, detail: { sheet: S.sheetMeta?.displayName, column: col.name, to: key } });
        }
        if (kind !== col.kind || JSON.stringify(options || {}) !== JSON.stringify(col.options || {})) {
          await Schema.saveColumnMeta(table, key, kind, options);
          if (kind !== col.kind) Activity.log('column.update', { table, detail: { sheet: S.sheetMeta?.displayName, column: key, kind } });
        }
        toast('Column updated', 'success');
      }
      Modal.close('modalColumn');
      await App.loadData();
      Inbox.scan();
    } catch (err) { toast(err.message, 'error'); }
  },
  async remove(ci) {
    const col = S.columns[ci];
    if (visibleCols(S.columns).length <= 1) { toast('A sheet needs at least one column', 'info'); return; }
    const ok = await Confirm.ask({ title: `Delete column “${col.name.replace(/_/g, ' ')}”?`, body: 'Its values in every record will be permanently removed.', action: 'Delete column' });
    if (!ok) return;
    try {
      await Schema.dropColumn(S.activeSheet, col.name);
      Activity.log('column.delete', { table: S.activeSheet, detail: { sheet: S.sheetMeta?.displayName, column: col.name } });
      if (S.sortCol === col.name) S.sortCol = null;
      await App.loadData();
      toast('Column deleted', 'success');
    } catch (err) { toast('Could not delete column: ' + err.message, 'error'); }
  }
};

// ── choice list editor (status options) ──────────────────────
const ChoiceEditor = {
  set(id, choices) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    choices.forEach(c => ChoiceEditor.add(id, c, false));
  },
  add(id, c = { label: '', color: null }, focus = true) {
    const el = document.getElementById(id);
    const color = c.color || CHOICE_COLORS[el.children.length % CHOICE_COLORS.length];
    const row = document.createElement('div');
    row.className = 'choice-row';
    row.dataset.color = color;
    row.innerHTML = `<button type="button" class="choice-swatch pill-${color}" onclick="ChoiceEditor.cycle(this)" title="Change colour"></button>
      <input class="field-inp" type="text" value="${escA(c.label)}" placeholder="Option name">
      <label class="choice-done" title="Counts as complete"><input type="checkbox" ${c.done ? 'checked' : ''}><span>Done</span></label>
      <button type="button" class="btn-col-del" onclick="this.parentElement.remove()" title="Remove">${icon('x', 13, 2)}</button>`;
    el.appendChild(row);
    if (focus) { row.querySelector('input').focus(); Motion.from(row, { opacity: 0, y: -6, duration: .3, ease: 'power3.out' }); }
  },
  cycle(btn) {
    const row = btn.parentElement;
    const next = CHOICE_COLORS[(CHOICE_COLORS.indexOf(row.dataset.color) + 1) % CHOICE_COLORS.length];
    row.dataset.color = next;
    btn.className = `choice-swatch pill-${next}`;
  },
  get(id) {
    const seen = new Set();
    return [...document.getElementById(id).children].map(r => ({
      label: r.querySelector('input[type=text]').value.trim(),
      color: r.dataset.color,
      done: r.querySelector('input[type=checkbox]').checked
    })).filter(c => c.label && !seen.has(c.label) && seen.add(c.label));
  }
};

// ── record drawer (all fields + history) ─────────────────────
const Drawer = {
  rowId: null,
  async open(rowId) {
    const row = S.rows.find(r => r.id == rowId);
    if (!row) return;
    const wasOpen = Drawer.rowId !== null;
    Drawer.rowId = rowId;
    const el = document.getElementById('drawer');
    el.classList.add('open');
    document.querySelectorAll('#gridBody tr.row-open').forEach(t => t.classList.remove('row-open'));
    document.querySelector(`#gridBody tr[data-row="${rowId}"]`)?.classList.add('row-open');
    Drawer.refreshHeader();
    Drawer.renderFields();
    if (!wasOpen && Motion.on) gsap.fromTo(el, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: .5, ease: 'power3.out', clearProps: 'transform,opacity' });
    else Motion.enter(document.getElementById('drawerBody'), { y: 6, duration: .35 });
    const hist = await Activity.list({ table: S.activeSheet, rowId, limit: 50 });
    document.getElementById('drawerHistory').innerHTML = Activity.renderList(hist, { compact: true });
  },
  refreshHeader() {
    const row = S.rows.find(r => r.id == Drawer.rowId);
    if (!row) return;
    const pc = primaryCol(S.columns);
    document.getElementById('drawerTitle').textContent = (pc && row[pc.name]) ? displayValue(pc, row[pc.name]) : `Record #${row.id}`;
    document.getElementById('drawerMeta').textContent =
      `#${row.id}${row._created_at ? ' · created ' + timeAgo(row._created_at) : ''}${row._updated_at && row._updated_at !== row._created_at ? ' · edited ' + timeAgo(row._updated_at) : ''}`;
  },
  renderFields() {
    const row = S.rows.find(r => r.id == Drawer.rowId);
    if (!row) return;
    document.getElementById('drawerFields').innerHTML = visibleCols(S.columns).map(col => `
      <div class="dr-field">
        <label class="dr-label">${icon(KINDS[col.kind]?.icon || 'text', 13)}<span>${escH(col.name.replace(/_/g, ' '))}</span></label>
        <div class="dr-value">${Cell.editor(col, S.columns.indexOf(col), row, { inDrawer: true })}</div>
      </div>`).join('');
  },
  close() {
    if (Drawer.rowId === null) return;
    Drawer.rowId = null;
    document.querySelectorAll('#gridBody tr.row-open').forEach(t => t.classList.remove('row-open'));
    const el = document.getElementById('drawer');
    if (!Motion.on) { el.classList.remove('open'); return; }
    gsap.to(el, { x: 30, opacity: 0, duration: .22, ease: 'power2.in', onComplete: () => { el.classList.remove('open'); gsap.set(el, { clearProps: 'transform,opacity' }); } });
  },
  async remove() { if (Drawer.rowId !== null) await App.deleteRow(Drawer.rowId); },
  step(dir) {
    const idx = S.filteredRows.findIndex(r => r.id == Drawer.rowId);
    const next = S.filteredRows[idx + dir];
    if (next) Drawer.open(next.id);
  }
};

// Enter in a grid cell moves to the same column on the next row.
document.addEventListener('keydown', e => {
  const el = document.activeElement;
  if (e.key !== 'Enter' || !el?.matches('#gridBody .cell-inp')) return;
  e.preventDefault();
  el.dispatchEvent(new Event('change'));
  const tr = el.closest('tr').nextElementSibling;
  const next = tr?.querySelector(`[data-ci="${el.dataset.ci}"]`);
  if (next?.focus) { next.focus(); next.select?.(); }
});
