import { IconAlertTriangle, IconUserX, IconWifiOff } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useToasts } from '../../hooks/useToasts.ts';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import type { ToastTone } from '../../molecules/Toast/Toast.tsx';

const toastLooks: Record<'deleted' | 'failed' | 'other', { icon: Icon; tone: ToastTone }> = {
  deleted: { icon: IconUserX, tone: 'neutral' },
  failed: { icon: IconWifiOff, tone: 'error' },
  other: { icon: IconAlertTriangle, tone: 'warning' },
};

export function ScreenToast() {
  const { toasts, dismiss, t } = useToasts();
  const toast = toasts[0];
  if (!toast) return null;
  const look = toast.action
    ? toastLooks.failed
    : toast.message === t('accountDeleted')
      ? toastLooks.deleted
      : toastLooks.other;
  return (
    <Toast
      key={toast.id}
      {...look}
      aboveBottomBar={false}
      message={toast.message}
      action={toast.action}
      duration={toast.duration}
      onHide={() => dismiss(toast.id)}
    />
  );
}
