import { createMiddleware } from 'hono/factory';
import type { UserAppEnv } from '../app.ts';

export interface ResolvedSession {
  user: { id: string };
}

export interface SessionResolver {
  api: {
    getSession(input: { headers: Headers }): Promise<ResolvedSession | null>;
  };
}

const UNAUTHORIZED = { code: 'unauthorized', message: 'Sign in first' } as const;

export const requireUser = createMiddleware<UserAppEnv>(async (c, next) => {
  const preset: string | undefined = c.get('userId');
  if (preset === undefined) {
    const session = await c.get('auth')?.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(UNAUTHORIZED, 401);
    c.set('userId', session.user.id);
  }
  await next();
});
