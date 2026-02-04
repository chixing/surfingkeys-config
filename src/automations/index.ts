import type { Config } from '../config';
import * as utils from '../utils';

interface SiteAutomation {
  host: string;
  run: () => void | Promise<void>;
}

function createSiteAutomations(config: Config): SiteAutomation[] {
  return [
    {
      host: 'chatgpt.com',
      run: async () => {
        const params = new URLSearchParams(window.location.search);
        const promptParam = params.get('prompt') || params.get('q');
        if (!promptParam) return;

        const isVisible = (el: HTMLElement): boolean => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        const isEnabledButton = (el: HTMLElement | null): el is HTMLButtonElement => {
          if (!(el instanceof HTMLButtonElement)) return false;
          if (!el.isConnected || !isVisible(el)) return false;
          return !el.disabled && el.getAttribute('aria-disabled') !== 'true';
        };

        const getEditor = (): HTMLElement | null =>
          document.querySelector<HTMLElement>('#prompt-textarea, div.ProseMirror[contenteditable="true"]');

        const hasEditorText = (el: HTMLElement | null): boolean =>
          !!el && el.textContent?.trim().length !== 0;

        const getSubmitButton = (): HTMLElement | null =>
          (document.getElementById('composer-submit-button') as HTMLElement | null) ||
          (document.querySelector('button[aria-label*="send" i]') as HTMLElement | null);

        const pointerClick = (el: HTMLElement): void => {
          const rect = el.getBoundingClientRect();
          const opts: PointerEventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            pointerType: 'mouse',
            isPrimary: true,
          };
          el.dispatchEvent(new PointerEvent('pointerdown', opts));
          el.dispatchEvent(new PointerEvent('pointerup', opts));
          el.click();
        };

        const sendEnter = (el: HTMLElement): void => {
          const eventInit = {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
          };
          el.focus();
          el.dispatchEvent(new KeyboardEvent('keydown', eventInit));
          el.dispatchEvent(new KeyboardEvent('keyup', eventInit));
        };

        await utils.delay(config.delayMs);

        for (let i = 0; i < 60; i++) {
          const editor = getEditor();
          const submitBtn = getSubmitButton();
          if (hasEditorText(editor) && isEnabledButton(submitBtn)) {
            pointerClick(submitBtn);
            await utils.delay(250);
            if (window.location.pathname === '/' && isEnabledButton(getSubmitButton()) && editor) {
              sendEnter(editor);
            }
            return;
          }
          await utils.delay(150);
        }
      }
    },
    {
      host: 'gemini.google.com',
      run: () => utils.injectPrompt({
        selector: 'div[contenteditable="true"][role="textbox"]'
      }, config)
    },
    {
      host: 'claude.ai',
      run: () => utils.injectPrompt({
        selector: 'div[contenteditable="true"]',
        submitSelector: () =>
          (document.querySelector('button[type="submit"]') as HTMLElement | null) ||
          (document.querySelector('button.send-button') as HTMLElement | null) ||
          (document.querySelector('button[aria-label*="send" i]') as HTMLElement | null) ||
          (document.querySelector('button svg[class*="send"]')?.closest('button') as HTMLElement | null)
      }, config)
    },
    {
      host: 'www.doubao.com',
      run: () => utils.injectPrompt({
        selector: 'textarea[placeholder], div[contenteditable="true"]',
        useValue: true,
        dispatchEvents: true,
        submitSelector: () =>
          (document.querySelector('button[type="submit"]') as HTMLElement | null) ||
          (document.querySelector('button.send-button') as HTMLElement | null) ||
          (document.querySelector('button[aria-label*="send" i]') as HTMLElement | null) ||
          (document.querySelector('button svg[class*="send"]')?.closest('button') as HTMLElement | null)
      }, config)
    },
    {
      host: 'yandex.ru',
      run: async () => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q) {
          await utils.delay(config.delayMs);
          const box = document.querySelector<HTMLElement>(
            'textarea[placeholder], input[type="text"], input[class*="input"], div[contenteditable="true"]'
          );
          if (box) {
            box.focus();
            (box as HTMLInputElement).value = q;
            box.dispatchEvent(new Event('input', { bubbles: true }));
            box.dispatchEvent(new Event('change', { bubbles: true }));
            await utils.delay(config.delayMs);
            utils.pressKey(box);
          }
        }
      }
    },
    {
      host: 'perplexity.ai',
      run: async () => {
        const hash = window.location.hash;
        if (!hash.includes('sk_')) return;

        for (let i = 0; i < 50; i++) {
          if (document.querySelector('[role="textbox"]')) break;
          await utils.delay(100);
        }

        const hashContent = hash.substring(1);
        let query = '';
        if (hash.includes('sk_social=on')) {
          const afterSocial = hashContent.split('sk_social=on')[1];
          if (afterSocial) query = decodeURIComponent(afterSocial).replace(/^[&?]/, '').trim();
        } else if (hash.includes('sk_prompt=')) {
          const match = hashContent.match(/sk_prompt=([^&]*)/);
          if (match?.[1]) query = decodeURIComponent(match[1]);
        }

        const pointerClick = (el: HTMLElement) => {
          const rect = el.getBoundingClientRect();
          const opts: PointerEventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            pointerType: 'mouse',
            isPrimary: true,
          };
          el.focus();
          el.dispatchEvent(new PointerEvent('pointerdown', opts));
          el.dispatchEvent(new PointerEvent('pointerup', opts));
          el.click();
        };

        const normalizeText = (text: string): string =>
          text.replace(/\s+/g, ' ').trim().toLowerCase();

        const elementLabel = (el: HTMLElement): string => normalizeText([
          el.textContent,
          el.getAttribute('aria-label'),
          el.getAttribute('title')
        ].filter(Boolean).join(' '));

        const isVisible = (el: HTMLElement): boolean => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        const sendEnter = (el: HTMLElement): void => {
          const eventInit = {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
          };
          el.dispatchEvent(new KeyboardEvent('keydown', eventInit));
          el.dispatchEvent(new KeyboardEvent('keyup', eventInit));
        };

        const openMenus = (): HTMLElement[] =>
          Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"]')).filter(isVisible);

        const findPrimaryToolsMenu = (): HTMLElement | null => {
          for (const menu of openMenus()) {
            const hasDeepResearch = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
              .some(item => elementLabel(item).includes('deep research'));
            const hasConnectors = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
              .some(item => {
                const label = elementLabel(item);
                return label.includes('connectors') && label.includes('sources');
              });
            if (hasDeepResearch || hasConnectors) return menu;
          }
          return null;
        };

        const findSourcesSubMenu = (): HTMLElement | null => {
          for (const menu of openMenus()) {
            const checkboxes = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]'));
            const hasWeb = checkboxes.some(item => elementLabel(item).includes('web'));
            const hasSocial = checkboxes.some(item => elementLabel(item).includes('social'));
            if (hasWeb && hasSocial) return menu;
          }
          return null;
        };

        const findAddFilesToolsButton = (): HTMLElement | null =>
          Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]')).find(el =>
            isVisible(el) &&
            el.getAttribute('aria-disabled') !== 'true' &&
            !el.hasAttribute('disabled') &&
            elementLabel(el).includes('add files or tools')
          ) ?? null;

        const openPrimaryToolsMenu = async (): Promise<HTMLElement | null> => {
          const existing = findPrimaryToolsMenu();
          if (existing) return existing;

          const addFilesButton = findAddFilesToolsButton();
          if (!addFilesButton) return null;

          pointerClick(addFilesButton);
          for (let i = 0; i < 20; i++) {
            const menu = findPrimaryToolsMenu();
            if (menu) return menu;
            await utils.delay(100);
          }
          return null;
        };

        const ensureWebAndSocialSources = async (): Promise<void> => {
          const primaryMenu = await openPrimaryToolsMenu();
          if (!primaryMenu) return;

          const connectorsItem = Array.from(primaryMenu.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(item => {
            const label = elementLabel(item);
            return label.includes('connectors') && label.includes('sources');
          });
          if (!connectorsItem) return;

          pointerClick(connectorsItem);

          let sourcesMenu: HTMLElement | null = null;
          for (let i = 0; i < 20; i++) {
            sourcesMenu = findSourcesSubMenu();
            if (sourcesMenu) break;
            await utils.delay(100);
          }
          if (!sourcesMenu) return;

          const ensureChecked = async (label: 'web' | 'social') => {
            const item = Array.from(sourcesMenu!.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')).find(checkbox =>
              isVisible(checkbox) &&
              checkbox.getAttribute('aria-disabled') !== 'true' &&
              !checkbox.hasAttribute('disabled') &&
              elementLabel(checkbox).includes(label)
            );
            if (item && item.getAttribute('aria-checked') !== 'true') {
              pointerClick(item);
              await utils.delay(160);
            }
          };

          await ensureChecked('web');
          await ensureChecked('social');
        };

        const ensureDeepResearch = async (): Promise<void> => {
          const deepResearchChipVisible = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]')).some(el =>
            isVisible(el) &&
            !el.closest('[role="menu"]') &&
            elementLabel(el) === 'deep research'
          );
          if (deepResearchChipVisible) return;

          const primaryMenu = await openPrimaryToolsMenu();
          if (!primaryMenu) return;

          const deepResearchItem = Array.from(primaryMenu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')).find(item =>
            isVisible(item) &&
            item.getAttribute('aria-disabled') !== 'true' &&
            !item.hasAttribute('disabled') &&
            elementLabel(item).includes('deep research')
          );
          if (!deepResearchItem) return;

          if (deepResearchItem.getAttribute('aria-checked') !== 'true') {
            pointerClick(deepResearchItem);
            await utils.delay(220);
            return;
          }

          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          await utils.delay(120);
        };

        if (query) {
          const inputBox = document.querySelector<HTMLElement>('[role="textbox"]');
          if (inputBox) {
            inputBox.focus();
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputBox);
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(range);
            }
            document.execCommand('insertText', false, query);
            await utils.delay(300);
          }
        }

        if (hash.includes('sk_social=on')) {
          await ensureWebAndSocialSources();
        }

        if (hash.includes('sk_mode=research')) {
          await ensureDeepResearch();
        }

        if (openMenus().length > 0) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          await utils.delay(100);
        }

        const textbox = document.querySelector<HTMLElement>('[role="textbox"]');
        if (textbox) {
          textbox.focus();
          sendEnter(textbox);
        }
      }
    }
  ];
}

export function initializeSiteAutomations(config: Config): void {
  const siteAutomations = createSiteAutomations(config);

  const runSiteAutomations = () => {
    const currentHost = window.location.hostname;
    siteAutomations.forEach(site => {
      if (currentHost.includes(site.host)) {
        site.run();
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSiteAutomations);
  } else {
    setTimeout(runSiteAutomations, 1000);
  }
}
