import type { Decorator, Loader } from '@storybook/react-vite';
import { QueryClient } from '@tanstack/react-query';
import { ApiProvider, createQueryClient } from '../api/ApiProvider.tsx';
import { FakeApiClient } from '../api/FakeApiClient.ts';
import { emptyScenario } from '../api/scenarios.ts';
import type { Scenario } from '../api/scenarios.ts';

export interface ApiParameters {
  scenario?: Scenario;
}

function scenarioOf(value: unknown): Scenario {
  return typeof value === 'object' && value !== null ? (value as Scenario) : emptyScenario;
}

export const apiLoader: Loader = ({ parameters }) => ({
  api: new FakeApiClient({ scenario: scenarioOf(parameters.scenario), delay: 0 }),
  queryClient: createQueryClient(),
});

export function fakeApiOf(loaded: Record<string, unknown>): FakeApiClient {
  const { api } = loaded;
  if (!(api instanceof FakeApiClient)) throw new Error('withApi needs apiLoader in the preview');
  return api;
}

function queryClientOf(loaded: Record<string, unknown>): QueryClient {
  const { queryClient } = loaded;
  if (!(queryClient instanceof QueryClient)) {
    throw new Error('withApi needs apiLoader in the preview');
  }
  return queryClient;
}

export const withApi: Decorator = (Story, { loaded }) => (
  <ApiProvider client={fakeApiOf(loaded)} queryClient={queryClientOf(loaded)}>
    <Story />
  </ApiProvider>
);
