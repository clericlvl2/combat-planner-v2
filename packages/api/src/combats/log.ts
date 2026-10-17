import type { ActionId, Combat, CombatId, LogEntry } from '@combat-planner/domain';
import { undoSummary } from '@combat-planner/domain';
import { and, asc, eq, max } from 'drizzle-orm';
import type { DmCombat } from '../client.ts';
import { actionLog } from '../db/schema.ts';
import type { Executor } from './store.ts';

export const nextSeq = (db: Executor, combatId: CombatId): number =>
  (db
    .select({ last: max(actionLog.seq) })
    .from(actionLog)
    .where(eq(actionLog.combatId, combatId))
    .get()?.last ?? 0) + 1;

export const findLogEntry = (
  db: Executor,
  combatId: CombatId,
  actionId: ActionId,
): LogEntry | undefined =>
  db
    .select({
      action: actionLog.action,
      author: actionLog.author,
      at: actionLog.at,
      patch: actionLog.patch,
      undoneBy: actionLog.undoneBy,
    })
    .from(actionLog)
    .where(and(eq(actionLog.combatId, combatId), eq(actionLog.actionId, actionId)))
    .get();

export const loadLog = (db: Executor, combatId: CombatId): LogEntry[] =>
  db
    .select({
      action: actionLog.action,
      author: actionLog.author,
      at: actionLog.at,
      patch: actionLog.patch,
      undoneBy: actionLog.undoneBy,
    })
    .from(actionLog)
    .where(eq(actionLog.combatId, combatId))
    .orderBy(asc(actionLog.seq))
    .all();

export const appendLogEntry = (
  db: Executor,
  combatId: CombatId,
  seq: number,
  entry: LogEntry,
): void => {
  db.insert(actionLog)
    .values({
      combatId,
      seq,
      actionId: entry.action.id,
      action: entry.action,
      author: entry.author,
      at: entry.at,
      patch: entry.patch,
      undoneBy: entry.undoneBy,
    })
    .run();
};

export const markUndone = (
  db: Executor,
  combatId: CombatId,
  actionId: ActionId,
  undoneBy: ActionId,
): void => {
  db.update(actionLog)
    .set({ undoneBy })
    .where(and(eq(actionLog.combatId, combatId), eq(actionLog.actionId, actionId)))
    .run();
};

export const dmDocument = (db: Executor, combat: Combat): DmCombat => ({
  ...combat,
  undo: undoSummary(combat, loadLog(db, combat.id)),
});
