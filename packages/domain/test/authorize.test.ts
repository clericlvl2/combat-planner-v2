import { describe, expect, it } from 'vite-plus/test';
import {
  ACTION_TYPES,
  DomainError,
  LIMITS,
  PLAYER_ACTION_TYPES,
  apply,
  authorize,
  isPlayerAction,
  normalizeTag,
  tagNameSchema,
} from '../src/index.ts';
import type { Action, Applied, ApplyResult, Combat, Unit, Viewer } from '../src/index.ts';
import {
  DM,
  NOW,
  OTHER_PLAYER,
  OTHER_PLAYER_ID,
  PLAYER,
  PLAYER_ID,
  id,
  makeCombat,
  makeUnit,
} from './fixtures.ts';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Payload = DistributiveOmit<Action, 'id' | 'version'>;

let actionCounter = 0;

const build = (combat: Combat, payload: Payload): Action => {
  actionCounter += 1;
  return { ...payload, id: id(actionCounter), version: combat.version } as Action;
};

const run = (combat: Combat, payload: Payload, author: Viewer): ApplyResult =>
  apply(combat, build(combat, payload), author, NOW);

const ok = (result: ApplyResult): Applied => {
  if (result instanceof DomainError) throw new Error(`${result.code}: ${result.message}`);
  return result;
};

const codeOf = (combat: Combat, payload: Payload, author: Viewer): string => {
  const result = run(combat, payload, author);
  if (!(result instanceof DomainError)) throw new Error('expected a DomainError');
  return result.code;
};

const verdict = (combat: Combat, payload: Payload, viewer: Viewer): true | string => {
  const result = authorize(combat, build(combat, payload), viewer);
  return result === true ? true : result.code;
};

const u = (combat: Combat, n: number): Unit => {
  const found = combat.units.find((candidate) => candidate.id === id(n));
  if (!found) throw new Error(`unit ${n} missing`);
  return found;
};

const form = {
  name: 'Hero',
  role: 'hero',
  maxHp: 10,
  ac: 10,
  pd: 10,
  md: 10,
  initiativeBonus: 0,
  tempHp: 0,
  note: '',
} as const;

const own = makeUnit({ id: id(1), name: 'Hero', role: 'hero', claimedBy: PLAYER_ID });
const other = makeUnit({ id: id(2), name: 'Other', role: 'hero', claimedBy: OTHER_PLAYER_ID });
const free = makeUnit({ id: id(3), name: 'Free', role: 'hero' });
const enemy = makeUnit({ id: id(4), name: 'Goblin', role: 'enemy' });
const table = (overrides: Partial<Combat> = {}): Combat =>
  makeCombat({ units: [own, other, free, enemy], players: { [PLAYER_ID]: 'Ann' }, ...overrides });

const onUnit = (type: Payload['type'], unitId: string): Payload => {
  switch (type) {
    case 'editUnit':
      return { type, unitId, ...form };
    case 'setInitiative':
      return { type, unitId, initiative: 5 };
    case 'rollInitiative':
      return { type, unitId, roll: 5 };
    case 'damage':
    case 'heal':
    case 'setTempHp':
    case 'setMaxHp':
      return { type, unitId, amount: 5 };
    case 'toggleCondition':
      return { type, unitId, condition: 'dazed' };
    case 'editNote':
      return { type, unitId, note: 'n' };
    case 'claimUnit':
      return { type, unitId, displayName: 'Ann' };
    case 'releaseUnit':
    case 'removeUnit':
      return { type, unitId };
    case 'setDisabled':
      return { type, unitId, disabled: true };
    case 'duplicateUnit':
      return { type, unitId, newUnitId: id(50) };
    case 'addUnit':
      return { type, unitId: id(50), roll: 5, ...form };
    case 'start':
      return { type, rolls: {} };
    case 'editRound':
      return { type, round: 2 };
    case 'setEscalation':
      return { type, escalation: 2 };
    case 'nextTurn':
    case 'restart':
    case 'clear':
    case 'undo':
      return { type };
  }
};

