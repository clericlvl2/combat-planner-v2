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
writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>Combat Planner</title>');

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
    expect(appliedMigrations()).toBe(2);
  });

  it('starts again on the same database without re-applying migrations', async () => {
    const { app, close } = start();
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    close();
    expect(appliedMigrations()).toBe(2);
  });

  it('serves index.html for client routes', async () => {
    const { app, close } = start();
    const response = await app.request('/combats/01J');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Combat Planner</title>');
    close();
  });
});
