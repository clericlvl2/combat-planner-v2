import { LIMITS } from '@combat-planner/domain';
import { describe, expect, expectTypeOf, it, vi } from 'vite-plus/test';
import { combatListActions, listCombats } from '../../src/hooks/combatList.ts';
import { queryKeys } from '../../src/hooks/queryKeys.ts';
import type { CombatList } from '../../src/hooks/useCombatList.ts';
import { COMBAT_ID, combat } from '../api/fixtures.ts';
import { flush, harness } from './helpers.ts';

const NEW_ID = '01ARZ3NDEKTSV4RRFFQ69G5FF0';

const setup = async () => {
  const context = harness({ combats: [combat()] });
  await context.queryClient.fetchQuery({
    queryKey: queryKeys.combats,
    queryFn: () => listCombats(context.api),
  });
  const invalidate = vi.spyOn(context.queryClient, 'invalidateQueries');
  return { context, invalidate, actions: combatListActions(context.api, context) };
};

describe('combatListActions', () => {
  it('create, update, remove and duplicate invalidate the combat list', async () => {
    const { actions, invalidate } = await setup();
    await actions.create({ id: NEW_ID, title: 'Bridge', description: '', color: 7 });
    await actions.update(NEW_ID, { title: 'Bridge of Khazad' });
    await actions.duplicate(COMBAT_ID, '01ARZ3NDEKTSV4RRFFQ69G5FF1');
    await actions.remove(NEW_ID);
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.combats,
      queryKeys.combats,
      queryKeys.combats,
      queryKeys.combats,
    ]);
  });

  it('remove shows "<title> deleted" and duplicate "<title> (copy) created"', async () => {
    const { actions, context } = await setup();
    await actions.duplicate(COMBAT_ID, '01ARZ3NDEKTSV4RRFFQ69G5FF1');
    await actions.remove(COMBAT_ID);
    expect(context.toasts).toEqual([
      { message: 'duplicated {"title":"Засада гоблинов"}', kind: 'success' },
      { message: 'deleted {"title":"Засада гоблинов"}', kind: 'neutral' },
    ]);
  });

  it('a network failure shows serverUnreachableNothingChanged with a Retry that resends the same request', async () => {
    const { actions, context, invalidate } = await setup();
    context.api.failNext('network');
    const removed = actions.remove(COMBAT_ID);
    await flush();
    expect(invalidate).not.toHaveBeenCalled();
    const [toast] = context.toasts;
    expect(toast).toMatchObject({
      message: 'serverUnreachableNothingChanged',
      kind: 'error',
      action: { label: 'retry' },
    });
    toast?.action?.onAction();
    toast?.onDismiss?.();
    await expect(removed).resolves.toBeUndefined();
    expect(context.api.calls.filter((call) => call.method === 'combats.remove')).toEqual([
      { method: 'combats.remove', args: [COMBAT_ID] },
      { method: 'combats.remove', args: [COMBAT_ID] },
    ]);
    await expect(context.api.combats.list()).resolves.toEqual([]);
  });

  it('Retry resolves the original create with the created combat', async () => {
    const { actions, context } = await setup();
    context.api.failNext('network');
    const created = actions.create({ id: NEW_ID, title: 'Bridge', description: '', color: 7 });
    await flush();
    context.toasts[0]?.action?.onAction();
    context.toasts[0]?.onDismiss?.();
    await expect(created).resolves.toMatchObject({ id: NEW_ID, title: 'Bridge' });
  });

  it('a dismissed Retry toast rejects the original call with the network error', async () => {
    const { actions, context } = await setup();
    context.api.failNext('network');
    const created = actions.create({ id: NEW_ID, title: 'Bridge', description: '', color: 7 });
    await flush();
    context.toasts[0]?.onDismiss?.();
    await expect(created).rejects.toMatchObject({ code: 'network' });
    expect(context.api.calls.filter((call) => call.method === 'combats.create')).toHaveLength(1);
  });

  it('a limit rejection shows "limit reached"', async () => {
    const context = harness({
      combats: Array.from({ length: LIMITS.combatsPerDm }, (_, index) =>
        combat({ id: `01ARZ3NDEKTSV4RRFFQ69G${String(index).padStart(4, '0')}` }),
      ),
    });
    const actions = combatListActions(context.api, context);
    await expect(
      actions.duplicate('01ARZ3NDEKTSV4RRFFQ69G0000', '01ARZ3NDEKTSV4RRFFQ69J0000'),
    ).rejects.toMatchObject({ code: 'limit' });
    expect(context.toasts).toEqual([{ message: 'limitReached', kind: 'warning' }]);
  });

  it('exposes refetch', () => {
    expectTypeOf<CombatList['refetch']>().toEqualTypeOf<() => Promise<void>>();
  });
});
