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
        if (params.get('q')) {
          await utils.delay(config.delayMs);
          const submitBtn = document.getElementById('composer-submit-button');
          if (submitBtn instanceof HTMLElement) submitBtn.click();
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
          if (document.querySelector('[role="textbox"]') && document.querySelector('[role="radio"]')) break;
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
          const sourcesBtn = Array.from(document.querySelectorAll('button')).find(btn =>
            btn.getAttribute('aria-label')?.toLowerCase().includes('source')
          ) as HTMLElement | undefined;
          if (sourcesBtn) {
            pointerClick(sourcesBtn);

            let menu: Element | null = null;
            for (let i = 0; i < 15; i++) {
              menu = document.querySelector('[role="menu"]');
              if (menu) break;
              await utils.delay(200);
            }

            if (menu) {
              const socialItem = Array.from(menu.querySelectorAll('[role="menuitemcheckbox"]')).find(item =>
                item.textContent?.toLowerCase().includes('social')
              );
              const toggle = socialItem?.querySelector('[role="switch"]') as HTMLElement | null;
              if (toggle && toggle.getAttribute('aria-checked') !== 'true') {
                toggle.click();
                await utils.delay(300);
              }
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              await utils.delay(300);
            }
          }
        }

        if (hash.includes('sk_mode=research')) {
          for (let i = 0; i < 5; i++) {
            if (document.querySelector('[role="radio"][value="research"][aria-checked="true"]')) break;
            const checkedRadio = document.querySelector('[role="radio"][aria-checked="true"]') as HTMLElement | null;
            if (checkedRadio) {
              checkedRadio.focus();
              checkedRadio.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowRight',
                code: 'ArrowRight',
                keyCode: 39,
                bubbles: true,
              }));
            }
            await utils.delay(150);
          }
        }

        const textbox = document.querySelector<HTMLElement>('[role="textbox"]');
        if (textbox) {
          textbox.focus();
          textbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
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
