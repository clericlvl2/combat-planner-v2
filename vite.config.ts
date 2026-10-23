import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.join(rootDir, 'packages/ui');
const browserOptimizeDeps = {
  include: [
    'react-dom/client',
    'react-qr-code',
    '@mantine/hooks',
    '@storybook/addon-vitest/internal/setup-file',
    '@tanstack/react-query',
    'react-router',
    'storybook-addon-remix-react-router',
    'ulid',
  ],
};

export default defineConfig({
  fmt: {
    singleQuote: true,
    printWidth: 100,
    ignorePatterns: ['.claude/**', 'CLAUDE.md', 'pnpm-lock.yaml'],
  },
  lint: {
    ignorePatterns: [
      '.claude/**',
      '**/dist/**',
      '**/storybook-static/**',
      '.design-sync/previews/**',
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'unit',
          root: rootDir,
          include: [
            'packages/*/src/**/*.test.ts',
            'packages/*/test/**/*.test.ts',
            'apps/*/src/**/*.test.ts',
            'scripts/*.test.mjs',
          ],
          environment: 'node',
        },
      },
      {
        root: uiDir,
        plugins: [storybookTest({ configDir: path.join(uiDir, '.storybook') })],
        optimizeDeps: browserOptimizeDeps,
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
