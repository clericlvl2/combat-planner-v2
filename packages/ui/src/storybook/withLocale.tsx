import type { Decorator } from '@storybook/react-vite';
import { UiProvider, locales } from '../provider.tsx';
import type { Locale, Motion } from '../provider.tsx';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  ru: 'Русский',
};

export const localeGlobalType = {
  locale: {
    description: 'Interface language',
    toolbar: {
      title: 'Locale',
      icon: 'globe' as const,
      items: locales.map((value) => ({ value, title: localeNames[value] })),
      dynamicTitle: true,
    },
  },
};

function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale === value);
}

export function storyLocale(globals: Record<string, unknown>): Locale {
  return isLocale(globals.locale) ? globals.locale : 'en';
}

function isMotion(value: unknown): value is Motion {
  return value === 'on' || value === 'off';
}

export const withLocale: Decorator = (Story, { globals, parameters }) => (
  <UiProvider
    locale={storyLocale(globals)}
    motion={isMotion(parameters.motion) ? parameters.motion : 'off'}
  >
    <Story />
  </UiProvider>
);
