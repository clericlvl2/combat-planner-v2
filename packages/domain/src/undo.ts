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
}

export interface UndoableEntry extends LogEntry {
  patch: Patch;
}

export interface UndoSummary {
  action: Action;
  unitName: string | null;
}

export interface Undone {
  combat: Combat;
  patch: null;
  undone: ActionId;
}

export const undoTarget = (stack: readonly UndoableEntry[]): UndoableEntry | DomainError =>
  stack.at(-1) ?? new DomainError('blocked', 'Nothing to undo');

export const nextStack = (stack: readonly UndoableEntry[], entry: LogEntry): UndoableEntry[] => {
  if (entry.action.type === 'undo') return stack.slice(0, -1);
  if (entry.patch === null) return [];
  return [...stack, { ...entry, patch: entry.patch }].slice(-LIMITS.undoDepth);
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
  stack: readonly UndoableEntry[],
): Undone | DomainError => {
  const target = undoTarget(stack);
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

const unitNameOf = (combat: Combat, entry: UndoableEntry): string | null => {
  const { action } = entry;
  if (action.type === 'addUnit') return action.name;
  if (!('unitId' in action)) return null;
  const known = [...combat.units, ...(entry.patch.fields.units ?? [])];
  return known.find((unit) => unit.id === action.unitId)?.name ?? null;
};

export const undoSummary = (
  combat: Combat,
  stack: readonly UndoableEntry[],
): UndoSummary | null => {
  const target = undoTarget(stack);
  if (target instanceof DomainError) return null;
  return { action: target.action, unitName: unitNameOf(combat, target) };
};
