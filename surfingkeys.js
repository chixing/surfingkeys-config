/**
 * SurfingKeys Configuration
 * 
 * A professional, modular configuration for SurfingKeys.
 * Includes custom keybindings, search engines, and AI automation integrations.
 */

// =============================================================================
// 1. CONFIGURATION & CONSTANTS
// =============================================================================
const CONFIG = {
  scrollStep: 120,
  hintAlign: "left",
  omnibarMaxResults: 20,
  historyMUOrder: false, // false = recency, true = frequency
  delayMs: 1000,
  theme: {
    font: "'Monaco', 'Consolas', 'Courier New', monospace",
    fontSize: "16px",
    colors: {
      fg: "#C5C8C6",
      bg: "#282A2E",
      bgDark: "#1D1F21",
      border: "#373b41",
      mainFg: "#81A2BE",
      accentFg: "#52C196",
      infoFg: "#AC7BBA",
      select: "#585858"
    }
  }
};

// Apply Basic Settings
Object.assign(settings, {
  scrollStepSize: CONFIG.scrollStep,
  hintAlign: CONFIG.hintAlign,
  omnibarMaxResults: CONFIG.omnibarMaxResults,
  historyMUOrder: CONFIG.historyMUOrder,
});

// =============================================================================
// 2. UTILITIES
// =============================================================================
const util = {
  /**
   * Promisified delay
   * @param {number} ms 
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Open multiple tabs from a list of URLs
   * @param {string} query 
   * @param {string[]} baseUrls 
   */
  openAiTabs: (query, baseUrls) => {
    if (!query) return;
    baseUrls.forEach(base => api.tabOpenLink(base + encodeURIComponent(query)));
  },

  /**
   * Dispatch a key event to an element
   * @param {HTMLElement} element 
   * @param {string} key 
   * @param {number} keyCode 
   */
  pressKey: (element, key = 'Enter', keyCode = 13) => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: key,
      code: key,
      keyCode: keyCode,
      which: keyCode
    });
    element.dispatchEvent(event);
  },

  /**
   * Helper to create suggestion items for the omnibar
   */
  createSuggestionItem: (html, props = {}) => {
    const li = document.createElement("li");
    li.innerHTML = html;
    return { html: li.outerHTML, props };
  },

  /**
   * Create a URL suggestion item with sanitization
   */
  createURLItem: (title, url, sanitize = true) => {
    let t = title;
    let u = url;
    if (sanitize) {
      t = String(t).replace(/[&<>"'`=/]/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", 
        "'": "&#39;", "/": "&#x2F;", "`": "&#x60;", "=": "&#x3D;"
      })[s]);
      u = new URL(u).toString();
    }
    return util.createSuggestionItem(
      `\n<div class="title">${t}</div>\n<div class="url">${u}</div>\n`,
      { url: u }
    );
  },
  
  /**
   * Generic handler for pasting prompts into AI chat interfaces
   * @param {Object} options
   * @param {string} options.selector - CSS selector for the input box
   * @param {Function} [options.submitSelector] - Function or selector to find submit button
   * @param {boolean} [options.useValue] - If true, sets .value instead of execCommand
   * @param {boolean} [options.dispatchEvents] - If true, dispatches input/change events
   */
  injectPrompt: async ({ selector, submitSelector, useValue = false, dispatchEvents = false }) => {
    const promptKey = "#sk_prompt=";
    if (!window.location.hash.startsWith(promptKey)) return;
    
    const promptText = decodeURIComponent(window.location.hash.substring(promptKey.length));
    
    await util.delay(CONFIG.delayMs);
    const inputBox = document.querySelector(selector);
    if (!inputBox) return;

    inputBox.focus();

    if (useValue) {
      inputBox.value = promptText;
    } else {
      document.execCommand('insertText', false, promptText);
    }

    if (dispatchEvents) {
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
      inputBox.dispatchEvent(new Event('change', { bubbles: true }));
    }

    await util.delay(CONFIG.delayMs);

    if (submitSelector) {
      const btn = typeof submitSelector === 'function' ? submitSelector() : document.querySelector(submitSelector);
      if (btn) {
        btn.click();
      } else {
        util.pressKey(inputBox);
      }
    } else {
      util.pressKey(inputBox);
    }

    // Clean up URL
    history.replaceState(null, null, ' ');
  }
};

