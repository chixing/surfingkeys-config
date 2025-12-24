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

/**
 * SurfingKeys Integration Notes:
 *
 * SurfingKeys aggressively manages focus to enable its keyboard shortcuts.
 * This creates challenges for custom dialogs that need focused input fields.
 *
 * THE PROBLEM:
 * - SurfingKeys has a persistent focus listener that calls .blur() on any
 *   focused element it doesn't recognize
 * - It intercepts keyboard events at the capture phase before they reach
 *   page elements
 * - The Escape key is captured to close SK's own UI, preventing custom dialogs
 *   from receiving it
 *
 * THE SOLUTION (3-part approach):
 *
 * 1. Mark elements as SurfingKeys-owned:
 *    Set `element.fromSurfingKeys = true` on all dialog elements.
 *    SK's DOM observer checks this flag to identify "safe" elements.
 *
 * 2. Suppress events in capture phase:
 *    Add document-level listeners (capture phase) that set `sk_suppressed = true`
 *    and `sk_stopPropagation = true` on keyboard/focus events. These flags tell
 *    SK's mode stack to ignore the events.
 *
 * 3. Fight blur with time-limited re-focus:
 *    When SK blurs the input, immediately re-focus using requestAnimationFrame.
 *    Also simulate mousedown/click events to trigger SK's "insert mode" (the mode
 *    it enters when you click on an input, which allows focus).
 *
 *    CRITICAL: Only fight for ~300ms after dialog opens, then stop. This allows
 *    the initial focus battle to be won, but doesn't interfere with subsequent
 *    user interactions (clicking other elements, Tab navigation, etc.).
 */

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
    // Active dialog state
    this.overlay = null;
    this.queryInput = null;
    this.promptInput = null;
    // Event handlers (stored for cleanup)
    this.keyHandler = null;
    this.focusHandler = null;
    this.blurHandler = null;
    // AI services configuration
    this.services = [
      { name: AI_SERVICES.CHATGPT, url: 'https://chatgpt.com/?q=', checked: true },
      { name: AI_SERVICES.DOUBAO, url: 'https://www.doubao.com/chat#sk_prompt=', checked: true },
      { name: AI_SERVICES.ALICE, url: 'https://alice.yandex.ru/?q=', checked: true },
      { name: AI_SERVICES.CLAUDE, url: 'https://claude.ai/new#sk_prompt=', checked: true },
      { name: AI_SERVICES.GEMINI, url: 'https://gemini.google.com/app#sk_prompt=', checked: true },
      { name: AI_SERVICES.PERPLEXITY, url: 'https://perplexity.ai?q=', checked: true },
      { name: AI_SERVICES.GROK, url: 'https://grok.com?q=', checked: true },
    ];
  }

  // ===========================================================================
  // Dialog Lifecycle
  // ===========================================================================

  show(initialQuery = '', selectedServices = null) {
    // Build dialog DOM
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

    // Assemble dialog
    [title, queryLabel, queryInput, promptLabel, promptSelect, promptInput,
     servicesLabel, selectAllButtons, servicesContainer, buttonsContainer]
      .forEach(el => dialog.appendChild(el));
    this.overlay.appendChild(dialog);

    // Mark elements for SurfingKeys bypass (see class docs)
    this.markAsSurfingKeys(this.overlay);

    document.body.appendChild(this.overlay);

    // Set up event interception and focus management
    this.setupKeyboardHandler();
    this.setupFocusHandler();
    this.setupInitialFocus(queryInput);
    this.setupOverlayClickHandler();
  }

  close() {
    // Remove keyboard handler
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    // Remove focus handler
    if (this.focusHandler) {
      document.removeEventListener('focus', this.focusHandler, true);
      document.removeEventListener('focusin', this.focusHandler, true);
      this.focusHandler = null;
    }
    // Remove blur handler
    if (this.blurHandler && this.queryInput) {
      this.queryInput.removeEventListener('blur', this.blurHandler);
      this.blurHandler = null;
    }
    // Remove overlay from DOM
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    // Clear references
    this.overlay = null;
    this.queryInput = null;
    this.promptInput = null;
  }

  // ===========================================================================
  // SurfingKeys Integration (see class docs for detailed explanation)
  // ===========================================================================

  /** Mark element and descendants with fromSurfingKeys flag */
  markAsSurfingKeys(element) {
    element.fromSurfingKeys = true;
    for (const child of element.querySelectorAll('*')) {
      child.fromSurfingKeys = true;
    }
  }

  /** Intercept keyboard events before SurfingKeys processes them */
  setupKeyboardHandler() {
    this.keyHandler = (e) => {
      if (!this.overlay?.parentNode) return;

      // Mark as handled by SurfingKeys (prevents mode stack processing)
      e.sk_suppressed = true;
      e.sk_stopPropagation = true;

      // Allow Tab for focus navigation within dialog
      if (e.key === 'Tab') return;

      // Vim-style navigation for select dropdowns
      if (e.target.tagName === 'SELECT' && (e.key === 'j' || e.key === 'k')) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.key === 'j' ? 1 : -1;
        const newIndex = e.target.selectedIndex + delta;
        if (newIndex >= 0 && newIndex < e.target.options.length) {
          e.target.selectedIndex = newIndex;
          e.target.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }

      e.stopPropagation();

      // Dialog controls
      if (e.key === 'Escape') {
        e.preventDefault();
        this.lastQuery = this.queryInput.value;
        this.close();
      } else if (e.key === 'Enter') {
        const isTextArea = e.target.tagName === 'TEXTAREA';
        if (!isTextArea || !e.shiftKey) {
          e.preventDefault();
          this.handleSubmit();
        }
      }
    };

    document.addEventListener('keydown', this.keyHandler, true);
  }

  /** Suppress focus events to prevent SurfingKeys focus protection */
  setupFocusHandler() {
    this.focusHandler = (e) => {
      if (this.overlay?.contains(e.target)) {
        e.sk_suppressed = true;
        e.sk_stopPropagation = true;
      }
    };

    document.addEventListener('focus', this.focusHandler, true);
    document.addEventListener('focusin', this.focusHandler, true);
  }

  /**
   * Establish initial focus with time-limited blur fighting.
   * Simulates click events to trigger SK's insert mode.
   */
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
      input.dispatchEvent(new MouseEvent('mousedown', eventOpts));
      input.dispatchEvent(new MouseEvent('click', eventOpts));
    };

    // Time-limited blur fighting
    const startTime = Date.now();
    const FIGHT_DURATION_MS = 300;
    let focusWon = false;

    this.blurHandler = (e) => {
      // Stop fighting after time window expires
      if (focusWon || Date.now() - startTime > FIGHT_DURATION_MS) return;

      // Stop fighting if focus moved to another dialog element
      if (e.relatedTarget && this.overlay?.contains(e.relatedTarget)) {
        focusWon = true;
        return;
      }

      // Re-focus on next frame
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

    input.addEventListener('blur', this.blurHandler);

    // Initial focus attempt
    simulateMouseEvents();
    input.focus();
    input.select();
  }

  /** Close dialog when clicking outside */
  setupOverlayClickHandler() {
    this.overlay.addEventListener('click', (e) => {
      e.sk_suppressed = true;
      if (e.target === this.overlay) {
        this.lastQuery = this.queryInput.value;
        this.close();
      }
    });
  }

  // ===========================================================================
  // Form Handling
  // ===========================================================================

  handleSubmit() {
    const query = this.queryInput.value.trim();
    if (!query) {
      this.queryInput.focus();
      this.queryInput.style.borderColor = '#ff6b6b';
      setTimeout(() => {
        this.queryInput.style.borderColor = this.config.theme.colors.border;
      }, 1000);
      return;
    }

    const selectedUrls = this.services
      .filter((_, i) => document.getElementById(`sk-ai-${i}`)?.checked)
      .map(s => s.url);

    if (selectedUrls.length === 0) {
      alert('Please select at least one AI service');
      return;
    }

    this.lastQuery = this.queryInput.value;

    const promptTemplate = this.promptInput.value.trim();
    const combinedQuery = promptTemplate ? `${query}\n${promptTemplate}` : query;

    selectedUrls.forEach(url => api.tabOpenLink(url + encodeURIComponent(combinedQuery)));
    this.close();
  }

  updateQuery(text) {
    const input = document.getElementById('sk-ai-query-input');
    if (input && !this.lastQuery) {
      input.value = text;
      input.focus();
      input.select();
    }
  }

  // ===========================================================================
  // DOM Creation
  // ===========================================================================

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'sk-ai-selector-overlay';
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
    const dialog = document.createElement('div');
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
    const title = document.createElement('h2');
    title.textContent = 'Multi-AI Search';
    title.style.cssText = `
      margin: 0 0 16px 0;
      color: ${this.config.theme.colors.accentFg};
      font-size: 20px;
      font-weight: 600;
    `;
    return title;
  }

  createQueryInput(initialQuery) {
    const label = document.createElement('label');
    label.textContent = 'Search Query:';
    label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;

    const input = document.createElement('textarea');
    input.id = 'sk-ai-query-input';
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

  createPromptInput() {
    const label = document.createElement('label');
    label.textContent = 'Prompt Template (optional):';
    label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: ${this.config.theme.fontSize};
      margin-bottom: 8px;
      cursor: pointer;
      box-sizing: border-box;
    `;

    const templates = [
      { value: '', label: 'None' },
      { value: 'provide a detailed summary', label: 'Detailed Summary' },
      { value: 'provide a short TL;DR summary', label: 'TL;DR', default: true },
      { value: 'fact-check the key claims and provide sources', label: 'Fact-Check with Sources' },
      { value: 'explain this in simple terms suitable for beginners', label: 'Explain Simply' }
    ];

    const defaultTemplate = templates.find(t => t.default) || templates[0];

    templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.value;
      option.textContent = template.label;
      if (template.default) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    const input = document.createElement('textarea');
    input.rows = 2;
    input.value = defaultTemplate.value;
    input.placeholder = 'Custom prompt template...';
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

    // Update editable box when dropdown changes
    select.addEventListener('change', () => {
      input.value = select.value;
    });

    return { label, input, select };
  }

  createServicesCheckboxes(selectedServices = null) {
    const label = document.createElement('label');
    label.textContent = 'Select AI Services:';
    label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;

    const container = document.createElement('div');
    container.id = 'sk-services-container';
    container.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 24px;
      padding: 16px;
      background: ${this.config.theme.colors.bgDark};
      border-radius: 4px;
      border: 1px solid ${this.config.theme.colors.border};
    `;

    this.services.forEach((service, index) => {
      const isChecked = selectedServices ? selectedServices.includes(service.name) : service.checked;
      const checkboxWrapper = this.createCheckbox(service, index, isChecked);
      container.appendChild(checkboxWrapper);
    });

    return { label, container };
  }

  createSelectAllButtons() {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      justify-content: flex-start;
    `;

    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.type = 'button';
    selectAllBtn.style.cssText = `
      padding: 4px 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.accentFg};
      font-family: ${this.config.theme.font};
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    selectAllBtn.onmouseenter = () => {
      selectAllBtn.style.background = this.config.theme.colors.border;
    };
    selectAllBtn.onmouseleave = () => {
      selectAllBtn.style.background = this.config.theme.colors.bgDark;
    };
    selectAllBtn.onclick = () => {
      this.services.forEach((_, index) => {
        const checkbox = document.getElementById(`sk-ai-${index}`);
        if (checkbox) checkbox.checked = true;
      });
    };

    const unselectAllBtn = document.createElement('button');
    unselectAllBtn.textContent = 'Unselect All';
    unselectAllBtn.type = 'button';
    unselectAllBtn.style.cssText = `
      padding: 4px 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.infoFg};
      font-family: ${this.config.theme.font};
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    unselectAllBtn.onmouseenter = () => {
      unselectAllBtn.style.background = this.config.theme.colors.border;
    };
    unselectAllBtn.onmouseleave = () => {
      unselectAllBtn.style.background = this.config.theme.colors.bgDark;
    };
    unselectAllBtn.onclick = () => {
      this.services.forEach((_, index) => {
        const checkbox = document.getElementById(`sk-ai-${index}`);
        if (checkbox) checkbox.checked = false;
      });
    };

    container.appendChild(selectAllBtn);
    container.appendChild(unselectAllBtn);
    return container;
  }

  createCheckbox(service, index, isChecked = true) {
    const wrapper = document.createElement('label');
    wrapper.style.cssText = `
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    wrapper.onmouseenter = () => {
      wrapper.style.background = this.config.theme.colors.border;
    };
    wrapper.onmouseleave = () => {
      wrapper.style.background = 'transparent';
    };

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isChecked;
    checkbox.id = `sk-ai-${index}`;
    checkbox.style.cssText = `
      margin-right: 10px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${this.config.theme.colors.accentFg};
    `;

    const label = document.createElement('span');
    label.textContent = service.name;
    label.style.cssText = `
      color: ${this.config.theme.colors.fg};
      font-size: 15px;
      cursor: pointer;
    `;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    return wrapper;
  }

  createButtons() {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;

    const cancelBtn = this.createCancelButton();
    const submitBtn = this.createSubmitButton();

    container.appendChild(cancelBtn);
    container.appendChild(submitBtn);
    return container;
  }

  createCancelButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Cancel';
    btn.style.cssText = `
      padding: 10px 24px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    btn.onmouseenter = () => {
      btn.style.background = this.config.theme.colors.border;
    };
    btn.onmouseleave = () => {
      btn.style.background = this.config.theme.colors.bgDark;
    };
    btn.onclick = () => {
      this.lastQuery = this.queryInput.value;
      this.close();
    };
    return btn;
  }

  createSubmitButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Open Selected AIs';
    btn.style.cssText = `
      padding: 10px 24px;
      background: ${this.config.theme.colors.accentFg};
      border: 1px solid ${this.config.theme.colors.accentFg};
      border-radius: 4px;
      color: ${this.config.theme.colors.bgDark};
      font-family: ${this.config.theme.font};
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;
    btn.onmouseenter = () => {
      btn.style.background = this.config.theme.colors.mainFg;
      btn.style.borderColor = this.config.theme.colors.mainFg;
    };
    btn.onmouseleave = () => {
      btn.style.background = this.config.theme.colors.accentFg;
      btn.style.borderColor = this.config.theme.colors.accentFg;
    };
    btn.onclick = () => this.handleSubmit();
    return btn;
  }

  handleSubmit() {
    const query = this.queryInput.value.trim();
    if (!query) {
      this.queryInput.focus();
      this.queryInput.style.borderColor = '#ff6b6b';
      setTimeout(() => {
        this.queryInput.style.borderColor = this.config.theme.colors.border;
      }, 1000);
      return;
    }

    const selectedUrls = this.services
      .filter((_, index) => document.getElementById(`sk-ai-${index}`).checked)
      .map(service => service.url);

    if (selectedUrls.length === 0) {
      alert('Please select at least one AI service');
      return;
    }

    // Save query for next time
    this.lastQuery = this.queryInput.value;

    // Combine query with prompt template if provided
    const promptTemplate = this.promptInput.value.trim();
    const combinedQuery = promptTemplate ? `${query}\n${promptTemplate}` : query;

    selectedUrls.forEach(url => api.tabOpenLink(url + encodeURIComponent(combinedQuery)));
    this.close();
  }

  updateQuery(text) {
    const input = document.getElementById('sk-ai-query-input');
    if (input && !this.lastQuery) {
      input.value = text;
      input.focus();
      input.select();
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

// --- Tab Search (workaround for focus bug) ---
api.mapkey('T', '#3Choose a tab', function() {
    api.Normal.feedkeys('ot');
    api.Normal.feedkeys('\x1b');
    api.Normal.feedkeys('T');
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