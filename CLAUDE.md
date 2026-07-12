# CLAUDE.md

## What this is

A TypeScript [SurfingKeys](https://github.com/brookhong/Surfingkeys) browser
configuration. `src/` is bundled by **tsup** into a single minified IIFE at
`dist/surfingkeys.js`, which is the artifact SurfingKeys loads.

## Deploy

- `dist/surfingkeys.js` is published to a GitHub gist (`82767d49380294ad7b298554e2c0e59b`)
  via `npm run deploy` (`gh gist edit ...`).
- CI (`.github/workflows/deploy.yml`) runs deploy on every push to `main`, so
  **pushing to main = deploying**. Type-check runs in CI before deploy.

## Commands

- `npm run build` / `npm run watch` — tsup bundle (watch rebuilds on change)
- `npm run type-check` — `tsc --noEmit`, strict
- `npm run lint` / `npm run lint:fix` — Biome check / check --write
- `npm run deploy` — build + push bundle to the gist

## Architecture

Entry `src/index.ts` wires everything in order: build `CONFIG` → `applySettings()`
→ construct `AiSelector` → `registerKeyMappings()` → `initializeSiteAutomations()`
→ `registerSearchEngines()` → `applyTheme()`.

- The global `api` and `settings` objects are injected by SurfingKeys **at
  runtime**; they are hand-typed in `src/types/surfingkeys.d.ts`. That file is
  intentionally incomplete — extend it as needed, don't expect full coverage.
- `src/ai/selector.ts` — the AI selector dialog injects its own overlay plus a
  scoped `<style>` into arbitrary pages. Injected elements must be marked
  `fromSurfingKeys` (see `markAsSurfingKeys`) or SurfingKeys will intercept their
  key events.
- `src/automations/` — site automations drive AI-site composers by opening the
  target with a `#sk_prompt=` URL fragment, then filling/submitting the composer.
- `src/keymaps/editor.ts` — has a **load-bearing comment** explaining the ACE
  editor `q<CR>` / `keyToEx` save behavior. Read it before touching editor
  mappings; the `function` monkey-patches in `keymaps/backInNewTab.ts` are also
  intentional (Biome's `useArrowFunction` is disabled for them).

## Conventions

- No tests. Verification = `npm run type-check && npm run build`.
- Style enforced by Biome: 2-space indent, single quotes, semicolons, 110 cols.
  Disabled rules: `noExplicitAny` (untyped SurfingKeys API), `useArrowFunction`
  and `noUselessEmptyExport` (see above / the `.d.ts` module marker).
- Commit messages: short imperative subject, no prefixes.
