import type { ApiClient } from '@combat-planner/api/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

const ApiContext = createContext<ApiClient | null>(null);

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export interface ApiProviderProps {
  client: ApiClient;
  queryClient?: QueryClient;
  children: ReactNode;
}

export function ApiProvider({ client, queryClient, children }: ApiProviderProps) {
  const [ownQueryClient] = useState(createQueryClient);
  return (
    <ApiContext.Provider value={client}>
      <QueryClientProvider client={queryClient ?? ownQueryClient}>{children}</QueryClientProvider>
    </ApiContext.Provider>
  );
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (client === null) throw new Error('useApi is called outside ApiProvider');
  return client;
}
