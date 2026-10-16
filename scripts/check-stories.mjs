#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiSrcDir = path.join(rootDir, 'packages/ui/src');
const handoffDir = path.join(rootDir, 'docs/design/handoff');
const nonAscii = /[^\p{ASCII}]/u;
const flowCode = /^[A-Z]+-F\d+(?:\.\d+)*$/;

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

export function exportName(label) {
  return label
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
}

function pageScript(html) {
  const match = /<script type="text\/x-dc"[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(html);
  return match ? match[1] : '';
}

function renderPage(script) {
  const context = vm.createContext({ location: { search: '' }, URLSearchParams });
  vm.runInContext('String.prototype.toUpperCase = function () { return String(this); };', context);
  return vm.runInContext(
    `class DCLogic { constructor() { this.props = {}; this.state = {}; } setState() {} }\n${script}\n;new Component().renderVals();`,
    context,
    { timeout: 2000 },
  );
}

function literalsOf(cell, excludedKeys) {
  return Object.entries(cell)
    .filter(([key, value]) => !excludedKeys.includes(key) && typeof value === 'string')
    .map(([, value]) => value)
    .filter((value) => nonAscii.test(value));
}

function pageCells(groups) {
  const cells = [];
  let inFlow = false;
  for (const group of groups ?? []) {
    const title = typeof group.title === 'string' ? group.title : '';
    if (/^Flow\b/.test(title) || group.id === 'flow') inFlow = true;
    else if (title) inFlow = false;
    if (inFlow || !title) continue;
    const edge = title.startsWith('Edge cases');
    if (Array.isArray(group.rows) && group.rows.length > 0) {
      const columns = Array.isArray(group.cols) ? group.cols : [];
      for (const row of group.rows) {
        const rowCells = Array.isArray(row.cells) ? row.cells : [];
        rowCells.forEach((cell, index) => {
          const parts = [row.label, columns[index]].filter((part) => part);
          const label = parts.length > 0 ? parts.join(' ') : title;
          cells.push({ group: title, label, edge, literals: literalsOf(cell, []) });
        });
      }
      continue;
    }
    const direct = Array.isArray(group.cells) ? group.cells : group.items;
    for (const cell of Array.isArray(direct) ? direct : []) {
      const caption = typeof cell.caption === 'string' ? cell.caption : cell.label;
      if (typeof caption !== 'string') continue;
      const label = caption || title;
      cells.push({ group: title, label, edge, literals: literalsOf(cell, ['caption', 'label']) });
    }
  }
  const counts = new Map();
  for (const cell of cells) {
    cell.name = exportName(cell.label);
    counts.set(cell.name, (counts.get(cell.name) ?? 0) + 1);
  }
  for (const cell of cells) {
    if (counts.get(cell.name) > 1 || !/^[A-Z]/.test(cell.name)) {
      cell.name = exportName(`${cell.group} ${cell.label}`);
    }
  }
  return cells;
}

function readPage(pagePath) {
  const html = readFileSync(pagePath, 'utf8');
  const script = pageScript(html);
  const flows = [...script.matchAll(/\bS\('([^']+)'/g)]
    .map((match) => match[1])
    .filter((code) => flowCode.test(code));
  let groups = [];
  try {
    groups = renderPage(script)?.groups ?? [];
  } catch (error) {
    if (flows.length === 0) fail(pagePath, 'page script', String(error));
  }
  const cells = flows.length > 0 ? [] : pageCells(groups);
  const hasFlow =
    flows.length > 0 ||
    (Array.isArray(groups) &&
      groups.some((group) => group.id === 'flow' || /^Flow\b/.test(String(group.title ?? ''))));
  return { cells, flows: [...new Set(flows)], hasFlow };
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
  const name = path.basename(storyPath, '.stories.tsx');
  const pagePath = path.join(handoffDir, `${name}.dc.html`);
  if (!existsSync(pagePath)) continue;
  const page = readPage(pagePath);
  const byName = new Map(stories.map((story) => [story.name, story]));
  const required = new Set();
  for (const cell of page.cells) {
    required.add(cell.name);
    const story = byName.get(cell.name);
    if (!story) {
      fail(
        storyPath,
        'missing cell story',
        `${cell.name} for "${cell.group}" cell "${cell.label}"`,
      );
      continue;
    }
    if (cell.edge && cell.literals.length > 0) {
      if (!cell.literals.some((literal) => story.text.includes(literal))) {
        fail(
          storyPath,
          'edge story without a non-ASCII literal',
          `${cell.name} must contain one of ${cell.literals.map((l) => JSON.stringify(l)).join(', ')}`,
        );
      }
    }
  }
  for (const code of page.flows) {
    const flowName = exportName(code);
    required.add(flowName);
    if (!byName.has(flowName)) fail(storyPath, 'missing flow story', `${flowName} for ${code}`);
  }
  for (const story of stories) {
    if (!required.has(story.name) && !story.name.startsWith('Extra')) {
      fail(
        storyPath,
        'extra story without the Extra prefix',
        `${story.name} is not a cell of ${relative(pagePath)}`,
      );
    }
  }
  if (page.hasFlow && !stories.some((story) => story.play !== null)) {
    fail(
      storyPath,
      'Flow section without play',
      `${relative(pagePath)} has a Flow section but no story has play`,
    );
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`check-stories: ${violations.length} problem(s)`);
  process.exit(1);
}
console.log(`check-stories: ${storyFiles.length} story file(s) pass`);
