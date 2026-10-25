import type { Combat, CombatFile } from '@combat-planner/domain';
import { LIMITS, combatSchema, toCombatFile } from '@combat-planner/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  OTHER_DM,
  PLAYER_ID,
  call,
  combatInput,
  createTestApp,
  fetchCombat,
  ulidAt,
  withUser,
} from './helpers.ts';

const unit = (index: number) => ({
  id: ulidAt(index),
  name: `Goblin ${index}`,
  role: 'enemy' as const,
  initiativeBonus: 2,
  initiative: 10 + (index % 50),
  maxHp: 20,
  hp: 7,
  tempHp: 3,
  ac: 15,
  pd: 12,
  md: 11,
  acMod: 1,
  pdMod: -1,
  mdMod: 0,
  note: 'Hides in the reeds',
  conditions: ['dazed' as const],
  disabled: false,
  claimedBy: PLAYER_ID,
  hpHistory: [],
});

const source: Combat = {
  id: COMBAT_ID,
  title: 'Goblin ambush',
  description: 'Road to Shadowfall',
  color: 3,
  status: 'active',
  round: 3,
  escalation: 2,
  activeUnitId: ulidAt(2),
  lastPlayedAt: '2026-10-16T12:00:00.000Z',
  linkGeneration: 4,
  version: 17,
  players: { [PLAYER_ID]: 'Kira' },
  createdAt: '2026-10-16T12:00:00.000Z',
  updatedAt: '2026-10-16T12:00:00.000Z',
  units: [unit(1), unit(2)],
};

const fileOf = (units: number): CombatFile =>
  toCombatFile({
    ...source,
    activeUnitId: null,
    units: Array.from({ length: units }, (_, index) => unit(index)),
  });

const activeFile = (): CombatFile => {
  const file = toCombatFile(source);
  return {
    ...file,
    combat: {
      ...file.combat,
      status: source.status,
      round: source.round,
      escalation: source.escalation,
      activeUnitId: source.activeUnitId,
      units: file.combat.units.map((each, index) => {
        const live = source.units[index];
        if (!live) throw new Error(`No source unit ${index}`);
        return {
          ...each,
          initiative: live.initiative,
          hp: live.hp,
          tempHp: live.tempHp,
          conditions: [...live.conditions],
          disabled: live.disabled,
        };
      }),
    },
  };
};

let opened: TestApp;
let dm: ReturnType<typeof withUser>;

beforeAll(() => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
});

afterAll(() => {
  opened.close();
});

describe('POST /combats/import', () => {
  it('creates a new combat owned by the DM from a valid file', async () => {
    const response = await call(dm, 'POST', '/combats/import', activeFile());
    expect(response.status).toBe(200);
    const imported = combatSchema.parse(await response.json());
    expect(imported.id).not.toBe(COMBAT_ID);
    expect(imported).toMatchObject({
      title: 'Goblin ambush',
      description: 'Road to Shadowfall',
      color: 3,
      status: 'active',
      round: 3,
      escalation: 2,
      lastPlayedAt: null,
      linkGeneration: 0,
      version: 1,
      players: {},
    });
    expect(imported.units.map((each) => each.id)).not.toContain(ulidAt(1));
    expect(imported.activeUnitId).toBe(imported.units[1]?.id);
    expect(imported.units.map(({ id: _id, ...rest }) => rest)).toEqual(
      source.units.map(({ id: _id, ...rest }) => ({
        ...rest,
        acMod: 0,
        pdMod: 0,
        mdMod: 0,
        claimedBy: null,
        hpHistory: [],
      })),
    );
    expect(await fetchCombat(dm, imported.id)).toMatchObject({ id: imported.id, undo: null });
    expect(
      (await call(withUser(opened.app, OTHER_DM), 'GET', `/combats/${imported.id}`)).status,
    ).toBe(404);
  });

  it('answers 422 invalid for a file that does not validate', async () => {
    const file = toCombatFile(source);
    for (const body of [
      { ...file, format: 'other' },
      { ...file, version: 2 },
      { ...file, combat: { ...file.combat, title: 'a'.repeat(LIMITS.combatTitle + 1) } },
      { ...file, combat: { ...file.combat, units: [{ ...file.combat.units[0], hp: 1000 }] } },
      combatInput(),
    ]) {
      const response = await call(dm, 'POST', '/combats/import', body);
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ code: 'invalid' });
    }
  });

  it('answers 422 limit for a file over the unit limit', async () => {
    const response = await call(dm, 'POST', '/combats/import', fileOf(LIMITS.unitsPerCombat + 1));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'limit' });
  });

  it('accepts a file with exactly the unit limit', async () => {
    const response = await call(dm, 'POST', '/combats/import', fileOf(LIMITS.unitsPerCombat));
    expect(response.status).toBe(200);
  });

  it('answers 422 limit at the combat limit', async () => {
    const limited = createTestApp();
    const owner = withUser(limited.app, DM);
    try {
      for (let index = 0; index < LIMITS.combatsPerDm; index += 1) {
        const created = await call(owner, 'POST', '/combats', combatInput(ulidAt(index + 100)));
        expect(created.status).toBe(200);
      }
      const response = await call(owner, 'POST', '/combats/import', toCombatFile(source));
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ code: 'limit' });
    } finally {
      limited.close();
    }
  });

  it('requires a session', async () => {
    const response = await opened.app.request('/combats/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(toCombatFile(source)),
    });
    expect(response.status).toBe(401);
  });
});
