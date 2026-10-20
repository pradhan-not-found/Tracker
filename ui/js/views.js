'use strict';
/* =============================================================
   Tracker — calendar view + dashboard view
============================================================= */

// ─────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────
const Calendar = {
  cursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  dateCol: null,

  render(animate) {
    const el = document.getElementById('sv-calendar');
    const dcs = dateCols(S.columns);
    if (!dcs.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('calendar', 24, 1.4)}</div>
        <h2 class="empty-title">Add a date column</h2>
        <p class="empty-desc">The calendar lays out records by date — due dates, exams, attendance days. Add a Date column to this sheet to use it.</p>
        <button class="rich-btn" onclick="ColumnEditor.open();ColumnEditor.pick('date')">${icon('plus', 14, 2)}<span>Add date column</span></button></div>`;
      if (animate) Motion.stagger(el.querySelectorAll('.empty-state > *'), { stagger: .08 });
      return;
    }
    if (!dcs.some(c => c.name === Calendar.dateCol)) Calendar.dateCol = dcs[0].name;
    const dc = S.columns.find(c => c.name === Calendar.dateCol);
    const pc = primaryCol(S.columns);
    const cc = completionCol(S.columns);
    const sc = visibleCols(S.columns).find(c => c.kind === 'select');

    const y = Calendar.cursor.getFullYear(), m = Calendar.cursor.getMonth();
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday-first
    const gridStart = new Date(y, m, 1 - startDow);
    const weeks = Math.ceil((startDow + new Date(y, m + 1, 0).getDate()) / 7);
    const today = todayStr();

    const byDay = {};
    let undated = 0;
    S.rows.forEach(r => {
      const d = parseDay(r[dc.name]);
      if (!d) { undated++; return; }
      (byDay[todayStr(d)] ||= []).push(r);
    });
    const monthCount = Object.entries(byDay).filter(([k]) => k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).reduce((a, [, v]) => a + v.length, 0);
    const monthName = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const dows = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleString(undefined, { weekday: 'short' }));

    let cells = '';
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const key = todayStr(d);
      const items = byDay[key] || [];
      const out = d.getMonth() !== m;
      const chips = items.slice(0, 3).map(r => {
        const done = isRowDone(cc, r);
        const ch = sc ? choiceOf(sc, r[sc.name]) : null;
        const overdue = cc && !done && key < today;
        const label = (pc && r[pc.name]) ? String(displayValue(pc, r[pc.name])) : `Record #${r.id}`;
        return `<button class="cal-chip pill-${ch?.color || 'none'}${done ? ' done' : ''}${overdue ? ' overdue' : ''}" onclick="event.stopPropagation();Calendar.openRow(${r.id})" data-tip="<b>${escA(label)}</b>${sc && r[sc.name] ? '<br>' + escA(r[sc.name]) : ''}${overdue ? '<br>Overdue' : ''}">${escH(label)}</button>`;
      }).join('');
      cells += `<div class="cal-cell${out ? ' out' : ''}${key === today ? ' today' : ''}" onclick="Calendar.addOn('${key}')" title="Add a record on ${escA(fmtDate(key))}">
        <div class="cal-date"><span>${d.getDate()}</span><span class="cal-add">${icon('plus', 11, 2.2)}</span></div>
        <div class="cal-items">${chips}${items.length > 3 ? `<button class="cal-more" onclick="event.stopPropagation();Calendar.dayMenu(this,'${key}')">+${items.length - 3} more</button>` : ''}</div>
      </div>`;
    }

    el.innerHTML = `
      <div class="cal-toolbar">
        <div class="cal-nav">
          <h2 class="cal-month">${escH(monthName)}</h2>
          <div class="cal-arrows">
            <button class="icon-btn" onclick="Calendar.shift(-1)" aria-label="Previous month">${icon('chevL', 15, 2)}</button>
            <button class="btn btn-soft btn-sm" onclick="Calendar.goToday()">Today</button>
            <button class="icon-btn" onclick="Calendar.shift(1)" aria-label="Next month">${icon('chevR', 15, 2)}</button>
          </div>
        </div>
        <div class="cal-right">
          <span class="grid-meta">${plural(monthCount, 'record')} this month${undated ? ` · ${undated} without a date` : ''}</span>
          ${dcs.length > 1 ? `<select class="field-sel" onchange="Calendar.dateCol=this.value;Calendar.render(true)">${dcs.map(c => `<option value="${escA(c.name)}"${c.name === dc.name ? ' selected' : ''}>${escH(c.name.replace(/_/g, ' '))}</option>`).join('')}</select>` : ''}
        </div>
      </div>
      <div class="cal-grid">
        ${dows.map(d => `<div class="cal-dow">${escH(d)}</div>`).join('')}
        ${cells}
      </div>`;
    if (animate) Motion.stagger(el.querySelectorAll('.cal-cell'), { y: 6, duration: .45, stagger: .008 });
  },

  shift(n) { Calendar.cursor = new Date(Calendar.cursor.getFullYear(), Calendar.cursor.getMonth() + n, 1); Calendar.render(true); },
  goToday() { const t = new Date(); Calendar.cursor = new Date(t.getFullYear(), t.getMonth(), 1); Calendar.render(true); },

  async addOn(key) {
    const id = await App.addRow({ [Calendar.dateCol]: key }, { focus: false });
    if (id) Drawer.open(id);
  },
  openRow(id) { Drawer.open(id); },
  dayMenu(btn, key) {
    const dc = Calendar.dateCol, pc = primaryCol(S.columns);
    const rows = S.rows.filter(r => { const d = parseDay(r[dc]); return d && todayStr(d) === key; });
    Pop.open(btn, `<div class="pop-title">${icon('calendar', 13)} <span>${escH(fmtDate(key))}</span></div>` + rows.map(r =>
      `<button class="pm-item" onclick="Pop.close();Drawer.open(${r.id})">${escH(pc && r[pc.name] ? displayValue(pc, r[pc.name]) : 'Record #' + r.id)}</button>`).join(''), { width: 240 });
  }
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
const Dashboard = {
  kpi(label, value, foot = '', tip = '') {
    return `<div class="kpi"${tip ? ` data-tip="${escA(tip)}"` : ''}><span class="kpi-lbl">${escH(label)}</span><span class="kpi-val">${typeof value === 'number' ? fmtNum(value) : escH(value)}</span>${foot ? `<span class="kpi-foot">${foot}</span>` : ''}</div>`;
  },

  async render(animate) {
    const el = document.getElementById('sv-dashboard');
    const rows = S.rows, vis = visibleCols(S.columns);
    const cc = completionCol(S.columns), dc = deadlineCol(S.columns, S.sheetMeta?.template);
    const today = todayStr();
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

    const added7 = rows.filter(r => r._created_at && r._created_at >= weekAgo).length;
    const doneN = cc ? rows.filter(r => isRowDone(cc, r)).length : 0;
    const overdue = cc && dc ? rows.filter(r => !isRowDone(cc, r) && r[dc.name] && String(r[dc.name]).slice(0, 10) < today).length : 0;
    const dueToday = cc && dc ? rows.filter(r => !isRowDone(cc, r) && String(r[dc.name] || '').slice(0, 10) === today).length : 0;

    const kpis = [Dashboard.kpi('Total records', rows.length, `<span class="kpi-sub">+${added7} this week</span>`)];
    const doneLabel = cc?.kind === 'select' ? ((cc.options?.choices || []).find(ch => ch.done || DONE_WORDS.test(ch.label))?.label || 'Done') + ' rate' : 'Completed';
    if (cc) kpis.push(Dashboard.kpi(doneLabel, rows.length ? Math.round(doneN / rows.length * 100) + '%' : '—',
      `<span class="progress progress-sm"><i style="width:${rows.length ? doneN / rows.length * 100 : 0}%"></i></span><span class="kpi-sub">${doneN} of ${rows.length}</span>`));
    if (cc && dc) kpis.push(Dashboard.kpi('Due today', dueToday, overdue ? `<span class="kpi-flag">${icon('alert', 12, 2)} ${overdue} overdue</span>` : '<span class="kpi-ok">' + icon('check', 12, 2.4) + ' Nothing overdue</span>'));
    const numCols = vis.filter(c => c.kind === 'number' || c.kind === 'marks');
    numCols.slice(0, cc && dc ? 1 : 2).forEach(c => {
      const nums = rows.map(r => r[c.name]).filter(v => v !== null && v !== '' && !isNaN(v)).map(Number);
      const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      kpis.push(Dashboard.kpi(`Average ${c.name.replace(/_/g, ' ')}`, avg === null ? '—' : fmtNum(avg),
        nums.length ? `<span class="kpi-sub">${c.kind === 'marks' ? `out of ${c.options?.max || 100} · ` : ''}min ${fmtNum(Math.min(...nums))} · max ${fmtNum(Math.max(...nums))}</span>` : '<span class="kpi-sub">No values yet</span>'));
    });

    const charts = [];
    charts.push(Dashboard.trendCard(rows, Math.max(320, Math.min(el.clientWidth, 1180) - 40 - 36)));
    vis.filter(c => c.kind === 'select').slice(0, 2).forEach(c => charts.push(Dashboard.breakdownCard(c, rows)));
    numCols.filter(c => c.kind === 'marks').slice(0, 1).forEach(c => charts.push(Dashboard.histCard(c, rows)));
    vis.filter(c => c.kind === 'checkbox').slice(0, 1).forEach(c => charts.push(Dashboard.breakdownCard(
      { ...c, options: { choices: [{ label: 'Checked', color: 'green' }, { label: 'Not checked', color: 'gray' }] } },
      rows.map(r => ({ [c.name]: (r[c.name] === 1 || r[c.name] === '1') ? 'Checked' : 'Not checked' })))));

    const recent = await Activity.list({ table: S.activeSheet, limit: 12 });
    el.innerHTML = `
      <div class="dash">
        <div class="kpis">${kpis.join('')}</div>
        <div class="dash-grid">${charts.join('')}</div>
        <section class="card">
          <div class="card-hd"><h2>Recent changes</h2><span class="grid-meta">Tracked automatically</span></div>
          <div class="act-list">${Activity.renderList(recent, { compact: true })}</div>
        </section>
        <details class="card dash-table">
          <summary class="card-hd"><h2>Data behind these charts</h2>${icon('chevD', 14, 2)}</summary>
          ${Dashboard.dataTable(vis, rows)}
        </details>
      </div>`;
    if (animate) Motion.stagger(el.querySelectorAll('.kpi, .dash-grid > .card, .dash > .card'), { y: 14, duration: .6, stagger: .05 });
    if (Motion.on) {
      const bars = el.querySelectorAll('.bar-fill'), hist = el.querySelectorAll('.hist-bar');
      if (bars.length) gsap.from(bars, { scaleX: 0, transformOrigin: 'left', duration: .8, ease: 'power3.out', stagger: .04, delay: .15 });
      if (hist.length) gsap.from(hist, { scaleY: 0, transformOrigin: 'bottom', duration: .7, ease: 'power3.out', stagger: .03, delay: .15 });
      el.querySelectorAll('.trend-line').forEach(p => {
        const len = p.getTotalLength();
        gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out', delay: .1, clearProps: 'strokeDasharray,strokeDashoffset' });
      });
    }
  },

  // Records added per day over the last 30 days — single series, blue.
  trendCard(rows, width = 560) {
    const days = 30, counts = new Array(days).fill(0), labels = [];
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
    for (let i = 0; i < days; i++) labels.push(todayStr(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
    rows.forEach(r => {
      if (!r._created_at) return;
      const idx = labels.indexOf(todayStr(new Date(r._created_at)));
      if (idx >= 0) counts[idx]++;
    });
    const total = counts.reduce((a, b) => a + b, 0);
    const W = Math.round(width), H = 170, pl = 28, pr = 8, pt = 10, pb = 22;
    const max = Math.max(4, ...counts);
    const nice = Math.ceil(max / 4) * 4;
    const x = i => pl + i * (W - pl - pr) / (days - 1);
    const yv = v => pt + (H - pt - pb) * (1 - v / nice);
    const pts = counts.map((v, i) => `${x(i).toFixed(1)},${yv(v).toFixed(1)}`);
    const grid = [0, nice / 2, nice].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${yv(v)}" y2="${yv(v)}" class="ch-grid"/><text x="${pl - 6}" y="${yv(v) + 3.5}" class="ch-axis" text-anchor="end">${v}</text>`).join('');
    const ticks = [0, 10, 20, 29].map(i => `<text x="${x(i)}" y="${H - 5}" class="ch-axis" text-anchor="${i === 0 ? 'start' : i === 29 ? 'end' : 'middle'}">${escH(new Date(labels[i] + 'T00:00').toLocaleString(undefined, { month: 'short', day: 'numeric' }))}</text>`).join('');
    const hits = counts.map((v, i) => `<rect x="${x(i) - (W - pl - pr) / (days - 1) / 2}" y="${pt}" width="${(W - pl - pr) / (days - 1)}" height="${H - pt - pb}" class="ch-hit" data-tip="<b>${v}</b> added<br>${escA(fmtDate(labels[i]))}"/>`).join('');
    return `<section class="card chart-card chart-wide">
      <div class="card-hd"><h2>Records added</h2><span class="grid-meta">Last 30 days · ${plural(total, 'record')}</span></div>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Records added per day over the last 30 days, ${total} total">
        ${grid}
        <path d="M${pts[0]} L${pts.join(' L')} L${x(days - 1)},${yv(0)} L${x(0)},${yv(0)} Z" class="trend-area"/>
        <path d="M${pts.join(' L')}" class="trend-line"/>
        ${ticks}${hits}
      </svg>
    </section>`;
  },

  // Count per option of a status column — horizontal bars, labelled, single hue
  breakdownCard(col, rows) {
    const choices = col.options?.choices || [];
    const counts = {};
    rows.forEach(r => { const v = r[col.name] || ''; counts[v] = (counts[v] || 0) + 1; });
    const entries = [...choices.map(c => [c.label, counts[c.label] || 0, c]),
      ...Object.keys(counts).filter(k => k && !choices.some(c => c.label === k)).map(k => [k, counts[k], null])];
    if (counts['']) entries.push(['Not set', counts[''], null]);
    const max = Math.max(1, ...entries.map(e => e[1]));
    const total = rows.length || 1;
    return `<section class="card chart-card">
      <div class="card-hd"><h2>By ${escH(col.name.replace(/_/g, ' ').toLowerCase())}</h2><span class="grid-meta">${plural(rows.length, 'record')}</span></div>
      <div class="bars">${entries.map(([label, n, ch]) => `
        <div class="bar-row" data-tip="<b>${escA(label)}</b><br>${n} · ${Math.round(n / total * 100)}%">
          <span class="bar-lbl"><span class="dot pill-${ch?.color || 'none'}"></span>${escH(label)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${n / max * 100}%"></span></span>
          <span class="bar-val">${n}</span>
        </div>`).join('') || '<div class="act-empty">No data yet</div>'}
      </div>
    </section>`;
  },

  // Distribution of marks in 10 bands
  histCard(col, rows) {
    const max = Number(col.options?.max) || 100;
    const bins = new Array(10).fill(0);
    const nums = rows.map(r => r[col.name]).filter(v => v !== null && v !== '' && !isNaN(v)).map(Number);
    nums.forEach(v => bins[Math.min(9, Math.max(0, Math.floor(v / max * 10)))]++);
    const peak = Math.max(1, ...bins);
    const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    return `<section class="card chart-card">
      <div class="card-hd"><h2>${escH(col.name.replace(/_/g, ' '))} distribution</h2><span class="grid-meta">${nums.length ? `Average ${fmtNum(avg)} / ${max}` : 'No marks yet'}</span></div>
      <div class="hist">${bins.map((n, i) => {
        const lo = Math.round(i * max / 10), hi = Math.round((i + 1) * max / 10);
        return `<div class="hist-col" data-tip="<b>${n}</b> scored ${lo}–${hi}"><span class="hist-n">${n || ''}</span><span class="hist-bar" style="height:${n / peak * 100}%"></span><span class="hist-x">${lo}</span></div>`;
      }).join('')}</div>
    </section>`;
  },

  dataTable(vis, rows) {
    const cols = vis.slice(0, 8);
    return `<div class="mini-table-wrap"><table class="mini-table"><thead><tr>${cols.map(c => `<th>${escH(c.name.replace(/_/g, ' '))}</th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0, 50).map(r => `<tr>${cols.map(c => `<td>${escH(displayValue(c, r[c.name]))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}">No records</td></tr>`}</tbody></table>
      ${rows.length > 50 ? `<p class="grid-meta" style="padding:8px 2px">Showing 50 of ${rows.length}. Use the table view for everything.</p>` : ''}</div>`;
  }
};
