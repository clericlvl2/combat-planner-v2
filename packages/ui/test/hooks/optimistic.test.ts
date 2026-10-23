import { ApiError } from '@combat-planner/api/client';
import type { DmCombat } from '@combat-planner/api/client';
import type { Action, Combat, PlayerCombat } from '@combat-planner/domain';
import { project } from '@combat-planner/domain';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vite-plus/test';
import { combatKey, createDispatcher } from '../../src/hooks/combat.ts';
import type { CombatEntry } from '../../src/hooks/combat.ts';
import {
  addEntry,
  dropEntry,
  overlay,
  pendingKey,
  pendingTracker,
  pruneEntries,
  refuseEntry,
  settleEntry,
} from '../../src/hooks/optimistic.ts';
import type { Entries } from '../../src/hooks/optimistic.ts';
import { COMBAT_ID, ENEMY_ID, HERO_ID, NOW, PLAYER_ID, combat } from '../api/fixtures.ts';
import { flush, translate } from './helpers.ts';

const DM = { kind: 'dm' } as const;
const PLAYER = { kind: 'player' } as const;

const dmCombat = (overrides: Partial<Combat> = {}): DmCombat => ({
  ...combat(overrides),
  undo: null,
});

const damage = (id: string, amount: number, unitId = ENEMY_ID, version = 0): Action => ({
  id,
  version,
  type: 'damage',
  unitId,
  amount,
});

const FIRST = '01ARZ3NDEKTSV4RRFFQ69G5FG1';
const SECOND = '01ARZ3NDEKTSV4RRFFQ69G5FG2';

const hpOf = (document: DmCombat | PlayerCombat, unitId: string) =>
  document.units.find((unit) => unit.id === unitId)?.hp;

describe('overlay for the DM', () => {
  it('returns the document itself when nothing is pending', () => {
    const document = dmCombat();
    expect(overlay(document, [], DM, NOW)).toBe(document);
  });

  it('applies pending actions stamped with the running version over a newer document', () => {
    const document = dmCombat({ version: 7 });
    const shown = overlay(
      document,
      [{ action: damage(FIRST, 5, ENEMY_ID, 2) }, { action: damage(SECOND, 3, ENEMY_ID, 2) }],
      DM,
      NOW,
    );
    expect(hpOf(shown, ENEMY_ID)).toBe(22);
    expect(shown.version).toBe(9);
    expect(hpOf(document, ENEMY_ID)).toBe(30);
  });

  it('skips an action the domain refuses and keeps applying the rest', () => {
    const shown = overlay(
      dmCombat(),
      [{ action: { id: FIRST, version: 0, type: 'nextTurn' } }, { action: damage(SECOND, 4) }],
      DM,
      NOW,
    );
    expect(shown.activeUnitId).toBeNull();
    expect(hpOf(shown, ENEMY_ID)).toBe(26);
  });

  it('leaves out refused entries and entries the document already holds', () => {
    const document = dmCombat({ version: 4 });
    const entries: Entries = [
      { action: damage(FIRST, 5), refused: true },
      { action: damage(SECOND, 3), serverVersion: 4 },
    ];
    expect(overlay(document, entries, DM, NOW)).toBe(document);
  });

  it('leaves out an entry whose action is the document’s last undoable action', () => {
    const action = damage(FIRST, 5);
    const document: DmCombat = { ...dmCombat(), undo: { action, unitName: 'Goblin boss' } };
    expect(overlay(document, [{ action }], DM, NOW)).toBe(document);
  });

  it('sets undo to null once a pending action shows', () => {
    const document: DmCombat = {
      ...dmCombat(),
      undo: { action: damage(SECOND, 1), unitName: 'Goblin boss' },
    };
    expect(overlay(document, [{ action: damage(FIRST, 5) }], DM, NOW).undo).toBeNull();
  });
});

describe('overlay for a player', () => {
  const view = (hp: number): PlayerCombat =>
    project(
      combat({
        units: combat().units.map((unit) => (unit.id === HERO_ID ? { ...unit, hp } : unit)),
      }),
      { kind: 'player', playerId: PLAYER_ID },
    );

  it('changes the claimed hero’s HP and recomputes its health status', () => {
    const shown = overlay(view(30), [{ action: damage(FIRST, 20, HERO_ID) }], PLAYER, NOW);
    const hero = shown.units.find((unit) => unit.id === HERO_ID);
    expect(hero).toMatchObject({ hp: 10, healthStatus: 'staggered' });
    expect(hero?.healthSegments).toBe(
      view(10).units.find((unit) => unit.id === HERO_ID)?.healthSegments,
    );
    expect(shown.version).toBe(view(30).version);
  });

  it('applies heal and temp HP, and ignores other actions', () => {
    const shown = overlay(
      view(10),
      [
        { action: { id: FIRST, version: 0, type: 'heal', unitId: HERO_ID, amount: 5 } },
        { action: { id: SECOND, version: 0, type: 'setTempHp', unitId: HERO_ID, amount: 4 } },
        {
          action: {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FG3',
            version: 0,
            type: 'setMaxHp',
            unitId: HERO_ID,
            amount: 50,
          },
        },
      ],
      PLAYER,
      NOW,
    );
    expect(shown.units.find((unit) => unit.id === HERO_ID)).toMatchObject({
      hp: 15,
      tempHp: 4,
      maxHp: 30,
    });
  });

  it('leaves a unit that is not the player’s own untouched', () => {
    const document = view(30);
    expect(overlay(document, [{ action: damage(FIRST, 5) }], PLAYER, NOW)).toBe(document);
  });
});

