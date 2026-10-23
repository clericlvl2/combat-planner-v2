import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDatabase, runMigrations } from '@combat-planner/api';
import type { ApiEnv, OpenedDatabase } from '@combat-planner/api';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import type { CheckProbes, CheckerOptions } from './checks.ts';
import { createChecker } from './checks.ts';
import type { StatusRow } from './format.ts';

const START = new Date('2026-10-16T12:00:00Z');
const MINUTE = 60_000;
const HOST = 'planner.example';
const METRICS = 'http://litestream.test/metrics';

const env: ApiEnv = {
  betterAuthSecret: 'test-secret',
  betterAuthUrl: `https://${HOST}`,
  linkSecret: 'test-link-secret',
  github: { clientId: 'id', clientSecret: 'secret' },
};

const metrics = (syncs: number, syncErrors = 0, uploadErrors = 0): string =>
  [
    '# HELP litestream_sync_count Number of sync operations performed',
    '# TYPE litestream_sync_count counter',
    `litestream_sync_count{db="/data/combat-planner.db"} ${syncs}`,
    `litestream_sync_error_count{db="/data/combat-planner.db"} ${syncErrors}`,
    `litestream_replica_operation_errors_total{code="500",operation="PUT",replica_type="s3"} ${uploadErrors}`,
    '',
  ].join('\n');

type Answer = Response | Error;

let directory: string;
let opened: OpenedDatabase;
let clock: Date;
let answers: Map<string, Answer>;
let expiry: Date | Error;
let lastSweepAt: Date | undefined;

const answer = (url: string, value: Answer) => answers.set(url, value);

const probes: CheckProbes = {
  fetch: async (url) => {
    const value = answers.get(url);
    if (value === undefined) throw new Error(`unexpected ${url}`);
    if (value instanceof Error) throw value;
    return value.clone();
  },
  certificateExpiry: async () => {
    if (expiry instanceof Error) throw expiry;
    return expiry;
  },
};

const checker = (overrides: Partial<CheckerOptions> = {}) =>
  createChecker({
    db: opened.db,
    env,
    lastSweepAt: () => lastSweepAt,
    probes,
    now: () => clock,
    litestreamMetricsUrl: METRICS,
    ...overrides,
  });

const byName = (rows: StatusRow[], name: string): StatusRow => {
  const found = rows.find((row) => row.name === name);
  if (!found) throw new Error(`no row ${name}`);
  return found;
};

const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-checks-'));
  opened = openDatabase(path.join(directory, 'test.db'));
  runMigrations(opened.db);
  clock = START;
  answers = new Map();
  answer(`https://${HOST}/api/health`, new Response('{"status":"ok"}', { status: 200 }));
  answer(
    `https://www.${HOST}/`,
    new Response(null, { status: 301, headers: { location: `https://${HOST}/` } }),
  );
  answer(METRICS, new Response(metrics(100)));
  expiry = new Date(START.getTime() + 60 * 86_400_000);
  lastSweepAt = new Date(START.getTime() - 30_000);
});

