import type { ApiClient, Locale, Settings } from '@combat-planner/api/client';
import { mutation } from './mutations.ts';
import type { MutationContext } from './mutations.ts';
import { queryKeys } from './queryKeys.ts';

export interface LocaleControl {
  current: () => Locale;
  apply: (locale: Locale) => void;
}

export interface SettingsActions {
  update: (patch: Settings) => Promise<Settings>;
}

export const getSettings = (api: ApiClient): Promise<Settings> => api.settings.get();

export function settingsActions(
  api: ApiClient,
  context: MutationContext,
  locale: LocaleControl,
): SettingsActions {
  return {
    update: mutation(context, {
      send: async (patch: Settings) => {
        const previous = locale.current();
        locale.apply(patch.language);
        try {
          return await api.settings.update(patch);
        } catch (error) {
          locale.apply(previous);
          throw error;
        }
      },
      invalidate: [queryKeys.settings],
    }),
  };
}
