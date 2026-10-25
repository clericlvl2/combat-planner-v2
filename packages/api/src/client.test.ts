import { describe, expect, it } from 'vite-plus/test';
import { ApiError, acceptLanguages, apiEventSchema, browserLocale } from './client.ts';

describe('ApiError', () => {
  it('carries status and code', () => {
    const error = new ApiError({ status: 409, code: 'version' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(409);
    expect(error.code).toBe('version');
    expect(error.retryable).toBe(false);
  });

  it('marks a network failure retryable', () => {
    const error = new ApiError({ status: 0, code: 'network', message: 'offline' });
    expect(error.retryable).toBe(true);
    expect(error.message).toBe('offline');
  });
});

describe('apiEventSchema', () => {
  it('parses the final events', () => {
    expect(apiEventSchema.parse({ type: 'deleted', title: 'Goblin ambush' })).toEqual({
      type: 'deleted',
      title: 'Goblin ambush',
    });
    expect(apiEventSchema.parse({ type: 'linkRevoked' })).toEqual({ type: 'linkRevoked' });
  });
});

describe('browserLocale', () => {
  it('takes the first supported language by its primary subtag', () => {
    expect(browserLocale(['nl-NL', 'ru-RU', 'en-US'])).toBe('ru');
  });

  it('falls back to en', () => {
    expect(browserLocale(['nl-NL'])).toBe('en');
    expect(browserLocale([])).toBe('en');
  });
});

describe('acceptLanguages', () => {
  it('keeps the header order and drops the quality values', () => {
    expect(acceptLanguages('ru-RU,ru;q=0.9,en;q=0.8')).toEqual(['ru-RU', 'ru', 'en']);
  });

  it('trims spaces around each language', () => {
    expect(acceptLanguages('de-DE, en;q=0.5')).toEqual(['de-DE', 'en']);
  });

  it('returns no language for a missing or empty header', () => {
    expect(acceptLanguages(null)).toEqual([]);
    expect(acceptLanguages('')).toEqual([]);
  });

  it('resolves to a locale through browserLocale', () => {
    expect(browserLocale(acceptLanguages('ru-RU,ru;q=0.9,en;q=0.8'))).toBe('ru');
    expect(browserLocale(acceptLanguages('pt-BR'))).toBe('en');
    expect(browserLocale(acceptLanguages(null))).toBe('en');
  });
});
