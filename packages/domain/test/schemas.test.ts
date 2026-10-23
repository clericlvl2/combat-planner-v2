import { describe, expect, it } from 'vite-plus/test';
import {
  LIMITS,
  combatSchema,
  presetSchema,
  tagSchema,
  unitSchema,
  viewerSchema,
} from '../src/index.ts';
import { id, makeCombat, makeUnit } from './fixtures.ts';

const unitOk = (overrides: Parameters<typeof makeUnit>[0]) =>
  unitSchema.safeParse(makeUnit(overrides)).success;
const combatOk = (overrides: Parameters<typeof makeCombat>[0]) =>
  combatSchema.safeParse(makeCombat(overrides)).success;

describe('LIMITS', () => {
  it('matches the vision Limits table', () => {
    expect(LIMITS).toMatchObject({
      combatsPerDm: 100,
      unitsPerCombat: 99,
      presetsPerDm: 1000,
      tagsPerDm: 25,
      unitName: 40,
      combatTitle: 80,
      combatDescription: 500,
      note: 250,
      tagName: 24,
      displayName: 40,
      round: { min: 1, max: 99 },
      escalation: { min: 0, max: 6 },
      color: { min: 0, max: 7 },
      maxHp: { min: 1, max: 999 },
      hp: { min: -999, max: 999 },
      defense: { min: 0, max: 99 },
      initiativeBonus: { min: -99, max: 99 },
      initiative: { min: -9, max: 99 },
    });
  });
});

describe('Limits', () => {
  it('Units per combat', () => {
    const units = (count: number) =>
      Array.from({ length: count }, (_, n) => makeUnit({ id: id(n) }));
    expect(combatOk({ units: units(99) })).toBe(true);
    expect(combatOk({ units: units(100) })).toBe(false);
  });

  it('Unit name', () => {
    expect(unitOk({ name: 'a'.repeat(40) })).toBe(true);
    expect(unitOk({ name: 'a'.repeat(41) })).toBe(false);
    expect(unitOk({ name: '' })).toBe(false);
  });

  it('Combat title', () => {
    expect(combatOk({ title: 'a'.repeat(80) })).toBe(true);
    expect(combatOk({ title: 'a'.repeat(81) })).toBe(false);
    expect(combatOk({ title: '' })).toBe(false);
  });

  it('Combat description', () => {
    expect(combatOk({ description: 'a'.repeat(500) })).toBe(true);
    expect(combatOk({ description: 'a'.repeat(501) })).toBe(false);
  });

  it('Note', () => {
    expect(unitOk({ note: 'a'.repeat(250) })).toBe(true);
    expect(unitOk({ note: 'a'.repeat(251) })).toBe(false);
  });

  it('Tag name', () => {
    expect(tagSchema.safeParse({ id: id(1), name: 'a'.repeat(24) }).success).toBe(true);
    expect(tagSchema.safeParse({ id: id(1), name: 'a'.repeat(25) }).success).toBe(false);
    expect(tagSchema.safeParse({ id: id(1), name: '' }).success).toBe(false);
  });

  it('Player display name', () => {
    expect(combatOk({ players: { [id(900)]: 'a'.repeat(40) } })).toBe(true);
    expect(combatOk({ players: { [id(900)]: 'a'.repeat(41) } })).toBe(false);
    expect(combatOk({ players: { [id(900)]: '' } })).toBe(false);
  });

  it('Round', () => {
    expect(combatOk({ round: 1 })).toBe(true);
    expect(combatOk({ round: 99 })).toBe(true);
    expect(combatOk({ round: 0 })).toBe(false);
    expect(combatOk({ round: 100 })).toBe(false);
  });

  it('Escalation die', () => {
    expect(combatOk({ escalation: 0 })).toBe(true);
    expect(combatOk({ escalation: 6 })).toBe(true);
    expect(combatOk({ escalation: 7 })).toBe(false);
    expect(combatOk({ escalation: -1 })).toBe(false);
  });

  it('accepts colors 0–7 only', () => {
    expect(combatOk({ color: 7 })).toBe(true);
    expect(combatOk({ color: 8 })).toBe(false);
    expect(combatOk({ color: -1 })).toBe(false);
  });
});

