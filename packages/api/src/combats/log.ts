import type {
  ActionId,
  Combat,
  CombatId,
  LogEntry,
  PlayerId,
  UndoableEntry,
} from '@combat-planner/domain';
import { LIMITS, leavesStack, nextStack, undoSummary } from '@combat-planner/domain';
import { and, desc, eq, max, notInArray } from 'drizzle-orm';
import type { DmCombat } from '../client.ts';
import { actionLog } from '../db/schema.ts';
import type { Executor } from './store.ts';

const nextSeq = (db: Executor, combatId: CombatId): number =>
  (db
    .select({ last: max(actionLog.seq) })
    .from(actionLog)
    .where(eq(actionLog.combatId, combatId))
    .get()?.last ?? 0) + 1;

export const readStack = (db: Executor, combatId: CombatId): UndoableEntry[] => {
  const rows = db
    .select({
      action: actionLog.action,
      author: actionLog.author,
      at: actionLog.at,
      patch: actionLog.patch,
      undoneBy: actionLog.undoneBy,
    })
    .from(actionLog)
    .where(eq(actionLog.combatId, combatId))
    .orderBy(desc(actionLog.seq))
    .all();
  const stack: UndoableEntry[] = [];
  for (const { patch, undoneBy, ...entry } of rows) {
    if (entry.action.type === 'undo' || leavesStack(entry.action) || undoneBy !== null) continue;
    if (patch === null || stack.length === LIMITS.undoDepth) break;
    stack.push({ ...entry, patch });
  }
  return stack.toReversed();
};

export const recordAction = (
  db: Executor,
  combatId: CombatId,
  stack: readonly UndoableEntry[],
  entry: LogEntry,
): UndoableEntry[] => {
  const next = nextStack(stack, entry);
  if (leavesStack(entry.action)) return next;
  const pushed = next.at(-1)?.action.id === entry.action.id;
  const kept = (pushed ? next.slice(0, -1) : next).map((item) => item.action.id);
  db.delete(actionLog)
    .where(and(eq(actionLog.combatId, combatId), notInArray(actionLog.actionId, kept)))
    .run();
  if (pushed) {
    db.insert(actionLog)
      .values({
        combatId,
        seq: nextSeq(db, combatId),
        actionId: entry.action.id,
        action: entry.action,
        author: entry.author,
        at: entry.at,
        patch: entry.patch,
      })
      .run();
  }
  return next;
};

export type LastActions = Readonly<Record<PlayerId, ActionId>>;

export const lastActionsOf = (db: Executor, combatId: CombatId): LastActions => {
  const rows = db
    .select({ actionId: actionLog.actionId, author: actionLog.author })
    .from(actionLog)
    .where(eq(actionLog.combatId, combatId))
    .orderBy(desc(actionLog.seq))
    .all();
  const last: Record<PlayerId, ActionId> = {};
  for (const { actionId, author } of rows) {
    if (author.kind === 'player' && !(author.playerId in last)) last[author.playerId] = actionId;
  }
  return last;
};

export const dmDocument = (db: Executor, combat: Combat): DmCombat => ({
  ...combat,
  undo: undoSummary(combat, readStack(db, combat.id)),
});
