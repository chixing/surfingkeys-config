/**
 * SurfingKeys Configuration
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

// Apply Basic Settings
Object.assign(settings, {
  scrollStepSize: CONFIG.scrollStep,
  hintAlign: CONFIG.hintAlign,
  omnibarMaxResults: CONFIG.omnibarMaxResults,
  historyMUOrder: CONFIG.historyMUOrder,
});

// =============================================================================
// 2. AI SELECTOR CLASS
// =============================================================================

// AI Service Names
const AI_SERVICES = {
  CHATGPT: 'ChatGPT',
  DOUBAO: 'Doubao',
  ALICE: 'Alice (Yandex)',
  CLAUDE: 'Claude',
  GEMINI: 'Gemini',
  PERPLEXITY: 'Perplexity',
  GROK: 'Grok'
};


class AiSelector {
  constructor(config) {
    this.config = config;
    this.lastQuery = null;
    this.services = [
      { name: AI_SERVICES.CHATGPT, url: 'https://chatgpt.com/?q=', checked: true },
      { name: AI_SERVICES.DOUBAO, url: 'https://www.doubao.com/chat#sk_prompt=', checked: true },
      { name: AI_SERVICES.ALICE, url: 'https://alice.yandex.ru/?q=', checked: true },
      { name: AI_SERVICES.CLAUDE, url: 'https://claude.ai/new#sk_prompt=', checked: true },
      { name: AI_SERVICES.GEMINI, url: 'https://gemini.google.com/app#sk_prompt=', checked: true },
      { name: AI_SERVICES.PERPLEXITY, url: 'https://perplexity.ai?q=', checked: true },
      { name: AI_SERVICES.GROK, url: 'https://grok.com?q=', checked: true },
    ];
    this.container = document.createElement('div');
    this.shadow = this.container.attachShadow({ mode: 'open' });
  }

  createNodes(initialQuery, selectedServices) {
    const colors = this.config.theme.colors;
    const font = this.config.theme.font;
    
    this.shadow.innerHTML = `
      <style>
        .sk_ai_backdrop {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.7); z-index: 2147483646;
          display: flex; justify-content: center; align-items: center;
          font-family: ${font};
        }
        .sk_ai_dialog {
          background: ${colors.bg};
          border: 2px solid ${colors.border};
          border-radius: 8px;
          padding: 24px;
          width: 550px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          color: ${colors.fg};
        }
        .sk_ai_title {
          margin: 0 0 16px 0;
          color: ${colors.accentFg};
          font-size: 20px;
          font-weight: 600;
        }
        .sk_ai_label {
          display: block; margin-bottom: 8px; color: ${colors.mainFg}; font-size: 14px;
        }
        .sk_ai_input, .sk_ai_select {
          width: 100%; padding: 12px; background: ${colors.bgDark};
          border: 1px solid ${colors.border}; border-radius: 4px;
          color: ${colors.fg}; font-family: ${font}; font-size: 14px;
          margin-bottom: 15px; box-sizing: border-box; outline: none;
        }
        .sk_ai_input:focus { border-color: ${colors.mainFg}; }
        .sk_ai_services {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-bottom: 20px; padding: 12px; background: ${colors.bgDark};
          border-radius: 4px; border: 1px solid ${colors.border};
        }
        .sk_ai_service {
          display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;
          padding: 4px; border-radius: 4px;
        }
        .sk_ai_service:hover { background: ${colors.border}; }
        .sk_ai_buttons { display: flex; gap: 12px; justify-content: flex-end; }
        .sk_ai_btn {
          padding: 8px 20px; border-radius: 4px; cursor: pointer; font-family: ${font};
          font-size: 14px; font-weight: 600; transition: all 0.2s; border: 1px solid transparent;
        }
        .sk_ai_btn_cancel { background: ${colors.bgDark}; color: ${colors.fg}; border-color: ${colors.border}; }
        .sk_ai_btn_submit { background: ${colors.accentFg}; color: ${colors.bgDark}; }
        .sk_ai_btn_submit:hover { background: ${colors.mainFg}; }
      </style>
      <div class="sk_ai_backdrop">
        <div class="sk_ai_dialog">
          <div class="sk_ai_title">Multi-AI Search</div>
          
          <label class="sk_ai_label">Search Query:</label>
          <textarea class="sk_ai_input" id="q" rows="3"></textarea>
          
          <label class="sk_ai_label">Prompt Template:</label>
          <select class="sk_ai_select" id="tpl">
            <option value="">None</option>
            <option value="provide a detailed summary">Detailed Summary</option>
            <option value="provide a short TL;DR summary" selected>TL;DR</option>
            <option value="fact-check the key claims and provide sources">Fact-Check</option>
            <option value="explain this in simple terms">Explain Simply</option>
          </select>
          <textarea class="sk_ai_input" id="tpl_val" rows="2"></textarea>
          
          <label class="sk_ai_label">Services:</label>
          <div class="sk_ai_services" id="svc"></div>
          
          <div class="sk_ai_buttons">
            <button class="sk_ai_btn sk_ai_btn_cancel" id="cancel">Cancel</button>
            <button class="sk_ai_btn sk_ai_btn_submit" id="submit">Search</button>
          </div>
        </div>
      </div>
    `;

    const qInput = this.shadow.getElementById('q');
    const tplSelect = this.shadow.getElementById('tpl');
    const tplVal = this.shadow.getElementById('tpl_val');
    const svcContainer = this.shadow.getElementById('svc');
    const submitBtn = this.shadow.getElementById('submit');
    const cancelBtn = this.shadow.getElementById('cancel');
    const backdrop = this.shadow.querySelector('.sk_ai_backdrop');

    // NATIVE FIX: enableAutoFocus
    qInput.enableAutoFocus = true;
    tplVal.enableAutoFocus = true;

    qInput.value = this.lastQuery || initialQuery;
    tplVal.value = tplSelect.value;

    tplSelect.onchange = () => { tplVal.value = tplSelect.value; };

    this.services.forEach((s, i) => {
      const isChecked = selectedServices ? selectedServices.includes(s.name) : s.checked;
      const label = document.createElement('label');
      label.className = 'sk_ai_service';
      label.innerHTML = `<input type="checkbox" data-idx="${i}" ${isChecked ? 'checked' : ''}> <span>${s.name}</span>`;
      svcContainer.appendChild(label);
    });

    const doSubmit = () => {
      const query = qInput.value.trim();
      if (!query) return qInput.focus();
      
      this.lastQuery = query;
      const prompt = tplVal.value.trim();
      const finalQuery = prompt ? `${query}\n${prompt}` : query;
      
      const selected = Array.from(svcContainer.querySelectorAll('input:checked'))
        .map(cb => this.services[cb.dataset.idx].url);
      
      if (selected.length === 0) return alert('Select at least one service');
      
      selected.forEach(url => api.tabOpenLink(url + encodeURIComponent(finalQuery)));
      this.hide();
    };

    submitBtn.onclick = doSubmit;
    cancelBtn.onclick = () => this.hide();
    backdrop.onclick = (e) => { if (e.target === backdrop) this.hide(); };

    qInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSubmit();
      }
    };
  }

  show(initialQuery = '', selectedServices = null) {
    this.createNodes(initialQuery, selectedServices);
    
    document.body.appendChild(this.container);
    
    // NATIVE FIX: passThrough mode
    this.mode = api.Normal.passThrough();
    this.mode.onExit = () => this.hide();

    const qInput = this.shadow.getElementById('q');
    setTimeout(() => {
      qInput.focus();
      qInput.select();
    }, 10);
  }

  hide() {
    if (this.mode) {
      this.mode.exit();
      this.mode = null;
    }
    if (this.container.parentNode) {
      this.container.remove();
    }
  }

  updateQuery(text) {
    const qInput = this.shadow.getElementById('q');
    if (qInput && !this.lastQuery) {
      qInput.value = text;
      qInput.focus();
      qInput.select();
    }
  }
}

// =============================================================================
// 3. UTILITIES
// =============================================================================
const util = {
  /**
   * Promisified delay
   * @param {number} ms 
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

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
// 4. KEY MAPPINGS
// =============================================================================

// Create a single shared AiSelector instance
const aiSelector = new AiSelector(CONFIG);

// --- Navigation ---
api.map('K', '[['); // Previous page
api.map('J', ']]'); // Next page

// --- Tab Search ---
api.mapkey('T', '#3Search tabs', function() {
    api.Front.openOmnibar({type: "Tabs"});
});

// --- Convenience ---
api.map('q', 'p');  // Left hand passthrough

// --- Mode Swapping ---
api.map('v', 'zv'); // Visual mode
api.map('zv', 'v'); // Caret mode

// --- Unmappings ---
api.iunmap("<Ctrl-a>");

// --- Omnibar Navigation ---
api.cmap('<Ctrl->>', '<Ctrl-,>'); // Ctrl+Shift+. (Ctrl+>) to go to previous page in omnibar

// --- Custom Actions ---
// Copy image shortcut - press 'ye' to show hints for images, then select one to copy to clipboard
api.mapkey('ye', 'Copy image to clipboard', function() {
    api.Hints.create('img', function(element) {
        let imageUrl = element.src || element.getAttribute('data-src') || element.getAttribute('data-lazy-src');
        if (!imageUrl && element.srcset) {
            const srcset = element.srcset.split(',');
            imageUrl = srcset[0].trim().split(' ')[0];
        }
        
        if (!imageUrl) {
            api.Front.showBanner('Could not find image source', 'error');
            return;
        }

        // Helper to copy a PNG blob to clipboard
        const copyPngToClipboard = async (blob) => {
            try {
                if (!blob) throw new Error('Empty blob');
                const data = [new ClipboardItem({ 'image/png': blob })];
                await navigator.clipboard.write(data);
                api.Front.showBanner('Image copied to clipboard!', 'success');
            } catch (err) {
                api.Clipboard.write(imageUrl);
                api.Front.showBanner('Copied URL (Clipboard write failed)', 'warning');
            }
        };

        // Use canvas to convert any image format to PNG
        const convertAndCopy = (url) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; 
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(copyPngToClipboard, 'image/png');
            };
            img.onerror = function() {
                // If canvas fails (usually CORS), try fetching the blob first
                fetch(url).then(r => r.blob()).then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    const img2 = new Image();
                    img2.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = img2.width;
                        canvas.height = img2.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img2, 0, 0);
                        canvas.toBlob(b => {
                            URL.revokeObjectURL(blobUrl);
                            copyPngToClipboard(b);
                        }, 'image/png');
                    };
                    img2.src = blobUrl;
                }).catch(() => {
                    api.Clipboard.write(imageUrl);
                    api.Front.showBanner('Copied URL (Image load failed)', 'warning');
                });
            };
            img.src = url;
        };

        convertAndCopy(imageUrl);
    });
});

// Chrome Internal Pages
api.mapkey('gp', '#12Open Passwords', () => api.tabOpenLink("chrome://password-manager/passwords"));
api.mapkey('gs', '#12Open Extensions', () => api.tabOpenLink("chrome://extensions/shortcuts"));

api.mapkey('aa', 'Multi-AI Search (Clipboard/Input)', () => {
  aiSelector.show('');
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text));
});

api.mapkey('ac', 'ChatGPT Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.CHATGPT]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text));
});

api.mapkey('ad', 'Doubao Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.DOUBAO]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text));
});

api.mapkey('ay', 'Alice Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.ALICE]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text));
});

api.mapkey('ae', 'Claude Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.CLAUDE]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text));
});

api.mapkey('ag', 'Gemini Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.GEMINI]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text));
});

api.mapkey('ap', 'Perplexity Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.PERPLEXITY]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text));
});

api.mapkey('ak', 'Grok Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.GROK]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text));
});

// =============================================================================
// 5. SITE-SPECIFIC AUTOMATION
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
// 6. SEARCH ENGINES
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
  // chatgpt: { alias: "z", search: "https://chatgpt.com/?q=" },
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
// 7. THEME & STYLING
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
.sk_theme .omnibar_folder { color: var(--main-fg); }

.sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) { background: var(--bg-dark); }
.sk_theme #sk_omnibarSearchResult ul li.focused { background: var(--border); }
.sk_theme #sk_omnibarSearchResult ul li { padding: 0.4em; }
.sk_theme #sk_omnibarSearchResult { max-height: 80vh !important; }

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