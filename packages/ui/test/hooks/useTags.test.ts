import { describe, expect, it, vi } from 'vite-plus/test';
import { queryKeys } from '../../src/hooks/queryKeys.ts';
import { listTags, tagActions } from '../../src/hooks/tags.ts';
import { harness } from './helpers.ts';

const UNDEAD = { id: '01ARZ3NDEKTSV4RRFFQ69G5FJ0', name: 'Нежить' };

const setup = async () => {
  const context = harness();
  await context.queryClient.fetchQuery({
    queryKey: queryKeys.tags,
    queryFn: () => listTags(context.api),
  });
  const invalidate = vi.spyOn(context.queryClient, 'invalidateQueries');
  return { context, invalidate, actions: tagActions(context.api, context) };
};

describe('tagActions', () => {
  it('create and rename invalidate the tag list', async () => {
    const { actions, invalidate } = await setup();
    await actions.create(UNDEAD);
    await actions.rename(UNDEAD.id, 'Призраки');
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.tags,
      queryKeys.tags,
    ]);
  });

  it('remove invalidates the tag list and the presets that carried the tag', async () => {
    const { actions, invalidate } = await setup();
    await actions.create(UNDEAD);
    invalidate.mockClear();
    await actions.remove(UNDEAD.id);
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.tags,
      queryKeys.presets,
    ]);
  });

  it('a duplicate name rejects without a toast and without invalidating', async () => {
    const { actions, context, invalidate } = await setup();
    await actions.create(UNDEAD);
    invalidate.mockClear();
    await expect(
      actions.create({ id: '01ARZ3NDEKTSV4RRFFQ69G5FJ1', name: 'нежить' }),
    ).rejects.toMatchObject({ code: 'invalid' });
    expect(invalidate).not.toHaveBeenCalled();
    expect(context.toasts).toEqual([]);
  });
});
