import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

const rootPackage = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version?: string };

export default defineConfig({
  plugins: [react()],
  envDir: '../..',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(rootPackage.version ?? '0.0.0'),
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
