# Getting Started

## 1. Install Dependencies

```bash
npm install
```

## 2. Development Workflow

### Option A: Watch Mode (Recommended)

```bash
npm run watch
```

Leave this running. It will automatically rebuild when you save any file in `src-ts/`.

### Option B: Manual Build

```bash
npm run build
```

Run this after making changes.

## 3. Deploy to Gist

```bash
npm run deploy
```

This will:
1. Build the TypeScript code
2. Push `surfingkeys.js` to your gist

## 4. Edit Your Configuration

All source files are in `src-ts/`:

- `config.ts` - Settings, theme colors, AI service definitions
- `utils.ts` - Helper functions
- `ai-selector.ts` - AI selector dialog (simplified stub - expand as needed)
- `index.ts` - Main entry point, key mappings
- `types/surfingkeys.d.ts` - Type definitions for SurfingKeys API

## Quick Examples

### Add a new key mapping

Edit `src-ts/index.ts`:

```typescript
api.mapkey('gn', 'Open HackerNews', () => {
  api.tabOpenLink('https://news.ycombinator.com');
});
```

### Change theme colors

Edit `src-ts/config.ts`:

```typescript
export const CONFIG: Config = {
  // ...
  theme: {
    // ...
    colors: {
      fg: "#your-color-here",
      // ...
    }
  }
};
```

### Add a new utility function

Edit `src-ts/utils.ts`:

```typescript
export const myNewFunction = () => {
  // Your code
};
```

Then import in `index.ts`:

```typescript
import * as utils from './utils';

// Use it
utils.myNewFunction();
```

## Type Safety Benefits

Your IDE will now:
- ✅ Show autocomplete for all SurfingKeys API methods
- ✅ Catch typos at build time
- ✅ Show documentation on hover
- ✅ Enable go-to-definition across files
- ✅ Support automatic refactoring

## Troubleshooting

### Build fails

```bash
# Check for type errors
npm run type-check

# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### Gist not updating

Make sure `gh` CLI is authenticated:

```bash
gh auth status
```

If not authenticated:

```bash
gh auth login
```

## What's Next?

1. Try editing `src-ts/config.ts` to change a color
2. Run `npm run build`
3. Check that `surfingkeys.js` was regenerated
4. Deploy with `npm run deploy`

Enjoy your type-safe SurfingKeys configuration! 🚀
