import { LIMITS, displayNameSchema } from '@combat-planner/domain';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { Hono } from 'hono';
import type { JSONParsed } from 'hono/utils/types';
import { z } from 'zod';
import type { ApiAppEnv } from '../app.ts';
import { SOCIAL_PROVIDERS, acceptLanguages, browserLocale } from '../client.ts';
import type { SocialProvider } from '../client.ts';
import type { AppDatabase } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import type { ApiEnv } from '../env.ts';
import { closeEndedDmStreams } from '../sharing/streams.ts';
import { signInMethodOf } from './method.ts';

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
const EMAIL_SIGN_IN = '/sign-in/email';
const GET_SESSION = '/get-session';
const SESSION_ENDING_PATHS: ReadonlySet<string> = new Set(['/sign-out', '/revoke-other-sessions']);

const AUTH_RATE_LIMITS = {
  [EMAIL_SIGN_IN]: { window: 60, max: 5 },
  [EMAIL_SIGN_UP]: { window: 60, max: 3 },
};

const EMAIL_TAKEN = {
  code: 'emailTaken',
  message: 'An account with this email already exists',
} as const;

const DUPLICATE_EMAIL_CODE = 'USER_ALREADY_EXISTS';

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

const acceptLanguageOf = (
  context: { headers?: Headers; request?: Request } | null | undefined,
): string | null => (context?.headers ?? context?.request?.headers)?.get('accept-language') ?? null;

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
    rateLimit: { enabled: true, storage: 'memory', customRules: AUTH_RATE_LIMITS },
    advanced: {
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
      disableOriginCheck: originCheck === undefined ? undefined : !originCheck,
      useSecureCookies: env.betterAuthUrl?.startsWith('https:') === true,
    },
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
            data: {
              name: boundedDisplayName(user.name, context?.path, user.email),
              language: browserLocale(acceptLanguages(acceptLanguageOf(context))),
            },
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
  '/revoke-other-sessions': { $post: AuthEndpoint<AuthApi['revokeOtherSessions']> };
  '/get-session': { $get: AuthEndpoint<AuthApi['getSession']> };
};

const WILDCARD = '/*';

const rebase = (request: Request, routePath: string): Request => {
  const url = new URL(request.url);
  const mounted = routePath.slice(0, -WILDCARD.length);
  url.pathname = `${AUTH_BASE_PATH}${url.pathname.slice(mounted.length)}`;
  return new Request(url, request);
};

const errorBodySchema = z.object({ code: z.string() });
const sessionBodySchema = z.looseObject({ user: z.looseObject({ id: z.string() }) });

const jsonResponse = (body: unknown, response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { status: response.status, headers });
};

const bodyOf = async (response: Response): Promise<unknown> =>
  response
    .clone()
    .json()
    .catch(() => null);

const withEmailTaken = async (response: Response): Promise<Response> => {
  const body = errorBodySchema.safeParse(await bodyOf(response));
  if (!body.success || !body.data.code.startsWith(DUPLICATE_EMAIL_CODE)) return response;
  return jsonResponse(EMAIL_TAKEN, response);
};

const withMethod = async (auth: AuthInstance, response: Response): Promise<Response> => {
  const body = sessionBodySchema.safeParse(await bodyOf(response));
  if (!body.success) return response;
  const context = await auth.$context;
  const accounts = await context.internalAdapter.findAccounts(body.data.user.id);
  return jsonResponse({ ...body.data, method: signInMethodOf(accounts) }, response);
};

export function createAuthApp(auth: AuthInstance) {
  return new Hono<ApiAppEnv, AuthRoutes>().on(['GET', 'POST'], WILDCARD, async (c) => {
    const request = rebase(c.req.raw, c.req.routePath);
    const response = await auth.handler(request);
    const path = new URL(request.url).pathname.slice(AUTH_BASE_PATH.length);
    if (path === EMAIL_SIGN_UP && !response.ok) return withEmailTaken(response);
    if (path === GET_SESSION && response.ok) return withMethod(auth, response);
    if (SESSION_ENDING_PATHS.has(path) && response.ok) closeEndedDmStreams(c.get('db'));
    return response;
  });
}

export const configuredProviders = (env: ApiEnv): SocialProvider[] =>
  SOCIAL_PROVIDERS.filter((provider) => env[provider] !== undefined);

export const authProvidersApp = new Hono<ApiAppEnv>().get('/', (c) =>
  c.json({ providers: configuredProviders(c.get('env')) }),
);
