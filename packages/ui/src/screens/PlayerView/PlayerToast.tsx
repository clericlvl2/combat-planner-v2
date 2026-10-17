import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconLock,
  IconRefresh,
  IconTrash,
  IconUserOff,
  IconWifiOff,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToasts } from '../../hooks/useToasts.ts';
import type { ToastItem } from '../../hooks/toasts.ts';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import type { ToastTone } from '../../molecules/Toast/Toast.tsx';
import type { PlayerEventKind } from './playerEvents.ts';

interface ToastLook {
  icon: Icon;
  tone: ToastTone;
}

const eventLooks: Record<PlayerEventKind, ToastLook> = {
  restarted: { icon: IconRefresh, tone: 'neutral' },
  cleared: { icon: IconTrash, tone: 'neutral' },
  released: { icon: IconUserOff, tone: 'neutral' },
  removed: { icon: IconUserOff, tone: 'neutral' },
  taken: { icon: IconLock, tone: 'warning' },
};

const failedLook: ToastLook = { icon: IconWifiOff, tone: 'error' };
const otherLook: ToastLook = { icon: IconAlertTriangle, tone: 'warning' };

const toastKeys: Record<PlayerEventKind, string> = {
  restarted: 'dmRestarted',
  cleared: 'dmCleared',
  released: 'dmReleased',
  removed: 'dmRemoved',
  taken: 'heroTaken',
};

const kindsByClient = new WeakMap<QueryClient, Map<string, PlayerEventKind>>();

function kindsOf(queryClient: QueryClient): Map<string, PlayerEventKind> {
  const existing = kindsByClient.get(queryClient);
  if (existing) return existing;
  const created = new Map<string, PlayerEventKind>();
  kindsByClient.set(queryClient, created);
  return created;
}

export function usePlayerToasts(): (kind: PlayerEventKind, hero?: string) => void {
  const queryClient = useQueryClient();
  const { show } = useToasts();
  const { t } = useTranslation('Toast');
  return useCallback(
    (kind: PlayerEventKind, hero?: string) => {
      const message = t(toastKeys[kind], { hero });
      kindsOf(queryClient).set(message, kind);
      show({ message });
    },
    [queryClient, show, t],
  );
}

export interface PlayerToastProps {
  aboveBottomBar: boolean;
}

export function PlayerToast({ aboveBottomBar }: PlayerToastProps) {
  const queryClient = useQueryClient();
  const { toasts, dismiss } = useToasts();
  const toast: ToastItem | undefined = toasts[0];
  if (!toast) return null;
  const kind = kindsOf(queryClient).get(toast.message);
  const look = toast.action ? failedLook : kind ? eventLooks[kind] : otherLook;
  return (
    <Toast
      key={toast.id}
      icon={look.icon}
      tone={look.tone}
      message={toast.message}
      action={toast.action}
      duration={toast.duration}
      aboveBottomBar={aboveBottomBar}
      onHide={() => dismiss(toast.id)}
    />
  );
}
