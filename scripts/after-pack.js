'use strict';
// electron-builder afterPack hook: keep the install folder tidy and branded.
// The runtime's license notices must ship with the app, so instead of sitting
// loose next to Tracker.exe they move into a "licenses" folder with neutral names.
const fs = require('fs');
const path = require('path');

const MOVES = {
  'LICENSE.electron.txt': 'runtime-license.txt',
  'LICENSES.chromium.html': 'chromium-licenses.html'
};

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32' && context.electronPlatformName !== 'linux') return;
  const dir = context.appOutDir;
  const dest = path.join(dir, 'licenses');
  fs.mkdirSync(dest, { recursive: true });
  for (const [from, to] of Object.entries(MOVES)) {
    const src = path.join(dir, from);
    if (fs.existsSync(src)) fs.renameSync(src, path.join(dest, to));
  }
};
