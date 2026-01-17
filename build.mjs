#!/usr/bin/env node
/**
 * Build script using esbuild
 */

import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ['src-ts/index.ts'],
  bundle: true,
  outfile: 'surfingkeys.js',
  format: 'iife',
  target: 'es2020',
  platform: 'browser',
  sourcemap: false,
  minify: false, // Keep readable for debugging
  treeShaking: true,
  legalComments: 'none',
  banner: {
    js: `/**
 * SurfingKeys Configuration
 * Built with TypeScript + esbuild
 * Generated: ${new Date().toISOString()}
 */
`
  },
  logLevel: 'info',
};

async function build() {
  try {
    if (isWatch) {
      console.log('👀 Watching for changes...');
      const context = await esbuild.context(buildOptions);
      await context.watch();
    } else {
      console.log('🔨 Building...');
      const result = await esbuild.build(buildOptions);

      // Read the output file to get size
      const output = readFileSync('surfingkeys.js', 'utf-8');
      const lines = output.split('\n').length;
      const bytes = Buffer.byteLength(output, 'utf-8');
      const kb = (bytes / 1024).toFixed(2);

      console.log(`✅ Build complete!`);
      console.log(`   Output: surfingkeys.js`);
      console.log(`   Size: ${kb} KB (${lines} lines)`);

      if (result.warnings.length > 0) {
        console.warn('⚠️  Warnings:', result.warnings);
      }
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
