import { AI_SERVICES } from '../config';
import type { AIServiceName } from '../config';
import { AiSelector } from '../ai/selector';
import { isZenBrowser } from '../utils';
import { installUrlHistoryTracker, openBackInNewTab } from './backInNewTab';
import { copyImageToClipboard } from './copyImage';

function readClipboardAndUpdate(aiSelector: AiSelector): void {
  navigator.clipboard.readText().then(text => aiSelector.updateQuery(text)).catch(() => {});
}

function createAiShortcut(aiSelector: AiSelector, services?: AIServiceName[]): () => void {
  return () => {
    aiSelector.show('', services ?? null);
    readClipboardAndUpdate(aiSelector);
  };
}

function createAiLinkShortcut(aiSelector: AiSelector, services: AIServiceName[]): () => void {
  return () => {
    api.Hints.create('a[href]', (element: HTMLElement) => {
      const href = (element as HTMLAnchorElement).href;
      if (!href) {
        api.Front.showBanner('Could not find link URL', 'error');
        return;
      }
      if (!aiSelector.searchImmediately(href, services)) {
        api.Front.showBanner('Could not search link', 'error');
      }
    });
  };
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
  api.mapkey('ye', 'Copy image to clipboard', copyImageToClipboard);

  // Chrome Internal Pages
  api.mapkey('gp', '#12Open Passwords', () => api.tabOpenLink('chrome://password-manager/passwords'));
  api.mapkey('gs', '#12Open Extensions', () => api.tabOpenLink('chrome://extensions/shortcuts'));

  // AI search shortcuts
  api.mapkey('aa', 'Multi-AI Search (Clipboard/Input)', createAiShortcut(aiSelector));
  api.mapkey('ac', 'ChatGPT Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.CHATGPT]));
  api.mapkey('aC', 'ChatGPT Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.CHATGPT]));
  api.mapkey('ad', 'Doubao Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.DOUBAO]));
  api.mapkey('aD', 'Doubao Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.DOUBAO]));
  api.mapkey('ae', 'Claude Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.CLAUDE]));
  api.mapkey('aE', 'Claude Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.CLAUDE]));
  api.mapkey('ag', 'Gemini Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.GEMINI]));
  api.mapkey('aG', 'Gemini Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.GEMINI]));
  api.mapkey('ap', 'Perplexity Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.PERPLEXITY]));
  api.mapkey('aP', 'Perplexity Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.PERPLEXITY]));
  api.mapkey('ak', 'Grok Search (Clipboard/Input)', createAiShortcut(aiSelector, [AI_SERVICES.GROK]));
  api.mapkey('aK', 'Grok Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.GROK]));
}
