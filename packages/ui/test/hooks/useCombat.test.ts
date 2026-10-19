import { ApiError } from '@combat-planner/api/client';
import type { ApiEndEvent, DmCombat } from '@combat-planner/api/client';
import type { Action, Combat } from '@combat-planner/domain';
import { LIMITS } from '@combat-planner/domain';
import { describe, expect, expectTypeOf, it, vi } from 'vite-plus/test';
import {
  combatKey,
  createDispatcher,
  dmSource,
  endOf,
  entryFetcher,
  mergeEntry,
  playerSource,
  refreshEntry,
  subscribeEntry,
  visibleEntry,
  writeDocument,
} from '../../src/hooks/combat.ts';
import type { CombatEntry } from '../../src/hooks/combat.ts';
import { toastStoreOf } from '../../src/hooks/toasts.ts';
import type { CombatState } from '../../src/hooks/useCombat.ts';
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

const dmCombat = (overrides: Partial<Combat> = {}): DmCombat => ({
  ...combat(overrides),
  undo: null,
});

const entry = (version: number): CombatEntry<DmCombat> => ({
  document: dmCombat({ version }),
  language: null,
});

describe('combat cache', () => {
  it('keys DM and player views apart', () => {
    expect(combatKey(COMBAT_ID, DM)).toEqual(['combat', COMBAT_ID, 'dm']);
    expect(combatKey(COMBAT_ID, PLAYER)).toEqual(['combat', COMBAT_ID, 'player', PLAYER_ID]);
  });

  it('writes a document only when it is newer', () => {
    const current = entry(3);
    expect(writeDocument(current, dmCombat({ version: 2 }))).toBe(current);
    expect(writeDocument(current, dmCombat({ version: 4 })).document.version).toBe(4);
    expect(writeDocument(undefined, dmCombat({ version: 1 }))).toEqual(entry(1));
    expect(writeDocument(current, dmCombat({ version: 3 }), 'ja')).toEqual({
      ...current,
      language: 'ja',
    });
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
    const fetchEntry = entryFetcher(context.queryClient, key, source);
    context.queryClient.setQueryData(key, await fetchEntry());
    await fetchEntry();
    expect(context.api.calls.map((call) => call.method)).toEqual(['combats.open', 'combats.get']);
  });

  it('opens the combat again on every entry, also with a cached document', async () => {
    const context = harness({ combats: [combat()] });
    const key = combatKey(COMBAT_ID, DM);
    const source = dmSource(context.api, COMBAT_ID);
    context.queryClient.setQueryData(key, await entryFetcher(context.queryClient, key, source)());
    const first = context.queryClient.getQueryData<CombatEntry<DmCombat>>(key)?.document;
    await new Promise((resolve) => setTimeout(resolve, 2));
    context.queryClient.setQueryData(key, await entryFetcher(context.queryClient, key, source)());
    const second = context.queryClient.getQueryData<CombatEntry<DmCombat>>(key)?.document;
    expect(context.api.calls.map((call) => call.method)).toEqual(['combats.open', 'combats.open']);
    expect(second?.lastPlayedAt).not.toBe(first?.lastPlayedAt);
  });

  it('opens again after a failed first open', async () => {
    const context = harness({ combats: [combat()] });
    const key = combatKey(COMBAT_ID, DM);
    const fetchEntry = entryFetcher(context.queryClient, key, dmSource(context.api, COMBAT_ID));
    context.api.failNext('network');
    await expect(fetchEntry()).rejects.toMatchObject({ code: 'network' });
    await fetchEntry();
    expect(context.api.calls.map((call) => call.method)).toEqual(['combats.open', 'combats.open']);
  });

  it('the player reads play.get with the token and keeps the DM language', async () => {
    const context = harness({ combats: [combat()], settings: { language: 'ru' } });
    const source = playerSource(context.api, PLAYER, TOKEN);
    const loaded = await entryFetcher(context.queryClient, combatKey(COMBAT_ID, PLAYER), source)();
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

  it('the player subscription writes the DM language that arrives with a document', async () => {
    const context = harness({ combats: [combat()], settings: { language: 'ru' } });
    const key = combatKey(COMBAT_ID, PLAYER);
    subscribeEntry(context.queryClient, key, playerSource(context.api, PLAYER, TOKEN), vi.fn());
    expect(context.queryClient.getQueryData<CombatEntry>(key)?.language).toBe('ru');
    await context.api.settings.update({ language: 'ja' });
    await context.api.combats.dispatch(COMBAT_ID, damage(1));
    expect(context.queryClient.getQueryData<CombatEntry>(key)).toMatchObject({
      document: { version: 2 },
      language: 'ja',
    });
    expect(context.api.calls.map((call) => call.method)).not.toContain('play.get');
  });

  it('reports an unauthorized end when the session expires', () => {
    const context = harness({ combats: [combat()] });
    const ended: ApiEndEvent[] = [];
    subscribeEntry(
      context.queryClient,
      combatKey(COMBAT_ID, DM),
      dmSource(context.api, COMBAT_ID),
      (event) => ended.push(event),
    );
    context.api.expireSession();
    expect(ended).toEqual([{ type: 'unauthorized' }]);
  });

  it('shows no document after a refetch fails for another session', () => {
    const cached = entry(4);
    expect(visibleEntry(cached, null)).toBe(cached);
    expect(visibleEntry(cached, new ApiError({ status: 0, code: 'network' }))).toBe(cached);
    for (const code of ['unauthorized', 'forbidden', 'notFound'] as const) {
      expect(visibleEntry(cached, new ApiError({ status: 404, code }))).toBeUndefined();
    }
  });

  it('forgets the end when the combat, the viewer or the token changes', () => {
    const context = harness({ combats: [combat()] });
    const dm = dmSource(context.api, COMBAT_ID);
    const ended = { source: dm, event: { type: 'linkRevoked' } } as const;
    expect(endOf(ended, dm)).toEqual({ type: 'linkRevoked' });
    expect(endOf(ended, dmSource(context.api, ENEMY_ID))).toBeNull();
    expect(endOf(ended, playerSource(context.api, PLAYER, TOKEN))).toBeNull();
    expect(endOf(null, dm)).toBeNull();
  });

  it('exposes refetch', () => {
    expectTypeOf<CombatState<DmCombat>['refetch']>().toEqualTypeOf<() => Promise<void>>();
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
      generation: () => 0,
    });
    await expect(dispatch(damage(1))).resolves.toEqual({ applied: true, version: 2 });
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
      generation: () => 0,
    });
    await expect(dispatch(damage(1))).resolves.toEqual({ applied: false });
    expect(context.queryClient.getQueryData<CombatEntry>(key)?.document.version).toBe(3);
    expect(context.toasts).toEqual([{ message: 'combatChanged', kind: 'warning' }]);
  });

  it('on network shows serverUnreachable with a Retry that resends the same action id', async () => {
    const send = vi
      .fn<(action: Action) => Promise<{ version: number }>>()
      .mockRejectedValueOnce(new ApiError({ status: 0, code: 'network' }))
      .mockResolvedValueOnce({ version: 2 });
    const refetch = vi.fn(async () => {});
    const show = vi.fn((_input: unknown) => 'toast-1');
    const dispatch = createDispatcher({ send, refetch, show, t: translate, generation: () => 0 });
    const action = damage(1);
    const sent = dispatch(action);
    await flush();
    expect(refetch).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith({
      message: 'serverUnreachable',
      kind: 'error',
      action: { label: 'retry', onAction: expect.any(Function) },
      onDismiss: expect.any(Function),
    });
    const [[toast]] = show.mock.calls as [[{ action: { onAction: () => void } }]];
    toast.action.onAction();
    await expect(sent).resolves.toEqual({ applied: true, version: 2 });
    expect(send.mock.calls).toEqual([[action], [action]]);
    expect(send.mock.calls[1]?.[0].id).toBe(action.id);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('on limit shows the unit cap toast', async () => {
    const show = vi.fn((_input: unknown) => 'toast-1');
    const dispatch = createDispatcher({
      send: () => Promise.reject(new ApiError({ status: 422, code: 'limit' })),
      refetch: async () => {},
      show,
      t: translate,
      generation: () => 0,
    });
    await expect(dispatch(damage(1))).resolves.toEqual({ applied: false });
    expect(show).toHaveBeenCalledWith({
      message: `unitCap ${JSON.stringify({ limit: LIMITS.unitsPerCombat })}`,
      kind: 'warning',
    });
  });

  it('resolves not applied when the Retry toast is dismissed', async () => {
    const show = vi.fn((_input: unknown) => 'toast-1');
    const dispatch = createDispatcher({
      send: () => Promise.reject(new ApiError({ status: 0, code: 'network' })),
      refetch: async () => {},
      show,
      t: translate,
      generation: () => 0,
    });
    const sent = dispatch(damage(1));
    await flush();
    const [[toast]] = show.mock.calls as [[{ onDismiss: () => void }]];
    toast.onDismiss();
    await expect(sent).resolves.toEqual({ applied: false });
  });

  it('resolves the original call with the failed Retry when the second toast is dismissed', async () => {
    const send = vi
      .fn<(action: Action) => Promise<{ version: number }>>()
      .mockRejectedValue(new ApiError({ status: 0, code: 'network' }));
    const show = vi.fn((_input: unknown) => 'toast-1');
    const dispatch = createDispatcher({
      send,
      refetch: async () => {},
      show,
      t: translate,
      generation: () => 0,
    });
    const sent = dispatch(damage(1));
    await flush();
    const [[first]] = show.mock.calls as [
      [{ action: { onAction: () => void }; onDismiss: () => void }],
    ];
    first.action.onAction();
    first.onDismiss();
    await flush();
    const second = show.mock.calls[1]?.[0] as { onDismiss: () => void };
    second.onDismiss();
    await expect(sent).resolves.toEqual({ applied: false });
  });

  it('tells the caller once the Retry toast is up, while the result waits for it', async () => {
    const send = vi
      .fn<(action: Action) => Promise<{ version: number }>>()
      .mockRejectedValueOnce(new ApiError({ status: 0, code: 'network' }))
      .mockResolvedValueOnce({ version: 2 })
      .mockResolvedValueOnce({ version: 3 });
    const show = vi.fn((_input: unknown) => 'toast-1');
    const dispatch = createDispatcher({
      send,
      refetch: async () => {},
      show,
      t: translate,
      generation: () => 0,
    });
    const retryShown = vi.fn();
    let result: unknown = 'pending';
    void dispatch(damage(1), retryShown).then((value) => {
      result = value;
    });
    await flush();
    expect(retryShown).toHaveBeenCalledTimes(1);
    expect(result).toBe('pending');
    const appliedShown = vi.fn();
    await expect(dispatch(damage(2), appliedShown)).resolves.toEqual({
      applied: true,
      version: 2,
    });
    expect(appliedShown).not.toHaveBeenCalled();
    const [[toast]] = show.mock.calls as [[{ action: { onAction: () => void } }]];
    toast.action.onAction();
    await flush();
    expect(result).toEqual({ applied: true, version: 3 });
    expect(retryShown).toHaveBeenCalledTimes(1);
  });

  it('shows no Retry and no toast when the send fails after a session change', async () => {
    const context = harness({ combats: [combat()] });
    const toastStore = toastStoreOf(context.queryClient);
    let fail: (error: unknown) => void = () => {};
    const send = vi.fn(
      () =>
        new Promise<{ version: number }>((_resolve, reject) => {
          fail = reject;
        }),
    );
    const refetch = vi.fn(async () => {});
    const dispatch = createDispatcher({
      send,
      refetch,
      show: context.show,
      t: translate,
      generation: toastStore.generation,
    });
    const retryShown = vi.fn();
    const sent = dispatch(damage(1), retryShown);
    toastStore.clear();
    fail(new ApiError({ status: 0, code: 'network' }));
    await expect(sent).resolves.toEqual({ applied: false });
    expect(context.toasts).toEqual([]);
    expect(retryShown).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('resolves not applied on a rejection without a toast', async () => {
    const show = vi.fn((_input: unknown) => 'toast-1');
    const dispatch = createDispatcher({
      send: () => Promise.reject(new ApiError({ status: 403, code: 'forbidden' })),
      refetch: async () => {},
      show,
      t: translate,
      generation: () => 0,
    });
    await expect(dispatch(damage(1))).resolves.toEqual({ applied: false });
    expect(show).not.toHaveBeenCalled();
  });
});
