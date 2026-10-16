import { Hono } from 'hono';
import type { AppDatabase } from './db/index.ts';
import type { ApiEnv } from './env.ts';
import { healthApp } from './health.ts';

export interface ApiAppDeps {
  db: AppDatabase;
  env: ApiEnv;
}

export type ApiAppEnv = { Variables: ApiAppDeps };

export function createApiApp({ db, env }: ApiAppDeps) {
  return new Hono<ApiAppEnv>()
    .use(async (c, next) => {
      c.set('db', db);
      c.set('env', env);
      await next();
    })
    .route('/health', healthApp);
}

export type AppType = ReturnType<typeof createApiApp>;
