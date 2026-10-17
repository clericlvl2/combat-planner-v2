import type { ConnectionApi, ConnectionState } from '@combat-planner/api/client';
import type { QueryClient } from '@tanstack/react-query';

export interface WatchConnectionOptions {
  connection: ConnectionApi;
  showReconnecting: () => string;
  dismiss: (id: string) => void;
  onReconnected: () => void;
}

export function watchConnection({
  connection,
  showReconnecting,
  dismiss,
  onReconnected,
}: WatchConnectionOptions): () => void {
  let previous: ConnectionState = connection.state();
  let toastId: string | null = null;

  const hideToast = () => {
    if (toastId === null) return;
    dismiss(toastId);
    toastId = null;
  };

  const enter = (state: ConnectionState) => {
    if (state === 'reconnecting') {
      toastId ??= showReconnecting();
      return;
    }
    hideToast();
    if (state === 'connected' && previous === 'reconnecting') onReconnected();
  };

  enter(previous);
  const unsubscribe = connection.subscribe((state) => {
    enter(state);
    previous = state;
  });

  return () => {
    unsubscribe();
    hideToast();
  };
}

interface SharedWatch {
  users: number;
  latest: WatchConnectionOptions;
  stop: () => void;
}

const sharedWatches = new WeakMap<QueryClient, SharedWatch>();

const release = (queryClient: QueryClient, shared: SharedWatch) => {
  shared.users -= 1;
  if (shared.users > 0) return;
  shared.stop();
  if (sharedWatches.get(queryClient) === shared) sharedWatches.delete(queryClient);
};

export function shareConnectionWatch(
  queryClient: QueryClient,
  options: WatchConnectionOptions,
): () => void {
  const existing = sharedWatches.get(queryClient);
  if (existing && existing.latest.connection === options.connection) {
    existing.users += 1;
    existing.latest = options;
    return () => release(queryClient, existing);
  }
  existing?.stop();
  const shared: SharedWatch = { users: 1, latest: options, stop: () => {} };
  shared.stop = watchConnection({
    connection: options.connection,
    showReconnecting: () => shared.latest.showReconnecting(),
    dismiss: (id) => shared.latest.dismiss(id),
    onReconnected: () => shared.latest.onReconnected(),
  });
  sharedWatches.set(queryClient, shared);
  return () => release(queryClient, shared);
}
