import { Hono } from 'hono';
import { createAuth, createAuthApp } from './auth/index.ts';
import type { SessionResolver } from './auth/require-user.ts';
import { actionsApp } from './combats/actions.ts';
import { eventsApp } from './combats/events.ts';
import { combatsApp } from './combats/routes.ts';
import type { AppDatabase } from './db/index.ts';
import type { ApiEnv } from './env.ts';
import { healthApp } from './health.ts';
import { presetsApp } from './presets/routes.ts';
import { tagsApp } from './tags/routes.ts';
import { linkApp } from './link/routes.ts';
import { playApp } from './play/routes.ts';

export interface ApiAppDeps {
  db: AppDatabase;
  env: ApiEnv;
  auth?: SessionResolver;
}

export type ApiAppEnv = { Variables: ApiAppDeps & { userId: string } };

export function createApiApp({ db, env, auth }: ApiAppDeps) {
  const instance = createAuth({ db, env });
  return new Hono<ApiAppEnv>()
    .use(async (c, next) => {
      c.set('db', db);
      c.set('env', env);
      c.set('auth', auth ?? instance);
      await next();
    })
    .route('/auth', createAuthApp(instance))
    .route('/health', healthApp)
    .route('/presets', presetsApp)
    .route('/tags', tagsApp)
    .route('/combats', combatsApp)
    .route('/combats', actionsApp)
    .route('/combats', eventsApp)
    .route('/combats', linkApp)
    .route('/play', playApp);
}

export type AppType = ReturnType<typeof createApiApp>;
