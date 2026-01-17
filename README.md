# SurfingKeys Configuration

Modern TypeScript-based SurfingKeys configuration with full type safety and IDE support.

## Repos & URLs

- **Source repo:** https://github.com/chixing/surfingkeys-config
- **Gist raw (loaded by SurfingKeys):** https://gist.githubusercontent.com/chixing/82767d49380294ad7b298554e2c0e59b/raw/surfingkeys.js
- **Gist edit:** https://gist.github.com/chixing/82767d49380294ad7b298554e2c0e59b

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
npm run deploy
```

## Build & Deploy (What Happens)

```
src/*.ts  --(npm run build)-->  dist/surfingkeys.js  --(npm run deploy)-->  GitHub Gist
```

- `npm run build` compiles TypeScript to a single `dist/surfingkeys.js` bundle.
- `npm run deploy` runs the build and then updates the gist via `gh gist edit`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build `dist/surfingkeys.js` from TypeScript sources |
| `npm run watch` | Auto-rebuild on file changes |
| `npm run type-check` | Validate types without building |
| `npm run deploy` | Build and push to gist |

## Project Structure

```
/gist/
  ├── src/                       # TypeScript source files
  │   ├── types/
  │   │   └── surfingkeys.d.ts   # SurfingKeys API type definitions
  │   ├── config.ts              # Configuration & constants
  │   ├── utils.ts               # Utility functions
  │   ├── ai-selector.ts         # AI Selector class
  │   └── index.ts               # Main entry point
  ├── package.json               # Dependencies & scripts
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

## Troubleshooting

- **Build fails:** `npm run type-check` to see errors.
- **Deploy fails:** Check `gh auth status`.
- **Gist not updating:** Hard refresh browser or wait 1–2 minutes for CDN.

## Notes

- `dist/surfingkeys.js` is generated and git-ignored.
- The repo tracks **source code**; the gist hosts **built output**.
