import type { Config } from '../config';
import * as utils from '../utils';

interface SiteAutomation {
  host: string;
  run: () => void | Promise<void>;
}

function findSendButton(): HTMLElement | null {
  return (
    (document.querySelector('button[type="submit"]') as HTMLElement | null) ||
    (document.querySelector('button.send-button') as HTMLElement | null) ||
    (document.querySelector('button[aria-label*="send" i]') as HTMLElement | null) ||
    (document.querySelector('button svg[class*="send"]')?.closest('button') as HTMLElement | null)
  );
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
        submitSelector: findSendButton
      }, config)
    },
    {
      host: 'www.doubao.com',
      run: () => utils.injectPrompt({
        selector: 'textarea[placeholder], div[contenteditable="true"]',
        useValue: true,
        dispatchEvents: true,
        submitSelector: findSendButton
      }, config)
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
