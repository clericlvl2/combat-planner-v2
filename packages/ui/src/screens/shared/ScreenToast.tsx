import { useToasts } from '../../hooks/useToasts.ts';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import { toastLook } from './toastLook.ts';

export function ScreenToast() {
  const { toasts, dismiss } = useToasts();
  const toast = toasts[0];
  if (!toast) return null;
  return (
    <Toast
      key={toast.id}
      {...toastLook(toast.kind)}
      aboveBottomBar={false}
      message={toast.message}
      action={toast.action}
      duration={toast.duration}
      onHide={() => dismiss(toast.id)}
    />
  );
}
