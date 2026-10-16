import { Hono } from 'hono';
import type { SessionResolver } from './auth/require-user.ts';
import { actionsApp } from './combats/actions.ts';
import { combatsApp } from './combats/routes.ts';
import type { AppDatabase } from './db/index.ts';
import type { ApiEnv } from './env.ts';
import { healthApp } from './health.ts';
import { linkApp } from './link/routes.ts';

export interface ApiAppDeps {
  db: AppDatabase;
  env: ApiEnv;
  auth?: SessionResolver;
}

export type ApiAppEnv = { Variables: ApiAppDeps & { userId: string } };

export function createApiApp({ db, env, auth }: ApiAppDeps) {
  return new Hono<ApiAppEnv>()
    .use(async (c, next) => {
      c.set('db', db);
      c.set('env', env);
      if (auth) c.set('auth', auth);
      await next();
    })
    .route('/health', healthApp)
    .route('/combats', combatsApp)
    .route('/combats', actionsApp)
    .route('/combats', linkApp);
}

export type AppType = ReturnType<typeof createApiApp>;
