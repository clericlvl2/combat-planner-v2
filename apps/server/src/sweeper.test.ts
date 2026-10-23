import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createApiApp,
  openDatabase,
  playerCredentialsSchema,
  playerLinkSchema,
  runMigrations,
  subscribe,
} from '@combat-planner/api';
import type { ApiAppEnv, ApiEvent, DmCombat, PlayerCredentials } from '@combat-planner/api';
import { SHARING_TIMEOUTS } from '@combat-planner/domain';
import { Hono } from 'hono';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { sweep } from './sweeper.ts';
import { PRODUCTION_TIMERS, TEST_TIMERS, sharingTimers } from './timers.ts';

const DM_ID = 'dm-sweeper';
const COMBAT_ID = '01ARZ3NDEKTSV4RRFFQ69G5SW0';
const HERO_ID = '01ARZ3NDEKTSV4RRFFQ69G5SW1';
const SECOND_HERO_ID = '01ARZ3NDEKTSV4RRFFQ69G5SW2';
const OTHER_COMBAT_ID = '01ARZ3NDEKTSV4RRFFQ69G5SW3';
const OTHER_DM_ID = 'dm-sweeper-other';
const MINUTE = 60_000;

const directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-sweeper-'));
const opened = openDatabase(path.join(directory, 'sweeper.db'));
runMigrations(opened.db);
const { db } = opened;
const sqlite = db.$client;

const api = createApiApp({
  db,
  env: {
    betterAuthSecret: 'test-secret',
    betterAuthUrl: 'http://localhost:3000',
    linkSecret: 'test-link-secret',
  },
  rateLimit: false,
});
const asDm = new Hono<ApiAppEnv>()
  .use(async (c, next) => {
    c.set('userId', DM_ID);
    await next();
  })
  .route('/', api);

let actionIndex = 0;
const actionId = () => `01ARZ3NDEKTSV4RRFFQ69G5T${String(actionIndex++).padStart(2, '0')}`;

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const dmCombat = async (): Promise<DmCombat> =>
  (await (await asDm.request(`/combats/${COMBAT_ID}`)).json()) as DmCombat;

const dmAction = async (body: Record<string, unknown>) => {
  const { version } = await dmCombat();
  const response = await asDm.request(
    `/combats/${COMBAT_ID}/actions`,
    json({ id: actionId(), version, ...body }),
  );
  expect(response.status).toBe(200);
};

const shareToken = async (): Promise<string> =>
  playerLinkSchema.parse(await (await asDm.request(`/combats/${COMBAT_ID}/link`)).json()).token;

const join = async (token: string): Promise<PlayerCredentials> =>
  playerCredentialsSchema.parse(
    await (
      await api.request(`/play/${COMBAT_ID}/join?t=${encodeURIComponent(token)}`, {
        method: 'POST',
      })
    ).json(),
  );

const playerHeaders = ({ playerId, playerKey }: PlayerCredentials) => ({
  'X-Player-Id': playerId,
  'X-Player-Key': playerKey,
});

const getPlay = (token: string, credentials: PlayerCredentials) =>
  api.request(`/play/${COMBAT_ID}?t=${encodeURIComponent(token)}`, {
    headers: playerHeaders(credentials),
  });

