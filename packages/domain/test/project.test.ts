import { describe, expect, it } from 'vite-plus/test';
import { playerCombatSchema, project, turnOrder } from '../src/index.ts';
import type { Combat, PlayerCombat, PlayerUnit, Unit } from '../src/index.ts';
import {
  DM,
  NOW,
  OTHER_PLAYER_ID,
  PLAYER,
  PLAYER_ID,
  id,
  makeCombat,
  makeUnit,
} from './fixtures.ts';

const ENTRY = {
  kind: 'damage',
  amount: 3,
  absorbed: 0,
  previous: 10,
  result: 7,
  round: 1,
  at: NOW,
} as const;

const own = makeUnit({
  id: id(1),
  name: 'Анна',
  role: 'hero',
  claimedBy: PLAYER_ID,
  initiative: 12,
  initiativeBonus: 2,
  maxHp: 20,
  hp: 4,
  tempHp: 3,
  ac: 15,
  pd: 12,
  md: 11,
  note: 'Заметка',
  conditions: ['dazed'],
  hpHistory: [ENTRY],
});
const other = makeUnit({
  id: id(2),
  name: 'Bob',
  role: 'hero',
  claimedBy: OTHER_PLAYER_ID,
  initiative: 18,
  maxHp: 10,
  hp: 7,
  tempHp: 1,
  ac: 14,
  note: 'secret',
  conditions: ['fear', 'stuck'],
  hpHistory: [ENTRY],
});
const ally = makeUnit({
  id: id(3),
  name: 'Guard',
  role: 'ally',
  initiative: 12,
  initiativeBonus: 5,
  maxHp: 10,
  hp: 10,
  note: 'ally note',
});
const enemy = makeUnit({
  id: id(4),
  name: 'Goblin',
  role: 'enemy',
  initiative: 5,
  maxHp: 10,
  hp: 2,
  tempHp: 2,
  ac: 13,
  pd: 9,
  md: 8,
  note: 'enemy note',
  conditions: ['weakened'],
  hpHistory: [ENTRY],
});
const disabled = makeUnit({
  id: id(5),
  name: 'Hidden',
  role: 'enemy',
  initiative: 20,
  disabled: true,
});

const combat = makeCombat({
  status: 'active',
  round: 3,
  escalation: 2,
  activeUnitId: id(2),
  version: 7,
  units: [own, other, ally, enemy, disabled],
  players: { [PLAYER_ID]: 'Анна', [OTHER_PLAYER_ID]: 'Bob' },
});

const doc: PlayerCombat = project(combat, PLAYER);

const pu = (document: PlayerCombat, n: number): PlayerUnit => {
  const found = document.units.find((unit) => unit.id === id(n));
  if (!found) throw new Error(`unit ${n} missing`);
  return found;
};

const source = (n: number): Unit => {
  const found = combat.units.find((unit) => unit.id === id(n));
  if (!found) throw new Error(`unit ${n} missing`);
  return found;
};

const ownUnit = pu(doc, 1);
const otherUnit = pu(doc, 2);
const allyUnit = pu(doc, 3);
const enemyUnit = pu(doc, 4);

const EVERY_COLUMN = [
  'id',
  'name',
  'role',
  'healthStatus',
  'healthSegments',
  'conditions',
  'position',
  'initiative',
];
const FRIENDLY_COLUMNS = [
  ...EVERY_COLUMN,
  'claimedByName',
  'mine',
  'hp',
  'tempHp',
  'maxHp',
  'ac',
  'pd',
  'md',
  'acMod',
  'pdMod',
  'mdMod',
];
const OWN_COLUMN = [...FRIENDLY_COLUMNS, 'initiativeBonus', 'note', 'hpHistory'];

const columnOf = (unit: Unit): string[] => {
  if (unit.role === 'enemy') return EVERY_COLUMN;
  if (unit.claimedBy === PLAYER_ID) return OWN_COLUMN;
  return FRIENDLY_COLUMNS;
};

