import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiDir = path.join(repoRoot, 'packages/ui');
const bundled = (id: string) =>
  id.startsWith('.') || path.isAbsolute(id) || id.startsWith('@fontsource/');
const fontsFromConfig = {
  name: 'fonts-from-config',
  enforce: 'pre' as const,
  resolveId: (id: string) => (id.startsWith('@fontsource/') ? '\0fontsource-empty' : null),
  load: (id: string) => (id === '\0fontsource-empty' ? '' : null),
};

export default defineConfig({
  root: uiDir,
  plugins: [fontsFromConfig, react()],
  css: { postcss: repoRoot },
  build: {
    outDir: path.join(uiDir, 'dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    lib: {
      entry: path.join(uiDir, '../../.design-sync/ui-entry.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'index',
    },
    rollupOptions: { external: (id) => !bundled(id) },
  },
});
