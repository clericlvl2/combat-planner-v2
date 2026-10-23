import { browserLocale, localeSchema } from '@combat-planner/api/client';
import type { Locale } from '@combat-planner/api/client';

export const LOCALE_STORAGE_KEY = 'combat-planner.locale';

export type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function storedLocale(storage: LocaleStorage): Locale | null {
  try {
    const parsed = localeSchema.safeParse(storage.getItem(LOCALE_STORAGE_KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function storeLocale(storage: LocaleStorage, locale: Locale): void {
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    return;
  }
}

export function guestLocale(storage: LocaleStorage, languages: readonly string[]): Locale {
  return storedLocale(storage) ?? browserLocale(languages);
}

export function memoryLocaleStorage(): LocaleStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
