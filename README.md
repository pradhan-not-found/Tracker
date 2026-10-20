# Tracker — Attendance & Activity Intelligence

[![Build macOS Application & DMG](https://github.com/pradhan-not-found/Tracker/actions/workflows/build.yml/badge.svg)](https://github.com/pradhan-not-found/Tracker/actions/workflows/build.yml)

**Tracker** is a high-performance, professional macOS desktop application built natively in Swift with Apple Vision OCR, local SQLite persistence, an Excel-like spreadsheet interface, and full export capabilities (PDF, Excel, Word, CSV).

Strictly designed with **Google Sans** typography and an ultra-clean **Enterprise White** layout. **Zero emojis. Zero AI slop. 100% offline, local, and private.**

---

## 📦 What's Included

| File / Folder | Description |
| :--- | :--- |
| **`.github/workflows/build.yml`** | **GitHub Actions CI/CD pipeline.** Automatically compiles native Swift binary, bundles app, packages DMG, and attaches artifacts. |
| **`assets/`** | Official high-resolution macOS icons (`AppIcon.icns`, `app_icon.png`). |
| **`sample_data/`** | `attendance_sample.csv` and `sample_attendance_roster.jpg` for instant testing. |
| **`build_dmg.sh`** | Build automation script to re-compile the app and rebuild `Tracker.dmg`. |
| **`src/`** | Native Swift source code (`main.swift`) with Apple Vision OCR and SQLite bridge. |
| **`ui/`** | Frontend interface (Helvetica CSS, Excel spreadsheet grid, OCR & CSV engines, Word/Excel exporters). |

---

## 🚀 Quick Start

### Option 1: Install via DMG (Recommended)
1. Double-click **`Tracker.dmg`** in this folder (or download it).
2. Drag **Tracker** into your **Applications** folder.
3. Launch **Tracker** from Applications, Launchpad, or Spotlight.

### Option 2: Run Directly from Terminal
```bash
open Tracker.app
```

---

## ⚡ Key Features

### 1. Dynamic Headings & Subheadings Privilege
You have complete freedom to define, edit, and customize headings and subheadings at every level:
- **Document Titles**: Click directly on the top banner or click **"Customize Headings"** to edit the Organization Name, Main Document Heading, and Subheading in real time.
- **Custom Spreadsheet Columns**: Click **"+ Add Custom Column"** or the **"+"** button on the table header to add any custom data field (e.g. *Shift*, *Location*, *Badge ID*, *Supervisor*, *Score*, *Remarks*).
- **Custom Schema Manager**: Configure column data types (Text, Number, Date, Time, Dropdown Select), default values, and choose whether they appear in exports.
- All custom headings and subheadings automatically flow into the **PDF reports**, **Excel spreadsheets**, and **Word documents**.

### 2. Excel-like Spreadsheet Data Grid
- **Inline Cell Editing**: Double-click any cell or press `Enter` to edit directly in place.
- **Quick Status Toggling**: Double-click status chips or cycle between *Present* (Emerald), *Absent* (Rose), *Late* (Amber), *Excused* (Sky), and *Remote* (Purple).
- **Auto-Calculated Hours**: Automatically calculates total work hours based on Time In and Time Out.
- **Quick Add Bar**: Type ID, Name, Department, and press `Enter` to log records in seconds.
- **Sorting & Filtering**: Instant search across all columns, department filter, and status filter tabs.
- **Bulk Operations**: Select multiple rows to bulk mark Present, Absent, or Delete.

### 3. Apple Vision Hardware-Accelerated Image OCR Scanner
- Click **"Scan Image OCR"** and upload or drag-and-drop photos/scans of paper attendance sheets, badges, or sign-in logs.
- Powered by Apple's native **Vision Framework** (`VNRecognizeTextRequest(recognitionLevel: .accurate)`).
- **100% on-device and private**: Scans text blocks with bounding box visual overlays.
- Automatically parses names, employee IDs, departments, statuses, and in/out timestamps.
- Review and edit extracted rows side-by-side with the image before committing to SQLite.
- Test immediately with `sample_data/sample_attendance_roster.jpg`!

### 4. Smart CSV Import Engine
- Click **"Upload CSV"** and drop any `.csv` or `.tsv` file.
- Automatic column matching for names, employee IDs, dates, statuses, times, and custom columns.
- Live preview of the first 5 rows with interactive mapping overrides.
- Fast batch transaction insertion directly into SQLite.
- Test immediately with `sample_data/attendance_sample.csv`!

### 5. Local SQLite Database Engine
- All records are saved in local SQLite storage:
  ```
  ~/Library/Application Support/Tracker/tracker.db
  ```
- Built-in **SQL Console** (`⚙️` icon): Inspect schemas, run raw SQL queries (e.g., `SELECT * FROM attendance WHERE status='Present'`), export JSON/SQL backups, or reset data.

### 6. Full Export & Print Suite
Click **"Export & Print"** to generate high-resolution documents styled with Helvetica typography:
- **📄 Print / Export to PDF**: Generates a clean corporate report with your custom Org Heading, Main Heading, Subheading, KPI metrics summary, data table, and signature blocks.
- **📊 Export to Excel (.xlsx)**: Valid OpenXML spreadsheet with headers, data types, and custom columns. Opens natively in Microsoft Excel and Apple Numbers.
- **📝 Export to Word (.docx)**: Valid Microsoft Word OpenXML document with formatted headings, styled tables, and metadata. Opens natively in Microsoft Word and Pages.
- **📑 Download Raw CSV**: Universal comma-separated text file for data pipelines.

---

## 🛠 Rebuilding from Source

To re-compile the native application and rebuild the DMG installer:
```bash
./build_dmg.sh
```

---

## 📋 System Requirements
- **Operating System**: macOS 12.0 (Monterey) or later (Apple Silicon M1/M2/M3/M4 or Intel).
- **Dependencies**: Zero external dependencies required to run `Tracker.app` or `Tracker.dmg`.
