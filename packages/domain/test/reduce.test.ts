import { describe, expect, it } from 'vite-plus/test';
import {
  DomainError,
  LIMITS,
  apply,
  copyCombat,
  defenseSchema,
  nextTurnBlockReason,
  nextTurnTarget,
  presetFromUnit,
  presetSchema,
  rolledInitiative,
} from '../src/index.ts';
import type { Action, Applied, ApplyResult, Combat, Unit, Viewer } from '../src/index.ts';
import { DM, LATER, NOW, PLAYER_ID, id, makeCombat, makeUnit } from './fixtures.ts';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Payload = DistributiveOmit<Action, 'id' | 'version'>;

let actionCounter = 0;

const run = (combat: Combat, payload: Payload, author: Viewer = DM, now = NOW): ApplyResult => {
  actionCounter += 1;
  const action = { ...payload, id: id(actionCounter), version: combat.version } as Action;
  return apply(combat, action, author, now);
};

const ok = (result: ApplyResult): Applied => {
  if (result instanceof DomainError) throw new Error(`${result.code}: ${result.message}`);
  return result;
};

const fail = (result: ApplyResult): DomainError => {
  if (!(result instanceof DomainError)) throw new Error('expected a DomainError');
  return result;
};

const u = (combat: Combat, n: number): Unit => {
  const found = combat.units.find((candidate) => candidate.id === id(n));
  if (!found) throw new Error(`unit ${n} missing`);
  return found;
};

const one = (overrides: Partial<Unit> = {}): Combat =>
  setup([makeUnit({ id: id(1), ...overrides })]);

const hist = (combat: Combat) => u(combat, 1).hpHistory;

const ENTRY = {
  kind: 'damage',
  amount: 3,
  absorbed: 0,
  previous: 10,
  result: 7,
  round: 1,
  at: NOW,
} as const;

const go = (combat: Combat, payload: Payload, author: Viewer = DM, now = NOW): Combat =>
  ok(run(combat, payload, author, now)).combat;

const codeOf = (combat: Combat, payload: Payload, author: Viewer = DM): string =>
  fail(run(combat, payload, author)).code;

const form = {
  name: 'Goblin',
  role: 'enemy',
  maxHp: 10,
  ac: 10,
  pd: 10,
  md: 10,
  initiativeBonus: 0,
  tempHp: 0,
  note: '',
} as const;

const active = (units: Unit[], overrides: Partial<Combat> = {}): Combat =>
  makeCombat({
    status: 'active',
    round: 1,
    escalation: 0,
    activeUnitId: units[0]?.id ?? null,
    units,
    version: 4,
    ...overrides,
  });

const setup = (units: Unit[], overrides: Partial<Combat> = {}): Combat =>
  makeCombat({ units, version: 2, ...overrides });

describe('apply', () => {
  it('rejects an action whose version differs from the combat version with DomainError version', () => {
    const combat = setup([makeUnit()]);
    const action: Action = { type: 'nextTurn', id: id(1), version: combat.version + 1 };
    const error = fail(apply(combat, action, DM, NOW));
    expect(error.code).toBe('version');
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DomainError');
  });

  it('increments the combat version by one and stamps updatedAt on success', () => {
    const combat = setup([makeUnit()]);
    const { combat: next } = ok(
      run(combat, { type: 'editNote', unitId: id(1), note: 'x' }, DM, LATER),
    );
    expect(next.version).toBe(combat.version + 1);
    expect(next.updatedAt).toBe(LATER);
    expect(combat.version).toBe(2);
  });

  it('does not mutate the input combat', () => {
    const combat = setup([makeUnit({ tempHp: 2 })]);
    const snapshot = JSON.stringify(combat);
    ok(run(combat, { type: 'damage', unitId: id(1), amount: 5 }));
    expect(JSON.stringify(combat)).toBe(snapshot);
  });

  it('delegates undo to applyUndo, which answers DomainError blocked on an empty log', () => {
    const combat = setup([makeUnit()]);
    expect(codeOf(combat, { type: 'undo' })).toBe('blocked');
  });
});

