import { errorReports } from '../src/db/schema.ts';
import { ERROR_REPORT_LIMITS, scrubErrorFields, scrubSecrets } from '../src/errors/scrub.ts';
import { deleteOldErrors, recordError } from '../src/errors/store.ts';
import { RATE_LIMIT_BUDGETS } from '../src/rate-limit.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  addUnitAction,
  call,
  combatInput,
  createTestApp,
  ulidAt,
  withUser,
} from './helpers.ts';

const DUMMY_TOKEN = 'dummy-link-token';

let opened: TestApp;

const rows = () => opened.db.select().from(errorReports).orderBy(errorReports.id).all();

const report = (body: unknown, ip = '198.51.100.7') =>
  opened.app.request('/errors', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  opened = createTestApp();
});

afterEach(() => {
  vi.restoreAllMocks();
  opened.close();
});

describe('scrubSecrets', () => {
  it('drops the query and fragment of every URL', () => {
    expect(
      scrubSecrets(
        `fetch https://planner.example/combats/01J/play?t=${DUMMY_TOKEN}#top failed, then /combats/01J/play?t=${DUMMY_TOKEN}&x=1 too`,
      ),
    ).toBe('fetch https://planner.example/combats/01J/play failed, then /combats/01J/play too');
    expect(scrubSecrets('at run (https://planner.example/assets/index.js:1:2)')).toBe(
      'at run (https://planner.example/assets/index.js:1:2)',
    );
  });

  it('cuts message, stack, path and version to their limits', () => {
    const scrubbed = scrubErrorFields({
      message: 'm'.repeat(600),
      stack: 's'.repeat(5000),
      path: `/${'p'.repeat(300)}`,
      version: 'v'.repeat(40),
    });
    expect(scrubbed.message).toHaveLength(ERROR_REPORT_LIMITS.message);
    expect(scrubbed.stack).toHaveLength(ERROR_REPORT_LIMITS.stack);
    expect(scrubbed.path).toHaveLength(ERROR_REPORT_LIMITS.path);
    expect(scrubbed.version).toHaveLength(ERROR_REPORT_LIMITS.version);
    expect(ERROR_REPORT_LIMITS).toEqual({ message: 500, stack: 4000, path: 200, version: 32 });
  });
});

describe('POST /errors', () => {
  it('stores a scrubbed client report and answers 204', async () => {
    const response = await report({
      message: `Load failed https://planner.example/combats/01J/play?t=${DUMMY_TOKEN}`,
      stack: `Error: Load failed\n    at https://planner.example/combats/01J/play?t=${DUMMY_TOKEN}`,
      path: `/combats/01J/play?t=${DUMMY_TOKEN}`,
      version: '1.2.3',
    });
    expect(response.status).toBe(204);
    expect(rows()).toEqual([
      {
        id: 1,
        at: expect.any(Number),
        source: 'client',
        message: 'Load failed https://planner.example/combats/01J/play',
        stack: 'Error: Load failed\n    at https://planner.example/combats/01J/play',
        path: '/combats/01J/play',
        version: '1.2.3',
      },
    ]);
    expect(JSON.stringify(rows())).not.toContain(DUMMY_TOKEN);
  });

  it('rejects an invalid body with 400 and stores nothing', async () => {
    expect((await report({ message: '' })).status).toBe(400);
    expect((await report({ stack: 'no message' })).status).toBe(400);
    expect(rows()).toEqual([]);
  });

  it('answers 429 after 10 reports a minute from one address', async () => {
    expect(RATE_LIMIT_BUDGETS.errors).toBe(10);
    for (let index = 0; index < 10; index += 1) {
      expect((await report({ message: `boom ${index}` })).status).toBe(204);
    }
    expect((await report({ message: 'boom 10' })).status).toBe(429);
    expect((await report({ message: 'other address' }, '198.51.100.8')).status).toBe(204);
    expect(rows()).toHaveLength(11);
  });
});

describe('server errors', () => {
  it('stores an unhandled route error with its route pattern and answers a plain 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const dm = withUser(opened.app, DM);
    expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
    opened.db.$client.exec('drop table action_log');
    const response = await call(
      dm,
      'POST',
      `/combats/${COMBAT_ID}/actions`,
      addUnitAction(ulidAt(1), 1, ulidAt(500), 'Hero', 'hero'),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    expect(rows()).toEqual([
      expect.objectContaining({
        source: 'server',
        message: expect.stringContaining('action_log'),
        stack: expect.stringContaining('action_log'),
        path: '/combats/:id/actions',
        version: null,
      }),
    ]);
    expect(console.error).toHaveBeenCalled();
  });

  it('leaves expected errors alone', async () => {
    expect((await call(withUser(opened.app, DM), 'GET', `/combats/${COMBAT_ID}`)).status).toBe(404);
    expect((await opened.app.request('/presets')).status).toBe(401);
    expect(rows()).toEqual([]);
  });
});

describe('error retention', () => {
  const NOW = Date.parse('2026-10-16T12:00:00.000Z');
  const DAY = 86_400_000;

  it('deletes reports older than 14 days', () => {
    for (const [back, message] of [
      [14 * DAY + 1, 'too old'],
      [14 * DAY - 1, 'kept'],
      [0, 'new'],
    ] as const) {
      recordError(opened.db, 'client', { message }, new Date(NOW - back));
    }
    deleteOldErrors(opened.db, new Date(NOW).toISOString());
    expect(rows().map((row) => row.message)).toEqual(['kept', 'new']);
  });

  it('keeps at most the newest 500 reports', () => {
    for (let index = 0; index < 510; index += 1) {
      recordError(opened.db, 'server', { message: `boom ${index}` }, new Date(NOW - 510 + index));
    }
    deleteOldErrors(opened.db, new Date(NOW).toISOString());
    const kept = rows();
    expect(kept).toHaveLength(500);
    expect(kept[0]?.message).toBe('boom 10');
    expect(kept.at(-1)?.message).toBe('boom 509');
  });
});
