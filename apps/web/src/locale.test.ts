import { describe, expect, it } from 'vite-plus/test';
import { browserLocale } from './locale.ts';

describe('browserLocale', () => {
  it('takes the first supported language by its primary subtag', () => {
    expect(browserLocale(['nl-NL', 'ru-RU', 'en-US'])).toBe('ru');
  });

  it('falls back to en', () => {
    expect(browserLocale(['nl-NL'])).toBe('en');
    expect(browserLocale([])).toBe('en');
  });
});
