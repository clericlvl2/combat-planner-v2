import type { ApiClient, Session } from '@combat-planner/api/client';
import {
  Account,
  CombatList,
  Landing,
  Library,
  Settings,
  SignIn,
  SignUp,
} from '@combat-planner/ui';
import type { QueryClient } from '@tanstack/react-query';
import { createBrowserRouter, redirect } from 'react-router';
import type {
  DataRouter,
  HydrationState,
  LoaderFunctionArgs,
  RouteObject,
  RouterNavigateOptions,
  To,
} from 'react-router';
import { AboutPage, CombatPage, DmPages, NotFoundPage, PlayerPage, RouteError } from './pages.tsx';
import type { CombatRouteData, PlayerRouteData } from './pages.tsx';
import { showsDmPage } from './routeLocale.ts';
import type { LanguageSwitch, LocaleRouterState } from './routeLocale.ts';

export const SIGN_IN_PATH = '/auth/sign-in';
export const HOME_PATH = '/combats';

const SESSION_KEY = ['session'] as const;

export interface AboutLinks {
  version: string;
  sourceUrl: string;
}

export interface AppRouteOptions {
  api: ApiClient;
  queryClient: QueryClient;
  about: AboutLinks;
  language: Promise<LanguageSwitch>;
  reportError: (error: unknown) => void;
  guestAtBoot?: boolean;
}

export const GUEST_BOOT: HydrationState = { loaderData: { home: null } };

export type RouterStateGetter = () => { state: LocaleRouterState };

const unreachable = (): undefined => undefined;

export function createRoutes(
  { api, queryClient, about, language, reportError }: AppRouteOptions,
  router: RouterStateGetter,
): RouteObject[] {
  const cachedSession = (): Promise<Session | null | undefined> =>
    queryClient
      .ensureQueryData({ queryKey: SESSION_KEY, queryFn: () => api.auth.session() })
      .catch(unreachable);

  const freshSession = (): Promise<Session | null | undefined> =>
    queryClient
      .fetchQuery({ queryKey: SESSION_KEY, queryFn: () => api.auth.session(), staleTime: 0 })
      .catch(unreachable);

  const applySessionLanguage = async (session: Session) => {
    const i18n = await language;
    if (i18n.language !== session.language) await i18n.changeLanguage(session.language);
  };

  let stopFollowing = (): void => undefined;

  const leaveDm = () => {
    stopFollowing();
    stopFollowing = () => undefined;
  };

  const followSessionLanguage = () => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      const session = queryClient.getQueryData<Session | null>(SESSION_KEY);
      if (session === undefined || !showsDmPage(router().state)) return;
      leaveDm();
      if (session) void applySessionLanguage(session);
    });
    stopFollowing = unsubscribe;
  };

  const requireSession = async ({ request }: LoaderFunctionArgs) => {
    leaveDm();
    const session = await cachedSession();
    if (request.signal.aborted) return null;
    if (session === null) throw redirect(SIGN_IN_PATH);
    if (session === undefined) {
      followSessionLanguage();
      return null;
    }
    const i18n = await language;
    if (request.signal.aborted) return null;
    if (i18n.language !== session.language) await i18n.changeLanguage(session.language);
    return null;
  };

  const optionalSession = async ({ request }: LoaderFunctionArgs) => {
    leaveDm();
    const session = await cachedSession();
    if (request.signal.aborted || !session) return null;
    const i18n = await language;
    if (request.signal.aborted) return null;
    if (i18n.language !== session.language) await i18n.changeLanguage(session.language);
    return null;
  };

  const requireGuest = async () => {
    leaveDm();
    if (await freshSession()) throw redirect(HOME_PATH);
    return null;
  };

  const notFound = () => {
    leaveDm();
    return null;
  };

  const combatData = ({ params }: LoaderFunctionArgs): CombatRouteData => ({
    combatId: params.id ?? '',
  });

  const playerData = ({ params, request }: LoaderFunctionArgs): PlayerRouteData => {
    leaveDm();
    return {
      combatId: params.id ?? '',
      token: new URL(request.url).searchParams.get('t') || null,
    };
  };

  return [
    {
      id: 'root',
      path: '/',
      errorElement: <RouteError onShow={leaveDm} onReport={reportError} />,
      children: [
        {
          id: 'home',
          index: true,
          loader: requireGuest,
          element: <Landing sourceUrl={about.sourceUrl} />,
        },
        {
          id: 'dm',
          loader: requireSession,
          element: <DmPages />,
          children: [
            { id: 'combats', path: 'combats', element: <CombatList /> },
            { id: 'combat', path: 'combats/:id', loader: combatData, element: <CombatPage /> },
            { id: 'library', path: 'library', element: <Library /> },
            { id: 'settings', path: 'settings', element: <Settings /> },
            { id: 'account', path: 'account', element: <Account /> },
          ],
        },
        { id: 'about', path: 'about', loader: optionalSession, element: <AboutPage {...about} /> },
        { id: 'play', path: 'combats/:id/play', loader: playerData, element: <PlayerPage /> },
        {
          id: 'auth',
          loader: requireGuest,
          children: [
            { id: 'sign-in', path: 'auth/sign-in', element: <SignIn /> },
            { id: 'sign-up', path: 'auth/sign-up', element: <SignUp /> },
          ],
        },
        { id: 'not-found', path: '*', loader: notFound, element: <NotFoundPage /> },
      ],
    },
  ];
}

export function createAppRouter(options: AppRouteOptions): DataRouter {
  const router: DataRouter = createBrowserRouter(
    createRoutes(options, () => router),
    {
      hydrationData: options.guestAtBoot ? GUEST_BOOT : undefined,
    },
  );
  return withViewTransitions(router);
}

export function withViewTransitions(router: DataRouter): DataRouter {
  const navigate = router.navigate.bind(router);
  router.navigate = ((to: To | null | number, opts?: RouterNavigateOptions) =>
    typeof to === 'number'
      ? navigate(to)
      : navigate(to, {
          ...opts,
          viewTransition: opts?.viewTransition ?? true,
        })) as DataRouter['navigate'];
  return router;
}
