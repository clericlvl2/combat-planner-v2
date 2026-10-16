import type { ApiEndEvent, LinkToken, Locale } from '@combat-planner/api/client';
import type { Action, Combat, CombatId, PlayerCombat } from '@combat-planner/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/ApiProvider.tsx';
import {
  combatKey,
  createDispatcher,
  dmSource,
  fetchEntry,
  playerSource,
  refreshEntry,
  subscribeEntry,
} from './combat.ts';
import type { CombatDocument, CombatSource, DmViewer, PlayerViewer } from './combat.ts';
import { useToasts } from './useToasts.ts';

export interface CombatState<Document extends CombatDocument> {
  combat: Document | undefined;
  language: Locale | null;
  status: 'pending' | 'error' | 'success';
  error: Error | null;
  ended: ApiEndEvent | null;
  dispatch: (action: Action) => Promise<void>;
}

export function useCombat(id: CombatId, viewer: DmViewer): CombatState<Combat>;
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

  const query = useQuery({ queryKey: key, queryFn: () => fetchEntry(queryClient, key, source) });
  const [ended, setEnded] = useState<ApiEndEvent | null>(null);

  useEffect(() => subscribeEntry(queryClient, key, source, setEnded), [queryClient, key, source]);

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

  return {
    combat: query.data?.document,
    language: query.data?.language ?? null,
    status: query.status,
    error: query.error,
    ended,
    dispatch,
  };
}