// =============================================================================
// 3. KEY MAPPINGS
// =============================================================================

// --- Navigation ---
api.map('K', '[['); // Previous page
api.map('J', ']]'); // Next page

// --- Convenience ---
api.map('q', 'p');  // Left hand passthrough

// --- Mode Swapping ---
api.map('v', 'zv'); // Visual mode
api.map('zv', 'v'); // Caret mode

// --- Unmappings ---
api.iunmap("<Ctrl-a>");

// --- Custom Actions ---

// Chrome Internal Pages
api.mapkey('gp', '#12Open Passwords', () => api.tabOpenLink("chrome://password-manager/passwords"));
api.mapkey('gs', '#12Open Extensions', () => api.tabOpenLink("chrome://extensions/shortcuts"));

// AI Workflows
const AI_URLS = [
  "https://chatgpt.com/?q=",
  "https://www.doubao.com/chat#sk_prompt=",
  "https://alice.yandex.ru/?q=",
  "https://claude.ai#sk_prompt=",
  "https://gemini.google.com/app#sk_prompt=",
  "https://perplexity.ai?q=",
  "https://grok.com?q=",
];

api.mapkey('gw', 'Yank link and summarize in Gemini', () => {
  api.Hints.create("a[href]", (element) => {
    const link = element.href;
    const defaultPrompt = " provide a detailed summary";
    const userInput = prompt("Edit prompt:", defaultPrompt);
    if (userInput !== null) {
      const targetUrl = "https://gemini.google.com/app#sk_prompt=" + encodeURIComponent(link + " " + userInput);
      api.tabOpenLink(targetUrl);
    }
  });
});

api.mapkey('gq', 'Summarize current page in Gemini', () => {
  const link = window.location.href;
  const defaultPrompt = " provide a detailed summary";
  const userInput = prompt("Edit prompt:", defaultPrompt);
  if (userInput !== null) {
    const targetUrl = "https://gemini.google.com/app#sk_prompt=" + encodeURIComponent(link + " " + userInput);
    api.tabOpenLink(targetUrl);
  }
});

api.mapkey('gr', 'Multi-AI Search (Clipboard/Input)', () => {
  navigator.clipboard.readText()
    .then(text => {
      const query = prompt("Edit query:", text);
      util.openAiTabs(query, AI_URLS);
    })
    .catch(() => {
      const query = prompt("Enter query:");
      util.openAiTabs(query, AI_URLS);
    });
});

// =============================================================================
// 4. SITE-SPECIFIC AUTOMATION
// =============================================================================

const siteAutomations = [
  {
    host: "chatgpt.com",
    run: async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('q')) {
        await util.delay(CONFIG.delayMs);
        const submitBtn = document.getElementById('composer-submit-button');
        if (submitBtn) submitBtn.click();
      }
    }
  },
  {
    host: "gemini.google.com",
    run: () => util.injectPrompt({
      selector: 'div[contenteditable="true"][role="textbox"]'
    })
  },
  {
    host: "claude.ai",
    run: () => util.injectPrompt({
      selector: 'div[contenteditable="true"]',
      submitSelector: () => 
        document.querySelector('button[type="submit"]') ||
        document.querySelector('button.send-button') ||
        document.querySelector('button[aria-label*="send" i]') ||
        document.querySelector('button svg[class*="send"]')?.closest('button')
    })
  },
  {
    host: "www.doubao.com",
    run: () => util.injectPrompt({
      selector: 'textarea[placeholder], div[contenteditable="true"]',
      useValue: true,
      dispatchEvents: true,
      submitSelector: () => 
        document.querySelector('button[type="submit"]') ||
        document.querySelector('button.send-button') ||
        document.querySelector('button[aria-label*="send" i]') ||
        document.querySelector('button svg[class*="send"]')?.closest('button')
    })
  },
  {
    host: "yandex.ru",
    run: async () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        await util.delay(CONFIG.delayMs);
        const box = document.querySelector('textarea[placeholder], input[type="text"], input[class*="input"], div[contenteditable="true"]');
        if (box) {
          box.focus();
          box.value = q;
          box.dispatchEvent(new Event('input', { bubbles: true }));
          box.dispatchEvent(new Event('change', { bubbles: true }));
          await util.delay(CONFIG.delayMs);
          util.pressKey(box);
        }
      }
    }
  }
];

