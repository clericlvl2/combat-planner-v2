import { MantineProvider, mergeThemeOverrides } from '@mantine/core';
import type { MantineThemeOverride } from '@mantine/core';
import { createInstance } from 'i18next';
import type { i18n as I18n, Resource } from 'i18next';
import { createContext, useContext, useLayoutEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { cssVariablesResolver, theme } from './theme.ts';

export const locales = ['en', 'de', 'es', 'fr', 'ja', 'ru'] as const;

export type Locale = (typeof locales)[number];

export type Motion = 'on' | 'off';

const localeFiles = import.meta.glob<Record<string, unknown>>('./i18n/*/*.json', {
  eager: true,
  import: 'default',
});

function buildResources(): { resources: Resource; namespaces: string[] } {
  const resources: Resource = {};
  const namespaces = new Set<string>();
  for (const [filePath, content] of Object.entries(localeFiles)) {
    const match = /\/i18n\/([^/]+)\/([^/]+)\.json$/.exec(filePath);
    const lng = match?.[1];
    const namespace = match?.[2];
    if (!lng || !namespace) continue;
    resources[lng] = { ...resources[lng], [namespace]: content };
    namespaces.add(namespace);
  }
  return { resources, namespaces: [...namespaces].sort() };
}

const { resources, namespaces } = buildResources();

export function createI18n(locale: Locale): I18n {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    resources,
    ns: namespaces,
    lng: locale,
    fallbackLng: 'en',
    supportedLngs: [...locales],
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}

const transitionComponents = [
  'Affix',
  'Autocomplete',
  'Combobox',
  'Dialog',
  'Drawer',
  'HoverCard',
  'Menu',
  'Modal',
  'MultiSelect',
  'Popover',
  'Select',
  'TagsInput',
  'Tooltip',
] as const;

const motionOffTheme: MantineThemeOverride = {
  components: {
    ...Object.fromEntries(
      transitionComponents.map((name) => [
        name,
        { defaultProps: { transitionProps: { duration: 0 } } },
      ]),
    ),
    Accordion: { defaultProps: { transitionDuration: 0 } },
    Collapse: { defaultProps: { transitionDuration: 0 } },
    Transition: { defaultProps: { duration: 0 } },
  },
};

const themes: Record<Motion, MantineThemeOverride> = {
  on: theme,
  off: mergeThemeOverrides(theme, motionOffTheme),
};

const MotionContext = createContext<Motion>('on');

export function useMotion(): Motion {
  return useContext(MotionContext);
}

export interface UiProviderProps {
  motion: Motion;
  locale: Locale;
  children: ReactNode;
}

export function UiProvider({ motion, locale, children }: UiProviderProps) {
  const i18n = useMemo(() => createI18n(locale), [locale]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = motion;
    return () => {
      delete root.dataset.motion;
    };
  }, [motion]);

  return (
    <MotionContext.Provider value={motion}>
      <MantineProvider theme={themes[motion]} cssVariablesResolver={cssVariablesResolver}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </MantineProvider>
    </MotionContext.Provider>
  );
}
