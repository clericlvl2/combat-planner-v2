import { ApiError } from '@combat-planner/api/client';
import type { ApiEndEvent } from '@combat-planner/api/client';
import type { Action, Combat } from '@combat-planner/domain';
import { describe, expect, it, vi } from 'vite-plus/test';
import {
  combatKey,
  createDispatcher,
  dmSource,
  fetchEntry,
  mergeEntry,
  playerSource,
  refreshEntry,
  subscribeEntry,
  writeDocument,
} from '../../src/hooks/combat.ts';
import type { CombatEntry } from '../../src/hooks/combat.ts';
import { COMBAT_ID, ENEMY_ID, PLAYER_ID, TOKEN, combat } from '../api/fixtures.ts';
import { flush, harness, translate } from './helpers.ts';

const DM = { kind: 'dm' } as const;
const PLAYER = { kind: 'player', playerId: PLAYER_ID } as const;

const damage = (version: number): Action => ({
  id: '01ARZ3NDEKTSV4RRFFQ69G5FG0',
  version,
  type: 'damage',
  unitId: ENEMY_ID,
  amount: 5,
});

const entry = (version: number): CombatEntry<Combat> => ({
  document: combat({ version }),
  language: null,
});

describe('combat cache', () => {
  it('keys DM and player views apart', () => {
    expect(combatKey(COMBAT_ID, DM)).toEqual(['combat', COMBAT_ID, 'dm']);
    expect(combatKey(COMBAT_ID, PLAYER)).toEqual(['combat', COMBAT_ID, 'player', PLAYER_ID]);
  });

  it('writes a document only when it is newer', () => {
    const current = entry(3);
    expect(writeDocument(current, combat({ version: 2 }))).toBe(current);
    expect(writeDocument(current, combat({ version: 4 })).document.version).toBe(4);
    expect(writeDocument(undefined, combat({ version: 1 }))).toEqual(entry(1));
  });

  it('merges a loaded entry without going back in version and keeps the language', () => {
    expect(mergeEntry({ ...entry(5), language: 'ru' }, entry(4))).toEqual({
      ...entry(5),
      language: 'ru',
    });
    expect(mergeEntry(entry(4), { ...entry(5), language: 'ja' })).toEqual({
      ...entry(5),
      language: 'ja',
    });
  });
});

describe('combat sources', () => {
  it('the DM opens the combat first and reads it with get afterwards', async () => {
    const context = harness({ combats: [combat()] });
    const key = combatKey(COMBAT_ID, DM);
    const source = dmSource(context.api, COMBAT_ID);
    context.queryClient.setQueryData(key, await fetchEntry(context.queryClient, key, source));
    await fetchEntry(context.queryClient, key, source);
    expect(context.api.calls.map((call) => call.method)).toEqual(['combats.open', 'combats.get']);
  });

  it('the player reads play.get with the token and keeps the DM language', async () => {
    const context = harness({ combats: [combat()], settings: { language: 'ru' } });
    const source = playerSource(context.api, PLAYER, TOKEN);
    const loaded = await fetchEntry(context.queryClient, combatKey(COMBAT_ID, PLAYER), source);
    expect(loaded.language).toBe('ru');
    expect(loaded.document.units.find((unit) => unit.id === ENEMY_ID)).not.toHaveProperty('hp');
    expect(context.api.calls).toEqual([{ method: 'play.get', args: [TOKEN, PLAYER_ID] }]);
  });

  it('the subscription writes each document into the cache and reports the end', async () => {
    const context = harness({ combats: [combat()] });
    const key = combatKey(COMBAT_ID, DM);
    const ended: ApiEndEvent[] = [];
    subscribeEntry(context.queryClient, key, dmSource(context.api, COMBAT_ID), (event) =>
      ended.push(event),
    );
    expect(context.queryClient.getQueryData<CombatEntry>(key)?.document.version).toBe(1);
    await context.api.combats.dispatch(COMBAT_ID, damage(1));
    expect(context.queryClient.getQueryData<CombatEntry>(key)?.document.version).toBe(2);
    await context.api.combats.remove(COMBAT_ID);
    expect(ended).toEqual([{ type: 'deleted', title: 'Засада гоблинов' }]);
  });
});

describe('createDispatcher', () => {
  it('sends the action and never writes the cache itself', async () => {
    const context = harness({ combats: [combat()] });
    const key = combatKey(COMBAT_ID, DM);
    const source = dmSource(context.api, COMBAT_ID);
    context.queryClient.setQueryData(key, entry(1));
    const setQueryData = vi.spyOn(context.queryClient, 'setQueryData');
    const dispatch = createDispatcher({
      send: source.send,
      refetch: () => refreshEntry(context.queryClient, key, source),
      show: context.show,
      t: translate,
    });
    await dispatch(damage(1));
    expect(setQueryData).not.toHaveBeenCalled();
    expect(context.queryClient.getQueryData<CombatEntry>(key)?.document.version).toBe(1);
    await expect(context.api.combats.get(COMBAT_ID)).resolves.toMatchObject({ version: 2 });
    expect(context.toasts).toEqual([]);
  });

  it('on 409 refetches the document and shows combatChanged without a button', async () => {
    const context = harness({ combats: [combat({ version: 3 })] });
    const key = combatKey(COMBAT_ID, DM);
    const source = dmSource(context.api, COMBAT_ID);
    context.queryClient.setQueryData(key, entry(1));
    const dispatch = createDispatcher({
      send: source.send,
      refetch: () => refreshEntry(context.queryClient, key, source),
      show: context.show,
      t: translate,
    });
    await dispatch(damage(1));
    expect(context.queryClient.getQueryData<CombatEntry>(key)?.document.version).toBe(3);
    expect(context.toasts).toEqual([{ message: 'combatChanged' }]);
  });

  it('on network shows serverUnreachable with a Retry that resends the same action id', async () => {
    const send = vi
      .fn<(action: Action) => Promise<{ version: number }>>()
      .mockRejectedValueOnce(new ApiError({ status: 0, code: 'network' }))
      .mockResolvedValueOnce({ version: 2 });
    const refetch = vi.fn(async () => {});
    const show = vi.fn((_input: unknown) => 'toast-1');
    const dispatch = createDispatcher({ send, refetch, show, t: translate });
    const action = damage(1);
    await dispatch(action);
    expect(refetch).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith({
      message: 'serverUnreachable',
      action: { label: 'retry', onAction: expect.any(Function) },
    });
    const [[toast]] = show.mock.calls as [[{ action: { onAction: () => void } }]];
    toast.action.onAction();
    await flush();
    expect(send.mock.calls).toEqual([[action], [action]]);
    expect(send.mock.calls[1]?.[0].id).toBe(action.id);
    expect(show).toHaveBeenCalledTimes(1);
  });
});
