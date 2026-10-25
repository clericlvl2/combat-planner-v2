import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToastItem, ToastKind } from '../../hooks/toasts.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import { toastLook } from '../shared/toastLook.ts';
import type { PlayerEvent, PlayerEventKind } from './playerEvents.ts';

const eventKinds: Record<PlayerEventKind, ToastKind> = {
  restarted: 'neutral',
  started: 'neutral',
  cleared: 'neutral',
  released: 'neutral',
  removed: 'neutral',
  playerClaimed: 'neutral',
  playerReleased: 'neutral',
};

const toastKeys: Record<PlayerEventKind, string> = {
  restarted: 'dmRestarted',
  started: 'combatStarted',
  cleared: 'dmCleared',
  released: 'dmReleased',
  removed: 'dmRemoved',
  playerClaimed: 'playerClaimed',
  playerReleased: 'playerReleased',
};

const toastOptions = (event: PlayerEvent): Record<string, string> | undefined => {
  if (event.kind === 'released' || event.kind === 'removed') return { hero: event.name };
  if (event.kind === 'playerClaimed' || event.kind === 'playerReleased') {
    return { name: event.player, hero: event.hero };
  }
  return undefined;
};

export function usePlayerToasts(): (event: PlayerEvent) => void {
  const { show } = useToasts();
  const { t } = useTranslation('Toast');
  const queue = useRef<{ pending: string[]; showing: boolean }>({ pending: [], showing: false });
  useEffect(
    () => () => {
      queue.current.pending = [];
    },
    [],
  );
  return useCallback(
    (event: PlayerEvent) => {
      const message = t(toastKeys[event.kind], toastOptions(event));
      if (event.kind !== 'playerClaimed' && event.kind !== 'playerReleased') {
        show({ message, kind: eventKinds[event.kind] });
        return;
      }
      const current = queue.current;
      current.pending.push(message);
      if (current.showing) return;
      const showNext = () => {
        const next = current.pending.shift();
        current.showing = next !== undefined;
        if (next !== undefined) show({ message: next, kind: 'neutral', onDismiss: showNext });
      };
      showNext();
    },
    [show, t],
  );
}

export interface PlayerToastProps {
  aboveBottomBar: boolean;
}

export function PlayerToast({ aboveBottomBar }: PlayerToastProps) {
  const { toasts, dismiss } = useToasts();
  const toast: ToastItem | undefined = toasts[0];
  if (!toast) return null;
  return (
    <Toast
      key={toast.id}
      {...toastLook(toast.kind)}
      message={toast.message}
      action={toast.action}
      duration={toast.duration}
      aboveBottomBar={aboveBottomBar}
      onHide={() => dismiss(toast.id)}
    />
  );
}
