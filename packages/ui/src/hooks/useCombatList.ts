import type { CombatSummary } from '@combat-planner/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useApi } from '../api/ApiProvider.tsx';
import { combatListActions, listCombats } from './combatList.ts';
import type { CombatListActions } from './combatList.ts';
import { queryKeys } from './queryKeys.ts';
import { useToasts } from './useToasts.ts';

export interface CombatList extends CombatListActions {
  combats: CombatSummary[] | undefined;
  status: 'pending' | 'error' | 'success';
  error: Error | null;
}

export function useCombatList(): CombatList {
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const query = useQuery({ queryKey: queryKeys.combats, queryFn: () => listCombats(api) });
  const actions = useMemo(
    () => combatListActions(api, { queryClient, show, t }),
    [api, queryClient, show, t],
  );
  return { combats: query.data, status: query.status, error: query.error, ...actions };
}
