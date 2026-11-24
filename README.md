# EaseRead — Dyslexia Friendly Safari Extension

**EaseRead** is a native Safari Web Extension for macOS (and iOS via Xcode) that turns any webpage into a calm, dyslexia friendly reading experience.

## Download for Mac (Safari)

1. Download **[EaseRead-macOS.dmg](https://github.com/aadivyaraushan/easeread/releases/latest/download/EaseRead-macOS.dmg)** (works on both Apple Silicon and Intel Macs running macOS 12+).
2. Open the downloaded `.dmg` file and drag **EaseRead** into **Applications** *(or double-click `Install EaseRead.command` inside the disk image to install and bypass the macOS download warning automatically)*.
3. Open **EaseRead** once from Applications.
   - If macOS warns about an unidentified developer, open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway**.
4. Turn EaseRead on in Safari:
   - Open **Safari → Settings → Advanced** and check **Show features for web developers**.
   - Open **Safari → Settings → Developer** and check **Allow unsigned extensions** *(Safari will ask for Touch ID or your Mac password — this is required for extensions shared directly outside the Mac App Store)*.
   - Open **Safari → Settings → Extensions**, check **EaseRead**, and set website access to **Always Allow on Every Website**.
5. Click the **EaseRead** icon in the Safari toolbar to pick a preset, switch fonts, or launch **Clean Reader View**.

> **Note:** In Safari on macOS, **Allow unsigned extensions** resets whenever you completely quit Safari (`⌘Q`). If EaseRead ever hides after restarting Safari, just re-check **Safari → Settings → Developer → Allow unsigned extensions**.

---

## Features

- **Bundled Offline Dyslexia Fonts:** Switch instantly between **OpenDyslexic**, **Lexend**, **Atkinson Hyperlegible**, and **Clean Sans**. Icon fonts and code blocks stay intact.
- **Calm Paper Tints:** **Warm Cream**, **Soft Peach**, **Calm Mint**, **Soft Sky**, **Soft Dark**, or **Original**, plus an optional subtle screen veil.
- **Spacing and Layout Relief:** Adjustable text size, letter spacing, word spacing, and line height; removes italics and converts justified text to left-aligned text without hyphenation.
- **Reading Aids:**
  - **Reading Ruler:** A gentle focus band that follows your cursor or touch (`Option + R`, nudge with `Option + ↑/↓`).
  - **Bold Word Anchors:** Highlights word starts to guide eye fixation.
  - **Short Paragraphs:** Splits long walls of text into calmer 2-sentence chunks (completely reversible).
- **Clean Reader View + Read Aloud:** Strips sidebars and clutter into a single peaceful reading column with built-in **Read Aloud**, live sentence highlighting, click-any-sentence playback, and `0.75x–1.3x` speed control (`Option + V`, `Esc` to close).
- **One-Tap Presets:** **Classic**, **Calm**, and **Focus**, plus per-site enable/pause memory (`Option + D`).

---

## Build from Source (Xcode — macOS & iOS)

1. Open `EaseReadApp/EaseRead/EaseRead.xcodeproj` in Xcode.
2. Select your Apple ID under **Signing & Capabilities** for both the App and Extension targets.
3. Choose **EaseRead (macOS)** or **EaseRead (iOS)** and press **Run (`⌘R`)**.

## Try the Interactive Preview Locally

Open `demo/test-article.html` in Safari (or any browser) to test all presets, the reading ruler, and Clean Reader View immediately.
