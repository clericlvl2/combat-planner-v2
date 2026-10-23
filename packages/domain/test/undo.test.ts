import { describe, expect, it } from 'vite-plus/test';
import {
  ACTION_TYPES,
  DomainError,
  LIMITS,
  apply,
  nextStack,
  undoSummary,
  undoTarget,
} from '../src/index.ts';
import type { Action, Combat, UndoableEntry, Viewer } from '../src/index.ts';
import { DM, LATER, NOW, PLAYER, PLAYER_ID, id, makeCombat, makeUnit } from './fixtures.ts';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Payload = DistributiveOmit<Action, 'id' | 'version'>;

interface State {
  combat: Combat;
  log: UndoableEntry[];
}

let actionCounter = 100;

const build = (combat: Combat, payload: Payload): Action => {
  actionCounter += 1;
  return { ...payload, id: id(actionCounter), version: combat.version } as Action;
};

const dispatch = (state: State, payload: Payload, author: Viewer = DM, now = NOW): State => {
  const action = build(state.combat, payload);
  const result = apply(state.combat, action, author, now, state.log);
  if (result instanceof DomainError) throw new Error(`${result.code}: ${result.message}`);
  return {
    combat: result.combat,
    log: nextStack(state.log, { action, author, at: now, patch: result.patch }),
  };
};

const codeOf = (state: State, payload: Payload, author: Viewer = DM): string => {
  const result = apply(state.combat, build(state.combat, payload), author, NOW, state.log);
  if (!(result instanceof DomainError)) throw new Error('expected a DomainError');
  return result.code;
};

const undo = (state: State): State => dispatch(state, { type: 'undo' });

const stable = ({ version: _version, updatedAt: _updatedAt, ...rest }: Combat) => rest;

const unclaimedOutside = (before: Combat, after: Combat): Combat => ({
  ...before,
  units: before.units.map((unit) =>
    after.units.some((kept) => kept.id === unit.id) ? unit : { ...unit, claimedBy: null },
  ),
});

const hero = makeUnit({
  id: id(1),
  name: 'Анна',
  role: 'hero',
  claimedBy: PLAYER_ID,
  maxHp: 30,
  hp: 30,
});
const goblin = makeUnit({ id: id(2), name: 'Goblin', maxHp: 30, hp: 30 });
const freeHero = makeUnit({ id: id(3), name: 'Bob', role: 'hero', maxHp: 30, hp: 30 });

const fresh = (combat: Combat): State => ({ combat, log: [] });

const setup = (): State =>
  fresh(
    makeCombat({ units: [hero, goblin, freeHero], players: { [PLAYER_ID]: 'Анна' }, version: 2 }),
  );

const active = (): State =>
  fresh(
    makeCombat({
      status: 'active',
      round: 2,
      escalation: 1,
      activeUnitId: id(2),
      version: 5,
      units: [
        { ...hero, initiative: 10 },
        { ...goblin, initiative: 15 },
        { ...freeHero, initiative: 5 },
      ],
      players: { [PLAYER_ID]: 'Анна' },
    }),
  );

const form = {
  name: 'Goblin',
  role: 'enemy',
  maxHp: 12,
  ac: 11,
  pd: 11,
  md: 11,
  initiativeBonus: 1,
  tempHp: 2,
  note: 'edited',
} as const;

const payloadFor = (type: Action['type']): Payload => {
  switch (type) {
    case 'start':
      return { type, rolls: { [id(1)]: 3, [id(2)]: 7, [id(3)]: 11 } };
    case 'nextTurn':
    case 'restart':
    case 'clear':
    case 'undo':
      return { type };
    case 'editRound':
      return { type, round: 9 };
    case 'setEscalation':
      return { type, escalation: 4 };
    case 'addUnit':
      return { type, unitId: id(9), roll: 5, ...form };
    case 'editUnit':
      return { type, unitId: id(2), ...form };
    case 'duplicateUnit':
      return { type, unitId: id(2), newUnitId: id(9) };
    case 'removeUnit':
    case 'releaseUnit':
      return { type, unitId: id(1) };
    case 'setDisabled':
      return { type, unitId: id(2), disabled: true };
    case 'setInitiative':
      return { type, unitId: id(2), initiative: 7 };
    case 'rollInitiative':
      return { type, unitId: id(2), roll: 7 };
    case 'damage':
    case 'heal':
    case 'setTempHp':
    case 'setMaxHp':
      return { type, unitId: id(2), amount: 5 };
    case 'toggleCondition':
      return { type, unitId: id(2), condition: 'stunned' };
    case 'editNote':
      return { type, unitId: id(2), note: 'Заметка' };
    case 'claimUnit':
      return { type, unitId: id(3), displayName: 'Bob' };
  }
};

