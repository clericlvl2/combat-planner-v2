import type { Session } from '@combat-planner/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useApi } from '../api/ApiProvider.tsx';
import { accountActions, getProviders, getSession } from './account.ts';
import type { AccountActions, SocialProvider } from './account.ts';
import { queryKeys } from './queryKeys.ts';
import { useToasts } from './useToasts.ts';

export interface Account extends AccountActions {
  session: Session | null | undefined;
  providers: SocialProvider[] | undefined;
  status: 'pending' | 'error' | 'success';
  error: Error | null;
}

export function useAccount(): Account {
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const session = useQuery({ queryKey: queryKeys.session, queryFn: () => getSession(api) });
  const providers = useQuery({ queryKey: queryKeys.providers, queryFn: () => getProviders(api) });
  const actions = useMemo(
    () => accountActions(api, { queryClient, show, t }),
    [api, queryClient, show, t],
  );
  return {
    session: session.data,
    providers: providers.data,
    status: session.status,
    error: session.error,
    ...actions,
  };
}