// Execute matching automation
const currentHost = window.location.hostname;
siteAutomations.forEach(site => {
  if (currentHost.includes(site.host)) {
    site.run();
  }
});

// =============================================================================
// 5. SEARCH ENGINES
// =============================================================================

const searchEngines = {
  amazon: {
    alias: "a",
    search: "https://smile.amazon.com/s/?field-keywords=",
    compl: "https://completion.amazon.com/search/complete?method=completion&mkt=1&search-alias=aps&q=",
    callback: (response) => JSON.parse(response.text)[1]
  },
  yelp: {
    alias: "p",
    search: "https://www.yelp.com/search?find_desc=",
    compl: "https://www.yelp.com/search_suggest/v2/prefetch?prefix=",
    callback: (response) => {
      const res = JSON.parse(response.text).response;
      return res.flatMap(r => r.suggestions.map(s => s.query))
                .filter((v, i, a) => a.indexOf(v) === i); // unique
    }
  },
  github: {
    alias: "t",
    search: "https://github.com/search?q=",
    compl: "https://api.github.com/search/repositories?sort=stars&order=desc&q=",
    callback: (response) => JSON.parse(response.text).items.map(s => {
      const prefix = s.stargazers_count ? `[★${s.stargazers_count}] ` : "";
      return util.createURLItem(prefix + s.full_name, s.html_url);
    })
  },
  libhunt: { alias: "l", search: "https://www.libhunt.com/search?query=" },
  chatgpt: { alias: "z", search: "https://chatgpt.com/?q=" },
  yandex:  { alias: "n", search: "https://yandex.com/search/?text=" },
  skidrow: { alias: "k", search: "https://www.skidrowreloaded.com/?s=" },
  anna:    { alias: "c", search: "https://www.annas-archive.org/search?q=" },
  libgen:  { alias: "v", search: "https://libgen.is/search.php?req=" },
  urban:   { alias: "u", search: "https://www.urbandictionary.com/define.php?term=" },
  archive: { alias: "r", search: "https://archive.is/" },
};

Object.entries(searchEngines).forEach(([name, conf]) => {
  api.addSearchAlias(conf.alias, name, conf.search, "s", conf.compl, conf.callback);
});

// =============================================================================
// 6. THEME & STYLING
// =============================================================================

// Hints
api.Hints.style(`
  border: solid 2px ${CONFIG.theme.colors.border} !important; 
  color: ${CONFIG.theme.colors.accentFg} !important; 
  background: initial !important; 
  background-color: ${CONFIG.theme.colors.bgDark} !important; 
  font-size: 11pt !important; 
  font-weight: lighter !important;
`);

api.Hints.style(`
  border: solid 2px ${CONFIG.theme.colors.border} !important; 
  padding: 1px !important; 
  color: ${CONFIG.theme.colors.fg} !important; 
  background: ${CONFIG.theme.colors.bgDark} !important; 
  font-size: 11pt !important; 
  font-weight: lighter !important;
`, "text");

// Visual Mode
api.Visual.style('marks', `background-color: ${CONFIG.theme.colors.accentFg}99;`);
api.Visual.style('cursor', `background-color: ${CONFIG.theme.colors.mainFg};`);

