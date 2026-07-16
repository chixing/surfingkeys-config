import { AI_SERVICES } from '../config';
import type { AIServiceName } from '../config';
import type { AiSelector } from '../ai/selector';
import { isZenBrowser } from '../utils';
import { installUrlHistoryTracker, openBackInNewTab } from './backInNewTab';
import { registerEditorMappings } from './editor';
import { copyImageToClipboard } from './copyImage';

function readClipboardAndUpdate(aiSelector: AiSelector): void {
  navigator.clipboard
    .readText()
    .then((text) => aiSelector.updateQuery(text))
    .catch(() => {});
}

function getSelectedText(): string {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    if (start !== null && end !== null && start !== end) {
      return activeElement.value.slice(start, end).trim();
    }
  }

  return window.getSelection()?.toString().trim() ?? '';
}

function createAiShortcut(aiSelector: AiSelector, services?: AIServiceName[]): () => void {
  return () => {
    const selectedText = getSelectedText();
    aiSelector.show(selectedText, services ?? null);
    if (!selectedText) {
      readClipboardAndUpdate(aiSelector);
    }
  };
}

function registerAiDialogShortcut(
  keys: string,
  annotation: string,
  aiSelector: AiSelector,
  services?: AIServiceName[],
): void {
  api.mapkey(keys, annotation, createAiShortcut(aiSelector, services));
  api.vmapkey(keys, annotation, createAiShortcut(aiSelector, services));
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
  registerEditorMappings();

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
  registerAiDialogShortcut('aa', 'Multi-AI Search (Selection/Clipboard/Input)', aiSelector);
  registerAiDialogShortcut('ac', 'ChatGPT Search (Selection/Clipboard/Input)', aiSelector, [
    AI_SERVICES.CHATGPT,
  ]);
  api.mapkey('aC', 'ChatGPT Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.CHATGPT]));
  registerAiDialogShortcut('ad', 'Doubao Search (Selection/Clipboard/Input)', aiSelector, [
    AI_SERVICES.DOUBAO,
  ]);
  api.mapkey('aD', 'Doubao Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.DOUBAO]));
  registerAiDialogShortcut('ae', 'Claude Search (Selection/Clipboard/Input)', aiSelector, [
    AI_SERVICES.CLAUDE,
  ]);
  api.mapkey('aE', 'Claude Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.CLAUDE]));
  registerAiDialogShortcut('ag', 'Gemini Search (Selection/Clipboard/Input)', aiSelector, [
    AI_SERVICES.GEMINI,
  ]);
  api.mapkey('aG', 'Gemini Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.GEMINI]));
  registerAiDialogShortcut('ap', 'Perplexity Search (Selection/Clipboard/Input)', aiSelector, [
    AI_SERVICES.PERPLEXITY,
  ]);
  api.mapkey(
    'aP',
    'Perplexity Search hinted link',
    createAiLinkShortcut(aiSelector, [AI_SERVICES.PERPLEXITY]),
  );
  registerAiDialogShortcut('ak', 'Grok Search (Selection/Clipboard/Input)', aiSelector, [AI_SERVICES.GROK]);
  api.mapkey('aK', 'Grok Search hinted link', createAiLinkShortcut(aiSelector, [AI_SERVICES.GROK]));
}
