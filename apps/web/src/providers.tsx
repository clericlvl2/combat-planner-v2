import type { ApiClient } from '@combat-planner/api/client';
import type { Locale, LocaleStorage } from '@combat-planner/ui';
import { ApiProvider, UiProvider } from '@combat-planner/ui';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export interface AppProvidersProps {
  api: ApiClient;
  queryClient: QueryClient;
  locale: Locale;
  localeStorage?: LocaleStorage;
  children: ReactNode;
}

export function AppProviders({
  api,
  queryClient,
  locale,
  localeStorage,
  children,
}: AppProvidersProps) {
  return (
    <ApiProvider client={api} queryClient={queryClient}>
      <UiProvider motion="on" locale={locale} localeStorage={localeStorage}>
        {children}
      </UiProvider>
    </ApiProvider>
  );
}
