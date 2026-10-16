import type { ApiClient, PresetCreateInput, PresetPatch } from '@combat-planner/api/client';
import type { Preset, PresetId } from '@combat-planner/domain';
import { mutation } from './mutations.ts';
import type { MutationContext } from './mutations.ts';
import { queryKeys } from './queryKeys.ts';

export interface PresetActions {
  create: (input: PresetCreateInput) => Promise<Preset>;
  update: (id: PresetId, patch: PresetPatch) => Promise<Preset>;
  remove: (id: PresetId) => Promise<void>;
  duplicate: (id: PresetId, newId: PresetId) => Promise<Preset>;
}

export const listPresets = (api: ApiClient): Promise<Preset[]> => api.presets.list();

export function presetActions(api: ApiClient, context: MutationContext): PresetActions {
  const { queryClient, t } = context;
  const invalidate = [queryKeys.presets];
  const nameOf = (id: PresetId): string | undefined =>
    queryClient.getQueryData<Preset[]>(queryKeys.presets)?.find((preset) => preset.id === id)?.name;

  const remove = mutation(context, {
    send: (id: PresetId, _name: string | undefined) => api.presets.remove(id),
    invalidate,
    success: (_result, [, name]) =>
      name === undefined ? null : { message: t('deleted', { title: name }) },
  });

  return {
    create: mutation(context, {
      send: (input: PresetCreateInput) => api.presets.create(input),
      invalidate,
    }),
    update: mutation(context, {
      send: (id: PresetId, patch: PresetPatch) => api.presets.update(id, patch),
      invalidate,
    }),
    remove: (id) => remove(id, nameOf(id)),
    duplicate: mutation(context, {
      send: (id: PresetId, newId: PresetId) => api.presets.duplicate(id, newId),
      invalidate,
      success: (copy) => ({ message: t('presetDuplicated', { name: copy.name }) }),
    }),
  };
}
