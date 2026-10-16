import type { Tag } from '@combat-planner/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useApi } from '../api/ApiProvider.tsx';
import { queryKeys } from './queryKeys.ts';
import { listTags, tagActions } from './tags.ts';
import type { TagActions } from './tags.ts';
import { useToasts } from './useToasts.ts';

export interface Tags extends TagActions {
  tags: Tag[] | undefined;
  status: 'pending' | 'error' | 'success';
  error: Error | null;
}

export function useTags(): Tags {
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const query = useQuery({ queryKey: queryKeys.tags, queryFn: () => listTags(api) });
  const actions = useMemo(
    () => tagActions(api, { queryClient, show, t }),
    [api, queryClient, show, t],
  );
  return { tags: query.data, status: query.status, error: query.error, ...actions };
}
