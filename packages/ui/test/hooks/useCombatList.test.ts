import { describe, expect, it, vi } from 'vite-plus/test';
import { combatListActions, listCombats } from '../../src/hooks/combatList.ts';
import { queryKeys } from '../../src/hooks/queryKeys.ts';
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
      { message: 'duplicated {"title":"Засада гоблинов"}' },
      { message: 'deleted {"title":"Засада гоблинов"}' },
    ]);
  });

  it('a network failure shows serverUnreachable with a Retry that resends the same request', async () => {
    const { actions, context, invalidate } = await setup();
    context.api.failNext('network');
    await expect(actions.remove(COMBAT_ID)).rejects.toMatchObject({ code: 'network' });
    expect(invalidate).not.toHaveBeenCalled();
    const [toast] = context.toasts;
    expect(toast).toMatchObject({ message: 'serverUnreachable', action: { label: 'retry' } });
    toast?.action?.onAction();
    await flush();
    expect(context.api.calls.filter((call) => call.method === 'combats.remove')).toEqual([
      { method: 'combats.remove', args: [COMBAT_ID] },
      { method: 'combats.remove', args: [COMBAT_ID] },
    ]);
    await expect(context.api.combats.list()).resolves.toEqual([]);
  });
});
