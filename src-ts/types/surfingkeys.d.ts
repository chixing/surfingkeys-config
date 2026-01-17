/**
 * Type definitions for SurfingKeys API
 * https://github.com/brookhong/Surfingkeys
 */

declare global {
  interface Window {
    api: SurfingKeysAPI;
    settings: SurfingKeysSettings;
    Front: any;
    Hints: any;
    Visual: any;
    Clipboard: any;
  }

  const api: SurfingKeysAPI;
  const settings: SurfingKeysSettings;
}

export interface SurfingKeysSettings {
  scrollStepSize?: number;
  hintAlign?: string;
  omnibarMaxResults?: number;
  historyMUOrder?: boolean;
  theme?: string;
  [key: string]: any;
}

export interface SurfingKeysAPI {
  // Key mappings
  map(new_keystroke: string, old_keystroke: string, domain?: string, new_annotation?: string): void;
  unmap(keystroke: string, domain?: string): void;
  iunmap(keystroke: string, domain?: string): void;
  imap(new_keystroke: string, old_keystroke: string, domain?: string, new_annotation?: string): void;
  cmap(new_keystroke: string, old_keystroke: string, domain?: string, new_annotation?: string): void;

  mapkey(
    keystroke: string,
    annotation: string,
    jscode: () => void | Promise<void>,
    options?: { domain?: string; repeatIgnore?: boolean }
  ): void;

  imapkey(
    keystroke: string,
    annotation: string,
    jscode: () => void | Promise<void>,
    options?: { domain?: string }
  ): void;

  vmapkey(
    keystroke: string,
    annotation: string,
    jscode: () => void | Promise<void>,
    options?: { domain?: string }
  ): void;

  // Omnibar
  Front: {
    openOmnibar(options: { type: string; extra?: string }): void;
    showBanner(message: string, type?: 'success' | 'error' | 'warning'): void;
  };

  // Hints
  Hints: {
    create(
      cssSelector: string,
      onHintKey: (element: HTMLElement) => void,
      options?: { multipleHits?: boolean }
    ): void;
    style(css: string, mode?: string): void;
  };

  // Visual mode
  Visual: {
    style(element: string, style: string): void;
  };

  // Clipboard
  Clipboard: {
    write(text: string): void;
    read(): Promise<string>;
  };

  // Search engines
  addSearchAlias(
    alias: string,
    prompt: string,
    searchUrl: string,
    suggestionUrlOrType?: string,
    suggestionCallbackOrUrl?: string | ((response: any) => any),
    suggestionCallbackOrOnlyThisSite?: string | ((response: any) => any) | boolean,
    onlyThisSite?: boolean
  ): void;

  removeSearchAlias(alias: string, searchUrl?: string, onlyThisSite?: boolean): void;

  // Tabs
  tabOpenLink(url: string, target?: string): void;

  // Other utilities
  getBrowserName(): string;
  aceVimMap(lhs: string, rhs: string, ctx?: string): void;

  // Pass-through mode
  passThrough(timeout?: number): void;
}

export {};