describe('project', () => {
  it('returns the combat unchanged to the DM', () => {
    expect(project(combat, DM)).toBe(combat);
  });

  it('keeps every combat-level field except linkGeneration and the players map in the player document', () => {
    const { units: _units, linkGeneration: _linkGeneration, players: _players, ...fields } = combat;
    expect(doc).toMatchObject(fields);
    expect('players' in doc).toBe(false);
    expect(doc.myName).toBe('Анна');
  });

  it('never contains another player id', () => {
    const text = JSON.stringify(doc);
    expect(text).not.toContain(OTHER_PLAYER_ID);
    expect(text).not.toContain(PLAYER_ID);
  });

  it('gives no name to a player who has not joined', () => {
    expect(project({ ...combat, players: {} }, PLAYER).myName).toBeNull();
  });

  it('never contains linkGeneration', () => {
    const projected = project({ ...combat, linkGeneration: 5 }, PLAYER);
    expect('linkGeneration' in projected).toBe(false);
    expect(Object.keys(projected).sort()).toEqual(Object.keys(playerCombatSchema.shape).sort());
    expect(playerCombatSchema.safeParse({ ...projected, linkGeneration: 5 })).toMatchObject({
      success: true,
      data: expect.not.objectContaining({ linkGeneration: 5 }),
    });
  });

  it('nulls activeUnitId when the active unit is disabled', () => {
    const hiddenActive = project({ ...combat, activeUnitId: id(5) }, PLAYER);
    expect(hiddenActive.activeUnitId).toBeNull();
    expect(hiddenActive.units.some((unit) => unit.id === id(5))).toBe(false);
    expect(project({ ...combat, activeUnitId: id(5) }, DM).activeUnitId).toBe(id(5));
    expect(doc.activeUnitId).toBe(id(2));
  });

  it('Turn order, round, escalation die and the active unit, filtered by the visibility table.', () => {
    expect(doc.units.map((unit) => unit.id)).toEqual(
      turnOrder(combat.units)
        .filter((unit) => !unit.disabled)
        .map((unit) => unit.id),
    );
    expect(doc.units.map((unit) => unit.id)).toEqual([id(2), id(3), id(1), id(4)]);
    expect(doc).toMatchObject({ round: 3, escalation: 2, activeUnitId: id(2) });
  });

  it('lists units in insertion order in setup', () => {
    const setup = project(
      makeCombat({ units: [enemy, ally, own, other], players: combat.players }),
      PLAYER,
    );
    expect(setup.units.map((unit) => unit.id)).toEqual([id(4), id(3), id(1), id(2)]);
    expect(setup.units.map((unit) => unit.position)).toEqual([1, 2, 3, 4]);
  });

  it('Disabled units are not sent to players', () => {
    expect(doc.units.some((unit) => unit.id === id(5))).toBe(false);
    expect(doc.units).toHaveLength(4);
    expect(project(combat, DM).units.some((unit) => unit.id === id(5))).toBe(true);
  });

  it("The server builds the player document from this table before sending. Hidden values never reach a player's device.", () => {
    expect(doc.units).toHaveLength(4);
    for (const unit of doc.units) {
      const expected = columnOf(source(Number.parseInt(unit.id.slice(-1), 32)));
      expect(Object.keys(unit).sort()).toEqual([...expected].sort());
      expect(Object.values(unit)).not.toContain(undefined);
    }
    expect(playerCombatSchema.safeParse(doc).success).toBe(true);
  });

  it('shows every unit as Other Hero, Ally or Enemy when the player claims nothing', () => {
    const unclaimed = project(
      { ...combat, units: combat.units.map((unit) => ({ ...unit, claimedBy: null })) },
      PLAYER,
    );
    for (const unit of unclaimed.units) {
      expect(Object.keys(unit).sort()).toEqual(
        [...(unit.role === 'enemy' ? EVERY_COLUMN : FRIENDLY_COLUMNS)].sort(),
      );
    }
    expect(pu(unclaimed, 1)).toMatchObject({ claimedByName: null, mine: false });
  });

  it('shows an enemy claimed by the player as Enemy', () => {
    const claimedEnemy = project(
      { ...combat, units: [{ ...enemy, claimedBy: PLAYER_ID }] },
      PLAYER,
    );
    expect(Object.keys(pu(claimedEnemy, 4)).sort()).toEqual([...EVERY_COLUMN].sort());
  });
});

