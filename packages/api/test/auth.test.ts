import { LIMITS } from '@combat-planner/domain';
import { Hono } from 'hono';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
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

let rateLimitWindow = Date.now();

beforeEach(() => {
  rateLimitWindow += 61_000;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(rateLimitWindow);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const CONTRACT_PATHS = [
  '/sign-up/email',
  '/sign-in/email',
  '/sign-in/social',
  '/sign-out',
  '/revoke-other-sessions',
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

describe('display name clamp', () => {
  it('never splits a surrogate pair at the limit', async () => {
    const auth = createAuth({ db: opened.db, env });
    const signedUp = await auth.api.signUpEmail({
      body: { name: 'Erin', email: 'surrogate@example.com', password: PASSWORD },
      returnHeaders: true,
    });
    const cookie = signedUp.headers
      .getSetCookie()
      .map((line) => line.split(';')[0])
      .join('; ');
    const headers = new Headers({ cookie });
    const prefix = LIMITS.displayName % 2 === 0 ? 'a' : '';
    const name = `${prefix}${'😀'.repeat(LIMITS.displayName)}`;
    await auth.api.updateUser({ headers, body: { name } });
    const found = await auth.api.getSession({ headers });
    const expected = `${prefix}${'😀'.repeat((LIMITS.displayName - prefix.length - 1) / 2)}`;
    expect(found?.user.name).toBe(expected);
    expect(found?.user.name.length).toBe(LIMITS.displayName - 1);
    expect(found?.user.name).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
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

describe('session cookie', () => {
  const signUpWith = async (betterAuthUrl: string | undefined, email: string) => {
    const auth = createAuth({ db: opened.db, env: { ...env, betterAuthUrl } });
    const response = await createAuthApp(auth).request('/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, name: 'Sofia' }),
    });
    expect(response.status).toBe(200);
    const cookie = response.headers
      .getSetCookie()
      .find((header) => header.includes('better-auth.session_token='));
    return { useSecureCookies: auth.options.advanced.useSecureCookies, cookie };
  };

  it.for([
    ['without betterAuthUrl', undefined, 'cookie-unset@example.com'],
    ['with an http betterAuthUrl', 'http://192.168.1.20:3000', 'cookie-http@example.com'],
  ] as const)('is not Secure %s', async ([, betterAuthUrl, email]) => {
    const { useSecureCookies, cookie } = await signUpWith(betterAuthUrl, email);
    expect(useSecureCookies).toBe(false);
    expect(cookie).toMatch(/^better-auth\.session_token=/);
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });

  it('is Secure with an https betterAuthUrl', async () => {
    const { useSecureCookies, cookie } = await signUpWith(
      'https://planner.example',
      'cookie-https@example.com',
    );
    expect(useSecureCookies).toBe(true);
    expect(cookie).toMatch(/^__Secure-better-auth\.session_token=/);
    expect(cookie).toMatch(/;\s*Secure/i);
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

  it('gives a GitHub account the language of the callback Accept-Language header', async () => {
    const withGithub = createTestApp({
      env: { github: { clientId: 'github-id', clientSecret: 'github-secret' } },
    });
    try {
      const browser = createBrowser(withGithub.app);
      const started = await browse(browser, 'POST', '/auth/sign-in/social', {
        provider: 'github',
        callbackURL: '/combats',
      });
      const { url } = (await started.json()) as { url: string };
      const state = new URL(url).searchParams.get('state');
      githubFetch('Octo');
      const callback = await browser.request(
        `/auth/callback/github?code=github-code&state=${encodeURIComponent(state ?? '')}`,
        { method: 'GET', headers: { 'accept-language': 'de-DE,de;q=0.9,en;q=0.8' } },
      );
      expect(callback.status).toBe(302);
      expect(await sessionOf(browser)).toMatchObject({ email: GITHUB_EMAIL, language: 'de' });
    } finally {
      withGithub.close();
    }
  });
});

describe('sign-up language', () => {
  const signUpWith = (email: string, acceptLanguage?: string) =>
    createBrowser(opened.app).request('/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(acceptLanguage === undefined ? {} : { 'accept-language': acceptLanguage }),
      },
      body: JSON.stringify({ name: 'Lang', email, password: PASSWORD }),
    });

  it.each([
    ['ru-RU,ru;q=0.9,en;q=0.8', 'ru', 'russian'],
    ['de-DE', 'de', 'german'],
    ['pt-BR', 'en', 'portuguese'],
    [undefined, 'en', 'none'],
  ])(
    'creates the account for Accept-Language %s with language %s',
    async (header, language, who) => {
      const response = await signUpWith(`lang-${who}@example.com`, header);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ user: { language } });
    },
  );
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

describe('auth rate limit', () => {
  const fromIp = (ip: string, route: string, body: unknown) =>
    opened.app.request(route, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    });

  it('refuses the 6th email sign-in in a minute from one IP with 429', async () => {
    const attempt = { email: 'nobody@example.com', password: PASSWORD };
    for (let index = 0; index < 5; index += 1) {
      expect((await fromIp('203.0.113.7', '/auth/sign-in/email', attempt)).status).toBe(401);
    }
    expect((await fromIp('203.0.113.7', '/auth/sign-in/email', attempt)).status).toBe(429);
    expect((await fromIp('203.0.113.8', '/auth/sign-in/email', attempt)).status).toBe(401);
  });

  it('refuses the 4th email sign-up in a minute from one IP with 429', async () => {
    const attempt = (index: number) => ({
      name: 'Dana',
      email: `burst-${index}@example.com`,
      password: PASSWORD,
    });
    for (let index = 0; index < 3; index += 1) {
      expect((await fromIp('203.0.113.9', '/auth/sign-up/email', attempt(index))).status).toBe(200);
    }
    expect((await fromIp('203.0.113.9', '/auth/sign-up/email', attempt(3))).status).toBe(429);
  });
});

describe('POST /auth/revoke-other-sessions', () => {
  it('ends every other session of the user and keeps the current one', async () => {
    const phone = createBrowser(opened.app);
    const laptop = createBrowser(opened.app);
    const credentials = { email: 'devices@example.com', password: PASSWORD };
    expect((await signUp(phone, credentials.email, 'Dana')).status).toBe(200);
    expect((await browse(laptop, 'POST', '/auth/sign-in/email', credentials)).status).toBe(200);
    const client = createHonoApiClient({
      baseUrl: 'http://localhost',
      fetch: ((input, init) =>
        phone.request(input instanceof Request ? input.url : String(input), init)) as typeof fetch,
    });
    await expect(client.auth.signOutOtherDevices()).resolves.toBeUndefined();
    expect((await browse(phone, 'GET', '/combats')).status).toBe(200);
    expect((await browse(laptop, 'GET', '/combats')).status).toBe(401);
  });
});
