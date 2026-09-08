/**
 * Utility functions
 */

import type { Config } from './config';

export const isZenBrowser = (): boolean => navigator.userAgent.includes('Zen/');

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const pressKey = (element: HTMLElement, key: string = 'Enter', keyCode: number = 13): void => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    code: key,
    keyCode,
    which: keyCode,
  });
  element.dispatchEvent(event);
};

export const createSuggestionItem = (html: string, props: any = {}) => {
  const li = document.createElement('li');
  li.innerHTML = html;
  return { html: li.outerHTML, props };
};

export const createURLItem = (title: string, url: string, sanitize: boolean = true) => {
  let t = title;
  let u = url;
  if (sanitize) {
    t = String(t).replace(
      /[&<>"'`=/]/g,
      (s) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
          '/': '&#x2F;',
          '`': '&#x60;',
          '=': '&#x3D;',
        })[s] || s,
    );
    u = new URL(u).toString();
  }
  return createSuggestionItem(`\n<div class="title">${t}</div>\n<div class="url">${u}</div>\n`, { url: u });
};

interface InjectPromptOptions {
  selector: string;
  submitSelector?: (() => HTMLElement | null) | string;
  useValue?: boolean;
  dispatchEvents?: boolean;
}

const PROMPT_KEY = '#sk_prompt=';

function captureHashPrompt(): string | null {
  if (typeof window === 'undefined' || !window.location?.hash?.startsWith(PROMPT_KEY)) {
    return null;
  }
  const promptText = decodeURIComponent(window.location.hash.substring(PROMPT_KEY.length));
  history.replaceState(null, '', ' ');
  return promptText;
}

let capturedPrompt = captureHashPrompt();

export const waitFor = async <T>(
  get: () => T | null | undefined,
  attempts = 60,
  intervalMs = 150,
): Promise<T | null> => {
  for (let i = 0; i < attempts; i++) {
    const v = get();
    if (v) return v;
    await delay(intervalMs);
  }
  return null;
};

export const injectPrompt = async (
  { selector, submitSelector, useValue = false, dispatchEvents = false }: InjectPromptOptions,
  config: Config,
): Promise<void> => {
  const promptText = capturedPrompt ?? captureHashPrompt();
  capturedPrompt = null;
  if (!promptText) return;

  await delay(config.delayMs);
  const inputBox = await waitFor(() =>
    document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector),
  );
  if (!inputBox) return;

  inputBox.focus();

  if (useValue) {
    inputBox.value = promptText;
  } else {
    if (document.activeElement === inputBox) {
      document.execCommand('selectAll');
    }
    document.execCommand('insertText', false, promptText);
  }

  if (dispatchEvents) {
    inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    inputBox.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (submitSelector) {
    const getSubmitButton = (): HTMLElement | null => {
      const btn =
        typeof submitSelector === 'function'
          ? submitSelector()
          : document.querySelector<HTMLElement>(submitSelector);
      if (!btn) return null;
      const isDisabled =
        (btn instanceof HTMLButtonElement && btn.disabled) ||
        btn.getAttribute('aria-disabled') === 'true' ||
        btn.hasAttribute('disabled');
      return isDisabled ? null : btn;
    };

    const submitBtn = await waitFor(getSubmitButton);
    if (submitBtn) {
      submitBtn.click();
    } else {
      pressKey(inputBox);
    }
  } else {
    await delay(config.delayMs);
    pressKey(inputBox);
  }
};
