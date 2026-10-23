import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDatabase } from '@combat-planner/api';
import type { ApiEnv } from '@combat-planner/api';
import { afterAll, describe, expect, it } from 'vite-plus/test';
import { createServerApp } from '../app.ts';
import type { AdminPageOptions } from '../app.ts';
import type { ServerProbes } from './server-stats.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-admin-'));
const staticDir = path.join(directory, 'dist');
const databasePath = path.join(directory, 'combat-planner.db');
const HOST = 'planner.example';
const MB = 1024 * 1024;
const env: ApiEnv = {
  betterAuthSecret: 'test-secret',
  betterAuthUrl: `https://${HOST}`,
  linkSecret: 'test-link-secret',
  github: { clientId: 'id', clientSecret: 'secret' },
};

mkdirSync(staticDir);
writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>Combat Planner</title>');

const serverProbes: ServerProbes = {
  loadavg: () => [0.5, 0.25, 0.1],
  cores: () => 2,
  totalMemory: () => 1024 * MB,
  freeMemory: () => 512 * MB,
  rss: () => 450 * MB,
  freeDisk: () => 5 * 1024 * MB,
  fileSize: () => 2 * MB,
};

const admin = (healthStatus: number): AdminPageOptions => ({
  version: '1.2.3',
  serverProbes,
  litestreamMetricsUrl: 'http://litestream.test/metrics',
  probes: {
    fetch: async (url) => {
      if (url === `https://${HOST}/api/health`) return new Response('', { status: healthStatus });
      if (url === `https://www.${HOST}/`)
        return new Response(null, { status: 308, headers: { location: `https://${HOST}/` } });
      return new Response('litestream_sync_count{db="/data/combat-planner.db"} 10\n');
    },
    certificateExpiry: async () => new Date(Date.now() + 90 * 86_400_000),
  },
});

const start = (options?: AdminPageOptions) =>
  createServerApp({
    databasePath,
    staticRoot: path.relative(process.cwd(), staticDir),
    env,
    admin: options,
  });

const seed = () => {
  const opened = openDatabase(databasePath);
  const now = Date.now();
  const insert = opened.db.$client.prepare(
    'insert into user (id, name, email, createdAt, updatedAt) values (?, ?, ?, ?, ?)',
  );
  for (const id of ['dm-1', 'dm-2', 'dm-3']) insert.run(id, id, `${id}@example.com`, now, now);
  opened.db.$client
    .prepare('insert into daily_stats (day, player_joins, actions) values (?, ?, ?)')
    .run(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(now), 4, 17);
  opened.close();
};

const cell = (html: string, label: string): string | undefined =>
  new RegExp(`<td>${label}</td><td class="number">(\\d+)</td>`).exec(html)?.[1];

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('/admin', () => {
  it('answers 404 unless the admin page is enabled', async () => {
    const { app, close } = start();
    expect((await app.request('/admin')).status).toBe(404);
    expect((await app.request('/admin/anything')).status).toBe(404);
    close();
  });

  it('renders the server, usage, 14-day and check sections', async () => {
    const { app, checker, close } = start(admin(200));
    seed();
    await checker?.run();
    const response = await app.request('/admin');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    const html = await response.text();
    expect(html).toContain('<meta http-equiv="refresh" content="30">');
    expect(html).toContain('Версия 1.2.3');
    for (const heading of ['Сервер', 'Пользователи и активность', '14 дней', 'Проверки']) {
      expect(html).toContain(`<h2>${heading}</h2>`);
    }
    expect(html).toContain('0.50 / 0.25 / 0.10, ядер 2');
    expect(html).toContain('выше 80% лимита');
    expect(cell(html, 'Мастеров всего')).toBe('3');
    expect(cell(html, 'Новых мастеров сегодня')).toBe('3');
    expect(cell(html, 'Входов игроков сегодня')).toBe('4');
    expect(cell(html, 'Действий сегодня')).toBe('17');
    expect(html.match(/<tr><td>\d{4}-\d{2}-\d{2}<\/td>/g)).toHaveLength(14);
    expect(html).toContain('<td>Сайт отвечает (/api/health)</td><td>HTTP 200');
    expect(html).not.toContain('<script');
    close();
  });

  it('renders a failing check as a problem with its detail', async () => {
    const { app, checker, close } = start(admin(503));
    await checker?.run();
    const html = await (await app.request('/admin')).text();
    expect(html).toMatch(
      /<tr class="problem"><td>Сайт отвечает \(\/api\/health\)<\/td><td>HTTP 503[^<]*<div class="detail">ожидался ответ 200<\/div><\/td><td>❌ проблема<\/td><td>\d{2}:\d{2}:\d{2}<\/td><\/tr>/,
    );
    close();
  });
});
