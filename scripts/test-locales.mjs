#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultLocales = ['de', 'es', 'fr', 'ja', 'ru'];

const args = process.argv.slice(2);
const record = args.includes('--record');
const localesArg = args.find((arg) => arg.startsWith('--locales='));
const locales = localesArg ? localesArg.slice('--locales='.length).split(',') : defaultLocales;
const passThrough = args.filter((arg) => arg !== '--record' && arg !== localesArg);

const reportDir = record ? mkdtempSync(path.join(os.tmpdir(), 'cp-narrow-record-')) : null;
const reports = [];
const failed = [];
const started = performance.now();

for (const locale of locales) {
  const localeStarted = performance.now();
  const reporterArgs = [];
  if (reportDir) {
    const report = path.join(reportDir, `${locale}.json`);
    reports.push(report);
    reporterArgs.push('--reporter=dot', '--reporter=json', `--outputFile.json=${report}`);
  }
  console.log(`\n== storybook, locale ${locale}${record ? ', recording' : ''}`);
  const result = spawnSync(
    'pnpm',
    ['exec', 'vp', 'test', '--project', 'storybook', ...reporterArgs, ...passThrough],
    {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        CP_STORY_LOCALE: locale,
        ...(record ? { CP_NARROW_RECORD: '1' } : {}),
      },
    },
  );
  const seconds = ((performance.now() - localeStarted) / 1000).toFixed(0);
  console.log(`== locale ${locale}: exit ${result.status}, ${seconds} s`);
  if (result.status !== 0) failed.push(locale);
}

console.log(
  `\n== ${locales.length} locales in ${((performance.now() - started) / 1000).toFixed(0)} s`,
);

if (record) {
  const generated = spawnSync(
    'node',
    [
      path.join(rootDir, 'scripts/narrow-known-record.mjs'),
      `--locales=${locales.join(',')}`,
      ...reports,
    ],
    { cwd: rootDir, stdio: 'inherit' },
  );
  if (generated.status === 0) rmSync(reportDir, { recursive: true, force: true });
  else console.error(`reports kept in ${reportDir}`);
  process.exit(generated.status ?? 1);
}

if (failed.length > 0) {
  console.error(`storybook failed in: ${failed.join(', ')}`);
  process.exit(1);
}
