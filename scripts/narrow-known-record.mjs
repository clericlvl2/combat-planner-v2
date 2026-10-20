#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
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
const entryPattern =
  /\{\s*story: '([^']+)',\s*(?:locale: '([a-z]+)',\s*)?check: '([A-Za-z]+)',?\s*\}/g;
const allLocales = ['en', 'de', 'es', 'fr', 'ja', 'ru'];
const dataPattern = /^(?:const [a-z]+|export const narrowKnown): readonly NarrowKnown\[\] = \[/m;

const args = process.argv.slice(2);
const localesArg = args.find((arg) => arg.startsWith('--locales='));
if (!localesArg) {
  console.error('usage: narrow-known-record.mjs --locales=de,es <vitest-json-report>...');
  process.exit(2);
}
const locales = new Set(localesArg.slice('--locales='.length).split(',').filter(Boolean));
const reportFiles = args.filter((arg) => arg !== localesArg);

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
          `${path.basename(reportFile, '.json')}: ${path.relative(rootDir, file.name)} > ${test.fullName}: ${message.split('\n')[0]}`,
        );
        continue;
      }
      const record = JSON.parse(match[1]);
      if (!locales.has(record.locale)) continue;
      for (const check of record.checks) {
        if (!checkOrder.includes(check)) throw new Error(`unknown check ${check} in ${match[1]}`);
        recorded.push({ story: record.story, locale: record.locale, check });
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

const source = readFileSync(knownFile, 'utf8');
const dataStart = source.search(dataPattern);
if (dataStart < 0) throw new Error(`no narrow-known arrays in ${knownFile}`);
const kept = [...source.slice(dataStart).matchAll(entryPattern)]
  .map(([, story, locale, check]) => ({ story, locale: locale ?? 'en', check }))
  .filter((entry) => !locales.has(entry.locale));

const byKey = new Map();
for (const entry of [...kept, ...recorded]) {
  byKey.set(`${entry.story}|${entry.locale}|${entry.check}`, entry);
}
const entries = [...byKey.values()].sort(
  (a, b) =>
    a.story.localeCompare(b.story, 'en') ||
    checkOrder.indexOf(a.check) - checkOrder.indexOf(b.check),
);

const arrays = allLocales.map((locale) => {
  const lines = entries
    .filter((entry) => entry.locale === locale)
    .map(({ story, check }) =>
      locale === 'en'
        ? `  { story: '${story}', check: '${check}' },`
        : `  { story: '${story}', locale: '${locale}', check: '${check}' },`,
    );
  return `const ${locale}: readonly NarrowKnown[] = [\n${lines.join('\n')}\n];\n`;
});
const spread = allLocales.map((locale) => `...${locale}`).join(', ');
writeFileSync(
  knownFile,
  `${source.slice(0, dataStart)}${arrays.join('\n')}\nexport const narrowKnown: readonly NarrowKnown[] = [${spread}];\n`,
);
spawnSync('pnpm', ['exec', 'vp', 'fmt', knownFile], { cwd: rootDir, stdio: 'inherit' });

const counts = Object.fromEntries(
  [...locales].map((locale) => [locale, entries.filter((entry) => entry.locale === locale).length]),
);
console.log(`narrow-known: ${entries.length} entries; per run locale ${JSON.stringify(counts)}`);
