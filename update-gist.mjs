#!/usr/bin/env node
/**
 * Update gist script
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const GIST_ID = '82767d49380294ad7b298554e2c0e59b';

console.log('🔨 Building TypeScript...');
try {
  execSync('node build.mjs', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

if (!existsSync('surfingkeys.js')) {
  console.error('❌ surfingkeys.js not found after build');
  process.exit(1);
}

console.log('\n📤 Updating gist...');
try {
  execSync(`gh gist edit ${GIST_ID} surfingkeys.js`, { stdio: 'inherit' });
  console.log('\n✅ Gist updated successfully!');
  console.log(`🔗 URL: https://gist.githubusercontent.com/chixing/${GIST_ID}/raw/surfingkeys.js`);
} catch (error) {
  console.error('❌ Failed to update gist');
  console.error('Make sure you have gh CLI installed and authenticated');
  process.exit(1);
}
