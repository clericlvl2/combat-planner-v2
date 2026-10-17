import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { errorToast, toastStoreOf } from './toasts.ts';
import type { ToastInput, Translate } from './toasts.ts';

export interface MutationContext {
  queryClient: QueryClient;
  show: (input: ToastInput) => string;
  t: Translate;
}

export interface MutationSpec<Args extends unknown[], Result> {
  send: (...args: Args) => Promise<Result>;
  invalidate: readonly QueryKey[];
  clearCache?: boolean;
  success?: (result: Result, args: Args) => ToastInput | null;
}

export function mutation<Args extends unknown[], Result>(
  context: MutationContext,
  { send, invalidate, clearCache = false, success }: MutationSpec<Args, Result>,
): (...args: Args) => Promise<Result> {
  const toastStore = toastStoreOf(context.queryClient);

  const settle = async (result: Result, args: Args): Promise<Result> => {
    if (clearCache) {
      context.queryClient.clear();
      toastStore.clear();
    } else {
      await Promise.all(
        invalidate.map((queryKey) => context.queryClient.invalidateQueries({ queryKey })),
      );
    }
    const toast = success?.(result, args);
    if (toast) context.show(toast);
    return result;
  };

  return (...args: Args) =>
    new Promise<Result>((resolve, reject) => {
      const generation = toastStore.generation();
      const attempt = () => {
        let sent: Promise<Result>;
        try {
          sent = send(...args);
        } catch (error) {
          sent = Promise.reject(error);
        }
        sent.then(
          (result) => settle(result, args).then(resolve, reject),
          (error: unknown) => {
            if (toastStore.generation() !== generation) {
              reject(error);
              return;
            }
            let retried = false;
            const toast = errorToast(error, context.t, () => {
              retried = true;
              attempt();
            });
            if (!toast?.action) {
              if (toast) context.show(toast);
              reject(error);
              return;
            }
            context.show({
              ...toast,
              onDismiss: () => {
                if (!retried) reject(error);
              },
            });
          },
        );
      };
      attempt();
    });
}
