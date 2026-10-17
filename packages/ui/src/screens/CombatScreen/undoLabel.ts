import type { Action, Condition } from '@combat-planner/domain';
import type { Translate } from '../../hooks/toasts.ts';

export type UndoableAction = Exclude<Action, { type: 'claimUnit' | 'releaseUnit' | 'undo' }>;

const notUndoable: ReadonlySet<Action['type']> = new Set(['claimUnit', 'releaseUnit', 'undo']);

export const isUndoable = (action: Action): action is UndoableAction =>
  !notUndoable.has(action.type);

export interface UndoLabelContext {
  t: Translate;
  unitName?: string;
  condition: (condition: Condition) => string;
}

export function undoLabel(
  action: UndoableAction,
  { t, unitName = '', condition }: UndoLabelContext,
): string {
  const name = unitName;
  switch (action.type) {
    case 'start':
      return t('undoStart');
    case 'nextTurn':
      return t('undoNextTurn');
    case 'editRound':
      return t('undoEditRound', { round: action.round });
    case 'setEscalation':
      return t('undoSetEscalation', { value: action.escalation });
    case 'restart':
      return t('undoRestart');
    case 'clear':
      return t('undoClear');
    case 'addUnit':
      return t('undoAddUnit', { name: action.name });
    case 'editUnit':
      return t('undoEditUnit', { name });
    case 'duplicateUnit':
      return t('undoDuplicateUnit', { name });
    case 'removeUnit':
      return t('undoRemoveUnit', { name });
    case 'setDisabled':
      return t(action.disabled ? 'undoDisable' : 'undoEnable', { name });
    case 'setInitiative':
      return t('undoSetInitiative', { name, value: action.initiative });
    case 'rollInitiative':
      return t('undoRollInitiative', { name });
    case 'damage':
      return t('undoDamage', { name, amount: action.amount });
    case 'heal':
      return t('undoHeal', { name, amount: action.amount });
    case 'setTempHp':
      return t('undoSetTempHp', { name, amount: action.amount });
    case 'setMaxHp':
      return t('undoSetMaxHp', { name, amount: action.amount });
    case 'toggleCondition':
      return t('undoToggleCondition', { name, condition: condition(action.condition) });
    case 'editNote':
      return t('undoEditNote', { name });
  }
}
