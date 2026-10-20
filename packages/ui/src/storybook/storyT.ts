import type { TFunction } from 'i18next';
import { createI18n } from '../provider.tsx';
import { storyLocale } from './withLocale.tsx';

export function storyT(globals: Record<string, unknown>, namespace: string): TFunction {
  const locale = storyLocale(globals);
  return createI18n(locale).getFixedT(locale, namespace);
}

const slot = '\u0000';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function anyValue(template: (value: string) => string): RegExp {
  return new RegExp(`^${template(slot).split(slot).map(escapeRegExp).join('.+')}$`);
}
