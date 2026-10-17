import { ApiError } from '@combat-planner/api/client';
import type {
  ApiClient,
  ApiEndEvent,
  LinkToken,
  Locale,
  Unsubscribe,
  VersionResult,
} from '@combat-planner/api/client';
import { LIMITS } from '@combat-planner/domain';
import type { Action, Combat, CombatId, PlayerCombat, Viewer } from '@combat-planner/domain';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.ts';
import { errorToast } from './toasts.ts';
import type { ToastInput, Translate } from './toasts.ts';

export type DmViewer = Extract<Viewer, { kind: 'dm' }>;
export type PlayerViewer = Extract<Viewer, { kind: 'player' }>;
export type CombatDocument = Combat | PlayerCombat;

export interface CombatEntry<Document extends CombatDocument = CombatDocument> {
  document: Document;
  language: Locale | null;
}

export interface CombatSource<Document extends CombatDocument = CombatDocument> {
  load: () => Promise<CombatEntry<Document>>;
  reload: () => Promise<CombatEntry<Document>>;
  subscribe: (
    onDocument: (document: Document) => void,
    onEnd: (event: ApiEndEvent) => void,
  ) => Unsubscribe;
  send: (action: Action) => Promise<VersionResult>;
}

export const combatKey = (id: CombatId, viewer: Viewer): QueryKey =>
  viewer.kind === 'dm'
    ? [...queryKeys.combat, id, 'dm']
    : [...queryKeys.combat, id, 'player', viewer.playerId];

export function dmSource(api: ApiClient, id: CombatId): CombatSource<Combat> {
  return {
    load: async () => ({ document: await api.combats.open(id), language: null }),
    reload: async () => ({ document: await api.combats.get(id), language: null }),
    subscribe: (onDocument, onEnd) => api.combats.subscribe(id, onDocument, onEnd),
    send: (action) => api.combats.dispatch(id, action),
  };
}

export function playerSource(
  api: ApiClient,
  viewer: PlayerViewer,
  token: LinkToken,
): CombatSource<PlayerCombat> {
  const load = async () => {
    const view = await api.play.get(token, viewer.playerId);
    return { document: view.combat, language: view.language };
  };
  return {
    load,
    reload: load,
    subscribe: (onDocument, onEnd) => api.play.subscribe(token, viewer.playerId, onDocument, onEnd),
    send: (action) => api.play.dispatch(token, viewer.playerId, action),
  };
}

export const mergeEntry = <Document extends CombatDocument>(
  current: CombatEntry<Document> | undefined,
  incoming: CombatEntry<Document>,
): CombatEntry<Document> => {
  if (current && current.document.version > incoming.document.version) {
    return { ...current, language: incoming.language ?? current.language };
  }
  return { document: incoming.document, language: incoming.language ?? current?.language ?? null };
};

export const writeDocument = <Document extends CombatDocument>(
  current: CombatEntry<Document> | undefined,
  document: Document,
): CombatEntry<Document> => {
  if (current && current.document.version >= document.version) return current;
  return { document, language: current?.language ?? null };
};

export const entryFetcher = <Document extends CombatDocument>(
  queryClient: QueryClient,
  key: QueryKey,
  source: CombatSource<Document>,
): (() => Promise<CombatEntry<Document>>) => {
  let entered = false;
  return async () => {
    const loaded = entered ? await source.reload() : await source.load();
    entered = true;
    return mergeEntry(queryClient.getQueryData<CombatEntry<Document>>(key), loaded);
  };
};

const SESSION_LOST_CODES: ReadonlySet<ApiError['code']> = new Set([
  'unauthorized',
  'forbidden',
  'notFound',
]);

export const visibleEntry = <Document extends CombatDocument>(
  entry: CombatEntry<Document> | undefined,
  error: Error | null,
): CombatEntry<Document> | undefined =>
  error instanceof ApiError && SESSION_LOST_CODES.has(error.code) ? undefined : entry;

export interface SourceEnd {
  source: CombatSource;
  event: ApiEndEvent;
}

export const endOf = (ended: SourceEnd | null, source: CombatSource): ApiEndEvent | null =>
  ended !== null && ended.source === source ? ended.event : null;

export const refreshEntry = async <Document extends CombatDocument>(
  queryClient: QueryClient,
  key: QueryKey,
  source: CombatSource<Document>,
): Promise<void> => {
  const loaded = await source.reload();
  queryClient.setQueryData<CombatEntry<Document>>(key, (current) => mergeEntry(current, loaded));
};

export const subscribeEntry = <Document extends CombatDocument>(
  queryClient: QueryClient,
  key: QueryKey,
  source: CombatSource<Document>,
  onEnd: (event: ApiEndEvent) => void,
): Unsubscribe =>
  source.subscribe((document) => {
    queryClient.setQueryData<CombatEntry<Document>>(key, (current) =>
      writeDocument(current, document),
    );
  }, onEnd);

export interface DispatcherOptions {
  send: (action: Action) => Promise<VersionResult>;
  refetch: () => Promise<void>;
  show: (input: ToastInput) => string;
  t: Translate;
}

export function createDispatcher({
  send,
  refetch,
  show,
  t,
}: DispatcherOptions): (action: Action) => Promise<void> {
  const dispatch = async (action: Action): Promise<void> => {
    try {
      await send(action);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'version') await refetch().catch(() => {});
      const toast = errorToast(
        error,
        t,
        () => {
          void dispatch(action);
        },
        t('unitCap', { limit: LIMITS.unitsPerCombat }),
      );
      if (toast) show(toast);
    }
  };
  return dispatch;
}