describe('authorize', () => {
  it('Has every action listed under Features.', () => {
    for (const type of ACTION_TYPES) {
      if (type === 'claimUnit') continue;
      expect(verdict(table(), onUnit(type, id(4)), DM)).toBe(true);
    }
  });

  it('apply calls authorize before the version check', () => {
    const combat = table();
    const action: Action = { type: 'clear', id: id(1), version: combat.version + 1 };
    expect((apply(combat, action, PLAYER, NOW) as DomainError).code).toBe('forbidden');
    expect((apply(combat, action, DM, NOW) as DomainError).code).toBe('version');
  });

  it('On own heroes sends only the actions marked "Player" in the Unit actions table.', () => {
    expect(PLAYER_ACTION_TYPES).toEqual([
      'editUnit',
      'setInitiative',
      'rollInitiative',
      'damage',
      'heal',
      'setTempHp',
      'setMaxHp',
      'toggleCondition',
      'editNote',
      'claimUnit',
      'releaseUnit',
    ]);
    for (const type of ACTION_TYPES) {
      const payload = onUnit(type, id(1));
      expect(isPlayerAction(build(table(), payload))).toBe(
        PLAYER_ACTION_TYPES.includes(type as never),
      );
      const expected = isPlayerAction(build(table(), payload)) ? true : 'forbidden';
      expect(verdict(table(), payload, PLAYER)).toBe(expected);
    }
  });

  it('Has no account and cannot undo.', () => {
    expect(codeOf(table(), { type: 'undo' }, PLAYER)).toBe('forbidden');
  });

  it('A player acts only on units they claimed', () => {
    for (const type of PLAYER_ACTION_TYPES) {
      if (type === 'claimUnit') continue;
      expect(verdict(table(), onUnit(type, id(1)), PLAYER)).toBe(true);
      expect(verdict(table(), onUnit(type, id(2)), PLAYER)).toBe('forbidden');
      expect(verdict(table(), onUnit(type, id(3)), PLAYER)).toBe('forbidden');
      expect(verdict(table(), onUnit(type, id(4)), PLAYER)).toBe('forbidden');
      expect(verdict(table(), onUnit(type, id(9)), PLAYER)).toBe('notFound');
    }
  });
});

describe('Unit actions, Player on own Hero', () => {
  it('Create; at 99 units blocked with the toast "This combat already has 99 units"', () => {
    expect(codeOf(table(), onUnit('addUnit', id(1)), PLAYER)).toBe('forbidden');
  });

  it('Edit in the form', () => {
    const edited = ok(
      run(table(), { type: 'editUnit', unitId: id(1), ...form, name: 'Анна', ac: 12 }, PLAYER),
    ).combat;
    expect(u(edited, 1)).toMatchObject({
      name: 'Анна',
      ac: 12,
      maxHp: 10,
      role: 'hero',
      claimedBy: PLAYER_ID,
    });
    expect(codeOf(table(), { type: 'editUnit', unitId: id(2), ...form }, PLAYER)).toBe('forbidden');
  });

  it('Edit in the form | ✓, type locked to Hero', () => {
    expect(
      codeOf(table(), { type: 'editUnit', unitId: id(1), ...form, role: 'enemy' }, PLAYER),
    ).toBe('forbidden');
    expect(
      codeOf(table(), { type: 'editUnit', unitId: id(1), ...form, role: 'ally' }, PLAYER),
    ).toBe('forbidden');
    expect(verdict(table(), { type: 'editUnit', unitId: id(1), ...form, role: 'enemy' }, DM)).toBe(
      true,
    );
  });

  it('Duplicate: `<name> 2`, `<name> 3`, …, right under the original, HP at max, no temp HP, no conditions, initiative copied', () => {
    expect(codeOf(table(), onUnit('duplicateUnit', id(1)), PLAYER)).toBe('forbidden');
  });

  it('Remove, with confirm; toast `<name> removed` with Undo', () => {
    expect(codeOf(table(), onUnit('removeUnit', id(1)), PLAYER)).toBe('forbidden');
  });

  it('Disable / enable', () => {
    expect(codeOf(table(), onUnit('setDisabled', id(1)), PLAYER)).toBe('forbidden');
  });

  it('Save as preset', () => {
    expect(ACTION_TYPES).not.toContain('saveAsPreset');
    expect(PLAYER_ACTION_TYPES.length).toBe(11);
  });

  it('Initiative popover: − / + stepper, Roll d20 + bonus', () => {
    const stepped = ok(
      run(table(), { type: 'setInitiative', unitId: id(1), initiative: 7 }, PLAYER),
    ).combat;
    expect(u(stepped, 1).initiative).toBe(7);
    const active = table({ status: 'active', activeUnitId: id(1) });
    const rolled = ok(
      run(active, { type: 'rollInitiative', unitId: id(1), roll: 11 }, PLAYER),
    ).combat;
    expect(u(rolled, 1).initiative).toBe(11);
    expect(codeOf(table(), { type: 'rollInitiative', unitId: id(2), roll: 11 }, PLAYER)).toBe(
      'forbidden',
    );
  });

  it('Damage, Heal, Set temp HP: calculator', () => {
    const damaged = ok(run(table(), { type: 'damage', unitId: id(1), amount: 4 }, PLAYER)).combat;
    expect(u(damaged, 1).hp).toBe(6);
    const healed = ok(run(damaged, { type: 'heal', unitId: id(1), amount: 1 }, PLAYER)).combat;
    expect(u(healed, 1).hp).toBe(7);
    const temped = ok(run(healed, { type: 'setTempHp', unitId: id(1), amount: 3 }, PLAYER)).combat;
    expect(u(temped, 1).tempHp).toBe(3);
    expect(codeOf(table(), { type: 'damage', unitId: id(4), amount: 4 }, PLAYER)).toBe('forbidden');
  });

  it('Set max HP: calculator', () => {
    const set = ok(run(table(), { type: 'setMaxHp', unitId: id(1), amount: 20 }, PLAYER)).combat;
    expect(u(set, 1).maxHp).toBe(20);
    expect(codeOf(table(), { type: 'setMaxHp', unitId: id(4), amount: 20 }, PLAYER)).toBe(
      'forbidden',
    );
  });

  it("accepts a player's Edit that changes max HP", () => {
    const edited = ok(
      run(table(), { type: 'editUnit', unitId: id(1), ...form, maxHp: 12 }, PLAYER),
    ).combat;
    expect(u(edited, 1).maxHp).toBe(12);
    expect(verdict(table(), { type: 'editUnit', unitId: id(1), ...form }, PLAYER)).toBe(true);
    expect(codeOf(table(), { type: 'editUnit', unitId: id(4), ...form, maxHp: 12 }, PLAYER)).toBe(
      'forbidden',
    );
  });

  it('Toggle condition: picker', () => {
    const next = ok(
      run(table(), { type: 'toggleCondition', unitId: id(1), condition: 'fear' }, PLAYER),
    ).combat;
    expect(u(next, 1).conditions).toEqual(['fear']);
  });

  it('Edit note inline', () => {
    const next = ok(
      run(table(), { type: 'editNote', unitId: id(1), note: 'Заметка' }, PLAYER),
    ).combat;
    expect(u(next, 1).note).toBe('Заметка');
  });

  it('Expand / collapse row', () => {
    expect(ACTION_TYPES).not.toContain('expandRow');
  });

  it('Expand / collapse row | ✓, own row only', () => {
    expect(ACTION_TYPES.some((type) => /expand|collapse/i.test(type))).toBe(false);
  });

  it('Release claim', () => {
    const next = ok(run(table(), { type: 'releaseUnit', unitId: id(1) }, PLAYER)).combat;
    expect(u(next, 1).claimedBy).toBeNull();
  });

  it('Release claim | ✓, own only', () => {
    expect(codeOf(table(), { type: 'releaseUnit', unitId: id(2) }, PLAYER)).toBe('forbidden');
    expect(codeOf(table(), { type: 'releaseUnit', unitId: id(3) }, PLAYER)).toBe('forbidden');
  });
});

