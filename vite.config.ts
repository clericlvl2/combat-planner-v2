import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.join(rootDir, 'packages/ui');
const screenshotsDir = path.join(uiDir, '__screenshots__');

export default defineConfig({
  fmt: {
    singleQuote: true,
    printWidth: 100,
    ignorePatterns: [
      'docs/**',
      '.claude/**',
      'CLAUDE.md',
      'REPORT.md',
      'pnpm-lock.yaml',
      '**/__screenshots__/**',
    ],
  },
  lint: {
    ignorePatterns: ['docs/**', '.claude/**', '**/dist/**', '**/storybook-static/**'],
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
          include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        root: uiDir,
        plugins: [react()],
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
