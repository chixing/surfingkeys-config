import type { Theme } from '../config';

function pageHasKeyboardFocus(): boolean {
  if (document.visibilityState !== 'visible' || !document.hasFocus()) return false;
  let target = document.activeElement;
  while (target?.shadowRoot?.activeElement) target = target.shadowRoot.activeElement;
  return (
    !!target &&
    !target.matches(
      'input, textarea, select, iframe, frame, [role="textbox"], .CodeMirror-scroll, .ace_content',
    ) &&
    !(target instanceof HTMLElement && target.isContentEditable)
  );
}

export function showReadyBadge(theme: Theme): void {
  if (window !== window.top || document.getElementById('sk-config-ready')) return;

  const badge = document.createElement('div');
  badge.id = 'sk-config-ready';
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', 'Surfingkeys ready in Normal mode');
  badge.style.cssText = `
    all: initial !important; display: none !important; position: fixed !important;
    bottom: 8px !important; right: 8px !important; z-index: 2147483000 !important;
    pointer-events: none !important; user-select: none !important;
  `;
  const label = document.createElement('span');
  label.textContent = 'SK ✓';
  label.style.cssText = `
    display: block; padding: 1px 5px; border: 1px solid ${theme.colors.border}; border-radius: 4px;
    background: ${theme.colors.bgDark}; color: ${theme.colors.accentFg}; font: 600 10px/14px ${theme.font};
  `;
  badge.attachShadow({ mode: 'open' }).append(label);
  document.documentElement.append(badge);

  // A tab can lose focus or switch to an editor while the background process replies.
  let generation = 0;
  let frame = 0;
  let normal = false;
  function refresh(): void {
    const current = ++generation;
    badge.style.setProperty('display', 'none', 'important');
    cancelAnimationFrame(frame);
    if (!normal || !pageHasKeyboardFocus()) return;
    frame = requestAnimationFrame(() => {
      if (!pageHasKeyboardFocus()) return;
      api.RUNTIME('getState', {}, (reply) => {
        if (current === generation && reply?.state === 'enabled' && pageHasKeyboardFocus()) {
          badge.style.setProperty('display', 'block', 'important');
        }
      });
    });
  }
  window.addEventListener('focus', refresh, true);
  window.addEventListener('blur', refresh, true);
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', refresh);
  document.addEventListener('DOMContentLoaded', refresh, { once: true });
  // Surfingkeys 1.19 reports its active mode in the first status field. Observe the
  // frame's own channel before the frontend consumes the status message.
  settings.showModeStatus = true;
  api.RUNTIME('getChannelScope', {}, (reply) => {
    if (typeof reply?.scope !== 'string') return;
    const prefix = reply.scope ? `surfingkeys:${reply.scope}:` : 'surfingkeys:';
    let clearedStatus: Event | undefined;
    document.addEventListener(
      `${prefix}front`,
      (event) => {
        if (event === clearedStatus) return;
        const detail = (event as CustomEvent).detail;
        if (detail?.[0] !== 'showStatus' || typeof detail[1]?.[0] !== 'string') return;
        const status = detail[1];
        normal = status[0] === 'Normal';
        // The page badge renders Normal. An empty native status lets the idle
        // frontend detach again, while other modes retain their native labels.
        if (normal) {
          event.stopImmediatePropagation();
          clearedStatus = new CustomEvent(event.type, {
            detail: ['showStatus', ['', ...status.slice(1)], ...detail.slice(2)],
          });
          document.dispatchEvent(clearedStatus);
          clearedStatus = undefined;
        }
        refresh();
      },
      true,
    );
    document.dispatchEvent(new CustomEvent(`${prefix}ensureFrontEnd`));
  });
}
