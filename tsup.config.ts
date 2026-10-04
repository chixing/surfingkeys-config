import { execFileSync } from 'node:child_process';
import { defineConfig } from 'tsup';
import { version } from './package.json';

const source = (() => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'working-tree';
  }
})();

export default defineConfig({
  entry: { surfingkeys: 'src/index.ts' },
  format: ['iife'],
  target: 'es2020',
  platform: 'browser',
  splitting: false,
  sourcemap: true,
  minify: true,
  clean: true,
  treeshake: true,
  define: { __CONFIG_VERSION__: JSON.stringify(version) },
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  banner: {
    js: `/**
 * SurfingKeys Configuration
 * Version: ${version}
 * Source: ${source}
 * Built with TypeScript + tsup
 * Generated: ${new Date().toISOString()}
 */\n`,
  },
  esbuildOptions(options) {
    options.entryNames = '[name]';
    options.legalComments = 'none';
  },
});
