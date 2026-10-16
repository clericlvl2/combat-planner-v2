import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { settingsSchema } from '../src/client.ts';
import { user } from '../src/db/schema.ts';
import type { Requester, TestApp } from './helpers.ts';
import {
  DM,
  OTHER_DM,
  browse,
  call,
  createBrowser,
  createTestApp,
  signUp,
  withUser,
} from './helpers.ts';

let opened: TestApp;
let dm: Requester;
let stranger: Requester;

beforeAll(() => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  stranger = withUser(opened.app, OTHER_DM);
});

afterAll(() => {
  opened.close();
});

const languageOf = (userId: string) =>
  opened.db.select({ language: user.language }).from(user).where(eq(user.id, userId)).get()
    ?.language;

describe('GET /settings', () => {
  it('answers 401 without a session', async () => {
    const response = await opened.app.request('/settings');
    expect(response.status).toBe(401);
  });

  it('returns en for a new user', async () => {
    const response = await call(dm, 'GET', '/settings');
    expect(response.status).toBe(200);
    expect(settingsSchema.parse(await response.json())).toEqual({ language: 'en' });
  });

  it('answers 404 when the user row is gone', async () => {
    const response = await call(withUser(opened.app, 'missing-user'), 'GET', '/settings');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'notFound', message: 'User not found' });
  });
});

describe('PATCH /settings', () => {
  it('answers 401 without a session', async () => {
    const response = await opened.app.request('/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language: 'ja' }),
    });
    expect(response.status).toBe(401);
    expect(languageOf(DM)).toBe('en');
  });

  it('writes user.language and returns the settings', async () => {
    const response = await call(dm, 'PATCH', '/settings', { language: 'ja' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ language: 'ja' });
    expect(languageOf(DM)).toBe('ja');
    expect(await (await call(dm, 'GET', '/settings')).json()).toEqual({ language: 'ja' });
    expect(await (await call(stranger, 'GET', '/settings')).json()).toEqual({ language: 'en' });
  });

  it('rejects a locale outside the six with 400', async () => {
    const response = await call(dm, 'PATCH', '/settings', { language: 'it' });
    expect(response.status).toBe(400);
    expect(languageOf(DM)).toBe('ja');
  });

  it('rejects a body without language with 400', async () => {
    const response = await call(dm, 'PATCH', '/settings', {});
    expect(response.status).toBe(400);
  });

  it('answers 404 when the user row is gone', async () => {
    const response = await call(withUser(opened.app, 'missing-user'), 'PATCH', '/settings', {
      language: 'de',
    });
    expect(response.status).toBe(404);
  });

  it('shows the new language in the Better Auth session', async () => {
    const browser = createBrowser(opened.app);
    expect((await signUp(browser, 'ru@example.com', 'Ирина')).status).toBe(200);
    const response = await browse(browser, 'PATCH', '/settings', { language: 'ru' });
    expect(response.status).toBe(200);
    const session = await browse(browser, 'GET', '/auth/get-session');
    expect(await session.json()).toMatchObject({ user: { name: 'Ирина', language: 'ru' } });
  });
});
