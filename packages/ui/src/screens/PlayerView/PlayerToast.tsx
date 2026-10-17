import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToastItem, ToastKind } from '../../hooks/toasts.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import { toastLook } from '../shared/toastLook.ts';
import type { PlayerEventKind } from './playerEvents.ts';

const eventKinds: Record<PlayerEventKind, ToastKind> = {
  restarted: 'neutral',
  cleared: 'neutral',
  released: 'neutral',
  removed: 'neutral',
  taken: 'warning',
};

const toastKeys: Record<PlayerEventKind, string> = {
  restarted: 'dmRestarted',
  cleared: 'dmCleared',
  released: 'dmReleased',
  removed: 'dmRemoved',
  taken: 'heroTaken',
};

export function usePlayerToasts(): (kind: PlayerEventKind, hero?: string) => void {
  const { show } = useToasts();
  const { t } = useTranslation('Toast');
  return useCallback(
    (kind: PlayerEventKind, hero?: string) => {
      show({ message: t(toastKeys[kind], { hero }), kind: eventKinds[kind] });
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
