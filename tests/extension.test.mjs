import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(import.meta.dirname, "..");
const extDir = path.join(rootDir, "extension");
const Config = require(path.join(extDir, "shared/settings.js"));

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

test("manifest.json is valid MV3 with required resources", () => {
  const manifestPath = path.join(extDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "EaseRead");
  assert.ok(manifest.action.default_popup);
  assert.ok(manifest.background.service_worker);
  assert.ok(Array.isArray(manifest.web_accessible_resources));

  // Verify every referenced file exists
  assert.ok(fs.existsSync(path.join(extDir, manifest.action.default_popup)));
  assert.ok(fs.existsSync(path.join(extDir, manifest.background.service_worker)));
  for (const iconPath of Object.values(manifest.icons)) {
    assert.ok(fs.existsSync(path.join(extDir, iconPath)), `Missing icon ${iconPath}`);
  }
  for (const cs of manifest.content_scripts) {
    for (const jsFile of cs.js) {
      assert.ok(fs.existsSync(path.join(extDir, jsFile)), `Missing content script ${jsFile}`);
    }
    for (const cssFile of cs.css) {
      assert.ok(fs.existsSync(path.join(extDir, cssFile)), `Missing content css ${cssFile}`);
    }
  }
});

test("all bundled dyslexia fonts exist and have valid WOFF2 signatures", () => {
  const expectedFonts = [
    "opendyslexic-400.woff2",
    "opendyslexic-700.woff2",
    "lexend-400.woff2",
    "lexend-600.woff2",
    "lexend-700.woff2",
    "atkinson-400.woff2",
    "atkinson-700.woff2",
  ];
  for (const file of expectedFonts) {
    const full = path.join(extDir, "fonts", file);
    assert.ok(fs.existsSync(full), `Missing font ${file}`);
    const header = fs.readFileSync(full).subarray(0, 4).toString("ascii");
    assert.equal(header, "wOF2", `${file} should have valid wOF2 magic bytes`);
  }
});

test("presets apply expected dyslexia settings cleanly", () => {
  const classic = Config.applyPreset(Config.DEFAULT_SETTINGS, "classic");
  assert.equal(classic.font, "opendyslexic");
  assert.equal(classic.theme, "cream");
  assert.equal(classic.removeItalics, true);
  assert.equal(classic.leftAlign, true);

  const focus = Config.applyPreset(Config.DEFAULT_SETTINGS, "focus");
  assert.equal(focus.font, "atkinson");
  assert.equal(focus.bionicReading, true);
  assert.equal(focus.readingRuler, true);
});

test("per-site overrides take priority over global autoApply", () => {
  let s = Config.mergeSettings({ enabled: true, autoApply: true });
  assert.equal(Config.isSiteActive(s, "www.wikipedia.org"), true);

  s = Config.setSiteOverride(s, "www.wikipedia.org", false);
  assert.equal(Config.isSiteActive(s, "wikipedia.org"), false);
  assert.equal(Config.isSiteActive(s, "nytimes.com"), true);

  s = Config.clearSiteOverride(s, "wikipedia.org");
  assert.equal(Config.isSiteActive(s, "wikipedia.org"), true);
});

test("bionic fixation length scales smoothly with word length", () => {
  assert.equal(Config.getFixationLength("a"), 1);
  assert.equal(Config.getFixationLength("the"), 1);
  assert.equal(Config.getFixationLength("read"), 2);
  assert.equal(Config.getFixationLength("bright"), 3);
  assert.equal(Config.getFixationLength("dyslexia"), 4);
  assert.equal(Config.getFixationLength("comfortable"), 5);
});

test("sentence splitting respects abbreviations and decimals", () => {
  const sample =
    "Dr. Carter studied U.S. students in 2024. Scores rose by 3.5 points! Was reading calmer? Yes, it was.";
  const sentences = Config.splitSentences(sample);
  assert.equal(sentences.length, 4);
  assert.equal(sentences[0], "Dr. Carter studied U.S. students in 2024.");
  assert.equal(sentences[1], "Scores rose by 3.5 points!");
  assert.equal(sentences[2], "Was reading calmer?");
  assert.equal(sentences[3], "Yes, it was.");

  const chunks = Config.chunkSentences(sample, 2);
  assert.equal(chunks.length, 2);
});

test("Xcode Safari Web Extension project exists and mirrors extension resources", () => {
  const xcodeProj = path.join(rootDir, "EaseReadApp/EaseRead/EaseRead.xcodeproj");
  const copiedManifest = path.join(
    rootDir,
    "EaseReadApp/EaseRead/Shared (Extension)/Resources/manifest.json"
  );
  assert.ok(fs.existsSync(xcodeProj), "Xcode project should exist");
  assert.ok(fs.existsSync(copiedManifest), "Copied extension manifest should exist");
});

console.log(`\nAll ${passed} tests passed!`);