describe('Fields', () => {
  it('Name', () => {
    expect(unitOk({ name: 'Орк' })).toBe(true);
    expect(unitOk({ name: '' })).toBe(false);
  });

  it('Type', () => {
    expect(unitOk({ role: 'hero' })).toBe(true);
    expect(unitOk({ role: 'ally' })).toBe(true);
    expect(unitSchema.safeParse({ ...makeUnit(), role: 'npc' }).success).toBe(false);
  });

  it('Initiative bonus', () => {
    expect(unitOk({ initiativeBonus: -99 })).toBe(true);
    expect(unitOk({ initiativeBonus: 99 })).toBe(true);
    expect(unitOk({ initiativeBonus: -100 })).toBe(false);
    expect(unitOk({ initiativeBonus: 100 })).toBe(false);
  });

  it('Initiative', () => {
    expect(unitOk({ initiative: null })).toBe(true);
    expect(unitOk({ initiative: -9 })).toBe(true);
    expect(unitOk({ initiative: 99 })).toBe(true);
    expect(unitOk({ initiative: -10 })).toBe(false);
    expect(unitOk({ initiative: 100 })).toBe(false);
  });

  it('Max HP', () => {
    expect(unitOk({ maxHp: 1, hp: 1 })).toBe(true);
    expect(unitOk({ maxHp: 999, hp: 999 })).toBe(true);
    expect(unitOk({ maxHp: 0, hp: 0 })).toBe(false);
    expect(unitOk({ maxHp: 1000, hp: 1000 })).toBe(false);
  });

  it('Current HP', () => {
    expect(unitOk({ maxHp: 10, hp: -10 })).toBe(true);
    expect(unitOk({ maxHp: 10, hp: -11 })).toBe(false);
    expect(unitOk({ maxHp: 999, hp: 999 })).toBe(true);
    expect(unitOk({ maxHp: 999, hp: 1000 })).toBe(false);
    expect(unitOk({ maxHp: 999, hp: -999 })).toBe(true);
  });

  it('Temp HP', () => {
    expect(unitOk({ tempHp: 0 })).toBe(true);
    expect(unitOk({ tempHp: 999 })).toBe(true);
    expect(unitOk({ tempHp: -1 })).toBe(false);
    expect(unitOk({ tempHp: 1000 })).toBe(false);
  });

  it('AC, PD, MD', () => {
    expect(unitOk({ ac: 0, pd: 99, md: 50 })).toBe(true);
    expect(unitOk({ ac: -1 })).toBe(false);
    expect(unitOk({ pd: 100 })).toBe(false);
    expect(unitOk({ md: 1.5 })).toBe(false);
  });

  it('Conditions', () => {
    expect(unitOk({ conditions: ['charmed', 'weakened'] })).toBe(true);
    expect(unitOk({ conditions: ['charmed', 'charmed'] })).toBe(false);
    expect(unitSchema.safeParse({ ...makeUnit(), conditions: ['sleepy'] }).success).toBe(false);
  });

  it('Disabled', () => {
    expect(unitOk({ disabled: true })).toBe(true);
    expect(unitSchema.safeParse({ ...makeUnit(), disabled: 'yes' }).success).toBe(false);
  });
});

describe('combatSchema', () => {
  it('rejects duplicate unit ids and an active unit that is not in the list', () => {
    expect(combatOk({ units: [makeUnit({ id: id(1) }), makeUnit({ id: id(1) })] })).toBe(false);
    expect(combatOk({ units: [makeUnit({ id: id(1) })], activeUnitId: id(2) })).toBe(false);
    expect(combatOk({ units: [makeUnit({ id: id(1) })], activeUnitId: id(1) })).toBe(true);
  });

  it('rejects an id that is not a ULID', () => {
    expect(combatOk({ id: 'not-a-ulid' })).toBe(false);
    expect(combatOk({ id: '81ARZ3NDEKTSV4RRFFQ69G5FAV' })).toBe(false);
  });
});

describe('presetSchema', () => {
  it('applies the unit ranges and unique tags', () => {
    const preset = {
      id: id(1),
      name: 'Goblin',
      role: 'enemy',
      maxHp: 10,
      ac: 10,
      pd: 10,
      md: 10,
      initiativeBonus: 0,
      tags: [id(2)],
      createdAt: '2026-10-16T12:00:00.000Z',
      updatedAt: '2026-10-16T12:00:00.000Z',
    };
    expect(presetSchema.safeParse(preset).success).toBe(true);
    expect(presetSchema.safeParse({ ...preset, maxHp: 1000 }).success).toBe(false);
    expect(presetSchema.safeParse({ ...preset, ac: 100 }).success).toBe(false);
    expect(presetSchema.safeParse({ ...preset, tags: [id(2), id(2)] }).success).toBe(false);
    const tags = Array.from({ length: 30 }, (_, n) => id(n + 10));
    expect(presetSchema.safeParse({ ...preset, tags }).success).toBe(true);
  });
});

describe('viewerSchema', () => {
  it('accepts dm and player viewers only', () => {
    expect(viewerSchema.safeParse({ kind: 'dm' }).success).toBe(true);
    expect(viewerSchema.safeParse({ kind: 'player', playerId: id(900) }).success).toBe(true);
    expect(viewerSchema.safeParse({ kind: 'player' }).success).toBe(false);
    expect(viewerSchema.safeParse({ kind: 'admin' }).success).toBe(false);
  });
});
