import { apply, project } from '@combat-planner/domain';
import type { Action, Combat, PlayerCombat, Viewer } from '@combat-planner/domain';
import { describe, expect, it } from 'vite-plus/test';
import { playerEvents } from '../../src/screens/PlayerView/playerEvents.ts';
import {
  ALEX,
  JONAS,
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

  it('reports the combat start', () => {
    expect(
      eventsAfter(ferryCombat({ status: 'setup' }), {
        type: 'start',
        rolls: { [unitIds.vashti]: 10 },
      }),
    ).toEqual([{ kind: 'started' }]);
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

  it('reports a free hero claimed by another player', () => {
    const combat = ferryCombat({ status: 'setup', joined: false, ilse: true });
    const events = eventsAfter(
      combat,
      { type: 'claimUnit', unitId: unitIds.vashti, displayName: 'Alex' },
      { kind: 'player', playerId: ALEX },
    );
    expect(events).toEqual([
      { kind: 'playerClaimed', unitId: unitIds.vashti, player: 'Alex', hero: 'Vashti the Hexer' },
    ]);
  });

  const aldricReleased = {
    kind: 'playerReleased',
    unitId: unitIds.aldric,
    player: 'Jonas',
    hero: 'Ser Aldric',
  };

  it('reports another player releasing their hero', () => {
    const events = eventsAfter(
      ferryCombat(),
      { type: 'releaseUnit', unitId: unitIds.aldric },
      { kind: 'player', playerId: JONAS },
    );
    expect(events).toEqual([aldricReleased]);
  });

  it('reports the DM releasing another player hero', () => {
    expect(eventsAfter(ferryCombat(), { type: 'releaseUnit', unitId: unitIds.aldric })).toEqual([
      aldricReleased,
    ]);
  });

  it('reports only the new claim of a player holding another hero', () => {
    const events = eventsAfter(
      ferryCombat({ ilse: true }),
      { type: 'claimUnit', unitId: unitIds.ilse, displayName: 'Jonas' },
      { kind: 'player', playerId: JONAS },
    );
    expect(events).toEqual([
      { kind: 'playerClaimed', unitId: unitIds.ilse, player: 'Jonas', hero: 'Ilse the Bold' },
    ]);
  });

  it('reports a player removed from the combat as a release', () => {
    const combat = ferryCombat();
    const { [JONAS]: _removed, ...players } = combat.players;
    const without: Combat = {
      ...combat,
      players,
      units: combat.units.map((unit) =>
        unit.id === unitIds.aldric ? { ...unit, claimedBy: null } : unit,
      ),
    };
    expect(playerEvents(viewOf(combat), viewOf(without))).toEqual([aldricReleased]);
  });

  it('reports nothing when the DM removes another player hero', () => {
    expect(eventsAfter(ferryCombat(), { type: 'removeUnit', unitId: unitIds.aldric })).toEqual([]);
  });

  it('reports a release when another player hero turns into an ally', () => {
    const combat = ferryCombat();
    const aldric = combat.units.find((unit) => unit.id === unitIds.aldric)!;
    const { name, maxHp, ac, pd, md, initiativeBonus, tempHp, note } = aldric;
    const form = { name, maxHp, ac, pd, md, initiativeBonus, tempHp, note };
    expect(
      eventsAfter(combat, { type: 'editUnit', unitId: unitIds.aldric, ...form, role: 'ally' }),
    ).toEqual([aldricReleased]);
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
