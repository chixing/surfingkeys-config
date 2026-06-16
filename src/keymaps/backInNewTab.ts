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

export function installUrlHistoryTracker(): void {
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

export function openBackInNewTab(): void {
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
