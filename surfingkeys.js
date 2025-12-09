// ================================================================================
// SURFINGKEYS CONFIGURATION
// ================================================================================

// ================================
// BASIC SETTINGS
// ================================
settings.scrollStepSize = 120;
settings.hintAlign = "left";
settings.omnibarMaxResults = 20;
settings.historyMUOrder = false; // list history by recency instead of most-used frequency

// ================================
// KEY MAPPINGS
// ================================

// Navigation
api.map('K', '[[');  // Previous page
api.map('J', ']]');  // Next page

// Convenience mappings
api.map('q', 'p');   // Left hand passthrough

// Swap v and zv
api.map('v', 'zv');  // Visual mode now on v
api.map('zv', 'v');  // Enter visual mode (caret mode) now on zv

// Unmappings
api.iunmap("<Ctrl-a>");  // Unmap select all

// ================================
// CUSTOM KEYBINDINGS
// ================================

// Chrome utilities

api.mapkey('gp', '#12Open Passwords', function () {
  api.tabOpenLink("chrome://password-manager/passwords");
});

api.mapkey('gs', '#12Open Chrome Extensions Shortcuts', function () {
  api.tabOpenLink("chrome://extensions/shortcuts");
});

api.mapkey('gw', 'Yank link and search in Gemini', function () {
  api.Hints.create("", function (element) {
    var link = element.href;
    var promptText = link + " provide a detailed summary";
    var userInput = prompt("Edit prompt:", " provide a detailed summary");
    if (userInput !== null) {
      var targetUrl = "https://gemini.google.com/app#sk_prompt=" + encodeURIComponent(link + userInput);
      api.tabOpenLink(targetUrl);
    }
  });
});

api.mapkey('gq', 'Review current tab in Gemini', function () {
  var link = window.location.href;
  var promptText = link + " provide a detailed summary";
  var userInput = prompt("Edit prompt:", " provide a detailed summary");
  if (userInput !== null) {
    var targetUrl = "https://gemini.google.com/app#sk_prompt=" + encodeURIComponent(link + userInput);
    api.tabOpenLink(targetUrl);
  }
});

api.mapkey('gr', 'Pop up input with clipboard, then open multiple AI sites', function () {
  var openTabs = function (userInput) {
    if (userInput !== null) {
      var urls = [
        "https://chatgpt.com/?q=" + encodeURIComponent(userInput),
        "https://www.doubao.com/chat#sk_prompt=" + encodeURIComponent(userInput),
        "https://alice.yandex.ru/?q=" + encodeURIComponent(userInput),
        "https://claude.ai#sk_prompt=" + encodeURIComponent(userInput),
        "https://gemini.google.com/app#sk_prompt=" + encodeURIComponent(userInput),
        "https://perplexity.ai?q=" + encodeURIComponent(userInput),
        "https://grok.com?q=" + encodeURIComponent(userInput),
      ];
      urls.forEach(function (url) {
        api.tabOpenLink(url);
      });
    }
  };

  // Get clipboard content
  navigator.clipboard.readText().then(function (clipboardText) {
    var userInput = prompt("Edit query:", clipboardText);
    openTabs(userInput);
  }).catch(function (err) {
    api.echoerr('Failed to read clipboard');
    var userInput = prompt("Enter query:");
    openTabs(userInput);
  });
});

// Delay constant for AI sites
var delay_in_ms = 1000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ChatGPT
if (window.location.hostname === "chatgpt.com") {
  (async () => {
    await delay(delay_in_ms);
    var inputBox = document.querySelector('[name="prompt-textarea"]');
    await delay(delay_in_ms);
    var submitButton = document.getElementById('composer-submit-button');
    submitButton.click();
  })();
}

