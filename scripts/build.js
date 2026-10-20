#!/usr/bin/env node
'use strict';
// Builds the Tracker installers.
//   npm run build          installers for this computer's platform
//   npm run build:win      Windows installer + portable .exe
//   npm run build:mac      macOS .dmg for Apple Silicon and Intel (run on a Mac)
//   npm run build:dir      unpacked app only (quick check)
// Downloads and temporary files go to .cache/ inside the project, so a nearly
// full system drive can't break the build.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const target = process.argv[2] || 'current';
const args = {
  win: ['--win', '--x64'],
  mac: ['--mac', '--arm64', '--x64'],
  linux: ['--linux'],
  dir: ['--dir'],
  current: process.platform === 'darwin' ? ['--mac', '--arm64', '--x64'] : process.platform === 'win32' ? ['--win', '--x64'] : ['--linux']
}[target];
if (!args) { console.error(`Unknown target "${target}". Use win, mac, linux, dir or leave it empty.`); process.exit(1); }

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE; // set by some editors' terminals; it breaks the build tools
if (!process.env.CI) {
  const cache = path.join(root, '.cache');
  const tmp = path.join(cache, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  Object.assign(env, {
    ELECTRON_CACHE: path.join(cache, 'electron'),
    ELECTRON_BUILDER_CACHE: path.join(cache, 'electron-builder'),
    TEMP: tmp, TMP: tmp, TMPDIR: tmp
  });
  try {
    const { bavail, bsize } = fs.statfsSync(cache);
    const freeMB = Math.round((bavail * bsize) / 1048576);
    if (freeMB < 1500) {
      console.error(`Only ${freeMB} MB free on the drive holding ${root}. Building needs about 1.5 GB. Free some space and try again.`);
      process.exit(1);
    }
  } catch {}
}

const started = Date.now();
// Run the CLI with this Node directly: no shell, so spaces in paths are safe.
const cli = require.resolve('electron-builder/cli.js', { paths: [root] });
const res = spawnSync(process.execPath, [cli, ...args, '--publish', 'never'], { cwd: root, env, stdio: 'inherit' });
if (res.status !== 0) {
  console.error('\nBuild failed. The messages above say why.');
  process.exit(res.status || 1);
}

const dist = path.join(root, 'dist');
const outputs = fs.existsSync(dist)
  ? fs.readdirSync(dist).filter(f => /\.(exe|dmg|zip|AppImage|deb)$/.test(f) && fs.statSync(path.join(dist, f)).mtimeMs >= started).map(f => {
      const mb = (fs.statSync(path.join(dist, f)).size / 1048576).toFixed(0);
      return `  ${f}  (${mb} MB)`;
    })
  : [];
console.log(`\nBuilt in ${Math.round((Date.now() - started) / 1000)}s. Output in ${dist}`);
console.log(outputs.length ? outputs.join('\n') : `  ${path.join(dist, process.platform === 'darwin' ? 'mac' : 'win-unpacked')}`);
