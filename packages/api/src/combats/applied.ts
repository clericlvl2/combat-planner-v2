import type { CombatId } from '@combat-planner/domain';
import { LIMITS } from '@combat-planner/domain';
import { and, eq, lte, max } from 'drizzle-orm';
import { appliedActions } from '../db/schema.ts';
import type { Executor } from './store.ts';

export const isApplied = (db: Executor, combatId: CombatId, actionId: string): boolean =>
  db
    .select({ seq: appliedActions.seq })
    .from(appliedActions)
    .where(and(eq(appliedActions.combatId, combatId), eq(appliedActions.actionId, actionId)))
    .get() !== undefined;

export const recordApplied = (db: Executor, combatId: CombatId, actionId: string): void => {
  const seq =
    (db
      .select({ last: max(appliedActions.seq) })
      .from(appliedActions)
      .where(eq(appliedActions.combatId, combatId))
      .get()?.last ?? 0) + 1;
  db.insert(appliedActions).values({ combatId, seq, actionId }).run();
  db.delete(appliedActions)
    .where(
      and(
        eq(appliedActions.combatId, combatId),
        lte(appliedActions.seq, seq - LIMITS.repeatWindow),
      ),
    )
    .run();
};
