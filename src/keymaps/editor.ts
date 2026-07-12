/**
 * ACE editor (Ctrl-i) vim mappings.
 *
 * Defaults are unintuitive: Enter in normal mode runs :wq, Esc does nothing,
 * and Ctrl-Enter only saves from insert mode. Make it consistent:
 * submit with Enter/Ctrl-Enter, cancel with Esc, jk to leave insert mode.
 */
export function registerEditorMappings(): void {
  api.aceVimMap('jk', '<Esc>', 'insert');
  api.aceVimMap('<C-CR>', ':wq<CR>', 'normal');
  api.aceVimMap('<Esc>', ':q<CR>', 'normal');
}