afterEach(() => {
  opened.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('checker', () => {
  it('reports every part healthy with the time of the check', async () => {
    const subject = checker();
    await subject.run();
    const rows = subject.rows();
    expect(rows.map((row) => row.name)).toEqual([
      'Сайт отвечает (/api/health)',
      'Перенаправление с www',
      'Сертификат TLS',
      'База данных: SELECT 1',
      'База данных: quick_check',
      'Litestream',
      'Вход через GitHub',
      'Вход через Google',
      'Последний вход',
      'Очистка ссылок игроков',
    ]);
    expect(rows.filter((row) => row.status !== 'ok').map((row) => row.name)).toEqual([
      'Последний вход',
    ]);
    expect(byName(rows, 'Вход через Google').value).toBe('выключен');
    expect(byName(rows, 'Сертификат TLS').value).toContain('осталось 60 дн.');
    expect(rows.every((row) => row.checkedAt.getTime() === START.getTime())).toBe(true);
  });

  it('marks a failing site, redirect and certificate as problems with a detail', async () => {
    answer(`https://${HOST}/api/health`, new Response('bad gateway', { status: 502 }));
    answer(`https://www.${HOST}/`, new Response(null, { status: 200 }));
    expiry = new Date(START.getTime() + 10 * 86_400_000);
    const subject = checker();
    await subject.run();
    const rows = subject.rows();
    expect(byName(rows, 'Сайт отвечает (/api/health)')).toMatchObject({
      status: 'problem',
      detail: 'ожидался ответ 200',
    });
    expect(byName(rows, 'Перенаправление с www')).toMatchObject({
      status: 'problem',
      detail: `ожидалось перенаправление 301/308 на https://${HOST}/`,
    });
    expect(byName(rows, 'Сертификат TLS')).toMatchObject({
      status: 'problem',
      detail: 'меньше 14 дней',
    });

    answer(`https://${HOST}/api/health`, new Error('fetch failed'));
    expiry = new Error('certificate has expired');
    await subject.run();
    expect(byName(subject.rows(), 'Сайт отвечает (/api/health)')).toMatchObject({
      status: 'problem',
      detail: 'fetch failed',
    });
    expect(byName(subject.rows(), 'Сертификат TLS').detail).toBe('certificate has expired');
  });

  it('has no data for the external checks without BETTER_AUTH_URL', async () => {
    const subject = checker({ env: { ...env, betterAuthUrl: undefined } });
    await subject.run();
    for (const name of ['Сайт отвечает (/api/health)', 'Перенаправление с www', 'Сертификат TLS']) {
      expect(byName(subject.rows(), name)).toMatchObject({
        status: 'unknown',
        detail: 'BETTER_AUTH_URL не задан',
      });
    }
  });

  it('turns Litestream red when sync errors grow or syncs stop', async () => {
    const subject = checker();
    await subject.run();
    expect(byName(subject.rows(), 'Litestream').status).toBe('ok');

    advance(MINUTE);
    answer(METRICS, new Response(metrics(160, 0, 2)));
    await subject.run();
    expect(byName(subject.rows(), 'Litestream')).toMatchObject({
      status: 'problem',
      detail: 'ошибок с прошлой проверки: +2',
    });

    advance(MINUTE);
    await subject.run();
    expect(byName(subject.rows(), 'Litestream').status).toBe('ok');

    advance(5 * MINUTE + 1);
    await subject.run();
    expect(byName(subject.rows(), 'Litestream')).toMatchObject({
      status: 'problem',
      detail: 'нет синхронизации больше 5 мин',
    });
  });

  it('has no Litestream data until the metrics answer, then red once syncs are 5 min old', async () => {
    answer(METRICS, new Error('connect ECONNREFUSED'));
    const subject = checker();
    await subject.run();
    expect(byName(subject.rows(), 'Litestream')).toMatchObject({
      status: 'unknown',
      detail: 'метрики недоступны: connect ECONNREFUSED',
    });

    answer(METRICS, new Response(metrics(100)));
    await subject.run();
    answer(METRICS, new Error('connect ECONNREFUSED'));
    advance(MINUTE);
    await subject.run();
    expect(byName(subject.rows(), 'Litestream').status).toBe('unknown');
    advance(5 * MINUTE);
    await subject.run();
    expect(byName(subject.rows(), 'Litestream')).toMatchObject({
      status: 'problem',
      detail: 'метрики недоступны и нет синхронизации больше 5 мин',
    });
  });

  it('flags a missing GitHub sign-in and a stale sweeper', async () => {
    lastSweepAt = new Date(START.getTime() - 3 * MINUTE - 1);
    const subject = checker({ env: { ...env, github: undefined } });
    await subject.run();
    expect(byName(subject.rows(), 'Вход через GitHub').status).toBe('problem');
    expect(byName(subject.rows(), 'Очистка ссылок игроков')).toMatchObject({
      status: 'problem',
      detail: 'больше 3 мин назад',
    });
    lastSweepAt = undefined;
    await subject.run();
    expect(byName(subject.rows(), 'Очистка ссылок игроков').status).toBe('unknown');
  });

  it('runs quick_check at most every 10 minutes', async () => {
    const subject = checker();
    await subject.run();
    advance(9 * MINUTE);
    await subject.run();
    expect(byName(subject.rows(), 'База данных: quick_check').checkedAt).toEqual(START);
    expect(byName(subject.rows(), 'База данных: SELECT 1').checkedAt).toEqual(clock);
    advance(MINUTE);
    await subject.run();
    expect(byName(subject.rows(), 'База данных: quick_check').checkedAt).toEqual(clock);
  });
});
