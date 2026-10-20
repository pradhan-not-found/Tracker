#!/usr/bin/env node
'use strict';
// Renders the GitHub release notes for a version from ui/js/changelog.js.
// usage: node scripts/release-notes.js 2.4.0 > release-notes.md
const path = require('path');
const CHANGELOG = require(path.join(__dirname, '..', 'ui', 'js', 'changelog.js'));

const version = String(process.argv[2] || '').replace(/^v/, '');
const entry = CHANGELOG.find(e => e.version === version);
if (!entry) {
  console.error(`No changelog entry for ${version}. Add one to ui/js/changelog.js before tagging.`);
  process.exit(1);
}

const REPO = 'https://github.com/pradhan-not-found/Tracker';
const dl = name => `${REPO}/releases/download/v${version}/${name}`;
const out = [];

out.push(entry.summary ? `**${entry.summary}**` : '', '');
if (entry.highlights?.length) {
  out.push('## Highlights', '');
  for (const h of entry.highlights) out.push(`- **${h.title}.** ${h.text}`);
  out.push('');
}
if (entry.improvements?.length) {
  out.push('## Improvements', '');
  for (const i of entry.improvements) out.push(`- ${i}`);
  out.push('');
}
if (entry.fixes?.length) {
  out.push('## Fixes', '');
  for (const f of entry.fixes) out.push(`- ${f}`);
  out.push('');
}
out.push(
  '## Download', '',
  '| Platform | File |',
  '|---|---|',
  `| Windows 10 / 11 (installer) | [Tracker-windows-x64-setup.exe](${dl('Tracker-windows-x64-setup.exe')}) |`,
  `| Windows (portable) | [Tracker-windows-x64-portable.exe](${dl('Tracker-windows-x64-portable.exe')}) |`,
  `| macOS, Apple Silicon | [Tracker-macos-arm64.dmg](${dl('Tracker-macos-arm64.dmg')}) |`,
  `| macOS, Intel | [Tracker-macos-x64.dmg](${dl('Tracker-macos-x64.dmg')}) |`,
  '',
  'Already using Tracker? It will tell you about this update and wait for you. Your data stays exactly where it is and is backed up before the update installs.',
  '',
  'Verify your download with `SHA256SUMS.txt` below. Builds are not code-signed yet: on Windows choose **More info → Run anyway**; on macOS right-click Tracker and choose **Open** the first time.'
);

process.stdout.write(out.join('\n').replace(/^\n+/, '') + '\n');
