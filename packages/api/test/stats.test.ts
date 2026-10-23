import { playerCredentialsSchema, playerLinkSchema } from '../src/client.ts';
import { combats, dailyStats, session, user } from '../src/db/schema.ts';
import { dayOf, dayStart, shiftDay } from '../src/stats/day.ts';
import { deleteOldStats, lastSessionCreatedAt, readUsage } from '../src/stats/store.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  OTHER_DM,
  addUnitAction,
  call,
  combatInput,
  createTestApp,
  ulidAt,
  withUser,
} from './helpers.ts';

let opened: TestApp;

const statsRows = () => opened.db.select().from(dailyStats).orderBy(dailyStats.day).all();

beforeEach(() => {
  opened = createTestApp();
});

afterEach(() => {
  vi.useRealTimers();
  opened.close();
});

describe('Moscow days', () => {
  it('turn at 21:00 UTC', () => {
    expect(dayOf(new Date('2026-10-16T20:59:59Z'))).toBe('2026-10-16');
    expect(dayOf(new Date('2026-10-16T21:00:00Z'))).toBe('2026-10-17');
    expect(dayStart('2026-10-17').toISOString()).toBe('2026-10-16T21:00:00.000Z');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('daily counters', () => {
  it('count new player joins and applied actions per Moscow day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-16T20:59:00Z'));
    const dm = withUser(opened.app, DM);
    expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
    const link = playerLinkSchema.parse(
      await (await call(dm, 'GET', `/combats/${COMBAT_ID}/link`)).json(),
    );
    const join = (headers: Record<string, string> = {}) =>
      opened.app.request(`/play/${COMBAT_ID}/join?t=${encodeURIComponent(link.token)}`, {
        method: 'POST',
        headers,
      });
    const act = async (index: number, version: number) =>
      call(
        dm,
        'POST',
        `/combats/${COMBAT_ID}/actions`,
        addUnitAction(ulidAt(index), version, ulidAt(500 + index), `Hero ${index}`, 'hero'),
      );

    const first = playerCredentialsSchema.parse(await (await join()).json());
    expect((await act(1, 1)).status).toBe(200);
    expect(
      (await join({ 'X-Player-Id': first.playerId, 'X-Player-Key': first.playerKey })).status,
    ).toBe(200);
    expect((await act(2, 1)).status).toBe(409);
    expect(statsRows()).toEqual([{ day: '2026-10-16', playerJoins: 1, actions: 1 }]);

    vi.setSystemTime(new Date('2026-10-16T21:00:30Z'));
    expect((await join()).status).toBe(200);
    expect((await join()).status).toBe(200);
    expect((await act(3, 2)).status).toBe(200);
    expect(statsRows()).toEqual([
      { day: '2026-10-16', playerJoins: 1, actions: 1 },
      { day: '2026-10-17', playerJoins: 2, actions: 1 },
    ]);
  });

  it('keep 30 days and delete older rows', () => {
    const today = '2026-10-16';
    opened.db
      .insert(dailyStats)
      .values(
        [0, 30, 31, 45].map((back) => ({
          day: shiftDay(today, -back),
          playerJoins: 1,
          actions: 1,
        })),
      )
      .run();
    deleteOldStats(opened.db, '2026-10-16T12:00:00.000Z');
    expect(statsRows().map((row) => row.day)).toEqual(['2026-09-16', '2026-10-16']);
  });
});

describe('usage', () => {
  it('counts DMs, sessions, combats and counters per day, newest first', () => {
    const now = new Date('2026-10-16T12:00:00Z');
    const yesterday = new Date('2026-10-15T12:00:00Z');
    const lastMonth = new Date('2026-09-01T12:00:00Z');
    opened.db
      .insert(user)
      .values([
        { id: 'dm-3', name: 'dm-3', email: 'dm-3@example.com', createdAt: yesterday },
        { id: 'dm-4', name: 'dm-4', email: 'dm-4@example.com', createdAt: lastMonth },
      ])
      .run();
    const sessionRow = (id: string, userId: string, createdAt: Date, updatedAt: Date) => ({
      id,
      token: id,
      userId,
      createdAt,
      updatedAt,
      expiresAt: new Date(updatedAt.getTime() + 7 * 86_400_000),
    });
    opened.db
      .insert(session)
      .values([
        sessionRow('s1', DM, now, now),
        sessionRow('s2', DM, yesterday, now),
        sessionRow('s3', OTHER_DM, lastMonth, yesterday),
        sessionRow('s4', 'dm-4', lastMonth, lastMonth),
      ])
      .run();
    const combatRow = (id: string, updatedAt: Date) => ({
      id,
      ownerId: DM,
      document: {} as never,
      version: 1,
      title: id,
      status: 'setup' as const,
      color: 0,
      createdAt: lastMonth.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    opened.db
      .insert(combats)
      .values([combatRow('c1', now), combatRow('c2', yesterday), combatRow('c3', lastMonth)])
      .run();
    opened.db
      .insert(dailyStats)
      .values([
        { day: '2026-10-16', playerJoins: 3, actions: 40 },
        { day: '2026-09-01', playerJoins: 9, actions: 9 },
      ])
      .run();

    const usage = readUsage(opened.db, now);
    expect(usage.totals).toEqual({ dms: 4, sessionsAlive: 3, combats: 3 });
    expect(usage.days).toHaveLength(14);
    expect(usage.days[0]).toEqual({
      day: '2026-10-16',
      newDms: 2,
      activeDms: 1,
      combatsChanged: 1,
      playerJoins: 3,
      actions: 40,
    });
    expect(usage.days[1]).toEqual({
      day: '2026-10-15',
      newDms: 1,
      activeDms: 2,
      combatsChanged: 1,
      playerJoins: 0,
      actions: 0,
    });
    expect(usage.days.at(-1)?.day).toBe('2026-10-03');
    expect(lastSessionCreatedAt(opened.db)).toEqual(now);
  });
});
