import { LIMITS } from '@combat-planner/domain';
import { Hono } from 'hono';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { createAuth, createAuthApp } from '../src/auth/index.ts';
import { sessionSchema } from '../src/client.ts';
import type { ApiEnv } from '../src/env.ts';
import { createHonoApiClient } from '../src/hono-client.ts';
import type { Browser, TestApp } from './helpers.ts';
import { browse, createBrowser, createTestApp, env, signUp } from './helpers.ts';

const EMAIL = 'alice@example.com';
const PASSWORD = 'correct horse battery';

let opened: TestApp;
let alice: ReturnType<typeof createBrowser>;

beforeAll(() => {
  opened = createTestApp();
  alice = createBrowser(opened.app);
});

afterAll(() => {
  opened.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const CONTRACT_PATHS = [
  '/sign-up/email',
  '/sign-in/email',
  '/sign-in/social',
  '/sign-out',
  '/get-session',
  '/callback/:id',
  '/error',
];

const sessionOf = async (browser: Browser) => {
  const response = await browse(browser, 'GET', '/auth/get-session');
  const body = (await response.json()) as {
    user: { id: string; email: string; name: string; language: string };
    method: string;
  } | null;
  if (body === null) return null;
  return sessionSchema.parse({
    userId: body.user.id,
    email: body.user.email,
    displayName: body.user.name,
    language: body.user.language,
    method: body.method,
  });
};

describe('POST /auth/sign-up/email', () => {
  it('rejects a protected route before sign-in', async () => {
    const response = await browse(alice, 'GET', '/combats');
    expect(response.status).toBe(401);
  });

  it('creates the user with language en and signs in', async () => {
    const response = await signUp(alice, EMAIL, 'Alice');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { email: EMAIL, name: 'Alice', language: 'en' },
    });
    expect(response.headers.getSetCookie().join(';')).toContain('session_token');
  });

  it('rejects a second account for the same email with emailTaken', async () => {
    const response = await signUp(createBrowser(opened.app), EMAIL, 'Alice again');
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'emailTaken' });
  });

  it('rejects a password under 8 characters', async () => {
    const response = await signUp(createBrowser(opened.app), 'short@example.com', 'Bob', 'short');
    expect(response.status).toBe(400);
  });

  it('rejects an empty or over-limit display name with 400 invalid and opens no session', async () => {
    for (const [email, name] of [
      ['long@example.com', 'Ж'.repeat(LIMITS.displayName + 1)],
      ['empty@example.com', ''],
    ] as const) {
      const browser = createBrowser(opened.app);
      const response = await signUp(browser, email, name);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'invalid' });
      expect(response.headers.getSetCookie().join(';')).not.toContain('session_token');
      expect(await sessionOf(browser)).toBeNull();
      const signedIn = await browse(browser, 'POST', '/auth/sign-in/email', {
        email,
        password: PASSWORD,
      });
      expect(signedIn.status).toBe(401);
    }
  });

  it('accepts a display name at the limit and the session parses with sessionSchema', async () => {
    const browser = createBrowser(opened.app);
    const name = 'Ж'.repeat(LIMITS.displayName);
    expect((await signUp(browser, 'limit@example.com', name)).status).toBe(200);
    expect(await sessionOf(browser)).toMatchObject({ displayName: name });
  });
});

describe('GET /auth/get-session', () => {
  it('returns the session of the cookie', async () => {
    const response = await browse(alice, 'GET', '/auth/get-session');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { email: EMAIL, name: 'Alice', language: 'en' },
      session: { userId: expect.any(String) },
      method: 'email',
    });
  });

  it('returns null without a cookie', async () => {
    const response = await opened.app.request('/auth/get-session');
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });
});

describe('protected routes', () => {
  it('resolve the signed-in user through the session cookie', async () => {
    const response = await browse(alice, 'GET', '/combats');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe('POST /auth/sign-out', () => {
  it('ends the session and the protected route answers 401 again', async () => {
    const response = await browse(alice, 'POST', '/auth/sign-out');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect((await browse(alice, 'GET', '/combats')).status).toBe(401);
    expect(await (await browse(alice, 'GET', '/auth/get-session')).json()).toBeNull();
  });
});

describe('POST /auth/sign-in/email', () => {
  it('rejects a wrong password', async () => {
    const response = await browse(alice, 'POST', '/auth/sign-in/email', {
      email: EMAIL,
      password: 'wrong password',
    });
    expect(response.status).toBe(401);
  });

  it('signs the user in again and reopens the protected route', async () => {
    const response = await browse(alice, 'POST', '/auth/sign-in/email', {
      email: EMAIL,
      password: PASSWORD,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { email: EMAIL, name: 'Alice' } });
    expect((await browse(alice, 'GET', '/combats')).status).toBe(200);
  });
});

describe('mounted under /api', () => {
  it('serves the auth routes through the server prefix', async () => {
    const server = new Hono().route('/api', opened.app);
    const browser = createBrowser(server);
    const signedUp = await browse(browser, 'POST', '/api/auth/sign-up/email', {
      name: 'Carol',
      email: 'carol@example.com',
      password: PASSWORD,
    });
    expect(signedUp.status).toBe(200);
    const session = await browse(browser, 'GET', '/api/auth/get-session');
    expect(await session.json()).toMatchObject({ user: { name: 'Carol' } });
    expect((await browse(browser, 'GET', '/api/combats')).status).toBe(200);
  });
});

describe('social providers', () => {
  it('are listed only when both env values are set', async () => {
    const withGoogle = createTestApp({
      env: { google: { clientId: 'google-id', clientSecret: 'google-secret' } },
    });
    try {
      const response = await withGoogle.app.request('/auth/sign-in/social', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'github' }),
      });
      expect(response.status).toBe(404);
      const google = await withGoogle.app.request('/auth/sign-in/social', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'google' }),
      });
      expect(google.status).toBe(200);
      expect(await google.json()).toMatchObject({ url: expect.stringContaining('google') });
    } finally {
      withGoogle.close();
    }
  });
});