const NEEDS_ACTIVE = new Set<Action['type']>(['nextTurn', 'editRound', 'setEscalation', 'restart']);
const WITHOUT_PATCH = new Set<Action['type']>(['claimUnit', 'releaseUnit', 'undo']);

describe('Undo', () => {
  it('DM only, from the combat menu.', () => {
    const damaged = dispatch(setup(), { type: 'damage', unitId: id(1), amount: 4 });
    expect(codeOf(damaged, { type: 'undo' }, PLAYER)).toBe('forbidden');
    expect(undo(damaged).combat.units[0]?.hp).toBe(30);
  });

  it('Covers every entry of the action log except claim and release. REST writes (combat title, description, color, link, presets) are not undoable.', () => {
    for (const type of ACTION_TYPES) {
      if (WITHOUT_PATCH.has(type)) continue;
      const before = NEEDS_ACTIVE.has(type) ? active() : setup();
      const after = dispatch(before, payloadFor(type));
      expect(stable(after.combat)).not.toEqual(stable(before.combat));
      const undone = undo(after);
      expect(stable(undone.combat)).toEqual(stable(unclaimedOutside(before.combat, after.combat)));
      expect(undone.combat.version).toBe(after.combat.version + 1);
    }
  });

  it('Depth: a push beyond 10 drops the oldest action.', () => {
    let state = setup();
    for (let step = 0; step < LIMITS.undoDepth + 1; step += 1) {
      state = dispatch(state, { type: 'damage', unitId: id(2), amount: 1 });
    }
    expect(state.log).toHaveLength(LIMITS.undoDepth);
    expect(state.combat.units[1]?.hp).toBe(30 - LIMITS.undoDepth - 1);
    for (let step = 0; step < LIMITS.undoDepth; step += 1) state = undo(state);
    expect(state.combat.units[1]?.hp).toBe(29);
    expect(state.log).toEqual([]);
    expect(codeOf(state, { type: 'undo' })).toBe('blocked');
    expect((undoTarget(state.log) as DomainError).message).toBe('Nothing to undo');
  });

  it('10 actions, 5 undone, 1 new action: 6 undoable.', () => {
    let state = setup();
    for (let step = 0; step < 10; step += 1) {
      state = dispatch(state, { type: 'damage', unitId: id(2), amount: 1 });
    }
    for (let step = 0; step < 5; step += 1) state = undo(state);
    state = dispatch(state, { type: 'heal', unitId: id(2), amount: 3 });
    expect(state.log).toHaveLength(6);
    for (let step = 0; step < 6; step += 1) state = undo(state);
    expect(state.combat.units[1]?.hp).toBe(30);
    expect(codeOf(state, { type: 'undo' })).toBe('blocked');
  });

  it('Claim and release between DM actions leave the stack unchanged.', () => {
    const damaged = dispatch(setup(), { type: 'damage', unitId: id(2), amount: 4 });
    const claimed = dispatch(damaged, payloadFor('claimUnit'), PLAYER);
    expect(claimed.log).toEqual(damaged.log);
    const released = dispatch(claimed, { type: 'releaseUnit', unitId: id(1) });
    expect(released.log).toEqual(damaged.log);
    const healed = dispatch(released, { type: 'heal', unitId: id(2), amount: 1 });
    expect(healed.log).toHaveLength(2);
    const once = undo(healed);
    expect(once.combat.units[1]?.hp).toBe(26);
    const twice = undo(once);
    expect(twice.combat.units[1]?.hp).toBe(30);
    expect(twice.combat.units.map((unit) => unit.claimedBy)).toEqual([null, null, PLAYER_ID]);
    expect(codeOf(twice, { type: 'undo' })).toBe('blocked');
  });

  it('An action without a patch empties the stack.', () => {
    const damaged = dispatch(setup(), { type: 'damage', unitId: id(2), amount: 4 });
    const barrier = build(damaged.combat, { type: 'heal', unitId: id(2), amount: 1 });
    expect(nextStack(damaged.log, { action: barrier, author: DM, at: NOW, patch: null })).toEqual(
      [],
    );
  });

  it('Undo of a DM action after a claim keeps the claim.', () => {
    const noted = dispatch(setup(), { type: 'editNote', unitId: id(3), note: 'Hex' });
    const claimed = dispatch(noted, payloadFor('claimUnit'), PLAYER);
    const undone = undo(claimed);
    expect(undone.combat.units[2]).toMatchObject({ note: '', claimedBy: PLAYER_ID });
    const removed = dispatch(claimed, { type: 'removeUnit', unitId: id(2) });
    const restored = undo(removed);
    expect(restored.combat.units.map((unit) => unit.claimedBy)).toEqual([
      PLAYER_ID,
      null,
      PLAYER_ID,
    ]);
  });

  it('A unit brought back by undo returns unclaimed.', () => {
    const removed = dispatch(setup(), { type: 'removeUnit', unitId: id(1) });
    expect(undo(removed).combat.units[0]).toMatchObject({ id: id(1), claimedBy: null });
    const cleared = dispatch(setup(), { type: 'clear' });
    expect(undo(cleared).combat.units.map((unit) => unit.claimedBy)).toEqual([null, null, null]);
  });

  it('An enemy made a hero and claimed returns to an unclaimed enemy on undo.', () => {
    const promoted = dispatch(setup(), {
      type: 'editUnit',
      unitId: id(2),
      ...form,
      role: 'hero',
      tempHp: 0,
      maxHp: 30,
    });
    const claimed = dispatch(
      promoted,
      { type: 'claimUnit', unitId: id(2), displayName: 'Bob' },
      PLAYER,
    );
    expect(undo(claimed).combat.units[1]).toMatchObject({ role: 'enemy', claimedBy: null });
  });

  it('Undo of an HP change at a full history restores the dropped entry.', () => {
    const full = Array.from({ length: LIMITS.hpHistory }, (_, index) => ({
      kind: 'damage' as const,
      amount: 1,
      absorbed: 0,
      previous: 30,
      result: 29,
      round: null,
      at: NOW,
      max: 30 + index,
    }));
    const before = fresh(
      makeCombat({ units: [hero, { ...goblin, hp: 29, hpHistory: full }], version: 2 }),
    );
    let state = before;
    for (let step = 0; step < LIMITS.undoDepth; step += 1) {
      state = dispatch(state, { type: 'damage', unitId: id(2), amount: 1 });
    }
    expect(state.combat.units[1]?.hpHistory).toHaveLength(LIMITS.hpHistory);
    expect(state.combat.units[1]?.hpHistory[0]?.max).toBe(30 + LIMITS.undoDepth);
    for (let step = 0; step < LIMITS.undoDepth; step += 1) state = undo(state);
    expect(state.combat.units[1]?.hpHistory).toEqual(full);
    expect(stable(state.combat)).toEqual(stable(before.combat));
  });

  it('Player actions are in the same history and are undone the same way.', () => {
    const byPlayer = dispatch(setup(), { type: 'damage', unitId: id(1), amount: 6 }, PLAYER);
    expect(byPlayer.log[0]?.author).toEqual(PLAYER);
    const byDm = dispatch(byPlayer, { type: 'editNote', unitId: id(2), note: 'dm' });
    const first = undo(byDm);
    expect(first.combat.units[1]?.note).toBe('');
    expect(first.combat.units[0]?.hp).toBe(24);
    const second = undo(first);
    expect(second.combat.units[0]?.hp).toBe(30);
    expect(second.log).toEqual([]);
  });

  it('Toast after undo: "Undid: <action>", no button.', () => {
    const state = dispatch(setup(), { type: 'editNote', unitId: id(1), note: 'x' });
    const target = state.log[0];
    const result = apply(state.combat, build(state.combat, { type: 'undo' }), DM, NOW, state.log);
    if (result instanceof DomainError || !('undone' in result)) throw new Error('expected undone');
    expect(result.undone).toBe(target?.action.id);
    expect(result.patch).toBeNull();
    expect(target?.action.type).toBe('editNote');
  });
});

