import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDatabase } from '@combat-planner/api';
import type { ApiEnv } from '@combat-planner/api';
import { afterAll, describe, expect, it } from 'vite-plus/test';
import { createServerApp } from './app.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-server-'));
const staticDir = path.join(directory, 'dist');
const databasePath = path.join(directory, 'combat-planner.db');
const env: ApiEnv = {
  betterAuthSecret: 'test-secret',
  betterAuthUrl: 'http://localhost:3000',
  linkSecret: 'test-link-secret',
};

mkdirSync(staticDir);
writeFileSync(
  path.join(staticDir, 'index.html'),
  '<!doctype html><html lang="en"><title>Combat Planner</title></html>',
);

const start = () =>
  createServerApp({ databasePath, staticRoot: path.relative(process.cwd(), staticDir), env });

const appliedMigrations = () => {
  const opened = openDatabase(databasePath);
  const row = opened.db.$client
    .prepare('select count(*) as count from __drizzle_migrations')
    .get() as { count: number };
  opened.close();
  return row.count;
};

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('server app', () => {
  it('migrates a fresh database and mounts the api under /api', async () => {
    const { app, close } = start();
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    close();
    expect(appliedMigrations()).toBe(7);
  });

  it('starts again on the same database without re-applying migrations', async () => {
    const { app, close } = start();
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    close();
    expect(appliedMigrations()).toBe(7);
  });

  it('serves index.html for client routes', async () => {
    const { app, close } = start();
    const response = await app.request('/combats/01J');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Combat Planner</title>');
    close();
  });
});

const cookieOf = (response: Response): string =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

describe('landing at /', () => {
  it('serves index.html marked for a guest without a cookie', async () => {
    const { app, close } = start();
    const response = await app.request('/');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<html data-boot="guest" lang="en">');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
    expect(response.headers.get('content-type')).toBe('text/html; charset=UTF-8');
    close();
  });

  it('redirects a signed-in user to /combats', async () => {
    const { app, close } = start();
    const signedUp = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: env.betterAuthUrl ?? '' },
      body: JSON.stringify({
        name: 'Dungeon Master',
        email: 'landing@example.com',
        password: 'correct horse battery',
      }),
    });
    expect(signedUp.status).toBe(200);
    const response = await app.request('/', { headers: { cookie: cookieOf(signedUp) } });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/combats');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
    close();
  });

  it('serves index.html without the guest mark for other routes', async () => {
    const { app, close } = start();
    const response = await app.request('/combats');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>Combat Planner</title>');
    expect(html).not.toContain('data-boot');
    close();
  });
});

describe('security headers', () => {
  it.each(['/api/health', '/combats/01J'])('come with %s', async (route) => {
    const { app, close } = start();
    const response = await app.request(route);
    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      'content-security-policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "font-src 'self' data:; img-src 'self' data:; connect-src 'self'; " +
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    });
    close();
  });
});
