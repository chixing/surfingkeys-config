# SurfingKeys Configuration

Modern TypeScript-based SurfingKeys configuration with full type safety and IDE support.

## Repos & URLs

- **Source repo:** https://github.com/chixing/surfingkeys-config
- **Gist raw (loaded by SurfingKeys):** https://gist.githubusercontent.com/chixing/82767d49380294ad7b298554e2c0e59b/raw/surfingkeys.js
- **Gist edit:** https://gist.github.com/chixing/82767d49380294ad7b298554e2c0e59b
- **Templates raw:** https://gist.githubusercontent.com/chixing/82767d49380294ad7b298554e2c0e59b/raw/templates.json

This project uses two remotes:
- **Regular GitHub repo** stores all TypeScript source and tooling.
- **Gist** hosts the generated `dist/surfingkeys.js` file that SurfingKeys loads.

## Quick Start

```bash
npm install
npm run build
```

## Development Workflow

### Option A: Watch Mode (Recommended)

```bash
# Terminal 1
npm run watch

# Terminal 2
vim src/*.ts

# When ready
git add -A
git commit -m "Update config"
git push
npm run package:release
npm run deploy
```

### Option B: Manual Build

```bash
# Edit files
vim src/config.ts

# Build
npm run build

# Commit
git add -A
git commit -m "Update config"
git push

# Deploy
npm run package:release
npm run deploy
```

## Build & Deploy (What Happens)

```
src/*.ts  --(npm run build)-->  dist/surfingkeys.js  --(npm run deploy)-->  GitHub Gist
```

