import { IconAlertTriangle, IconCheck, IconInfoCircle, IconWifiOff } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { ToastKind } from '../../hooks/toasts.ts';

const toastIcons: Record<ToastKind, Icon> = {
  success: IconCheck,
  neutral: IconInfoCircle,
  warning: IconAlertTriangle,
  error: IconWifiOff,
};

export const toastLook = (kind: ToastKind): { icon: Icon; tone: ToastKind } => ({
  icon: toastIcons[kind],
  tone: kind,
});