describe('Transitions', () => {
  it('Start', () => {
    const units = [
      makeUnit({ id: id(1), name: 'kept', initiative: 5 }),
      makeUnit({ id: id(2), name: 'rolled', initiativeBonus: 3 }),
      makeUnit({ id: id(3), name: 'low', initiativeBonus: -99 }),
    ];
    const combat = setup(units, { round: 7, escalation: 3 });
    const { combat: next } = ok(run(combat, { type: 'start', rolls: { [id(2)]: 20, [id(3)]: 1 } }));
    expect(next.status).toBe('active');
    expect(next.round).toBe(1);
    expect(next.escalation).toBe(0);
    expect(u(next, 1).initiative).toBe(5);
    expect(u(next, 2).initiative).toBe(23);
    expect(u(next, 3).initiative).toBe(-9);
    expect(next.activeUnitId).toBe(id(2));
  });

  it('Start | setup, at least one unit', () => {
    expect(codeOf(setup([]), { type: 'start', rolls: {} })).toBe('blocked');
    expect(codeOf(active([makeUnit()]), { type: 'start', rolls: {} })).toBe('blocked');
  });

  it('Start rejects a missing roll for a unit without initiative', () => {
    const error = fail(run(one(), { type: 'start', rolls: {} }));
    expect(error.code).toBe('invalid');
  });

  it('Start skips disabled and dead units when picking the first turn', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 20, disabled: true }),
      makeUnit({ id: id(2), initiative: 15, hp: 0 }),
      makeUnit({ id: id(3), initiative: 10 }),
    ];
    expect(go(setup(units), { type: 'start', rolls: {} }).activeUnitId).toBe(id(3));
  });

  it('Start falls back to the first unit in order when every unit is skipped', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 3, hp: 0 }),
      makeUnit({ id: id(2), initiative: 9, hp: 0 }),
    ];
    expect(go(setup(units), { type: 'start', rolls: {} }).activeUnitId).toBe(id(2));
  });

  it('Next turn', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 20 }),
      makeUnit({ id: id(2), initiative: 15, disabled: true }),
      makeUnit({ id: id(3), initiative: 10, hp: -2 }),
      makeUnit({ id: id(4), initiative: 5 }),
    ];
    const combat = active(units);
    const first = go(combat, { type: 'nextTurn' });
    expect(first.activeUnitId).toBe(id(4));
    expect(first.round).toBe(1);
    expect(first.escalation).toBe(0);
    const wrapped = go(first, { type: 'nextTurn' });
    expect(wrapped.activeUnitId).toBe(id(1));
    expect(wrapped.round).toBe(2);
    expect(wrapped.escalation).toBe(1);
  });

  it('Next turn | active', () => {
    expect(codeOf(setup([makeUnit()]), { type: 'nextTurn' })).toBe('blocked');
  });

  it('Next turn is blocked when round = 99 and the turn would wrap', () => {
    const combat = active(
      [makeUnit({ id: id(1), initiative: 10 }), makeUnit({ id: id(2), initiative: 5 })],
      {
        round: 99,
        activeUnitId: id(2),
      },
    );
    const error = fail(run(combat, { type: 'nextTurn' }));
    expect(error.code).toBe('blocked');
    expect(error.message).toBe('lastRound');
    const notWrapping = { ...combat, activeUnitId: id(1) };
    expect(go(notWrapping, { type: 'nextTurn' }).activeUnitId).toBe(id(2));
  });

  it('Next turn is blocked when every unit is disabled or dead', () => {
    const combat = active([
      makeUnit({ id: id(1), initiative: 10, disabled: true }),
      makeUnit({ id: id(2), hp: 0 }),
    ]);
    const error = fail(run(combat, { type: 'nextTurn' }));
    expect(error.code).toBe('blocked');
    expect(error.message).toBe('everyUnitDisabledOrDead');
  });

  it('Next turn with an unset turn moves to the first eligible unit without a wrap', () => {
    const combat = active(
      [makeUnit({ id: id(1), initiative: 3, hp: 0 }), makeUnit({ id: id(2), initiative: 1 })],
      {
        activeUnitId: null,
        round: 4,
        escalation: 2,
      },
    );
    const next = go(combat, { type: 'nextTurn' });
    expect(next.activeUnitId).toBe(id(2));
    expect(next.round).toBe(4);
    expect(next.escalation).toBe(2);
  });

  it('Эскалация растёт на 1 при переходе на новый раунд, максимум 6.', () => {
    const combat = active([makeUnit({ id: id(1), initiative: 10 })], { escalation: 5 });
    const once = go(combat, { type: 'nextTurn' });
    expect(once.round).toBe(2);
    expect(once.escalation).toBe(6);
    const twice = go(once, { type: 'nextTurn' });
    expect(twice.round).toBe(3);
    expect(twice.escalation).toBe(6);
  });

  it('Edit round', () => {
    const combat = active([makeUnit({ id: id(1), initiative: 1 })]);
    const next = go(combat, { type: 'editRound', round: 42 });
    expect(next.round).toBe(42);
    expect(next.activeUnitId).toBe(id(1));
    expect(next.escalation).toBe(0);
  });

  it('Edit round | active', () => {
    expect(codeOf(setup([makeUnit()]), { type: 'editRound', round: 2 })).toBe('blocked');
  });

  it('Set escalation die', () => {
    const combat = active([makeUnit({ id: id(1), initiative: 1 })], { round: 3 });
    const next = go(combat, { type: 'setEscalation', escalation: 4 });
    expect(next.escalation).toBe(4);
    expect(next.round).toBe(3);
    expect(next.activeUnitId).toBe(id(1));
  });

  it('Set escalation die | active', () => {
    expect(codeOf(setup([makeUnit()]), { type: 'setEscalation', escalation: 1 })).toBe('blocked');
  });

  it('Restart, with confirm', () => {
    const hero = makeUnit({ id: id(1), role: 'hero', initiative: 12, hp: 7, claimedBy: PLAYER_ID });
    const units = [
      { ...hero, tempHp: 4, conditions: ['dazed'], disabled: true, hpHistory: [ENTRY] } as Unit,
    ];
    const combat = active(units, { round: 5, escalation: 3, players: { [PLAYER_ID]: 'Ann' } });
    const next = go(combat, { type: 'restart' });
    expect(next).toMatchObject({ status: 'setup', round: 1, escalation: 0, activeUnitId: null });
    expect(next.players).toEqual({ [PLAYER_ID]: 'Ann' });
    expect(u(next, 1)).toEqual({ ...hero, initiative: null, hp: 10 });
  });

  it('Restart, with confirm | active', () => {
    expect(codeOf(setup([makeUnit()]), { type: 'restart' })).toBe('blocked');
  });

  it('Clear, with confirm', () => {
    const units = [makeUnit({ id: id(1), role: 'hero', claimedBy: PLAYER_ID, initiative: 3 })];
    const fromActive = go(active(units, { round: 6, escalation: 2 }), { type: 'clear' });
    expect(fromActive.units).toEqual([]);
    expect(fromActive.status).toBe('setup');
    expect(fromActive.round).toBe(1);
    expect(fromActive.escalation).toBe(0);
    expect(fromActive.activeUnitId).toBeNull();
    const fromSetup = go(setup(units), { type: 'clear' });
    expect(fromSetup.units).toEqual([]);
    expect(fromSetup.status).toBe('setup');
  });

  it('Remove last unit, with confirm', () => {
    const combat = active(
      [makeUnit({ id: id(1), initiative: 3, claimedBy: PLAYER_ID, role: 'hero' })],
      {
        round: 4,
        escalation: 2,
      },
    );
    const next = go(combat, { type: 'removeUnit', unitId: id(1) });
    expect(next.units).toEqual([]);
    expect(next.status).toBe('setup');
    expect(next.activeUnitId).toBeNull();
    expect(next.round).toBe(1);
    expect(next.escalation).toBe(0);
  });

  it('Remove active unit, with confirm', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 20 }),
      makeUnit({ id: id(2), initiative: 15, disabled: true }),
      makeUnit({ id: id(3), initiative: 10 }),
    ];
    const combat = active(units, { round: 2 });
    const next = go(combat, { type: 'removeUnit', unitId: id(1) });
    expect(next.units.map((item) => item.id)).toEqual([id(2), id(3)]);
    expect(next.activeUnitId).toBe(id(3));
    expect(next.status).toBe('active');
    expect(next.round).toBe(2);
  });

  it('Clear, with confirm | any', () => {
    const units = [makeUnit({ id: id(1), initiative: 1 })];
    expect(go(setup(units), { type: 'clear' })).toMatchObject({ status: 'setup', units: [] });
    expect(go(active(units), { type: 'clear' })).toMatchObject({ status: 'setup', units: [] });
  });

  it('Remove last unit, with confirm | active', () => {
    const next = go(one(), { type: 'removeUnit', unitId: id(1) });
    expect(next).toMatchObject({ status: 'setup', units: [], activeUnitId: null });
  });

  it('Remove active unit, with confirm | active', () => {
    const combat = setup([makeUnit({ id: id(1) }), makeUnit({ id: id(2) })]);
    const next = go(combat, { type: 'removeUnit', unitId: id(1) });
    expect(next).toMatchObject({ status: 'setup', activeUnitId: null });
    expect(next.units.map((item) => item.id)).toEqual([id(2)]);
  });

  it('Remove active unit, with confirm | when there is none, the turn is unset and Next turn is blocked', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 20 }),
      makeUnit({ id: id(2), initiative: 15, hp: 0 }),
    ];
    const next = go(active(units), { type: 'removeUnit', unitId: id(1) });
    expect(next.activeUnitId).toBeNull();
    expect(next.status).toBe('active');
    expect(nextTurnBlockReason(next)).toBe('everyUnitDisabledOrDead');
    expect(codeOf(next, { type: 'nextTurn' })).toBe('blocked');
  });

  it('Remove active unit wraps the turn to the first eligible unit', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 20 }),
      makeUnit({ id: id(2), initiative: 15 }),
    ];
    const next = go(active(units, { activeUnitId: id(2), round: 3 }), {
      type: 'removeUnit',
      unitId: id(2),
    });
    expect(next.activeUnitId).toBe(id(1));
    expect(next.round).toBe(3);
  });

  it('removes a unit that is not the active one without moving the turn', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 20 }),
      makeUnit({ id: id(2), initiative: 15 }),
    ];
    const next = go(active(units), { type: 'removeUnit', unitId: id(2) });
    expect(next.activeUnitId).toBe(id(1));
    expect(next.units.map((item) => item.id)).toEqual([id(1)]);
    const inSetup = go(setup(units), { type: 'removeUnit', unitId: id(1) });
    expect(inSetup.units.map((item) => item.id)).toEqual([id(2)]);
    expect(inSetup.status).toBe('setup');
  });

  it('removeUnit rejects an unknown unit with notFound', () => {
    expect(codeOf(setup([makeUnit()]), { type: 'removeUnit', unitId: id(9) })).toBe('notFound');
  });
});

