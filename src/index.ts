/**
 * SurfingKeys Configuration - Main Entry Point
 */

import { CONFIG, AI_SERVICES } from './config';
import { AiSelector } from './ai-selector';
import * as utils from './utils';

// Export for debugging
(window as any).__CONFIG__ = CONFIG;
(window as any).__utils__ = utils;

// =============================================================================
// KEY MAPPINGS
// =============================================================================

const aiSelector = new AiSelector(CONFIG);

// Navigation
api.map('K', '[[');
api.map('J', ']]');

// Tab Search
api.mapkey('T', '#3Choose a tab', function () {
  api.Front.openOmnibar({ type: 'Tabs' });
});

// Convenience
api.map('q', 'p');

// Mode Swapping
api.map('v', 'zv');
api.map('zv', 'v');

// Unmappings
api.iunmap('<Ctrl-a>');

// Omnibar Navigation
api.cmap('<Ctrl->>', '<Ctrl-,>');

// Copy image shortcut
api.mapkey('ye', 'Copy image to clipboard', function () {
  api.Hints.create('img', function (element: HTMLElement) {
    const imgElement = element as HTMLImageElement;
    let imageUrl = imgElement.src || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-lazy-src');
    if (!imageUrl && imgElement.srcset) {
      const srcset = imgElement.srcset.split(',');
      imageUrl = srcset[0].trim().split(' ')[0];
    }

    if (!imageUrl) {
      api.Front.showBanner('Could not find image source', 'error');
      return;
    }

    const copyPngToClipboard = async (blob: Blob | null) => {
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

    const convertAndCopy = (url: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(copyPngToClipboard, 'image/png');
        }
      };
      img.onerror = function () {
        fetch(url)
          .then(r => r.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const img2 = new Image();
            img2.onload = function () {
              const canvas = document.createElement('canvas');
              canvas.width = img2.width;
              canvas.height = img2.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img2, 0, 0);
                canvas.toBlob(b => {
                  URL.revokeObjectURL(blobUrl);
                  copyPngToClipboard(b);
                }, 'image/png');
              }
            };
            img2.src = blobUrl;
          })
          .catch(() => {
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
api.mapkey('gp', '#12Open Passwords', () => api.tabOpenLink('chrome://password-manager/passwords'));
api.mapkey('gs', '#12Open Extensions', () => api.tabOpenLink('chrome://extensions/shortcuts'));

// AI search shortcuts
api.mapkey('aa', 'Multi-AI Search (Clipboard/Input)', () => {
  aiSelector.show('');
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

api.mapkey('ac', 'ChatGPT Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.CHATGPT]);
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

api.mapkey('ad', 'Doubao Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.DOUBAO]);
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

api.mapkey('ay', 'Alice Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.ALICE]);
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

api.mapkey('ae', 'Claude Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.CLAUDE]);
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

api.mapkey('ag', 'Gemini Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.GEMINI]);
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

api.mapkey('ap', 'Perplexity Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.PERPLEXITY]);
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

api.mapkey('aP', 'Perplexity Research Mode (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.PERPLEXITY_RESEARCH]);
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

api.mapkey('ak', 'Grok Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.GROK]);
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
});

// =============================================================================
// SITE-SPECIFIC AUTOMATION
// =============================================================================

interface SiteAutomation {
  host: string;
  run: () => void | Promise<void>;
}

const siteAutomations: SiteAutomation[] = [
  {
    host: 'chatgpt.com',
    run: async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('q')) {
        await utils.delay(CONFIG.delayMs);
        const submitBtn = document.getElementById('composer-submit-button');
        if (submitBtn instanceof HTMLElement) submitBtn.click();
      }
    }
  },
  {
    host: 'gemini.google.com',
    run: () => utils.injectPrompt({
      selector: 'div[contenteditable="true"][role="textbox"]'
    }, CONFIG)
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
    }, CONFIG)
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
    }, CONFIG)
  },
  {
    host: 'yandex.ru',
    run: async () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        await utils.delay(CONFIG.delayMs);
        const box = document.querySelector<HTMLElement>(
          'textarea[placeholder], input[type="text"], input[class*="input"], div[contenteditable="true"]'
        );
        if (box) {
          box.focus();
          (box as HTMLInputElement).value = q;
          box.dispatchEvent(new Event('input', { bubbles: true }));
          box.dispatchEvent(new Event('change', { bubbles: true }));
          await utils.delay(CONFIG.delayMs);
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

function runSiteAutomations() {
  const currentHost = window.location.hostname;
  siteAutomations.forEach(site => {
    if (currentHost.includes(site.host)) {
      site.run();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runSiteAutomations);
} else {
  setTimeout(runSiteAutomations, 1000);
}

// =============================================================================
// SEARCH ENGINES
// =============================================================================

interface SearchEngine {
  alias: string;
  search: string;
  compl?: string;
  callback?: (response: any) => any;
}

const searchEngines: Record<string, SearchEngine> = {
  amazon: {
    alias: 'a',
    search: 'https://smile.amazon.com/s/?field-keywords=',
    compl: 'https://completion.amazon.com/search/complete?method=completion&mkt=1&search-alias=aps&q=',
    callback: (response: any) => JSON.parse(response.text)[1]
  },
  yelp: {
    alias: 'p',
    search: 'https://www.yelp.com/search?find_desc=',
    compl: 'https://www.yelp.com/search_suggest/v2/prefetch?prefix=',
    callback: (response: any) => {
      const res = JSON.parse(response.text).response;
      return res
        .flatMap((r: any) => r.suggestions.map((s: any) => s.query))
        .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);
    }
  },
  github: {
    alias: 't',
    search: 'https://github.com/search?q=',
    compl: 'https://api.github.com/search/repositories?sort=stars&order=desc&q=',
    callback: (response: any) => JSON.parse(response.text).items.map((s: any) => {
      const prefix = s.stargazers_count ? `[*${s.stargazers_count}] ` : '';
      return utils.createURLItem(prefix + s.full_name, s.html_url);
    })
  },
  libhunt: { alias: 'l', search: 'https://www.libhunt.com/search?query=' },
  yandex: { alias: 'n', search: 'https://yandex.com/search/?text=' },
  skidrow: { alias: 'k', search: 'https://www.skidrowreloaded.com/?s=' },
  anna: { alias: 'c', search: 'https://www.annas-archive.org/search?q=' },
  libgen: { alias: 'v', search: 'https://libgen.is/search.php?req=' },
  urban: { alias: 'u', search: 'https://www.urbandictionary.com/define.php?term=' },
  archive: { alias: 'r', search: 'https://archive.is/' },
};

Object.entries(searchEngines).forEach(([name, conf]) => {
  api.addSearchAlias(conf.alias, name, conf.search, 's', conf.compl, conf.callback);
});

// =============================================================================
// THEME
// =============================================================================

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
`, 'text');

api.Visual.style('marks', `background-color: ${CONFIG.theme.colors.accentFg}99;`);
api.Visual.style('cursor', `background-color: ${CONFIG.theme.colors.mainFg};`);

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

console.log('[SurfingKeys] TypeScript configuration loaded');
