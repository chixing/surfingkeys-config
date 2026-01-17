# SurfingKeys Configuration

Modern TypeScript-based SurfingKeys configuration with full type safety and IDE support.

## Setup

The configuration is loaded via:
```
https://gist.githubusercontent.com/chixing/82767d49380294ad7b298554e2c0e59b/raw/surfingkeys.js
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build

```bash
npm run build
```

This generates `surfingkeys.js` from your TypeScript sources.

### 3. Deploy to Gist

```bash
npm run deploy
```

This builds and pushes to your gist in one command.

## Project Structure

```
/gist/
  ├── src-ts/                    # TypeScript source files
  │   ├── types/
  │   │   └── surfingkeys.d.ts   # SurfingKeys API type definitions
  │   ├── config.ts              # Configuration & constants
  │   ├── utils.ts               # Utility functions
  │   ├── ai-selector.ts         # AI Selector class
  │   └── index.ts               # Main entry point
  ├── package.json               # Dependencies & scripts
  ├── tsconfig.json              # TypeScript configuration
  ├── build.mjs                  # esbuild bundler script
  ├── update-gist.mjs            # Gist deployment script
  └── surfingkeys.js             # Generated output (git ignored)
```

## Development Workflow

### Option 1: Manual Build

```bash
# Edit TypeScript files in src-ts/
vim src-ts/config.ts

# Build
npm run build

# Deploy when ready
npm run deploy
```

### Option 2: Watch Mode (Recommended)

```bash
# Auto-rebuild on file changes
npm run watch
```

Keep this running in a terminal. Every time you save a file, it rebuilds automatically.

In another terminal:
```bash
# Deploy when ready
npm run deploy
```

### Type Checking

```bash
# Run TypeScript compiler in check-only mode
npm run type-check
```

This checks for type errors without generating code.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build `surfingkeys.js` from TypeScript sources |
| `npm run watch` | Auto-rebuild on file changes |
| `npm run type-check` | Validate types without building |
| `npm run deploy` | Build and push to gist |

## Features

### Multi-AI Search

Press `aa` to open the Multi-AI Search dialog. Pre-configured services:
- ChatGPT (`ac`)
- Claude (`ae`)
- Gemini (`ag`)
- Perplexity (`ap`)
- Doubao (`ad`)
- Alice/Yandex (`ay`)
- Grok (`ak`)
- Perplexity Research (`aP`)

### Custom Search Engines

- `a` - Amazon
- `t` - GitHub
- `n` - Yandex
- `c` - Anna's Archive

### Key Mappings

- `K` / `J` - Previous/Next page
- `T` - Tab search
- `ye` - Copy image to clipboard
- `gp` - Open Chrome passwords
- `gs` - Open Chrome extensions

### Theme

Catppuccin Mocha color scheme with custom styling for hints, omnibar, and visual mode.

## Adding New Features

### Example: Add a New AI Service

Edit `src-ts/config.ts`:

```typescript
export const AI_SERVICES = {
  // ... existing services
  GEMINI_PRO: 'Gemini Pro',
} as const;
```

Then add the key mapping in `src-ts/index.ts`:

```typescript
api.mapkey('aG', 'Gemini Pro Search', () => {
  aiSelector.show('', [AI_SERVICES.GEMINI_PRO]);
  navigator.clipboard.readText()
    .then(text => aiSelector.updateQuery(text))
    .catch(() => {});
});
```

Build and deploy:

```bash
npm run deploy
```

### Example: Add a New Key Mapping

Edit `src-ts/index.ts`:

```typescript
api.mapkey('gn', 'My new action', () => {
  // Your code here - full autocomplete for api methods!
  api.Front.showBanner('Hello from TypeScript!');
});
```

### Example: Add a New Utility Function

Edit `src-ts/utils.ts`:

```typescript
/**
 * Fetch JSON from a URL
 */
export async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
```

Then import and use it:

```typescript
import { fetchJSON } from './utils';

const data = await fetchJSON<{ name: string }>('https://api.example.com/user');
console.log(data.name); // Fully typed!
```

## Benefits of TypeScript

### 1. Type Safety

Catch errors at build time instead of runtime:

```typescript
// Typo - caught immediately
api.Front.showBaner('Hello');
//           ^^^^^^^^^ Property 'showBaner' does not exist
```

### 2. Autocomplete

Type `api.` and your IDE shows all available methods with documentation.

### 3. Refactoring

Rename a function or variable - your IDE updates all references automatically.

### 4. Module System

Explicit imports prevent global scope pollution:

```typescript
// Explicit imports - no conflicts
import { CONFIG } from './config';
import { delay } from './utils';
```

### 5. Documentation

Hover over functions to see their documentation:

```typescript
/**
 * Show the AI selector dialog
 * @param initialQuery - Pre-fill the search box
 * @param selectedServices - Pre-select specific AI services
 */
show(initialQuery: string = '', selectedServices: AIServiceName[] | null = null): void
```

## Build Output

The bundler creates a single `surfingkeys.js` file:

- All TypeScript compiled to ES2020 JavaScript
- All imports/exports resolved into one file
- Tree-shaking removes unused code
- Source is readable (not minified) for debugging
- Build time: < 100ms

## Troubleshooting

### Build Errors

```bash
# Check TypeScript errors
npm run type-check

# Clean build
rm -rf node_modules surfingkeys.js
npm install
npm run build
```

### Gist Not Updating

```bash
# Check gh CLI is authenticated
gh auth status

# Manually update
gh gist edit 82767d49380294ad7b298554e2c0e59b surfingkeys.js
```

### IDE Not Showing Types

1. Make sure your IDE is using the workspace TypeScript version
2. Reload window: `Ctrl+Shift+P` → "Reload Window"
3. Check `tsconfig.json` is in the root directory

## VS Code Recommended Extensions

- TypeScript (built-in)
- [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) - Inline error highlighting
- [Pretty TypeScript Errors](https://marketplace.visualstudio.com/items?itemName=yoavbls.pretty-ts-errors) - Better error messages

## Performance

- Initial build: ~100ms
- Incremental rebuild: ~10ms
- Type checking: ~200ms

Fast enough to not interrupt your workflow.

## Git Workflow

The generated `surfingkeys.js` should probably be git ignored:

```bash
echo "surfingkeys.js" >> .gitignore
```

This way, only your TypeScript sources are tracked. The built file is generated fresh each time.

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [esbuild Documentation](https://esbuild.github.io/)
- [SurfingKeys GitHub](https://github.com/brookhong/Surfingkeys)

## License

Personal configuration - use as you wish!
