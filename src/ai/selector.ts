/**
 * AI Selector Dialog
 */

import type { Config, AIServiceName } from '../config';
import { AI_SERVICES } from '../config';
import {
  formatCombinedQuery,
  PROMPT_CATEGORY_LABELS,
  PROMPT_CATEGORY_ORDER,
  PROMPT_TEMPLATES,
  templateSearchHaystack,
  type PromptCategory,
  type PromptTemplate,
} from './templates';

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
  private clipboardText: string | null = null;
  private clipboardIndicator: HTMLElement | null = null;
  private templateRows: HTMLElement[] = [];
  private templateFilterInput: HTMLInputElement | null = null;
  private templateFilterStatus: HTMLElement | null = null;
  private templateCategoryHeadings = new Map<PromptCategory, HTMLElement>();
  private promptDrafts: string[] = [];
  private selectedPromptIndexes = new Set<number>();
  private activePromptIndex: number | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private focusHandler: ((e: FocusEvent) => void) | null = null;
  private blurHandler: ((e: FocusEvent) => void) | null = null;

  private services: AIService[] = [
    { name: AI_SERVICES.CHATGPT, url: 'https://chatgpt.com/?prompt=', checked: true },
    { name: AI_SERVICES.DOUBAO, url: 'https://www.doubao.com/chat#sk_prompt=', checked: true },
    { name: AI_SERVICES.CLAUDE, url: 'https://claude.ai/new#sk_prompt=', checked: true },
    { name: AI_SERVICES.GEMINI, url: 'https://gemini.google.com/app#sk_prompt=', checked: true },
    { name: AI_SERVICES.PERPLEXITY, url: 'https://perplexity.ai?q=', checked: true },
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
    this.clipboardText = null;

    this.overlay = this.createOverlay();
    const dialog = this.createDialog();
    const queryText = this.lastQuery !== null ? this.lastQuery : initialQuery;

    const title = this.createTitle();
    const footerHints = this.createFooterHints();
    const { label: queryLabel, input: queryInput } = this.createQueryInput(queryText);
    const { label: promptLabel, picker: promptPicker } = this.createPromptPicker();
    const { label: servicesLabel, container: servicesContainer } = this.createServicesCheckboxes(selectedServices);
    const serviceSelectButtons = this.createServiceSelectButtons();
    const buttonsContainer = this.createButtons();

    this.queryInput = queryInput;

    [
      title,
      footerHints,
      queryLabel,
      queryInput,
      promptLabel,
      promptPicker,
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
    this.clipboardText = null;
    this.clipboardIndicator = null;
    this.templateRows = [];
    this.templateFilterInput = null;
    this.templateFilterStatus = null;
    this.templateCategoryHeadings.clear();
    this.promptDrafts = [];
    this.selectedPromptIndexes.clear();
    this.activePromptIndex = null;
  }

  updateQuery(text: string): void {
    this.clipboardText = text;
    this.updateClipboardIndicator();

    const input = this.queryInput ?? (document.getElementById('sk-ai-query-input') as HTMLTextAreaElement | null);
    if (!input) return;

    if (!this.lastQuery) {
      input.value = text;
      input.focus();
      input.select();
      this.updateClipboardIndicator();
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

      const target = e.target as HTMLElement | null;

      if (e.key === 'Tab') {
        const templateIndex = target ? this.getPromptTemplateIndexFromTarget(target) : null;
        if (templateIndex !== null && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          this.promptPreviewInput?.focus();
          return;
        }
        if (e.shiftKey && target === this.promptPreviewInput) {
          e.preventDefault();
          e.stopPropagation();
          const idx = this.activePromptIndex ?? 0;
          const checkbox = document.getElementById(`sk-template-${idx}`) as HTMLInputElement | null;
          checkbox?.focus();
          return;
        }
        return;
      }
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
        if (isTextArea && e.shiftKey) return;

        if (target === this.templateFilterInput) {
          e.preventDefault();
          const first = this.findFirstVisibleTemplateIndex();
          if (first !== null) {
            const checkbox = document.getElementById(`sk-template-${first}`) as HTMLInputElement | null;
            checkbox?.focus();
            this.setActivePrompt(first, true, false);
          }
          return;
        }

        e.preventDefault();
        this.handleSubmit();
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
        api.tabOpenLink(url + encodeURIComponent(formatCombinedQuery(query, promptTemplate)));
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
    PROMPT_TEMPLATES.forEach((_, index) => {
      const row = this.templateRows[index];
      if (!row) return;

      const isActive = this.activePromptIndex === index;
      const isSelected = this.selectedPromptIndexes.has(index);
      row.style.borderColor = isActive ? this.config.theme.colors.mainFg : this.config.theme.colors.border;
      row.style.background = isActive ? this.config.theme.colors.border : 'transparent';

      const title = row.querySelector('span');
      if (title) {
        (title as HTMLElement).style.color = isSelected
          ? this.config.theme.colors.accentFg
          : this.config.theme.colors.fg;
      }

      const description = row.querySelector('[data-sk-template-description]') as HTMLElement | null;
      if (description) {
        description.style.display = isActive ? 'block' : 'none';
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

  private isTemplateRowVisible(index: number): boolean {
    const row = this.templateRows[index];
    return !!row && row.style.display !== 'none';
  }

  private findFirstVisibleTemplateIndex(): number | null {
    for (let i = 0; i < PROMPT_TEMPLATES.length; i++) {
      if (this.isTemplateRowVisible(i)) return i;
    }
    return null;
  }

  private findLastVisibleTemplateIndex(): number | null {
    for (let i = PROMPT_TEMPLATES.length - 1; i >= 0; i--) {
      if (this.isTemplateRowVisible(i)) return i;
    }
    return null;
  }

  private findAdjacentVisibleTemplateIndex(from: number, delta: number): number | null {
    let i = from + delta;
    while (i >= 0 && i < PROMPT_TEMPLATES.length) {
      if (this.isTemplateRowVisible(i)) return i;
      i += delta;
    }
    return null;
  }

  private focusTemplateIndex(index: number): void {
    const checkbox = document.getElementById(`sk-template-${index}`) as HTMLInputElement | null;
    if (checkbox) {
      checkbox.focus();
      checkbox.scrollIntoView({ block: 'nearest' });
    }
    this.setActivePrompt(index, true, false);
  }

  private getFilterQuery(): string {
    return (this.templateFilterInput?.value ?? '').trim().toLowerCase();
  }

  private templateMatchesFilter(index: number): boolean {
    const q = this.getFilterQuery();
    if (!q) return true;
    return templateSearchHaystack(PROMPT_TEMPLATES[index]).includes(q);
  }

  /** Show rows that match the filter or are already selected. */
  private shouldShowTemplateRow(index: number): boolean {
    return this.templateMatchesFilter(index) || this.selectedPromptIndexes.has(index);
  }

  private getVisibleTemplateIndexes(): number[] {
    const visible: number[] = [];
    PROMPT_TEMPLATES.forEach((_, index) => {
      if (this.shouldShowTemplateRow(index)) visible.push(index);
    });
    return visible;
  }

  private applyTemplateFilter(raw?: string): void {
    if (raw !== undefined && this.templateFilterInput) {
      this.templateFilterInput.value = raw;
    }
    const categoryHasVisible = new Map<PromptCategory, boolean>();

    PROMPT_TEMPLATES.forEach((template, index) => {
      const row = this.templateRows[index];
      if (!row) return;

      const show = this.shouldShowTemplateRow(index);
      row.style.display = show ? '' : 'none';
      if (show) categoryHasVisible.set(template.category, true);
    });

    this.templateCategoryHeadings.forEach((heading, category) => {
      heading.style.display = categoryHasVisible.get(category) ? '' : 'none';
    });

    this.updateTemplateFilterStatus();
  }

  private updateTemplateFilterStatus(): void {
    if (!this.templateFilterStatus) return;

    const q = this.getFilterQuery();
    const matched = PROMPT_TEMPLATES.filter((_, i) => this.templateMatchesFilter(i)).length;
    const visible = this.getVisibleTemplateIndexes().length;
    const selected = this.selectedPromptIndexes.size;

    if (!q) {
      this.templateFilterStatus.textContent = `${PROMPT_TEMPLATES.length} templates · ${selected} selected`;
      return;
    }

    const selectedOutsideFilter = [...this.selectedPromptIndexes].filter(i => !this.templateMatchesFilter(i)).length;
    const extra =
      selectedOutsideFilter > 0
        ? ` · ${selectedOutsideFilter} selected shown outside filter`
        : '';
    this.templateFilterStatus.textContent = `${visible} shown (${matched} match, ${selected} selected)${extra}`;
  }

  private tryHandlePromptTemplateKeyNav(e: KeyboardEvent, target: HTMLElement): boolean {
    const index = this.getPromptTemplateIndexFromTarget(target);
    if (index === null) return false;

    let nextIndex: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'j') {
      nextIndex = this.findAdjacentVisibleTemplateIndex(index, 1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      nextIndex = this.findAdjacentVisibleTemplateIndex(index, -1);
    } else if (e.key === 'Home') {
      nextIndex = this.findFirstVisibleTemplateIndex();
    } else if (e.key === 'End') {
      nextIndex = this.findLastVisibleTemplateIndex();
    } else return false;

    e.preventDefault();

    if (nextIndex === null) return true;

    this.focusTemplateIndex(nextIndex);
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

  private updateClipboardIndicator(): void {
    if (!this.clipboardIndicator || !this.queryInput) return;

    const clipboard = (this.clipboardText ?? '').replace(/\r\n/g, '\n').trim();
    const query = (this.queryInput.value ?? '').replace(/\r\n/g, '\n').trim();

    const shouldShow = clipboard.length > 0 && clipboard !== query;
    this.clipboardIndicator.style.display = shouldShow ? 'inline-flex' : 'none';
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
      margin: 0 0 8px 0;
      color: ${this.config.theme.colors.accentFg};
      font-size: 20px;
      font-weight: 600;
    `;
    return title;
  }

  private createFooterHints(): HTMLElement {
    const hints = document.createElement('p');
    hints.textContent =
      'Enter: send · Shift+Enter: newline · Filter: match + keep selected · Select shown · Templates+Tab: preview · Esc: close';
    hints.style.cssText = `
      margin: 0 0 16px 0;
      color: ${this.config.theme.colors.infoFg};
      font-size: 12px;
      line-height: 1.4;
    `;
    return hints;
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

    const clipboardIndicator = document.createElement('span');
    clipboardIndicator.textContent = 'Clipboard different';
    clipboardIndicator.title = 'Clipboard differs from query';
    clipboardIndicator.style.cssText = `
      display: none;
      align-items: center;
      justify-content: center;
      margin-left: 10px;
      padding: 2px 10px;
      border-radius: 999px;
      border: 1px solid ${this.config.theme.colors.border};
      background: ${this.config.theme.colors.bgDark};
      color: ${this.config.theme.colors.infoFg};
      font-family: ${this.config.theme.font};
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      user-select: none;
      vertical-align: middle;
    `;
    this.clipboardIndicator = clipboardIndicator;
    label.appendChild(clipboardIndicator);

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
    input.addEventListener('input', () => this.updateClipboardIndicator());

    return { label, input };
  }

  private createPromptPicker(): { label: HTMLElement; picker: HTMLElement } {
    const label = document.createElement('label');
    label.textContent = 'Prompt Templates:';
    label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;

    const picker = document.createElement('div');
    picker.style.cssText = `
      display: grid;
      grid-template-columns: minmax(280px, 44%) 1fr;
      gap: 12px;
      margin-bottom: 8px;
      align-items: stretch;
      min-height: min(58vh, 560px);
    `;

    const leftPane = document.createElement('div');
    leftPane.style.cssText = `
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      gap: 6px;
    `;

    const leftTitle = document.createElement('div');
    leftTitle.textContent = 'Templates';
    leftTitle.style.cssText = `
      color: ${this.config.theme.colors.mainFg};
      font-size: 13px;
      font-weight: 600;
    `;

    const filterInput = document.createElement('input');
    filterInput.type = 'search';
    filterInput.id = 'sk-template-filter';
    filterInput.placeholder = 'Filter templates…';
    filterInput.autocomplete = 'off';
    filterInput.spellcheck = false;
    filterInput.style.cssText = `
      width: 100%;
      padding: 8px 10px;
      background: ${this.config.theme.colors.bg};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: 13px;
      box-sizing: border-box;
    `;
    filterInput.addEventListener('input', () => this.applyTemplateFilter());
    this.templateFilterInput = filterInput;

    const filterStatus = document.createElement('div');
    filterStatus.style.cssText = `
      font-size: 11px;
      color: ${this.config.theme.colors.mainFg};
      line-height: 1.3;
      min-height: 14px;
    `;
    this.templateFilterStatus = filterStatus;

    const templateSelectButtons = this.createPromptSelectButtons();

    const templateList = document.createElement('div');
    templateList.style.cssText = `
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      padding: 6px;
      box-sizing: border-box;
    `;

    this.templateRows = new Array(PROMPT_TEMPLATES.length);
    this.templateCategoryHeadings.clear();
    PROMPT_CATEGORY_ORDER.forEach(category => {
      const indexes = PROMPT_TEMPLATES.map((t, i) => (t.category === category ? i : -1)).filter(i => i >= 0);
      if (indexes.length === 0) return;

      const heading = document.createElement('div');
      heading.textContent = PROMPT_CATEGORY_LABELS[category];
      heading.dataset.skCategoryHeading = category;
      heading.style.cssText = `
        color: ${this.config.theme.colors.infoFg};
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin: 10px 0 6px 0;
      `;
      this.templateCategoryHeadings.set(category, heading);
      templateList.appendChild(heading);

      indexes.forEach(index => {
        const row = this.createPromptTemplateRow(PROMPT_TEMPLATES[index], index);
        this.templateRows[index] = row;
        templateList.appendChild(row);
      });
    });

    const rightPane = document.createElement('div');
    rightPane.style.cssText = `
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
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
    leftPane.appendChild(filterInput);
    leftPane.appendChild(filterStatus);
    leftPane.appendChild(templateSelectButtons);
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

    this.applyTemplateFilter();

    return { label, picker };
  }

  private createPromptTemplateRow(template: PromptTemplate, index: number): HTMLElement {
    const row = document.createElement('div');
    row.dataset.skTemplateIndex = String(index);
    row.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 5px 6px;
      border-radius: 4px;
      border: 1px solid ${this.config.theme.colors.border};
      margin-bottom: 4px;
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
      margin-top: 2px;
      cursor: pointer;
      flex-shrink: 0;
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
      this.applyTemplateFilter();
      this.setActivePrompt(index, true, false);
    });

    const textCol = document.createElement('div');
    textCol.style.cssText = `flex: 1; min-width: 0;`;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    `;

    const label = document.createElement('span');
    label.textContent = template.label;
    label.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      line-height: 1.35;
      color: ${this.config.theme.colors.fg};
      user-select: none;
    `;

    const tierBadge = document.createElement('span');
    tierBadge.textContent = template.tier;
    const tierColor =
      template.category === 'experimental'
        ? this.config.theme.colors.infoFg
        : template.tier === 'short'
          ? this.config.theme.colors.accentFg
          : this.config.theme.colors.mainFg;
    tierBadge.style.cssText = `
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid ${this.config.theme.colors.border};
      color: ${tierColor};
      user-select: none;
    `;

    titleRow.appendChild(label);
    titleRow.appendChild(tierBadge);

    const description = document.createElement('div');
    description.textContent = template.description;
    description.dataset.skTemplateDescription = String(index);
    description.style.cssText = `
      font-size: 11px;
      line-height: 1.3;
      color: ${this.config.theme.colors.mainFg};
      margin-top: 2px;
      user-select: none;
      display: none;
    `;

    textCol.appendChild(titleRow);
    textCol.appendChild(description);

    row.appendChild(checkbox);
    row.appendChild(textCol);
    return row;
  }

  private createPromptSelectButtons(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 0;
      justify-content: flex-start;
      flex-wrap: wrap;
    `;

    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = 'Select shown';
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
      const visible = this.getVisibleTemplateIndexes();
      visible.forEach(index => {
        this.selectedPromptIndexes.add(index);
        const checkbox = document.getElementById(`sk-template-${index}`) as HTMLInputElement | null;
        if (checkbox) checkbox.checked = true;
      });
      this.applyTemplateFilter();
      if (this.activePromptIndex === null && visible.length > 0) {
        this.setActivePrompt(visible[0]);
        return;
      }
      this.updatePromptRowStyles();
    };

    const unselectAllBtn = document.createElement('button');
    unselectAllBtn.textContent = 'Unselect shown';
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
      this.getVisibleTemplateIndexes().forEach(index => {
        this.selectedPromptIndexes.delete(index);
        const checkbox = document.getElementById(`sk-template-${index}`) as HTMLInputElement | null;
        if (checkbox) checkbox.checked = false;
      });
      this.applyTemplateFilter();
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