- `npm run build` compiles TypeScript to a single `dist/surfingkeys.js` bundle.
- `npm run package:release` verifies and packages a clean commit. `npm run deploy` verifies the retained bytes and updates the gist without rebuilding. Main pushes do not deploy; see [release and recovery](RELEASE.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build `dist/surfingkeys.js` from TypeScript sources |
| `npm run watch` | Auto-rebuild on file changes |
| `npm run type-check` | Validate types without building |
| `npm run package:release` | Verify, build and retain release files |
| `npm run deploy` | Verify and promote retained release files |
| `npm run deploy:templates` | Publish `templates.json` independently to the gist |

## Project Structure

```
/gist/
  ├── src/                       # TypeScript source files
  │   ├── ai/
  │   │   ├── selector.ts         # Multi-AI dialog UI/logic
  │   │   └── templates.ts        # Catalog loader, types, and prompt formatting
  │   ├── automations/
  │   │   └── index.ts            # Site-specific automations
  │   ├── keymaps/
  │   │   └── register.ts         # Key mappings
  │   ├── search/
  │   │   └── engines.ts          # Search engine aliases
  │   ├── theme/
  │   │   └── apply.ts            # Theme styling
  │   ├── types/
  │   │   └── surfingkeys.d.ts   # SurfingKeys API type definitions
  │   ├── config.ts              # Configuration & constants
  │   ├── utils.ts               # Utility functions
  │   └── index.ts               # Main entry point
  ├── package.json               # Dependencies & scripts
  ├── templates.json             # Prompt catalog (fetched when the dialog opens)
  ├── tsconfig.json              # TypeScript configuration
  ├── tsup.config.ts             # tsup bundler config
  └── dist/                      # Generated output (git ignored)
```

## Common Tasks

### Add a new key mapping

```typescript
// src/index.ts
api.mapkey('gn', 'My action', () => {
  api.Front.showBanner('Hello!');
});
```

### Change theme colors

```typescript
// src/config.ts
export const CONFIG = {
  theme: {
    colors: {
      fg: "#ffffff"
    }
  }
};
```

### Add a new AI service

```typescript
// src/config.ts
export const AI_SERVICES = {
  MY_AI: 'My AI',
} as const;

// src/index.ts
api.mapkey('am', 'My AI Search', () => {
  aiSelector.show('', [AI_SERVICES.MY_AI]);
});
```

### Use multi-prompt fanout

- Press `aa` to open the Multi-AI dialog. The lowercase AI shortcuts (`aa`, `ac`, `ad`, `ae`,
  `ag`, `ap`, and `ak`) prefill the dialog with selected text when available, including while
  SurfingKeys Visual mode is active; otherwise they fall back to the remembered query or clipboard.
- Enter your query, optionally select one or more prompt templates, then select one or more AI services.
- With no prompt templates selected, submit sends only the search query.
- Submit opens tabs for every selected `service x prompt` combination.
- If the selection would open more than 12 tabs, the dialog asks for confirmation first.

The **Thariq** and **Felix** sections contain adapted practitioner prompts. Their previews
link to the original sources and show whether they work on a page or start a conversation.
Thariq covers blind spots, domain vocabulary, and goal interviews. Felix covers expert
deep reading, improving a task request, and finding the outcome behind a task.

### Edit URL components

Press `;i` to edit the current HTTP(S) URL in a structured dialog. Scheme, host,
port, individual path segments, query name/value rows, and fragment are separate
fields. Query checkboxes temporarily exclude parameters. Duplicate names, bare
flags, empty values, and untouched URL encoding are preserved; edited fields are
encoded automatically. Fragment edits preserve hash-route delimiters.

The live preview updates as you type. **Ctrl+Enter** opens the URL in this tab;
**Ctrl+Shift+Enter** opens a new tab. **Alt+P** adds a path segment, **Alt+Q** adds
a query parameter, and **Alt+H** focuses the fragment. **Tab/Shift+Tab** cycle
controls; **Esc** closes. **Reset** restores the opening URL. **Load a full URL**
parses another address. The existing `;u` free editor remains available.

### Manage tab groups

Press `;gg` and type a group name or tab title. The first match is selected
automatically. **Enter** opens its actions; **Ctrl+Enter** switches directly.
**Alt+1–9** opens a numbered result's actions. Search and selection are preserved
when returning from an action screen. The upstream `;G` mapping is removed.

In actions, press **s** to switch, **a** to move this tab into the group, **r** to
rename/recolor, **c** to collapse/expand, **d** to dissolve while keeping tabs
open, **u** to remove this tab (when it belongs to the group), or **x** to review
closing the group. Closing defaults to Cancel; **y** confirms only after the
confirmation is displayed and membership is rechecked.

From the list, **Alt+N** creates a group, **Ctrl+Shift+U** dissolves all groups in
the current window regardless of the search filter, and **?** shows shortcuts.
**Alt+W** shows/hides other windows; they are hidden initially. Switch to another
window before moving tabs into or dissolving its groups. **Esc** goes back, then
closes. On the command screen, Up/Down moves within a column, Left/Right moves
between enabled commands, and Home/End jumps to the first/last command. Disabled
commands are skipped; Enter/Space activates. Tab/Shift+Tab cycle controls. Enter saves
forms; colors support Up/Down and Home/End.

The compact dialog uses its own Blob document and scoped styles, keeping its
keyboard handling separate from stock Surfingkeys. The config restores focus
when the dialog closes and releases the document URL. If a page blocks the
dialog, a banner reports it instead of leaving an invisible overlay.

During dissolve, **s** or **Stop** cancels further work; **Esc** stops and closes
the dialog. Tabs already ungrouped stay ungrouped. Other windows and groups/tabs
added after the snapshot are left alone.

Dissolving first gives loaded pages three seconds to ungroup themselves together
without switching tabs. Any original tabs still grouped are then visited one at
a time, restoring the starting tab afterward. It does not move, reload, or close
tabs. Load the updated config on participating pages; reload them when safe.
Pages running the previous sequential config can still answer fallback requests.
Restricted pages, disabled Surfingkeys, or missing configs may leave tabs grouped;
the result lists them. Fallback requests expire after five seconds per tab, and
the entire operation stops after about 45 seconds, including the parallel pass.
Loaded pages check shared requests every two seconds and on focus or visibility
changes. Chrome may throttle or suspend background pages; fallback handles those
that miss the parallel pass. With MRU ordering disabled or sender identification
unavailable, tabs also use the sequential fallback.

Requires Surfingkeys tab-group runtime actions and a browser with the tabGroups
API. Source changes require a release and promotion before the installed
extension loads them.

This repository remains configuration-only. It does not patch, build, replace,
or install Surfingkeys. Stock `ungroupTab` acts on the sending tab. The config
coordinates these requests across loaded pages for parallel ungrouping, then
uses the existing sequential path for remaining tabs.

### Update prompt templates

Edit `templates.json`, then run `npm run lint` and `npm run deploy:templates`.
Publish the catalog once before promoting the first config that uses the remote loader.
Subsequent template changes need no config rebuild, release, or browser reload:
each dialog opening requests the catalog again with a cache-busting query parameter.

The dialog opens immediately while templates load. Invalid JSON, invalid template fields,
or a request taking longer than 10 seconds produces an error with a Retry button;
you can still send a query without a template. Closing and reopening the dialog
discards edits and selections, and fetches a fresh catalog.

The catalog is a JSON array with the existing `label`, `value`, `category`, `description`,
and `tier` fields, plus optional `tags`, `context`, and `source` fields. Categories are
`standards`, `explain`, `research`, `decision`, `thariq`, and `felix`; tiers are `short` or `long`.
It is loaded as data, never executed as JavaScript.

By default, the catalog is a separate file in the same gist as the config.
To use another gist, upload `templates.json` there and set `CONFIG.promptTemplatesUrl`
in `src/config.ts` to its raw HTTPS URL (without a revision hash). Also update the gist ID
in the `deploy:templates` script. Changing the URL requires a config release;
editing the catalog at that URL does not.

## Troubleshooting

- **Build fails:** `npm run type-check` to see errors.
- **Deploy fails:** Check `gh auth status`.
- **Gist not updating:** Hard refresh browser or wait 1–2 minutes for CDN.

## Notes

- `dist/surfingkeys.js` is generated and git-ignored.
- The repo tracks **source code**; the gist hosts **built output**.
