import type { ActionId, Combat, CombatId, LogEntry } from '@combat-planner/domain';
import { LIMITS, undoSummary } from '@combat-planner/domain';
import { and, desc, eq, lt, max, ne, sql } from 'drizzle-orm';
import type { DmCombat } from '../client.ts';
import { actionLog } from '../db/schema.ts';
import type { Executor } from './store.ts';

export const nextSeq = (db: Executor, combatId: CombatId): number =>
  (db
    .select({ last: max(actionLog.seq) })
    .from(actionLog)
    .where(eq(actionLog.combatId, combatId))
    .get()?.last ?? 0) + 1;

const entryColumns = {
  action: actionLog.action,
  author: actionLog.author,
  at: actionLog.at,
  patch: actionLog.patch,
  undoneBy: actionLog.undoneBy,
};

const LOG_PAGE = LIMITS.undoDepth + 1;

export const findLogEntry = (
  db: Executor,
  combatId: CombatId,
  actionId: ActionId,
): LogEntry | undefined =>
  db
    .select(entryColumns)
    .from(actionLog)
    .where(and(eq(actionLog.combatId, combatId), eq(actionLog.actionId, actionId)))
    .get();

function* newestFirst(db: Executor, combatId: CombatId): Generator<LogEntry> {
  for (let read = 0; ; read += LOG_PAGE) {
    const page = db
      .select(entryColumns)
      .from(actionLog)
      .where(eq(actionLog.combatId, combatId))
      .orderBy(desc(actionLog.seq))
      .limit(LOG_PAGE)
      .offset(read)
      .all();
    yield* page;
    if (page.length < LOG_PAGE) return;
  }
}

export const undoWindow = (db: Executor, combatId: CombatId): LogEntry[] => {
  const window: LogEntry[] = [];
  let depth = 0;
  for (const entry of newestFirst(db, combatId)) {
    window.push(entry);
    if (entry.action.type === 'undo') continue;
    depth += 1;
    if (entry.patch === null || entry.undoneBy === null || depth > LIMITS.undoDepth) break;
  }
  return window.toReversed();
};

const pruneLog = (db: Executor, combatId: CombatId): void => {
  const oldestReachable = db
    .select({ seq: actionLog.seq })
    .from(actionLog)
    .where(
      and(
        eq(actionLog.combatId, combatId),
        ne(sql`json_extract(${actionLog.action}, '$.type')`, 'undo'),
      ),
    )
    .orderBy(desc(actionLog.seq))
    .limit(1)
    .offset(LIMITS.undoDepth)
    .get();
  if (!oldestReachable) return;
  db.delete(actionLog)
    .where(and(eq(actionLog.combatId, combatId), lt(actionLog.seq, oldestReachable.seq)))
    .run();
};

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
  pruneLog(db, combatId);
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
  undo: undoSummary(combat, undoWindow(db, combat.id)),
});