const playerAction = async (
  token: string,
  credentials: PlayerCredentials,
  body: Record<string, unknown>,
) => {
  const { version } = await dmCombat();
  const init = json({ id: actionId(), version, ...body });
  const response = await api.request(`/play/${COMBAT_ID}/actions?t=${encodeURIComponent(token)}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...playerHeaders(credentials) },
  });
  expect(response.status).toBe(200);
};

const listen = (viewer: { kind: 'dm' } | { kind: 'player'; playerId: string }) => {
  const events: ApiEvent[] = [];
  const unsubscribe = subscribe(COMBAT_ID, { viewer, send: (event) => events.push(event) });
  unsubscribes.push(unsubscribe);
  return events;
};

const unsubscribes: (() => void)[] = [];

const at = (base: number, offset: number): string => new Date(base + offset).toISOString();

const watchingSince = (playerId: string): string | null | undefined =>
  (
    sqlite
      .prepare('select watchingSince from players where combatId = ? and playerId = ?')
      .get(COMBAT_ID, playerId) as { watchingSince: string | null } | undefined
  )?.watchingSince;

const linkColumns = (combatId = COMBAT_ID) =>
  sqlite.prepare('select linkShared, orphanedAt from combats where id = ?').get(combatId) as {
    linkShared: number;
    orphanedAt: string | null;
  };

const addSession = (createdAt: number) => {
  sqlite
    .prepare(
      'insert into session (id, expiresAt, token, createdAt, updatedAt, userId) values (?, ?, ?, ?, ?, ?)',
    )
    .run(
      `session-${createdAt}`,
      createdAt + 7 * 24 * 60 * MINUTE,
      `token-${createdAt}`,
      createdAt,
      createdAt,
      DM_ID,
    );
};

const sweepAt = (now: string) => sweep(db, now, SHARING_TIMEOUTS);

beforeEach(async () => {
  const now = Date.now();
  sqlite
    .prepare('insert into user (id, name, email, createdAt, updatedAt) values (?, ?, ?, ?, ?)')
    .run(DM_ID, 'Dana', 'dana@example.com', now, now);
  const created = await asDm.request(
    '/combats',
    json({ id: COMBAT_ID, title: 'Ambush', description: '', color: 1 }),
  );
  expect(created.status).toBe(200);
  for (const [unitId, name] of [
    [HERO_ID, 'Ada'],
    [SECOND_HERO_ID, 'Bram'],
  ] as const) {
    await dmAction({
      type: 'addUnit',
      unitId,
      roll: 10,
      name,
      role: 'hero',
      maxHp: 20,
      ac: 15,
      pd: 12,
      md: 11,
      initiativeBonus: 2,
      tempHp: 0,
      note: '',
    });
  }
});

afterEach(() => {
  for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
  sqlite.prepare('delete from user where id in (?, ?)').run(DM_ID, OTHER_DM_ID);
  vi.restoreAllMocks();
});

afterAll(() => {
  opened.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('sharingTimers', () => {
  it('uses the production timers when the variable is unset or not 1', () => {
    expect(sharingTimers(undefined, undefined)).toBe(PRODUCTION_TIMERS);
    expect(sharingTimers('0', 'development')).toBe(PRODUCTION_TIMERS);
    expect(PRODUCTION_TIMERS).toEqual({ sweepIntervalMs: 60_000, timeouts: SHARING_TIMEOUTS });
  });

  it('shortens every timer to seconds when the variable is 1', () => {
    expect(sharingTimers('1', undefined)).toBe(TEST_TIMERS);
    expect(sharingTimers('1', 'development')).toBe(TEST_TIMERS);
    expect(TEST_TIMERS.sweepIntervalMs).toBe(1_000);
    for (const value of Object.values(TEST_TIMERS.timeouts)) expect(value).toBeLessThan(MINUTE);
  });

  it('never shortens the timers in production', () => {
    expect(sharingTimers('1', 'production')).toBe(PRODUCTION_TIMERS);
  });
});

describe('link sweep', () => {
  it('leaves a link nobody shared alone', async () => {
    sweepAt(at(Date.now(), 60 * MINUTE));
    expect(linkColumns()).toEqual({ linkShared: 0, orphanedAt: null });
  });

  it('orphans a link without an owner session and makes it live again on sign-in before 15 minutes', async () => {
    await shareToken();
    const base = Date.now();
    sweepAt(at(base, 0));
    expect(linkColumns()).toEqual({ linkShared: 1, orphanedAt: at(base, 0) });
    sweepAt(at(base, 15 * MINUTE - 1000));
    expect(linkColumns()).toEqual({ linkShared: 1, orphanedAt: at(base, 0) });
    addSession(base + 14 * MINUTE);
    sweepAt(at(base, 15 * MINUTE + 30_000));
    expect(linkColumns()).toEqual({ linkShared: 1, orphanedAt: null });
  });

  it('keeps the link of an owner who signed in before the sweep that would turn it off', async () => {
    await shareToken();
    const base = Date.now();
    sweepAt(at(base, 0));
    addSession(base + 15 * MINUTE + 10_000);
    sweepAt(at(base, 15 * MINUTE + 30_000));
    expect(linkColumns()).toEqual({ linkShared: 1, orphanedAt: null });
  });

  it('makes an orphaned link live when the owner opens the share sheet', async () => {
    await shareToken();
    const base = Date.now();
    sweepAt(at(base, 0));
    expect(linkColumns()).toEqual({ linkShared: 1, orphanedAt: at(base, 0) });
    await shareToken();
    expect(linkColumns()).toEqual({ linkShared: 1, orphanedAt: null });
  });

  it('turns the link off 15 minutes after the owner signed out everywhere, once', async () => {
    const token = await shareToken();
    const player = await join(token);
    await playerAction(token, player, { type: 'claimUnit', unitId: HERO_ID, displayName: 'Ada' });
    const playerEvents = listen({ kind: 'player', playerId: player.playerId });
    const dmEvents = listen({ kind: 'dm' });
    const before = await dmCombat();
    const base = Date.now();
    sweepAt(at(base, 0));
    expect(playerEvents).toEqual([]);
    sweepAt(at(base, 15 * MINUTE));
    expect(playerEvents).toEqual([{ type: 'linkRevoked' }]);
    const after = await dmCombat();
    expect(after.linkGeneration).toBe(before.linkGeneration + 1);
    expect(after.units.every((unit) => unit.claimedBy === null)).toBe(true);
    expect(dmEvents.at(-1)).toMatchObject({ type: 'document', version: after.version });
    expect(watchingSince(player.playerId)).toBeUndefined();
    expect(linkColumns()).toEqual({ linkShared: 0, orphanedAt: null });
    expect((await getPlay(token, player)).status).toBe(410);
    sweepAt(at(base, 60 * MINUTE));
    expect((await dmCombat()).version).toBe(after.version);
  });
});

describe('player sweep', () => {
  it('drops a player who watched for 15 minutes and takes their key', async () => {
    addSession(Date.now());
    const token = await shareToken();
    const player = await join(token);
    const events = listen({ kind: 'player', playerId: player.playerId });
    const dmEvents = listen({ kind: 'dm' });
    const since = Date.parse(watchingSince(player.playerId) ?? '');
    sweepAt(at(since, 15 * MINUTE - 1000));
    expect(events).toEqual([]);
    sweepAt(at(since, 15 * MINUTE));
    expect(events).toEqual([{ type: 'dropped' }]);
    expect(dmEvents).toEqual([]);
    expect(watchingSince(player.playerId)).toBeUndefined();
    expect((await getPlay(token, player)).status).toBe(401);
  });

  it('removes the name of a player who released their hero and watched for 15 minutes', async () => {
    addSession(Date.now());
    const token = await shareToken();
    const player = await join(token);
    await playerAction(token, player, { type: 'claimUnit', unitId: HERO_ID, displayName: 'Ada' });
    expect(watchingSince(player.playerId)).toBeNull();
    await playerAction(token, player, { type: 'releaseUnit', unitId: HERO_ID });
    const before = await dmCombat();
    expect(before.players[player.playerId]).toBe('Ada');
    const dmEvents = listen({ kind: 'dm' });
    const since = Date.parse(watchingSince(player.playerId) ?? '');
    sweepAt(at(since, 15 * MINUTE));
    const after = await dmCombat();
    expect(after.players[player.playerId]).toBeUndefined();
    expect(after.version).toBe(before.version + 1);
    expect(dmEvents).toEqual([
      expect.objectContaining({ type: 'document', version: after.version }),
      { type: 'playerLeft', name: 'Ada' },
    ]);
  });

  it('keeps a playing player and drops only their idle stream after 2 hours', async () => {
    addSession(Date.now());
    const token = await shareToken();
    const player = await join(token);
    await playerAction(token, player, { type: 'claimUnit', unitId: HERO_ID, displayName: 'Ada' });
    const playerEvents = listen({ kind: 'player', playerId: player.playerId });
    const dmEvents = listen({ kind: 'dm' });
    const base = Date.now();
    sweepAt(at(base, 2 * 60 * MINUTE - 1000));
    expect(playerEvents).toEqual([]);
    sweepAt(at(base, 2 * 60 * MINUTE + 1000));
    expect(playerEvents).toEqual([{ type: 'dropped' }]);
    expect(dmEvents).toEqual([]);
    expect(watchingSince(player.playerId)).toBeNull();
    expect((await getPlay(token, player)).status).toBe(200);
  });
});

describe('sweep with a broken combat', () => {
  const createOtherCombat = async () => {
    const created = await asDm.request(
      '/combats',
      json({ id: OTHER_COMBAT_ID, title: 'Siege', description: '', color: 2 }),
    );
    expect(created.status).toBe(200);
    const shared = await asDm.request(`/combats/${OTHER_COMBAT_ID}/link`);
    expect(shared.status).toBe(200);
  };

  const breakCombat = (combatId: string) => {
    sqlite.prepare("update combats set document = '{' where id = ?").run(combatId);
  };

  it('turns off the links of the other combats', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await shareToken();
    await createOtherCombat();
    const base = Date.now();
    sweepAt(at(base, 0));
    breakCombat(COMBAT_ID);
    sweepAt(at(base, 15 * MINUTE));
    expect(linkColumns(OTHER_COMBAT_ID)).toEqual({ linkShared: 0, orphanedAt: null });
    expect(linkColumns(COMBAT_ID)).toEqual({ linkShared: 1, orphanedAt: at(base, 0) });
    expect(errors).toHaveBeenCalledTimes(1);
  });

  it('still drops the watching players of the other combats', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await createOtherCombat();
    const now = Date.now();
    sqlite
      .prepare('insert into user (id, name, email, createdAt, updatedAt) values (?, ?, ?, ?, ?)')
      .run(OTHER_DM_ID, 'Olga', 'olga@example.com', now, now);
    sqlite.prepare('update combats set ownerId = ? where id = ?').run(OTHER_DM_ID, OTHER_COMBAT_ID);
    sqlite
      .prepare(
        'insert into players (combatId, playerId, displayName, watchingSince) values (?, ?, ?, ?)',
      )
      .run(OTHER_COMBAT_ID, 'broken-player', '', at(now, 0));
    addSession(now);
    const token = await shareToken();
    const player = await join(token);
    const events = listen({ kind: 'player', playerId: player.playerId });
    const base = Date.now();
    sweepAt(at(base, 0));
    breakCombat(OTHER_COMBAT_ID);
    sweepAt(at(base, 15 * MINUTE));
    expect(events).toEqual([{ type: 'dropped' }]);
    expect(watchingSince(player.playerId)).toBeUndefined();
    expect(errors).toHaveBeenCalledTimes(2);
  });
});

describe('daily stats sweep', () => {
  it('deletes the counters of days older than 30 days', () => {
    sqlite
      .prepare('insert into daily_stats (day, player_joins, actions) values (?, 1, 1), (?, 1, 1)')
      .run('2026-09-15', '2026-09-16');
    sweep(db, '2026-10-16T12:00:00.000Z', SHARING_TIMEOUTS);
    const days = sqlite
      .prepare("select day from daily_stats where day < '2026-10-01' order by day")
      .pluck()
      .all();
    expect(days).toEqual(['2026-09-16']);
  });
});
