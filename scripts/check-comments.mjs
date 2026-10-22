#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const skippedDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  'storybook-static',
  '.tsbuild',
  '.vitest',
  'coverage',
  'drizzle',
  'docs',
  '.claude',
]);
const checkedExtensions = new Set(['.ts', '.tsx', '.css']);
const allowedPrefixes = [
  '// eslint-disable-next-line',
  '// @ts-expect-error',
  '/// <reference',
  '// @vitest-environment',
];

function isExempt(relativePath) {
  const baseName = path.basename(relativePath);
  return (
    baseName.includes('.config.') ||
    baseName.endsWith('.cjs') ||
    baseName.includes('.gen.') ||
    baseName.includes('.generated.') ||
    relativePath.split('/').includes('generated')
  );
}

function isInScope(relativePath) {
  const segments = relativePath.split('/');
  return (
    checkedExtensions.has(path.extname(relativePath)) &&
    (segments.includes('src') || segments.includes('test')) &&
    !isExempt(relativePath)
  );
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) yield* walk(path.join(directory, entry.name));
    } else if (entry.isFile()) {
      yield path.join(directory, entry.name);
    }
  }
}

function scriptCommentRanges(fileName, text) {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKind);
  const ranges = new Map();
  const collect = (found) => {
    for (const range of found ?? []) ranges.set(range.pos, range);
  };
  const visit = (node) => {
    collect(ts.getLeadingCommentRanges(text, node.getFullStart()));
    collect(ts.getTrailingCommentRanges(text, node.getEnd()));
    for (const child of node.getChildren(sourceFile)) visit(child);
  };
  visit(sourceFile);
  return [...ranges.values()].map((range) => ({ pos: range.pos, end: range.end }));
}

function cssCommentRanges(text) {
  const ranges = [];
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2);
      const end = close === -1 ? text.length : close + 2;
      ranges.push({ pos: index, end });
      index = end - 1;
    }
  }
  return ranges;
}

function lineOf(text, position) {
  return text.slice(0, position).split('\n').length;
}

const violations = [];
for (const absolutePath of walk(rootDir)) {
  const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join('/');
  if (!isInScope(relativePath)) continue;
  const text = readFileSync(absolutePath, 'utf8');
  const ranges = relativePath.endsWith('.css')
    ? cssCommentRanges(text)
    : scriptCommentRanges(relativePath, text);
  for (const { pos, end } of ranges) {
    const comment = text.slice(pos, end);
    if (allowedPrefixes.some((prefix) => comment.startsWith(prefix))) continue;
    violations.push(`${relativePath}:${lineOf(text, pos)}: ${comment.split('\n')[0]}`);
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`check-comments: ${violations.length} comment(s) found`);
  process.exit(1);
}
console.log('check-comments: no comments found');