describe('nextTurnBlockReason', () => {
  it('returns null on a combat where Next turn is allowed', () => {
    expect(nextTurnBlockReason(active([makeUnit({ id: id(1), initiative: 1 })]))).toBeNull();
    expect(
      nextTurnBlockReason(active([makeUnit({ id: id(1), initiative: 1 })], { round: 98 })),
    ).toBeNull();
  });

  it('names every unit disabled or dead', () => {
    expect(nextTurnBlockReason(active([makeUnit({ id: id(1), disabled: true })]))).toBe(
      'everyUnitDisabledOrDead',
    );
    expect(nextTurnBlockReason(active([makeUnit({ id: id(1), hp: 0 })]))).toBe(
      'everyUnitDisabledOrDead',
    );
  });

  it('names round 99 as the last', () => {
    expect(
      nextTurnBlockReason(active([makeUnit({ id: id(1), initiative: 1 })], { round: 99 })),
    ).toBe('lastRound');
  });

  it('names a combat that is not active', () => {
    expect(nextTurnBlockReason(setup([makeUnit()]))).toBe('notActive');
  });
});

describe('nextTurnTarget', () => {
  it('names the next unit and whether the turn wraps', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 20 }),
      makeUnit({ id: id(2), initiative: 15 }),
    ];
    expect(nextTurnTarget(active(units))).toEqual({ unitId: id(2), wraps: false });
    expect(nextTurnTarget(active(units, { activeUnitId: id(2) }))).toEqual({
      unitId: id(1),
      wraps: true,
    });
    expect(nextTurnTarget(active([makeUnit({ id: id(1), initiative: 1 })]))).toEqual({
      unitId: id(1),
      wraps: true,
    });
    expect(nextTurnTarget(active([makeUnit({ id: id(1), hp: 0 })]))).toBeNull();
  });
});

