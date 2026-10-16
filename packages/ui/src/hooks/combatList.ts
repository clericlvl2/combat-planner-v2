import type {
  ApiClient,
  CombatCreateInput,
  CombatPatch,
  CombatSummary,
  VersionResult,
} from '@combat-planner/api/client';
import type { Combat, CombatId } from '@combat-planner/domain';
import { mutation } from './mutations.ts';
import type { MutationContext } from './mutations.ts';
import { queryKeys } from './queryKeys.ts';

export interface CombatListActions {
  create: (input: CombatCreateInput) => Promise<Combat>;
  update: (id: CombatId, patch: CombatPatch) => Promise<VersionResult>;
  remove: (id: CombatId) => Promise<void>;
  duplicate: (id: CombatId, newId: CombatId) => Promise<Combat>;
}

export const listCombats = (api: ApiClient): Promise<CombatSummary[]> => api.combats.list();

export function combatListActions(api: ApiClient, context: MutationContext): CombatListActions {
  const { queryClient, t } = context;
  const invalidate = [queryKeys.combats];
  const titleOf = (id: CombatId): string | undefined =>
    queryClient
      .getQueryData<CombatSummary[]>(queryKeys.combats)
      ?.find((summary) => summary.id === id)?.title;

  const remove = mutation(context, {
    send: (id: CombatId, _title: string | undefined) => api.combats.remove(id),
    invalidate,
    success: (_result, [, title]) =>
      title === undefined ? null : { message: t('deleted', { title }) },
  });
  const duplicate = mutation(context, {
    send: (id: CombatId, newId: CombatId, _title: string | undefined) =>
      api.combats.duplicate(id, newId),
    invalidate,
    success: (_copy, [, , title]) =>
      title === undefined ? null : { message: t('duplicated', { title }) },
  });

  return {
    create: mutation(context, {
      send: (input: CombatCreateInput) => api.combats.create(input),
      invalidate,
    }),
    update: mutation(context, {
      send: (id: CombatId, patch: CombatPatch) => api.combats.update(id, patch),
      invalidate,
    }),
    remove: (id) => remove(id, titleOf(id)),
    duplicate: (id, newId) => duplicate(id, newId, titleOf(id)),
  };
}
