import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { surfingkeys: 'src/index.ts' },
  format: ['iife'],
  target: 'es2020',
  platform: 'browser',
  splitting: false,
  sourcemap: false,
  minify: false,
  clean: true,
  treeshake: true,
  outDir: 'dist',
  onSuccess: 'node scripts/rename-output.js',
  banner: {
    js: `/**
 * SurfingKeys Configuration
 * Built with TypeScript + tsup
 * Generated: ${new Date().toISOString()}
 */\n`,
  },
  esbuildOptions(options) {
    options.entryNames = '[name]';
    options.legalComments = 'none';
  },
});
