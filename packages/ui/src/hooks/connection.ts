import type { ConnectionApi, ConnectionState } from '@combat-planner/api/client';
import type { Motion } from '../provider.tsx';

export const RECONNECTING_TOAST_AFTER_MS = 10_000;

export const reconnectingToastDelay = (motion: Motion): number =>
  motion === 'off' ? 0 : RECONNECTING_TOAST_AFTER_MS;

export interface WatchConnectionOptions {
  connection: ConnectionApi;
  delay: number;
  showReconnecting: () => string;
  dismiss: (id: string) => void;
  onReconnected: () => void;
}

export function watchConnection({
  connection,
  delay,
  showReconnecting,
  dismiss,
  onReconnected,
}: WatchConnectionOptions): () => void {
  let previous: ConnectionState = connection.state();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let toastId: string | null = null;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const hideToast = () => {
    if (toastId === null) return;
    dismiss(toastId);
    toastId = null;
  };

  const enter = (state: ConnectionState) => {
    if (state === 'reconnecting') {
      if (timer !== undefined || toastId !== null) return;
      if (delay === 0) {
        toastId = showReconnecting();
        return;
      }
      timer = setTimeout(() => {
        timer = undefined;
        toastId = showReconnecting();
      }, delay);
      return;
    }
    clearTimer();
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
    clearTimer();
    hideToast();
  };
}
