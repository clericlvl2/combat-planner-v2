#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const knownFile = path.join(rootDir, 'packages/ui/src/storybook/narrow-known.ts');
const checkOrder = [
  'overflow',
  'tapTargets',
  'frame',
  'truncation',
  'overlays',
  'wordBreaks',
  'actionsVisible',
  'scrimTarget',
  'play',
];
const recordPattern = /narrow-known record (\{.*?\})(?:\n|$)/;
const dataPattern = /^const ru: readonly NarrowKnown\[\] = \[/m;

const reportFiles = process.argv.slice(2);
if (reportFiles.length === 0) {
  console.error('usage: narrow-known-record.mjs <vitest-json-report>...');
  process.exit(2);
}
const missing = reportFiles.filter((reportFile) => !existsSync(reportFile));
if (missing.length > 0) {
  console.error(`no report at ${missing.join(', ')}`);
  process.exit(1);
}

const recorded = [];
const unrecorded = [];
for (const reportFile of reportFiles) {
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  for (const file of report.testResults) {
    for (const test of file.assertionResults) {
      if (test.status !== 'failed') continue;
      const message = test.failureMessages.join('\n');
      const match = recordPattern.exec(message);
      if (!match) {
        unrecorded.push(
          `${path.relative(rootDir, file.name)} > ${test.fullName}: ${message.split('\n')[0]}`,
        );
        continue;
      }
      const record = JSON.parse(match[1]);
      for (const check of record.checks) {
        if (!checkOrder.includes(check)) throw new Error(`unknown check ${check} in ${match[1]}`);
        recorded.push({ story: record.story, check });
      }
    }
  }
}

if (unrecorded.length > 0) {
  console.error(
    'Failures without a narrow-known record; fix them or wrap the play in playKnownAtNarrow:',
  );
  for (const line of unrecorded) console.error(`  ${line}`);
  process.exit(1);
}

const byKey = new Map(recorded.map((entry) => [`${entry.story}|${entry.check}`, entry]));
const entries = [...byKey.values()].sort(
  (a, b) =>
    a.story.localeCompare(b.story, 'en') ||
    checkOrder.indexOf(a.check) - checkOrder.indexOf(b.check),
);

const source = readFileSync(knownFile, 'utf8');
const dataStart = source.search(dataPattern);
if (dataStart < 0) throw new Error(`no narrow-known array in ${knownFile}`);
const lines = entries.map(({ story, check }) => `  { story: '${story}', check: '${check}' },`);
writeFileSync(
  knownFile,
  `${source.slice(0, dataStart)}const ru: readonly NarrowKnown[] = [\n${lines.join('\n')}\n];\n\nexport const narrowKnown: readonly NarrowKnown[] = ru;\n`,
);
spawnSync('pnpm', ['exec', 'vp', 'fmt', knownFile], { cwd: rootDir, stdio: 'inherit' });

console.log(`narrow-known: ${entries.length} entries`);
