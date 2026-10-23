import { count, desc, gt, gte, lt, or, sql } from 'drizzle-orm';
import type { Executor } from '../combats/store.ts';
import { combats, dailyStats, session, user } from '../db/schema.ts';
import { dayOf, dayStart, shiftDay } from './day.ts';

export const STATS_RETENTION_DAYS = 30;
export const USAGE_DAYS = 14;

export interface DayUsage {
  day: string;
  newDms: number;
  activeDms: number;
  combatsChanged: number;
  playerJoins: number;
  actions: number;
}

export interface UsageTotals {
  dms: number;
  sessionsAlive: number;
  combats: number;
}

export interface Usage {
  totals: UsageTotals;
  days: DayUsage[];
}

type Counter = 'playerJoins' | 'actions';

const increment =
  (counter: Counter) =>
  (db: Executor, now: string): void => {
    db.insert(dailyStats)
      .values({ day: dayOf(new Date(now)), [counter]: 1 })
      .onConflictDoUpdate({
        target: dailyStats.day,
        set: { [counter]: sql`${dailyStats[counter]} + 1` },
      })
      .run();
  };

export const countPlayerJoin = increment('playerJoins');

export const countAction = increment('actions');

export const deleteOldStats = (db: Executor, now: string): void => {
  const oldest = shiftDay(dayOf(new Date(now)), -STATS_RETENTION_DAYS);
  db.delete(dailyStats).where(lt(dailyStats.day, oldest)).run();
};

export const lastSessionCreatedAt = (db: Executor): Date | undefined =>
  db
    .select({ createdAt: session.createdAt })
    .from(session)
    .orderBy(desc(session.createdAt))
    .limit(1)
    .get()?.createdAt;

const total = (db: Executor, table: typeof user | typeof combats): number =>
  db.select({ value: count() }).from(table).get()?.value ?? 0;

const readTotals = (db: Executor, now: Date): UsageTotals => ({
  dms: total(db, user),
  sessionsAlive:
    db.select({ value: count() }).from(session).where(gt(session.expiresAt, now)).get()?.value ?? 0,
  combats: total(db, combats),
});

interface DayBucket {
  newDms: number;
  activeDms: Set<string>;
  combatsChanged: Set<string>;
  playerJoins: number;
  actions: number;
}

const emptyBucket = (): DayBucket => ({
  newDms: 0,
  activeDms: new Set(),
  combatsChanged: new Set(),
  playerJoins: 0,
  actions: 0,
});

export function readUsage(db: Executor, now: Date, dayCount = USAGE_DAYS): Usage {
  const today = dayOf(now);
  const days = Array.from({ length: dayCount }, (_, index) => shiftDay(today, -index));
  const firstDay = shiftDay(today, 1 - dayCount);
  const since = dayStart(firstDay);
  const buckets = new Map(days.map((day) => [day, emptyBucket()]));
  const bucketAt = (at: Date): DayBucket | undefined => buckets.get(dayOf(at));

  for (const row of db
    .select({ createdAt: user.createdAt })
    .from(user)
    .where(gte(user.createdAt, since))
    .all()) {
    const bucket = bucketAt(row.createdAt);
    if (bucket) bucket.newDms += 1;
  }
  for (const row of db
    .select({ userId: session.userId, createdAt: session.createdAt, updatedAt: session.updatedAt })
    .from(session)
    .where(or(gte(session.createdAt, since), gte(session.updatedAt, since)))
    .all()) {
    bucketAt(row.createdAt)?.activeDms.add(row.userId);
    bucketAt(row.updatedAt)?.activeDms.add(row.userId);
  }
  for (const row of db
    .select({ id: combats.id, updatedAt: combats.updatedAt })
    .from(combats)
    .where(gte(combats.updatedAt, since.toISOString()))
    .all()) {
    bucketAt(new Date(row.updatedAt))?.combatsChanged.add(row.id);
  }
  for (const row of db.select().from(dailyStats).where(gte(dailyStats.day, firstDay)).all()) {
    const bucket = buckets.get(row.day);
    if (!bucket) continue;
    bucket.playerJoins = row.playerJoins;
    bucket.actions = row.actions;
  }

  return {
    totals: readTotals(db, now),
    days: days.map((day) => {
      const bucket = buckets.get(day) ?? emptyBucket();
      return {
        day,
        newDms: bucket.newDms,
        activeDms: bucket.activeDms.size,
        combatsChanged: bucket.combatsChanged.size,
        playerJoins: bucket.playerJoins,
        actions: bucket.actions,
      };
    }),
  };
}
