import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInstance } from 'i18next';
import type { Resource, ResourceKey, TOptions } from 'i18next';

const LOCALE = 'ru';

const i18nDir = fileURLToPath(new URL('../packages/ui/src/i18n/', import.meta.url));

const locales = readdirSync(i18nDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const namespacesOf = (locale: string): string[] =>
  readdirSync(path.join(i18nDir, locale))
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.basename(file, '.json'))
    .sort();

const resources: Resource = Object.fromEntries(
  locales.map((locale) => [
    locale,
    Object.fromEntries(
      namespacesOf(locale).map((namespace) => [
        namespace,
        JSON.parse(
          readFileSync(path.join(i18nDir, locale, `${namespace}.json`), 'utf8'),
        ) as ResourceKey,
      ]),
    ),
  ]),
);

const instance = createInstance();
void instance.init({
  resources,
  ns: namespacesOf(LOCALE),
  lng: LOCALE,
  interpolation: { escapeValue: false },
  initAsync: false,
});

export function t(key: string, options?: TOptions): string {
  if (!instance.exists(key, options)) {
    throw new Error(`Missing ${options?.lng ?? LOCALE} translation: ${key}`);
  }
  return String(instance.t(key, options));
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function startsWithT(key: string, options?: TOptions): RegExp {
  return new RegExp(`^${escapeRegExp(t(key, options))}`);
}

export function containsT(key: string, options?: TOptions): RegExp {
  return new RegExp(escapeRegExp(t(key, options)));
}
