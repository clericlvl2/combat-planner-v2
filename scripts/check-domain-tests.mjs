#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const visionPath = path.join(rootDir, 'docs/vision.md');
const planPath = path.join(rootDir, '.claude/plans/2026-10-16-build-combat-planner-v2.md');
const testsDir = path.join(rootDir, 'packages/domain/test');
const plainCells = new Set(['✓', '—']);
const ownerBulletsOutsideDomain = [
  'Подпись сортировки',
  'Не делать',
  'Из стека',
  'Ревью между пачками',
  'Модели',
  'Автокомпакт',
];

const relative = (file) => path.relative(rootDir, file).split(path.sep).join('/');

function readLines(file) {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((text, index) => ({ line: index + 1, text }));
}

function section(lines, heading) {
  const start = lines.findIndex(({ text }) => text === heading);
  if (start === -1) throw new Error(`heading not found: ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  const body = [];
  for (const entry of lines.slice(start + 1)) {
    const match = entry.text.match(/^(#+) /);
    if (match && match[1].length <= level) break;
    body.push(entry);
  }
  return body;
}

function table(lines) {
  const cells = (text) =>
    text
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
  const [header, , ...rows] = lines.filter(({ text }) => text.startsWith('|'));
  return {
    columns: cells(header.text),
    rows: rows.map(({ line, text }) => ({ line, cells: cells(text) })),
  };
}

function bullets(lines) {
  const items = [];
  let open = false;
  for (const { line, text } of lines) {
    if (text.startsWith('- ')) {
      items.push({ line, text: text.slice(2).trim() });
      open = true;
    } else if (open && /^\s+\S/.test(text)) {
      items[items.length - 1].text += ` ${text.trim()}`;
    } else {
      open = false;
    }
  }
  return items;
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else if (entry.name.endsWith('.test.ts')) yield file;
  }
}

function testNames(file) {
  const text = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const names = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'it' || node.expression.text === 'test')
    ) {
      const [first] = node.arguments;
      if (first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) {
        names.push(first.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

const required = [];
const require = (file, line, name) => required.push({ file, line, name });

const vision = readLines(visionPath);
const unit = section(vision, '### Unit');

for (const { line, cells } of table(section(vision, '#### Transitions')).rows) {
  require(visionPath, line, cells[0]);
  require(visionPath, line, `${cells[0]} | ${cells[1]}`);
}

for (const { line, cells } of table(section(unit, '#### Actions')).rows) {
  require(visionPath, line, cells[0]);
  for (const cell of cells.slice(1)) {
    if (!plainCells.has(cell)) require(visionPath, line, `${cells[0]} | ${cell}`);
  }
}

const visibility = table(section(vision, '### Visibility for players'));
for (const { line, cells } of visibility.rows) {
  for (const column of visibility.columns.slice(1)) {
    require(visionPath, line, `${cells[0]} | ${column}`);
  }
}

for (const { line, text } of bullets(section(unit, '#### Rules'))) require(visionPath, line, text);

const violations = [];
const ownerBullets = bullets(section(readLines(planPath), '## Решения владельца'));
for (const prefix of ownerBulletsOutsideDomain) {
  if (!ownerBullets.some(({ text }) => text.startsWith(prefix))) {
    violations.push(`${relative(planPath)}: no owner bullet starts with "${prefix}"`);
  }
}
for (const { line, text } of ownerBullets) {
  if (!ownerBulletsOutsideDomain.some((prefix) => text.startsWith(prefix))) {
    require(planPath, line, text);
  }
}

const names = new Set();
for (const file of walk(testsDir)) {
  for (const name of testNames(file)) names.add(name);
}

for (const { file, line, name } of required) {
  if (!names.has(name)) violations.push(`${relative(file)}:${line}: no test named "${name}"`);
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`check-domain-tests: ${violations.length} problem(s)`);
  process.exit(1);
}
console.log(`check-domain-tests: ${required.length} name(s) pass`);
