import type { ApiClient, LinkToken } from '@combat-planner/api/client';
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

export const combatLinkKey = (id: CombatId) => [...queryKeys.combat, id, 'link'] as const;

export const combatLinkQuery = (api: ApiClient, id: CombatId, enabled: boolean) => ({
  queryKey: combatLinkKey(id),
  queryFn: () => api.link.get(id),
  enabled,
});

export const settledLinkError = ({
  error,
  isFetching,
}: {
  error: Error | null;
  isFetching: boolean;
}): Error | null => (isFetching ? null : error);

export function useCombatLink(id: CombatId, enabled: boolean): CombatLink {
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const key = useMemo(() => combatLinkKey(id), [id]);
  const query = useQuery(combatLinkQuery(api, id, enabled));
  const reissue = useMemo(
    () =>
      mutation({ queryClient, show, t }, { send: () => api.link.reissue(id), invalidate: [key] }),
    [api, id, key, queryClient, show, t],
  );
  return { token: query.data?.token, error: settledLinkError(query), reissue };
}
