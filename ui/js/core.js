'use strict';
/* =============================================================
   Tracker — core: native bridge, SQL helpers, motion, toasts,
   modals, popovers, confirm dialog, formatting
============================================================= */

// ─────────────────────────────────────────────────────────────
// NATIVE BRIDGE  (Electron preload  |  Swift WKWebView handler)
// ─────────────────────────────────────────────────────────────
const _cbs = {};
let _cbN = 0;

function callNative(action, payload = {}) {
  if (window.trackerDesktop) {
    return window.trackerDesktop.query(payload.query).catch(err => {
      throw new Error(String(err?.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
    });
  }
  return new Promise((resolve, reject) => {
    const id = 'cb_' + (++_cbN);
    _cbs[id] = { resolve, reject };
    if (window.webkit?.messageHandlers?.trackerNative) {
      window.webkit.messageHandlers.trackerNative.postMessage({ action, callbackId: id, payload });
    } else {
      setTimeout(() => window.onNativeResponse(id, 'Tracker must be opened from the desktop app.', null), 20);
    }
  });
}

window.onNativeResponse = function (id, err, result) {
  const cb = _cbs[id];
  if (!cb) return;
  delete _cbs[id];
  if (err) cb.reject(new Error(typeof err === 'string' ? err : JSON.stringify(err)));
  else cb.resolve(result || {});
};

async function sql(query) {
  const res = await callNative('db_query', { query });
  // Older native shells encode NULL as the string "NULL".
  if (res.rows) res.rows = res.rows.map(r => r.map(v => (v === 'NULL' ? null : v)));
  return res;
}

// rows → array of objects keyed by column name
async function sqlObjects(query) {
  const res = await sql(query);
  const cols = res.columns || [];
  return (res.rows || []).map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

function esc(s)   { return String(s ?? '').replace(/'/g, "''"); }
function escH(s)  { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escA(s)  { return escH(s).replace(/'/g, '&#39;'); }
function qi(name) { return '"' + String(name).replace(/"/g, '""') + '"'; }
function sqlv(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'number' && isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${esc(v)}'`;
}

function nowIso() { return new Date().toISOString(); }
function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseDay(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
const _dtf = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const _tf  = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
function fmtDate(s) { const d = parseDay(s); return d ? _dtf.format(d) : ''; }
function fmtTime(iso) { const d = new Date(iso); return isNaN(d) ? '' : _tf.format(d); }
function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  if (s < 86400 * 7) return Math.round(s / 86400) + 'd ago';
  return fmtDate(iso);
}
function fmtNum(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}
function plural(n, word) { return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`; }
function fmtBytes(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'sheet'; }
function colKey(s) { return String(s).trim().replace(/[^\p{L}\p{N}_ ]/gu, '').replace(/\s+/g, '_').slice(0, 60); }

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// SHA-256 with a pure-JS fallback for contexts without SubtleCrypto.
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l = data.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
  m.set(data); m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  const w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = r(w[i-15], 7) ^ r(w[i-15], 18) ^ (w[i-15] >>> 3), s1 = r(w[i-2], 17) ^ r(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => H[i] = (H[i] + v) | 0);
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

// ─────────────────────────────────────────────────────────────
// ICONS  (stroke set, Hugeicons-like weight)
// ─────────────────────────────────────────────────────────────
const ICON_PATHS = {
  plus:      '<path d="M12 5v14M5 12h14"/>',
  x:         '<path d="M18 6 6 18M6 6l12 12"/>',
  check:     '<path d="M20 6 9 17l-5-5"/>',
  folder:    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  table:     '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  calendar:  '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/>',
  chart:     '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  activity:  '<path d="M3 12a9 9 0 1 0 2.64-6.36L3 8.27"/><path d="M3 3.5v4.77h4.77"/><path d="M12 7.5V12l3 2"/>',
  rowAdd:    '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9.5h18"/><path d="M12 12.5v5M9.5 15h5"/>',
  rowEdit:   '<path d="M4 20h4L19.3 8.7a2.12 2.12 0 0 0-3-3L5 17v3z"/><path d="m14.5 7.5 3 3"/>',
  rowDel:    '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M5.5 7l.8 11.2A2 2 0 0 0 8.3 20h7.4a2 2 0 0 0 2-1.8L18.5 7"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  colEdit:   '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9.5 4v16"/><path d="M13.5 10h4M13.5 14h4"/>',
  importIn:  '<path d="M12 3v11"/><path d="m7.5 9.5 4.5 4.5 4.5-4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  exportOut: '<path d="M12 14V3"/><path d="m7.5 7.5 4.5-4.5 4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  folderAdd: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10.5v5M9.5 13h5"/>',
  sheetAdd:  '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 12.5v5M9.5 15h5"/>',
  bell:      '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search:    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  trash:     '<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>',
  edit:      '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  download:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  columns:   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
  expand:    '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  chevL:     '<path d="m15 18-6-6 6-6"/>',
  chevR:     '<path d="m9 18 6-6-6-6"/>',
  chevD:     '<path d="m6 9 6 6 6-6"/>',
  sortUp:    '<path d="m18 15-6-6-6 6"/>',
  sortDown:  '<path d="m6 9 6 6 6-6"/>',
  text:      '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  hash:      '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  award:     '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
  checkbox:  '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  tag:       '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  paperclip: '<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 0 1 5.7 5.7l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  mail:      '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-10 6L2 7"/>',
  link:      '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  list:      '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  users:     '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  box:       '<path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  file:      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert:     '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  info:      '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  more:      '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  sparkle:   '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  sidebar:   '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
  json:      '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
  grid:      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};
function icon(name, size = 16, sw = 1.6) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

// ─────────────────────────────────────────────────────────────
// MOTION  (GSAP, with graceful fallback + reduced-motion respect)
// ─────────────────────────────────────────────────────────────
const Motion = {
  get on() {
    return !!window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  _empty(t) { return !t || (t.length !== undefined && !t.length); },
  from(targets, vars) {
    if (!Motion.on || Motion._empty(targets)) return Promise.resolve();
    return new Promise(r => gsap.from(targets, { ...vars, clearProps: 'transform,opacity', onComplete: r }));
  },
  to(targets, vars) {
    if (!Motion.on || Motion._empty(targets)) return Promise.resolve();
    return new Promise(r => gsap.to(targets, { ...vars, onComplete: r }));
  },
  // Atlas onboarding reveal: lines rise and fade in, staggered.
  reveal(scope, opts = {}) {
    const lines = [...scope.querySelectorAll('[data-reveal]')].filter(el => el.offsetParent !== null);
    if (!lines.length || !Motion.on) return Promise.resolve();
    gsap.killTweensOf(lines);
    return new Promise(r => gsap.fromTo(lines,
      { opacity: 0, y: opts.y ?? 34 },
      { opacity: 1, y: 0, duration: opts.duration ?? 1.15, ease: 'power3.out', stagger: opts.stagger ?? .18, clearProps: 'transform,opacity', onComplete: r }));
  },
  hide(scope) {
    const lines = [...scope.querySelectorAll('[data-reveal]')].filter(el => el.offsetParent !== null);
    if (!lines.length || !Motion.on) return Promise.resolve();
    return new Promise(r => gsap.to(lines, { opacity: 0, y: -18, duration: .35, ease: 'power2.in', stagger: .06, onComplete: r }));
  },
  enter(el, opts = {}) {
    if (!Motion.on || !el) return;
    gsap.fromTo(el, { opacity: 0, y: opts.y ?? 10 }, { opacity: 1, y: 0, duration: opts.duration ?? .6, ease: 'power3.out', delay: opts.delay || 0, clearProps: 'transform,opacity' });
  },
  stagger(els, opts = {}) {
    if (!Motion.on || !els || !els.length) return;
    gsap.fromTo(els, { opacity: 0, y: opts.y ?? 12 }, { opacity: 1, y: 0, duration: opts.duration ?? .6, ease: 'power3.out', stagger: opts.stagger ?? .04, delay: opts.delay || 0, clearProps: 'transform,opacity' });
  }
};
if (!window.gsap) document.documentElement.classList.add('no-gsap');

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function toast(msg, type = 'default') {
  const ic = { success: 'check', error: 'alert', info: 'info', default: 'info' }[type] || 'info';
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-ic">${icon(ic, 15, 2.2)}</span><span></span>`;
  el.lastChild.textContent = msg;
  document.getElementById('toastRoot').appendChild(el);
  Motion.from(el, { opacity: 0, y: 14, scale: .96, duration: .45, ease: 'power3.out' });
  setTimeout(() => {
    Motion.to(el, { opacity: 0, y: 8, duration: .3, ease: 'power2.in' }).then(() => el.remove());
    if (!Motion.on) el.remove();
  }, 3400);
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────
const Modal = {
  open(id) {
    const ov = document.getElementById(id);
    if (ov.classList.contains('open')) return;
    Pop.close();
    ov.classList.add('open');
    if (Motion.on) {
      gsap.killTweensOf([ov, ov.firstElementChild]);
      gsap.fromTo(ov, { opacity: 0 }, { opacity: 1, duration: .2, ease: 'power1.out' });
      gsap.fromTo(ov.firstElementChild, { opacity: 0, y: 14, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .45, ease: 'power3.out', clearProps: 'transform' });
    }
    setTimeout(() => ov.querySelector('[autofocus], .field-inp:not([disabled])')?.focus(), 80);
  },
  close(id) {
    const ov = document.getElementById(id);
    if (!ov || !ov.classList.contains('open')) return;
    if (id === 'modalConfirm') Confirm._settle(false);
    if (!Motion.on) { ov.classList.remove('open'); return; }
    gsap.to(ov.firstElementChild, { opacity: 0, y: 8, scale: .98, duration: .18, ease: 'power2.in' });
    gsap.to(ov, { opacity: 0, duration: .2, ease: 'power1.in', onComplete: () => ov.classList.remove('open') });
  },
  bg(e, id) { if (e.target.id === id) Modal.close(id); },
  closeAll() { document.querySelectorAll('.overlay.open').forEach(m => Modal.close(m.id)); },
  isOpen() { return !!document.querySelector('.overlay.open'); }
};

// Promise-based confirmation dialog for destructive actions.
const Confirm = {
  _resolver: null,
  ask({ title, body, action = 'Delete' }) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmBody').textContent = body;
    document.getElementById('confirmOk').firstElementChild.textContent = action;
    Confirm._settle(false);
    Modal.open('modalConfirm');
    return new Promise(r => { Confirm._resolver = r; });
  },
  resolve(ok) {
    Confirm._settle(ok);
    Modal.close('modalConfirm');
  },
  _settle(ok) {
    const r = Confirm._resolver;
    Confirm._resolver = null;
    if (r) r(ok);
  }
};

// ─────────────────────────────────────────────────────────────
// POPOVER  (one at a time, anchored to an element)
// ─────────────────────────────────────────────────────────────
const Pop = {
  el: null, anchor: null,
  open(anchor, html, { align = 'start', width = 220, className = '' } = {}) {
    if (Pop.anchor === anchor) { Pop.close(); return null; }
    Pop.close();
    const el = document.createElement('div');
    el.className = 'popover ' + className;
    el.style.width = width + 'px';
    el.innerHTML = html;
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect();
    const h = el.offsetHeight;
    let left = align === 'end' ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, innerWidth - width - 8));
    let top = r.bottom + 6;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.transformOrigin = top < r.top ? 'bottom' : 'top';
    Pop.el = el; Pop.anchor = anchor;
    anchor.classList.add('pop-open');
    Motion.from(el, { opacity: 0, y: top < r.top ? 6 : -6, scale: .97, duration: .28, ease: 'power3.out' });
    return el;
  },
  close() {
    if (Pop.anchor) Pop.anchor.classList.remove('pop-open');
    if (Pop.el) Pop.el.remove();
    Pop.el = null; Pop.anchor = null;
  }
};
document.addEventListener('mousedown', e => {
  if (Pop.el && !Pop.el.contains(e.target) && !Pop.anchor?.contains(e.target)) Pop.close();
});
window.addEventListener('resize', () => Pop.close());

// ─────────────────────────────────────────────────────────────
// TOOLTIP  (for chart marks: any element with data-tip)
// ─────────────────────────────────────────────────────────────
const Tip = (() => {
  let el = null;
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('[data-tip]');
    if (!t) { if (el) el.style.opacity = '0'; return; }
    if (!el) { el = document.createElement('div'); el.className = 'chart-tip'; document.body.appendChild(el); }
    el.innerHTML = t.dataset.tip;
    el.style.opacity = '1';
  });
  document.addEventListener('mousemove', e => {
    if (!el || el.style.opacity !== '1') return;
    const w = el.offsetWidth;
    el.style.left = Math.min(e.clientX + 14, innerWidth - w - 8) + 'px';
    el.style.top = (e.clientY - el.offsetHeight - 12) + 'px';
  });
  return {};
})();
