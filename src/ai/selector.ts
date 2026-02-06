/**
 * AI Selector Dialog
 */

import type { Config, AIServiceName } from '../config';
import { AI_SERVICES } from '../config';
import { PROMPT_TEMPLATES } from './templates';

interface AIService {
  name: AIServiceName;
  url: string;
  checked: boolean;
}

const TAB_WARNING_THRESHOLD = 12;

export class AiSelector {
  private config: Config;
  private lastQuery: string | null = null;
  private overlay: HTMLElement | null = null;
  private queryInput: HTMLTextAreaElement | null = null;
  private promptPreviewInput: HTMLTextAreaElement | null = null;
  private promptPreviewTitle: HTMLElement | null = null;
  private templateRows: HTMLElement[] = [];
  private promptDrafts: string[] = [];
  private selectedPromptIndexes = new Set<number>();
  private activePromptIndex: number | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private focusHandler: ((e: FocusEvent) => void) | null = null;
  private blurHandler: ((e: FocusEvent) => void) | null = null;

  private services: AIService[] = [
    { name: AI_SERVICES.CHATGPT, url: 'https://chatgpt.com/?prompt=', checked: true },
    { name: AI_SERVICES.DOUBAO, url: 'https://www.doubao.com/chat#sk_prompt=', checked: true },
    { name: AI_SERVICES.ALICE, url: 'https://alice.yandex.ru/?q=', checked: true },
    { name: AI_SERVICES.CLAUDE, url: 'https://claude.ai/new#sk_prompt=', checked: true },
    { name: AI_SERVICES.GEMINI, url: 'https://gemini.google.com/app#sk_prompt=', checked: true },
    { name: AI_SERVICES.PERPLEXITY, url: 'https://perplexity.ai?q=', checked: true },
    { name: AI_SERVICES.PERPLEXITY_RESEARCH, url: 'https://perplexity.ai#sk_prompt=&sk_mode=research&sk_social=on', checked: true },
    { name: AI_SERVICES.GROK, url: 'https://grok.com?q=', checked: true },
  ];

  constructor(config: Config) {
    this.config = config;
  }

  // ===========================================================================
  // Dialog Lifecycle
  // ===========================================================================

  show(initialQuery: string = '', selectedServices: AIServiceName[] | null = null): void {
    this.initializePromptState();

    this.overlay = this.createOverlay();
    const dialog = this.createDialog();
    const queryText = this.lastQuery !== null ? this.lastQuery : initialQuery;

    const title = this.createTitle();
    const { label: queryLabel, input: queryInput } = this.createQueryInput(queryText);
    const { label: promptLabel, controls: promptControls, picker: promptPicker } = this.createPromptPicker();
    const { label: servicesLabel, container: servicesContainer } = this.createServicesCheckboxes(selectedServices);
    const serviceSelectButtons = this.createServiceSelectButtons();
    const buttonsContainer = this.createButtons();

    this.queryInput = queryInput;

    [
      title,
      queryLabel,
      queryInput,
      promptLabel,
      promptPicker,
      promptControls,
      servicesLabel,
      servicesContainer,
      serviceSelectButtons,
      buttonsContainer,
    ].forEach(el => dialog.appendChild(el));
    this.overlay.appendChild(dialog);

    this.markAsSurfingKeys(this.overlay);

    document.body.appendChild(this.overlay);

    this.setupKeyboardHandler();
    this.setupFocusHandler();
    this.setupInitialFocus(queryInput);
    this.setupOverlayClickHandler();
  }

