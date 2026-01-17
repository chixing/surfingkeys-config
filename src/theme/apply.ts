import type { Config } from '../config';

export function applyTheme(config: Config): void {
  api.Hints.style(`
    border: solid 2px ${config.theme.colors.border} !important;
    color: ${config.theme.colors.accentFg} !important;
    background: initial !important;
    background-color: ${config.theme.colors.bgDark} !important;
    font-size: 11pt !important;
    font-weight: lighter !important;
  `);

  api.Hints.style(`
    border: solid 2px ${config.theme.colors.border} !important;
    padding: 1px !important;
    color: ${config.theme.colors.fg} !important;
    background: ${config.theme.colors.bgDark} !important;
    font-size: 11pt !important;
    font-weight: lighter !important;
  `, 'text');

  api.Visual.style('marks', `background-color: ${config.theme.colors.accentFg}99;`);
  api.Visual.style('cursor', `background-color: ${config.theme.colors.mainFg};`);

  settings.theme = `
  :root {
    --font: ${config.theme.font};
    --font-size: ${config.theme.fontSize};
    --font-weight: normal;
    --fg: ${config.theme.colors.fg};
    --bg: ${config.theme.colors.bg};
    --bg-dark: ${config.theme.colors.bgDark};
    --border: ${config.theme.colors.border};
    --main-fg: ${config.theme.colors.mainFg};
    --accent-fg: ${config.theme.colors.accentFg};
    --info-fg: ${config.theme.colors.infoFg};
    --select: ${config.theme.colors.select};
  }

  .sk_theme {
    background: var(--bg);
    color: var(--fg);
    background-color: var(--bg);
    border-color: var(--border);
    font-family: var(--font);
    font-size: var(--font-size);
    font-weight: var(--font-weight);
  }

  input { font-family: var(--font); font-weight: var(--font-weight); }
  .sk_theme tbody, .sk_theme input { color: var(--fg); }

  /* Hints */
  #sk_hints .begin { color: var(--accent-fg) !important; }

  /* Tabs */
  #sk_tabs .sk_tab { background: var(--bg-dark); border: 1px solid var(--border); }
  #sk_tabs .sk_tab_title { color: var(--fg); }
  #sk_tabs .sk_tab_url { color: var(--main-fg); }
  #sk_tabs .sk_tab_hint { background: var(--bg); border: 1px solid var(--border); color: var(--accent-fg); }

  .sk_theme #sk_frame { background: var(--bg); opacity: 0.2; color: var(--accent-fg); }

  /* Omnibar */
  .sk_theme .title { color: var(--accent-fg); }
  .sk_theme .url { color: var(--main-fg); }
  .sk_theme .annotation { color: var(--accent-fg); }
  .sk_theme .omnibar_highlight { color: var(--accent-fg); }
  .sk_theme .omnibar_timestamp { color: var(--info-fg); }
  .sk_theme .omnibar_visitcount { color: var(--accent-fg); }
  .sk_theme .omnibar_folder { color: var(--main-fg); }

  .sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) { background: var(--bg-dark); }
  .sk_theme #sk_omnibarSearchResult ul li.focused { background: var(--border); }
  .sk_theme #sk_omnibarSearchResult ul li { padding: 0.4em; }
  .sk_theme #sk_omnibarSearchResult { max-height: 80vh !important; }

  .sk_theme #sk_omnibarSearchArea { border-top-color: var(--border); border-bottom-color: var(--border); padding-bottom: 0.5rem; }
  .sk_theme #sk_omnibarSearchArea input, .sk_theme #sk_omnibarSearchArea span { font-size: var(--font-size); }
  .sk_theme .separator { color: var(--accent-fg); }

  /* Popup */
  #sk_banner { font-family: var(--font); font-size: var(--font-size); font-weight: var(--font-weight); background: var(--bg); border-color: var(--border); color: var(--fg); opacity: 0.9; }
  #sk_keystroke { background-color: var(--bg); }
  .sk_theme kbd .candidates { color: var(--info-fg); }
  .sk_theme span.annotation { color: var(--accent-fg); }
  #sk_bubble { background-color: var(--bg) !important; color: var(--fg) !important; border-color: var(--border) !important; }
  #sk_bubble * { color: var(--fg) !important; }
  #sk_bubble div.sk_arrow div:nth-of-type(1) { border-top-color: var(--border) !important; border-bottom-color: var(--border) !important; }
  #sk_bubble div.sk_arrow div:nth-of-type(2) { border-top-color: var(--bg) !important; border-bottom-color: var(--bg) !important; }

  /* Search */
  #sk_status, #sk_find { font-size: var(--font-size); border-color: var(--border); }
  .sk_theme kbd { background: var(--bg-dark); border-color: var(--border); box-shadow: none; color: var(--fg); }
  .sk_theme .feature_name span { color: var(--main-fg); }

  /* ACE Editor */
  #sk_editor { background: var(--bg-dark) !important; height: 50% !important; }
  .ace_dialog-bottom { border-top: 1px solid var(--bg) !important; }
  .ace-chrome .ace_print-margin, .ace_gutter, .ace_gutter-cell, .ace_dialog { background: var(--bg) !important; }
  .ace-chrome { color: var(--fg) !important; }
  .ace_gutter, .ace_dialog { color: var(--fg) !important; }
  .ace_cursor { color: var(--fg) !important; }
  .normal-mode .ace_cursor { background-color: var(--fg) !important; border: var(--fg) !important; opacity: 0.7 !important; }
  .ace_marker-layer .ace_selection { background: var(--select) !important; }
  `;
}
