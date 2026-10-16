#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiDir = path.join(rootDir, 'packages/ui');
const uiSrcDir = path.join(uiDir, 'src');
const screenshotsDir = path.join(uiDir, '__screenshots__');
const handoffDir = path.join(rootDir, 'docs/design/handoff');
const screenWidth = 390;
const comparatorKeys = /comparatorOptions|threshold|allowedMismatchedPixel/;

const violations = [];
const notes = [];
const relative = (absolutePath) => path.relative(rootDir, absolutePath).split(path.sep).join('/');
const fail = (file, rule, detail) => violations.push(`${relative(file)}: ${rule}: ${detail}`);

function* walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(entryPath);
    else if (entry.isFile()) yield entryPath;
  }
}

function parse(file) {
  const text = readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
}

function storyNames(storyPath) {
  const source = parse(storyPath);
  const names = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (!statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (!ts.isIdentifier(declaration.name) || !init || !ts.isCallExpression(init)) continue;
      const callee = init.expression;
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'story') {
        names.push(declaration.name.text);
      }
    }
  }
  return names;
}

function pngWidth(file) {
  const bytes = readFileSync(file);
  return bytes.length >= 24 ? bytes.readUInt32BE(16) : 0;
}

function isScreen(storyPath, name) {
  if (relative(storyPath).split('/').includes('screens')) return true;
  const page = path.join(handoffDir, `${name}.dc.html`);
  return existsSync(page) && /\bS\('[A-Z]+-F\d/.test(readFileSync(page, 'utf8'));
}

function sameGroups(folder, name) {
  const file = path.join(folder, `${name}.same.txt`);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) =>
      line
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((entry) => entry.replace(/\.png$/, '')),
    )
    .filter((line) => line.length > 0)
    .map((line) => new Set(line));
}

const components = new Map();
for (const file of walk(uiSrcDir)) {
  if (file.endsWith('.stories.tsx')) components.set(path.basename(file, '.stories.tsx'), file);
}

for (const [name, storyPath] of [...components].sort(([a], [b]) => a.localeCompare(b))) {
  const folder = path.join(screenshotsDir, name);
  const stories = storyNames(storyPath);
  const baselines = existsSync(folder)
    ? readdirSync(folder)
        .filter((file) => file.endsWith('.png'))
        .map((file) => file.replace(/\.png$/, ''))
    : [];
  if (stories.length !== baselines.length) {
    fail(
      folder,
      'baseline count',
      `${baselines.length} baseline(s) for ${stories.length} stories in ${relative(storyPath)}`,
    );
  }
  for (const story of stories) {
    if (!baselines.includes(story)) fail(folder, 'missing baseline', `${story}.png`);
  }
  for (const baseline of baselines) {
    if (!stories.includes(baseline)) fail(folder, 'baseline without story', `${baseline}.png`);
  }
  const hashes = new Map();
  for (const baseline of baselines) {
    const hash = createHash('sha256')
      .update(readFileSync(path.join(folder, `${baseline}.png`)))
      .digest('hex');
    hashes.set(hash, [...(hashes.get(hash) ?? []), baseline]);
  }
  const allowed = sameGroups(folder, name);
  for (const group of hashes.values()) {
    if (group.length < 2) continue;
    if (!allowed.some((line) => group.every((member) => line.has(member)))) {
      fail(
        folder,
        'byte-identical baselines',
        `${group.join(', ')}; list them on one line of ${name}.same.txt`,
      );
    }
  }
  if (isScreen(storyPath, name)) {
    for (const baseline of baselines) {
      const width = pngWidth(path.join(folder, `${baseline}.png`));
      if (width !== screenWidth)
        fail(
          path.join(folder, `${baseline}.png`),
          'screen width',
          `${width}, expected ${screenWidth}`,
        );
    }
  }
}

for (const folder of existsSync(screenshotsDir)
  ? readdirSync(screenshotsDir, { withFileTypes: true })
  : []) {
  if (folder.isDirectory() && !components.has(folder.name)) {
    fail(
      path.join(screenshotsDir, folder.name),
      'baselines without stories',
      `no ${folder.name}.stories.tsx`,
    );
  }
}

const markers = existsSync(screenshotsDir)
  ? readdirSync(screenshotsDir).filter((file) => file.startsWith('.docker-'))
  : [];
const playwrightPackage = path.join(rootDir, 'node_modules/playwright/package.json');
const expectedTag = existsSync(playwrightPackage)
  ? `v${JSON.parse(readFileSync(playwrightPackage, 'utf8')).version}-noble`
  : null;
if (markers.length === 0) {
  if (process.env.COMBAT_PLANNER_NO_DOCKER === '1') {
    notes.push('no .docker-* marker; accepted because COMBAT_PLANNER_NO_DOCKER=1');
  } else {
    fail(screenshotsDir, 'missing marker', 'no .docker-<image-tag>; run pnpm screenshots:update');
  }
} else if (expectedTag && !markers.includes(`.docker-${expectedTag}`)) {
  fail(screenshotsDir, 'stale marker', `${markers.join(', ')}, expected .docker-${expectedTag}`);
}

const configFiles = [
  path.join(rootDir, 'vite.config.ts'),
  ...walk(path.join(uiDir, 'test')),
  ...walk(uiSrcDir),
].filter((file) => /\.(ts|tsx)$/.test(file) && existsSync(file));
for (const file of configFiles) {
  const source = parse(file);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const calleeName = ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : callee.getText(source);
      if (calleeName === 'toMatchScreenshot' && node.arguments.length > 1) {
        fail(file, 'toMatchScreenshot threshold override', node.getText(source).split('\n')[0]);
      }
    }
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === 'toMatchScreenshot' &&
      comparatorKeys.test(node.initializer.getText(source))
    ) {
      fail(file, 'toMatchScreenshot threshold override', 'comparator options in config');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`check-screenshots: ${violations.length} problem(s)`);
  process.exit(1);
}
for (const note of notes) console.log(`check-screenshots: ${note}`);
console.log(`check-screenshots: ${components.size} component(s) pass`);
