import { apply, project } from '@combat-planner/domain';
import type { Action, Combat, PlayerCombat, Viewer } from '@combat-planner/domain';
import { describe, expect, it } from 'vite-plus/test';
import { ownTurnStarted, turnHeroOf } from '../../src/screens/PlayerView/ownTurn.ts';
import { MIKA, ferryCombat, unitIds } from '../../src/screens/PlayerView/PlayerView.scenarios.ts';

const DM: Viewer = { kind: 'dm' };
const NOW = '2026-10-16T12:00:00.000Z';
const ACTION_ID = '01JP000000000000000000ACT1';

type ActionBody<A extends Action = Action> = A extends Action ? Omit<A, 'id' | 'version'> : never;

const viewOf = (combat: Combat): PlayerCombat =>
  project(combat, { kind: 'player', playerId: MIKA });

function step(combat: Combat, body: ActionBody): Combat {
  const action = { ...body, id: ACTION_ID, version: combat.version } as Action;
  const result = apply(combat, action, DM, NOW);
  if (!('combat' in result)) throw new Error(`${body.type} was not applied`);
  return result.combat;
}

const startedAfter = (combat: Combat, body: ActionBody): boolean =>
  ownTurnStarted(viewOf(combat), viewOf(step(combat, body)));

const withIlseClaimed = (combat: Combat): Combat => ({
  ...combat,
  units: combat.units.map((unit) =>
    unit.id === unitIds.ilse ? { ...unit, claimedBy: MIKA } : unit,
  ),
});

const vashtiAlone = (combat: Combat): Combat => ({
  ...combat,
  units: combat.units.filter((unit) => unit.id === unitIds.vashti),
});

describe('turnHeroOf', () => {
  it('returns the own hero on its turn', () => {
    expect(turnHeroOf(viewOf(ferryCombat({ active: 'vashti' })))?.id).toBe(unitIds.vashti);
  });

  it('returns nothing on an enemy turn', () => {
    expect(turnHeroOf(viewOf(ferryCombat({ active: 'orc' })))).toBeUndefined();
  });

  it('returns nothing on the turn of another player hero', () => {
    expect(turnHeroOf(viewOf(ferryCombat({ active: 'aldric' })))).toBeUndefined();
  });

  it('returns nothing in setup', () => {
    expect(turnHeroOf(viewOf(ferryCombat({ status: 'setup' })))).toBeUndefined();
  });
});

describe('ownTurnStarted', () => {
  it('is true when the turn passes to the own hero', () => {
    expect(startedAfter(ferryCombat({ active: 'orc' }), { type: 'nextTurn' })).toBe(true);
  });

  it('is true when the combat starts on the own hero', () => {
    expect(
      startedAfter(ferryCombat({ status: 'setup' }), {
        type: 'start',
        rolls: { [unitIds.vashti]: 20 },
      }),
    ).toBe(true);
  });

  it('is true when the turn passes between two own heroes', () => {
    const combat = withIlseClaimed(ferryCombat({ active: 'vashti', ilse: true }));
    const next = step(combat, { type: 'nextTurn' });
    expect(next.activeUnitId).toBe(unitIds.ilse);
    expect(ownTurnStarted(viewOf(combat), viewOf(next))).toBe(true);
  });

  it('is true when the turn wraps back to the only acting own hero', () => {
    const combat = vashtiAlone(ferryCombat({ active: 'vashti' }));
    const next = step(combat, { type: 'nextTurn' });
    expect(next.activeUnitId).toBe(unitIds.vashti);
    expect(next.round).toBe(combat.round + 1);
    expect(ownTurnStarted(viewOf(combat), viewOf(next))).toBe(true);
  });

  it('is false when the own hero takes damage on its turn', () => {
    expect(
      startedAfter(ferryCombat({ active: 'vashti' }), {
        type: 'damage',
        unitId: unitIds.vashti,
        amount: 4,
      }),
    ).toBe(false);
  });

  it('is true when the DM sets another round on the own hero turn', () => {
    expect(startedAfter(ferryCombat({ active: 'vashti' }), { type: 'editRound', round: 4 })).toBe(
      true,
    );
  });

  it('is false for an equal copy of the same document', () => {
    const view = viewOf(ferryCombat({ active: 'vashti' }));
    expect(ownTurnStarted(view, structuredClone(view))).toBe(false);
  });

  it('is false when the turn passes from the own hero to another unit', () => {
    const combat = ferryCombat({ active: 'vashti' });
    const next = step(combat, { type: 'nextTurn' });
    expect(next.activeUnitId).not.toBe(unitIds.vashti);
    expect(ownTurnStarted(viewOf(combat), viewOf(next))).toBe(false);
  });
});