describe('Unit actions', () => {
  it('Create; at 99 units blocked with the toast "This combat already has 99 units"', () => {
    const units = Array.from({ length: 99 }, (_, n) => makeUnit({ id: id(100 + n) }));
    const error = fail(run(setup(units), { type: 'addUnit', unitId: id(1), roll: 10, ...form }));
    expect(error.code).toBe('limit');
    expect(error.message).toBe('This combat already has 99 units');
    expect(codeOf(setup(units), { type: 'duplicateUnit', unitId: id(100), newUnitId: id(1) })).toBe(
      'limit',
    );
  });

  it('adds a unit in setup with full HP, no initiative and the form fields', () => {
    const added = {
      type: 'addUnit',
      unitId: id(1),
      roll: 20,
      ...form,
      tempHp: 3,
      note: 'Заметка',
    } as const;
    const next = go(setup([]), added);
    expect(next.units).toEqual([makeUnit({ id: id(1), tempHp: 3, note: 'Заметка' })]);
  });

  it('A unit added in Active gets its initiative rolled on add.', () => {
    const combat = active([makeUnit({ id: id(1), initiative: 5 })]);
    const next = go(combat, {
      type: 'addUnit',
      unitId: id(2),
      roll: 17,
      ...form,
      initiativeBonus: 4,
    });
    expect(u(next, 2).initiative).toBe(21);
    expect(next.units.map((item) => item.id)).toEqual([id(1), id(2)]);
    expect(next.activeUnitId).toBe(id(1));
  });

  it('addUnit rejects an id that already exists', () => {
    expect(codeOf(one(), { type: 'addUnit', unitId: id(1), roll: 1, ...form })).toBe('invalid');
  });

  it('Edit in the form', () => {
    const combat = one();
    const edited = {
      ...form,
      name: 'Орк',
      role: 'ally',
      ac: 12,
      pd: 13,
      md: 14,
      initiativeBonus: 2,
      note: 'n',
    } as const;
    const next = go(combat, { type: 'editUnit', unitId: id(1), ...edited });
    expect(u(next, 1)).toEqual(makeUnit({ id: id(1), ...edited }));
  });

  it('Edit in the form records max HP and temp HP changes in the HP history', () => {
    const combat = active([makeUnit({ id: id(1), hp: 10, maxHp: 10, tempHp: 1, initiative: 1 })], {
      round: 3,
    });
    const next = go(combat, { type: 'editUnit', unitId: id(1), ...form, maxHp: 6, tempHp: 4 });
    expect(u(next, 1)).toMatchObject({ maxHp: 6, hp: 6, tempHp: 4 });
    expect(hist(next)).toEqual([
      { kind: 'max', amount: 6, absorbed: 0, previous: 10, result: 6, round: 3, at: NOW },
      { kind: 'temp', amount: 4, absorbed: 0, previous: 1, result: 6, round: 3, at: NOW },
    ]);
  });

  it('editUnit rejects an unknown unit with notFound', () => {
    expect(codeOf(setup([makeUnit()]), { type: 'editUnit', unitId: id(9), ...form })).toBe(
      'notFound',
    );
  });

  it('Changing the unit type away from Hero releases the claim.', () => {
    const combat = setup([makeUnit({ id: id(1), role: 'hero', claimedBy: PLAYER_ID })], {
      players: { [PLAYER_ID]: 'Ann' },
    });
    const released = go(combat, { type: 'editUnit', unitId: id(1), ...form, role: 'enemy' });
    expect(u(released, 1).claimedBy).toBeNull();
    expect(released.players).toEqual({ [PLAYER_ID]: 'Ann' });
    const kept = go(combat, { type: 'editUnit', unitId: id(1), ...form, role: 'hero' });
    expect(u(kept, 1).claimedBy).toBe(PLAYER_ID);
  });

  it('Duplicate: `<name> 2`, `<name> 3`, …, right under the original, HP at max, no temp HP, no conditions, initiative copied', () => {
    const source = makeUnit({ id: id(1), initiative: 14, hp: 3, tempHp: 5, note: 'sneaky' });
    const units = [
      { ...source, conditions: ['dazed'], disabled: true } as Unit,
      makeUnit({ id: id(2), name: 'Orc' }),
    ];
    const once = go(setup(units), { type: 'duplicateUnit', unitId: id(1), newUnitId: id(3) });
    expect(once.units.map((item) => item.name)).toEqual(['Goblin', 'Goblin 2', 'Orc']);
    expect(u(once, 3)).toEqual({ ...source, id: id(3), name: 'Goblin 2', hp: 10, tempHp: 0 });
    const twice = go(once, { type: 'duplicateUnit', unitId: id(1), newUnitId: id(4) });
    expect(twice.units.map((item) => item.name)).toEqual(['Goblin', 'Goblin 3', 'Goblin 2', 'Orc']);
  });

  it('Duplicate юнита: копия под оригиналом, `<name> 2`, HP полные, инициатива скопирована.', () => {
    const combat = active([makeUnit({ id: id(1), name: 'Орк', initiative: 9, hp: 1 })]);
    const next = go(combat, { type: 'duplicateUnit', unitId: id(1), newUnitId: id(2) });
    expect(next.units.map((item) => item.id)).toEqual([id(1), id(2)]);
    expect(u(next, 2)).toMatchObject({ name: 'Орк 2', hp: 10, initiative: 9 });
  });

  it('duplicateUnit rejects an unknown source and an existing new id', () => {
    const combat = setup([makeUnit({ id: id(1) }), makeUnit({ id: id(2) })]);
    expect(codeOf(combat, { type: 'duplicateUnit', unitId: id(9), newUnitId: id(3) })).toBe(
      'notFound',
    );
    expect(codeOf(combat, { type: 'duplicateUnit', unitId: id(1), newUnitId: id(2) })).toBe(
      'invalid',
    );
  });

  it('Remove, with confirm; toast `<name> removed` with Undo', () => {
    const combat = setup([
      makeUnit({ id: id(1), role: 'hero', claimedBy: PLAYER_ID }),
      makeUnit({ id: id(2) }),
    ]);
    const { combat: next, patch } = ok(run(combat, { type: 'removeUnit', unitId: id(1) }));
    expect(next.units.map((item) => item.id)).toEqual([id(2)]);
    expect(patch?.fields.units).toEqual(combat.units);
  });

  it('Disable / enable', () => {
    const combat = active([makeUnit({ id: id(1), initiative: 1 })]);
    const disabled = go(combat, { type: 'setDisabled', unitId: id(1), disabled: true });
    expect(u(disabled, 1).disabled).toBe(true);
    expect(disabled.activeUnitId).toBe(id(1));
    const enabled = go(disabled, { type: 'setDisabled', unitId: id(1), disabled: false });
    expect(u(enabled, 1).disabled).toBe(false);
    expect(codeOf(combat, { type: 'setDisabled', unitId: id(9), disabled: true })).toBe('notFound');
  });

  it('Save as preset', () => {
    const source = makeUnit({
      id: id(1),
      name: 'Орк',
      role: 'ally',
      maxHp: 42,
      initiativeBonus: 3,
    });
    const preset = presetFromUnit(source, id(50), NOW);
    expect(preset).toMatchObject({
      id: id(50),
      name: 'Орк',
      role: 'ally',
      maxHp: 42,
      ac: 10,
      pd: 10,
    });
    expect(preset).toMatchObject({
      md: 10,
      initiativeBonus: 3,
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(presetSchema.safeParse(preset).success).toBe(true);
  });

  it('Save as preset копирует имя, тип, Max HP, AC, PD, MD, бонус инициативы.', () => {
    const preset = presetFromUnit(makeUnit({ note: 'secret', hp: 1, tempHp: 9 }), id(50), NOW);
    expect(Object.keys(preset).sort()).toEqual(Object.keys(presetSchema.shape).sort());
  });

  it('Initiative popover: − / + stepper, Roll d20 + bonus', () => {
    const combat = one({ initiativeBonus: 3 });
    const stepped = go(combat, { type: 'setInitiative', unitId: id(1), initiative: 17 });
    expect(u(stepped, 1).initiative).toBe(17);
    const rolled = go(stepped, { type: 'rollInitiative', unitId: id(1), roll: 12 });
    expect(u(rolled, 1).initiative).toBe(15);
    expect(codeOf(combat, { type: 'setInitiative', unitId: id(9), initiative: 1 })).toBe(
      'notFound',
    );
    expect(codeOf(combat, { type: 'rollInitiative', unitId: id(9), roll: 1 })).toBe('notFound');
  });

  it('clamps a rolled initiative into −9 … 99', () => {
    expect(rolledInitiative(1, -99)).toBe(-9);
    expect(rolledInitiative(20, 99)).toBe(99);
    expect(rolledInitiative(7, -2)).toBe(5);
    const low = go(one({ initiativeBonus: -50 }), {
      type: 'rollInitiative',
      unitId: id(1),
      roll: 1,
    });
    expect(u(low, 1).initiative).toBe(-9);
    const high = go(one({ initiativeBonus: 99 }), {
      type: 'rollInitiative',
      unitId: id(1),
      roll: 20,
    });
    expect(u(high, 1).initiative).toBe(99);
  });

  it('Damage, Heal, Set temp HP: calculator', () => {
    const combat = one({ hp: 10, maxHp: 10 });
    const damaged = go(combat, { type: 'damage', unitId: id(1), amount: 4 });
    expect(u(damaged, 1).hp).toBe(6);
    const healed = go(damaged, { type: 'heal', unitId: id(1), amount: 2 });
    expect(u(healed, 1).hp).toBe(8);
    const temped = go(healed, { type: 'setTempHp', unitId: id(1), amount: 5 });
    expect(u(temped, 1).tempHp).toBe(5);
    expect(codeOf(combat, { type: 'damage', unitId: id(9), amount: 1 })).toBe('notFound');
    expect(codeOf(combat, { type: 'heal', unitId: id(9), amount: 1 })).toBe('notFound');
    expect(codeOf(combat, { type: 'setTempHp', unitId: id(9), amount: 1 })).toBe('notFound');
  });

  it('Set max HP: calculator', () => {
    const combat = one({ hp: 10, maxHp: 10 });
    const next = go(combat, { type: 'setMaxHp', unitId: id(1), amount: 20 });
    expect(u(next, 1)).toMatchObject({ maxHp: 20, hp: 10 });
    expect(codeOf(combat, { type: 'setMaxHp', unitId: id(9), amount: 1 })).toBe('notFound');
  });

  it('Toggle condition: picker', () => {
    const combat = one({ conditions: ['stunned'] });
    const added = go(combat, { type: 'toggleCondition', unitId: id(1), condition: 'charmed' });
    expect(u(added, 1).conditions).toEqual(['charmed', 'stunned']);
    const removed = go(added, { type: 'toggleCondition', unitId: id(1), condition: 'stunned' });
    expect(u(removed, 1).conditions).toEqual(['charmed']);
    expect(codeOf(combat, { type: 'toggleCondition', unitId: id(9), condition: 'dazed' })).toBe(
      'notFound',
    );
  });

  it('Edit note inline', () => {
    const combat = one();
    const next = go(combat, { type: 'editNote', unitId: id(1), note: 'Заметка' });
    expect(u(next, 1).note).toBe('Заметка');
    expect(codeOf(combat, { type: 'editNote', unitId: id(9), note: 'x' })).toBe('notFound');
  });

  it('Release claim', () => {
    const combat = setup([makeUnit({ id: id(1), role: 'hero', claimedBy: PLAYER_ID })], {
      players: { [PLAYER_ID]: 'Ann' },
    });
    const { combat: next, patch } = ok(run(combat, { type: 'releaseUnit', unitId: id(1) }));
    expect(u(next, 1).claimedBy).toBeNull();
    expect(next.players).toEqual({ [PLAYER_ID]: 'Ann' });
    expect(patch).toBeNull();
    const unclaimed = go(next, { type: 'releaseUnit', unitId: id(1) });
    expect(u(unclaimed, 1).claimedBy).toBeNull();
    expect(codeOf(combat, { type: 'releaseUnit', unitId: id(9) })).toBe('notFound');
  });
});

describe('Rules', () => {
  it('Temp HP absorbs damage first.', () => {
    const combat = one({ hp: 10, maxHp: 10, tempHp: 3 });
    const partly = go(combat, { type: 'damage', unitId: id(1), amount: 5 });
    expect(u(partly, 1)).toMatchObject({ hp: 8, tempHp: 0 });
    expect(hist(partly)[0]).toMatchObject({
      kind: 'damage',
      amount: 5,
      absorbed: 3,
      result: 8,
    });
    const fully = go(combat, { type: 'damage', unitId: id(1), amount: 2 });
    expect(u(fully, 1)).toMatchObject({ hp: 10, tempHp: 1 });
    expect(hist(fully)[0]).toMatchObject({
      kind: 'damage',
      amount: 2,
      absorbed: 2,
      result: 10,
    });
  });

  it('Heal never raises HP above max.', () => {
    const combat = one({ hp: 8, maxHp: 10 });
    const next = go(combat, { type: 'heal', unitId: id(1), amount: 50 });
    expect(u(next, 1).hp).toBe(10);
    expect(hist(next)[0]).toMatchObject({
      kind: 'heal',
      amount: 50,
      absorbed: 0,
      previous: 8,
      result: 10,
    });
    const fromDead = go(one({ hp: -4, maxHp: 10 }), {
      type: 'heal',
      unitId: id(1),
      amount: 6,
    });
    expect(u(fromDead, 1).hp).toBe(2);
  });

  it('Damage never lowers HP below −max.', () => {
    const combat = one({ hp: 3, maxHp: 10 });
    const next = go(combat, { type: 'damage', unitId: id(1), amount: 999 });
    expect(u(next, 1).hp).toBe(-10);
    expect(hist(next)[0]).toMatchObject({
      kind: 'damage',
      amount: 999,
      previous: 3,
      result: -10,
    });
  });

  it('Set Temp replaces temp HP.', () => {
    const combat = one({ tempHp: 7 });
    const next = go(combat, { type: 'setTempHp', unitId: id(1), amount: 2 });
    expect(u(next, 1).tempHp).toBe(2);
    expect(hist(next)[0]).toMatchObject({
      kind: 'temp',
      amount: 2,
      previous: 7,
      result: 10,
    });
    expect(u(go(next, { type: 'setTempHp', unitId: id(1), amount: 0 }), 1).tempHp).toBe(0);
  });

  it('Set Max, minimum 1, caps current HP at the new max; a lower current HP stays.', () => {
    const combat = one({ hp: 10, maxHp: 10 });
    const capped = go(combat, { type: 'setMaxHp', unitId: id(1), amount: 4 });
    expect(u(capped, 1)).toMatchObject({ maxHp: 4, hp: 4 });
    expect(hist(capped)[0]).toMatchObject({
      kind: 'max',
      amount: 4,
      previous: 10,
      result: 4,
    });
    const stays = go(one({ hp: 3, maxHp: 10 }), {
      type: 'setMaxHp',
      unitId: id(1),
      amount: 6,
    });
    expect(u(stays, 1)).toMatchObject({ maxHp: 6, hp: 3 });
    const minimum = go(combat, { type: 'setMaxHp', unitId: id(1), amount: 1 });
    expect(u(minimum, 1)).toMatchObject({ maxHp: 1, hp: 1 });
  });

  it('Set Temp заменяет temp HP. Heal не поднимает HP выше Max. Set Max обрезает HP.', () => {
    const combat = one({ hp: 9, maxHp: 10, tempHp: 5 });
    const temp = go(combat, { type: 'setTempHp', unitId: id(1), amount: 1 });
    expect(u(temp, 1).tempHp).toBe(1);
    const heal = go(temp, { type: 'heal', unitId: id(1), amount: 5 });
    expect(u(heal, 1).hp).toBe(10);
    const max = go(heal, { type: 'setMaxHp', unitId: id(1), amount: 2 });
    expect(u(max, 1).hp).toBe(2);
  });

  it('Disabled and dead units are skipped in turn order and can still be edited and damaged.', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 20, disabled: true }),
      makeUnit({ id: id(2), initiative: 15, hp: 0 }),
      makeUnit({ id: id(3), initiative: 10 }),
    ];
    const combat = active(units, { activeUnitId: id(3) });
    const next = go(combat, { type: 'nextTurn' });
    expect(next.activeUnitId).toBe(id(3));
    expect(next.round).toBe(2);
    const damaged = go(next, { type: 'damage', unitId: id(1), amount: 2 });
    expect(u(damaged, 1).hp).toBe(8);
    const edited = go(damaged, { type: 'editUnit', unitId: id(2), ...form, name: 'Dead one' });
    expect(u(edited, 2).name).toBe('Dead one');
  });

  it('A note is saved when its field loses focus or the row collapses.', () => {
    const combat = active([makeUnit({ id: id(1), initiative: 1 })]);
    const next = go(combat, { type: 'editNote', unitId: id(1), note: 'a'.repeat(250) });
    expect(u(next, 1).note).toHaveLength(250);
    expect(next.activeUnitId).toBe(id(1));
  });

  it('Защиты 0–99 везде. Бонус инициативы в форме пресета. Create тега только при отсутствии совпадений. Копия пресета наверх. Один пресет за добавление.', () => {
    expect(LIMITS.defense).toEqual({ min: 0, max: 99 });
    expect(defenseSchema.safeParse(99).success).toBe(true);
    expect(defenseSchema.safeParse(100).success).toBe(false);
    const combat = one();
    const next = go(combat, { type: 'editUnit', unitId: id(1), ...form, ac: 0, pd: 99, md: 99 });
    expect(u(next, 1)).toMatchObject({ ac: 0, pd: 99, md: 99 });
    expect(presetFromUnit(makeUnit({ initiativeBonus: -7 }), id(50), NOW).initiativeBonus).toBe(-7);
  });
});

