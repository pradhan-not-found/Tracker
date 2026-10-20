'use strict';
/* =============================================================
   Tracker — local accounts (SQLite), profile, avatar
============================================================= */
let _currentUser = null;
let _pendingAvatarDataUrl = null;

async function hashPassword(pass, salt = Math.random().toString(36).slice(2, 12)) {
  return `sha256$${salt}$${await sha256(salt + ':' + pass)}`;
}
async function verifyPassword(pass, stored) {
  if (!String(stored).startsWith('sha256$')) return stored === pass; // legacy plaintext
  const [, salt] = stored.split('$');
  return (await hashPassword(pass, salt)) === stored;
}

const Auth = {
  async init() {
    let session = null;
    try { session = JSON.parse(localStorage.getItem('tracker_session') || 'null'); } catch {}
    if (session?.email) {
      const rows = await sqlObjects(`SELECT * FROM tracker_users WHERE email='${esc(session.email)}' LIMIT 1`);
      if (rows.length) { await Auth._enter(rows[0]); return; }
      try { localStorage.removeItem('tracker_session'); } catch {}
    }
    showScreen('screen-login');
  },

  async _enter(row, { welcome } = {}) {
    _currentUser = {
      id: row.id, firstName: row.first_name, lastName: row.last_name || '',
      email: row.email, avatarData: row.avatar_data || null
    };
    try { localStorage.setItem('tracker_session', JSON.stringify({ email: row.email })); } catch {}
    Auth._updateSidebarUI();
    showScreen('screen-app');
    await App.init();
    if (welcome) toast(welcome, 'success');
  },

  _updateSidebarUI() {
    if (!_currentUser) return;
    const fullName = (_currentUser.firstName + ' ' + _currentUser.lastName).trim();
    document.getElementById('sbUserName').textContent = fullName;
    document.getElementById('sbUserEmail').textContent = _currentUser.email;
    const ini = document.getElementById('sbUserAvatarInitial');
    const img = document.getElementById('sbUserAvatarImg');
    ini.textContent = (_currentUser.firstName[0] || '?').toUpperCase();
    if (_currentUser.avatarData) {
      img.src = _currentUser.avatarData; img.style.display = ''; ini.style.display = 'none';
    } else {
      img.style.display = 'none'; ini.style.display = '';
    }
  },

  async signIn(e) {
    e.preventDefault();
    const email = document.getElementById('siEmail').value.trim();
    const pass  = document.getElementById('siPass').value;
    const errEl = document.getElementById('siErr');
    errEl.textContent = '';
    if (!email || !pass) { errEl.textContent = 'Please enter your email and password.'; return; }

    const done = _busy(e.target, 'Logging in…');
    try {
      const rows = await sqlObjects(`SELECT * FROM tracker_users WHERE email='${esc(email)}' LIMIT 1`);
      if (!rows.length || !(await verifyPassword(pass, rows[0].password))) {
        errEl.textContent = 'Incorrect email or password.';
        if (Motion.on) gsap.fromTo('#signInForm', { x: -6 }, { x: 0, duration: .5, ease: 'elastic.out(1, .3)' });
        return;
      }
      if (!String(rows[0].password).startsWith('sha256$')) {
        await sql(`UPDATE tracker_users SET password='${esc(await hashPassword(pass))}' WHERE id=${rows[0].id}`);
      }
      document.getElementById('siPass').value = '';
      await Auth._enter(rows[0]);
    } catch (err) {
      errEl.textContent = 'Sign in failed: ' + err.message;
    } finally { done(); }
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
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { errEl.textContent = 'Enter a valid email address.'; return; }
    if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }

    const done = _busy(e.target, 'Creating account…');
    try {
      await sql(`INSERT INTO tracker_users (first_name, last_name, email, password, avatar_data)
        VALUES ('${esc(firstName)}', '${esc(lastName)}', '${esc(email)}', '${esc(await hashPassword(pass))}', ${sqlv(_pendingAvatarDataUrl)})`);
      const rows = await sqlObjects(`SELECT * FROM tracker_users WHERE email='${esc(email)}' LIMIT 1`);
      ['regFirstName', 'regLastName', 'regEmail', 'regPass'].forEach(id => document.getElementById(id).value = '');
      removeAvatar();
      await Auth._enter(rows[0], { welcome: `Welcome to Tracker, ${firstName}` });
    } catch (err) {
      errEl.textContent = /UNIQUE/.test(err.message) ? 'An account with this email already exists.' : 'Registration failed: ' + err.message;
    } finally { done(); }
  },

  logout() {
    _currentUser = null;
    try { localStorage.removeItem('tracker_session'); } catch {}
    App.reset();
    document.getElementById('formRegister').style.display = 'none';
    document.getElementById('formSignIn').style.display = '';
    document.getElementById('siErr').textContent = '';
    document.getElementById('regErr').textContent = '';
    showScreen('screen-login');
  },

  async saveProfile() {
    if (!_currentUser) return;
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName  = document.getElementById('editLastName').value.trim();
    const pass      = document.getElementById('editPass').value;
    const avatarEl  = document.getElementById('editAvatarImg');
    if (!firstName) { toast('First name is required', 'error'); return; }
    if (pass && pass.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

    let avatarData = _currentUser.avatarData;
    if (avatarEl.dataset.changed === '1') avatarData = avatarEl.getAttribute('src') || null;

    let query = `UPDATE tracker_users SET first_name='${esc(firstName)}', last_name='${esc(lastName)}', avatar_data=${sqlv(avatarData)}`;
    if (pass) query += `, password='${esc(await hashPassword(pass))}'`;
    query += ` WHERE id=${_currentUser.id}`;
    try {
      await sql(query);
      Object.assign(_currentUser, { firstName, lastName, avatarData });
      Auth._updateSidebarUI();
      Modal.close('modalProfile');
      toast('Profile updated', 'success');
    } catch { toast('Could not save profile', 'error'); }
  }
};

