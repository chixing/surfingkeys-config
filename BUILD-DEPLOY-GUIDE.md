# Building and Deploying - Complete Guide

## Overview

You write TypeScript in `src-ts/` → Build converts to JavaScript → Deploy pushes to gist

```
┌─────────────────┐
│  src-ts/*.ts    │  ← You edit these
│  (TypeScript)   │
└────────┬────────┘
         │
         │ npm run build
         │ (esbuild)
         ↓
┌─────────────────┐
│ surfingkeys.js  │  ← Generated file
│  (JavaScript)   │
└────────┬────────┘
         │
         │ npm run deploy
         │ (gh gist edit)
         ↓
┌─────────────────┐
│  GitHub Gist    │  ← Live configuration
│  (Public URL)   │
└─────────────────┘
```

---

## Commands Explained

### 1. `npm run build`

**What it does:** Compiles TypeScript → JavaScript

**Command breakdown:**
```bash
npm run build
  → runs: node build.mjs
    → runs: esbuild
      → reads: src-ts/index.ts (entry point)
      → follows all imports
      → compiles TypeScript
      → bundles into single file
      → outputs: surfingkeys.js
```

**Files involved:**
- Input: `src-ts/*.ts` (all your TypeScript files)
- Script: `build.mjs` (the build script)
- Output: `surfingkeys.js` (single bundled file)

**When to use:**
- After editing any `src-ts/*.ts` file
- Before deploying
- To test your changes locally

**Output example:**
```
🔨 Building...
✅ Build complete!
   Output: surfingkeys.js
   Size: 20.21 KB (608 lines)
   ⚡ Done in 6ms
```

---

### 2. `npm run watch`

**What it does:** Auto-rebuild on file changes

**Command breakdown:**
```bash
npm run watch
  → runs: node build.mjs --watch
    → watches: src-ts/*.ts
    → on file save:
      → rebuilds automatically
      → shows new output
```

**When to use:**
- During active development
- Leave it running in a terminal
- Edit files and see instant rebuilds

**Output example:**
```
👀 Watching for changes...
[watch] build finished, watching for changes...

[save file]
✅ Build complete!
   Output: surfingkeys.js
   Size: 20.22 KB (609 lines)
   ⚡ Done in 4ms
[watch] build finished, watching for changes...
```

**Workflow:**
```bash
# Terminal 1 - watch mode
npm run watch

# Terminal 2 - edit files
vim src-ts/config.ts
# Save → auto-rebuilds

# When ready to deploy
npm run deploy
```

---

### 3. `npm run type-check`

**What it does:** Validates TypeScript types (no output)

**Command breakdown:**
```bash
npm run type-check
  → runs: tsc --noEmit
    → reads: tsconfig.json
    → checks all .ts files for type errors
    → does NOT generate JavaScript
    → exits with error if types are wrong
```

