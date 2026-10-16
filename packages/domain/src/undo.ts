import type { UndoAction } from './actions.ts';
import { DomainError } from './errors.ts';
import type { Applied } from './reduce.ts';
import type { Combat } from './types.ts';

export const applyUndo = (combat: Combat, action: UndoAction, now: string): Applied | DomainError =>
  new DomainError('invalid', `Undo is not available yet (${combat.id}, ${action.id}, ${now})`);
