import { defineConfig } from 'vite-plus';

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
});