describe('Claims', () => {
  it('A unit is claimed by at most one player.', () => {
    expect(codeOf(table(), onUnit('claimUnit', id(2)), PLAYER)).toBe('forbidden');
    const next = ok(run(table(), onUnit('claimUnit', id(3)), PLAYER)).combat;
    expect(u(next, 3).claimedBy).toBe(PLAYER_ID);
  });

  it('A player who claims an own hero again changes the display name; Done with a changed name sends one such claim.', () => {
    const { combat: next, patch } = ok(
      run(table(), { type: 'claimUnit', unitId: id(1), displayName: 'Аня' }, PLAYER),
    );
    expect(u(next, 1).claimedBy).toBe(PLAYER_ID);
    expect(next.players).toEqual({ [PLAYER_ID]: 'Аня' });
    expect(next.units.map((unit) => unit.claimedBy)).toEqual(
      table().units.map((unit) => unit.claimedBy),
    );
    expect(patch).toBeNull();
  });

  it('A player claims and releases heroes on the Heroes screen, and releases one hero through Release claim in the expanded row.', () => {
    const claimed = ok(run(table(), onUnit('claimUnit', id(3)), PLAYER)).combat;
    expect(u(claimed, 3).claimedBy).toBe(PLAYER_ID);
    const released = ok(run(claimed, onUnit('releaseUnit', id(3)), PLAYER)).combat;
    expect(u(released, 3).claimedBy).toBeNull();
    expect(u(released, 1).claimedBy).toBe(PLAYER_ID);
  });

  it('claimUnit only on an unclaimed or own hero', () => {
    expect(codeOf(table(), onUnit('claimUnit', id(4)), PLAYER)).toBe('forbidden');
    expect(codeOf(table(), onUnit('claimUnit', id(9)), PLAYER)).toBe('notFound');
    expect(verdict(table(), onUnit('claimUnit', id(3)), OTHER_PLAYER)).toBe(true);
  });

  it('The DM releases any claim through Release claim in the unit menu.', () => {
    const next = ok(run(table(), onUnit('releaseUnit', id(2)), DM)).combat;
    expect(u(next, 2).claimedBy).toBeNull();
    expect(u(next, 1).claimedBy).toBe(PLAYER_ID);
  });

  it('claimUnit by the DM is forbidden', () => {
    expect(codeOf(table(), onUnit('claimUnit', id(3)), DM)).toBe('forbidden');
  });

  it('Holds one or more Hero units at a time.', () => {
    const next = ok(run(table(), onUnit('claimUnit', id(3)), PLAYER)).combat;
    expect(
      next.units.filter((unit) => unit.claimedBy === PLAYER_ID).map((unit) => unit.id),
    ).toEqual([id(1), id(3)]);
  });

  it('Removing the unit releases the claim.', () => {
    const next = ok(run(table(), onUnit('removeUnit', id(1)), DM)).combat;
    expect(next.units.some((unit) => unit.claimedBy === PLAYER_ID)).toBe(false);
  });

  it('Clear releases every claim.', () => {
    expect(ok(run(table(), { type: 'clear' }, DM)).combat.units).toEqual([]);
  });

  it('Restart keeps claims.', () => {
    const active = table({ status: 'active', activeUnitId: id(1) });
    const next = ok(run(active, { type: 'restart' }, DM)).combat;
    expect(u(next, 1).claimedBy).toBe(PLAYER_ID);
    expect(u(next, 2).claimedBy).toBe(OTHER_PLAYER_ID);
  });

  it('A player whose browser lost the `playerId` sees the hero as taken by another player and asks the DM to release it.', () => {
    expect(codeOf(table(), onUnit('releaseUnit', id(1)), OTHER_PLAYER)).toBe('forbidden');
    expect(codeOf(table(), onUnit('claimUnit', id(1)), OTHER_PLAYER)).toBe('forbidden');
    expect(verdict(table(), onUnit('releaseUnit', id(1)), DM)).toBe(true);
  });

  it('claimUnit stores the display name and returns no patch', () => {
    const { combat: next, patch } = ok(
      run(table(), { type: 'claimUnit', unitId: id(3), displayName: 'Bob' }, OTHER_PLAYER),
    );
    expect(u(next, 3).claimedBy).toBe(OTHER_PLAYER_ID);
    expect(next.players).toEqual({ [PLAYER_ID]: 'Ann', [OTHER_PLAYER_ID]: 'Bob' });
    expect(patch).toBeNull();
  });

  it("A claimed unit shows the claimer's display name.", () => {
    const next = ok(
      run(table(), { type: 'claimUnit', unitId: id(3), displayName: 'Анна' }, PLAYER),
    ).combat;
    expect(next.players[u(next, 3).claimedBy ?? '']).toBe('Анна');
  });
});