// Gemini
if (window.location.hostname === "gemini.google.com") {
  if (window.location.hash.startsWith("#sk_prompt=")) {
    const promptToPaste = decodeURIComponent(window.location.hash.substring(11));
    (async () => {
      await delay(delay_in_ms);
      const inputBox = document.querySelector('div[contenteditable="true"][role="textbox"]');
      inputBox.focus();
      document.execCommand('insertText', false, promptToPaste);
      
      await delay(delay_in_ms);
      pressEnter(inputBox);
      history.replaceState(null, null, ' ');
    })();
  }
}

// Claude
if (window.location.hostname === "claude.ai") {
  if (window.location.hash.startsWith("#sk_prompt=")) {
    var promptToPaste = decodeURIComponent(window.location.hash.substring(11));
    (async () => {
      await delay(delay_in_ms);
      var inputBox = document.querySelector('div[contenteditable="true"]');
      inputBox.focus();
      document.execCommand('insertText', false, promptToPaste);
      await delay(delay_in_ms);
      var submitButton = document.querySelector('button[type="submit"]') ||
        document.querySelector('button.send-button') ||
        document.querySelector('button[aria-label*="send" i]') ||
        document.querySelector('button svg[class*="send"]')?.closest('button');
      if (submitButton) {
        submitButton.click();
      } else {
        pressEnter(inputBox);
      }
      history.replaceState(null, null, ' ');
    })();
  }
}

// Doubao
if (window.location.hostname === "www.doubao.com") {
  if (window.location.hash.startsWith("#sk_prompt=")) {
    var promptToPaste = decodeURIComponent(window.location.hash.substring(11));
    (async () => {
      await delay(delay_in_ms);
      var inputBox = document.querySelector('textarea[placeholder], div[contenteditable="true"]');
      inputBox.value = promptToPaste;
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(delay_in_ms);
      var submitButton = document.querySelector('button[type="submit"]') ||
        document.querySelector('button.send-button') ||
        document.querySelector('button[aria-label*="send" i]') ||
        document.querySelector('button svg[class*="send"]')?.closest('button');
      if (submitButton) {
        submitButton.click();
      } else {
        pressEnter(inputBox);
      }
      history.replaceState(null, null, ' ');
    })();
  }
}

// Yandex Alice
if (window.location.hostname.includes("yandex.ru")) {
  var urlParams = new URLSearchParams(window.location.search);
  var promptToPaste = urlParams.get('q');
  if (promptToPaste) {
    (async () => {
      await delay(delay_in_ms);
      var inputBox = document.querySelector('textarea[placeholder], input[type="text"], input[class*="input"], div[contenteditable="true"]');
      inputBox.focus();
      inputBox.value = promptToPaste;
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
      inputBox.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(delay_in_ms);
      pressEnter(inputBox);
    })();
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

// Helper function to press Enter key
var pressEnter = function (element) {
  var enterEvent = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13
  });
  element.dispatchEvent(enterEvent);
};

util = {}
util.createURLItem = (title, url, sanitize = true) => {
  let t = title
  let u = url
  if (sanitize) {
    t = util.escape(t)
    u = new URL(u).toString()
  }
  return util.createSuggestionItem(`
      <div class="title">${t}</div>
      <div class="url">${u}</div>
    `, { url: u })
}

