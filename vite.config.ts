import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.join(rootDir, 'packages/ui');
const screenshotsDir = path.join(uiDir, '__screenshots__');
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
    ignorePatterns: ['.claude/**', 'CLAUDE.md', 'pnpm-lock.yaml', '**/__screenshots__/**'],
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
          ],
          environment: 'node',
        },
      },
      {
        root: uiDir,
        plugins: [storybookTest({ configDir: path.join(uiDir, '.storybook') })],
        optimizeDeps: browserOptimizeDeps,
        define: {
          'import.meta.env.CP_NARROW_RECORD': JSON.stringify(process.env.CP_NARROW_RECORD ?? ''),
        },
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
      {
        root: uiDir,
        plugins: [react()],
        optimizeDeps: browserOptimizeDeps,
        test: {
          name: 'visual',
          include: ['test/visual.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 390, height: 844 },
            expect: {
              toMatchScreenshot: {
                resolveScreenshotPath: ({ arg, ext }) => path.join(screenshotsDir, `${arg}${ext}`),
              },
            },
          },
        },
      },
    ],
  },
});
