#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
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
      stories.push({ name: declaration.name.text, text: init.getText(source), play });
    }
  }
  return { text, stories };
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

const storyFiles = [...walk(uiSrcDir)]
  .filter((file) => file.endsWith('.stories.tsx'))
  .sort((a, b) => a.localeCompare(b));

for (const storyPath of storyFiles) {
  const { text, stories } = readStories(storyPath);
  checkCommonRules(storyPath, text, stories);
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`check-stories: ${violations.length} problem(s)`);
  process.exit(1);
}
console.log(`check-stories: ${storyFiles.length} story file(s) pass`);