util.escape = (str) =>
  String(str).replace(/[&<>"'`=/]/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  }[s]))

util.createSuggestionItem = (html, props = {}) => {
  const li = document.createElement("li");
  li.innerHTML = html;
  return { html: li.outerHTML, props };
};

// ================================
// SEARCH ENGINES & COMPLETIONS
// ================================
completions = {}

// E-commerce
completions.amazon = {
  alias: "a",
  name: "amazon",
  search: "https://smile.amazon.com/s/?field-keywords=",
  compl: "https://completion.amazon.com/search/complete?method=completion&mkt=1&search-alias=aps&q=",
  callback: (response) => JSON.parse(response.text)[1]
}

// Local services
completions.yelp = {
  alias: "p",
  name: "yelp",
  search: "https://www.yelp.com/search?find_desc=",
  compl: "https://www.yelp.com/search_suggest/v2/prefetch?prefix=",
  callback: (response) => {
    const res = JSON.parse(response.text).response;
    const words = [];
    res.forEach((r) => {
      r.suggestions.forEach((s) => {
        const w = s.query;
        if (words.indexOf(w) === -1) {
          words.push(w);
        }
      });
    });
    return words;
  },
};

// Development & Tech
completions.github = {
  alias: "t",
  name: "github",
  search: "https://github.com/search?q=",
  compl: "https://api.github.com/search/repositories?sort=stars&order=desc&q=",
  callback: (response) =>
    JSON.parse(response.text).items.map((s) => {
      let prefix = "";
      if (s.stargazers_count) {
        prefix += `[★${s.stargazers_count}] `;
      }
      return util.createURLItem(prefix + s.full_name, s.html_url);
    }),
};

completions.libhunt = {
  alias: "l",
  name: "libhunt",
  search: "https://www.libhunt.com/search?query=",
}

// AI & Search
completions.gpt = {
  alias: "z",
  name: "chatgpt",
  search: "https://chatgpt.com/?q=",
}

completions.yandex = {
  alias: "n",
  name: "yandex",
  search: "https://yandex.com/search/?text=",
}

// Entertainment & Media
completions.skid = {
  alias: "k",
  name: "skidrow",
  search: "https://www.skidrowreloaded.com/?s=",
}

// Books & Research
completions.anna = {
  alias: "c",
  name: "anna archive",
  search: "https://www.annas-archive.org/search?q=",
}

completions.libgen = {
  alias: "v",
  name: "libgen",
  search: "https://libgen.is/search.php?req=",
}

// Reference & Definitions
completions.urban = {
  alias: "u",
  name: "urbandictionary",
  search: "https://www.urbandictionary.com/define.php?term=",
}

// Archive & History
completions.archive = {
  alias: "r",
  name: "archive",
  search: "https://archive.is/",
}

// Register all search engines
for (const c in completions) {
  const s = completions[c];
  api.addSearchAlias(s.alias, s.name, s.search, "s", s.compl, s.callback);
}

// ================================
// VISUAL STYLING
// ================================

// Hints styling
api.Hints.style('border: solid 2px #373B41; color:#52C196; background: initial; background-color: #1D1F21; font-size: 14pt; font-weight: normal;');
api.Hints.style("border: solid 2px #373B41 !important; padding: 1px !important; color: #C5C8C6 !important; background: #1D1F21 !important; font-size: 14pt !important; font-weight: normal !important;", "text");

// Visual mode styling
api.Visual.style('marks', 'background-color: #52C19699;');
api.Visual.style('cursor', 'background-color: #81A2BE;');

// ================================
// THEME - TOMORROW NIGHT
// ================================
settings.theme = `
:root {
  --font: 'Monaco', 'Consolas', 'Courier New', monospace;
  --font-size: 16;
  --font-weight: normal;
  
  /* -------------------- */
  /* -- Tomorrow Night -- */
  /* -------------------- */
  --fg: #C5C8C6;
  --bg: #282A2E;
  --bg-dark: #1D1F21;
  --border: #373b41;
  --main-fg: #81A2BE;
  --accent-fg: #52C196;
  --info-fg: #AC7BBA;
  --select: #585858;
}

/* Base Theme */
.sk_theme {
  background: var(--bg);
  color: var(--fg);
  background-color: var(--bg);
  border-color: var(--border);
  font-family: var(--font);
  font-size: var(--font-size);
  font-weight: var(--font-weight);
  // line-height: 2em;
}

input {
  font-family: var(--font);
  font-weight: var(--font-weight);
}

.sk_theme tbody {
  color: var(--fg);
}

.sk_theme input {
  color: var(--fg);
}

/* Hints */
#sk_hints .begin {
  color: var(--accent-fg) !important;
}

/* Tabs */
#sk_tabs .sk_tab {
  background: var(--bg-dark);
  border: 1px solid var(--border);
}

#sk_tabs .sk_tab_title {
  color: var(--fg);
}

#sk_tabs .sk_tab_url {
  color: var(--main-fg);
}

#sk_tabs .sk_tab_hint {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--accent-fg);
}

.sk_theme #sk_frame {
  background: var(--bg);
  opacity: 0.2;
  color: var(--accent-fg);
}

/* Omnibar */
/* Uncomment this and use settings.omnibarPosition = 'bottom' for Pentadactyl/Tridactyl style bottom bar */
/* .sk_theme#sk_omnibar {
  width: 100%;
  left: 0;
} */

.sk_theme .title {
  color: var(--accent-fg);
}

.sk_theme .url {
  color: var(--main-fg);
}

.sk_theme .annotation {
  color: var(--accent-fg);
}

.sk_theme .omnibar_highlight {
  color: var(--accent-fg);
}

.sk_theme .omnibar_timestamp {
  color: var(--info-fg);
}

.sk_theme .omnibar_visitcount {
  color: var(--accent-fg);
}

.sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) {
  background: var(--bg-dark);
}

.sk_theme #sk_omnibarSearchResult ul li.focused {
  background: var(--border);
}

.sk_theme #sk_omnibarSearchResult ul li {
  padding: 0.4em;
}

.sk_theme #sk_omnibarSearchArea {
  border-top-color: var(--border);
  border-bottom-color: var(--border);
  padding-bottom: 0.5rem; 
}

.sk_theme #sk_omnibarSearchArea input,
.sk_theme #sk_omnibarSearchArea span {
  font-size: var(--font-size);
}

.sk_theme .separator {
  color: var(--accent-fg);
}

/* Popup Notification Banner */
#sk_banner {
  font-family: var(--font);
  font-size: var(--font-size);
  font-weight: var(--font-weight);
  background: var(--bg);
  border-color: var(--border);
  color: var(--fg);
  opacity: 0.9;
}

/* Popup Keys */
#sk_keystroke {
  background-color: var(--bg);
}

.sk_theme kbd .candidates {
  color: var(--info-fg);
}

.sk_theme span.annotation {
  color: var(--accent-fg);
}

/* Popup Translation Bubble */
#sk_bubble {
  background-color: var(--bg) !important;
  color: var(--fg) !important;
  border-color: var(--border) !important;
}

#sk_bubble * {
  color: var(--fg) !important;
}

#sk_bubble div.sk_arrow div:nth-of-type(1) {
  border-top-color: var(--border) !important;
  border-bottom-color: var(--border) !important;
}

#sk_bubble div.sk_arrow div:nth-of-type(2) {
  border-top-color: var(--bg) !important;
  border-bottom-color: var(--bg) !important;
}

/* Search */
#sk_status,
#sk_find {
  font-size: var(--font-size);
  border-color: var(--border);
}

.sk_theme kbd {
  background: var(--bg-dark);
  border-color: var(--border);
  box-shadow: none;
  color: var(--fg);
}

.sk_theme .feature_name span {
  color: var(--main-fg);
}

/* ACE Editor */
#sk_editor {
  background: var(--bg-dark) !important;
  height: 50% !important;
  /* Remove this to restore the default editor size */
}

.ace_dialog-bottom {
  border-top: 1px solid var(--bg) !important;
}

.ace-chrome .ace_print-margin,
.ace_gutter,
.ace_gutter-cell,
.ace_dialog {
  background: var(--bg) !important;
}

.ace-chrome {
  color: var(--fg) !important;
}

.ace_gutter,
.ace_dialog {
  color: var(--fg) !important;
}

.ace_cursor {
  color: var(--fg) !important;
}

.normal-mode .ace_cursor {
  background-color: var(--fg) !important;
  border: var(--fg) !important;
  opacity: 0.7 !important;
}

.ace_marker-layer .ace_selection {
  background: var(--select) !important;
}
`;