import type { Locale, Settings } from '@combat-planner/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../api/ApiProvider.tsx';
import { locales } from '../provider.tsx';
import { queryKeys } from './queryKeys.ts';
import { getSettings, settingsActions } from './settings.ts';
import type { SettingsActions } from './settings.ts';
import { useToasts } from './useToasts.ts';

export interface SettingsState extends SettingsActions {
  settings: Settings | undefined;
  status: 'pending' | 'error' | 'success';
  error: Error | null;
}

export function useSettings(): SettingsState {
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const { i18n } = useTranslation();
  const query = useQuery({ queryKey: queryKeys.settings, queryFn: () => getSettings(api) });
  const actions = useMemo(
    () =>
      settingsActions(
        api,
        { queryClient, show, t },
        {
          current: (): Locale => locales.find((locale) => locale === i18n.language) ?? 'en',
          apply: (locale) => {
            void i18n.changeLanguage(locale);
          },
        },
      ),
    [api, queryClient, show, t, i18n],
  );
  return { settings: query.data, status: query.status, error: query.error, ...actions };
}
