import type { LinkToken } from '@combat-planner/api/client';
import type { CombatId } from '@combat-planner/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useApi } from '../api/ApiProvider.tsx';
import { mutation } from './mutations.ts';
import { queryKeys } from './queryKeys.ts';
import { useToasts } from './useToasts.ts';

export interface CombatLink {
  token: LinkToken | undefined;
  error: Error | null;
  reissue: () => Promise<unknown>;
}

export function useCombatLink(id: CombatId, enabled: boolean): CombatLink {
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const key = useMemo(() => [...queryKeys.combat, id, 'link'] as const, [id]);
  const query = useQuery({ queryKey: key, queryFn: () => api.link.get(id), enabled });
  const reissue = useMemo(
    () =>
      mutation({ queryClient, show, t }, { send: () => api.link.reissue(id), invalidate: [key] }),
    [api, id, key, queryClient, show, t],
  );
  return { token: query.data?.token, error: query.error, reissue };
}
