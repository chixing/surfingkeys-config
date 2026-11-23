import type { Theme } from '../config';

export function showReadyBadge(theme: Theme): void {
  if (window !== window.top || document.getElementById('sk-config-ready')) return;

  const badge = document.createElement('div');
  badge.id = 'sk-config-ready';
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', 'Surfingkeys configuration loaded');
  badge.style.cssText = `
    all: initial !important; display: block !important; position: fixed !important;
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
}
