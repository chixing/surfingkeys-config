/**
 * Keep SurfingKeys' frontend iframe detached while it is idle.
 *
 * SurfingKeys renders its UI in a chrome-extension://.../pages/frontend.html iframe, and it creates
 * that iframe on every page load (an empty startup showStatus) and on every tab activation. Chrome
 * refuses chrome.debugger.attach() from any other extension on a tab that contains another
 * extension's frame ("Cannot access a chrome-extension:// URL of different extension"), which breaks
 * debugger-based browser automation (OpenCLI, Claude in Chrome, ChatGPT agent) on the active tab.
 *
 * SurfingKeys already tears the iframe down itself when a tab is deactivated, by posting
 * `destroyFrontend` to it, and recreates it on the next command. We send the same message once the
 * frame has been idle for a moment. The frontend refuses while any UI is visible, and an idle frame
 * is 0px tall (any visible UI sets it to 100%), so we only ask then.
 */

const POLL_MS = 500;
const IDLE_MS = 1000;

const findFrontendFrame = (): HTMLIFrameElement | null => {
  for (const el of Array.from(document.documentElement.children)) {
    const frame = el.shadowRoot?.querySelector<HTMLIFrameElement>('iframe.sk_ui');
    if (frame) return frame;
  }
  return null;
};

export function keepFrontendDetachedWhenIdle(): void {
  if (window !== top) return;

  let idleSince: number | null = null;

  setInterval(() => {
    const frame = findFrontendFrame();
    if (!frame?.contentWindow || frame.style.height !== '0px') {
      idleSince = null;
      return;
    }
    const now = Date.now();
    if (idleSince === null) {
      idleSince = now;
      return;
    }
    if (now - idleSince < IDLE_MS) return;
    idleSince = null;
    frame.contentWindow.postMessage(
      { surfingkeys_frontend_data: { action: 'destroyFrontend', ack: true, origin: location.origin } },
      new URL(frame.src).origin,
    );
  }, POLL_MS);
}
