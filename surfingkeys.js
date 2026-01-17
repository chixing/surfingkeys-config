/**
 * SurfingKeys Configuration
 * Built with TypeScript + esbuild
 * Generated: 2026-01-17T21:23:34.065Z
 */

"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src-ts/config.ts
  var CONFIG = {
    scrollStep: 120,
    hintAlign: "left",
    omnibarMaxResults: 20,
    historyMUOrder: false,
    delayMs: 1500,
    theme: {
      font: "'Monaco', 'Consolas', 'Courier New', monospace",
      fontSize: "16px",
      colors: {
        fg: "#cdd6f4",
        bg: "#1e1e2e",
        bgDark: "#181825",
        border: "#313244",
        mainFg: "#89b4fa",
        accentFg: "#a6e3a1",
        infoFg: "#cba6f7",
        select: "#45475a"
      }
    }
  };
  Object.assign(settings, {
    scrollStepSize: CONFIG.scrollStep,
    hintAlign: CONFIG.hintAlign,
    omnibarMaxResults: CONFIG.omnibarMaxResults,
    historyMUOrder: CONFIG.historyMUOrder
  });
  var AI_SERVICES = {
    CHATGPT: "ChatGPT",
    DOUBAO: "Doubao",
    ALICE: "Alice (Yandex)",
    CLAUDE: "Claude",
    GEMINI: "Gemini",
    PERPLEXITY: "Perplexity",
    PERPLEXITY_RESEARCH: "Perplexity Research",
    GROK: "Grok"
  };

  // src-ts/ai-selector.ts
  var AiSelector = class {
    constructor(config) {
      this.lastQuery = null;
      this.overlay = null;
      this.queryInput = null;
      this.promptInput = null;
      this.keyHandler = null;
      this.focusHandler = null;
      this.blurHandler = null;
      this.services = [
        { name: AI_SERVICES.CHATGPT, url: "https://chatgpt.com/?q=", checked: true },
        { name: AI_SERVICES.DOUBAO, url: "https://www.doubao.com/chat#sk_prompt=", checked: true },
        { name: AI_SERVICES.ALICE, url: "https://alice.yandex.ru/?q=", checked: true },
        { name: AI_SERVICES.CLAUDE, url: "https://claude.ai/new#sk_prompt=", checked: true },
        { name: AI_SERVICES.GEMINI, url: "https://gemini.google.com/app#sk_prompt=", checked: true },
        { name: AI_SERVICES.PERPLEXITY, url: "https://perplexity.ai?q=", checked: true },
        { name: AI_SERVICES.PERPLEXITY_RESEARCH, url: "https://perplexity.ai#sk_prompt=&sk_mode=research&sk_social=on", checked: true },
        { name: AI_SERVICES.GROK, url: "https://grok.com?q=", checked: true }
      ];
      this.config = config;
    }
    show(initialQuery = "", selectedServices = null) {
      this.overlay = this.createOverlay();
      const dialog = this.createDialog();
      const queryText = this.lastQuery !== null ? this.lastQuery : initialQuery;
      const title = this.createTitle();
      const { label: queryLabel, input: queryInput } = this.createQueryInput(queryText);
      const { label: promptLabel, input: promptInput, select: promptSelect } = this.createPromptInput();
      const { label: servicesLabel, container: servicesContainer } = this.createServicesCheckboxes(selectedServices);
      const selectAllButtons = this.createSelectAllButtons();
      const buttonsContainer = this.createButtons();
      this.queryInput = queryInput;
      this.promptInput = promptInput;
      [
        title,
        queryLabel,
        queryInput,
        promptLabel,
        promptSelect,
        promptInput,
        servicesLabel,
        selectAllButtons,
        servicesContainer,
        buttonsContainer
      ].forEach((el) => dialog.appendChild(el));
      this.overlay.appendChild(dialog);
      this.markAsSurfingKeys(this.overlay);
      document.body.appendChild(this.overlay);
      this.setupKeyboardHandler();
      this.setupFocusHandler();
      this.setupInitialFocus(queryInput);
      this.setupOverlayClickHandler();
    }
    close() {
      if (this.keyHandler) {
        document.removeEventListener("keydown", this.keyHandler, true);
        this.keyHandler = null;
      }
      if (this.focusHandler) {
        document.removeEventListener("focus", this.focusHandler, true);
        document.removeEventListener("focusin", this.focusHandler, true);
        this.focusHandler = null;
      }
      if (this.blurHandler && this.queryInput) {
        this.queryInput.removeEventListener("blur", this.blurHandler);
        this.blurHandler = null;
      }
      if (this.overlay?.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
      this.queryInput = null;
      this.promptInput = null;
    }
    updateQuery(text) {
      const input = document.getElementById("sk-ai-query-input");
      if (input && !this.lastQuery) {
        input.value = text;
        input.focus();
        input.select();
      }
    }
    // Private methods for DOM creation and event handling
    markAsSurfingKeys(element) {
      element.fromSurfingKeys = true;
      element.querySelectorAll("*").forEach((child) => {
        child.fromSurfingKeys = true;
      });
    }
    setupKeyboardHandler() {
      this.keyHandler = (e) => {
        if (!this.overlay?.parentNode)
          return;
        e.sk_suppressed = true;
        e.sk_stopPropagation = true;
        if (e.key === "Tab")
          return;
        if (e.target.tagName === "SELECT" && (e.key === "j" || e.key === "k")) {
          e.preventDefault();
          e.stopPropagation();
          const select = e.target;
          const delta = e.key === "j" ? 1 : -1;
          const newIndex = select.selectedIndex + delta;
          if (newIndex >= 0 && newIndex < select.options.length) {
            select.selectedIndex = newIndex;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
          return;
        }
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          this.lastQuery = this.queryInput?.value || null;
          this.close();
        } else if (e.key === "Enter") {
          const isTextArea = e.target.tagName === "TEXTAREA";
          if (!isTextArea || !e.shiftKey) {
            e.preventDefault();
            this.handleSubmit();
          }
        }
      };
      document.addEventListener("keydown", this.keyHandler, true);
    }
    setupFocusHandler() {
      this.focusHandler = (e) => {
        if (this.overlay?.contains(e.target)) {
          e.sk_suppressed = true;
          e.sk_stopPropagation = true;
        }
      };
      document.addEventListener("focus", this.focusHandler, true);
      document.addEventListener("focusin", this.focusHandler, true);
    }
    setupInitialFocus(input) {
      const simulateMouseEvents = () => {
        const rect = input.getBoundingClientRect();
        const eventOpts = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        };
        input.dispatchEvent(new MouseEvent("mousedown", eventOpts));
        input.dispatchEvent(new MouseEvent("click", eventOpts));
      };
      const startTime = Date.now();
      const FIGHT_DURATION_MS = 300;
      let focusWon = false;
      this.blurHandler = (e) => {
        if (focusWon || Date.now() - startTime > FIGHT_DURATION_MS)
          return;
        if (e.relatedTarget && this.overlay?.contains(e.relatedTarget)) {
          focusWon = true;
          return;
        }
        if (this.overlay?.parentNode) {
          requestAnimationFrame(() => {
            if (this.overlay?.parentNode && !focusWon) {
              simulateMouseEvents();
              input.focus();
              if (document.activeElement === input) {
                focusWon = true;
              }
            }
          });
        }
      };
      input.addEventListener("blur", this.blurHandler);
      simulateMouseEvents();
      input.focus();
      input.select();
    }
    setupOverlayClickHandler() {
      this.overlay?.addEventListener("click", (e) => {
        e.sk_suppressed = true;
        if (e.target === this.overlay) {
          this.lastQuery = this.queryInput?.value || null;
          this.close();
        }
      });
    }
    handleSubmit() {
      const query = this.queryInput?.value.trim() || "";
      if (!query) {
        this.queryInput?.focus();
        if (this.queryInput) {
          this.queryInput.style.borderColor = "#ff6b6b";
          setTimeout(() => {
            if (this.queryInput) {
              this.queryInput.style.borderColor = this.config.theme.colors.border;
            }
          }, 1e3);
        }
        return;
      }
      const selectedUrls = this.services.filter((_, i) => document.getElementById(`sk-ai-${i}`)?.checked).map((s) => s.url);
      if (selectedUrls.length === 0) {
        alert("Please select at least one AI service");
        return;
      }
      this.lastQuery = this.queryInput?.value || null;
      const promptTemplate = this.promptInput?.value.trim() || "";
      const combinedQuery = promptTemplate ? `${query}
${promptTemplate}` : query;
      selectedUrls.forEach((url) => api.tabOpenLink(url + encodeURIComponent(combinedQuery)));
      this.close();
    }
    // DOM creation methods (abbreviated for brevity - full implementation would follow)
    createOverlay() {
      const overlay = document.createElement("div");
      overlay.id = "sk-ai-selector-overlay";
      overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${this.config.theme.font};
    `;
      return overlay;
    }
    createDialog() {
      const dialog = document.createElement("div");
      dialog.style.cssText = `
      background: ${this.config.theme.colors.bg};
      border: 2px solid ${this.config.theme.colors.border};
      border-radius: 8px;
      padding: 24px;
      min-width: 480px;
      max-width: 600px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      color: ${this.config.theme.colors.fg};
    `;
      return dialog;
    }
    createTitle() {
      const title = document.createElement("h2");
      title.textContent = "Multi-AI Search";
      title.style.cssText = `
      margin: 0 0 16px 0;
      color: ${this.config.theme.colors.accentFg};
      font-size: 20px;
      font-weight: 600;
    `;
      return title;
    }
    createQueryInput(initialQuery) {
      const label = document.createElement("label");
      label.textContent = "Search Query:";
      label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;
      const input = document.createElement("textarea");
      input.id = "sk-ai-query-input";
      input.value = initialQuery;
      input.rows = 3;
      input.style.cssText = `
      width: 100%;
      padding: 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: ${this.config.theme.fontSize};
      margin-bottom: 20px;
      resize: vertical;
      box-sizing: border-box;
    `;
      return { label, input };
    }
    // Additional DOM creation methods would continue here...
    // For brevity, I'll create stub methods that you can fill in
    createPromptInput() {
      const label = document.createElement("label");
      const input = document.createElement("textarea");
      const select = document.createElement("select");
      return { label, input, select };
    }
    createServicesCheckboxes(_selectedServices) {
      const label = document.createElement("label");
      const container = document.createElement("div");
      return { label, container };
    }
    createSelectAllButtons() {
      return document.createElement("div");
    }
    createButtons() {
      return document.createElement("div");
    }
  };

  // src-ts/utils.ts
  var utils_exports = {};
  __export(utils_exports, {
    createSuggestionItem: () => createSuggestionItem,
    createURLItem: () => createURLItem,
    delay: () => delay,
    injectPrompt: () => injectPrompt,
    pressKey: () => pressKey
  });
  var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  var pressKey = (element, key = "Enter", keyCode = 13) => {
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key,
      code: key,
      keyCode,
      which: keyCode
    });
    element.dispatchEvent(event);
  };
  var createSuggestionItem = (html, props = {}) => {
    const li = document.createElement("li");
    li.innerHTML = html;
    return { html: li.outerHTML, props };
  };
  var createURLItem = (title, url, sanitize = true) => {
    let t = title;
    let u = url;
    if (sanitize) {
      t = String(t).replace(/[&<>"'`=/]/g, (s) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;"
      })[s] || s);
      u = new URL(u).toString();
    }
    return createSuggestionItem(
      `
<div class="title">${t}</div>
<div class="url">${u}</div>
`,
      { url: u }
    );
  };
  var injectPrompt = async ({
    selector,
    submitSelector,
    useValue = false,
    dispatchEvents = false
  }, config) => {
    const promptKey = "#sk_prompt=";
    if (!window.location.hash.startsWith(promptKey))
      return;
    const promptText = decodeURIComponent(window.location.hash.substring(promptKey.length));
    await delay(config.delayMs);
    const inputBox = document.querySelector(selector);
    if (!inputBox)
      return;
    inputBox.focus();
    if (useValue) {
      inputBox.value = promptText;
    } else {
      document.execCommand("insertText", false, promptText);
    }
    if (dispatchEvents) {
      inputBox.dispatchEvent(new Event("input", { bubbles: true }));
      inputBox.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await delay(config.delayMs);
    if (submitSelector) {
      const btn = typeof submitSelector === "function" ? submitSelector() : document.querySelector(submitSelector);
      if (btn) {
        btn.click();
      } else {
        pressKey(inputBox);
      }
    } else {
      pressKey(inputBox);
    }
    history.replaceState(null, "", " ");
  };

  // src-ts/index.ts
  window.__CONFIG__ = CONFIG;
  window.__utils__ = utils_exports;
  var aiSelector = new AiSelector(CONFIG);
  api.map("K", "[[");
  api.map("J", "]]");
  api.mapkey("T", "#3Choose a tab", function() {
    api.Front.openOmnibar({ type: "Tabs" });
  });
  api.map("q", "p");
  api.map("v", "zv");
  api.map("zv", "v");
  api.iunmap("<Ctrl-a>");
  api.cmap("<Ctrl->>", "<Ctrl-,>");
  api.mapkey("ye", "Copy image to clipboard", function() {
    api.Hints.create("img", function(element) {
      const imgElement = element;
      let imageUrl = imgElement.src || imgElement.getAttribute("data-src") || imgElement.getAttribute("data-lazy-src");
      if (!imageUrl && imgElement.srcset) {
        const srcset = imgElement.srcset.split(",");
        imageUrl = srcset[0].trim().split(" ")[0];
      }
      if (!imageUrl) {
        api.Front.showBanner("Could not find image source", "error");
        return;
      }
      const copyPngToClipboard = async (blob) => {
        try {
          if (!blob)
            throw new Error("Empty blob");
          const data = [new ClipboardItem({ "image/png": blob })];
          await navigator.clipboard.write(data);
          api.Front.showBanner("Image copied to clipboard!", "success");
        } catch (err) {
          api.Clipboard.write(imageUrl);
          api.Front.showBanner("Copied URL (Clipboard write failed)", "warning");
        }
      };
      const convertAndCopy = (url) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(copyPngToClipboard, "image/png");
          }
        };
        img.onerror = function() {
          fetch(url).then((r) => r.blob()).then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const img2 = new Image();
            img2.onload = function() {
              const canvas = document.createElement("canvas");
              canvas.width = img2.width;
              canvas.height = img2.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img2, 0, 0);
                canvas.toBlob((b) => {
                  URL.revokeObjectURL(blobUrl);
                  copyPngToClipboard(b);
                }, "image/png");
              }
            };
            img2.src = blobUrl;
          }).catch(() => {
            api.Clipboard.write(imageUrl);
            api.Front.showBanner("Copied URL (Image load failed)", "warning");
          });
        };
        img.src = url;
      };
      convertAndCopy(imageUrl);
    });
  });
  api.mapkey("gp", "#12Open Passwords", () => api.tabOpenLink("chrome://password-manager/passwords"));
  api.mapkey("gs", "#12Open Extensions", () => api.tabOpenLink("chrome://extensions/shortcuts"));
  api.mapkey("aa", "Multi-AI Search (Clipboard/Input)", () => {
    aiSelector.show("");
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ac", "ChatGPT Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.CHATGPT]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ae", "Claude Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.CLAUDE]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ag", "Gemini Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.GEMINI]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ap", "Perplexity Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.PERPLEXITY]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  var searchEngines = {
    amazon: {
      alias: "a",
      search: "https://smile.amazon.com/s/?field-keywords=",
      compl: "https://completion.amazon.com/search/complete?method=completion&mkt=1&search-alias=aps&q=",
      callback: (response) => JSON.parse(response.text)[1]
    },
    github: {
      alias: "t",
      search: "https://github.com/search?q=",
      compl: "https://api.github.com/search/repositories?sort=stars&order=desc&q=",
      callback: (response) => JSON.parse(response.text).items.map((s) => {
        const prefix = s.stargazers_count ? `[\u2605${s.stargazers_count}] ` : "";
        return createURLItem(prefix + s.full_name, s.html_url);
      })
    },
    yandex: { alias: "n", search: "https://yandex.com/search/?text=" },
    anna: { alias: "c", search: "https://www.annas-archive.org/search?q=" }
  };
  Object.entries(searchEngines).forEach(([name, conf]) => {
    api.addSearchAlias(conf.alias, name, conf.search, conf.compl, conf.callback);
  });
  api.Hints.style(`
  border: solid 2px ${CONFIG.theme.colors.border} !important;
  color: ${CONFIG.theme.colors.accentFg} !important;
  background: initial !important;
  background-color: ${CONFIG.theme.colors.bgDark} !important;
  font-size: 11pt !important;
  font-weight: lighter !important;
`);
  api.Visual.style("marks", `background-color: ${CONFIG.theme.colors.accentFg}99;`);
  api.Visual.style("cursor", `background-color: ${CONFIG.theme.colors.mainFg};`);
  settings.theme = `
:root {
  --font: ${CONFIG.theme.font};
  --font-size: ${CONFIG.theme.fontSize};
  --fg: ${CONFIG.theme.colors.fg};
  --bg: ${CONFIG.theme.colors.bg};
  --bg-dark: ${CONFIG.theme.colors.bgDark};
  --border: ${CONFIG.theme.colors.border};
  --main-fg: ${CONFIG.theme.colors.mainFg};
  --accent-fg: ${CONFIG.theme.colors.accentFg};
  --info-fg: ${CONFIG.theme.colors.infoFg};
  --select: ${CONFIG.theme.colors.select};
}

.sk_theme {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font);
  font-size: var(--font-size);
}

/* Additional theme styles... */
`;
  console.log("[SurfingKeys] TypeScript configuration loaded");
})();