function _busy(form, busyLabel) {
  const btn = form.querySelector('button[type="submit"]');
  const label = btn.firstElementChild;
  const idle = label.textContent;
  btn.disabled = true;
  label.textContent = busyLabel;
  return () => { btn.disabled = false; label.textContent = idle; };
}

let _formSwitching = false;
async function switchForm(which) {
  if (_formSwitching) return;
  _formSwitching = true;
  const from = document.getElementById(which === 'signin' ? 'formRegister' : 'formSignIn');
  const to   = document.getElementById(which === 'signin' ? 'formSignIn' : 'formRegister');
  await Motion.hide(from);
  from.style.display = 'none';
  to.style.display = '';
  document.getElementById('siErr').textContent = '';
  document.getElementById('regErr').textContent = '';
  Motion.reveal(to, { duration: .9, stagger: .08, y: 24 });
  to.querySelector('.field-inp')?.focus();
  _formSwitching = false;
}

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.classList.toggle('on', show);
}

// ── avatar helpers ──────────────────────────────────────────
async function handleAvatarUpload(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB', 'error'); return; }
  _pendingAvatarDataUrl = await readFileAsDataUrl(file);
  const img = document.getElementById('avatarImg');
  img.src = _pendingAvatarDataUrl; img.style.display = '';
  document.getElementById('avatarInitial').style.display = 'none';
  document.getElementById('avatarRemoveBtn').style.display = '';
}

function removeAvatar() {
  _pendingAvatarDataUrl = null;
  document.getElementById('avatarImg').style.display = 'none';
  document.getElementById('avatarInitial').style.display = '';
  document.getElementById('avatarRemoveBtn').style.display = 'none';
}

function updateRegisterAvatarInitial() {
  const fn = document.getElementById('regFirstName').value.trim();
  document.getElementById('avatarInitial').textContent = fn ? fn[0].toUpperCase() : '?';
}

async function handleEditAvatarUpload(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB', 'error'); return; }
  const img = document.getElementById('editAvatarImg');
  img.src = await readFileAsDataUrl(file);
  img.style.display = ''; img.dataset.changed = '1';
  document.getElementById('editAvatarInitial').style.display = 'none';
  document.getElementById('editAvatarRemoveBtn').style.display = '';
}

function removeEditAvatar() {
  const img = document.getElementById('editAvatarImg');
  img.removeAttribute('src'); img.style.display = 'none'; img.dataset.changed = '1';
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
  ini.textContent = (_currentUser.firstName[0] || '?').toUpperCase();
  const has = !!_currentUser.avatarData;
  if (has) img.src = _currentUser.avatarData; else img.removeAttribute('src');
  img.style.display = has ? '' : 'none';
  ini.style.display = has ? 'none' : '';
  document.getElementById('editAvatarRemoveBtn').style.display = has ? '' : 'none';
  Modal.open('modalProfile');
}
