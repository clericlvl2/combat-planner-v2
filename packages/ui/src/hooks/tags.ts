import type { ApiClient, TagCreateInput } from '@combat-planner/api/client';
import type { Tag, TagId } from '@combat-planner/domain';
import { mutation } from './mutations.ts';
import type { MutationContext } from './mutations.ts';
import { queryKeys } from './queryKeys.ts';

export interface TagActions {
  create: (input: TagCreateInput) => Promise<Tag>;
  rename: (id: TagId, name: Tag['name']) => Promise<Tag>;
  remove: (id: TagId) => Promise<void>;
}

export const listTags = (api: ApiClient): Promise<Tag[]> => api.tags.list();

export function tagActions(api: ApiClient, context: MutationContext): TagActions {
  const invalidate = [queryKeys.tags];
  return {
    create: mutation(context, {
      send: (input: TagCreateInput) => api.tags.create(input),
      invalidate,
    }),
    rename: mutation(context, {
      send: (id: TagId, name: Tag['name']) => api.tags.rename(id, name),
      invalidate,
    }),
    remove: mutation(context, {
      send: (id: TagId) => api.tags.remove(id),
      invalidate: [queryKeys.tags, queryKeys.presets],
    }),
  };
}
