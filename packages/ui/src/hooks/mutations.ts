import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { errorToast } from './toasts.ts';
import type { ToastInput, Translate } from './toasts.ts';

export interface MutationContext {
  queryClient: QueryClient;
  show: (input: ToastInput) => string;
  t: Translate;
}

export interface MutationSpec<Args extends unknown[], Result> {
  send: (...args: Args) => Promise<Result>;
  invalidate: readonly QueryKey[];
  success?: (result: Result, args: Args) => ToastInput | null;
}

export function mutation<Args extends unknown[], Result>(
  context: MutationContext,
  { send, invalidate, success }: MutationSpec<Args, Result>,
): (...args: Args) => Promise<Result> {
  const run = async (...args: Args): Promise<Result> => {
    let result: Result;
    try {
      result = await send(...args);
    } catch (error) {
      const toast = errorToast(error, context.t, () => {
        run(...args).catch(() => {});
      });
      if (toast) context.show(toast);
      throw error;
    }
    await Promise.all(
      invalidate.map((queryKey) => context.queryClient.invalidateQueries({ queryKey })),
    );
    const toast = success?.(result, args);
    if (toast) context.show(toast);
    return result;
  };
  return run;
}
