# Quick Reference Card

## 🚀 Commands

```bash
npm run build        # Compile TypeScript → JavaScript
npm run watch        # Auto-rebuild on save
npm run type-check   # Validate types
npm run deploy       # Build + push to gist
```

## 📂 File Structure

```
You edit:          Build generates:       Deployed to:
────────────       ────────────────       ────────────
src-ts/                                   
  ├── config.ts
  ├── utils.ts      ───→ surfingkeys.js ──→ GitHub Gist
  ├── ai-selector.ts                        ↓
  └── index.ts                         SurfingKeys loads it
```

## 🔄 Development Workflow

### Option 1: Quick
```bash
vim src-ts/config.ts    # Edit
npm run deploy          # Build + Deploy
```

### Option 2: Watch Mode (Recommended)
```bash
# Terminal 1
npm run watch           # Leave running

# Terminal 2
vim src-ts/*.ts         # Edit & save → auto-rebuilds
npm run deploy          # When ready
```

## 📝 Common Tasks

### Add a key mapping
```typescript
// src-ts/index.ts
api.mapkey('gn', 'My action', () => {
  api.Front.showBanner('Hello!');
});
```

### Change a color
```typescript
// src-ts/config.ts
export const CONFIG = {
  theme: {
    colors: {
      fg: "#ffffff"  // Change this
    }
  }
};
```

### Add AI service
```typescript
// src-ts/config.ts
export const AI_SERVICES = {
  MY_AI: 'My AI',  // Add here
} as const;

// src-ts/index.ts
api.mapkey('am', 'My AI Search', () => {
  aiSelector.show('', [AI_SERVICES.MY_AI]);
});
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails | `npm run type-check` to see errors |
| Deploy fails | Check `gh auth status` |
| Types not working | Reload VS Code window |
| Gist not updating | Hard refresh browser |

## ⚡ Performance

- Build: **6ms**
- Watch rebuild: **4ms**  
- Type check: **200ms**
- Deploy: **~1s**

## 🔗 URLs

- **Gist raw:** `https://gist.githubusercontent.com/chixing/82767d49380294ad7b298554e2c0e59b/raw/surfingkeys.js`
- **Gist edit:** `https://gist.github.com/chixing/82767d49380294ad7b298554e2c0e59b`

## 💡 Pro Tips

1. **Always use watch mode** during development
2. **Run type-check** before deploying
3. **Check the timestamp** in gist to verify upload
4. **Hard refresh** browser if changes don't appear
5. **Keep `surfingkeys.js` git-ignored** - it's generated

---

📖 **Full docs:** README.md  
🔧 **Build details:** BUILD-DEPLOY-GUIDE.md  
🎯 **Getting started:** GETTING-STARTED.md
