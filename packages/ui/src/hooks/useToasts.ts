import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useMotion } from '../provider.tsx';
import { toastStoreOf } from './toasts.ts';
import type { ToastInput, ToastItem, Translate } from './toasts.ts';

export interface Toasts {
  toasts: readonly ToastItem[];
  show: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  t: Translate;
}

export function useToasts(): Toasts {
  const store = toastStoreOf(useQueryClient());
  const motion = useMotion();
  const { t } = useTranslation('Toast');
  const toasts = useSyncExternalStore(store.subscribe, store.toasts, store.toasts);
  const show = useCallback((input: ToastInput) => store.show(input, motion), [store, motion]);
  const translate = useCallback<Translate>((key, options) => t(key, options), [t]);
  return { toasts, show, dismiss: store.dismiss, t: translate };
}
