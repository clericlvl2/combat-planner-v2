#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyNameFromExport } from 'storybook/internal/csf';
import ts from '@typescript/typescript6';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiSrcDir = path.join(rootDir, 'packages/ui/src');

const violations = [];
const relative = (absolutePath) => path.relative(rootDir, absolutePath).split(path.sep).join('/');
const fail = (file, rule, detail) => violations.push(`${relative(file)}: ${rule}: ${detail}`);

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(entryPath);
    else if (entry.isFile()) yield entryPath;
  }
}

function propertyOf(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return null;
  return (
    object.properties.find(
      (p) =>
        ts.isPropertyAssignment(p) && p.name && ts.isIdentifier(p.name) && p.name.text === name,
    ) ?? null
  );
}

function stringsOf(property) {
  if (!property || !ts.isArrayLiteralExpression(property.initializer)) return [];
  return property.initializer.elements
    .filter((element) => ts.isStringLiteralLike(element))
    .map((element) => element.text);
}

function keysOf(property) {
  if (!property || !ts.isObjectLiteralExpression(property.initializer)) return [];
  return property.initializer.properties
    .filter((p) => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)))
    .map((p) => p.name.text);
}

function annotationsOf(options) {
  const name = propertyOf(options, 'name');
  return {
    displayName: name && ts.isStringLiteralLike(name.initializer) ? name.initializer.text : null,
    tags: stringsOf(propertyOf(options, 'tags')),
    globals: keysOf(propertyOf(options, 'globals')),
  };
}

function readStories(storyPath) {
  const text = readFileSync(storyPath, 'utf8');
  const source = ts.createSourceFile(
    storyPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const stories = [];
  let meta = { displayName: null, tags: [], globals: [] };
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (!init || !ts.isCallExpression(init)) continue;
      const callee = init.expression;
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'meta') {
        meta = annotationsOf(init.arguments[0]);
      }
    }
    const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (!ts.isIdentifier(declaration.name) || !init || !ts.isCallExpression(init)) continue;
      const callee = init.expression;
      if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'story') continue;
      const options = init.arguments[0];
      let play = null;
      if (options && ts.isObjectLiteralExpression(options)) {
        const property = options.properties.find(
          (p) => p.name && ts.isIdentifier(p.name) && p.name.text === 'play',
        );
        if (property) play = property.getText(source);
      }
      stories.push({
        name: declaration.name.text,
        text: init.getText(source),
        play,
        ...annotationsOf(options),
      });
    }
  }
  return { text, stories, meta };
}

const count = (text, needle) => text.split(needle).length - 1;

function checkCommonRules(storyPath, text, stories) {
  for (const match of text.matchAll(/\.(only|skip)\b/g)) {
    fail(storyPath, `.${match[1]}`, `found at offset ${match.index}`);
  }
  if (/tags\s*:\s*\[[^\]]*['"`]!test['"`]/.test(text)) {
    fail(storyPath, "tags: ['!test']", 'stories must run as tests');
  }
  if (/expect\(\s*true\s*\)/.test(text)) fail(storyPath, 'expect(true)', 'asserts nothing');
  for (const story of stories) {
    if (story.play === null) continue;
    if (!story.play.includes('expect(')) {
      fail(storyPath, 'play without expect(', story.name);
      continue;
    }
    const defined = count(story.play, '.toBeDefined(');
    if (defined > 0 && defined === count(story.play, 'expect(')) {
      fail(storyPath, 'sole toBeDefined()', story.name);
    }
  }
}

const extraPrefix = /^Extra(?=[A-Z0-9_]|$)/;
const codes = [/^[A-Z]{2,}\d/, /[A-Z]{2,}\d+$/];
const localeWords = /^(?:De|Ru|Ja|Fr|Es|En|German|Russian|Japanese|Deutsch|Espa[a-z]*|Fran[a-z]*)$/;
const testDataNumber = /\d{4,}/;
const displayNameLimit = 40;
const lockingGlobals = ['locale', 'frame', 'viewport'];

const wordsOf = (exportName) => exportName.match(/[A-Z]+(?![a-z])|[A-Z][a-z]*|[a-z]+|\d+/g) ?? [];

function checkNameRules(storyPath, stories) {
  for (const story of stories) {
    if (extraPrefix.test(story.name)) fail(storyPath, 'Extra prefix', story.name);
    if (codes.some((code) => code.test(story.name))) fail(storyPath, 'code in name', story.name);
    const localeWord = wordsOf(story.name).find((word) => localeWords.test(word));
    if (localeWord) fail(storyPath, 'locale word in name', `${story.name} (${localeWord})`);
    if (testDataNumber.test(story.name)) fail(storyPath, 'test data number in name', story.name);
    const displayName = story.displayName ?? storyNameFromExport(story.name);
    if (displayName.length > displayNameLimit) {
      fail(
        storyPath,
        `display name over ${displayNameLimit} characters`,
        `${story.name}: "${displayName}" (${displayName.length})`,
      );
    }
  }
}

function checkLockedGlobals(storyPath, stories, meta) {
  for (const story of stories) {
    if ([...meta.tags, ...story.tags].includes('!dev')) continue;
    const locked = [...new Set([...meta.globals, ...story.globals])].filter((key) =>
      lockingGlobals.includes(key),
    );
    if (locked.length > 0) {
      fail(
        storyPath,
        'visible story sets toolbar globals',
        `${story.name} sets ${locked.map((key) => `globals.${key}`).join(', ')}`,
      );
    }
  }
}

const storyFiles = [...walk(uiSrcDir)]
  .filter((file) => file.endsWith('.stories.tsx'))
  .sort((a, b) => a.localeCompare(b));

for (const storyPath of storyFiles) {
  const { text, stories, meta } = readStories(storyPath);
  checkCommonRules(storyPath, text, stories);
  checkNameRules(storyPath, stories);
  checkLockedGlobals(storyPath, stories, meta);
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`check-stories: ${violations.length} problem(s)`);
  process.exit(1);
}
console.log(`check-stories: ${storyFiles.length} story file(s) pass`);
