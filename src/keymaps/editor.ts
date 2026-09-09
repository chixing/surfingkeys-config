/**
 * ACE editor (Ctrl-i) vim mappings.
 *
 * Stock Surfingkeys maps Enter/Ctrl-Enter by replaying ':wq<CR>' through the
 * ex command line. The bundled ACE opens that prompt asynchronously, so the
 * replayed 'w','q','<CR>' leak into normal mode: 'q' starts macro recording,
 * eats the final Enter, and the editor is stranded at ':' without saving.
 * keyToEx mappings run the ex command directly, no command-line replay.
 *
 * The 'q<CR>' sequence makes that replay terminate in a save: its stray 'q'
 * partial-matches macro recording (q<register>) and waits, then the trailing
 * '<CR>' completes our mapping instead of being swallowed as an invalid
 * register. Interactive recording (q + letter) is untouched.
 */
export function registerEditorMappings(): void {
  api.addVimMapKey(
    { keys: '<CR>', type: 'keyToEx', exArgs: { input: 'wq' }, context: 'normal' },
    { keys: '<C-CR>', type: 'keyToEx', exArgs: { input: 'wq' }, context: 'normal' },
    { keys: 'q<CR>', type: 'keyToEx', exArgs: { input: 'wq' }, context: 'normal' },
    { keys: 'Q', type: 'keyToEx', exArgs: { input: 'q' }, context: 'normal' },
  );
}
