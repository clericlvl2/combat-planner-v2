#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = path.join(rootDir, 'packages/ui/src/i18n');
const allowSamePath = path.join(i18nDir, 'allow-same.txt');
const locales = ['en', 'de', 'es', 'fr', 'ja', 'ru'];
const scripts = {
  ru: { name: 'Cyrillic', pattern: /[Ѐ-ӿ]/ },
  ja: { name: 'CJK', pattern: /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/ },
};

const violations = [];
const relative = (absolutePath) => path.relative(rootDir, absolutePath).split(path.sep).join('/');
const fail = (file, rule, detail) => violations.push(`${relative(file)}: ${rule}: ${detail}`);

function flatten(value, prefix, into) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, into);
    }
  } else {
    into.set(prefix, value);
  }
  return into;
}

const allowSame = new Set(
  existsSync(allowSamePath)
    ? readFileSync(allowSamePath, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : [],
);

const namespaces = new Set();
for (const locale of locales) {
  const localeDir = path.join(i18nDir, locale);
  if (!existsSync(localeDir)) continue;
  for (const file of readdirSync(localeDir)) {
    if (file.endsWith('.json')) namespaces.add(path.basename(file, '.json'));
  }
}

for (const namespace of [...namespaces].sort((a, b) => a.localeCompare(b))) {
  const files = new Map();
  for (const locale of locales) {
    const file = path.join(i18nDir, locale, `${namespace}.json`);
    if (!existsSync(file)) {
      fail(file, 'missing locale file', `${namespace} has no ${locale} file`);
      continue;
    }
    try {
      files.set(locale, {
        file,
        values: flatten(JSON.parse(readFileSync(file, 'utf8')), '', new Map()),
      });
    } catch (error) {
      fail(file, 'invalid JSON', String(error));
    }
  }
  const english = files.get('en');
  for (const [locale, { file, values }] of files) {
    for (const [key, value] of values) {
      if (typeof value !== 'string' || value.trim() === '') {
        fail(file, 'empty value', key);
        continue;
      }
      if (locale === 'en') continue;
      const allowed = allowSame.has(`${namespace}.${key}`);
      if (english && english.values.get(key) === value && !allowed) {
        fail(
          file,
          'same as en',
          `${key} = ${JSON.stringify(value)}; list ${namespace}.${key} in allow-same.txt`,
        );
        continue;
      }
      const script = scripts[locale];
      if (script && !allowed && !script.pattern.test(value)) {
        fail(file, `${locale} without ${script.name}`, `${key} = ${JSON.stringify(value)}`);
      }
    }
    if (!english || locale === 'en') continue;
    for (const key of english.values.keys()) {
      if (!values.has(key)) fail(file, 'key mismatch', `missing ${key}`);
    }
    for (const key of values.keys()) {
      if (!english.values.has(key)) fail(file, 'key mismatch', `${key} is not in en`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`check-i18n: ${violations.length} problem(s)`);
  process.exit(1);
}
console.log(`check-i18n: ${namespaces.size} namespace(s) pass`);
