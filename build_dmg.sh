#!/bin/bash
set -e

# ==============================================================================
# Tracker DMG Build Automation Script
# Packages Tracker.app and produces Tracker.dmg
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
APP_DIR="$BUILD_DIR/Tracker.app"
STAGING_DIR="$BUILD_DIR/dmg_staging"
OUTPUT_DMG="$PROJECT_DIR/Tracker.dmg"

echo "=== Building Tracker macOS Application ==="

# 1. Clean build directory
rm -rf "$APP_DIR" "$STAGING_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# 2. Compile Swift binary
echo "Compiling native Swift binary..."
swiftc "$PROJECT_DIR/src/main.swift" \
  -framework Cocoa \
  -framework WebKit \
  -framework Vision \
  -framework CoreGraphics \
  -framework UniformTypeIdentifiers \
  -lsqlite3 \
  -O \
  -o "$APP_DIR/Contents/MacOS/Tracker"

# 3. Copy App Icon and Info.plist
echo "Copying metadata and resources..."
cp "$PROJECT_DIR/assets/AppIcon.icns" "$APP_DIR/Contents/Resources/AppIcon.icns"
cp "$BUILD_DIR/Tracker.app/Contents/Info.plist" "$APP_DIR/Contents/Info.plist" 2>/dev/null || cat << 'EOF' > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>Tracker</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.tracker.attendance</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Tracker</string>
    <key>CFBundleDisplayName</key>
    <string>Tracker</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0.0</string>
    <key>CFBundleVersion</key>
    <string>200</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
</dict>
</plist>
EOF

# 4. Copy UI Bundle
echo "Bundling UI assets..."
cp -R "$PROJECT_DIR/ui" "$APP_DIR/Contents/Resources/ui"

# Also update root Tracker.app
rm -rf "$PROJECT_DIR/Tracker.app"
cp -R "$APP_DIR" "$PROJECT_DIR/Tracker.app"

# 5. Prepare DMG Staging
echo "=== Packaging Tracker.dmg ==="
mkdir -p "$STAGING_DIR"
cp -R "$APP_DIR" "$STAGING_DIR/Tracker.app"
ln -s /Applications "$STAGING_DIR/Applications"
cp "$PROJECT_DIR/assets/AppIcon.icns" "$STAGING_DIR/.VolumeIcon.icns"

# 6. Create compressed DMG
rm -f "$OUTPUT_DMG"
hdiutil create \
  -srcfolder "$STAGING_DIR" \
  -volname "Tracker" \
  -fs HFS+ \
  -format UDZO \
  -imagekey zlib-level=9 \
  -ov "$OUTPUT_DMG"

echo "=== Build Complete! ==="
echo "Application: $PROJECT_DIR/Tracker.app"
echo "DMG Image:   $OUTPUT_DMG"
ls -lh "$OUTPUT_DMG"
