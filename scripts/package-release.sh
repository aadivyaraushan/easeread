#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_SRC="$ROOT_DIR/EaseReadApp/build/Build/Products/Release/EaseRead.app"
DIST_DIR="$ROOT_DIR/dist"
STAGE_DIR="$DIST_DIR/stage"

if [[ ! -d "$APP_SRC" ]]; then
  echo "Error: $APP_SRC not found. Build EaseRead (macOS) first." >&2
  exit 1
fi

rm -rf "$DIST_DIR"
mkdir -p "$STAGE_DIR"

# Copy universal app bundle cleanly
ditto "$APP_SRC" "$STAGE_DIR/EaseRead.app"

# Strip any local quarantine attributes before packaging
xattr -cr "$STAGE_DIR/EaseRead.app" 2>/dev/null || true

# Add Applications symlink for drag-and-drop DMG install
ln -s /Applications "$STAGE_DIR/Applications"

# Create a friendly one-click installer helper script
cat <<'EOF' > "$STAGE_DIR/Install EaseRead.command"
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_APP="$SCRIPT_DIR/EaseRead.app"
DEST_APP="/Applications/EaseRead.app"

echo ""
echo "Installing EaseRead for Safari..."
echo ""

if [[ ! -d "$SRC_APP" ]]; then
  echo "Could not find EaseRead.app next to this installer."
  exit 1
fi

rm -rf "$DEST_APP"
cp -R "$SRC_APP" "$DEST_APP"
xattr -dr com.apple.quarantine "$DEST_APP" 2>/dev/null || true

# Register the Safari extension with macOS LaunchServices and PlugInKit
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f -R "$DEST_APP" 2>/dev/null || true
pluginkit -a "$DEST_APP/Contents/PlugIns/EaseRead Extension.appex" 2>/dev/null || true

echo "EaseRead has been installed to /Applications/EaseRead.app!"
echo ""
echo "Next steps in Safari:"
echo "  1. Open Safari -> Settings -> Advanced -> check 'Show features for web developers'"
echo "  2. Open Safari -> Settings -> Developer -> check 'Allow unsigned extensions'"
echo "  3. Open Safari -> Settings -> Extensions -> check 'EaseRead'"
echo "     and set access to 'Always Allow on Every Website'"
echo ""
echo "Opening EaseRead now..."
open "$DEST_APP"
EOF
chmod +x "$STAGE_DIR/Install EaseRead.command"

# Add plain-text quick install note
cat <<'EOF' > "$STAGE_DIR/How to Install.txt"
EaseRead for Safari (macOS)
===========================

Quick Install:
1. Drag EaseRead.app into Applications.
2. Open EaseRead.app once (if macOS says it is from an unidentified developer,
   right-click EaseRead.app -> Open, OR go to System Settings -> Privacy & Security
   and click "Open Anyway").
   Tip: You can also double-click "Install EaseRead.command" to do steps 1-2 automatically.

Turn On in Safari:
3. Open Safari -> Settings -> Advanced and check "Show features for web developers".
4. Open Safari -> Settings -> Developer and check "Allow unsigned extensions".
   (Safari asks for your Mac password or Touch ID. This is required because EaseRead
   is shared directly rather than through the paid Mac App Store.)
5. Open Safari -> Settings -> Extensions, check "EaseRead", and click
   "Always Allow on Every Website".

Shortcuts on any webpage:
- Option + D : Toggle EaseRead on or off for this website
- Option + R : Toggle the Reading Ruler
- Option + V : Open or close Clean Reader View (with Read Aloud)
EOF

# Build compressed macOS DMG
hdiutil create \
  -volname "EaseRead for Safari" \
  -srcfolder "$STAGE_DIR" \
  -ov \
  -format UDZO \
  "$DIST_DIR/EaseRead-macOS.dmg"

# Also build a clean ZIP archive (without the Applications symlink)
ZIP_STAGE="$DIST_DIR/zip-stage/EaseRead"
mkdir -p "$ZIP_STAGE"
ditto "$STAGE_DIR/EaseRead.app" "$ZIP_STAGE/EaseRead.app"
cp "$STAGE_DIR/Install EaseRead.command" "$ZIP_STAGE/Install EaseRead.command"
cp "$STAGE_DIR/How to Install.txt" "$ZIP_STAGE/How to Install.txt"
ditto -c -k --sequesterRsrc --keepParent "$ZIP_STAGE" "$DIST_DIR/EaseRead-macOS.zip"

rm -rf "$STAGE_DIR" "$DIST_DIR/zip-stage"
ls -lh "$DIST_DIR"
