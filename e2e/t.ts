import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInstance } from 'i18next';
import type { TOptions } from 'i18next';

const LOCALE = 'ru';

const localeDir = fileURLToPath(new URL(`../packages/ui/src/i18n/${LOCALE}/`, import.meta.url));

const namespaces = readdirSync(localeDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => path.basename(file, '.json'))
  .sort();

const resources = {
  [LOCALE]: Object.fromEntries(
    namespaces.map((namespace) => [
      namespace,
      JSON.parse(readFileSync(path.join(localeDir, `${namespace}.json`), 'utf8')) as unknown,
    ]),
  ),
};

const instance = createInstance();
void instance.init({
  resources,
  ns: namespaces,
  lng: LOCALE,
  interpolation: { escapeValue: false },
  initAsync: false,
});

export function t(key: string, options?: TOptions): string {
  if (!instance.exists(key, options)) throw new Error(`Missing ${LOCALE} translation: ${key}`);
  return String(instance.t(key, options));
}
