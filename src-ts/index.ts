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
  api.Front.openOmnibar({ type: "Tabs" });
});

// Convenience
api.map('q', 'p');

// Mode Swapping
api.map('v', 'zv');
api.map('zv', 'v');

// Unmappings
api.iunmap("<Ctrl-a>");

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
        fetch(url).then(r => r.blob()).then(blob => {
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

// AI search shortcuts
api.mapkey('aa', 'Multi-AI Search (Clipboard/Input)', () => {
  aiSelector.show('');
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text))
    .catch(() => {}); // Ignore clipboard errors
});

api.mapkey('ac', 'ChatGPT Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.CHATGPT]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text))
    .catch(() => {});
});

api.mapkey('ae', 'Claude Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.CLAUDE]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text))
    .catch(() => {});
});

api.mapkey('ag', 'Gemini Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.GEMINI]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text))
    .catch(() => {});
});

api.mapkey('ap', 'Perplexity Search (Clipboard/Input)', () => {
  aiSelector.show('', [AI_SERVICES.PERPLEXITY]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text))
    .catch(() => {});
});

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
    alias: "a",
    search: "https://smile.amazon.com/s/?field-keywords=",
    compl: "https://completion.amazon.com/search/complete?method=completion&mkt=1&search-alias=aps&q=",
    callback: (response: any) => JSON.parse(response.text)[1]
  },
  github: {
    alias: "t",
    search: "https://github.com/search?q=",
    compl: "https://api.github.com/search/repositories?sort=stars&order=desc&q=",
    callback: (response: any) => JSON.parse(response.text).items.map((s: any) => {
      const prefix = s.stargazers_count ? `[★${s.stargazers_count}] ` : "";
      return utils.createURLItem(prefix + s.full_name, s.html_url);
    })
  },
  yandex: { alias: "n", search: "https://yandex.com/search/?text=" },
  anna: { alias: "c", search: "https://www.annas-archive.org/search?q=" },
};

Object.entries(searchEngines).forEach(([name, conf]) => {
  api.addSearchAlias(conf.alias, name, conf.search, conf.compl, conf.callback);
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

api.Visual.style('marks', `background-color: ${CONFIG.theme.colors.accentFg}99;`);
api.Visual.style('cursor', `background-color: ${CONFIG.theme.colors.mainFg};`);

settings.theme = `
:root {
  --font: ${CONFIG.theme.font};
  --font-size: ${CONFIG.theme.fontSize};
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
  font-family: var(--font);
  font-size: var(--font-size);
}

/* Additional theme styles... */
`;

console.log('[SurfingKeys] TypeScript configuration loaded');
