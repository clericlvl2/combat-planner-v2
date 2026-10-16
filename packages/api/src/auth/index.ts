import { LIMITS, displayNameSchema } from '@combat-planner/domain';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { Hono } from 'hono';
import type { JSONParsed } from 'hono/utils/types';
import type { ApiAppEnv } from '../app.ts';
import { SOCIAL_PROVIDERS } from '../client.ts';
import type { SocialProvider } from '../client.ts';
import type { AppDatabase } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import type { ApiEnv } from '../env.ts';

export const AUTH_BASE_PATH = '/api/auth';

const DISABLED_AUTH_PATHS = [
  '/account-info',
  '/change-email',
  '/change-password',
  '/delete-user',
  '/delete-user/callback',
  '/get-access-token',
  '/link-social',
  '/list-accounts',
  '/list-sessions',
  '/ok',
  '/refresh-token',
  '/request-password-reset',
  '/reset-password',
  '/revoke-other-sessions',
  '/revoke-session',
  '/revoke-sessions',
  '/send-verification-email',
  '/unlink-account',
  '/update-session',
  '/update-user',
  '/verify-email',
  '/verify-password',
];

const EMAIL_SIGN_UP = '/sign-up/email';

const INVALID_DISPLAY_NAME = {
  code: 'invalid',
  message: `Display name must be 1 to ${LIMITS.displayName} characters`,
} as const;

const clampDisplayName = (name: string): string => {
  let clamped = '';
  for (const char of name) {
    if (clamped.length + char.length > LIMITS.displayName) break;
    clamped += char;
  }
  return clamped;
};

const boundedDisplayName = (
  name: string,
  path: string | undefined,
  email: string | undefined,
): string => {
  if (path === EMAIL_SIGN_UP) {
    if (displayNameSchema.safeParse(name).success) return name;
    throw new APIError('BAD_REQUEST', INVALID_DISPLAY_NAME);
  }
  const bounded = clampDisplayName(name) || clampDisplayName(email?.split('@')[0] ?? '');
  if (bounded === '') throw new APIError('BAD_REQUEST', INVALID_DISPLAY_NAME);
  return bounded;
};

export interface CreateAuthOptions {
  db: AppDatabase;
  env: ApiEnv;
  originCheck?: boolean;
}

export function createAuth({ db, env, originCheck }: CreateAuthOptions) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
    basePath: AUTH_BASE_PATH,
    trustedOrigins: env.trustedOrigins,
    disabledPaths: DISABLED_AUTH_PATHS,
    advanced: { disableOriginCheck: originCheck === undefined ? undefined : !originCheck },
    emailAndPassword: { enabled: true },
    socialProviders: {
      ...(env.google ? { google: env.google } : {}),
      ...(env.github ? { github: env.github } : {}),
    },
    user: {
      additionalFields: {
        language: { type: 'string', required: false, defaultValue: 'en', input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => ({
            data: { name: boundedDisplayName(user.name, context?.path, user.email) },
          }),
        },
        update: {
          before: async (user, context) => {
            if (user.name === undefined) return;
            return { data: { name: boundedDisplayName(user.name, context?.path, user.email) } };
          },
        },
      },
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
export type AuthUser = AuthInstance['$Infer']['Session']['user'];

type AuthApi = AuthInstance['api'];

type AuthCall = (...args: never[]) => Promise<unknown>;

type NoInput = Record<never, never>;

type JsonInput<Call extends AuthCall> =
  NonNullable<Parameters<Call>[0]> extends { body: infer Body }
    ? { json: Body }
    : NonNullable<Parameters<Call>[0]> extends { body?: infer Body }
      ? [NonNullable<Body>] extends [never]
        ? NoInput
        : { json?: NonNullable<Body> }
      : NoInput;

type AuthEndpoint<Call extends AuthCall> = {
  input: JsonInput<Call>;
  output: JSONParsed<Awaited<ReturnType<Call>>>;
  outputFormat: 'json';
  status: 200;
};

export type AuthRoutes = {
  '/sign-up/email': { $post: AuthEndpoint<AuthApi['signUpEmail']> };
  '/sign-in/email': { $post: AuthEndpoint<AuthApi['signInEmail']> };
  '/sign-in/social': { $post: AuthEndpoint<AuthApi['signInSocial']> };
  '/sign-out': { $post: AuthEndpoint<AuthApi['signOut']> };
  '/get-session': { $get: AuthEndpoint<AuthApi['getSession']> };
};

const WILDCARD = '/*';

const rebase = (request: Request, routePath: string): Request => {
  const url = new URL(request.url);
  const mounted = routePath.slice(0, -WILDCARD.length);
  url.pathname = `${AUTH_BASE_PATH}${url.pathname.slice(mounted.length)}`;
  return new Request(url, request);
};

export function createAuthApp(auth: AuthInstance) {
  return new Hono<ApiAppEnv, AuthRoutes>().on(['GET', 'POST'], WILDCARD, (c) =>
    auth.handler(rebase(c.req.raw, c.req.routePath)),
  );
}

export const configuredProviders = (env: ApiEnv): SocialProvider[] =>
  SOCIAL_PROVIDERS.filter((provider) => env[provider] !== undefined);

export const authProvidersApp = new Hono<ApiAppEnv>().get('/', (c) =>
  c.json({ providers: configuredProviders(c.get('env')) }),
);