describe('Visibility for players', () => {
  it('Name | Own Hero', () => {
    expect(ownUnit.name).toBe('Анна');
  });

  it('Name | Other Hero, Ally', () => {
    expect(otherUnit.name).toBe('Bob');
    expect(allyUnit.name).toBe('Guard');
  });

  it('Name | Enemy', () => {
    expect(enemyUnit.name).toBe('Goblin');
  });

  it('Type | Own Hero', () => {
    expect(ownUnit.role).toBe('hero');
  });

  it('Type | Other Hero, Ally', () => {
    expect(otherUnit.role).toBe('hero');
    expect(allyUnit.role).toBe('ally');
  });

  it('Type | Enemy', () => {
    expect(enemyUnit.role).toBe('enemy');
  });

  it('Health status | Own Hero', () => {
    expect(ownUnit).toMatchObject({ healthStatus: 'staggered', healthSegments: 1 });
  });

  it('Health status | Other Hero, Ally', () => {
    expect(otherUnit).toMatchObject({ healthStatus: 'wounded', healthSegments: 2 });
    expect(allyUnit).toMatchObject({ healthStatus: 'full', healthSegments: 2 });
    const down = project({ ...combat, units: [{ ...other, hp: 0 }] }, PLAYER);
    expect(pu(down, 2)).toMatchObject({ healthStatus: 'unconscious', healthSegments: 0 });
  });

  it('shows a hero at −max HP as unconscious to players', () => {
    const down = project({ ...combat, units: [{ ...other, hp: -other.maxHp }] }, PLAYER);
    expect(pu(down, 2)).toMatchObject({ healthStatus: 'unconscious', healthSegments: 0 });
  });

  it('Health status | Enemy', () => {
    expect(enemyUnit).toMatchObject({ healthStatus: 'staggered', healthSegments: 1 });
    const dead = project({ ...combat, units: [{ ...enemy, hp: 0 }] }, PLAYER);
    expect(pu(dead, 4)).toMatchObject({ healthStatus: 'dead', healthSegments: 0 });
  });

  it('Conditions | Own Hero', () => {
    expect(ownUnit.conditions).toEqual(['dazed']);
  });

  it('Conditions | Other Hero, Ally', () => {
    expect(otherUnit.conditions).toEqual(['fear', 'stuck']);
    expect(allyUnit.conditions).toEqual([]);
  });

  it('Conditions | Enemy', () => {
    expect(enemyUnit.conditions).toEqual(['weakened']);
  });

  it('Position in turn order | Own Hero', () => {
    expect(ownUnit.position).toBe(3);
  });

  it('Position in turn order | Other Hero, Ally', () => {
    expect(otherUnit.position).toBe(1);
    expect(allyUnit.position).toBe(2);
  });

  it('Position in turn order | Enemy', () => {
    expect(enemyUnit.position).toBe(4);
  });

  it('Initiative value | Own Hero', () => {
    expect(ownUnit.initiative).toBe(12);
  });

  it('Initiative value | Other Hero, Ally', () => {
    expect(otherUnit.initiative).toBe(18);
    expect(allyUnit.initiative).toBe(12);
  });

  it('Initiative value | Enemy', () => {
    expect(enemyUnit.initiative).toBe(5);
  });

  it('Claimed by, display name | Own Hero', () => {
    expect(ownUnit).toMatchObject({ claimedByName: 'Анна', mine: true });
  });

  it('Claimed by, display name | Other Hero, Ally', () => {
    expect(otherUnit).toMatchObject({ claimedByName: 'Bob', mine: false });
    expect(allyUnit).toMatchObject({ claimedByName: null, mine: false });
  });

  it('Claimed by, display name | Enemy', () => {
    expect('claimedByName' in enemyUnit).toBe(false);
    expect('mine' in enemyUnit).toBe(false);
  });

  it('HP, temp HP, max HP | Own Hero', () => {
    expect(ownUnit).toMatchObject({ hp: 4, tempHp: 3, maxHp: 20 });
  });

  it('HP, temp HP, max HP | Other Hero, Ally', () => {
    expect(otherUnit).toMatchObject({ hp: 7, tempHp: 1, maxHp: 10 });
    expect(allyUnit).toMatchObject({ hp: 10, tempHp: 0, maxHp: 10 });
  });

  it('HP, temp HP, max HP | Enemy', () => {
    expect('hp' in enemyUnit).toBe(false);
    expect('tempHp' in enemyUnit).toBe(false);
    expect('maxHp' in enemyUnit).toBe(false);
  });

  it('AC, PD, MD | Own Hero', () => {
    expect(ownUnit).toMatchObject({ ac: 15, pd: 12, md: 11 });
  });

  it('AC, PD, MD | Other Hero, Ally', () => {
    expect(otherUnit).toMatchObject({ ac: 14, pd: 10, md: 10 });
    expect(allyUnit).toMatchObject({ ac: 10, pd: 10, md: 10 });
  });

  it('AC, PD, MD | Enemy', () => {
    expect('ac' in enemyUnit).toBe(false);
    expect('pd' in enemyUnit).toBe(false);
    expect('md' in enemyUnit).toBe(false);
  });

  it('Note | Own Hero', () => {
    expect(ownUnit.note).toBe('Заметка');
  });

  it('Note | Other Hero, Ally', () => {
    expect('note' in otherUnit).toBe(false);
    expect('note' in allyUnit).toBe(false);
  });

  it('Note | Enemy', () => {
    expect('note' in enemyUnit).toBe(false);
  });

  it('Initiative bonus | Own Hero', () => {
    expect(ownUnit.initiativeBonus).toBe(2);
  });

  it('Initiative bonus | Other Hero, Ally', () => {
    expect('initiativeBonus' in otherUnit).toBe(false);
    expect('initiativeBonus' in allyUnit).toBe(false);
  });

  it('Initiative bonus | Enemy', () => {
    expect('initiativeBonus' in enemyUnit).toBe(false);
  });

  it('HP history | Own Hero', () => {
    expect(ownUnit.hpHistory).toEqual([ENTRY]);
  });

  it('HP history | Other Hero, Ally', () => {
    expect('hpHistory' in otherUnit).toBe(false);
    expect('hpHistory' in allyUnit).toBe(false);
  });

  it('HP history | Enemy', () => {
    expect('hpHistory' in enemyUnit).toBe(false);
  });
});