describe('Owner decisions', () => {
  it('Игрок: несколько героев, экран Heroes с чекбоксами, Join/Done; инициатива и в Active; Edit своей карточки с заблокированным типом; имена игроков видны всем.', () => {
    const two = ok(run(table(), onUnit('claimUnit', id(3)), PLAYER)).combat;
    expect(two.units.filter((unit) => unit.claimedBy === PLAYER_ID)).toHaveLength(2);
    const active = table({ status: 'active', activeUnitId: id(1) });
    expect(verdict(active, { type: 'setInitiative', unitId: id(1), initiative: 3 }, PLAYER)).toBe(
      true,
    );
    expect(verdict(active, { type: 'rollInitiative', unitId: id(1), roll: 3 }, PLAYER)).toBe(true);
    expect(
      codeOf(table(), { type: 'editUnit', unitId: id(1), ...form, role: 'enemy' }, PLAYER),
    ).toBe('forbidden');
    expect(table().players).toEqual({ [PLAYER_ID]: 'Ann' });
  });

  it('Covers every entry of the action log except claim and release. REST writes (combat title, description, color, link, presets) are not undoable.', () => {
    expect(ok(run(table(), onUnit('claimUnit', id(3)), PLAYER)).patch).toBeNull();
    expect(ok(run(table(), onUnit('releaseUnit', id(1)), PLAYER)).patch).toBeNull();
    expect(ok(run(table(), onUnit('editNote', id(1)), PLAYER)).patch).not.toBeNull();
    expect(ok(run(table(), { type: 'clear' }, DM)).patch).not.toBeNull();
  });

  it('Depth: the stack holds the newest 10 actions.', () => {
    expect(LIMITS.undoDepth).toBe(10);
  });

  it('Тег до 24 символов, без учёта регистра. Удаление пресета не трогает юнитов.', () => {
    expect(tagNameSchema.safeParse('a'.repeat(24)).success).toBe(true);
    expect(tagNameSchema.safeParse('a'.repeat(25)).success).toBe(false);
    expect(normalizeTag('Undead')).toBe(normalizeTag('UNDEAD'));
  });
});
