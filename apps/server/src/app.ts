import { createApiApp, openDatabase, runMigrations } from '@combat-planner/api';
import type { ApiEnv } from '@combat-planner/api';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

export interface ServerAppOptions {
  databasePath: string;
  staticRoot: string;
  env: ApiEnv;
}

export function createServerApp({ databasePath, staticRoot, env }: ServerAppOptions) {
  const opened = openDatabase(databasePath);
  runMigrations(opened.db);
  const app = new Hono()
    .route('/api', createApiApp({ db: opened.db, env }))
    .use('/*', serveStatic({ root: staticRoot }))
    .get('/*', serveStatic({ root: staticRoot, path: 'index.html' }));
  return { app, close: () => opened.close() };
}