describe('project of a combat without claims', () => {
  it('sends initiativeBonus to the own hero only and disabled to no unit', () => {
    const projected: Combat = {
      ...combat,
      units: [own, other, ally, enemy, { ...enemy, id: id(6), claimedBy: PLAYER_ID }],
    };
    for (const unit of project(projected, PLAYER).units) {
      expect('initiativeBonus' in unit).toBe(unit.id === own.id);
      expect('disabled' in unit).toBe(false);
    }
  });
});

describe('nextUnitId', () => {
  it('names the unit after the active one in turn order', () => {
    expect(doc.nextUnitId).toBe(id(3));
    expect(project({ ...combat, activeUnitId: id(3) }, PLAYER).nextUnitId).toBe(id(1));
  });

  it('skips a dead unit', () => {
    const deadAlly = { ...ally, hp: -ally.maxHp, role: 'enemy' as const };
    const next = project({ ...combat, units: [own, other, deadAlly, enemy, disabled] }, PLAYER);
    expect(next.nextUnitId).toBe(id(1));
  });

  it('skips a disabled unit, which players never see', () => {
    const hiddenAlly = { ...ally, disabled: true };
    const next = project({ ...combat, units: [own, other, hiddenAlly, enemy, disabled] }, PLAYER);
    expect(next.units.some((unit) => unit.id === id(3))).toBe(false);
    expect(next.nextUnitId).toBe(id(1));
  });

  it('wraps to the first eligible unit of the next round, past a disabled one', () => {
    const last = project({ ...combat, activeUnitId: id(4) }, PLAYER);
    expect(last.nextUnitId).toBe(id(2));
  });

  it('is null in setup and without an active unit', () => {
    expect(project({ ...combat, status: 'setup' }, PLAYER).nextUnitId).toBeNull();
    expect(project({ ...combat, activeUnitId: null }, PLAYER).nextUnitId).toBeNull();
  });
});

describe('lastActionId', () => {
  it('carries the given action id to the player and is null by default', () => {
    expect(doc.lastActionId).toBeNull();
    expect(project(combat, PLAYER, id(77)).lastActionId).toBe(id(77));
  });
});

describe('Defense modifiers for players', () => {
  const modded = (unit: Unit): Unit => ({ ...unit, acMod: 2, pdMod: -1, mdMod: 3 });
  const projected = project({ ...combat, units: combat.units.map((unit) => modded(unit)) }, PLAYER);

  it('shows the modifiers of the own hero and of other friendly units', () => {
    expect(pu(projected, 1)).toMatchObject({ ac: 15, acMod: 2, pdMod: -1, mdMod: 3 });
    expect(pu(projected, 2)).toMatchObject({ acMod: 2, pdMod: -1, mdMod: 3 });
    expect(pu(projected, 3)).toMatchObject({ acMod: 2, pdMod: -1, mdMod: 3 });
  });

  it('never sends the defenses or modifiers of an enemy', () => {
    const goblin = pu(projected, 4);
    for (const key of ['ac', 'pd', 'md', 'acMod', 'pdMod', 'mdMod']) {
      expect(key in goblin).toBe(false);
    }
  });
});
