import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { Hono } from 'hono';
import type { ApiAppEnv } from '../app.ts';
import type { AppDatabase } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import type { ApiEnv } from '../env.ts';

export const AUTH_BASE_PATH = '/api/auth';

export interface CreateAuthOptions {
  db: AppDatabase;
  env: ApiEnv;
}

export function createAuth({ db, env }: CreateAuthOptions) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
    basePath: AUTH_BASE_PATH,
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
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
export type AuthUser = AuthInstance['$Infer']['Session']['user'];

type AuthEndpoint<Input, Output> = {
  input: Input;
  output: Output;
  outputFormat: 'json';
  status: 200;
};

type NoInput = Record<never, never>;

export type AuthRoutes = {
  '/sign-up/email': {
    $post: AuthEndpoint<
      { json: { name: string; email: string; password: string } },
      { token: string | null; user: AuthUser }
    >;
  };
  '/sign-in/email': {
    $post: AuthEndpoint<
      { json: { email: string; password: string } },
      { token: string; user: AuthUser }
    >;
  };
  '/sign-out': { $post: AuthEndpoint<NoInput, { success: boolean }> };
  '/get-session': { $get: AuthEndpoint<NoInput, AuthInstance['$Infer']['Session'] | null> };
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
