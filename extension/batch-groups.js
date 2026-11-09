// Loaded before Surfingkeys' original service worker. No new permissions.
(() => {
  const runningWindows = new Set();

  async function dissolve(message, sender) {
    const windowId = sender.tab.windowId;
    if (runningWindows.has(windowId)) throw new Error('A group operation is already in progress.');
    if (message.groupId !== undefined && !Number.isInteger(message.groupId))
      throw new Error('Invalid tab group.');
    runningWindows.add(windowId);
    try {
      const tabs = await chrome.tabs.query({ windowId });
      const targets = tabs.filter(
        (tab) => tab.groupId >= 0 && (message.groupId === undefined || tab.groupId === message.groupId),
      );
      if (!targets.length) return { ungrouped: 0, remaining: [], added: 0 };
      const ids = targets.map((tab) => tab.id);
      const groupIds = new Set(targets.map((tab) => tab.groupId));
      // One browser call for the entire snapshot, including restricted pages.
      await chrome.tabs.ungroup(ids);
      const latest = await chrome.tabs.query({ windowId });
      const originalIds = new Set(ids);
      const remaining = latest.filter((tab) =>
        groupIds.has(tab.groupId) || (originalIds.has(tab.id) && tab.groupId >= 0));
      return {
        ungrouped: ids.length - remaining.filter((tab) => originalIds.has(tab.id)).length,
        remaining: remaining.map((tab) => tab.title || `Tab ${tab.id}`),
        added: remaining.filter((tab) => !originalIds.has(tab.id)).length,
      };
    } finally {
      runningWindows.delete(windowId);
    }
  }

  function handle(message, sender, respond) {
    if (!['getGroupCapabilities', 'dissolveTabGroups'].includes(message?.action)) return undefined;
    if (sender.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.windowId)) {
      respond({ error: 'Open a browser tab to manage its groups.' });
      return false;
    }
    if (message.action === 'getGroupCapabilities') {
      respond({ batchDissolve: 1 });
      return false;
    }
    void dissolve(message, sender).then(respond, (reason) => {
      respond({ error: reason instanceof Error ? reason.message : String(reason) });
    });
    return true;
  }

  chrome.runtime.onMessage.addListener(handle);
  chrome.runtime.onUserScriptMessage?.addListener(handle);
})();
