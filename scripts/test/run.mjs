#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, '../..');
const checkScripts = ['check-stories', 'check-i18n', 'check-screenshots', 'check-domain-tests'];
const copiedTrees = [
  'packages/ui/src',
  'packages/ui/__screenshots__',
  'packages/ui/test',
  'packages/domain/test',
  'docs/vision.md',
  '.claude/plans/2026-10-16-build-combat-planner-v2.md',
  'vite.config.ts',
];

function plantTree() {
  const copy = mkdtempSync(path.join(os.tmpdir(), 'cp-check-'));
  for (const tree of copiedTrees) {
    const source = path.join(rootDir, tree);
    if (existsSync(source)) cpSync(source, path.join(copy, tree), { recursive: true });
  }
  const handoffDir = path.join(rootDir, 'docs/design/handoff');
  mkdirSync(path.join(copy, 'docs/design/handoff'), { recursive: true });
  for (const file of readdirSync(handoffDir).filter((name) => name.endsWith('.dc.html'))) {
    cpSync(path.join(handoffDir, file), path.join(copy, 'docs/design/handoff', file));
  }
  mkdirSync(path.join(copy, 'scripts'));
  for (const script of checkScripts) {
    cpSync(
      path.join(rootDir, 'scripts', `${script}.mjs`),
      path.join(copy, 'scripts', `${script}.mjs`),
    );
  }
  symlinkSync(path.join(rootDir, 'node_modules'), path.join(copy, 'node_modules'), 'dir');
  return copy;
}

function crcChunk(type, data) {
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function png(width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 3 + 1) * height);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    crcChunk('IHDR', header),
    crcChunk('IDAT', zlib.deflateSync(rows)),
    crcChunk('IEND', Buffer.alloc(0)),
  ]);
}

function applyOperation(copy, operation) {
  if (operation.replace) {
    const file = path.join(copy, operation.replace);
    const text = readFileSync(file, 'utf8');
    if (!text.includes(operation.search)) {
      throw new Error(`fixture text not found in ${operation.replace}: ${operation.search}`);
    }
    writeFileSync(file, text.replace(operation.search, operation.with));
  } else if (operation.remove) {
    const target = path.join(copy, operation.remove);
    if (operation.remove.endsWith('*')) {
      const directory = path.dirname(target);
      const prefix = path.basename(target).slice(0, -1);
      for (const name of existsSync(directory) ? readdirSync(directory) : []) {
        if (name.startsWith(prefix)) rmSync(path.join(directory, name), { force: true });
      }
    } else {
      if (!existsSync(target)) throw new Error(`fixture path not found: ${operation.remove}`);
      rmSync(target, { force: true });
    }
  } else if (operation.write) {
    const file = path.join(copy, operation.write);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, operation.content);
  } else if (operation.png) {
    const file = path.join(copy, operation.png);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, png(operation.width, operation.height));
  } else {
    throw new Error(`unknown fixture operation ${JSON.stringify(operation)}`);
  }
}

function runScript(copy, script, unsetEnv = []) {
  const env = { ...process.env, COMBAT_PLANNER_NO_DOCKER: '1' };
  for (const name of unsetEnv) delete env[name];
  const result = spawnSync(process.execPath, [path.join(copy, 'scripts', `${script}.mjs`)], {
    env,
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

const failures = [];
const clean = plantTree();
try {
  for (const script of checkScripts) {
    const { status, output } = runScript(clean, script);
    if (status === 0) console.log(`pass  clean tree: ${script}`);
    else failures.push(`clean tree: ${script} exited ${status}\n${output}`);
  }
} finally {
  rmSync(clean, { recursive: true, force: true });
}

const fixtures = readdirSync(testDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));
for (const fixtureName of fixtures) {
  const fixture = JSON.parse(readFileSync(path.join(testDir, fixtureName, 'fixture.json'), 'utf8'));
  const copy = plantTree();
  try {
    for (const operation of fixture.ops) applyOperation(copy, operation);
    const { status, output } = runScript(copy, fixture.script, fixture.unsetEnv);
    if (status !== 0 && output.includes(fixture.expect)) {
      console.log(`pass  ${fixtureName}: ${fixture.script} fails with "${fixture.expect}"`);
    } else {
      failures.push(
        `${fixtureName}: ${fixture.script} exited ${status}, expected "${fixture.expect}"\n${output}`,
      );
    }
  } catch (error) {
    failures.push(`${fixtureName}: ${String(error)}`);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  console.error(`scripts/test: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`scripts/test: clean tree and ${fixtures.length} fixture(s) pass`);