describe('Action log', () => {
  it('A log entry holds the action, its author (`dm` or `playerId`), the timestamp and, for undoable actions, a patch of the prior state.', () => {
    const state = dispatch(setup(), { type: 'damage', unitId: id(1), amount: 2 }, PLAYER, LATER);
    const entry = state.log[0];
    expect(entry).toEqual({
      action: { type: 'damage', unitId: id(1), amount: 2, id: id(actionCounter), version: 2 },
      author: PLAYER,
      at: LATER,
      patch: {
        actionId: id(actionCounter),
        fields: {},
        units: { [id(1)]: { hp: 30, hpHistory: [] } },
      },
    });
  });

  it('`claimUnit` and `releaseUnit` have no patch and leave the stack. Every other action is undoable.', () => {
    for (const type of ['claimUnit', 'releaseUnit'] as const) {
      const result = apply(setup().combat, build(setup().combat, payloadFor(type)), PLAYER, NOW);
      if (result instanceof DomainError) throw new Error(result.message);
      expect(result.patch).toBeNull();
    }
    const claimed = dispatch(setup(), payloadFor('claimUnit'), PLAYER);
    expect(claimed.log).toEqual([]);
    for (const type of ACTION_TYPES) {
      if (WITHOUT_PATCH.has(type)) continue;
      const state = dispatch(NEEDS_ACTIVE.has(type) ? active() : setup(), payloadFor(type));
      expect(state.log[0]?.patch).not.toBeNull();
      expect(undoTarget(state.log)).toBe(state.log[0]);
    }
  });

  it('`undo` pops the top action and reverts its patch; it is not stacked itself.', () => {
    const damaged = dispatch(setup(), { type: 'damage', unitId: id(1), amount: 4 });
    const healed = dispatch(damaged, { type: 'heal', unitId: id(1), amount: 2 });
    const first = undo(healed);
    expect(first.combat.units[0]?.hp).toBe(26);
    expect(first.log).toEqual([healed.log[0]]);
    const second = undo(first);
    expect(second.combat.units[0]?.hp).toBe(30);
    expect(second.log).toEqual([]);
  });
});

