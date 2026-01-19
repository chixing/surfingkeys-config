/**
 * Utility functions
 */

import type { Config } from './config';

export const isZenBrowser = (): boolean =>
  navigator.userAgent.includes('Zen/');

export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const pressKey = (
  element: HTMLElement,
  key: string = 'Enter',
  keyCode: number = 13
): void => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    code: key,
    keyCode,
    which: keyCode
  });
  element.dispatchEvent(event);
};

export const createSuggestionItem = (html: string, props: any = {}) => {
  const li = document.createElement("li");
  li.innerHTML = html;
  return { html: li.outerHTML, props };
};

export const createURLItem = (title: string, url: string, sanitize: boolean = true) => {
  let t = title;
  let u = url;
  if (sanitize) {
    t = String(t).replace(/[&<>"'`=/]/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;",
      "'": "&#39;", "/": "&#x2F;", "`": "&#x60;", "=": "&#x3D;"
    })[s] || s);
    u = new URL(u).toString();
  }
  return createSuggestionItem(
    `\n<div class="title">${t}</div>\n<div class="url">${u}</div>\n`,
    { url: u }
  );
};

interface InjectPromptOptions {
  selector: string;
  submitSelector?: (() => HTMLElement | null) | string;
  useValue?: boolean;
  dispatchEvents?: boolean;
}

export const injectPrompt = async ({
  selector,
  submitSelector,
  useValue = false,
  dispatchEvents = false
}: InjectPromptOptions, config: Config): Promise<void> => {
  const promptKey = "#sk_prompt=";
  if (!window.location.hash.startsWith(promptKey)) return;

  const promptText = decodeURIComponent(window.location.hash.substring(promptKey.length));

  await delay(config.delayMs);
  const inputBox = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!inputBox) return;

  inputBox.focus();

  if (useValue) {
    inputBox.value = promptText;
  } else {
    document.execCommand('insertText', false, promptText);
  }

  if (dispatchEvents) {
    inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    inputBox.dispatchEvent(new Event('change', { bubbles: true }));
  }

  await delay(config.delayMs);

  if (submitSelector) {
    const btn = typeof submitSelector === 'function'
      ? submitSelector()
      : document.querySelector<HTMLElement>(submitSelector);
    if (btn) {
      btn.click();
    } else {
      pressKey(inputBox);
    }
  } else {
    pressKey(inputBox);
  }

  // Clean up URL
  history.replaceState(null, '', ' ');
};
