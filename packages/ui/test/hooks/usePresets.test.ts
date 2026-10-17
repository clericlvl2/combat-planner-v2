import { describe, expect, it, vi } from 'vite-plus/test';
import { listPresets, presetActions } from '../../src/hooks/presets.ts';
import { queryKeys } from '../../src/hooks/queryKeys.ts';
import { flush, harness } from './helpers.ts';

const GOBLIN = {
  id: '01ARZ3NDEKTSV4RRFFQ69G5FH0',
  name: 'Goblin',
  role: 'enemy' as const,
  maxHp: 10,
  ac: 13,
  pd: 11,
  md: 10,
  initiativeBonus: 1,
  tags: [],
};
const COPY_ID = '01ARZ3NDEKTSV4RRFFQ69G5FH1';

const setup = async () => {
  const context = harness();
  await context.api.presets.create(GOBLIN);
  await context.queryClient.fetchQuery({
    queryKey: queryKeys.presets,
    queryFn: () => listPresets(context.api),
  });
  const invalidate = vi.spyOn(context.queryClient, 'invalidateQueries');
  return { context, invalidate, actions: presetActions(context.api, context) };
};

describe('presetActions', () => {
  it('every mutation invalidates the preset list', async () => {
    const { actions, invalidate } = await setup();
    await actions.create({ ...GOBLIN, id: '01ARZ3NDEKTSV4RRFFQ69G5FH2', name: 'Orc' });
    await actions.update(GOBLIN.id, { maxHp: 12 });
    await actions.duplicate(GOBLIN.id, COPY_ID);
    await actions.remove(COPY_ID);
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.presets,
      queryKeys.presets,
      queryKeys.presets,
      queryKeys.presets,
    ]);
  });

  it('duplicate shows "<name> 2 created" and remove "<name> deleted"', async () => {
    const { actions, context } = await setup();
    await actions.duplicate(GOBLIN.id, COPY_ID);
    await actions.remove(GOBLIN.id);
    expect(context.toasts).toEqual([
      { message: 'presetDuplicated {"name":"Goblin 2"}', kind: 'success' },
      { message: 'deleted {"title":"Goblin"}', kind: 'neutral' },
    ]);
  });

  it('a network failure offers Retry with the same preset', async () => {
    const { actions, context } = await setup();
    context.api.failNext('network');
    const duplicated = actions.duplicate(GOBLIN.id, COPY_ID);
    await flush();
    context.toasts[0]?.action?.onAction();
    await expect(duplicated).resolves.toMatchObject({ id: COPY_ID, name: 'Goblin 2' });
    expect(
      context.api.calls.filter((call) => call.method === 'presets.duplicate').map((c) => c.args),
    ).toEqual([
      [GOBLIN.id, COPY_ID],
      [GOBLIN.id, COPY_ID],
    ]);
  });
});
