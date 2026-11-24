(function () {
  "use strict";

  const Config = globalThis.EaseReadConfig;
  const api = Config.getApi();

  let state = Config.mergeSettings(Config.DEFAULT_SETTINGS);
  let activeTabId = null;
  let activeHost = "";
  let readerOpen = false;

  // DOM refs
  const appEl = document.querySelector(".app");
  const siteLabel = document.getElementById("site-label");
  const toggleActive = document.getElementById("toggle-active");
  const btnReader = document.getElementById("btn-reader");
  const btnReaderLabel = document.getElementById("btn-reader-label");
  const presetGrid = document.getElementById("preset-grid");
  const presetHint = document.getElementById("preset-hint");
  const fontGrid = document.getElementById("font-grid");
  const swatchRow = document.getElementById("swatch-row");
  const themeName = document.getElementById("theme-name");

  const optRuler = document.getElementById("opt-ruler");
  const optBionic = document.getElementById("opt-bionic");
  const optChunk = document.getElementById("opt-chunk");
  const optCleanText = document.getElementById("opt-clean-text");
  const optAuto = document.getElementById("opt-auto");

  const rangeFontSize = document.getElementById("range-font-size");
  const rangeLetter = document.getElementById("range-letter");
  const rangeWord = document.getElementById("range-word");
  const rangeLine = document.getElementById("range-line");
  const rangeRulerHeight = document.getElementById("range-ruler-height");
  const rangeTint = document.getElementById("range-tint");

  const valFontSize = document.getElementById("val-font-size");
  const valLetter = document.getElementById("val-letter");
  const valWord = document.getElementById("val-word");
  const valLine = document.getElementById("val-line");
  const valRulerHeight = document.getElementById("val-ruler-height");
  const valTint = document.getElementById("val-tint");

  const btnReset = document.getElementById("btn-reset");

  function buildSwatches() {
    swatchRow.textContent = "";
    for (const theme of Object.values(Config.THEMES)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch-btn";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-label", theme.label);
      btn.title = theme.label;
      btn.dataset.theme = theme.id;
      btn.style.setProperty("--swatch-bg", theme.swatch);
      btn.style.setProperty("--swatch-border", theme.borderSwatch);
      const stroke = theme.isDark ? "#FAF6EB" : "#1E5C58";
      btn.innerHTML =
        `<svg class="swatch-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
        `<path d="M5 12.5L9.5 17L19 7.5" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
        `</svg>`;
      swatchRow.appendChild(btn);
    }
  }

  function render() {
    const isSiteOn = activeHost
      ? Config.isSiteActive(state, activeHost)
      : Boolean(state.enabled);

    toggleActive.checked = isSiteOn;
    appEl.classList.toggle("is-paused", !isSiteOn);

    if (activeHost) {
      siteLabel.textContent = isSiteOn
        ? `Active on ${activeHost}`
        : `Paused on ${activeHost}`;
    } else {
      siteLabel.textContent = isSiteOn
        ? "Ready for webpages"
        : "Paused globally";
    }

    btnReaderLabel.textContent = readerOpen
      ? "Close Clean Reader View"
      : "Open Clean Reader View";

    // Presets
    const presetButtons = presetGrid.querySelectorAll("[data-preset]");
    for (const btn of presetButtons) {
      const isMatch = state.activePreset === btn.dataset.preset;
      btn.setAttribute("aria-pressed", String(isMatch));
    }
    const activePresetObj = Config.PRESETS[state.activePreset];
    presetHint.textContent = activePresetObj
      ? activePresetObj.label + " comfort"
      : "Custom settings";

    // Fonts
    const fontButtons = fontGrid.querySelectorAll("[data-font]");
    for (const btn of fontButtons) {
      btn.setAttribute("aria-pressed", String(state.font === btn.dataset.font));
    }

    // Themes
    const theme = Config.THEMES[state.theme] || Config.THEMES.cream;
    themeName.textContent = theme.label;
    const swatchButtons = swatchRow.querySelectorAll("[data-theme]");
    for (const btn of swatchButtons) {
      btn.setAttribute("aria-checked", String(state.theme === btn.dataset.theme));
    }

    // Toggles
    optRuler.checked = Boolean(state.readingRuler);
    optBionic.checked = Boolean(state.bionicReading);
    optChunk.checked = Boolean(state.chunkParagraphs);
    optCleanText.checked = Boolean(state.leftAlign && state.removeItalics);
    optAuto.checked = Boolean(state.autoApply);

    // Sliders
    rangeFontSize.value = String(state.fontSize);
    valFontSize.textContent = Math.round(state.fontSize) + "%";

    rangeLetter.value = String(state.letterSpacing);
    valLetter.textContent = Number(state.letterSpacing).toFixed(2) + "em";

    rangeWord.value = String(state.wordSpacing);
    valWord.textContent = Number(state.wordSpacing).toFixed(2) + "em";

    rangeLine.value = String(state.lineHeight);
    valLine.textContent = Number(state.lineHeight).toFixed(2);

    rangeRulerHeight.value = String(state.rulerHeight);
    valRulerHeight.textContent = Math.round(state.rulerHeight) + "px";

    rangeTint.value = String(state.screenTintOpacity);
    valTint.textContent = Math.round(state.screenTintOpacity * 100) + "%";
  }

  async function sendToActiveTab(message) {
    if (!api || !api.tabs || activeTabId == null) return null;
    try {
      return await api.tabs.sendMessage(activeTabId, message);
    } catch (_) {
      return null;
    }
  }

  async function commitSettings(nextState) {
    state = await Config.saveSettings(nextState);
    render();
    await sendToActiveTab({ type: "EASEREAD_APPLY_SETTINGS", settings: state });
  }

  async function updateField(patch) {
    const next = Object.assign({}, state, patch, { activePreset: "" });
    await commitSettings(next);
  }

  function bindEvents() {
    toggleActive.addEventListener("change", async () => {
      const checked = toggleActive.checked;
      let next;
      if (activeHost) {
        next = Config.setSiteOverride(state, activeHost, checked);
      } else {
        next = Object.assign({}, state, { enabled: checked });
      }
      await commitSettings(next);
    });

    btnReader.addEventListener("click", async () => {
      const res = await sendToActiveTab({ type: "EASEREAD_TOGGLE_READER" });
      if (res && typeof res.readerOpen === "boolean") {
        readerOpen = res.readerOpen;
        render();
        if (readerOpen) {
          window.close();
        }
      }
    });

    presetGrid.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-preset]");
      if (!btn) return;
      let next = Config.applyPreset(state, btn.dataset.preset);
      if (activeHost) {
        next = Config.setSiteOverride(next, activeHost, true);
      }
      await commitSettings(next);
    });

    fontGrid.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-font]");
      if (!btn) return;
      await updateField({ font: btn.dataset.font });
    });

    swatchRow.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-theme]");
      if (!btn) return;
      await updateField({ theme: btn.dataset.theme });
    });

    optRuler.addEventListener("change", () =>
      updateField({ readingRuler: optRuler.checked })
    );
    optBionic.addEventListener("change", () =>
      updateField({ bionicReading: optBionic.checked })
    );
    optChunk.addEventListener("change", () =>
      updateField({ chunkParagraphs: optChunk.checked })
    );
    optCleanText.addEventListener("change", () =>
      updateField({
        leftAlign: optCleanText.checked,
        removeItalics: optCleanText.checked,
      })
    );
    optAuto.addEventListener("change", async () => {
      let next = Object.assign({}, state, {
        autoApply: optAuto.checked,
        enabled: true,
      });
      if (activeHost) {
        next = Config.clearSiteOverride(next, activeHost);
      }
      await commitSettings(next);
    });

    rangeFontSize.addEventListener("input", () =>
      updateField({ fontSize: Number(rangeFontSize.value) })
    );
    rangeLetter.addEventListener("input", () =>
      updateField({ letterSpacing: Number(rangeLetter.value) })
    );
    rangeWord.addEventListener("input", () =>
      updateField({ wordSpacing: Number(rangeWord.value) })
    );
    rangeLine.addEventListener("input", () =>
      updateField({ lineHeight: Number(rangeLine.value) })
    );
    rangeRulerHeight.addEventListener("input", () =>
      updateField({ rulerHeight: Number(rangeRulerHeight.value) })
    );
    rangeTint.addEventListener("input", () =>
      updateField({ screenTintOpacity: Number(rangeTint.value) })
    );

    btnReset.addEventListener("click", async () => {
      let next = Config.applyPreset(Config.DEFAULT_SETTINGS, "classic");
      next.siteOverrides = {};
      await commitSettings(next);
    });
  }

  async function init() {
    buildSwatches();
    state = await Config.loadSettings();

    if (api && api.tabs) {
      try {
        const tabs = await api.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (tab) {
          activeTabId = tab.id;
          try {
            const u = new URL(tab.url || "");
            if (u.protocol === "http:" || u.protocol === "https:") {
              activeHost = Config.normalizeHost(u.hostname);
            }
          } catch (_) {}

          const pageState = await sendToActiveTab({ type: "EASEREAD_GET_STATE" });
          if (pageState) {
            if (pageState.hostname) activeHost = pageState.hostname;
            readerOpen = Boolean(pageState.readerOpen);
          }
        }
      } catch (_) {}
    }

    render();
    bindEvents();
  }

  init();
})();