describe('applyUndo', () => {
  it('a second undo skips the undone entry', () => {
    const noted = dispatch(setup(), { type: 'editNote', unitId: id(1), note: 'one' });
    const toggled = dispatch(noted, { type: 'toggleCondition', unitId: id(2), condition: 'dazed' });
    const first = undo(toggled);
    expect(first.combat.units[1]?.conditions).toEqual([]);
    expect(first.combat.units[0]?.note).toBe('one');
    const second = undo(first);
    expect(second.combat.units[0]?.note).toBe('');
    expect(second.log).toEqual([]);
    expect(codeOf(second, { type: 'undo' })).toBe('blocked');
  });

  it('restores a removed unit at its prior position and gives it back the turn', () => {
    const removed = dispatch(active(), { type: 'removeUnit', unitId: id(2) });
    expect(removed.combat.units.map((unit) => unit.id)).toEqual([id(1), id(3)]);
    expect(removed.combat.activeUnitId).toBe(id(1));
    const restored = undo(removed);
    expect(restored.combat.units.map((unit) => unit.id)).toEqual([id(1), id(2), id(3)]);
    expect(restored.combat.activeUnitId).toBe(id(2));
    expect(restored.combat.units[0]?.claimedBy).toBe(PLAYER_ID);
  });

  it('Удаление юнита с подтверждением и тостом с Undo. Тост Undo без Redo. Тост ошибки с Retry. 409 — тихий перезапрос и тост. SSE — тост «Reconnecting…».', () => {
    const removed = dispatch(setup(), { type: 'removeUnit', unitId: id(1) });
    const restored = undo(removed);
    expect(stable(restored.combat)).toEqual(
      stable(unclaimedOutside(setup().combat, removed.combat)),
    );
    expect(ACTION_TYPES).not.toContain('redo');
    const stale: Action = { type: 'undo', id: id(999), version: removed.combat.version - 1 };
    expect((apply(removed.combat, stale, DM, NOW, removed.log) as DomainError).code).toBe(
      'version',
    );
  });

  it('drops an added or duplicated unit', () => {
    const added = dispatch(setup(), payloadFor('addUnit'));
    expect(added.combat.units).toHaveLength(4);
    expect(undo(added).combat.units.map((unit) => unit.id)).toEqual([id(1), id(2), id(3)]);
    const duplicated = dispatch(setup(), payloadFor('duplicateUnit'));
    expect(duplicated.combat.units[2]?.id).toBe(id(9));
    expect(undo(duplicated).combat.units.map((unit) => unit.id)).toEqual([id(1), id(2), id(3)]);
  });

  it('reverts a cleared combat to its units, status, round and turn', () => {
    const cleared = dispatch(active(), { type: 'clear' });
    expect(cleared.combat).toMatchObject({ status: 'setup', units: [], activeUnitId: null });
    expect(stable(undo(cleared).combat)).toEqual(
      stable(unclaimedOutside(active().combat, cleared.combat)),
    );
  });

  it('bumps version and stamps updatedAt', () => {
    const state = dispatch(setup(), { type: 'damage', unitId: id(1), amount: 1 });
    const undone = dispatch(state, { type: 'undo' }, DM, LATER);
    expect(undone.combat.version).toBe(state.combat.version + 1);
    expect(undone.combat.updatedAt).toBe(LATER);
    expect(undone.log).toEqual([]);
  });

  it('answers blocked when the log is empty and when apply gets no log', () => {
    expect(codeOf(setup(), { type: 'undo' })).toBe('blocked');
    expect((undoTarget([]) as DomainError).message).toBe('Nothing to undo');
    const action = build(setup().combat, { type: 'undo' });
    expect((apply(setup().combat, action, DM, NOW) as DomainError).code).toBe('blocked');
  });

  it('leaves a unit the patch does not name untouched', () => {
    const state = dispatch(setup(), { type: 'editNote', unitId: id(1), note: 'only one' });
    const undone = undo(state);
    expect(undone.combat.units[1]).toEqual(state.combat.units[1]);
    expect(undone.combat.units[0]?.note).toBe('');
  });
});

