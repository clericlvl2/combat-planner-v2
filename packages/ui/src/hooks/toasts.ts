import { ApiError } from '@combat-planner/api/client';
import type { QueryClient } from '@tanstack/react-query';
import { toastDuration } from '../molecules/Toast/Toast.tsx';
import type { ToastAction, ToastTone } from '../molecules/Toast/Toast.tsx';
import type { Motion } from '../provider.tsx';

export type { ToastAction };

export type ToastKind = ToastTone;

export interface ToastInput {
  message: string;
  kind?: ToastKind;
  action?: ToastAction;
  duration?: number | null;
  onDismiss?: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
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

export const errorToast = (
  error: unknown,
  t: Translate,
  retry: () => void,
  limitMessage?: string,
): ToastInput | null => {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'network') {
    return {
      message: t('serverUnreachable'),
      kind: 'error',
      action: { label: t('retry'), onAction: retry },
    };
  }
  if (error.code === 'version') return { message: t('combatChanged'), kind: 'warning' };
  if (error.code === 'limit')
    return { message: limitMessage ?? t('limitReached'), kind: 'warning' };
  return null;
};

export interface ToastStore {
  toasts: () => readonly ToastItem[];
  subscribe: (listener: () => void) => () => void;
  show: (input: ToastInput, motion: Motion) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  generation: () => number;
}

export function createToastStore(): ToastStore {
  let stack: readonly ToastItem[] = [];
  let counter = 0;
  let generation = 0;
  const listeners = new Set<() => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const dismissListeners = new Map<string, () => void>();

  const publish = (next: readonly ToastItem[]) => {
    stack = next;
    for (const listener of listeners) listener();
  };

  const shown = (id: string) => stack.some((item) => item.id === id);

  const dismiss = (id: string) => {
    const timer = timers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.delete(id);
    if (shown(id)) publish(removeToast(stack, id));
    const onDismiss = dismissListeners.get(id);
    dismissListeners.delete(id);
    onDismiss?.();
  };

  const guarded = (id: string, action: ToastAction | undefined): ToastAction | undefined =>
    action && {
      ...action,
      onAction: () => {
        if (shown(id)) action.onAction();
      },
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
      if (input.onDismiss) dismissListeners.set(id, input.onDismiss);
      publish(
        pushToast(stack, {
          id,
          message: input.message,
          kind: input.kind ?? 'neutral',
          action: guarded(id, input.action),
          duration,
        }),
      );
      if (startsTimer(duration, motion)) {
        timers.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    dismiss,
    clear: () => {
      generation += 1;
      for (const { id } of stack) dismiss(id);
    },
    generation: () => generation,
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
