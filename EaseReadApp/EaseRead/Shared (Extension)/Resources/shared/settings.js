(function (root) {
  "use strict";

  const STORAGE_KEY = "easeread_settings_v1";

  const FONTS = {
    opendyslexic: {
      id: "opendyslexic",
      label: "OpenDyslexic",
      subtitle: "Weighted bottoms anchor letters",
      stack: '"EaseRead OpenDyslexic", "OpenDyslexic", Verdana, Arial, sans-serif',
    },
    lexend: {
      id: "lexend",
      label: "Lexend",
      subtitle: "Reduced visual crowding",
      stack: '"EaseRead Lexend", "Lexend", Verdana, Arial, sans-serif',
    },
    atkinson: {
      id: "atkinson",
      label: "Atkinson",
      subtitle: "Distinct letter shapes",
      stack: '"EaseRead Atkinson", "Atkinson Hyperlegible", Verdana, Arial, sans-serif',
    },
    sans: {
      id: "sans",
      label: "Clean Sans",
      subtitle: "Familiar open sans serif",
      stack: 'Verdana, "Helvetica Neue", Arial, sans-serif',
    },
  };

  const THEMES = {
    original: {
      id: "original",
      label: "Original",
      swatch: "#FFFFFF",
      borderSwatch: "#D6D3CD",
      applyColors: false,
      bg: "#FFFFFF",
      surface: "#F5F5F4",
      text: "#1C1917",
      muted: "#57534E",
      link: "#195753",
      border: "#E5E2DC",
      highlight: "#FCE59A",
      rulerTint: "rgba(25, 87, 83, 0.12)",
      rulerEdge: "rgba(25, 87, 83, 0.55)",
      isDark: false,
    },
    cream: {
      id: "cream",
      label: "Warm Cream",
      swatch: "#FAF6EB",
      borderSwatch: "#DFD7C2",
      applyColors: true,
      bg: "#FAF6EB",
      surface: "#F1EBDC",
      text: "#23201C",
      muted: "#595349",
      link: "#175955",
      border: "#DFD7C2",
      highlight: "#F6D983",
      rulerTint: "rgba(230, 166, 56, 0.14)",
      rulerEdge: "rgba(196, 134, 24, 0.65)",
      isDark: false,
    },
    peach: {
      id: "peach",
      label: "Soft Peach",
      swatch: "#FCF0E4",
      borderSwatch: "#E5CEB8",
      applyColors: true,
      bg: "#FCF0E4",
      surface: "#F4E3D3",
      text: "#261F1A",
      muted: "#5F5047",
      link: "#1B525A",
      border: "#E4CEBA",
      highlight: "#F3CE8B",
      rulerTint: "rgba(196, 121, 70, 0.14)",
      rulerEdge: "rgba(176, 98, 48, 0.6)",
      isDark: false,
    },
    mint: {
      id: "mint",
      label: "Calm Mint",
      swatch: "#EDF7F1",
      borderSwatch: "#C6DFD1",
      applyColors: true,
      bg: "#EDF7F1",
      surface: "#E0EFE6",
      text: "#1B2922",
      muted: "#486054",
      link: "#18535C",
      border: "#C7DED1",
      highlight: "#D6EEB4",
      rulerTint: "rgba(30, 92, 88, 0.12)",
      rulerEdge: "rgba(30, 92, 88, 0.55)",
      isDark: false,
    },
    sky: {
      id: "sky",
      label: "Soft Sky",
      swatch: "#EDF4FC",
      borderSwatch: "#C5D7EC",
      applyColors: true,
      bg: "#EDF4FC",
      surface: "#E0EAF7",
      text: "#1B2430",
      muted: "#4A5A70",
      link: "#1A4D8A",
      border: "#C6D8EC",
      highlight: "#F9E29C",
      rulerTint: "rgba(26, 77, 138, 0.12)",
      rulerEdge: "rgba(26, 77, 138, 0.55)",
      isDark: false,
    },
    dark: {
      id: "dark",
      label: "Soft Dark",
      swatch: "#1F1F1F",
      borderSwatch: "#3D3D3D",
      applyColors: true,
      bg: "#1F1F1F",
      surface: "#272727",
      text: "#EAE4D7",
      muted: "#B5AEA0",
      link: "#7CCBC4",
      border: "#3B3B3B",
      highlight: "#4A4326",
      rulerTint: "rgba(230, 185, 86, 0.14)",
      rulerEdge: "rgba(230, 185, 86, 0.65)",
      isDark: true,
    },
  };

  const PRESETS = {
    classic: {
      id: "classic",
      label: "Classic",
      description: "OpenDyslexic font on warm cream with roomy spacing",
      values: {
        font: "opendyslexic",
        theme: "cream",
        fontSize: 108,
        letterSpacing: 0.06,
        wordSpacing: 0.18,
        lineHeight: 1.75,
        removeItalics: true,
        leftAlign: true,
        chunkParagraphs: true,
        bionicReading: false,
        readingRuler: false,
        rulerHeight: 44,
        rulerDim: 0.22,
        screenTintOpacity: 0,
      },
    },
    gentle: {
      id: "gentle",
      label: "Calm",
      description: "Lexend typeface with soft paper tone and gentle rhythm",
      values: {
        font: "lexend",
        theme: "cream",
        fontSize: 105,
        letterSpacing: 0.04,
        wordSpacing: 0.12,
        lineHeight: 1.7,
        removeItalics: true,
        leftAlign: true,
        chunkParagraphs: false,
        bionicReading: false,
        readingRuler: false,
        rulerHeight: 44,
        rulerDim: 0.18,
        screenTintOpacity: 0,
      },
    },
    focus: {
      id: "focus",
      label: "Focus",
      description: "Atkinson font, bold word anchors, and reading ruler",
      values: {
        font: "atkinson",
        theme: "peach",
        fontSize: 112,
        letterSpacing: 0.05,
        wordSpacing: 0.16,
        lineHeight: 1.8,
        removeItalics: true,
        leftAlign: true,
        chunkParagraphs: true,
        bionicReading: true,
        readingRuler: true,
        rulerHeight: 46,
        rulerDim: 0.28,
        screenTintOpacity: 0,
      },
    },
  };

  const DEFAULT_SETTINGS = {
    enabled: true,
    autoApply: true,
    activePreset: "classic",
    font: "opendyslexic",
    theme: "cream",
    fontSize: 108, // percentage: 100 - 145
    letterSpacing: 0.06, // em: 0 - 0.20
    wordSpacing: 0.18, // em: 0 - 0.45
    lineHeight: 1.75, // unitless: 1.4 - 2.3
    removeItalics: true,
    leftAlign: true,
    chunkParagraphs: true,
    bionicReading: false,
    readingRuler: false,
    rulerHeight: 44, // px: 28 - 96
    rulerDim: 0.22, // 0 - 0.55
    screenTintOpacity: 0, // 0 - 0.25 subtle overlay veil
    ttsRate: 0.95, // 0.7 - 1.4
    siteOverrides: {}, // { "example.com": true | false }
  };

  function getApi() {
    if (typeof browser !== "undefined" && browser && browser.storage) {
      return browser;
    }
    if (typeof chrome !== "undefined" && chrome && chrome.storage) {
      return chrome;
    }
    return null;
  }

  function mergeSettings(raw) {
    const base = Object.assign({}, DEFAULT_SETTINGS, raw || {});
    base.siteOverrides = Object.assign({}, (raw && raw.siteOverrides) || {});
    if (!FONTS[base.font]) base.font = DEFAULT_SETTINGS.font;
    if (!THEMES[base.theme]) base.theme = DEFAULT_SETTINGS.theme;
    base.fontSize = clamp(Number(base.fontSize) || DEFAULT_SETTINGS.fontSize, 100, 150);
    base.letterSpacing = clamp(Number(base.letterSpacing) || 0, 0, 0.22);
    base.wordSpacing = clamp(Number(base.wordSpacing) || 0, 0, 0.5);
    base.lineHeight = clamp(Number(base.lineHeight) || DEFAULT_SETTINGS.lineHeight, 1.3, 2.4);
    base.rulerHeight = clamp(Number(base.rulerHeight) || DEFAULT_SETTINGS.rulerHeight, 28, 96);
    base.rulerDim = clamp(Number(base.rulerDim) || 0, 0, 0.55);
    base.screenTintOpacity = clamp(Number(base.screenTintOpacity) || 0, 0, 0.25);
    base.ttsRate = clamp(Number(base.ttsRate) || DEFAULT_SETTINGS.ttsRate, 0.7, 1.5);
    return base;
  }

  function clamp(num, min, max) {
    if (Number.isNaN(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function normalizeHost(hostname) {
    if (!hostname || typeof hostname !== "string") return "";
    return hostname.toLowerCase().replace(/^www\./, "").trim();
  }

  function isSiteActive(settings, hostname) {
    const s = mergeSettings(settings);
    const host = normalizeHost(hostname);
    if (host && Object.prototype.hasOwnProperty.call(s.siteOverrides, host)) {
      return Boolean(s.siteOverrides[host]);
    }
    return Boolean(s.enabled && s.autoApply);
  }

  function setSiteOverride(settings, hostname, active) {
    const s = mergeSettings(settings);
    const host = normalizeHost(hostname);
    if (!host) {
      s.enabled = Boolean(active);
      return s;
    }
    s.siteOverrides = Object.assign({}, s.siteOverrides, { [host]: Boolean(active) });
    return s;
  }

  function clearSiteOverride(settings, hostname) {
    const s = mergeSettings(settings);
    const host = normalizeHost(hostname);
    if (host && Object.prototype.hasOwnProperty.call(s.siteOverrides, host)) {
      const nextOverrides = Object.assign({}, s.siteOverrides);
      delete nextOverrides[host];
      s.siteOverrides = nextOverrides;
    }
    return s;
  }

  function applyPreset(settings, presetId) {
    const preset = PRESETS[presetId];
    if (!preset) return mergeSettings(settings);
    return mergeSettings(
      Object.assign({}, settings, preset.values, { activePreset: presetId })
    );
  }

  function getFixationLength(word) {
    if (!word) return 0;
    const len = word.length;
    if (len <= 1) return 1;
    if (len <= 3) return 1;
    if (len === 4) return 2;
    if (len <= 6) return 3;
    if (len <= 9) return 4;
    return Math.ceil(len * 0.42);
  }

  const ABBREV_REGEX =
    /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|Fig|No|Vol|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|U\.S|U\.K)\./gi;

  function splitSentences(text) {
    if (!text || typeof text !== "string") return [];
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (!trimmed) return [];

    // Protect common abbreviations and decimal numbers with placeholders
    const placeholders = [];
    const safe = trimmed
      .replace(ABBREV_REGEX, (match) => {
        const key = `__ER_ABBR_${placeholders.length}__`;
        placeholders.push(match);
        return key;
      })
      .replace(/(\d)\.(\d)/g, "$1__ER_DEC__$2");

    const rawParts = safe.match(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)/g) || [safe];
    return rawParts
      .map((part) => {
        let restored = part.replace(/__ER_DEC__/g, ".");
        restored = restored.replace(/__ER_ABBR_(\d+)__/g, (_, i) => placeholders[Number(i)] || "");
        return restored.trim();
      })
      .filter(Boolean);
  }

  function chunkSentences(text, sentencesPerChunk) {
    const maxS = sentencesPerChunk || 2;
    const sentences = splitSentences(text);
    if (sentences.length <= maxS + 1) {
      return [text.trim()];
    }
    const chunks = [];
    for (let i = 0; i < sentences.length; i += maxS) {
      chunks.push(sentences.slice(i, i + maxS).join(" "));
    }
    return chunks;
  }

  async function loadSettings() {
    const api = getApi();
    if (!api) return mergeSettings(DEFAULT_SETTINGS);
    try {
      const result = await new Promise((resolve, reject) => {
        const maybePromise = api.storage.local.get(STORAGE_KEY, (items) => {
          const err = api.runtime && api.runtime.lastError;
          if (err) reject(err);
          else resolve(items || {});
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve, reject);
        }
      });
      return mergeSettings(result[STORAGE_KEY]);
    } catch (_) {
      return mergeSettings(DEFAULT_SETTINGS);
    }
  }

  async function saveSettings(nextSettings) {
    const merged = mergeSettings(nextSettings);
    const api = getApi();
    if (!api) return merged;
    try {
      await new Promise((resolve, reject) => {
        const payload = { [STORAGE_KEY]: merged };
        const maybePromise = api.storage.local.set(payload, () => {
          const err = api.runtime && api.runtime.lastError;
          if (err) reject(err);
          else resolve();
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve, reject);
        }
      });
    } catch (_) {
      // Ignore storage quota errors cleanly
    }
    return merged;
  }

  const exported = {
    STORAGE_KEY,
    FONTS,
    THEMES,
    PRESETS,
    DEFAULT_SETTINGS,
    getApi,
    mergeSettings,
    clamp,
    normalizeHost,
    isSiteActive,
    setSiteOverride,
    clearSiteOverride,
    applyPreset,
    getFixationLength,
    splitSentences,
    chunkSentences,
    loadSettings,
    saveSettings,
  };

  root.EaseReadConfig = exported;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
