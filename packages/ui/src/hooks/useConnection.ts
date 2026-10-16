import type { ConnectionState } from '@combat-planner/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useApi } from '../api/ApiProvider.tsx';
import { useMotion } from '../provider.tsx';
import { reconnectingToastDelay, watchConnection } from './connection.ts';
import { queryKeys } from './queryKeys.ts';
import { useToasts } from './useToasts.ts';

export function useConnection(): ConnectionState {
  const { connection } = useApi();
  const queryClient = useQueryClient();
  const motion = useMotion();
  const { show, dismiss, t } = useToasts();

  const subscribe = useCallback(
    (listener: () => void) => connection.subscribe(listener),
    [connection],
  );
  const snapshot = useCallback(() => connection.state(), [connection]);
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(
    () =>
      watchConnection({
        connection,
        delay: reconnectingToastDelay(motion),
        showReconnecting: () => show({ message: t('reconnecting'), duration: null }),
        dismiss,
        onReconnected: () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.combat });
        },
      }),
    [connection, motion, show, dismiss, t, queryClient],
  );

  return state;
}