describe('pending entries', () => {
  it('adds, settles, refuses, drops and prunes by action id', () => {
    const first = damage(FIRST, 5);
    let entries = addEntry([], first);
    entries = addEntry(entries, damage(SECOND, 3));
    entries = settleEntry(entries, FIRST, 2);
    entries = refuseEntry(entries, SECOND);
    expect(entries).toEqual([
      { action: first, serverVersion: 2 },
      { action: damage(SECOND, 3), refused: true },
    ]);
    expect(addEntry(entries, damage(SECOND, 3, ENEMY_ID, 2))[1]).toEqual({
      action: damage(SECOND, 3, ENEMY_ID, 2),
    });
    expect(pruneEntries(entries, 1)).toBe(entries);
    expect(pruneEntries(entries, 2)).toEqual([entries[1]]);
    expect(dropEntry(entries, SECOND)).toEqual([entries[0]]);
  });
});

describe('pending lifecycle', () => {
  const setup = (sends: Array<() => Promise<{ version: number }>>) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<CombatEntry<DmCombat>>(combatKey(COMBAT_ID, DM), {
      document: dmCombat(),
      language: null,
    });
    const tracker = pendingTracker(queryClient, COMBAT_ID, DM);
    const send = vi.fn(async (_action: Action) => {
      const next = sends.shift();
      if (!next) throw new Error('No more replies');
      return next();
    });
    const show = vi.fn((_input: unknown) => 'toast-1');
    const dispatch = createDispatcher({
      send,
      refetch: async () => {},
      show,
      t: translate,
      generation: () => 0,
      pending: tracker,
    });
    const entries = () => queryClient.getQueryData<Entries>(pendingKey(COMBAT_ID, DM)) ?? [];
    const writeServer = (version: number) =>
      queryClient.setQueryData<CombatEntry<DmCombat>>(combatKey(COMBAT_ID, DM), {
        document: dmCombat({ version }),
        language: null,
      });
    return { tracker, send, show, dispatch, entries, writeServer };
  };

  it('keeps an entry until the server document reaches its version', async () => {
    let reply = (_value: { version: number }) => {};
    const context = setup([
      () =>
        new Promise((resolve) => {
          reply = resolve;
        }),
    ]);
    const sent = context.dispatch(damage(FIRST, 5, ENEMY_ID, 1));
    expect(context.entries()).toEqual([{ action: damage(FIRST, 5, ENEMY_ID, 1) }]);
    reply({ version: 2 });
    await sent;
    expect(context.entries()).toEqual([
      { action: damage(FIRST, 5, ENEMY_ID, 1), serverVersion: 2 },
    ]);
    context.writeServer(2);
    context.tracker.prune();
    expect(context.entries()).toEqual([]);
  });

  it('removes the entry at once when the document arrived before the reply', async () => {
    const context = setup([async () => ({ version: 2 })]);
    context.writeServer(2);
    await context.dispatch(damage(FIRST, 5, ENEMY_ID, 1));
    expect(context.entries()).toEqual([]);
  });

  it('marks a refused entry at once and drops it when the toast is dismissed', async () => {
    const context = setup([() => Promise.reject(new ApiError({ status: 0, code: 'network' }))]);
    const sent = context.dispatch(damage(FIRST, 5, ENEMY_ID, 1));
    await flush();
    expect(context.entries()).toEqual([{ action: damage(FIRST, 5, ENEMY_ID, 1), refused: true }]);
    const [[toast]] = context.show.mock.calls as [[{ onDismiss: () => void }]];
    toast.onDismiss();
    await expect(sent).resolves.toEqual({ applied: false });
    expect(context.entries()).toEqual([]);
  });

  it('drops a refused entry that has no Retry', async () => {
    const context = setup([() => Promise.reject(new ApiError({ status: 422, code: 'invalid' }))]);
    await context.dispatch(damage(FIRST, 5, ENEMY_ID, 1));
    expect(context.entries()).toEqual([]);
  });

  it('Retry clears the refusal and re-sends the same action', async () => {
    let reply = (_value: { version: number }) => {};
    const context = setup([
      () => Promise.reject(new ApiError({ status: 0, code: 'network' })),
      () =>
        new Promise((resolve) => {
          reply = resolve;
        }),
    ]);
    const action = damage(FIRST, 5, ENEMY_ID, 1);
    const sent = context.dispatch(action);
    await flush();
    const [[toast]] = context.show.mock.calls as [[{ action: { onAction: () => void } }]];
    toast.action.onAction();
    expect(context.entries()).toEqual([{ action }]);
    reply({ version: 2 });
    await expect(sent).resolves.toEqual({ applied: true, version: 2 });
    expect(context.send.mock.calls).toEqual([[action], [action]]);
  });

  it('does not track undo, claims or releases for the DM', async () => {
    const context = setup([async () => ({ version: 2 })]);
    const sent = context.dispatch({ id: FIRST, version: 1, type: 'undo' });
    expect(context.entries()).toEqual([]);
    await sent;
  });
});
