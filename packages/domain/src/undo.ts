import type { Action, UndoAction } from './actions.ts';
import { DomainError } from './errors.ts';
import type { Patch } from './reduce.ts';
import { LIMITS } from './schemas.ts';
import type { ActionId, Combat, Unit, Viewer } from './types.ts';

export interface LogEntry {
  action: Action;
  author: Viewer;
  at: string;
  patch: Patch | null;
  undoneBy: ActionId | null;
}

export interface UndoableEntry extends LogEntry {
  patch: Patch;
}

export interface Undone {
  combat: Combat;
  patch: null;
  undone: ActionId;
}

const blocked = (message: string) => new DomainError('blocked', message);

const isUndoable = (entry: LogEntry): entry is UndoableEntry => entry.patch !== null;

export const undoTarget = (log: readonly LogEntry[]): UndoableEntry | DomainError => {
  let depth = 0;
  for (const entry of log.toReversed()) {
    if (entry.action.type === 'undo') continue;
    if (!isUndoable(entry)) return blocked(`Undo stops at ${entry.action.type}`);
    depth += 1;
    if (depth > LIMITS.undoDepth) {
      return blocked(`Undo reaches ${LIMITS.undoDepth} steps back from the newest action`);
    }
    if (entry.undoneBy === null) return entry;
  }
  return blocked('Nothing to undo');
};

const revertUnits = (units: readonly Unit[], priors: Patch['units']): Unit[] =>
  units.flatMap((unit) => {
    const prior = priors[unit.id];
    if (prior === undefined) return [unit];
    if (prior === null) return [];
    return [{ ...unit, ...prior }];
  });

export const applyUndo = (
  combat: Combat,
  action: UndoAction,
  now: string,
  log: readonly LogEntry[],
): Undone | DomainError => {
  const target = undoTarget(log);
  if (target instanceof DomainError) return target;
  const reverted: Combat = { ...combat, ...target.patch.fields };
  return {
    combat: {
      ...reverted,
      units: revertUnits(reverted.units, target.patch.units),
      version: combat.version + 1,
      updatedAt: now,
    },
    patch: null,
    undone: target.action.id,
  };
};