describe('user update', () => {
  it('clamps an over-limit name passed to auth.api.updateUser so the session still parses', async () => {
    const auth = createAuth({ db: opened.db, env });
    const signedUp = await auth.api.signUpEmail({
      body: { name: 'Erin', email: 'update@example.com', password: PASSWORD },
      returnHeaders: true,
    });
    const cookie = signedUp.headers
      .getSetCookie()
      .map((line) => line.split(';')[0])
      .join('; ');
    const headers = new Headers({ cookie });
    const name = 'Ж'.repeat(LIMITS.displayName + 5);
    await auth.api.updateUser({ headers, body: { name } });
    const found = await auth.api.getSession({ headers });
    expect(found).not.toBeNull();
    expect(
      sessionSchema.parse({
        userId: found?.user.id,
        email: found?.user.email,
        displayName: found?.user.name,
        language: found?.user.language,
        method: 'email',
      }),
    ).toMatchObject({ displayName: name.slice(0, LIMITS.displayName) });
  });
});

describe('disabled Better Auth endpoints', () => {
  it('answer 404 for change-password and update-user with a valid session', async () => {
    const browser = createBrowser(opened.app);
    expect((await signUp(browser, 'disabled@example.com', 'Dana')).status).toBe(200);
    const changed = await browse(browser, 'POST', '/auth/change-password', {
      currentPassword: PASSWORD,
      newPassword: 'another horse battery',
    });
    expect(changed.status).toBe(404);
    const renamed = await browse(browser, 'POST', '/auth/update-user', {
      name: 'Ж'.repeat(LIMITS.displayName + 1),
    });
    expect(renamed.status).toBe(404);
    expect(await sessionOf(browser)).toMatchObject({ displayName: 'Dana' });
    const signedIn = await browse(browser, 'POST', '/auth/sign-in/email', {
      email: 'disabled@example.com',
      password: PASSWORD,
    });
    expect(signedIn.status).toBe(200);
  });

  it('answer 404 for every endpoint outside the contract', async () => {
    const auth = createAuth({ db: opened.db, env });
    const outside = Object.values(auth.api).flatMap((endpoint) => {
      const path: string | undefined = endpoint.path;
      const [method] = [endpoint.options.method].flat();
      if (path === undefined || method === undefined || path.includes(':')) return [];
      return CONTRACT_PATHS.includes(path) ? [] : [{ path, method }];
    });
    expect(outside.map(({ path }) => path)).toContain('/change-password');
    for (const { path, method } of outside) {
      const response = await opened.app.request(`/auth${path}`, { method });
      expect({ path, status: response.status }).toEqual({ path, status: 404 });
    }
  });
});