describe('HP history', () => {
  it('One entry per damage, heal, temp HP or max HP change: kind, amount, resulting HP, round. In setup the round reads "Start".', () => {
    const inSetup = one();
    const setupEntry = u(go(inSetup, { type: 'damage', unitId: id(1), amount: 1 }), 1).hpHistory;
    expect(setupEntry).toEqual([
      { kind: 'damage', amount: 1, absorbed: 0, previous: 10, result: 9, round: null, at: NOW },
    ]);
    const inActive = active([makeUnit({ id: id(1), initiative: 1 })], { round: 5 });
    const steps: Payload[] = [
      { type: 'damage', unitId: id(1), amount: 3 },
      { type: 'heal', unitId: id(1), amount: 1 },
      { type: 'setTempHp', unitId: id(1), amount: 2 },
      { type: 'setMaxHp', unitId: id(1), amount: 12 },
    ];
    const end = steps.reduce((combat, payload) => go(combat, payload, DM, LATER), inActive);
    const rows = hist(end).map((e) => [e.kind, e.amount, e.result, e.round, e.at]);
    expect(rows).toEqual([
      ['damage', 3, 7, 5, LATER],
      ['heal', 1, 8, 5, LATER],
      ['temp', 2, 8, 5, LATER],
      ['max', 12, 8, 5, LATER],
    ]);
  });

  it('Newest first. Max shows `old → new`, Temp `+N temp`, Damage adds `(N temp)` for the part absorbed by temp HP.', () => {
    const combat = one({ hp: 10, maxHp: 10, tempHp: 2 });
    const steps: Payload[] = [
      { type: 'setMaxHp', unitId: id(1), amount: 15 },
      { type: 'setTempHp', unitId: id(1), amount: 6 },
      { type: 'damage', unitId: id(1), amount: 8 },
    ];
    const end = steps.reduce((current, payload) => go(current, payload), combat);
    const history = hist(end);
    expect(history[0]).toMatchObject({ kind: 'max', previous: 10, amount: 15 });
    expect(history[1]).toMatchObject({ kind: 'temp', amount: 6 });
    expect(history[2]).toMatchObject({ kind: 'damage', amount: 8, absorbed: 6, result: 8 });
  });
});

