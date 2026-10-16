import { createApiApp } from '@combat-planner/api';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

export function createServerApp({
  staticRoot,
  tickIntervalMs,
}: {
  staticRoot: string;
  tickIntervalMs: number;
}) {
  return new Hono()
    .route('/api', createApiApp({ tickIntervalMs }))
    .use('/*', serveStatic({ root: staticRoot }))
    .get('/*', serveStatic({ root: staticRoot, path: 'index.html' }));
}