describe('trusted origins', () => {
  it('admit sign-in from a configured origin and reject any other with the origin check on', async () => {
    const trusted = 'http://localhost:5173';
    const app = createAuthApp(
      createAuth({ db: opened.db, env: { ...env, trustedOrigins: [trusted] }, originCheck: true }),
    );
    const credentials = { email: 'origin@example.com', password: PASSWORD };
    const signIn = (origin: string) =>
      app.request('/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify(credentials),
      });
    const signedUp = await app.request('/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...credentials, name: 'Olga' }),
    });
    expect(signedUp.status).toBe(200);
    expect((await signIn(trusted)).status).toBe(200);
    expect((await signIn('http://evil.example')).status).toBe(403);
  });

  it('admit sign-up from the request origin and reject any other without betterAuthUrl', async () => {
    const requestOrigin = 'http://planner.test:8080';
    const app = createAuthApp(
      createAuth({ db: opened.db, env: { ...env, betterAuthUrl: undefined }, originCheck: true }),
    );
    const signUpFrom = (origin: string, email: string) =>
      app.request(`${requestOrigin}/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify({ email, password: PASSWORD, name: 'Petra' }),
      });
    expect((await signUpFrom('http://evil.example', 'foreign-origin@example.com')).status).toBe(
      403,
    );
    expect((await signUpFrom(requestOrigin, 'request-origin@example.com')).status).toBe(200);
  });
});

describe('social sign-in', () => {
  const GITHUB_EMAIL = 'octo@example.com';

  const githubFetch = (name: string) => {
    const respond = (body: unknown) =>
      new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith('https://github.com/login/oauth/access_token')) {
        return respond({ access_token: 'github-token', token_type: 'bearer', scope: 'user:email' });
      }
      if (url.startsWith('https://api.github.com/user/emails')) {
        return respond([{ email: GITHUB_EMAIL, primary: true, verified: true }]);
      }
      if (url.startsWith('https://api.github.com/user')) {
        return respond({ id: 42, login: 'octo', name, email: GITHUB_EMAIL, avatar_url: '' });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
  };

  it('clamps an over-limit GitHub profile name so the session parses with sessionSchema', async () => {
    const withGithub = createTestApp({
      env: { github: { clientId: 'github-id', clientSecret: 'github-secret' } },
    });
    try {
      const browser = createBrowser(withGithub.app);
      const started = await browse(browser, 'POST', '/auth/sign-in/social', {
        provider: 'github',
        callbackURL: '/combats',
      });
      expect(started.status).toBe(200);
      const { url } = (await started.json()) as { url: string };
      const state = new URL(url).searchParams.get('state');
      expect(state).toEqual(expect.any(String));
      const name = 'Ж'.repeat(LIMITS.displayName + 20);
      githubFetch(name);
      const callback = await browse(
        browser,
        'GET',
        `/auth/callback/github?code=github-code&state=${encodeURIComponent(state ?? '')}`,
      );
      expect(callback.status).toBe(302);
      expect(await sessionOf(browser)).toMatchObject({
        email: GITHUB_EMAIL,
        displayName: name.slice(0, LIMITS.displayName),
        method: 'github',
      });
    } finally {
      withGithub.close();
    }
  });
});

describe('GET /auth-providers', () => {
  const google = { clientId: 'google-id', clientSecret: 'google-secret' };
  const github = { clientId: 'github-id', clientSecret: 'github-secret' };

  it.each([
    ['none', {}, []],
    ['google', { google }, ['google']],
    ['github', { github }, ['github']],
    ['both', { google, github }, ['google', 'github']],
  ] as const)('lists %s', async (_label, overrides: Partial<ApiEnv>, providers) => {
    const configured = createTestApp({ env: overrides });
    try {
      const response = await configured.app.request('/auth-providers');
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ providers });
      const client = createHonoApiClient({
        baseUrl: 'http://localhost',
        fetch: ((input, init) => configured.app.request(input, init)) as typeof fetch,
      });
      await expect(client.auth.providers()).resolves.toEqual(providers);
    } finally {
      configured.close();
    }
  });
});

describe('auth.socialSignIn', () => {
  it('returns the provider authorization URL without navigating', async () => {
    const configured = createTestApp({
      env: { google: { clientId: 'google-id', clientSecret: 'google-secret' } },
    });
    try {
      const client = createHonoApiClient({
        baseUrl: 'http://localhost',
        fetch: ((input, init) => configured.app.request(input, init)) as typeof fetch,
      });
      const { url } = await client.auth.socialSignIn('google', '/combats');
      expect(new URL(url).hostname).toBe('accounts.google.com');
      expect(new URL(url).searchParams.get('client_id')).toBe('google-id');
    } finally {
      configured.close();
    }
  });
});

describe('auth client over a Node HTTP transport', () => {
  const overHttp = (browser: Browser) =>
    (async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      const body = request.method === 'GET' ? undefined : await request.arrayBuffer();
      return browser.request(request.url, {
        method: request.method,
        headers: request.headers,
        body,
      });
    }) as typeof fetch;

  it('signs up, signs out, signs in and starts a social sign-in with a body on every POST', async () => {
    const configured = createTestApp({
      env: { google: { clientId: 'google-id', clientSecret: 'google-secret' } },
    });
    try {
      const client = createHonoApiClient({
        baseUrl: 'http://localhost',
        fetch: overHttp(createBrowser(configured.app)),
      });
      const email = 'transport@example.com';
      await expect(
        client.auth.signUp({ email, password: PASSWORD, displayName: 'Tess' }),
      ).resolves.toMatchObject({ email, method: 'email' });
      await expect(client.auth.session()).resolves.toMatchObject({ email });
      await expect(client.auth.signOut()).resolves.toBeUndefined();
      await expect(client.auth.session()).resolves.toBeNull();
      await expect(client.combats.list()).rejects.toMatchObject({ status: 401 });
      await expect(client.auth.signIn({ email, password: PASSWORD })).resolves.toMatchObject({
        email,
      });
      await expect(client.combats.list()).resolves.toEqual([]);
      const { url } = await client.auth.socialSignIn('google', '/combats');
      expect(new URL(url).hostname).toBe('accounts.google.com');
    } finally {
      configured.close();
    }
  });
});
