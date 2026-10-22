import { execSync } from 'node:child_process';
import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiDir = path.join(repoRoot, 'packages/ui');
const run = (command) => execSync(command, { cwd: repoRoot, stdio: 'inherit' });

run('pnpm exec tsc -b packages/ui');
run('pnpm exec vp build --config .design-sync/build-ui.config.ts');
const types = path.join(uiDir, 'dist/types');
rmSync(types, { recursive: true, force: true });
cpSync(path.join(uiDir, '.tsbuild/src'), types, { recursive: true });
for (const entry of readdirSync(types, { recursive: true })) {
  const file = path.join(types, entry);
  if (!file.endsWith('.d.ts')) continue;
  const text = readFileSync(file, 'utf8');
  writeFileSync(file, text.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.tsx?(['"])/g, '$1.js$2'));
}
const mantine = readFileSync(
  path.join(uiDir, 'node_modules/@mantine/core/styles.layer.css'),
  'utf8',
);
const components = readFileSync(path.join(uiDir, 'dist/index.css'), 'utf8');
writeFileSync(path.join(uiDir, 'dist/design-sync.css'), `${mantine}\n${components}`);
