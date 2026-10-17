import { ACTION_TYPES } from '@combat-planner/domain';
import type { Action, Condition } from '@combat-planner/domain';
import { createInstance } from 'i18next';
import { describe, expect, it } from 'vite-plus/test';
import en from '../../src/i18n/en/CombatScreen.json' with { type: 'json' };
import ru from '../../src/i18n/ru/CombatScreen.json' with { type: 'json' };
import { isUndoable, undoLabel } from '../../src/screens/CombatScreen/undoLabel.ts';
import type { UndoableAction } from '../../src/screens/CombatScreen/undoLabel.ts';

const i18n = createInstance();
await i18n.init({
  lng: 'en',
  resources: { en: { CombatScreen: en }, ru: { CombatScreen: ru } },
  defaultNS: 'CombatScreen',
  interpolation: { escapeValue: false },
});

const ID = '01JC000000000000000000ACT1';
const UNIT = '01JC00000000000000000000U1';
const base = { id: ID, version: 4 };
const target = { ...base, unitId: UNIT };
const form = {
  name: 'Orc Shaman',
  role: 'enemy',
  maxHp: 30,
  ac: 17,
  pd: 15,
  md: 16,
  initiativeBonus: 2,
  tempHp: 0,
  note: '',
} as const;

const condition = (value: Condition) => `[${value}]`;

const labelOf = (action: Action, lng = 'en') => {
  if (!isUndoable(action)) throw new Error(`${action.type} is not undoable`);
  const t = i18n.getFixedT(lng, 'CombatScreen');
  return undoLabel(action, {
    t: (key, options) => t(key, options),
    unitName: 'Orc Berserker',
    condition,
  });
};

const cases: [UndoableAction, string][] = [
  [{ ...base, type: 'start', rolls: {} }, 'Undid: start of the combat'],
  [{ ...base, type: 'nextTurn' }, 'Undid: next turn'],
  [{ ...base, type: 'editRound', round: 4 }, 'Undid: round set to 4'],
  [{ ...base, type: 'setEscalation', escalation: 3 }, 'Undid: escalation die set to 3'],
  [{ ...base, type: 'restart' }, 'Undid: restart of the combat'],
  [{ ...base, type: 'clear' }, 'Undid: clearing the combat'],
  [{ ...base, ...form, type: 'addUnit', unitId: UNIT, roll: 11 }, 'Undid: Orc Shaman added'],
  [{ ...target, ...form, type: 'editUnit' }, 'Undid: edit of Orc Berserker'],
  [{ ...target, type: 'duplicateUnit', newUnitId: ID }, 'Undid: copy of Orc Berserker'],
  [{ ...target, type: 'removeUnit' }, 'Undid: Orc Berserker removed'],
  [{ ...target, type: 'setDisabled', disabled: true }, 'Undid: Orc Berserker disabled'],
  [{ ...target, type: 'setInitiative', initiative: 17 }, 'Undid: initiative 17 for Orc Berserker'],
  [{ ...target, type: 'rollInitiative', roll: 15 }, 'Undid: initiative roll for Orc Berserker'],
  [{ ...target, type: 'damage', amount: 12 }, 'Undid: 12 damage to Orc Berserker'],
  [{ ...target, type: 'heal', amount: 8 }, 'Undid: 8 healing on Orc Berserker'],
  [{ ...target, type: 'setTempHp', amount: 5 }, 'Undid: 5 temp HP on Orc Berserker'],
  [{ ...target, type: 'setMaxHp', amount: 30 }, 'Undid: max HP 30 on Orc Berserker'],
  [
    { ...target, type: 'toggleCondition', condition: 'weakened' },
    'Undid: [weakened] on Orc Berserker',
  ],
  [{ ...target, type: 'editNote', note: 'Hex' }, 'Undid: note on Orc Berserker'],
];

describe('undoLabel', () => {
  it.each(cases)('labels $type', (action, label) => {
    expect(labelOf(action)).toBe(label);
  });

  it('labels enabling a unit', () => {
    expect(labelOf({ ...target, type: 'setDisabled', disabled: false })).toBe(
      'Undid: Orc Berserker enabled',
    );
  });

  it('labels in the active locale', () => {
    expect(labelOf({ ...target, type: 'damage', amount: 12 }, 'ru')).toBe(
      'Отменено: 12 урона по Orc Berserker',
    );
  });

  it('covers every action type except claim, release and undo', () => {
    const labelled = new Set(cases.map(([action]) => action.type));
    const expected = ACTION_TYPES.filter(
      (type) => type !== 'claimUnit' && type !== 'releaseUnit' && type !== 'undo',
    );
    expect([...labelled].toSorted()).toEqual(expected.toSorted());
  });

  it('treats claim, release and undo as not undoable', () => {
    expect(isUndoable({ ...target, type: 'claimUnit', displayName: 'Mika' })).toBe(false);
    expect(isUndoable({ ...target, type: 'releaseUnit' })).toBe(false);
    expect(isUndoable({ ...base, type: 'undo' })).toBe(false);
    expect(isUndoable({ ...base, type: 'nextTurn' })).toBe(true);
  });
});
