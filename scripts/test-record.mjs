#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv.length > 2) {
  console.error('usage: test-record.mjs (records every story; takes no arguments)');
  process.exit(2);
}

const reportDir = mkdtempSync(path.join(os.tmpdir(), 'cp-narrow-record-'));
const report = path.join(reportDir, 'storybook.json');
const started = performance.now();

console.log('\n== storybook, recording');
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'vp',
    'test',
    '--project',
    'storybook',
    '--reporter=dot',
    '--reporter=json',
    `--outputFile.json=${report}`,
  ],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, CP_STORY_FRAME: 'phone', CP_NARROW_RECORD: '1' },
  },
);
const seconds = ((performance.now() - started) / 1000).toFixed(0);
console.log(`== storybook: exit ${result.status}, ${seconds} s`);

const generated = spawnSync(
  'node',
  [path.join(rootDir, 'scripts/narrow-known-record.mjs'), report],
  {
    cwd: rootDir,
    stdio: 'inherit',
  },
);
if (generated.status === 0) rmSync(reportDir, { recursive: true, force: true });
else console.error(`report kept in ${reportDir}`);
process.exit(generated.status ?? 1);
