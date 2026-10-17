import { locales } from '@combat-planner/ui';
import type { Locale } from '@combat-planner/ui';

export function browserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.toLowerCase().split('-')[0];
    const locale = locales.find((candidate) => candidate === primary);
    if (locale) return locale;
  }
  return 'en';
}
