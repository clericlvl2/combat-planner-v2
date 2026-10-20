import type { TFunction } from 'i18next';
import { createI18n } from '../provider.tsx';
import { storyLocale } from './withLocale.tsx';

export function storyT(globals: Record<string, unknown>, namespace: string): TFunction {
  const locale = storyLocale(globals);
  return createI18n(locale).getFixedT(locale, namespace);
}
