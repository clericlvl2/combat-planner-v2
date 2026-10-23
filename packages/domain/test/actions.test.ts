import { describe, expect, it } from 'vite-plus/test';
import { ACTION_TYPES, actionSchema } from '../src/index.ts';
import { id } from './fixtures.ts';

const base = { id: id(700), version: 3 };
const ok = (action: unknown) => actionSchema.safeParse(action).success;

describe('actionSchema', () => {
  it('lists the 23 action types in brief order', () => {
    expect(ACTION_TYPES).toEqual([
      'start',
      'nextTurn',
      'editRound',
      'setEscalation',
      'restart',
      'clear',
      'undo',
      'addUnit',
      'editUnit',
      'duplicateUnit',
      'removeUnit',
      'setDisabled',
      'setInitiative',
      'rollInitiative',
      'damage',
      'heal',
      'setTempHp',
      'setMaxHp',
      'toggleCondition',
      'editNote',
      'setDefenseMods',
      'claimUnit',
      'releaseUnit',
    ]);
  });

  it('requires a ULID id and a non-negative integer version on every action', () => {
    expect(ok({ type: 'nextTurn', id: 'x', version: 0 })).toBe(false);
    expect(ok({ type: 'nextTurn', id: id(1), version: -1 })).toBe(false);
    expect(ok({ type: 'nextTurn', id: id(1), version: 1.5 })).toBe(false);
    expect(ok({ type: 'nextTurn', id: id(1) })).toBe(false);
    expect(ok({ type: 'nextTurn', ...base })).toBe(true);
  });

  it('bounds each defense modifier to −20…20', () => {
    const mods = (ac: number) => ({
      type: 'setDefenseMods',
      ...base,
      unitId: id(1),
      ac,
      pd: 0,
      md: 0,
    });
    expect(ok(mods(-20))).toBe(true);
    expect(ok(mods(20))).toBe(true);
    expect(ok(mods(21))).toBe(false);
    expect(ok(mods(1.5))).toBe(false);
    expect(ok({ type: 'setDefenseMods', ...base, unitId: id(1), ac: 1 })).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(ok({ type: 'teleport', ...base })).toBe(false);
  });

  it('start carries d20 rolls per unit id', () => {
    expect(ok({ type: 'start', ...base, rolls: {} })).toBe(true);
    expect(ok({ type: 'start', ...base, rolls: { [id(1)]: 1, [id(2)]: 20 } })).toBe(true);
    expect(ok({ type: 'start', ...base, rolls: { [id(1)]: 0 } })).toBe(false);
    expect(ok({ type: 'start', ...base, rolls: { [id(1)]: 21 } })).toBe(false);
    expect(ok({ type: 'start', ...base, rolls: { nope: 5 } })).toBe(false);
    expect(ok({ type: 'start', ...base })).toBe(false);
  });

  it('editRound and setEscalation use the round and die limits', () => {
    expect(ok({ type: 'editRound', ...base, round: 99 })).toBe(true);
    expect(ok({ type: 'editRound', ...base, round: 100 })).toBe(false);
    expect(ok({ type: 'editRound', ...base, round: 0 })).toBe(false);
    expect(ok({ type: 'setEscalation', ...base, escalation: 6 })).toBe(true);
    expect(ok({ type: 'setEscalation', ...base, escalation: 7 })).toBe(false);
  });

  it('restart, clear and undo carry no payload', () => {
    expect(ok({ type: 'restart', ...base })).toBe(true);
    expect(ok({ type: 'clear', ...base })).toBe(true);
    expect(ok({ type: 'undo', ...base })).toBe(true);
  });

  const form = {
    name: 'Goblin',
    role: 'enemy',
    maxHp: 10,
    ac: 10,
    pd: 10,
    md: 10,
    initiativeBonus: 2,
    tempHp: 0,
    note: '',
  };

  it('addUnit carries the form fields, a unit id and a roll', () => {
    expect(ok({ type: 'addUnit', ...base, unitId: id(1), roll: 7, ...form })).toBe(true);
    expect(ok({ type: 'addUnit', ...base, unitId: id(1), ...form })).toBe(false);
    expect(ok({ type: 'addUnit', ...base, roll: 7, ...form })).toBe(false);
    expect(
      ok({ type: 'addUnit', ...base, unitId: id(1), roll: 7, ...form, name: 'a'.repeat(41) }),
    ).toBe(false);
    expect(ok({ type: 'addUnit', ...base, unitId: id(1), roll: 7, ...form, maxHp: 1000 })).toBe(
      false,
    );
    expect(ok({ type: 'addUnit', ...base, unitId: id(1), roll: 7, ...form, ac: 100 })).toBe(false);
    expect(
      ok({ type: 'addUnit', ...base, unitId: id(1), roll: 7, ...form, note: 'a'.repeat(251) }),
    ).toBe(false);
  });

  it('editUnit carries the form fields for a unit', () => {
    expect(ok({ type: 'editUnit', ...base, unitId: id(1), ...form })).toBe(true);
    expect(ok({ type: 'editUnit', ...base, ...form })).toBe(false);
    expect(ok({ type: 'editUnit', ...base, unitId: id(1), ...form, initiativeBonus: 100 })).toBe(
      false,
    );
  });

  it('duplicateUnit carries the new unit id', () => {
    expect(ok({ type: 'duplicateUnit', ...base, unitId: id(1), newUnitId: id(2) })).toBe(true);
    expect(ok({ type: 'duplicateUnit', ...base, unitId: id(1) })).toBe(false);
  });

  it('removeUnit, setDisabled, claimUnit and releaseUnit target a unit', () => {
    expect(ok({ type: 'removeUnit', ...base, unitId: id(1) })).toBe(true);
    expect(ok({ type: 'removeUnit', ...base })).toBe(false);
    expect(ok({ type: 'setDisabled', ...base, unitId: id(1), disabled: true })).toBe(true);
    expect(ok({ type: 'setDisabled', ...base, unitId: id(1) })).toBe(false);
    expect(ok({ type: 'claimUnit', ...base, unitId: id(1), displayName: 'Ann' })).toBe(true);
    expect(ok({ type: 'claimUnit', ...base, unitId: id(1), displayName: '' })).toBe(false);
    expect(ok({ type: 'claimUnit', ...base, unitId: id(1) })).toBe(false);
    expect(ok({ type: 'releaseUnit', ...base, unitId: id(1) })).toBe(true);
  });

  it('setInitiative and rollInitiative use the initiative and roll ranges', () => {
    expect(ok({ type: 'setInitiative', ...base, unitId: id(1), initiative: -9 })).toBe(true);
    expect(ok({ type: 'setInitiative', ...base, unitId: id(1), initiative: 99 })).toBe(true);
    expect(ok({ type: 'setInitiative', ...base, unitId: id(1), initiative: -10 })).toBe(false);
    expect(ok({ type: 'setInitiative', ...base, unitId: id(1), initiative: null })).toBe(false);
    expect(ok({ type: 'rollInitiative', ...base, unitId: id(1), roll: 20 })).toBe(true);
    expect(ok({ type: 'rollInitiative', ...base, unitId: id(1), roll: 0 })).toBe(false);
  });

  it('damage and heal take an amount of 1–999', () => {
    expect(ok({ type: 'damage', ...base, unitId: id(1), amount: 1 })).toBe(true);
    expect(ok({ type: 'damage', ...base, unitId: id(1), amount: 999 })).toBe(true);
    expect(ok({ type: 'damage', ...base, unitId: id(1), amount: 0 })).toBe(false);
    expect(ok({ type: 'damage', ...base, unitId: id(1), amount: 1000 })).toBe(false);
    expect(ok({ type: 'heal', ...base, unitId: id(1), amount: 5 })).toBe(true);
    expect(ok({ type: 'heal', ...base, unitId: id(1), amount: 0 })).toBe(false);
  });

  it('setTempHp takes 0–999 and setMaxHp 1–999', () => {
    expect(ok({ type: 'setTempHp', ...base, unitId: id(1), amount: 0 })).toBe(true);
    expect(ok({ type: 'setTempHp', ...base, unitId: id(1), amount: 999 })).toBe(true);
    expect(ok({ type: 'setTempHp', ...base, unitId: id(1), amount: 1000 })).toBe(false);
    expect(ok({ type: 'setMaxHp', ...base, unitId: id(1), amount: 1 })).toBe(true);
    expect(ok({ type: 'setMaxHp', ...base, unitId: id(1), amount: 0 })).toBe(false);
  });

  it('toggleCondition takes one of the 12 conditions', () => {
    expect(ok({ type: 'toggleCondition', ...base, unitId: id(1), condition: 'dazed' })).toBe(true);
    expect(ok({ type: 'toggleCondition', ...base, unitId: id(1), condition: 'sleepy' })).toBe(
      false,
    );
  });

  it('editNote takes a note of up to 250 characters', () => {
    expect(ok({ type: 'editNote', ...base, unitId: id(1), note: 'Заметка' })).toBe(true);
    expect(ok({ type: 'editNote', ...base, unitId: id(1), note: 'a'.repeat(251) })).toBe(false);
  });
});
