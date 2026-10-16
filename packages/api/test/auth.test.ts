import { Hono } from 'hono';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import type { TestApp } from './helpers.ts';
import { browse, createBrowser, createTestApp, signUp } from './helpers.ts';

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

  it('rejects a second account for the same email', async () => {
    const response = await signUp(createBrowser(opened.app), EMAIL, 'Alice again');
    expect(response.status).toBe(422);
  });

  it('rejects a password under 8 characters', async () => {
    const response = await signUp(createBrowser(opened.app), 'short@example.com', 'Bob', 'short');
    expect(response.status).toBe(400);
  });
});

describe('GET /auth/get-session', () => {
  it('returns the session of the cookie', async () => {
    const response = await browse(alice, 'GET', '/auth/get-session');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { email: EMAIL, name: 'Alice', language: 'en' },
      session: { userId: expect.any(String) },
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
