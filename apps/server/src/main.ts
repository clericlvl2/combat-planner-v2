import path from 'node:path';
import { serve } from '@hono/node-server';
import { createServerApp } from './app.ts';

const webDist = path.resolve(import.meta.dirname, '../../web/dist');
const port = Number(process.env.PORT ?? 3000);
const app = createServerApp({
  staticRoot: path.relative(process.cwd(), webDist),
  tickIntervalMs: 1000,
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`server listening on http://localhost:${info.port}`);
});