  close(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.focusHandler) {
      document.removeEventListener('focus', this.focusHandler, true);
      document.removeEventListener('focusin', this.focusHandler, true);
      this.focusHandler = null;
    }
    if (this.blurHandler && this.queryInput) {
      this.queryInput.removeEventListener('blur', this.blurHandler);
      this.blurHandler = null;
    }
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.queryInput = null;
    this.promptPreviewInput = null;
    this.promptPreviewTitle = null;
    this.templateRows = [];
    this.promptDrafts = [];
    this.selectedPromptIndexes.clear();
    this.activePromptIndex = null;
  }

  updateQuery(text: string): void {
    const input = document.getElementById('sk-ai-query-input') as HTMLTextAreaElement | null;
    if (input && !this.lastQuery) {
      input.value = text;
      input.focus();
      input.select();
    }
  }

  // ===========================================================================
  // SurfingKeys Integration
  // ===========================================================================

  private markAsSurfingKeys(element: HTMLElement): void {
    (element as any).fromSurfingKeys = true;
    element.querySelectorAll('*').forEach(child => {
      (child as any).fromSurfingKeys = true;
    });
  }

  private setupKeyboardHandler(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.overlay?.parentNode) return;

      const event = e as KeyboardEvent & { sk_suppressed?: boolean; sk_stopPropagation?: boolean };
      event.sk_suppressed = true;
      event.sk_stopPropagation = true;

      if (e.key === 'Tab') return;

      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'SELECT' && (e.key === 'j' || e.key === 'k')) {
        e.preventDefault();
        e.stopPropagation();
        const select = target as HTMLSelectElement;
        const delta = e.key === 'j' ? 1 : -1;
        const newIndex = select.selectedIndex + delta;
        if (newIndex >= 0 && newIndex < select.options.length) {
          select.selectedIndex = newIndex;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }

      e.stopPropagation();

      const isTextArea = target?.tagName === 'TEXTAREA';
      if (!isTextArea && target && this.overlay?.contains(target)) {
        if (this.tryHandlePromptTemplateKeyNav(e, target)) return;
        if (this.tryHandleServiceKeyNav(e, target)) return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.queryInput) this.lastQuery = this.queryInput.value;
        this.close();
      } else if (e.key === 'Enter') {
        const isTextArea = target?.tagName === 'TEXTAREA';
        if (!isTextArea || !e.shiftKey) {
          e.preventDefault();
          this.handleSubmit();
        }
      }
    };

    document.addEventListener('keydown', this.keyHandler, true);
  }

  private setupFocusHandler(): void {
    this.focusHandler = (e: FocusEvent) => {
      if (this.overlay?.contains(e.target as Node)) {
        const event = e as FocusEvent & { sk_suppressed?: boolean; sk_stopPropagation?: boolean };
        event.sk_suppressed = true;
        event.sk_stopPropagation = true;
      }
    };

    document.addEventListener('focus', this.focusHandler, true);
    document.addEventListener('focusin', this.focusHandler, true);
  }

  private setupInitialFocus(input: HTMLTextAreaElement): void {
    const simulateMouseEvents = () => {
      const rect = input.getBoundingClientRect();
      const eventOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      input.dispatchEvent(new MouseEvent('mousedown', eventOpts));
      input.dispatchEvent(new MouseEvent('click', eventOpts));
    };

    const startTime = Date.now();
    const FIGHT_DURATION_MS = 300;
    let focusWon = false;

    this.blurHandler = (e: FocusEvent) => {
      if (focusWon || Date.now() - startTime > FIGHT_DURATION_MS) return;

      if (e.relatedTarget && this.overlay?.contains(e.relatedTarget as Node)) {
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

    input.addEventListener('blur', this.blurHandler);

    simulateMouseEvents();
    input.focus();
    input.select();
  }

  private setupOverlayClickHandler(): void {
    this.overlay?.addEventListener('click', (e) => {
      const event = e as MouseEvent & { sk_suppressed?: boolean };
      event.sk_suppressed = true;
      if (e.target === this.overlay) {
        if (this.queryInput) this.lastQuery = this.queryInput.value;
        this.close();
      }
    });
  }

  private handleSubmit(): void {
    if (!this.queryInput) return;
    const query = this.queryInput.value.trim();
    if (!query) {
      this.queryInput.focus();
      this.queryInput.style.borderColor = '#ff6b6b';
      setTimeout(() => {
        if (this.queryInput) this.queryInput.style.borderColor = this.config.theme.colors.border;
      }, 1000);
      return;
    }

    const selectedUrls = this.services
      .filter((_, index) => (document.getElementById(`sk-ai-${index}`) as HTMLInputElement | null)?.checked)
      .map(service => service.url);

    if (selectedUrls.length === 0) {
      alert('Please select at least one AI service');
      return;
    }

    this.persistPreviewInput();
    const selectedPrompts = this.getSelectedPromptTexts();
    if (selectedPrompts.length === 0) {
      alert('Please select at least one prompt template');
      return;
    }

    const tabCount = selectedUrls.length * selectedPrompts.length;
    if (tabCount > TAB_WARNING_THRESHOLD) {
      const message = `This will open ${tabCount} tabs (${selectedUrls.length} services x ${selectedPrompts.length} prompts). Continue?`;
      if (!window.confirm(message)) return;
    }

    this.lastQuery = this.queryInput.value;

    selectedUrls.forEach(url => {
      selectedPrompts.forEach(promptTemplate => {
        const combinedQuery = promptTemplate ? `${query} \n${promptTemplate}` : query;
        api.tabOpenLink(url + encodeURIComponent(combinedQuery));
      });
    });
    this.close();
  }

  private initializePromptState(): void {
    this.promptDrafts = PROMPT_TEMPLATES.map(template => template.value);
    this.selectedPromptIndexes.clear();

    PROMPT_TEMPLATES.forEach((template, index) => {
      if (template.default) this.selectedPromptIndexes.add(index);
    });

    if (this.selectedPromptIndexes.size === 0 && PROMPT_TEMPLATES.length > 0) {
      this.selectedPromptIndexes.add(0);
    }

    if (PROMPT_TEMPLATES.length === 0) {
      this.activePromptIndex = null;
      return;
    }

    const selectedIndexes = this.getSelectedPromptIndexesInOrder();
    this.activePromptIndex = selectedIndexes.length > 0 ? selectedIndexes[0] : 0;
  }

  private persistPreviewInput(): void {
    if (this.activePromptIndex === null || !this.promptPreviewInput) return;
    this.promptDrafts[this.activePromptIndex] = this.promptPreviewInput.value;
  }

  private setActivePrompt(index: number, persistCurrent: boolean = true, focusPreview: boolean = true): void {
    if (index < 0 || index >= this.promptDrafts.length) return;

    if (persistCurrent) {
      this.persistPreviewInput();
    }
    this.activePromptIndex = index;

    if (this.promptPreviewInput) {
      this.promptPreviewInput.value = this.promptDrafts[index] || '';
      if (focusPreview) {
        this.promptPreviewInput.focus();
        this.promptPreviewInput.selectionStart = this.promptPreviewInput.value.length;
        this.promptPreviewInput.selectionEnd = this.promptPreviewInput.value.length;
      }
    }

    this.updatePromptPreviewTitle();
    this.updatePromptRowStyles();
  }

  private updatePromptPreviewTitle(): void {
    if (!this.promptPreviewTitle) return;
    if (this.activePromptIndex === null) {
      this.promptPreviewTitle.textContent = 'Preview / Edit';
      return;
    }

    const activeTemplate = PROMPT_TEMPLATES[this.activePromptIndex];
    this.promptPreviewTitle.textContent = `Preview / Edit: ${activeTemplate?.label || 'Custom'}`;
  }

  private updatePromptRowStyles(): void {
    this.templateRows.forEach((row, index) => {
      const isActive = this.activePromptIndex === index;
      const isSelected = this.selectedPromptIndexes.has(index);
      row.style.borderColor = isActive ? this.config.theme.colors.mainFg : this.config.theme.colors.border;
      row.style.background = isActive ? this.config.theme.colors.border : 'transparent';

      const text = row.querySelector('span');
      if (text) {
        (text as HTMLElement).style.color = isSelected ? this.config.theme.colors.accentFg : this.config.theme.colors.fg;
      }
    });
  }

  private getSelectedPromptIndexesInOrder(): number[] {
    const selectedIndexes: number[] = [];
    PROMPT_TEMPLATES.forEach((_, index) => {
      if (this.selectedPromptIndexes.has(index)) selectedIndexes.push(index);
    });
    return selectedIndexes;
  }

  private getSelectedPromptTexts(): string[] {
    const selectedIndexes = this.getSelectedPromptIndexesInOrder();
    const uniquePrompts = new Set<string>();
    const promptTexts: string[] = [];

    selectedIndexes.forEach(index => {
      const promptText = (this.promptDrafts[index] || '').trim();
      if (uniquePrompts.has(promptText)) return;
      uniquePrompts.add(promptText);
      promptTexts.push(promptText);
    });

    return promptTexts;
  }

  // ===========================================================================
  // Keyboard Navigation Helpers
  // ===========================================================================

  private tryHandlePromptTemplateKeyNav(e: KeyboardEvent, target: HTMLElement): boolean {
    const index = this.getPromptTemplateIndexFromTarget(target);
    if (index === null) return false;

    let nextIndex: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'j') nextIndex = index + 1;
    else if (e.key === 'ArrowUp' || e.key === 'k') nextIndex = index - 1;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = PROMPT_TEMPLATES.length - 1;
    else return false;

    e.preventDefault();

    if (nextIndex < 0 || nextIndex >= PROMPT_TEMPLATES.length) return true;

    const next = document.getElementById(`sk-template-${nextIndex}`) as HTMLInputElement | null;
    if (next) {
      next.focus();
      next.scrollIntoView({ block: 'nearest' });
    }
    this.setActivePrompt(nextIndex, true, false);
    return true;
  }

  private tryHandleServiceKeyNav(e: KeyboardEvent, target: HTMLElement): boolean {
    const index = this.getServiceIndexFromTarget(target);
    if (index === null) return false;

    let nextIndex: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'j') nextIndex = index + 1;
    else if (e.key === 'ArrowUp' || e.key === 'k') nextIndex = index - 1;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = this.services.length - 1;
    else return false;

    e.preventDefault();

    if (nextIndex < 0 || nextIndex >= this.services.length) return true;

    const next = document.getElementById(`sk-ai-${nextIndex}`) as HTMLInputElement | null;
    if (next) {
      next.focus();
      next.scrollIntoView({ block: 'nearest' });
    }
    return true;
  }

  private getPromptTemplateIndexFromTarget(target: HTMLElement): number | null {
    if (target.id) {
      const match = /^sk-template-(\d+)$/.exec(target.id);
      if (match) return Number(match[1]);
    }

    const row = target.closest('[data-sk-template-index]') as HTMLElement | null;
    const rowIndex = row?.dataset?.skTemplateIndex;
    if (rowIndex) {
      const n = Number(rowIndex);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  private getServiceIndexFromTarget(target: HTMLElement): number | null {
    if (target.id) {
      const match = /^sk-ai-(\d+)$/.exec(target.id);
      if (match) return Number(match[1]);
    }

    const row = target.closest('[data-sk-service-index]') as HTMLElement | null;
    const rowIndex = row?.dataset?.skServiceIndex;
    if (rowIndex) {
      const n = Number(rowIndex);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  // ===========================================================================
  // DOM Creation
  // ===========================================================================

  private createOverlay(): HTMLElement {
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

  private createDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: ${this.config.theme.colors.bg};
      border: 2px solid ${this.config.theme.colors.border};
      border-radius: 8px;
      padding: 24px;
      width: min(920px, 92vw);
      max-height: 88vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      color: ${this.config.theme.colors.fg};
    `;
    return dialog;
  }

  private createTitle(): HTMLElement {
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

  private createQueryInput(initialQuery: string): { label: HTMLElement; input: HTMLTextAreaElement } {
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
    input.rows = 4;
    input.style.cssText = `
      width: 100%;
      min-height: 110px;
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

  private createPromptPicker(): { label: HTMLElement; controls: HTMLElement; picker: HTMLElement } {
    const label = document.createElement('label');
    label.textContent = 'Prompt Templates:';
    label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;

    const controls = this.createPromptSelectButtons();

    const picker = document.createElement('div');
    picker.style.cssText = `
      display: grid;
      grid-template-columns: minmax(220px, 38%) 1fr;
      gap: 12px;
      margin-bottom: 8px;
    `;

    const leftPane = document.createElement('div');
    leftPane.style.cssText = `
      display: flex;
      flex-direction: column;
      min-height: 280px;
      gap: 8px;
    `;

    const leftTitle = document.createElement('div');
    leftTitle.textContent = 'Templates';
    leftTitle.style.cssText = `
      color: ${this.config.theme.colors.mainFg};
      font-size: 13px;
      font-weight: 600;
    `;

    const templateList = document.createElement('div');
    templateList.style.cssText = `
      max-height: 280px;
      overflow-y: auto;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      padding: 8px;
      flex: 1;
      box-sizing: border-box;
    `;

    this.templateRows = [];
    PROMPT_TEMPLATES.forEach((template, index) => {
      const row = this.createPromptTemplateRow(template.label, index);
      this.templateRows.push(row);
      templateList.appendChild(row);
    });

    const rightPane = document.createElement('div');
    rightPane.style.cssText = `
      display: flex;
      flex-direction: column;
      min-height: 280px;
      gap: 8px;
    `;

    const previewTitle = document.createElement('div');
    previewTitle.style.cssText = `
      color: ${this.config.theme.colors.mainFg};
      font-size: 13px;
      font-weight: 600;
    `;
    this.promptPreviewTitle = previewTitle;

    const input = document.createElement('textarea');
    input.rows = 12;
    input.placeholder = 'Template preview / editor...';
    input.style.cssText = `
      width: 100%;
      min-height: 220px;
      padding: 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: ${this.config.theme.fontSize};
      resize: vertical;
      box-sizing: border-box;
      flex: 1;
    `;
    input.addEventListener('input', () => {
      if (this.activePromptIndex === null) return;
      this.promptDrafts[this.activePromptIndex] = input.value;
    });
    this.promptPreviewInput = input;

    leftPane.appendChild(leftTitle);
    leftPane.appendChild(templateList);

    rightPane.appendChild(previewTitle);
    rightPane.appendChild(input);

    picker.appendChild(leftPane);
    picker.appendChild(rightPane);

    if (this.activePromptIndex !== null) {
      this.setActivePrompt(this.activePromptIndex, false);
    } else {
      this.updatePromptPreviewTitle();
      this.updatePromptRowStyles();
    }

    return { label, controls, picker };
  }

  private createPromptTemplateRow(templateLabel: string, index: number): HTMLElement {
    const row = document.createElement('div');
    row.dataset.skTemplateIndex = String(index);
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid ${this.config.theme.colors.border};
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    row.onclick = () => this.setActivePrompt(index);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `sk-template-${index}`;
    checkbox.checked = this.selectedPromptIndexes.has(index);
    checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: ${this.config.theme.colors.accentFg};
    `;
    checkbox.addEventListener('click', e => e.stopPropagation());
    checkbox.addEventListener('focus', () => this.setActivePrompt(index, true, false));
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        this.selectedPromptIndexes.add(index);
      } else {
        this.selectedPromptIndexes.delete(index);
      }
      this.setActivePrompt(index, true, false);
    });

    const label = document.createElement('span');
    label.textContent = templateLabel;
    label.style.cssText = `
      font-size: 13px;
      line-height: 1.35;
      color: ${this.config.theme.colors.fg};
      user-select: none;
    `;

    row.appendChild(checkbox);
    row.appendChild(label);
    return row;
  }

  private createPromptSelectButtons(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      justify-content: flex-start;
    `;

    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = 'Select All Prompts';
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
      PROMPT_TEMPLATES.forEach((_, index) => {
        this.selectedPromptIndexes.add(index);
        const checkbox = document.getElementById(`sk-template-${index}`) as HTMLInputElement | null;
        if (checkbox) checkbox.checked = true;
      });
      if (this.activePromptIndex === null && PROMPT_TEMPLATES.length > 0) {
        this.setActivePrompt(0);
        return;
      }
      this.updatePromptRowStyles();
    };

    const unselectAllBtn = document.createElement('button');
    unselectAllBtn.textContent = 'Unselect All Prompts';
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
      this.selectedPromptIndexes.clear();
      PROMPT_TEMPLATES.forEach((_, index) => {
        const checkbox = document.getElementById(`sk-template-${index}`) as HTMLInputElement | null;
        if (checkbox) checkbox.checked = false;
      });
      this.updatePromptRowStyles();
    };

    container.appendChild(selectAllBtn);
    container.appendChild(unselectAllBtn);
    return container;
  }

  private createServicesCheckboxes(selectedServices: AIServiceName[] | null = null): { label: HTMLElement; container: HTMLElement } {
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
      margin-bottom: 8px;
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

  private createServiceSelectButtons(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
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
        const checkbox = document.getElementById(`sk-ai-${index}`) as HTMLInputElement | null;
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
        const checkbox = document.getElementById(`sk-ai-${index}`) as HTMLInputElement | null;
        if (checkbox) checkbox.checked = false;
      });
    };

    container.appendChild(selectAllBtn);
    container.appendChild(unselectAllBtn);
    return container;
  }

  private createCheckbox(service: AIService, index: number, isChecked: boolean = true): HTMLElement {
    const wrapper = document.createElement('label');
    wrapper.dataset.skServiceIndex = String(index);
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

  private createButtons(): HTMLElement {
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

  private createCancelButton(): HTMLElement {
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
      if (this.queryInput) this.lastQuery = this.queryInput.value;
      this.close();
    };
    return btn;
  }

  private createSubmitButton(): HTMLElement {
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
}
