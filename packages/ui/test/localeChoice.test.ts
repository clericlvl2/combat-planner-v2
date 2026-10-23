import { describe, expect, it } from 'vite-plus/test';
import {
  LOCALE_STORAGE_KEY,
  guestLocale,
  memoryLocaleStorage,
  storeLocale,
  storedLocale,
} from '../src/localeChoice.ts';
import type { LocaleStorage } from '../src/localeChoice.ts';

const storageWith = (value: string | null): LocaleStorage => {
  const storage = memoryLocaleStorage();
  if (value !== null) storage.setItem(LOCALE_STORAGE_KEY, value);
  return storage;
};

const brokenStorage: LocaleStorage = {
  getItem: () => {
    throw new Error('storage disabled');
  },
  setItem: () => {
    throw new Error('storage disabled');
  },
};

describe('guestLocale', () => {
  it('uses the stored locale instead of the browser language', () => {
    expect(guestLocale(storageWith('en'), ['ru-RU', 'ru'])).toBe('en');
  });

  it('falls back to the browser language when nothing is stored', () => {
    expect(guestLocale(storageWith(null), ['de-DE', 'en'])).toBe('de');
  });

  it('ignores a stored value that is not a locale', () => {
    expect(guestLocale(storageWith('pt'), ['fr-FR'])).toBe('fr');
  });

  it('falls back to the browser language when the storage throws', () => {
    expect(guestLocale(brokenStorage, ['ja'])).toBe('ja');
  });
});

describe('storeLocale', () => {
  it('stores the locale under combat-planner.locale', () => {
    const storage = storageWith(null);
    storeLocale(storage, 'es');
    expect(storage.getItem('combat-planner.locale')).toBe('es');
    expect(storedLocale(storage)).toBe('es');
  });

  it('ignores a storage that throws', () => {
    expect(() => storeLocale(brokenStorage, 'es')).not.toThrow();
    expect(storedLocale(brokenStorage)).toBeNull();
  });
});
