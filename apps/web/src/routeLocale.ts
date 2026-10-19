import type { Locale } from '@combat-planner/ui';
import { useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const OWN_LOCALE_ROUTES: readonly string[] = ['dm', 'play'];

export interface LocaleRouterState {
  matches: readonly { route: { id: string } }[];
  errors: unknown;
  navigation: { state: string };
}

export interface LocaleRouter {
  state: LocaleRouterState;
  subscribe(subscriber: (state: LocaleRouterState) => void): () => void;
}

export interface LanguageSwitch {
  language: string;
  changeLanguage(language: string): Promise<unknown>;
}

const usesBrowserLocale = ({ matches, errors }: LocaleRouterState): boolean =>
  errors !== null || !matches.some(({ route }) => OWN_LOCALE_ROUTES.includes(route.id));

export const showsDmPage = ({ matches, errors, navigation }: LocaleRouterState): boolean =>
  navigation.state === 'idle' && errors === null && matches.some(({ route }) => route.id === 'dm');

export function watchRouteLocale(
  router: LocaleRouter,
  i18n: LanguageSwitch,
  locale: Locale,
): () => void {
  const apply = (state: LocaleRouterState) => {
    if (state.navigation.state !== 'idle' || !usesBrowserLocale(state)) return;
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
  };
  apply(router.state);
  return router.subscribe(apply);
}

export interface RouteLocaleProps {
  router: LocaleRouter;
  locale: Locale;
}

export function RouteLocale({ router, locale }: RouteLocaleProps) {
  const { i18n } = useTranslation();
  useEffect(() => watchRouteLocale(router, i18n, locale), [router, i18n, locale]);
  return null;
}

export interface LanguageBridge {
  language: Promise<LanguageSwitch>;
  bind: (i18n: LanguageSwitch) => void;
}

export function languageBridge(): LanguageBridge {
  let bind: (i18n: LanguageSwitch) => void = () => undefined;
  const language = new Promise<LanguageSwitch>((resolve) => {
    bind = resolve;
  });
  return { language, bind };
}

export interface BindLanguageProps {
  bind: (i18n: LanguageSwitch) => void;
}

export function BindLanguage({ bind }: BindLanguageProps) {
  const { i18n } = useTranslation();
  useLayoutEffect(() => bind(i18n), [bind, i18n]);
  return null;
}
