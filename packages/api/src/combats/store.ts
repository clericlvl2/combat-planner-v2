import type { Combat, CombatId } from '@combat-planner/domain';
import { and, count, desc, eq } from 'drizzle-orm';
import type { CombatSummary } from '../client.ts';
import type { AppDatabase } from '../db/index.ts';
import { combats } from '../db/schema.ts';

export type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];
export type Executor = AppDatabase | Transaction;

export interface CombatRow {
  ownerId: string;
  document: Combat;
}

export const NOT_FOUND = { code: 'notFound', message: 'Combat not found' } as const;

export const nowIso = (): string => new Date().toISOString();

export const summaryOf = (combat: Combat): CombatSummary => ({
  id: combat.id,
  title: combat.title,
  description: combat.description,
  color: combat.color,
  status: combat.status,
  unitCount: combat.units.length,
  lastPlayedAt: combat.lastPlayedAt,
  updatedAt: combat.updatedAt,
});

export const findCombatRow = (db: Executor, combatId: CombatId): CombatRow | undefined =>
  db
    .select({ ownerId: combats.ownerId, document: combats.document })
    .from(combats)
    .where(eq(combats.id, combatId))
    .get();

export const findOwnCombat = (
  db: Executor,
  ownerId: string,
  combatId: CombatId,
): Combat | undefined =>
  db
    .select({ document: combats.document })
    .from(combats)
    .where(and(eq(combats.id, combatId), eq(combats.ownerId, ownerId)))
    .get()?.document;

export const listOwnCombats = (db: Executor, ownerId: string): Combat[] =>
  db
    .select({ document: combats.document })
    .from(combats)
    .where(eq(combats.ownerId, ownerId))
    .orderBy(desc(combats.createdAt))
    .all()
    .map((row) => row.document);

export const countOwnCombats = (db: Executor, ownerId: string): number =>
  db.select({ total: count() }).from(combats).where(eq(combats.ownerId, ownerId)).get()?.total ?? 0;

export const insertCombat = (db: Executor, ownerId: string, combat: Combat): void => {
  db.insert(combats)
    .values({
      id: combat.id,
      ownerId,
      document: combat,
      version: combat.version,
      title: combat.title,
      status: combat.status,
      color: combat.color,
      lastPlayedAt: combat.lastPlayedAt,
      createdAt: combat.createdAt,
      updatedAt: combat.updatedAt,
    })
    .run();
};

export const saveCombat = (db: Executor, combat: Combat): void => {
  db.update(combats)
    .set({
      document: combat,
      version: combat.version,
      title: combat.title,
      status: combat.status,
      color: combat.color,
      lastPlayedAt: combat.lastPlayedAt,
      updatedAt: combat.updatedAt,
    })
    .where(eq(combats.id, combat.id))
    .run();
};

export const deleteCombat = (db: Executor, combatId: CombatId): void => {
  db.delete(combats).where(eq(combats.id, combatId)).run();
};
