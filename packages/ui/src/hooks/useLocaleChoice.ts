import type { Locale } from '@combat-planner/api/client';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { storeLocale, storedLocale } from '../localeChoice.ts';
import { locales, useLocaleStorage } from '../provider.tsx';

export interface LocaleChoice {
  locale: Locale;
  chosen: () => Locale | null;
  choose: (locale: Locale) => void;
}

export function useLocaleChoice(): LocaleChoice {
  const { i18n } = useTranslation();
  const storage = useLocaleStorage();
  const locale = locales.find((candidate) => candidate === i18n.language) ?? 'en';
  const chosen = useCallback(() => storedLocale(storage), [storage]);
  const choose = useCallback(
    (next: Locale) => {
      storeLocale(storage, next);
      if (i18n.language !== next) void i18n.changeLanguage(next);
    },
    [storage, i18n],
  );
  return { locale, chosen, choose };
}
