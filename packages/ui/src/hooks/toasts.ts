import { ApiError } from '@combat-planner/api/client';
import type { QueryClient } from '@tanstack/react-query';
import { toastDuration } from '../molecules/Toast/Toast.tsx';
import type { ToastAction } from '../molecules/Toast/Toast.tsx';
import type { Motion } from '../provider.tsx';

export type { ToastAction };

export interface ToastInput {
  message: string;
  action?: ToastAction;
  duration?: number | null;
}

export interface ToastItem {
  id: string;
  message: string;
  action?: ToastAction;
  duration: number | null;
}

export type Translate = (key: string, options?: Record<string, unknown>) => string;

export const durationOf = ({ action, duration }: ToastInput): number | null => {
  if (duration !== undefined) return duration;
  return action ? toastDuration.withAction : toastDuration.plain;
};

export const startsTimer = (duration: number | null, motion: Motion): duration is number =>
  duration !== null && motion === 'on';

export const pushToast = (stack: readonly ToastItem[], toast: ToastItem): ToastItem[] => [
  toast,
  ...stack.filter((item) => item.id !== toast.id),
];

export const removeToast = (stack: readonly ToastItem[], id: string): ToastItem[] =>
  stack.filter((item) => item.id !== id);

export const errorToast = (error: unknown, t: Translate, retry: () => void): ToastInput | null => {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'network') {
    return { message: t('serverUnreachable'), action: { label: t('retry'), onAction: retry } };
  }
  if (error.code === 'version') return { message: t('combatChanged') };
  return null;
};

export interface ToastStore {
  toasts: () => readonly ToastItem[];
  subscribe: (listener: () => void) => () => void;
  show: (input: ToastInput, motion: Motion) => string;
  dismiss: (id: string) => void;
}

export function createToastStore(): ToastStore {
  let stack: readonly ToastItem[] = [];
  let counter = 0;
  const listeners = new Set<() => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const publish = (next: readonly ToastItem[]) => {
    stack = next;
    for (const listener of listeners) listener();
  };

  const dismiss = (id: string) => {
    const timer = timers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.delete(id);
    if (stack.some((item) => item.id === id)) publish(removeToast(stack, id));
  };

  return {
    toasts: () => stack,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    show: (input, motion) => {
      counter += 1;
      const id = `toast-${counter}`;
      const duration = durationOf(input);
      publish(pushToast(stack, { id, message: input.message, action: input.action, duration }));
      if (startsTimer(duration, motion)) {
        timers.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    dismiss,
  };
}

const stores = new WeakMap<QueryClient, ToastStore>();

export const toastStoreOf = (queryClient: QueryClient): ToastStore => {
  const existing = stores.get(queryClient);
  if (existing) return existing;
  const created = createToastStore();
  stores.set(queryClient, created);
  return created;
};