// Main Theme CSS
settings.theme = `
:root {
  --font: ${CONFIG.theme.font};
  --font-size: ${CONFIG.theme.fontSize};
  --font-weight: normal;
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
  background-color: var(--bg);
  border-color: var(--border);
  font-family: var(--font);
  font-size: var(--font-size);
  font-weight: var(--font-weight);
}

input { font-family: var(--font); font-weight: var(--font-weight); }
.sk_theme tbody, .sk_theme input { color: var(--fg); }

/* Hints */
#sk_hints .begin { color: var(--accent-fg) !important; }

/* Tabs */
#sk_tabs .sk_tab { background: var(--bg-dark); border: 1px solid var(--border); }
#sk_tabs .sk_tab_title { color: var(--fg); }
#sk_tabs .sk_tab_url { color: var(--main-fg); }
#sk_tabs .sk_tab_hint { background: var(--bg); border: 1px solid var(--border); color: var(--accent-fg); }

.sk_theme #sk_frame { background: var(--bg); opacity: 0.2; color: var(--accent-fg); }

/* Omnibar */
.sk_theme .title { color: var(--accent-fg); }
.sk_theme .url { color: var(--main-fg); }
.sk_theme .annotation { color: var(--accent-fg); }
.sk_theme .omnibar_highlight { color: var(--accent-fg); }
.sk_theme .omnibar_timestamp { color: var(--info-fg); }
.sk_theme .omnibar_visitcount { color: var(--accent-fg); }

.sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) { background: var(--bg-dark); }
.sk_theme #sk_omnibarSearchResult ul li.focused { background: var(--border); }
.sk_theme #sk_omnibarSearchResult ul li { padding: 0.4em; }

.sk_theme #sk_omnibarSearchArea { border-top-color: var(--border); border-bottom-color: var(--border); padding-bottom: 0.5rem; }
.sk_theme #sk_omnibarSearchArea input, .sk_theme #sk_omnibarSearchArea span { font-size: var(--font-size); }
.sk_theme .separator { color: var(--accent-fg); }

/* Popup */
#sk_banner { font-family: var(--font); font-size: var(--font-size); font-weight: var(--font-weight); background: var(--bg); border-color: var(--border); color: var(--fg); opacity: 0.9; }
#sk_keystroke { background-color: var(--bg); }
.sk_theme kbd .candidates { color: var(--info-fg); }
.sk_theme span.annotation { color: var(--accent-fg); }
#sk_bubble { background-color: var(--bg) !important; color: var(--fg) !important; border-color: var(--border) !important; }
#sk_bubble * { color: var(--fg) !important; }
#sk_bubble div.sk_arrow div:nth-of-type(1) { border-top-color: var(--border) !important; border-bottom-color: var(--border) !important; }
#sk_bubble div.sk_arrow div:nth-of-type(2) { border-top-color: var(--bg) !important; border-bottom-color: var(--bg) !important; }

/* Search */
#sk_status, #sk_find { font-size: var(--font-size); border-color: var(--border); }
.sk_theme kbd { background: var(--bg-dark); border-color: var(--border); box-shadow: none; color: var(--fg); }
.sk_theme .feature_name span { color: var(--main-fg); }

/* ACE Editor */
#sk_editor { background: var(--bg-dark) !important; height: 50% !important; }
.ace_dialog-bottom { border-top: 1px solid var(--bg) !important; }
.ace-chrome .ace_print-margin, .ace_gutter, .ace_gutter-cell, .ace_dialog { background: var(--bg) !important; }
.ace-chrome { color: var(--fg) !important; }
.ace_gutter, .ace_dialog { color: var(--fg) !important; }
.ace_cursor { color: var(--fg) !important; }
.normal-mode .ace_cursor { background-color: var(--fg) !important; border: var(--fg) !important; opacity: 0.7 !important; }
.ace_marker-layer .ace_selection { background: var(--select) !important; }
`;