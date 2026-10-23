import type {
  ApiEndEvent,
  DmCombat,
  LinkToken,
  Locale,
  PresenceListener,
} from '@combat-planner/api/client';
import type { CombatId, PlayerCombat } from '@combat-planner/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useApi } from '../api/ApiProvider.tsx';
import {
  combatKey,
  createDispatcher,
  dmSource,
  endOf,
  entryFetcher,
  playerSource,
  refreshEntry,
  subscribeEntry,
  visibleEntry,
} from './combat.ts';
import type {
  CombatDocument,
  CombatSource,
  Dispatch,
  DmViewer,
  PendingTracker,
  PlayerViewer,
  SourceEnd,
} from './combat.ts';
import { forgetSessionOn } from './mutations.ts';
import { NO_ENTRIES, pendingKey, pendingTracker } from './optimistic.ts';
import type { Entries } from './optimistic.ts';
import { toastStoreOf } from './toasts.ts';
import { useToasts } from './useToasts.ts';

export interface CombatState<Document extends CombatDocument> {
  combat: Document | undefined;
  language: Locale | null;
  status: 'pending' | 'error' | 'success';
  error: Error | null;
  ended: ApiEndEvent | null;
  dispatch: Dispatch;
  refetch: () => Promise<void>;
  pending: Entries;
  tracker: PendingTracker;
}

export interface DmCombatOptions {
  onPresence?: PresenceListener;
}

export function useCombat(
  id: CombatId,
  viewer: DmViewer,
  options?: DmCombatOptions,
): CombatState<DmCombat>;
export function useCombat(
  id: CombatId,
  viewer: PlayerViewer,
  token: LinkToken,
): CombatState<PlayerCombat>;
export function useCombat(
  id: CombatId,
  viewer: DmViewer | PlayerViewer,
  extra?: LinkToken | DmCombatOptions,
): CombatState<CombatDocument> {
  const token = typeof extra === 'string' ? extra : undefined;
  const onPresence = useRef<PresenceListener | undefined>(undefined);
  onPresence.current = typeof extra === 'object' ? extra.onPresence : undefined;
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const { kind } = viewer;

  const source = useMemo<CombatSource>(
    () => (kind === 'dm' ? dmSource(api, id) : playerSource(api, token ?? '')),
    [api, id, kind, token],
  );
  const key = useMemo(() => combatKey(id, { kind }), [id, kind]);

  const fetchEntry = useMemo(
    () => entryFetcher(queryClient, key, source),
    [queryClient, key, source],
  );
  const query = useQuery({ queryKey: key, queryFn: fetchEntry });
  const tracker = useMemo(() => pendingTracker(queryClient, id, { kind }), [queryClient, id, kind]);
  const entriesKey = useMemo(() => pendingKey(id, { kind }), [id, kind]);
  const subscribePending = useCallback(
    (listener: () => void) => queryClient.getQueryCache().subscribe(listener),
    [queryClient],
  );
  const readPending = useCallback(
    () => queryClient.getQueryData<Entries>(entriesKey) ?? NO_ENTRIES,
    [queryClient, entriesKey],
  );
  const pending = useSyncExternalStore(subscribePending, readPending);
  const serverVersion = query.data?.document.version;

  useEffect(() => {
    if (serverVersion !== undefined) tracker.prune();
  }, [serverVersion, tracker]);
  const [ended, setEnded] = useState<SourceEnd | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      subscribeEntry(
        queryClient,
        key,
        source,
        (event) => setEnded({ source, event }),
        (event) => onPresence.current?.(event),
      ),
    [queryClient, key, source, attempt],
  );

  const dispatch = useMemo(
    () =>
      createDispatcher({
        send: source.send,
        refetch: () => refreshEntry(queryClient, key, source),
        show,
        t,
        generation: toastStoreOf(queryClient).generation,
        failed: (error) => forgetSessionOn(queryClient, error),
        pending: tracker,
      }),
    [source, queryClient, key, show, t, tracker],
  );

  const { refetch } = query;
  const dropped = endOf(ended, source)?.type === 'dropped';
  const reload = useCallback(async () => {
    await refetch();
    if (!dropped) return;
    setEnded(null);
    setAttempt((count) => count + 1);
  }, [refetch, dropped]);

  const entry = visibleEntry(query.data, query.error);
  return {
    combat: entry?.document,
    language: entry?.language ?? null,
    status: query.status,
    error: query.error,
    ended: endOf(ended, source),
    dispatch,
    refetch: reload,
    pending,
    tracker,
  };
}
