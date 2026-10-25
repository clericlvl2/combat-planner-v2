import { useEffect } from 'react';

export interface PageVisibility {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export function keepScreenAwake(
  wakeLock: Pick<WakeLock, 'request'>,
  page: PageVisibility,
): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let requesting = false;
  let stopped = false;

  const acquire = () => {
    if (stopped || requesting || page.visibilityState !== 'visible') return;
    if (sentinel !== null && !sentinel.released) return;
    requesting = true;
    wakeLock.request('screen').then(
      (held) => {
        requesting = false;
        if (stopped) {
          void held.release().catch(() => {});
          return;
        }
        sentinel = held;
      },
      () => {
        requesting = false;
      },
    );
  };

  acquire();
  page.addEventListener('visibilitychange', acquire);
  return () => {
    stopped = true;
    page.removeEventListener('visibilitychange', acquire);
    if (sentinel !== null) void sentinel.release().catch(() => {});
    sentinel = null;
  };
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    return keepScreenAwake(navigator.wakeLock, document);
  }, [active]);
}
