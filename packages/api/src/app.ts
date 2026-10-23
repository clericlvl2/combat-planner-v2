import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { authProvidersApp, createAuth, createAuthApp } from './auth/index.ts';
import { requireUser } from './auth/require-user.ts';
import type { SessionResolver } from './auth/require-user.ts';
import { BODY_LIMIT_BYTES } from './client.ts';
import { actionsApp } from './combats/actions.ts';
import { eventsApp } from './combats/events.ts';
import { combatsApp } from './combats/routes.ts';
import type { AppDatabase } from './db/index.ts';
import type { ApiEnv } from './env.ts';
import { errorsApp } from './errors/routes.ts';
import { recordError } from './errors/store.ts';
import { healthApp } from './health.ts';
import { presetsApp } from './presets/routes.ts';
import { tagsApp } from './tags/routes.ts';
import { settingsApp } from './settings/routes.ts';
import { createAccountApp } from './account/routes.ts';
import { linkApp } from './link/routes.ts';
import { playApp } from './play/routes.ts';
import { createRateLimiter } from './rate-limit.ts';

export interface ApiAppDeps {
  db: AppDatabase;
  env: ApiEnv;
  auth?: SessionResolver;
  rateLimit?: boolean;
}

export { BODY_LIMIT_BYTES };

const BODY_TOO_LARGE = { code: 'limit', message: 'Request body exceeds 64 KB' } as const;

export type ApiAppEnv = { Variables: ApiAppDeps & { userId?: string; sessionId?: string } };
export type UserAppEnv = { Variables: ApiAppDeps & { userId: string; sessionId?: string } };

const userCombatsApp = new Hono<ApiAppEnv>()
  .use(requireUser)
  .route('/', combatsApp)
  .route('/', actionsApp)
  .route('/', eventsApp)
  .route('/', linkApp);

export function createApiApp({ db, env, auth, rateLimit = true }: ApiAppDeps) {
  const instance = createAuth({ db, env });
  return new Hono<ApiAppEnv>()
    .use(rateLimit ? createRateLimiter() : (_c, next) => next())
    .use(
      bodyLimit({
        maxSize: BODY_LIMIT_BYTES,
        onError: (c) => c.json(BODY_TOO_LARGE, 413),
      }),
    )
    .use(async (c, next) => {
      c.set('db', db);
      c.set('env', env);
      c.set('auth', auth ?? instance);
      await next();
    })
    .route('/auth', createAuthApp(instance))
    .route('/auth-providers', authProvidersApp)
    .route('/health', healthApp)
    .route('/presets', presetsApp)
    .route('/tags', tagsApp)
    .route('/settings', settingsApp)
    .route('/account', createAccountApp(instance))
    .route('/combats', userCombatsApp)
    .route('/play', playApp)
    .route('/errors', errorsApp)
    .onError((error, c) => {
      if (error instanceof HTTPException) return error.getResponse();
      console.error(error);
      try {
        recordError(db, 'server', {
          message: error.message || error.name,
          stack: error.stack,
          path: c.req.routePath,
        });
      } catch (recordFailure) {
        console.error('error report not stored', recordFailure);
      }
      return c.text('Internal Server Error', 500);
    });
}

export type AppType = ReturnType<typeof createApiApp>;
