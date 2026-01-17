import { existsSync, renameSync, rmSync } from 'fs';

const src = 'dist/surfingkeys.global.js';
const dest = 'dist/surfingkeys.js';

if (existsSync(src)) {
  if (existsSync(dest)) {
    rmSync(dest);
  }
  renameSync(src, dest);
}