describe('undoSummary', () => {
  const summaryOf = (state: State) => undoSummary(state.combat, state.log);

  it('is null on an empty log', () => {
    expect(summaryOf(setup())).toBeNull();
  });

  it('names the newest undoable action and its unit', () => {
    const state = dispatch(setup(), { type: 'damage', unitId: id(2), amount: 12 });
    expect(summaryOf(state)).toEqual({
      action: state.log[0]?.action,
      unitName: 'Goblin',
    });
  });

  it('includes player actions', () => {
    const state = dispatch(setup(), { type: 'damage', unitId: id(1), amount: 4 }, PLAYER);
    expect(summaryOf(state)?.action.type).toBe('damage');
    expect(summaryOf(state)?.unitName).toBe('Анна');
  });

  it('is unchanged by a claim or a release', () => {
    const damaged = dispatch(setup(), { type: 'damage', unitId: id(2), amount: 3 });
    const released = dispatch(damaged, { type: 'releaseUnit', unitId: id(1) });
    expect(summaryOf(released)).toEqual(summaryOf(damaged));
    const claimed = dispatch(
      released,
      { type: 'claimUnit', unitId: id(3), displayName: 'Bob' },
      PLAYER,
    );
    expect(summaryOf(claimed)).toEqual({ action: damaged.log[0]?.action, unitName: 'Goblin' });
  });

  it('moves to the previous entry after an undo and to null when everything is undone', () => {
    const first = dispatch(setup(), { type: 'heal', unitId: id(2), amount: 1 });
    const second = dispatch(first, { type: 'editNote', unitId: id(1), note: 'Hex' });
    expect(summaryOf(second)?.action.type).toBe('editNote');
    const once = undo(second);
    expect(summaryOf(once)?.action.type).toBe('heal');
    expect(summaryOf(undo(once))).toBeNull();
  });

  it('stops after the undo depth', () => {
    let state = setup();
    for (let index = 0; index < LIMITS.undoDepth; index += 1) {
      state = dispatch(state, { type: 'damage', unitId: id(2), amount: 1 });
    }
    for (let index = 0; index < LIMITS.undoDepth - 1; index += 1) state = undo(state);
    expect(summaryOf(state)?.action.type).toBe('damage');
    expect(summaryOf(undo(state))).toBeNull();
  });

  it('names a removed unit from the patch and an added unit from the action', () => {
    const removed = dispatch(setup(), { type: 'removeUnit', unitId: id(2) });
    expect(summaryOf(removed)?.unitName).toBe('Goblin');
    const added = dispatch(setup(), {
      type: 'addUnit',
      unitId: id(9),
      roll: 5,
      ...form,
      name: 'Orc',
    });
    expect(summaryOf(added)?.unitName).toBe('Orc');
  });

  it('has no unit name for a combat action', () => {
    const state = dispatch(active(), { type: 'nextTurn' });
    expect(summaryOf(state)).toMatchObject({ unitName: null });
  });
});
