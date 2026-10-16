import { QueryClient } from '@tanstack/react-query';
import { vi } from 'vite-plus/test';
import { FakeApiClient } from '../../src/api/FakeApiClient.ts';
import type { Scenario } from '../../src/api/scenarios.ts';
import { scenario } from '../../src/api/scenarios.ts';
import type { MutationContext } from '../../src/hooks/mutations.ts';
import type { ToastInput } from '../../src/hooks/toasts.ts';

export const translate = (key: string, options?: Record<string, unknown>) =>
  options === undefined ? key : `${key} ${JSON.stringify(options)}`;

export interface Harness extends MutationContext {
  api: FakeApiClient;
  toasts: ToastInput[];
}

export const harness = (overrides: Partial<Scenario> = {}): Harness => {
  const toasts: ToastInput[] = [];
  return {
    api: new FakeApiClient({ scenario: scenario(overrides) }),
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    toasts,
    show: vi.fn((input: ToastInput) => {
      toasts.push(input);
      return `toast-${toasts.length}`;
    }),
    t: translate,
  };
};

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
