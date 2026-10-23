import { describe, expect, it } from 'vite-plus/test';
import {
  COMBAT_FILE_FORMAT,
  combatFileSchema,
  combatSchema,
  fromCombatFile,
  toCombatFile,
} from '../src/index.ts';
import { LATER, NOW, PLAYER_ID, id, makeCombat, makeUnit } from './fixtures.ts';

const hero = makeUnit({
  id: id(1),
  name: 'Ayla',
  role: 'hero',
  initiativeBonus: 3,
  initiative: 17,
  maxHp: 40,
  hp: 12,
  tempHp: 5,
  ac: 18,
  pd: 14,
  md: 12,
  note: 'Blessed',
  conditions: ['dazed', 'weakened'],
  claimedBy: PLAYER_ID,
  hpHistory: [
    {
      kind: 'damage',
      amount: 28,
      absorbed: 0,
      previous: 40,
      result: 12,
      round: 2,
      at: NOW,
    },
  ],
});
const goblin = makeUnit({ id: id(2), initiative: 9, disabled: true, hp: -3 });

const source = makeCombat({
  title: 'Ambush at the Ferry',
  description: 'Session 12',
  color: 3,
  status: 'active',
  round: 4,
  escalation: 3,
  activeUnitId: id(2),
  lastPlayedAt: NOW,
  linkGeneration: 5,
  version: 42,
  players: { [PLAYER_ID]: 'Kira' },
  units: [hero, goblin],
});

const freshIds = () => {
  let next = 100;
  return { combatId: id(99), unitId: () => id(next++) };
};

describe('combat file', () => {
  it('round-trips a combat apart from ids, history and claims', () => {
    const file = combatFileSchema.parse(JSON.parse(JSON.stringify(toCombatFile(source))));
    const imported = fromCombatFile(file, freshIds(), LATER);
    expect(combatSchema.parse(imported)).toEqual(imported);
    expect(imported).toEqual({
      ...source,
      id: id(99),
      activeUnitId: id(101),
      lastPlayedAt: null,
      linkGeneration: 0,
      version: 1,
      players: {},
      createdAt: LATER,
      updatedAt: LATER,
      units: [
        { ...hero, id: id(100), claimedBy: null, hpHistory: [] },
        { ...goblin, id: id(101) },
      ],
    });
  });

  it('carries only the current state', () => {
    const file = toCombatFile(source);
    expect(file.format).toBe(COMBAT_FILE_FORMAT);
    expect(file.version).toBe(1);
    expect(Object.keys(file.combat).toSorted()).toEqual(
      [
        'activeUnitId',
        'color',
        'description',
        'escalation',
        'round',
        'status',
        'title',
        'units',
      ].toSorted(),
    );
    expect(file.combat.units[0]).not.toHaveProperty('hpHistory');
    expect(file.combat.units[0]).not.toHaveProperty('claimedBy');
  });

  it('rejects another format, version or broken references', () => {
    const file = toCombatFile(source);
    expect(combatFileSchema.safeParse(file).success).toBe(true);
    expect(combatFileSchema.safeParse({ ...file, format: 'other' }).success).toBe(false);
    expect(combatFileSchema.safeParse({ ...file, version: 2 }).success).toBe(false);
    expect(
      combatFileSchema.safeParse({ ...file, combat: { ...file.combat, activeUnitId: id(7) } })
        .success,
    ).toBe(false);
    expect(
      combatFileSchema.safeParse({
        ...file,
        combat: { ...file.combat, units: [file.combat.units[0], file.combat.units[0]] },
      }).success,
    ).toBe(false);
  });

  it('applies the field limits', () => {
    const file = toCombatFile(source);
    expect(
      combatFileSchema.safeParse({ ...file, combat: { ...file.combat, title: 'a'.repeat(81) } })
        .success,
    ).toBe(false);
    const [first] = file.combat.units;
    expect(
      combatFileSchema.safeParse({
        ...file,
        combat: { ...file.combat, units: [{ ...first, maxHp: 1000 }] },
      }).success,
    ).toBe(false);
  });
});
