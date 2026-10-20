'use strict';
/* =============================================================
   Tracker: release notes, newest first.
   One source for the in-app "What's new" panel and the GitHub
   release notes (scripts/release-notes.js renders it for CI).
   Add an entry here before tagging a release.
============================================================= */
const CHANGELOG = [
  {
    "version": "2.4.1",
    "date": "2026-10-20",
    "title": "Tracker 2.4.1",
    "summary": "The Tracker icon everywhere, and no more system pop-ups.",
    "highlights": [],
    "improvements": [
      "Reminders and update news now appear only inside Tracker, as a message and in the sidebar. Tracker no longer sends system notifications.",
      "A cleaner Data and backups panel."
    ],
    "fixes": [
      "The Tracker icon now shows in the Windows taskbar for installed copies.",
      "The macOS About window shows the Tracker icon."
    ]
  },
  {
    "version": "2.4.0",
    "date": "2026-10-20",
    "title": "Welcome to Tracker 2.4",
    "summary": "A clear look at what changed every time Tracker updates.",
    "highlights": [
      {
        "icon": "sparkle",
        "title": "What's new, every update",
        "text": "After each update Tracker opens with a short summary of what changed, so nothing new goes unnoticed."
      },
      {
        "icon": "bell",
        "title": "Release notes before you update",
        "text": "When a new version is available, \"What's new\" shows its notes right inside Tracker before you decide to download."
      },
      {
        "icon": "check",
        "title": "Polished release notes",
        "text": "Every release on GitHub now comes with written notes covering highlights, improvements and fixes."
      }
    ],
    "improvements": [
      "Release notes in the app and on GitHub come from one source, so they always match.",
      "Reminder and update notifications always carry the Tracker name and logo."
    ],
    "fixes": [
      "The Windows installer now checks for enough free disk space first and explains what to do, instead of leaving an incomplete install that can't start.",
      "If the disk is full, Tracker tells you, keeps your last saved data safe and saves automatically as soon as there is space again."
    ]
  },
  {
    "version": "2.3.1",
    "date": "2026-10-20",
    "title": "Tracker 2.3.1",
    "summary": "Cleaner branding on Windows.",
    "highlights": [],
    "improvements": [
      "Task Manager and Windows dialogs show the app as \"Tracker\", published by Souradeep Pradhan.",
      "Third-party license notices now live in a tidy licenses folder."
    ],
    "fixes": []
  },
  {
    "version": "2.3.0",
    "date": "2026-10-20",
    "title": "Tracker 2.3",
    "summary": "Updates that ask first, and a logo that follows your theme.",
    "highlights": [
      {
        "icon": "download",
        "title": "Update notifications",
        "text": "Tracker tells you when a new version is out and waits for you. Nothing installs until you choose."
      },
      {
        "icon": "sparkle",
        "title": "Theme-aware logo",
        "text": "The Tracker mark is black in light mode and white in dark mode."
      }
    ],
    "improvements": [
      "A cleaner macOS install window.",
      "Every build is launched and tested before it is released."
    ],
    "fixes": []
  },
  {
    "version": "2.2.0",
    "date": "2026-10-20",
    "title": "Tracker 2.2",
    "summary": "Your data, protected.",
    "highlights": [
      {
        "icon": "check",
        "title": "Automatic backups",
        "text": "Backups are made as you work and when Tracker closes. Restore any of them from Data and backups."
      },
      {
        "icon": "users",
        "title": "Stay signed in",
        "text": "You stay signed in until you sign out, and the sign-in screen remembers you."
      }
    ],
    "improvements": [
      "Crash-safe saving and automatic recovery if the data file is ever damaged."
    ],
    "fixes": []
  }
];

if (typeof module !== 'undefined') module.exports = CHANGELOG;
