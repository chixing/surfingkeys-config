import { AI_SERVICES } from '../config';
import type { AIServiceName } from '../config';
import { AiSelector } from '../ai/selector';
import { isZenBrowser } from '../utils';

function readClipboardAndUpdate(aiSelector: AiSelector): void {
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
}

function createAiShortcut(aiSelector: AiSelector, services?: AIServiceName[]): () => void {
  return () => {
    aiSelector.show('', services ?? null);
    readClipboardAndUpdate(aiSelector);
  };
}

const TAB_URL_HISTORY_WINDOW_NAME_PREFIX = 'surfingkeys:url-history:';
const TAB_URL_HISTORY_LIMIT = 50;

interface UrlHistoryWindow extends Window {
  __surfingKeysUrlHistoryTrackerInstalled?: boolean;
}

function canUseWindowNameHistory(): boolean {
  return window.name === '' || window.name.startsWith(TAB_URL_HISTORY_WINDOW_NAME_PREFIX);
}

function readTabUrlHistory(): string[] {
  if (!window.name.startsWith(TAB_URL_HISTORY_WINDOW_NAME_PREFIX)) return [];

  try {
    const value = JSON.parse(window.name.slice(TAB_URL_HISTORY_WINDOW_NAME_PREFIX.length));
    return Array.isArray(value) ? value.filter((url): url is string => typeof url === 'string') : [];
  } catch {
    return [];
  }
}

function writeTabUrlHistory(urls: string[]): void {
  if (!canUseWindowNameHistory()) return;

  window.name = TAB_URL_HISTORY_WINDOW_NAME_PREFIX + JSON.stringify(urls.slice(-TAB_URL_HISTORY_LIMIT));
}

function recordCurrentUrl(mode: 'push' | 'replace' = 'push'): void {
  if (!canUseWindowNameHistory()) return;

  const currentUrl = window.location.href;
  const urls = readTabUrlHistory();

  if (mode === 'replace') {
    if (urls.length === 0) {
      urls.push(currentUrl);
    } else {
      urls[urls.length - 1] = currentUrl;
    }
  } else if (urls[urls.length - 1] !== currentUrl) {
    urls.push(currentUrl);
  }

  writeTabUrlHistory(urls);
}

function installUrlHistoryTracker(): void {
  const trackingWindow = window as UrlHistoryWindow;
  recordCurrentUrl();

  if (trackingWindow.__surfingKeysUrlHistoryTrackerInstalled) return;

  trackingWindow.__surfingKeysUrlHistoryTrackerInstalled = true;

  const recordSoon = (mode: 'push' | 'replace') => window.setTimeout(() => recordCurrentUrl(mode), 0);
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args: any[]): void {
    originalPushState.apply(history, args as [any, string, (string | URL | null)?]);
    recordSoon('push');
  } as History['pushState'];

  history.replaceState = function(...args: any[]): void {
    originalReplaceState.apply(history, args as [any, string, (string | URL | null)?]);
    recordSoon('replace');
  } as History['replaceState'];

  window.addEventListener('hashchange', () => recordCurrentUrl());
  window.addEventListener('popstate', () => recordCurrentUrl());
}

function findPreviousUrl(currentUrl: string): string | null {
  const urls = readTabUrlHistory();

  for (let i = urls.length - 2; i >= 0; i--) {
    if (urls[i] !== currentUrl) return urls[i];
  }

  return null;
}

function openBackInNewTab(): void {
  const currentUrl = window.location.href;
  const previousUrl = findPreviousUrl(currentUrl);

  if (previousUrl) {
    api.tabOpenLink(previousUrl);
    return;
  }

  if (document.referrer && document.referrer !== currentUrl) {
    api.tabOpenLink(document.referrer);
    return;
  }

  api.Front.showBanner('Could not find a previous page', 'warning');
}

function resolveImageUrl(imgElement: HTMLImageElement): string | null {
  let imageUrl = imgElement.src || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-lazy-src');
  if (!imageUrl && imgElement.srcset) {
    const srcset = imgElement.srcset.split(',');
    imageUrl = srcset[0].trim().split(' ')[0];
  }
  return imageUrl || null;
}

async function copyPngToClipboard(blob: Blob | null, fallbackUrl: string): Promise<void> {
  try {
    if (!blob) throw new Error('Empty blob');
    const data = [new ClipboardItem({ 'image/png': blob })];
    await navigator.clipboard.write(data);
    api.Front.showBanner('Image copied to clipboard!', 'success');
  } catch {
    api.Clipboard.write(fallbackUrl);
    api.Front.showBanner('Copied URL (Clipboard write failed)', 'warning');
  }
}

function convertAndCopyImage(url: string): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => copyPngToClipboard(blob, url), 'image/png');
    }
  };
  img.onerror = () => {
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const img2 = new Image();
        img2.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img2.width;
          canvas.height = img2.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img2, 0, 0);
            canvas.toBlob(b => {
              URL.revokeObjectURL(blobUrl);
              copyPngToClipboard(b, url);
            }, 'image/png');
          }
        };
        img2.src = blobUrl;
      })
      .catch(() => {
        api.Clipboard.write(url);
        api.Front.showBanner('Copied URL (Image load failed)', 'warning');
      });
  };
  img.src = url;
}

export function registerKeyMappings(aiSelector: AiSelector): void {
  installUrlHistoryTracker();

  // Zen Browser fix: use native Ctrl-w instead of SurfingKeys closeTab
  if (isZenBrowser()) {
    api.map('x', '<Ctrl-w>');
  }

  // Navigation
  api.map('K', '[[');
  api.map('J', ']]');
  api.mapkey('A', '#4Open back in new tab', openBackInNewTab, { repeatIgnore: true });

  // Tab Search
  api.mapkey('T', '#3Choose a tab', () => {
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
  api.mapkey('ye', 'Copy image to clipboard', () => {
    api.Hints.create('img', (element: HTMLElement) => {
      const imgElement = element as HTMLImageElement;
      const imageUrl = resolveImageUrl(imgElement);
      if (!imageUrl) {
        api.Front.showBanner('Could not find image source', 'error');
        return;
      }
      convertAndCopyImage(imageUrl);
    });
  });

  // Chrome Internal Pages
  api.mapkey('gp', '#12Open Passwords', () => api.tabOpenLink('chrome://password-manager/passwords'));
  api.mapkey('gs', '#12Open Extensions', () => api.tabOpenLink('chrome://extensions/shortcuts'));

  // AI search shortcuts
  api.mapkey('aa', 'Multi-AI Search (Clipboard/Input)', createAiShortcut(aiSelector));
  api.mapkey('ac', 'ChatGPT Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.CHATGPT]));
  api.mapkey('ad', 'Doubao Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.DOUBAO]));
  api.mapkey('ae', 'Claude Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.CLAUDE]));
  api.mapkey('ag', 'Gemini Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.GEMINI]));
  api.mapkey('ap', 'Perplexity Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.PERPLEXITY]));
  api.mapkey('ak', 'Grok Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.GROK]));
}
