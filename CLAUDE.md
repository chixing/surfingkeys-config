# CLAUDE.md

## What this is

A TypeScript [SurfingKeys](https://github.com/brookhong/Surfingkeys) browser
configuration. `src/` is bundled by **tsup** into a single minified IIFE at
`dist/surfingkeys.js`, which is the artifact SurfingKeys loads.

## Deploy

- Main pushes do not publish. `.github/workflows/bundle.yml` builds a retained bundle on a version tag or manual dispatch; `.github/workflows/deploy.yml` promotes a successful bundle run only by manual dispatch.
- Version comes from package.json/package-lock.json. A tag must be `v<version>` and identify main history. Bundles record source SHA; `release/` contains exact JS/source map, manifest and SHA256SUMS.
- Run `npm run package:release` from a clean checkout to lint, type-check, build and package. `npm run deploy` verifies and publishes retained `release/surfingkeys.js` without rebuilding. It requires the recorded source in `origin/main`.
- To promote or restore, dispatch “Promote retained bundle to Gist” on main with a successful “Bundle release” run ID. The workflow validates run provenance, source ancestry and hashes before editing the existing gist. Restoring uses the previous successful run, not a rebuild.
- `npm run release` verifies, bumps the patch version, commits/tags, then pushes for packaging. A push failure should be retried without another bump. Tag builds save draft downloads; publication and gist promotion remain deliberate.
- Verify the loaded dialog version and intended page/clipboard behavior before calling a promotion accepted. See RELEASE.md for installation and recovery.

## Commands

- `npm run build` / `npm run watch` — tsup bundle (watch rebuilds on change)
- `npm run type-check` — `tsc --noEmit`, strict
- `npm run lint` / `npm run lint:fix` — Biome check / check --write
- `npm run deploy` — verify + push the retained release bundle to the gist

## Architecture

Entry `src/index.ts` wires everything in order: build `CONFIG` → `applySettings()`
→ construct `AiSelector` → `registerKeyMappings()` → `initializeSiteAutomations()`
→ `registerSearchEngines()` → `applyTheme()` → `keepFrontendDetachedWhenIdle()`.

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
