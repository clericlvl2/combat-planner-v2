import { apply, project } from '@combat-planner/domain';
import type { Action, Combat, PlayerCombat, Viewer } from '@combat-planner/domain';
import { describe, expect, it } from 'vite-plus/test';
import { playerEvents } from '../../src/screens/PlayerView/playerEvents.ts';
import {
  ALEX,
  MIKA,
  ferryCombat,
  unitIds,
} from '../../src/screens/PlayerView/PlayerView.scenarios.ts';

const DM: Viewer = { kind: 'dm' };
const NOW = '2026-10-16T12:00:00.000Z';
const ACTION_ID = '01JP000000000000000000ACT1';

type ActionBody<A extends Action = Action> = A extends Action ? Omit<A, 'id' | 'version'> : never;

const viewOf = (combat: Combat): PlayerCombat =>
  project(combat, { kind: 'player', playerId: MIKA });

function step(combat: Combat, body: ActionBody, author: Viewer = DM): Combat {
  const action = { ...body, id: ACTION_ID, version: combat.version } as Action;
  const result = apply(combat, action, author, NOW);
  if (!('combat' in result)) throw new Error(`${body.type} was not applied`);
  return result.combat;
}

const eventsAfter = (combat: Combat, body: ActionBody, author?: Viewer) =>
  playerEvents(viewOf(combat), viewOf(step(combat, body, author)));

describe('playerEvents', () => {
  it('reports a DM restart', () => {
    expect(eventsAfter(ferryCombat(), { type: 'restart' })).toEqual([{ kind: 'restarted' }]);
  });

  it('reports a DM clear without the releases it implies', () => {
    expect(eventsAfter(ferryCombat(), { type: 'clear' })).toEqual([{ kind: 'cleared' }]);
  });

  it('reports the own hero released by the DM', () => {
    expect(eventsAfter(ferryCombat(), { type: 'releaseUnit', unitId: unitIds.vashti })).toEqual([
      { kind: 'released', unitId: unitIds.vashti, name: 'Vashti the Hexer' },
    ]);
  });

  it('reports the own hero removed by the DM', () => {
    expect(eventsAfter(ferryCombat(), { type: 'removeUnit', unitId: unitIds.vashti })).toEqual([
      { kind: 'removed', unitId: unitIds.vashti, name: 'Vashti the Hexer' },
    ]);
  });

  it('reports a free hero just taken by another player', () => {
    const combat = ferryCombat({ status: 'setup', joined: false, ilse: true });
    const events = eventsAfter(
      combat,
      { type: 'claimUnit', unitId: unitIds.vashti, displayName: 'Alex' },
      { kind: 'player', playerId: ALEX },
    );
    expect(events).toEqual([{ kind: 'taken', unitId: unitIds.vashti, name: 'Vashti the Hexer' }]);
  });

  it('reports nothing on an ordinary update', () => {
    expect(eventsAfter(ferryCombat(), { type: 'damage', unitId: unitIds.orc, amount: 4 })).toEqual(
      [],
    );
    expect(eventsAfter(ferryCombat(), { type: 'nextTurn' })).toEqual([]);
  });

  it('reports nothing when the player claims a hero', () => {
    const combat = ferryCombat({ status: 'setup', ilse: true });
    const events = eventsAfter(
      combat,
      { type: 'claimUnit', unitId: unitIds.ilse, displayName: 'Mika' },
      { kind: 'player', playerId: MIKA },
    );
    expect(events).toEqual([]);
  });
});
