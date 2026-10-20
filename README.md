# Tracker

A local-first desktop app for building your own databases: to-do lists, marks and grades, attendance, inventory, or anything you can describe in columns. Runs on **Windows** and **macOS**. Everything is stored in a SQLite database on your computer; there is no cloud account and no sample data.

## Features

- **Workspaces and sheets.** Group related sheets in a workspace. Start a sheet from a template (To-do, Marks & grades, Attendance, Inventory), from a blank sheet, or from a CSV/Excel file. The wizard previews the sheet before anything is created.
- **Typed columns.** Text, Number, Marks (out of a maximum), Date, Checkbox, Status (single choice with colours), File upload, Email, Link. Add, rename, retype or delete columns at any time.
- **Three views per sheet.**
  - *Table*: a spreadsheet grid with inline editing, sorting, search and a summary row (sums, averages, % checked).
  - *Calendar*: a month view of any date column. Click a day to add a record on that date.
  - *Dashboard*: KPIs, completion rate, due/overdue counts, a 30-day "records added" trend, a breakdown for each status column and a marks distribution.
- **Everything tracked.** Every record you add, edit or delete goes into an activity log, along with every column change, import and export. Each record's drawer shows its own history.
- **Reminders.** Sheets with a deadline date (any date column in a To-do sheet, or one named like *Due*, *Deadline*) plus a checkbox or "done" status raise reminders. Overdue and due-today items appear in the bell inbox and on Home, and you get a system notification at sign-in.
- **Import & export.** Import CSV, XLSX, XLS or ODS; missing columns are created with their types detected. Export a sheet as Excel, CSV or JSON, or a whole workspace as a multi-tab Excel workbook.
- **Local accounts.** Each account sees its own workspaces. Passwords are stored as salted SHA-256 hashes.
- **Design.** Atlas design language: Switzer variable font, warm neutral palette, GSAP motion, light/dark/system themes.

## Download

Get the latest build from [Releases](https://github.com/pradhan-not-found/Tracker/releases/latest):

| Platform | File |
|---|---|
| Windows 10/11 (installer) | `Tracker-<version>-windows-x64-setup.exe` |
| Windows (portable, no install) | `Tracker-<version>-windows-x64-portable.exe` |
| macOS, Apple Silicon | `Tracker-<version>-macos-arm64.dmg` |
| macOS, Intel | `Tracker-<version>-macos-x64.dmg` |

The builds are not code-signed. On Windows, SmartScreen may warn on first run (*More info → Run anyway*). On macOS, right-click Tracker in Applications and choose **Open** the first time.

## Where your data lives

| Platform | Location |
|---|---|
| Windows | `%APPDATA%\Tracker\tracker.db` |
| macOS | `~/Library/Application Support/Tracker/tracker.db` |

## Development

Requirements: Node.js 22+.

```bash
npm install
npm start          # run the app
npm run dev        # run with DevTools
```

> Running from VS Code's integrated terminal? If Electron starts as plain Node, clear `ELECTRON_RUN_AS_NODE` first.

### Building installers

```bash
npm run build:win   # dist/Tracker-<v>-windows-x64-setup.exe + portable .exe
npm run build:mac   # dist/Tracker-<v>-macos-{arm64,x64}.dmg (run on a Mac)
```

### Releases (CI)

`.github/workflows/build.yml` builds Windows and macOS packages on every push to `main`. To publish a release, bump `version` in `package.json` (and `VERSION` in `landing/lib/downloads.ts`), then push a matching tag:

```bash
git tag v2.1.0 && git push origin v2.1.0
```

The workflow attaches the installers and a `SHA256SUMS.txt` to the GitHub Release.

## Landing page

`landing/` is a Next.js static site with Download for Windows / Download for macOS buttons that point at the release assets.

```bash
cd landing
npm install
npm run dev        # http://localhost:3000
npm run build      # static export in landing/out
```

`.github/workflows/landing.yml` deploys it to GitHub Pages from `main` (enable once under *Settings → Pages → Source: GitHub Actions*).

## Project layout

```
electron/        Electron main process (window, SQLite via sql.js) and preload bridge
ui/              The app UI (HTML/CSS/JS), shared by every shell
  js/core.js       bridge, SQL helpers, motion, toasts, modals, popovers
  js/schema.js     metadata tables, column types, templates
  js/auth.js       local accounts and profile
  js/activity.js   activity log and reminders
  js/table.js      table view, cell editors, column editor, record drawer
  js/views.js      calendar and dashboard
  js/io.js         new-sheet wizard, import and export
  js/app.js        state, navigation, home and workspace views
landing/         Next.js landing page
src/main.swift   Optional native macOS shell (WKWebView); build with build_dmg.sh
```

## License

MIT
