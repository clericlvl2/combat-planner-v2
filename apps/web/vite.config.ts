import { readFile } from 'node:fs/promises';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import type { Plugin } from 'vite-plus';

const API_ORIGIN = 'http://localhost:3000';

const markGuest = (html: string): string => html.replace(/<html\b/i, '<html data-boot="guest"');

const signedIn = async (cookie: string | undefined): Promise<boolean> => {
  try {
    const response = await fetch(`${API_ORIGIN}/api/auth/get-session`, {
      headers: cookie ? { cookie } : {},
    });
    if (!response.ok) return false;
    return (await response.json()) !== null;
  } catch {
    return false;
  }
};

const guestBoot = (): Plugin => ({
  name: 'guest-boot',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url ?? '';
      if (req.method !== 'GET' || (url !== '/' && !url.startsWith('/?'))) {
        next();
        return;
      }
      try {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Vary', 'Cookie');
        if (await signedIn(req.headers.cookie)) {
          res.statusCode = 302;
          res.setHeader('Location', '/combats');
          res.end();
          return;
        }
        const html = await readFile(path.join(server.config.root, 'index.html'), 'utf8');
        const page = markGuest(await server.transformIndexHtml(url, html));
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.end(page);
      } catch (error) {
        next(error);
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), guestBoot()],
  envDir: '../..',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || 'dev'),
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: API_ORIGIN, changeOrigin: false },
    },
  },
});
