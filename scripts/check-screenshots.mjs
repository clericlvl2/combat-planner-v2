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
const screenWidth = 390;
const comparatorKeys = /comparatorOptions|threshold|allowedMismatchedPixel/;

const violations = [];
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

function tagsOf(call) {
  const options = call.arguments[0];
  if (!options || !ts.isObjectLiteralExpression(options)) return [];
  const property = options.properties.find(
    (p) => ts.isPropertyAssignment(p) && p.name.getText() === 'tags',
  );
  if (!property || !ts.isArrayLiteralExpression(property.initializer)) return [];
  return property.initializer.elements.filter(ts.isStringLiteralLike).map((e) => e.text);
}

function combineTags(...tags) {
  const result = new Set();
  for (const tag of tags) {
    if (tag.startsWith('!')) result.delete(tag.slice(1));
    else result.add(tag);
  }
  return result;
}

function visualStoryNames(storyPath) {
  const source = parse(storyPath);
  let metaTags = [];
  const stories = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (!ts.isIdentifier(declaration.name) || !init || !ts.isCallExpression(init)) continue;
      const callee = init.expression;
      if (!ts.isPropertyAccessExpression(callee)) continue;
      if (callee.name.text === 'meta') metaTags = tagsOf(init);
      if (exported && callee.name.text === 'story') {
        stories.push({ name: declaration.name.text, tags: tagsOf(init) });
      }
    }
  }
  return stories
    .filter((story) => combineTags(...metaTags, ...story.tags).has('visual'))
    .map((story) => story.name);
}

function pngWidth(file) {
  const bytes = readFileSync(file);
  return bytes.length >= 24 ? bytes.readUInt32BE(16) : 0;
}

function isScreen(storyPath) {
  return relative(storyPath).split('/').includes('screens');
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
  const stories = visualStoryNames(storyPath);
  const baselines = existsSync(folder)
    ? readdirSync(folder)
        .filter((file) => file.endsWith('.png'))
        .map((file) => file.replace(/\.png$/, ''))
    : [];
  if (stories.length !== baselines.length) {
    fail(
      folder,
      'baseline count',
      `${baselines.length} baseline(s) for ${stories.length} visual stories in ${relative(storyPath)}`,
    );
  }
  for (const story of stories) {
    if (!baselines.includes(story)) fail(folder, 'missing baseline', `${story}.png`);
  }
  for (const baseline of baselines) {
    if (!stories.includes(baseline))
      fail(folder, 'baseline without visual story', `${baseline}.png`);
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
  if (isScreen(storyPath)) {
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
console.log(`check-screenshots: ${components.size} component(s) pass`);
