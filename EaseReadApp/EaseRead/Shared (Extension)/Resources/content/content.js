(function () {
  "use strict";

  if (window.__easereadInjected) return;
  window.__easereadInjected = true;

  const Config = globalThis.EaseReadConfig;
  if (!Config) return;

  const api = Config.getApi();
  const FONT_STYLE_ID = "easeread-fonts-style";
  const DYNAMIC_STYLE_ID = "easeread-dynamic-style";
  const TINT_ID = "easeread-tint-overlay";
  const RULER_ID = "easeread-ruler-root";
  const TOAST_ID = "easeread-toast";
  const READER_ID = "easeread-reader-root";

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "CODE",
    "PRE",
    "KBD",
    "SAMP",
    "SVG",
    "MATH",
    "CANVAS",
    "IFRAME",
    "VIDEO",
    "AUDIO",
    "BUTTON",
  ]);

  const READABLE_ANCESTOR_SELECTOR =
    "p, li, dd, dt, blockquote, figcaption, article, main, td, th, h1, h2, h3, h4, h5, h6";

  let currentSettings = Config.mergeSettings(Config.DEFAULT_SETTINGS);
  let isApplied = false;
  let observer = null;
  let observerTimer = null;
  let toastTimer = null;
  let rulerY = Math.round(window.innerHeight * 0.36);
  let rulerBound = false;
  let readerOpen = false;
  let originalBodyOverflow = "";

  // WeakMap storing original HTML for chunked paragraphs so restoration is lossless
  const chunkedOriginals = new WeakMap();
  const chunkedElements = new Set();

  // Read Aloud (Text-to-Speech) state for Clean Reader View
  const ttsState = {
    playing: false,
    paused: false,
    sentences: [],
    currentIndex: 0,
    utterance: null,
  };

  function getFontUrl(filename) {
    if (window.__EASEREAD_FONT_BASE__) {
      return window.__EASEREAD_FONT_BASE__.replace(/\/$/, "") + "/" + filename;
    }
    if (api && api.runtime && typeof api.runtime.getURL === "function") {
      return api.runtime.getURL("fonts/" + filename);
    }
    return "fonts/" + filename;
  }

  function ensureFontsInjected() {
    if (document.getElementById(FONT_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = FONT_STYLE_ID;
    style.textContent = `
      @font-face {
        font-family: "EaseRead OpenDyslexic";
        src: url("${getFontUrl("opendyslexic-400.woff2")}") format("woff2");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "EaseRead OpenDyslexic";
        src: url("${getFontUrl("opendyslexic-700.woff2")}") format("woff2");
        font-weight: 600 700;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "EaseRead Lexend";
        src: url("${getFontUrl("lexend-400.woff2")}") format("woff2");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "EaseRead Lexend";
        src: url("${getFontUrl("lexend-600.woff2")}") format("woff2");
        font-weight: 500 600;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "EaseRead Lexend";
        src: url("${getFontUrl("lexend-700.woff2")}") format("woff2");
        font-weight: 700;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "EaseRead Atkinson";
        src: url("${getFontUrl("atkinson-400.woff2")}") format("woff2");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "EaseRead Atkinson";
        src: url("${getFontUrl("atkinson-700.woff2")}") format("woff2");
        font-weight: 600 700;
        font-style: normal;
        font-display: swap;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function buildDynamicCss(settings) {
    const fontMeta = Config.FONTS[settings.font] || Config.FONTS.opendyslexic;
    const theme = Config.THEMES[settings.theme] || Config.THEMES.cream;
    const scale = settings.fontSize / 100;
    const letterEm = settings.letterSpacing.toFixed(3) + "em";
    const wordEm = settings.wordSpacing.toFixed(3) + "em";
    const lineH = settings.lineHeight.toFixed(2);

    const rules = [];

    // Typography family & spacing (carefully excluding icon fonts, SVGs, and code blocks)
    rules.push(`
      html[data-easeread="on"] body,
      html[data-easeread="on"] p,
      html[data-easeread="on"] li,
      html[data-easeread="on"] dd,
      html[data-easeread="on"] dt,
      html[data-easeread="on"] td,
      html[data-easeread="on"] th,
      html[data-easeread="on"] blockquote,
      html[data-easeread="on"] figcaption,
      html[data-easeread="on"] article,
      html[data-easeread="on"] section,
      html[data-easeread="on"] main,
      html[data-easeread="on"] h1,
      html[data-easeread="on"] h2,
      html[data-easeread="on"] h3,
      html[data-easeread="on"] h4,
      html[data-easeread="on"] h5,
      html[data-easeread="on"] h6,
      html[data-easeread="on"] a,
      html[data-easeread="on"] label,
      html[data-easeread="on"] input,
      html[data-easeread="on"] textarea,
      html[data-easeread="on"] span:not([class*="icon"]):not([class*="fa"]):not([class*="material"]):not([class*="glyph"]):not([class*="bi-"]):not([aria-hidden="true"]):not(:empty) {
        font-family: ${fontMeta.stack} !important;
        letter-spacing: ${letterEm} !important;
        word-spacing: ${wordEm} !important;
      }

      html[data-easeread="on"] p,
      html[data-easeread="on"] li,
      html[data-easeread="on"] dd,
      html[data-easeread="on"] blockquote,
      html[data-easeread="on"] figcaption,
      html[data-easeread="on"] td,
      html[data-easeread="on"] th {
        line-height: ${lineH} !important;
      }

      html[data-easeread="on"] p {
        margin-bottom: 1.15em !important;
      }

      html[data-easeread="on"] code,
      html[data-easeread="on"] pre,
      html[data-easeread="on"] kbd,
      html[data-easeread="on"] samp {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        letter-spacing: 0.02em !important;
        word-spacing: normal !important;
      }
    `);

    if (Math.abs(scale - 1) > 0.005) {
      const pct = Math.round(scale * 100) + "%";
      rules.push(`
        html[data-easeread="on"] p,
        html[data-easeread="on"] dd,
        html[data-easeread="on"] figcaption,
        html[data-easeread="on"] blockquote:not(:has(p)),
        html[data-easeread="on"] li:not(:has(p)):not(:has(ul)):not(:has(ol)) {
          font-size: ${pct} !important;
        }
      `);
    }

    if (settings.removeItalics) {
      rules.push(`
        html[data-easeread="on"] em,
        html[data-easeread="on"] i:not([class*="icon"]):not([class*="fa"]):not([aria-hidden="true"]):not(:empty),
        html[data-easeread="on"] cite,
        html[data-easeread="on"] blockquote,
        html[data-easeread="on"] p,
        html[data-easeread="on"] li {
          font-style: normal !important;
        }
        html[data-easeread="on"] em,
        html[data-easeread="on"] i:not([class*="icon"]):not([class*="fa"]):not([aria-hidden="true"]):not(:empty) {
          font-weight: 600 !important;
        }
      `);
    }

    if (settings.leftAlign) {
      rules.push(`
        html[data-easeread="on"] p,
        html[data-easeread="on"] li,
        html[data-easeread="on"] dd,
        html[data-easeread="on"] blockquote,
        html[data-easeread="on"] article,
        html[data-easeread="on"] main {
          text-align: left !important;
          hyphens: none !important;
          -webkit-hyphens: none !important;
        }
      `);
    }

    if (theme.applyColors) {
      rules.push(`
        html[data-easeread="on"],
        html[data-easeread="on"] body {
          background-color: ${theme.bg} !important;
          background-image: none !important;
          color: ${theme.text} !important;
        }

        html[data-easeread="on"] main,
        html[data-easeread="on"] article,
        html[data-easeread="on"] section,
        html[data-easeread="on"] aside,
        html[data-easeread="on"] header,
        html[data-easeread="on"] footer,
        html[data-easeread="on"] nav,
        html[data-easeread="on"] div:not(#easeread-ruler-root):not(#easeread-ruler-root *):not(#easeread-tint-overlay):not(#easeread-toast):not(#easeread-reader-root):not(#easeread-reader-root *),
        html[data-easeread="on"] p,
        html[data-easeread="on"] li,
        html[data-easeread="on"] ul,
        html[data-easeread="on"] ol,
        html[data-easeread="on"] dl,
        html[data-easeread="on"] dt,
        html[data-easeread="on"] dd,
        html[data-easeread="on"] table,
        html[data-easeread="on"] tr,
        html[data-easeread="on"] td,
        html[data-easeread="on"] th,
        html[data-easeread="on"] blockquote {
          background-color: transparent !important;
          color: ${theme.text} !important;
          border-color: ${theme.border} !important;
        }

        html[data-easeread="on"] blockquote,
        html[data-easeread="on"] pre,
        html[data-easeread="on"] code {
          background-color: ${theme.surface} !important;
        }

        html[data-easeread="on"] h1,
        html[data-easeread="on"] h2,
        html[data-easeread="on"] h3,
        html[data-easeread="on"] h4,
        html[data-easeread="on"] h5,
        html[data-easeread="on"] h6 {
          color: ${theme.text} !important;
        }

        html[data-easeread="on"] a,
        html[data-easeread="on"] a * {
          color: ${theme.link} !important;
          text-decoration-thickness: 1.5px !important;
          text-underline-offset: 0.2em !important;
        }

        html[data-easeread="on"] ::selection {
          background-color: ${theme.highlight} !important;
          color: ${theme.text} !important;
        }
      `);
    }

    return rules.join("\n");
  }

  function updateDynamicStyle(settings) {
    let style = document.getElementById(DYNAMIC_STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = DYNAMIC_STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = buildDynamicCss(settings);
  }

  function removeDynamicStyle() {
    const style = document.getElementById(DYNAMIC_STYLE_ID);
    if (style) style.remove();
  }

  // ---------- Subtle Screen Tint Overlay ----------

  function updateTintOverlay(settings, active) {
    let el = document.getElementById(TINT_ID);
    const theme = Config.THEMES[settings.theme] || Config.THEMES.cream;
    if (!active || settings.screenTintOpacity <= 0) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.id = TINT_ID;
      el.setAttribute("aria-hidden", "true");
      document.documentElement.appendChild(el);
    }
    const tintColor = theme.id === "original" ? "#FAF6EB" : theme.swatch;
    el.style.backgroundColor = tintColor;
    el.style.opacity = String(settings.screenTintOpacity);
  }

  // ---------- Reading Ruler ----------

  function positionRuler(y) {
    const root = document.getElementById(RULER_ID);
    if (!root) return;
    const height = currentSettings.rulerHeight || 44;
    const clampedY = Config.clamp(y, 0, window.innerHeight);
    rulerY = clampedY;
    const topEdge = Math.round(clampedY - height / 2);
    const topShade = root.querySelector(".easeread-ruler-top");
    const band = root.querySelector(".easeread-ruler-band");
    const bottomShade = root.querySelector(".easeread-ruler-bottom");
    if (topShade) {
      topShade.style.transform = `translate3d(0, ${topEdge - window.innerHeight}px, 0)`;
    }
    if (band) {
      band.style.transform = `translate3d(0, ${topEdge}px, 0)`;
    }
    if (bottomShade) {
      bottomShade.style.transform = `translate3d(0, ${topEdge + height}px, 0)`;
    }
  }

  function onPointerMove(e) {
    positionRuler(e.clientY);
  }

  function onTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      positionRuler(e.touches[0].clientY);
    }
  }

  function onResize() {
    positionRuler(rulerY);
  }

  function updateReadingRuler(settings, active) {
    const show = Boolean(active && settings.readingRuler);
    let root = document.getElementById(RULER_ID);
    const theme = Config.THEMES[settings.theme] || Config.THEMES.cream;

    if (!show) {
      if (root) {
        root.classList.remove("easeread-visible");
        root.remove();
      }
      if (rulerBound) {
        window.removeEventListener("mousemove", onPointerMove, { passive: true });
        window.removeEventListener("touchmove", onTouchMove, { passive: true });
        window.removeEventListener("resize", onResize);
        rulerBound = false;
      }
      return;
    }

    if (!root) {
      root = document.createElement("div");
      root.id = RULER_ID;
      root.setAttribute("aria-hidden", "true");
      root.innerHTML =
        '<div class="easeread-ruler-shade easeread-ruler-top"></div>' +
        '<div class="easeread-ruler-band"></div>' +
        '<div class="easeread-ruler-shade easeread-ruler-bottom"></div>';
      document.documentElement.appendChild(root);
    }

    root.style.setProperty("--er-ruler-height", settings.rulerHeight + "px");
    root.style.setProperty("--er-ruler-dim", String(settings.rulerDim));
    root.style.setProperty("--er-ruler-tint", theme.rulerTint);
    root.style.setProperty("--er-ruler-edge", theme.rulerEdge);

    positionRuler(rulerY);
    requestAnimationFrame(() => root.classList.add("easeread-visible"));

    if (!rulerBound) {
      window.addEventListener("mousemove", onPointerMove, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("resize", onResize);
      rulerBound = true;
    }
  }

  // ---------- Bionic / Focus Word Anchors (Reversible) ----------

  function shouldSkipElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.id === READER_ID || el.id === TOAST_ID || el.id === RULER_ID) return true;
    if (el.closest("#" + READER_ID + ", #" + TOAST_ID + ", #" + RULER_ID)) return true;
    if (el.hasAttribute("data-easeread-bionic")) return true;
    if (el.getAttribute("aria-hidden") === "true") return true;
    return false;
  }

  function createBionicFragment(text) {
    const frag = document.createDocumentFragment();
    const wordRe = /[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g;
    let lastIdx = 0;
    let match;
    let transformedCount = 0;

    while ((match = wordRe.exec(text)) !== null) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      }
      const word = match[0];
      const fixLen = Config.getFixationLength(word);
      const b = document.createElement("b");
      b.className = "easeread-anchor";
      b.textContent = word.slice(0, fixLen);
      frag.appendChild(b);
      if (fixLen < word.length) {
        frag.appendChild(document.createTextNode(word.slice(fixLen)));
      }
      lastIdx = match.index + word.length;
      transformedCount++;
    }

    if (transformedCount === 0) return null;
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    return frag;
  }

  function applyBionicToRoot(rootEl, includeAllText) {
    if (!rootEl) return;
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const val = node.nodeValue;
        if (!val || val.trim().length < 4) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (!includeAllText && shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
        if (parent.closest("[data-easeread-bionic]")) return NodeFilter.FILTER_REJECT;
        if (!includeAllText && !parent.closest(READABLE_ANCESTOR_SELECTOR)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    let current;
    while ((current = walker.nextNode())) {
      nodes.push(current);
    }

    for (const textNode of nodes) {
      const original = textNode.nodeValue;
      if (!original) continue;
      const frag = createBionicFragment(original);
      if (!frag) continue;
      const wrap = document.createElement("span");
      wrap.className = "easeread-bionic-wrap";
      wrap.setAttribute("data-easeread-bionic", "1");
      wrap.dataset.easereadOrig = original;
      wrap.appendChild(frag);
      if (textNode.parentNode) {
        textNode.parentNode.replaceChild(wrap, textNode);
      }
    }
  }

  function removeBionicFromRoot(rootEl) {
    if (!rootEl) return;
    const wraps = rootEl.querySelectorAll('span[data-easeread-bionic="1"]');
    for (const wrap of wraps) {
      const orig = wrap.dataset.easereadOrig != null ? wrap.dataset.easereadOrig : wrap.textContent;
      const textNode = document.createTextNode(orig || "");
      if (wrap.parentNode) {
        wrap.parentNode.replaceChild(textNode, wrap);
      }
    }
  }

  // ---------- Long Paragraph Chunking (Reversible) ----------

  function applyParagraphChunking() {
    if (!document.body) return;
    const paragraphs = document.body.querySelectorAll("p");
    for (const p of paragraphs) {
      if (chunkedOriginals.has(p)) continue;
      if (p.closest("#" + READER_ID)) continue;
      if (p.isContentEditable) continue;
      // Preserve paragraphs containing links, buttons, inputs, or rich inline widgets
      if (p.querySelector("a, button, input, select, textarea, img, svg, code, pre")) continue;

      const text = (p.textContent || "").trim();
      if (text.length < 280) continue;

      const chunks = Config.chunkSentences(text, 2);
      if (chunks.length <= 1) continue;

      chunkedOriginals.set(p, p.innerHTML);
      chunkedElements.add(p);
      p.textContent = "";
      for (const chunk of chunks) {
        const span = document.createElement("span");
        span.className = "easeread-chunk-block";
        span.textContent = chunk;
        p.appendChild(span);
      }
    }
  }

  function removeParagraphChunking() {
    for (const p of chunkedElements) {
      if (p && p.isConnected && chunkedOriginals.has(p)) {
        p.innerHTML = chunkedOriginals.get(p);
      }
      chunkedOriginals.delete(p);
    }
    chunkedElements.clear();
  }

  // ---------- Toast Feedback ----------

  function showToast(message) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = TOAST_ID;
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.documentElement.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add("easeread-toast-show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("easeread-toast-show");
    }, 2000);
  }

  // ---------- Clean Reader View & Read Aloud ----------

  function findMainArticleContainer() {
    const directSelectors = [
      "article",
      'main [role="article"]',
      "main",
      '[role="main"]',
      ".post-content",
      ".article-content",
      ".entry-content",
      "#mw-content-text",
    ];
    for (const sel of directSelectors) {
      const el = document.querySelector(sel);
      if (el && (el.innerText || "").trim().length > 320) {
        return el;
      }
    }

    // Score block containers by paragraph text density
    const candidates = document.querySelectorAll("section, div");
    let bestEl = document.body;
    let bestScore = 0;

    for (const el of candidates) {
      if (el.id === READER_ID) continue;
      const cls = (el.className || "").toString().toLowerCase();
      if (/nav|sidebar|footer|header|comment|cookie|modal|banner|menu/.test(cls)) continue;
      const ps = el.querySelectorAll(":scope > p, :scope > div > p");
      if (ps.length < 2) continue;
      let score = 0;
      for (const p of ps) {
        const len = (p.textContent || "").trim().length;
        if (len > 40) score += len;
      }
      if (score > bestScore) {
        bestScore = score;
        bestEl = el;
      }
    }
    return bestEl || document.body;
  }

  function extractReadableBlocks() {
    const container = findMainArticleContainer();
    const h1 =
      (container && container.querySelector("h1")) ||
      document.querySelector("h1");
    const title = ((h1 && h1.textContent) || document.title || "Clean Reader View").trim();

    const blocks = [];
    const seenTexts = new Set();
    const selector = "h2, h3, h4, p, ul, ol, blockquote, figure img";
    const nodes = container.querySelectorAll(selector);

    for (const node of nodes) {
      if (node.closest("nav, aside, footer, header, form, [aria-hidden='true']")) continue;
      if (node.closest("#" + READER_ID)) continue;

      const tag = node.tagName;
      if (tag === "IMG") {
        const src = node.currentSrc || node.getAttribute("src");
        const w = node.naturalWidth || node.width || 0;
        if (src && (w === 0 || w >= 220)) {
          blocks.push({ type: "img", src, alt: node.getAttribute("alt") || "" });
        }
        continue;
      }

      if (tag === "UL" || tag === "OL") {
        const items = Array.from(node.querySelectorAll(":scope > li"))
          .map((li) => (li.textContent || "").replace(/\s+/g, " ").trim())
          .filter((t) => t.length > 1);
        if (items.length > 0) {
          blocks.push({ type: tag.toLowerCase(), items });
        }
        continue;
      }

      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      if (tag === "P" && text.length < 20) continue;
      if (seenTexts.has(text)) continue;
      seenTexts.add(text);

      if (tag === "H2" || tag === "H3" || tag === "H4") {
        blocks.push({ type: tag.toLowerCase(), text });
      } else if (tag === "BLOCKQUOTE") {
        blocks.push({ type: "blockquote", text });
      } else if (tag === "P") {
        // Always split dense paragraphs into breathable 2-sentence chunks in Clean Reader View
        const chunks = Config.chunkSentences(text, 2);
        for (const chunk of chunks) {
          blocks.push({ type: "p", text: chunk });
        }
      }
    }

    // Fallback if page didn't use standard paragraph markup
    if (blocks.length === 0) {
      const raw = (document.body.innerText || "").split(/\n{2,}/);
      for (const piece of raw) {
        const cleaned = piece.replace(/\s+/g, " ").trim();
        if (cleaned.length >= 30) {
          for (const chunk of Config.chunkSentences(cleaned, 2)) {
            blocks.push({ type: "p", text: chunk });
          }
        }
      }
    }

    const totalWords = blocks.reduce((acc, b) => {
      if (b.text) return acc + b.text.split(/\s+/).length;
      if (b.items) return acc + b.items.join(" ").split(/\s+/).length;
      return acc;
    }, 0);

    return {
      title,
      host: Config.normalizeHost(window.location.hostname) || "Local Page",
      readingMinutes: Math.max(1, Math.ceil(totalWords / 180)),
      wordCount: totalWords,
      blocks,
    };
  }

  function stopTts() {
    ttsState.playing = false;
    ttsState.paused = false;
    ttsState.utterance = null;
    if (typeof window.speechSynthesis !== "undefined") {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    const activeEls = document.querySelectorAll(".easeread-tts-active");
    for (const el of activeEls) el.classList.remove("easeread-tts-active");
    updateTtsButtonState();
  }

  function updateTtsButtonState() {
    const playBtn = document.querySelector("#easeread-reader-root [data-action='tts-toggle']");
    if (!playBtn) return;
    if (ttsState.playing && !ttsState.paused) {
      playBtn.textContent = "Pause Audio";
      playBtn.setAttribute("aria-pressed", "true");
    } else if (ttsState.paused) {
      playBtn.textContent = "Resume Audio";
      playBtn.setAttribute("aria-pressed", "true");
    } else {
      playBtn.textContent = "Read Aloud";
      playBtn.setAttribute("aria-pressed", "false");
    }
  }

  function speakSentenceAt(index) {
    if (typeof window.speechSynthesis === "undefined") {
      showToast("Read aloud is unavailable in this browser");
      return;
    }
    if (index < 0 || index >= ttsState.sentences.length) {
      stopTts();
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    ttsState.currentIndex = index;
    ttsState.playing = true;
    ttsState.paused = false;

    const prev = document.querySelectorAll(".easeread-tts-active");
    for (const el of prev) el.classList.remove("easeread-tts-active");

    const item = ttsState.sentences[index];
    if (item && item.el) {
      item.el.classList.add("easeread-tts-active");
      item.el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const utter = new SpeechSynthesisUtterance(item.text);
    utter.rate = currentSettings.ttsRate || 0.95;
    utter.onend = () => {
      if (!ttsState.playing || ttsState.paused) return;
      if (ttsState.currentIndex + 1 < ttsState.sentences.length) {
        speakSentenceAt(ttsState.currentIndex + 1);
      } else {
        stopTts();
      }
    };
    utter.onerror = () => {
      stopTts();
    };
    ttsState.utterance = utter;
    updateTtsButtonState();
    window.speechSynthesis.speak(utter);
  }

  function toggleTts() {
    if (typeof window.speechSynthesis === "undefined") {
      showToast("Read aloud is unavailable here");
      return;
    }
    if (ttsState.playing && !ttsState.paused) {
      window.speechSynthesis.pause();
      ttsState.paused = true;
      updateTtsButtonState();
    } else if (ttsState.paused) {
      window.speechSynthesis.resume();
      ttsState.paused = false;
      updateTtsButtonState();
    } else {
      speakSentenceAt(ttsState.currentIndex || 0);
    }
  }

  function styleReaderOverlay(overlay, settings) {
    const fontMeta = Config.FONTS[settings.font] || Config.FONTS.opendyslexic;
    const theme = Config.THEMES[settings.theme] || Config.THEMES.cream;
    const readerTheme = theme.id === "original" ? Config.THEMES.cream : theme;
    const readerSizePx = Math.round(18 * (settings.fontSize / 100));

    overlay.style.setProperty("--er-bg", readerTheme.bg);
    overlay.style.setProperty("--er-surface", readerTheme.surface);
    overlay.style.setProperty("--er-text", readerTheme.text);
    overlay.style.setProperty("--er-muted", readerTheme.muted);
    overlay.style.setProperty("--er-link", readerTheme.link);
    overlay.style.setProperty("--er-border", readerTheme.border);
    overlay.style.setProperty("--er-highlight", readerTheme.highlight);
    overlay.style.setProperty("--er-font", fontMeta.stack);
    overlay.style.setProperty("--er-reader-size", readerSizePx + "px");
    overlay.style.setProperty("--er-line-height", String(settings.lineHeight));
    overlay.style.setProperty("--er-letter-spacing", settings.letterSpacing + "em");
    overlay.style.setProperty("--er-word-spacing", settings.wordSpacing + "em");

    const fontSel = overlay.querySelector("[data-control='font']");
    if (fontSel) fontSel.value = settings.font;
    const themeSel = overlay.querySelector("[data-control='theme']");
    if (themeSel) themeSel.value = settings.theme === "original" ? "cream" : settings.theme;
    const rateSel = overlay.querySelector("[data-control='rate']");
    if (rateSel) rateSel.value = String(settings.ttsRate);
    const bionicBtn = overlay.querySelector("[data-action='toggle-bionic']");
    if (bionicBtn) bionicBtn.setAttribute("aria-pressed", String(Boolean(settings.bionicReading)));
    const rulerBtn = overlay.querySelector("[data-action='toggle-ruler']");
    if (rulerBtn) rulerBtn.setAttribute("aria-pressed", String(Boolean(settings.readingRuler)));
  }

  function appendInteractiveSentences(parentEl, text, sentenceList) {
    const sentences = Config.splitSentences(text);
    sentences.forEach((sentence, i) => {
      const span = document.createElement("span");
      span.className = "easeread-tts-sentence";
      const idx = sentenceList.length;
      span.dataset.ttsIdx = String(idx);
      span.textContent = sentence;
      span.title = "Click to start reading aloud here";
      span.addEventListener("click", () => speakSentenceAt(idx));
      parentEl.appendChild(span);
      if (i < sentences.length - 1) {
        parentEl.appendChild(document.createTextNode(" "));
      }
      sentenceList.push({ text: sentence, el: span });
    });
  }

  function openReaderView() {
    if (readerOpen) return;
    ensureFontsInjected();
    const extracted = extractReadableBlocks();

    const overlay = document.createElement("div");
    overlay.id = READER_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "EaseRead Clean Reader View");

    // Floating compact toolbar
    const nav = document.createElement("div");
    nav.className = "easeread-reader-nav";

    const leftGroup = document.createElement("div");
    leftGroup.className = "easeread-reader-group";
    leftGroup.innerHTML =
      '<span class="easeread-reader-brand"><span class="easeread-reader-dot"></span>EaseRead</span>' +
      '<button type="button" class="easeread-reader-btn easeread-btn-primary" data-action="tts-toggle" aria-pressed="false">Read Aloud</button>' +
      '<button type="button" class="easeread-reader-btn" data-action="tts-stop">Stop</button>' +
      '<select class="easeread-reader-select" data-control="rate" aria-label="Reading speed">' +
      '<option value="0.75">0.75x</option>' +
      '<option value="0.9">0.9x</option>' +
      '<option value="0.95">0.95x</option>' +
      '<option value="1">1.0x</option>' +
      '<option value="1.15">1.15x</option>' +
      '<option value="1.3">1.3x</option>' +
      "</select>";

    const rightGroup = document.createElement("div");
    rightGroup.className = "easeread-reader-group";
    rightGroup.innerHTML =
      '<select class="easeread-reader-select" data-control="font" aria-label="Font family">' +
      '<option value="opendyslexic">OpenDyslexic</option>' +
      '<option value="lexend">Lexend</option>' +
      '<option value="atkinson">Atkinson</option>' +
      '<option value="sans">Clean Sans</option>' +
      "</select>" +
      '<select class="easeread-reader-select" data-control="theme" aria-label="Paper tint">' +
      '<option value="cream">Warm Cream</option>' +
      '<option value="peach">Soft Peach</option>' +
      '<option value="mint">Calm Mint</option>' +
      '<option value="sky">Soft Sky</option>' +
      '<option value="dark">Soft Dark</option>' +
      "</select>" +
      '<button type="button" class="easeread-reader-btn" data-action="size-down" aria-label="Smaller text">A−</button>' +
      '<button type="button" class="easeread-reader-btn" data-action="size-up" aria-label="Larger text">A+</button>' +
      '<button type="button" class="easeread-reader-btn" data-action="toggle-bionic" aria-pressed="false">Anchors</button>' +
      '<button type="button" class="easeread-reader-btn" data-action="toggle-ruler" aria-pressed="false">Ruler</button>' +
      '<button type="button" class="easeread-reader-btn" data-action="close">Close</button>';

    nav.appendChild(leftGroup);
    nav.appendChild(rightGroup);
    overlay.appendChild(nav);

    // Article sheet
    const article = document.createElement("article");
    article.className = "easeread-reader-article";

    const meta = document.createElement("div");
    meta.className = "easeread-reader-meta";
    meta.textContent = `${extracted.host} · ${extracted.readingMinutes} min read · Click any sentence to listen`;
    article.appendChild(meta);

    const h1 = document.createElement("h1");
    h1.className = "easeread-reader-title";
    h1.textContent = extracted.title;
    article.appendChild(h1);

    const body = document.createElement("div");
    body.className = "easeread-reader-body";

    const sentenceList = [];
    for (const block of extracted.blocks) {
      if (block.type === "img") {
        const img = document.createElement("img");
        img.src = block.src;
        img.alt = block.alt;
        body.appendChild(img);
      } else if (block.type === "ul" || block.type === "ol") {
        const list = document.createElement(block.type);
        for (const itemText of block.items) {
          const li = document.createElement("li");
          appendInteractiveSentences(li, itemText, sentenceList);
          list.appendChild(li);
        }
        body.appendChild(list);
      } else if (block.type === "h2" || block.type === "h3" || block.type === "h4") {
        const h = document.createElement(block.type);
        appendInteractiveSentences(h, block.text, sentenceList);
        body.appendChild(h);
      } else if (block.type === "blockquote") {
        const bq = document.createElement("blockquote");
        appendInteractiveSentences(bq, block.text, sentenceList);
        body.appendChild(bq);
      } else {
        const p = document.createElement("p");
        appendInteractiveSentences(p, block.text, sentenceList);
        body.appendChild(p);
      }
    }

    article.appendChild(body);
    overlay.appendChild(article);

    ttsState.sentences = sentenceList;
    ttsState.currentIndex = 0;

    // Bind toolbar controls
    nav.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "close") {
        closeReaderView();
      } else if (action === "tts-toggle") {
        toggleTts();
      } else if (action === "tts-stop") {
        stopTts();
        ttsState.currentIndex = 0;
      } else if (action === "size-up") {
        currentSettings = await Config.saveSettings(
          Object.assign({}, currentSettings, {
            fontSize: Config.clamp(currentSettings.fontSize + 6, 100, 150),
          })
        );
        applyAll();
      } else if (action === "size-down") {
        currentSettings = await Config.saveSettings(
          Object.assign({}, currentSettings, {
            fontSize: Config.clamp(currentSettings.fontSize - 6, 100, 150),
          })
        );
        applyAll();
      } else if (action === "toggle-bionic") {
        currentSettings = await Config.saveSettings(
          Object.assign({}, currentSettings, {
            bionicReading: !currentSettings.bionicReading,
          })
        );
        applyAll();
      } else if (action === "toggle-ruler") {
        currentSettings = await Config.saveSettings(
          Object.assign({}, currentSettings, {
            readingRuler: !currentSettings.readingRuler,
          })
        );
        applyAll();
      }
    });

    nav.addEventListener("change", async (e) => {
      const ctrl = e.target.closest("[data-control]");
      if (!ctrl) return;
      const key = ctrl.dataset.control;
      if (key === "font") {
        currentSettings = await Config.saveSettings(
          Object.assign({}, currentSettings, { font: ctrl.value })
        );
        applyAll();
      } else if (key === "theme") {
        currentSettings = await Config.saveSettings(
          Object.assign({}, currentSettings, { theme: ctrl.value })
        );
        applyAll();
      } else if (key === "rate") {
        currentSettings = await Config.saveSettings(
          Object.assign({}, currentSettings, { ttsRate: Number(ctrl.value) || 0.95 })
        );
        if (ttsState.playing && !ttsState.paused) {
          speakSentenceAt(ttsState.currentIndex);
        }
      }
    });

    originalBodyOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.appendChild(overlay);
    readerOpen = true;

    styleReaderOverlay(overlay, currentSettings);
    if (currentSettings.bionicReading) {
      applyBionicToRoot(body, true);
    }
    updateReadingRuler(currentSettings, true);
    requestAnimationFrame(() => overlay.classList.add("easeread-reader-open"));
  }

  function closeReaderView() {
    if (!readerOpen) return;
    stopTts();
    const overlay = document.getElementById(READER_ID);
    if (overlay) overlay.remove();
    document.documentElement.style.overflow = originalBodyOverflow;
    readerOpen = false;
    updateReadingRuler(currentSettings, isApplied);
  }

  function toggleReaderView() {
    if (readerOpen) closeReaderView();
    else openReaderView();
    return readerOpen;
  }

  // ---------- Dynamic SPA MutationObserver ----------

  function syncObserver() {
    const needObserver = isApplied && (currentSettings.bionicReading || currentSettings.chunkParagraphs);
    if (!needObserver) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }
    if (observer || !document.body) return;
    observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        if (!isApplied) return;
        if (currentSettings.chunkParagraphs) applyParagraphChunking();
        if (currentSettings.bionicReading) applyBionicToRoot(document.body, false);
      }, 320);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ---------- Master Apply Pipeline ----------

  function applyAll() {
    const host = window.location.hostname;
    const active = Config.isSiteActive(currentSettings, host);
    isApplied = active;

    if (active) {
      ensureFontsInjected();
      document.documentElement.setAttribute("data-easeread", "on");
      updateDynamicStyle(currentSettings);
      updateTintOverlay(currentSettings, true);

      if (currentSettings.chunkParagraphs) {
        applyParagraphChunking();
      } else {
        removeParagraphChunking();
      }

      if (currentSettings.bionicReading) {
        applyBionicToRoot(document.body, false);
      } else {
        removeBionicFromRoot(document.body);
      }
    } else {
      document.documentElement.removeAttribute("data-easeread");
      removeDynamicStyle();
      updateTintOverlay(currentSettings, false);
      removeBionicFromRoot(document.body);
      removeParagraphChunking();
    }

    // Keep Reading Ruler active when either page mode OR reader view is open
    updateReadingRuler(currentSettings, active || readerOpen);

    // Sync Clean Reader View if currently open
    const readerEl = document.getElementById(READER_ID);
    if (readerOpen && readerEl) {
      styleReaderOverlay(readerEl, currentSettings);
      const readerBody = readerEl.querySelector(".easeread-reader-body");
      if (readerBody) {
        if (currentSettings.bionicReading) {
          applyBionicToRoot(readerBody, true);
        } else {
          removeBionicFromRoot(readerBody);
        }
      }
    }

    syncObserver();
  }

  // ---------- Keyboard Shortcuts ----------

  document.addEventListener("keydown", async (e) => {
    if (e.key === "Escape" && readerOpen) {
      closeReaderView();
      return;
    }
    // Ignore shortcuts while typing in inputs/textareas
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) {
      return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === "d") {
        e.preventDefault();
        const host = window.location.hostname;
        const nextActive = !Config.isSiteActive(currentSettings, host);
        currentSettings = await Config.saveSettings(
          Config.setSiteOverride(currentSettings, host, nextActive)
        );
        applyAll();
        showToast(nextActive ? "EaseRead enabled on this site" : "EaseRead paused on this site");
      } else if (key === "r") {
        e.preventDefault();
        currentSettings = await Config.saveSettings(
          Object.assign({}, currentSettings, { readingRuler: !currentSettings.readingRuler })
        );
        applyAll();
        showToast(currentSettings.readingRuler ? "Reading ruler on" : "Reading ruler off");
      } else if (key === "v") {
        e.preventDefault();
        const open = toggleReaderView();
        showToast(open ? "Clean Reader View opened" : "Clean Reader View closed");
      } else if (e.key === "ArrowUp" && currentSettings.readingRuler) {
        e.preventDefault();
        positionRuler(rulerY - 24);
      } else if (e.key === "ArrowDown" && currentSettings.readingRuler) {
        e.preventDefault();
        positionRuler(rulerY + 24);
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    stopTts();
  });

  // ---------- Messaging & Storage Sync ----------

  if (api && api.storage && api.storage.onChanged) {
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (changes[Config.STORAGE_KEY] && changes[Config.STORAGE_KEY].newValue) {
        currentSettings = Config.mergeSettings(changes[Config.STORAGE_KEY].newValue);
        applyAll();
      }
    });
  }

  if (api && api.runtime && api.runtime.onMessage) {
    api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "EASEREAD_GET_STATE") {
        sendResponse({
          hostname: Config.normalizeHost(window.location.hostname),
          active: Config.isSiteActive(currentSettings, window.location.hostname),
          readerOpen,
          settings: currentSettings,
        });
        return;
      }

      if (msg.type === "EASEREAD_APPLY_SETTINGS" && msg.settings) {
        currentSettings = Config.mergeSettings(msg.settings);
        applyAll();
        sendResponse({
          ok: true,
          active: Config.isSiteActive(currentSettings, window.location.hostname),
          readerOpen,
        });
        return;
      }

      if (msg.type === "EASEREAD_TOGGLE_READER") {
        const open = toggleReaderView();
        sendResponse({ ok: true, readerOpen: open });
        return;
      }

      if (msg.type === "EASEREAD_TOGGLE_SITE") {
        const host = window.location.hostname;
        const nextActive = !Config.isSiteActive(currentSettings, host);
        Config.saveSettings(Config.setSiteOverride(currentSettings, host, nextActive)).then(
          (saved) => {
            currentSettings = saved;
            applyAll();
            showToast(nextActive ? "EaseRead enabled" : "EaseRead paused");
            sendResponse({ ok: true, active: nextActive });
          }
        );
        return true;
      }

      if (msg.type === "EASEREAD_TOGGLE_RULER") {
        Config.saveSettings(
          Object.assign({}, currentSettings, { readingRuler: !currentSettings.readingRuler })
        ).then((saved) => {
          currentSettings = saved;
          applyAll();
          showToast(saved.readingRuler ? "Reading ruler on" : "Reading ruler off");
          sendResponse({ ok: true, readingRuler: saved.readingRuler });
        });
        return true;
      }
    });
  }

  // Expose tiny local control API for standalone demo preview page
  window.EaseReadPage = {
    apply(nextSettings) {
      currentSettings = Config.mergeSettings(nextSettings);
      applyAll();
    },
    getSettings() {
      return currentSettings;
    },
    toggleReader: toggleReaderView,
    openReader: openReaderView,
    closeReader: closeReaderView,
    showToast,
  };

  // Initialize from storage
  Config.loadSettings().then((loaded) => {
    currentSettings = loaded;
    applyAll();
  });
})();