**When to use:**
- Before committing code
- To catch type errors early
- Faster than full build (only checks, doesn't bundle)

**Output example (success):**
```bash
$ npm run type-check
# (no output = success)
```

**Output example (error):**
```bash
$ npm run type-check

src-ts/index.ts:43:27: error TS2345
  Argument of type 'string' is not assignable to parameter of type 'number'
```

---

### 4. `npm run deploy`

**What it does:** Build + Push to gist

**Command breakdown:**
```bash
npm run deploy
  → runs: npm run build
    → (builds surfingkeys.js)
  → then runs: node update-gist.mjs
    → uses GitHub CLI (gh)
    → runs: gh gist edit 82767d49380294ad7b298554e2c0e59b surfingkeys.js
      → uploads file to gist
      → updates the raw URL
```

**Files involved:**
- Script: `update-gist.mjs` (deploy script)
- Input: `surfingkeys.js` (built file)
- Output: Updates gist at GitHub

**Prerequisites:**
- GitHub CLI must be installed: `gh --version`
- Must be authenticated: `gh auth status`

**When to use:**
- After testing your changes
- When ready to make changes live
- After successful build

**Output example:**
```
🔨 Building TypeScript...
✅ Build complete!
   Size: 20.21 KB (608 lines)

📤 Updating gist...
✅ Gist updated successfully!
🔗 URL: https://gist.githubusercontent.com/chixing/82767d49380294ad7b298554e2c0e59b/raw/surfingkeys.js
```

---

## The Build Script (`build.mjs`)

<function_calls>
<invoke name="Read">
<parameter name="file_path">/home/chi/workspace/gist/build.mjs
## The Build Script (`build.mjs`)

**Key configuration options:**

```javascript
const buildOptions = {
  entryPoints: ['src-ts/index.ts'],  // Start here
  bundle: true,                       // Combine all files
  outfile: 'surfingkeys.js',         // Output filename
  format: 'iife',                     // Wrap in function (browser-safe)
  target: 'es2020',                   // Target JavaScript version
  platform: 'browser',                // Browser environment
  minify: false,                      // Keep readable
  treeShaking: true,                  // Remove unused code
};
```

**What each option means:**

- `entryPoints` - Where to start reading code
- `bundle: true` - Combine all imports into one file
- `format: 'iife'` - Wraps code in `(function() { ... })()` 
- `target: 'es2020'` - Modern JavaScript (Chrome/Firefox support)
- `minify: false` - Keep code readable for debugging
- `treeShaking: true` - Remove unused exports

---

## The Deploy Script (`update-gist.mjs`)

**What it does:**

1. **Builds first:**
   ```javascript
   execSync('node build.mjs', { stdio: 'inherit' });
   ```

2. **Checks file exists:**
   ```javascript
   if (!existsSync('surfingkeys.js')) {
     console.error('❌ surfingkeys.js not found');
     process.exit(1);
   }
   ```

3. **Updates gist:**
   ```javascript
   const GIST_ID = '82767d49380294ad7b298554e2c0e59b';
   execSync(`gh gist edit ${GIST_ID} surfingkeys.js`);
   ```

**Uses GitHub CLI** (`gh`) to update the gist. This is much easier than using the API directly!

---

## Common Workflows

### Workflow 1: Quick Edit

```bash
# 1. Edit source
vim src-ts/config.ts

# 2. Build & deploy in one command
npm run deploy
```

### Workflow 2: Development Session

```bash
# Terminal 1 - Auto-rebuild
npm run watch

# Terminal 2 - Edit files
vim src-ts/index.ts
# Save → auto-rebuilds!

# Terminal 2 - Test by inspecting output
grep "my new feature" surfingkeys.js

# When ready:
npm run deploy
```

### Workflow 3: Safe Development

```bash
# 1. Edit files
vim src-ts/*.ts

# 2. Check types first
npm run type-check

# 3. If types are good, build
npm run build

# 4. Inspect output (optional)
head -50 surfingkeys.js

# 5. Deploy
npm run deploy
```

---

## Understanding the Output

### Build Output

```
🔨 Building...
✅ Build complete!
   Output: surfingkeys.js
   Size: 20.21 KB (608 lines)
   ⚡ Done in 6ms
```

- **20.21 KB** - Final bundled size
- **608 lines** - Total lines in output
- **6ms** - Build time (very fast!)

### What's in `surfingkeys.js`

```javascript
/**
 * SurfingKeys Configuration
 * Built with TypeScript + esbuild
 * Generated: 2026-01-17T21:22:41.361Z
 */

"use strict";
(() => {
  // All your code here, bundled together
  // TypeScript types removed
  // All imports resolved
  
  var CONFIG = {
    scrollStep: 120,
    // ...
  };
  
  // ... rest of your code
})();
```

**Notice:**
- Wrapped in `(() => { ... })()` - self-executing function
- All `import`/`export` statements are gone (resolved)
- Types are stripped (`:string`, `:number`, etc.)
- Comments preserved (unless you minify)

---

## Troubleshooting

### Build Fails with Type Errors

```bash
# Check what's wrong
npm run type-check

# Common fixes:
# - Fix the type error shown
# - Add type assertion: `as any`
# - Update interface definition
```

### Deploy Fails - "gh not found"

```bash
# Install GitHub CLI
# On macOS:
brew install gh

# On Linux:
sudo apt install gh  # Debian/Ubuntu
# or
sudo dnf install gh  # Fedora

# Authenticate:
gh auth login
```

### Deploy Fails - "Permission denied"

```bash
# Re-authenticate
gh auth refresh

# Or logout and login again
gh auth logout
gh auth login
```

### Gist URL Returns Old Version

GitHub gist caching can be aggressive. Try:

1. **Hard refresh:** `Ctrl+Shift+R` in browser
2. **Clear cache:** In SurfingKeys, might need to restart browser
3. **Wait:** Can take 1-2 minutes for CDN to update

**Check it worked:**
```bash
# See the timestamp in the gist
curl https://gist.githubusercontent.com/chixing/82767d49380294ad7b298554e2c0e59b/raw/surfingkeys.js | head -5

# Should show:
# /**
#  * SurfingKeys Configuration
#  * Built with TypeScript + esbuild
#  * Generated: 2026-01-17T21:XX:XX.XXXZ  ← Check this timestamp
#  */
```

---

## Performance

**Build times:**
- First build: ~100ms (cold start)
- Incremental: ~6ms (watch mode)
- Type check: ~200ms

**Output size:**
- TypeScript sources: ~23 KB (total)
- Built JavaScript: ~20 KB (bundled)
- Gzipped: ~6 KB (what browser downloads)

**Why so fast?**
- esbuild is written in Go (parallel, native speed)
- Simpler than webpack/rollup
- Purpose-built for speed

---

## Advanced: Customizing the Build

### Enable Minification

Edit `build.mjs`:

```javascript
const buildOptions = {
  // ...
  minify: true,  // Change from false
};
```

**Result:**
- Smaller file (~10 KB)
- Harder to debug
- No functional difference

### Enable Source Maps

Edit `build.mjs`:

```javascript
const buildOptions = {
  // ...
  sourcemap: true,  // Change from false
};
```

**Result:**
- Generates `surfingkeys.js.map`
- Browser can show original TypeScript in debugger
- Larger file size

### Change Target

Edit `build.mjs`:

```javascript
const buildOptions = {
  // ...
  target: 'es2015',  // Support older browsers
  // or
  target: 'esnext',  // Use latest features
};
```

---

## Summary

| Command | Use Case | Speed |
|---------|----------|-------|
| `npm run build` | After editing files | 6ms |
| `npm run watch` | Active development | Auto |
| `npm run type-check` | Before committing | 200ms |
| `npm run deploy` | Push to production | ~1s |

**Typical workflow:**
1. `npm run watch` (leave running)
2. Edit `src-ts/*.ts` files
3. See instant rebuilds
4. When done: `npm run deploy`

**Files you edit:** `src-ts/*.ts`
**File that gets deployed:** `surfingkeys.js` (generated)
**Where it goes:** GitHub Gist → SurfingKeys loads it

That's it! 🚀
