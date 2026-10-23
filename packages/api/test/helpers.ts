import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { UnitId } from '@combat-planner/domain';
import { Hono } from 'hono';
import { createApiApp } from '../src/app.ts';
import type { ApiAppDeps, ApiAppEnv, AppType } from '../src/app.ts';
import type { DmCombat } from '../src/client.ts';
import { openDatabase } from '../src/db/index.ts';
import type { AppDatabase } from '../src/db/index.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { user } from '../src/db/schema.ts';
import type { ApiEnv } from '../src/env.ts';

export const env: ApiEnv = {
  betterAuthSecret: 'test-secret',
  betterAuthUrl: 'http://localhost:3000',
  linkSecret: 'test-link-secret',
};

export const DM = 'dm-1';
export const OTHER_DM = 'dm-2';
export const NOW = '2026-10-16T12:00:00.000Z';
export const COMBAT_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
export const PLAYER_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
export const HERO_ID = '01ARZ3NDEKTSV4RRFFQ69G5FB0';
export const ENEMY_ID = '01ARZ3NDEKTSV4RRFFQ69G5FB1';

export interface TestApp {
  app: AppType;
  db: AppDatabase;
  close(): void;
}

export interface TestAppOptions {
  auth?: ApiAppDeps['auth'];
  env?: Partial<ApiEnv>;
  rateLimit?: boolean;
}

export function createTestApp({
  auth,
  env: overrides = {},
  rateLimit,
}: TestAppOptions = {}): TestApp {
  const directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-api-'));
  const opened = openDatabase(path.join(directory, 'test.db'));
  runMigrations(opened.db);
  const now = new Date(NOW);
  for (const id of [DM, OTHER_DM]) {
    opened.db
      .insert(user)
      .values({ id, name: id, email: `${id}@example.com`, createdAt: now, updatedAt: now })
      .run();
  }
  return {
    app: createApiApp({ db: opened.db, env: { ...env, ...overrides }, auth, rateLimit }),
    db: opened.db,
    close: () => {
      opened.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

export const withUser = (app: AppType, userId: string) =>
  new Hono<ApiAppEnv>()
    .use(async (c, next) => {
      c.set('userId', userId);
      await next();
    })
    .route('/', app);

export type Requester = ReturnType<typeof withUser>;

export const call = async (
  app: Requester,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  route: string,
  body?: unknown,
): Promise<Response> =>
  app.request(route, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const combatInput = (id = COMBAT_ID) => ({
  id,
  title: 'Goblin ambush',
  description: 'Road to Shadowfall',
  color: 3,
});

export const unitForm = (name: string, role: 'hero' | 'enemy' | 'ally') => ({
  name,
  role,
  maxHp: 20,
  ac: 15,
  pd: 12,
  md: 11,
  initiativeBonus: 2,
  tempHp: 0,
  note: '',
});

export const addUnitAction = (
  id: string,
  version: number,
  unitId: UnitId,
  name: string,
  role: 'hero' | 'enemy' | 'ally',
) => ({
  id,
  version,
  type: 'addUnit' as const,
  unitId,
  roll: 10,
  ...unitForm(name, role),
});

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const ulidAt = (index: number): string => {
  const suffix = `${CROCKFORD[Math.floor(index / 32)]}${CROCKFORD[index % 32]}`;
  return `01ARZ3NDEKTSV4RRFFQ69G5F${suffix}`;
};

export const fetchCombat = async (app: Requester, id = COMBAT_ID): Promise<DmCombat> => {
  const response = await call(app, 'GET', `/combats/${id}`);
  return (await response.json()) as DmCombat;
};

export interface Browser {
  request(route: string, init?: RequestInit): Promise<Response>;
}

export const createBrowser = (app: { request: AppType['request'] }): Browser => {
  const cookies = new Map<string, string>();
  return {
    request: async (route, init = {}) => {
      const headers = new Headers(init.headers);
      if (cookies.size > 0) {
        headers.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
      }
      const response = await app.request(route, { ...init, headers });
      for (const cookie of response.headers.getSetCookie()) {
        const [pair] = cookie.split(';');
        const separator = pair?.indexOf('=') ?? -1;
        if (!pair || separator < 0) continue;
        const name = pair.slice(0, separator);
        const value = pair.slice(separator + 1);
        if (value === '') cookies.delete(name);
        else cookies.set(name, value);
      }
      return response;
    },
  };
};

export const browse = (
  browser: Browser,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  route: string,
  body?: unknown,
): Promise<Response> =>
  browser.request(route, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const signUp = async (
  browser: Browser,
  email: string,
  name = 'Dungeon Master',
  password = 'correct horse battery',
): Promise<Response> => browse(browser, 'POST', '/auth/sign-up/email', { name, email, password });
