import type { TFunction } from 'i18next';
import { createI18n } from '../provider.tsx';
import { storyLocale } from './withLocale.tsx';

export function storyT(globals: Record<string, unknown>, namespace: string): TFunction {
  const locale = storyLocale(globals);
  return createI18n(locale).getFixedT(locale, namespace);
}

const slot = '\u0000';
const missing = '\u0001';
const pluralSuffixes = ['', '_zero', '_one', '_two', '_few', '_many', '_other'];

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function anyValue(t: TFunction, key: string, option: string): RegExp {
  const forms = pluralSuffixes
    .map((suffix) => String(t(`${key}${suffix}`, { [option]: slot, defaultValue: missing })))
    .filter((form) => form !== missing)
    .map((form) => form.split(slot).map(escapeRegExp).join('.+'));
  return new RegExp(`^(?:${forms.join('|')})$`);
}
