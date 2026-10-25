import type { ApiClient } from '@combat-planner/api/client';
import type { Locale, LocaleStorage, TourStorage } from '@combat-planner/ui';
import { ApiProvider, UiProvider } from '@combat-planner/ui';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export interface AppProvidersProps {
  api: ApiClient;
  queryClient: QueryClient;
  locale: Locale;
  localeStorage?: LocaleStorage;
  tourStorage?: TourStorage;
  children: ReactNode;
}

export function AppProviders({
  api,
  queryClient,
  locale,
  localeStorage,
  tourStorage,
  children,
}: AppProvidersProps) {
  return (
    <ApiProvider client={api} queryClient={queryClient}>
      <UiProvider
        motion="on"
        locale={locale}
        localeStorage={localeStorage}
        tourStorage={tourStorage}
      >
        {children}
      </UiProvider>
    </ApiProvider>
  );
}
