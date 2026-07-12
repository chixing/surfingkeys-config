/**
 * ACE editor (Ctrl-i) vim mappings.
 *
 * Stock Surfingkeys maps Enter/Ctrl-Enter by replaying ':wq<CR>' through the
 * ex command line, which can strand the editor at a bare ':' prompt. keyToEx
 * mappings run the ex command directly, no command-line replay involved.
 */
export function registerEditorMappings(): void {
  api.aceVimMap('jk', '<Esc>', 'insert');
  api.addVimMapKey(
    { keys: '<CR>', type: 'keyToEx', exArgs: { input: 'wq' }, context: 'normal' },
    { keys: '<C-CR>', type: 'keyToEx', exArgs: { input: 'wq' }, context: 'normal' },
    { keys: 'Q', type: 'keyToEx', exArgs: { input: 'q' }, context: 'normal' },
  );
}
