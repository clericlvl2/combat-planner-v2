import type { ApiEndEvent, DmCombat, LinkToken, Locale } from '@combat-planner/api/client';
import type { CombatId, PlayerCombat } from '@combat-planner/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  PlayerViewer,
  SourceEnd,
} from './combat.ts';
import { useToasts } from './useToasts.ts';

export interface CombatState<Document extends CombatDocument> {
  combat: Document | undefined;
  language: Locale | null;
  status: 'pending' | 'error' | 'success';
  error: Error | null;
  ended: ApiEndEvent | null;
  dispatch: Dispatch;
  refetch: () => Promise<void>;
}

export function useCombat(id: CombatId, viewer: DmViewer): CombatState<DmCombat>;
export function useCombat(
  id: CombatId,
  viewer: PlayerViewer,
  token: LinkToken,
): CombatState<PlayerCombat>;
export function useCombat(
  id: CombatId,
  viewer: DmViewer | PlayerViewer,
  token?: LinkToken,
): CombatState<CombatDocument> {
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const playerId = viewer.kind === 'player' ? viewer.playerId : null;

  const source = useMemo<CombatSource>(
    () =>
      playerId === null
        ? dmSource(api, id)
        : playerSource(api, { kind: 'player', playerId }, token ?? ''),
    [api, id, playerId, token],
  );
  const key = useMemo(
    () => combatKey(id, playerId === null ? { kind: 'dm' } : { kind: 'player', playerId }),
    [id, playerId],
  );

  const fetchEntry = useMemo(
    () => entryFetcher(queryClient, key, source),
    [queryClient, key, source],
  );
  const query = useQuery({ queryKey: key, queryFn: fetchEntry });
  const [ended, setEnded] = useState<SourceEnd | null>(null);

  useEffect(
    () => subscribeEntry(queryClient, key, source, (event) => setEnded({ source, event })),
    [queryClient, key, source],
  );

  const dispatch = useMemo(
    () =>
      createDispatcher({
        send: source.send,
        refetch: () => refreshEntry(queryClient, key, source),
        show,
        t,
      }),
    [source, queryClient, key, show, t],
  );

  const { refetch } = query;
  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const entry = visibleEntry(query.data, query.error);
  return {
    combat: entry?.document,
    language: entry?.language ?? null,
    status: query.status,
    error: query.error,
    ended: endOf(ended, source),
    dispatch,
    refetch: reload,
  };
}
