/**
 * ACE editor (Ctrl-i) vim mappings.
 *
 * Stock Surfingkeys maps Enter/Ctrl-Enter by replaying ':wq<CR>' through the
 * ex command line. The bundled ACE opens that prompt asynchronously, so the
 * replayed 'w','q','<CR>' leak into normal mode: 'q' starts macro recording,
 * eats the final Enter, and the editor is stranded at ':' without saving.
 * keyToEx mappings run the ex command directly, no command-line replay.
 *
 * 'q' itself is mapped to save-and-quit so the stock Ctrl-Enter insert-mode
 * replay (which we cannot override; show() re-installs it on every open)
 * terminates in a save when its stray 'q' lands in normal mode.
 */
export function registerEditorMappings(): void {
  api.addVimMapKey(
    { keys: '<CR>', type: 'keyToEx', exArgs: { input: 'wq' }, context: 'normal' },
    { keys: '<C-CR>', type: 'keyToEx', exArgs: { input: 'wq' }, context: 'normal' },
    { keys: 'q', type: 'keyToEx', exArgs: { input: 'wq' }, context: 'normal' },
    { keys: 'Q', type: 'keyToEx', exArgs: { input: 'q' }, context: 'normal' },
  );
}