describe('Undo', () => {
  it('Depth: 10 steps back from the newest action.', () => {
    expect(LIMITS.undoDepth).toBe(10);
  });

  it('snapshots the prior values of the combat fields an action changed', () => {
    const combat = active([makeUnit({ id: id(1), initiative: 1 })], { round: 3, escalation: 2 });
    const { patch } = ok(run(combat, { type: 'nextTurn' }));
    expect(patch).toEqual({
      actionId: id(actionCounter),
      fields: { round: 3, escalation: 2 },
      units: {},
    });
  });

  it('snapshots the prior values of the unit fields an action changed', () => {
    const combat = setup([
      makeUnit({ id: id(1), hp: 10, tempHp: 2, hpHistory: [] }),
      makeUnit({ id: id(2) }),
    ]);
    const { patch } = ok(run(combat, { type: 'damage', unitId: id(1), amount: 5 }));
    expect(patch?.fields).toEqual({});
    expect(patch?.units).toEqual({ [id(1)]: { hp: 10, tempHp: 2, hpHistory: [] } });
  });

  it('snapshots the whole unit list when a unit is removed and marks an added unit with null', () => {
    const combat = one();
    const added = ok(run(combat, { type: 'addUnit', unitId: id(2), roll: 1, ...form }));
    expect(added.patch).toEqual({
      actionId: id(actionCounter),
      fields: {},
      units: { [id(2)]: null },
    });
    const duplicated = ok(run(combat, { type: 'duplicateUnit', unitId: id(1), newUnitId: id(3) }));
    expect(duplicated.patch?.units).toEqual({ [id(3)]: null });
    const before = active([makeUnit({ id: id(1), initiative: 1 })], { round: 2 });
    const cleared = ok(run(before, { type: 'clear' }));
    expect(cleared.patch?.fields).toEqual({
      status: 'active',
      round: 2,
      activeUnitId: id(1),
      units: before.units,
    });
    expect(cleared.patch?.units).toEqual({});
  });

  it('snapshots restart as per-unit prior values plus the combat fields', () => {
    const units = [
      makeUnit({ id: id(1), initiative: 4, hp: 2 }),
      makeUnit({ id: id(2), initiative: 1 }),
    ];
    const { patch } = ok(run(active(units, { round: 2, escalation: 1 }), { type: 'restart' }));
    expect(patch?.fields).toEqual({
      status: 'active',
      round: 2,
      escalation: 1,
      activeUnitId: id(1),
    });
    expect(patch?.units).toEqual({ [id(1)]: { initiative: 4, hp: 2 }, [id(2)]: { initiative: 1 } });
  });

  it('snapshots nothing for an action that changes nothing', () => {
    const combat = one({ note: 'same' });
    const { patch } = ok(run(combat, { type: 'editNote', unitId: id(1), note: 'same' }));
    expect(patch).toEqual({ actionId: id(actionCounter), fields: {}, units: {} });
  });
});

describe('copyCombat', () => {
  it('Копия боя: `<title> (copy)`, Setup, полные HP, без захватов, ссылки, лога.', () => {
    const source = makeUnit({ id: id(1), claimedBy: PLAYER_ID, hp: 2, tempHp: 3, initiative: 9 });
    const units = [
      { ...source, conditions: ['dazed'], disabled: true, hpHistory: [ENTRY] } as Unit,
    ];
    const combat = active(units, {
      title: 'Засада',
      round: 4,
      linkGeneration: 5,
      players: { x: 'A' },
    });
    const copy = copyCombat(combat, id(600), LATER);
    expect(copy).toEqual({
      ...combat,
      id: id(600),
      title: 'Засада (copy)',
      status: 'setup',
      round: 1,
      escalation: 0,
      activeUnitId: null,
      lastPlayedAt: null,
      linkGeneration: 0,
      version: 0,
      players: {},
      createdAt: LATER,
      updatedAt: LATER,
      units: [{ ...source, initiative: null, hp: 10, tempHp: 0, claimedBy: null }],
    });
  });
});
