/**
 * Bundles the modules under test into a temporary ESM file and runs the test
 * suite against it.
 *
 * The app uses extensionless relative imports (`./constants`), which is what
 * Vite expects but Node's ESM resolver rejects. Bundling with the esbuild that
 * Vite already depends on keeps the application imports untouched and lets the
 * tests run on Node's built-in test runner with no extra dependencies.
 */

import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const outDir = mkdtempSync(path.join(tmpdir(), 'astralis-tests-'));

try {
  await build({
    entryPoints: ['tests/normalize.test.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile: path.join(outDir, 'normalize.test.mjs'),
    external: ['node:*'],
    logLevel: 'warning',
  });

  const child = spawn(process.execPath, ['--test', path.join(outDir, 'normalize.test.mjs')], {
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    rmSync(outDir, { recursive: true, force: true });
    process.exit(code ?? 1);
  });
} catch (error) {
  rmSync(outDir, { recursive: true, force: true });
  console.error(error);
  process.exit(1);
}
