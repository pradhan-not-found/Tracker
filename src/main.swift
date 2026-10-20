import Cocoa
import WebKit
import SQLite3
import Vision
import CoreGraphics
import UniformTypeIdentifiers

// Helper for safe SQLite text column reading
func textCol(_ stmt: OpaquePointer?, _ index: Int32, defaultVal: String = "") -> String {
    if let ptr = sqlite3_column_text(stmt, index) {
        return String(cString: ptr)
    }
    return defaultVal
}

// MARK: - Native Bridge Message Handler
class NativeBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    var db: OpaquePointer?
    let dbPath: String

    override init() {
        let fileManager = FileManager.default
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let trackerDir = appSupport.appendingPathComponent("Tracker", isDirectory: true)

        try? fileManager.createDirectory(at: trackerDir, withIntermediateDirectories: true, attributes: nil)
        self.dbPath = trackerDir.appendingPathComponent("tracker.db").path
        super.init()

        initDatabase()
    }

    deinit {
        if db != nil {
            sqlite3_close(db)
        }
    }

    // MARK: - SQLite Setup
    private func initDatabase() {
        // The web UI creates and migrates its own schema; nothing is seeded here.
        if sqlite3_open(dbPath, &db) == SQLITE_OK {
            print("SQLite Database successfully opened at: \(dbPath)")
        } else {
            print("Unable to open SQLite database.")
        }
    }

    // MARK: - Script Message Router
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let action = dict["action"] as? String,
              let callbackId = dict["callbackId"] as? String else {
            return
        }

        let payload = dict["payload"] as? [String: Any] ?? [:]

        switch action {
        case "db_init", "db_load":
            handleDbLoad(callbackId: callbackId)

        case "db_save_records":
            handleDbSaveRecords(payload: payload, callbackId: callbackId)

        case "db_query":
            handleDbQuery(payload: payload, callbackId: callbackId)

        case "scan_image_ocr":
            handleImageOcr(payload: payload, callbackId: callbackId)

        case "open_file_dialog":
            handleOpenFile(payload: payload, callbackId: callbackId)

        default:
            sendResponse(callbackId: callbackId, error: nil, result: ["status": "ok"])
        }
    }

    // MARK: - Database Load
    private func handleDbLoad(callbackId: String) {
        var records: [[String: Any]] = []
        let query = "SELECT id, sheet_id, member_id, name, department, date, status, time_in, time_out, hours, verification_method, notes, custom_fields FROM attendance ORDER BY id DESC;"

        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let id = sqlite3_column_int(statement, 0)
                let sheetId = textCol(statement, 1, defaultVal: "main")
                let memberId = textCol(statement, 2)
                let name = textCol(statement, 3)
                let dept = textCol(statement, 4)
                let date = textCol(statement, 5)
                let status = textCol(statement, 6, defaultVal: "Present")
                let timeIn = textCol(statement, 7, defaultVal: "09:00")
                let timeOut = textCol(statement, 8, defaultVal: "17:30")
                let hours = sqlite3_column_double(statement, 9)
                let verMethod = textCol(statement, 10, defaultVal: "Manual")
                let notes = textCol(statement, 11)
                let customFieldsRaw = textCol(statement, 12, defaultVal: "{}")

                var customFields: [String: Any] = [:]
                if let data = customFieldsRaw.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    customFields = json
                }

                records.append([
                    "id": id,
                    "sheet_id": sheetId,
                    "member_id": memberId,
                    "name": name,
                    "department": dept,
                    "date": date,
                    "status": status,
                    "time_in": timeIn,
                    "time_out": timeOut,
                    "hours": hours,
                    "verification_method": verMethod,
                    "notes": notes,
                    "custom_fields": customFields
                ])
            }
            sqlite3_finalize(statement)
        }

        sendResponse(callbackId: callbackId, error: nil, result: [
            "dbPath": dbPath,
            "records": records,
            "count": records.count
        ])
    }

    // MARK: - Save Records (Transaction Batch)
    private func handleDbSaveRecords(payload: [String: Any], callbackId: String) {
        guard let records = payload["records"] as? [[String: Any]] else {
            sendResponse(callbackId: callbackId, error: "Missing records", result: nil)
            return
        }

        sqlite3_exec(db, "BEGIN TRANSACTION;", nil, nil, nil)
        sqlite3_exec(db, "DELETE FROM attendance;", nil, nil, nil)

        let insertSql = """
        INSERT INTO attendance (id, sheet_id, member_id, name, department, date, status, time_in, time_out, hours, verification_method, notes, custom_fields)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """

        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, insertSql, -1, &stmt, nil) == SQLITE_OK {
            for r in records {
                let id = Int32((r["id"] as? Int) ?? 0)
                let sheetId = (r["sheet_id"] as? String) ?? "main"
                let memberId = (r["member_id"] as? String) ?? ""
                let name = (r["name"] as? String) ?? ""
                let dept = (r["department"] as? String) ?? ""
                let date = (r["date"] as? String) ?? ""
                let status = (r["status"] as? String) ?? "Present"
                let timeIn = (r["time_in"] as? String) ?? "09:00"
                let timeOut = (r["time_out"] as? String) ?? "17:30"
                let hours = (r["hours"] as? Double) ?? 8.0
                let method = (r["verification_method"] as? String) ?? "Manual"
                let notes = (r["notes"] as? String) ?? ""

                var customJson = "{}"
                if let custom = r["custom_fields"] as? [String: Any],
                   let data = try? JSONSerialization.data(withJSONObject: custom),
                   let str = String(data: data, encoding: .utf8) {
                    customJson = str
                }

                sqlite3_bind_int(stmt, 1, id)
                sqlite3_bind_text(stmt, 2, (sheetId as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 3, (memberId as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 4, (name as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 5, (dept as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 6, (date as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 7, (status as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 8, (timeIn as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 9, (timeOut as NSString).utf8String, -1, nil)
                sqlite3_bind_double(stmt, 10, hours)
                sqlite3_bind_text(stmt, 11, (method as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 12, (notes as NSString).utf8String, -1, nil)
                sqlite3_bind_text(stmt, 13, (customJson as NSString).utf8String, -1, nil)

                sqlite3_step(stmt)
                sqlite3_reset(stmt)
            }
            sqlite3_finalize(stmt)
        }

        sqlite3_exec(db, "COMMIT;", nil, nil, nil)
        sendResponse(callbackId: callbackId, error: nil, result: ["status": "saved", "count": records.count])
    }

    // MARK: - Raw SQL Query Executor
    private func handleDbQuery(payload: [String: Any], callbackId: String) {
        guard let query = payload["query"] as? String else {
            sendResponse(callbackId: callbackId, error: "Empty query", result: nil)
            return
        }

        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK {
            var columns: [String] = []
            let colCount = sqlite3_column_count(statement)
            for i in 0..<colCount {
                let name = String(cString: sqlite3_column_name(statement, i))
                columns.append(name)
            }

            var rows: [[Any]] = []
            while sqlite3_step(statement) == SQLITE_ROW {
                var row: [Any] = []
                for i in 0..<colCount {
                    let type = sqlite3_column_type(statement, i)
                    switch type {
                    case SQLITE_INTEGER:
                        row.append(sqlite3_column_int64(statement, i))
                    case SQLITE_FLOAT:
                        row.append(sqlite3_column_double(statement, i))
                    case SQLITE_TEXT:
                        let text = textCol(statement, i)
                        row.append(text)
                    case SQLITE_NULL:
                        row.append(NSNull())
                    default:
                        row.append("")
                    }
                }
                rows.append(row)
            }
            sqlite3_finalize(statement)

            sendResponse(callbackId: callbackId, error: nil, result: [
                "columns": columns,
                "rows": rows
            ])
        } else {
            let errorMsg = String(cString: sqlite3_errmsg(db))
            sendResponse(callbackId: callbackId, error: errorMsg, result: nil)
        }
    }

    // MARK: - Apple Vision Hardware-Accelerated OCR
    private func handleImageOcr(payload: [String: Any], callbackId: String) {
        guard let base64Str = payload["imageBase64"] as? String else {
            sendResponse(callbackId: callbackId, error: "Missing imageBase64", result: nil)
            return
        }

        let cleanBase64 = base64Str.components(separatedBy: ",").last ?? base64Str
        guard let data = Data(base64Encoded: cleanBase64),
              let nsImage = NSImage(data: data),
              let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            sendResponse(callbackId: callbackId, error: "Invalid image format", result: nil)
            return
        }

        let request = VNRecognizeTextRequest { [weak self] (req, err) in
            guard let self = self else { return }
            if let err = err {
                self.sendResponse(callbackId: callbackId, error: err.localizedDescription, result: nil)
                return
            }

            guard let observations = req.results as? [VNRecognizedTextObservation] else {
                self.sendResponse(callbackId: callbackId, error: nil, result: ["detectedBoxes": [], "extractedRecords": []])
                return
            }

            var detectedBoxes: [[String: Any]] = []
            var extractedLines: [String] = []

            for obs in observations {
                guard let topCandidate = obs.topCandidates(1).first else { continue }
                let text = topCandidate.string

                let box = obs.boundingBox
                detectedBoxes.append([
                    "text": text,
                    "x": box.origin.x * 1000.0,
                    "y": (1.0 - box.origin.y - box.size.height) * 800.0,
                    "w": box.size.width * 1000.0,
                    "h": box.size.height * 800.0,
                    "confidence": topCandidate.confidence
                ])
                extractedLines.append(text)
            }

            let extractedRecords = self.parseAttendanceRosterLines(extractedLines)

            self.sendResponse(callbackId: callbackId, error: nil, result: [
                "detectedBoxes": detectedBoxes,
                "extractedRecords": extractedRecords,
                "linesCount": extractedLines.count
            ])
        }

        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
            } catch {
                self.sendResponse(callbackId: callbackId, error: error.localizedDescription, result: nil)
            }
        }
    }

    // MARK: - Intelligent Tabular Roster Parser
    private func parseAttendanceRosterLines(_ lines: [String]) -> [[String: Any]] {
        var records: [[String: Any]] = []

        let idRegex = try? NSRegularExpression(pattern: #"(EMP[-_]?\d{2,6}|ID[-_]?\d{2,6}|#\d{2,6}|\b\d{4,6}\b)"#, options: .caseInsensitive)
        let timeRegex = try? NSRegularExpression(pattern: #"\b([01]?\d|2[0-3]):[0-5]\d\b"#, options: [])

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.lowercased().contains("attendance") || trimmed.lowercased().contains("sign-in") || trimmed.hasPrefix("Date:") || trimmed.contains("DEPARTMENT") {
                continue
            }

            var detectedId = ""
            if let match = idRegex?.firstMatch(in: trimmed, range: NSRange(location: 0, length: trimmed.utf16.count)) {
                if let r = Range(match.range, in: trimmed) {
                    detectedId = String(trimmed[r])
                }
            }

            var times: [String] = []
            let timeMatches = timeRegex?.matches(in: trimmed, range: NSRange(location: 0, length: trimmed.utf16.count)) ?? []
            for tm in timeMatches {
                if let r = Range(tm.range, in: trimmed) {
                    times.append(String(trimmed[r]))
                }
            }

            var status = "Present"
            let low = trimmed.lowercased()
            if low.contains("absent") { status = "Absent" }
            else if low.contains("late") { status = "Late" }
            else if low.contains("excused") { status = "Excused" }

            var remaining = trimmed
            if !detectedId.isEmpty {
                remaining = remaining.replacingOccurrences(of: detectedId, with: "")
            }
            for t in times {
                remaining = remaining.replacingOccurrences(of: t, with: "")
            }
            remaining = remaining.replacingOccurrences(of: status, with: "", options: .caseInsensitive)
            remaining = remaining.replacingOccurrences(of: "Security", with: "", options: .caseInsensitive)
            remaining = remaining.replacingOccurrences(of: "Operations", with: "", options: .caseInsensitive)
            remaining = remaining.replacingOccurrences(of: "Research", with: "", options: .caseInsensitive)
            remaining = remaining.replacingOccurrences(of: "Engineering", with: "", options: .caseInsensitive)
            remaining = remaining.replacingOccurrences(of: "Finance", with: "", options: .caseInsensitive)

            let cleanedName = remaining.trimmingCharacters(in: CharacterSet.alphanumerics.inverted).trimmingCharacters(in: .whitespaces)

            if !detectedId.isEmpty || cleanedName.count >= 3 {
                records.append([
                    "member_id": detectedId.isEmpty ? "EMP-\(Int.random(in: 1000...9999))" : detectedId,
                    "name": cleanedName.isEmpty ? "Roster Member" : cleanedName,
                    "department": low.contains("security") ? "Security" : (low.contains("operations") ? "Operations" : (low.contains("research") ? "Research" : (low.contains("engineering") ? "Engineering" : (low.contains("finance") ? "Finance" : "General")))),
                    "status": status,
                    "time_in": times.count > 0 ? times[0] : (status == "Absent" ? "00:00" : "09:00"),
                    "time_out": times.count > 1 ? times[1] : (status == "Absent" ? "00:00" : "17:30"),
                    "hours": (status == "Absent") ? 0.0 : 8.5
                ])
            }
        }

        return records
    }

    // MARK: - Native File Open Panel
    private func handleOpenFile(payload: [String: Any], callbackId: String) {
        DispatchQueue.main.async {
            let panel = NSOpenPanel()
            panel.canChooseFiles = true
            panel.canChooseDirectories = false
            panel.allowsMultipleSelection = false

            if panel.runModal() == .OK, let url = panel.url {
                self.sendResponse(callbackId: callbackId, error: nil, result: ["filePath": url.path])
            } else {
                self.sendResponse(callbackId: callbackId, error: "User cancelled", result: nil)
            }
        }
    }

    // MARK: - Dispatch response to WebKit
    private func sendResponse(callbackId: String, error: String?, result: [String: Any]?) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let webView = self.webView else { return }

            var errJson = "null"
            if let error = error {
                errJson = "\"\(error.replacingOccurrences(of: "\"", with: "\\\""))\""
            }

            var resJson = "null"
            if let result = result,
               let data = try? JSONSerialization.data(withJSONObject: result),
               let str = String(data: data, encoding: .utf8) {
                resJson = str
            }

            let js = "window.onNativeResponse('\(callbackId)', \(errJson), \(resJson));"
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

// MARK: - Main Application Delegate & Window Setup
class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var bridge: NativeBridge!

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenu()
        setupWindow()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    private func setupWindow() {
        let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 1440, height: 900)
        let width: CGFloat = min(1340, screenSize.width - 80)
        let height: CGFloat = min(880, screenSize.height - 100)

        let rect = NSRect(x: (screenSize.width - width) / 2,
                          y: (screenSize.height - height) / 2,
                          width: width,
                          height: height)

        window = NSWindow(contentRect: rect,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered,
                          defer: false)

        window.title = "Tracker"
        window.minSize = NSSize(width: 1050, height: 680)
        window.delegate = self
        window.backgroundColor = NSColor.white

        // WebKit Configuration
        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()

        bridge = NativeBridge()
        contentController.add(bridge, name: "trackerNative")
        config.userContentController = contentController

        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")

        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground")
        bridge.webView = webView

        window.contentView?.addSubview(webView)

        loadUserInterface()

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func loadUserInterface() {
        let bundle = Bundle.main
        var uiUrl: URL?

        if let bundleUrl = bundle.url(forResource: "index", withExtension: "html", subdirectory: "ui") {
            uiUrl = bundleUrl
        } else if let localPath = bundle.resourcePath {
            let directUrl = URL(fileURLWithPath: localPath).appendingPathComponent("ui/index.html")
            if FileManager.default.fileExists(atPath: directUrl.path) {
                uiUrl = directUrl
            }
        }

        if uiUrl == nil {
            let cwdUrl = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("ui/index.html")
            if FileManager.default.fileExists(atPath: cwdUrl.path) {
                uiUrl = cwdUrl
            }
        }

        if let finalUrl = uiUrl {
            let readAccessUrl = finalUrl.deletingLastPathComponent().deletingLastPathComponent()
            webView.loadFileURL(finalUrl, allowingReadAccessTo: readAccessUrl)
            print("Loaded Tracker UI from: \(finalUrl.path)")
        } else {
            print("Could not find ui/index.html!")
        }
    }

    // MARK: - Native Menu Bar
    private func setupMenu() {
        let mainMenu = NSMenu()

        // App Menu
        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(NSMenuItem(title: "About Tracker", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: ""))
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(NSMenuItem(title: "Hide Tracker", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h"))

        let hideOthers = NSMenuItem(title: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthers)

        appMenu.addItem(NSMenuItem(title: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: ""))
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(NSMenuItem(title: "Quit Tracker", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        // File Menu
        let fileMenuItem = NSMenuItem()
        let fileMenu = NSMenu(title: "File")
        fileMenu.addItem(NSMenuItem(title: "New Record", action: #selector(menuNewRecord), keyEquivalent: "n"))
        fileMenu.addItem(NSMenuItem(title: "Import CSV...", action: #selector(menuImportCsv), keyEquivalent: "o"))
        fileMenu.addItem(NSMenuItem(title: "Scan Attendance Image...", action: #selector(menuScanImage), keyEquivalent: "i"))
        fileMenu.addItem(NSMenuItem.separator())
        fileMenu.addItem(NSMenuItem(title: "Print / Export PDF...", action: #selector(menuPrintPdf), keyEquivalent: "p"))
        fileMenu.addItem(NSMenuItem.separator())
        fileMenu.addItem(NSMenuItem(title: "Close Window", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w"))
        fileMenuItem.submenu = fileMenu
        mainMenu.addItem(fileMenuItem)

        // Edit Menu
        let editMenuItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(NSMenuItem(title: "Undo", action: #selector(UndoManager.undo), keyEquivalent: "z"))
        editMenu.addItem(NSMenuItem(title: "Redo", action: #selector(UndoManager.redo), keyEquivalent: "Z"))
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"))
        editMenu.addItem(NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"))
        editMenu.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"))
        editMenu.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        // View Menu
        let viewMenuItem = NSMenuItem()
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(NSMenuItem(title: "Reload Interface", action: #selector(menuReload), keyEquivalent: "r"))

        let fullScreen = NSMenuItem(title: "Toggle Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fullScreen.keyEquivalentModifierMask = [.command, .control]
        viewMenu.addItem(fullScreen)

        viewMenuItem.submenu = viewMenu
        mainMenu.addItem(viewMenuItem)

        NSApp.mainMenu = mainMenu
    }

    @objc private func menuNewRecord() {
        webView.evaluateJavaScript("document.getElementById('btnAddNewRow').click();", completionHandler: nil)
    }

    @objc private func menuImportCsv() {
        webView.evaluateJavaScript("document.getElementById('btnImportCsv').click();", completionHandler: nil)
    }

    @objc private func menuScanImage() {
        webView.evaluateJavaScript("document.getElementById('btnScanImage').click();", completionHandler: nil)
    }

    @objc private func menuPrintPdf() {
        webView.evaluateJavaScript("document.getElementById('exportPdfBtn').click();", completionHandler: nil)
    }

    @objc private func menuReload() {
        webView.reload()
    }
}

// App Entry Point
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
