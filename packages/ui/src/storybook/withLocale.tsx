import type { Decorator, Loader } from '@storybook/react-vite';
import { UiProvider, locales } from '../provider.tsx';
import type { Locale, Motion } from '../provider.tsx';
import { memoryTourStorage } from '../tour/progress.ts';
import type { TourProgress, TourRole, TourStorage } from '../tour/progress.ts';

export type TourParameter = Partial<Record<TourRole, TourProgress>>;

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

export const tourLoader: Loader = ({ parameters }) => ({
  tourStorage:
    typeof parameters.tour === 'object' && parameters.tour !== null
      ? memoryTourStorage(parameters.tour as TourParameter)
      : undefined,
});

function tourStorageOf(loaded: Record<string, unknown>): TourStorage | undefined {
  const { tourStorage } = loaded;
  return typeof tourStorage === 'object' && tourStorage !== null
    ? (tourStorage as TourStorage)
    : undefined;
}

export const withLocale: Decorator = (Story, { globals, parameters, loaded }) => (
  <UiProvider
    locale={storyLocale(globals)}
    motion={isMotion(parameters.motion) ? parameters.motion : 'off'}
    tourStorage={tourStorageOf(loaded)}
  >
    <Story />
  </UiProvider>
);
