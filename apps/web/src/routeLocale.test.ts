import {
  DM_ACCOUNT,
  FakeApiClient,
  createI18n,
  createQueryClient,
  scenario,
} from '@combat-planner/ui';
import type { ReactElement } from 'react';
import { RouterContextProvider, createMemoryRouter } from 'react-router';
import type { LoaderFunctionArgs, RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createRoutes } from './router.tsx';
import { watchRouteLocale } from './routeLocale.ts';

const COMBAT_ID = '01JA0000000000000000000001';
const BROWSER_LOCALE = 'de';
const DM_LANGUAGE = 'ru';
const DM = { ...DM_ACCOUNT, language: DM_LANGUAGE } as const;
const DM_SESSION = {
  userId: DM.userId,
  email: DM.email,
  displayName: DM.displayName,
  language: DM.language,
};

type MemoryRouter = ReturnType<typeof createMemoryRouter>;

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const settled = (router: MemoryRouter): Promise<void> =>
  new Promise((resolve) => {
    const idle = () => router.state.initialized && router.state.navigation.state === 'idle';
    if (idle()) {
      resolve();
      return;
    }
    const unsubscribe = router.subscribe(() => {
      if (!idle()) return;
      unsubscribe();
      resolve();
    });
  });

async function start(
  path: string,
  signedIn = true,
  prepare: (api: FakeApiClient) => void = () => undefined,
  dmChildren: RouteObject[] = [],
) {
  const api = new FakeApiClient({
    scenario: scenario({
      session: signedIn ? DM_SESSION : null,
      accounts: [DM],
      settings: { language: DM_LANGUAGE },
    }),
  });
  prepare(api);
  const queryClient = createQueryClient();
  const i18n = createI18n(BROWSER_LOCALE);
  const routes = createRoutes(
    {
      api,
      queryClient,
      about: { version: '2.0.0', sourceUrl: 'https://s.example' },
      language: Promise.resolve(i18n),
      reportError: () => undefined,
    },
    () => router,
  );
  routes[0]?.children?.find(({ id }) => id === 'dm')?.children?.push(...dmChildren);
  const router: MemoryRouter = createMemoryRouter(routes, { initialEntries: [path] });
  cleanups.push(
    watchRouteLocale(router, i18n, () => BROWSER_LOCALE),
    () => router.dispose(),
  );
  await settled(router);
  return { api, queryClient, router, i18n };
}

const recordDmFirstFrames = (router: MemoryRouter, i18n: { language: string }): string[] => {
  const frames: string[] = [];
  let onDm = router.state.matches.some(({ route }) => route.id === 'dm');
  const stop = router.subscribe((state) => {
    if (state.navigation.state !== 'idle') return;
    const enteredDm = state.matches.some(({ route }) => route.id === 'dm');
    if (enteredDm && !onDm) frames.push(i18n.language);
    onDm = enteredDm;
  });
  cleanups.push(stop);
  return frames;
};

const go = async (router: MemoryRouter, path: string) => {
  await router.navigate(path);
  await settled(router);
};

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const failSessionOnce = (api: FakeApiClient) => {
  vi.spyOn(api.auth, 'session').mockRejectedValueOnce(new Error('offline'));
};

const failingDmPage: RouteObject = {
  id: 'failing',
  path: 'failing',
  loader: () => {
    throw new Error('page failed');
  },
};

const LOADER_URL = `http://localhost/combats/${COMBAT_ID}/play?t=token-1`;

const loaderArgs = {
  request: new Request(LOADER_URL),
  url: new URL(LOADER_URL),
  pattern: '/combats/:id/play',
  params: { id: COMBAT_ID },
  context: new RouterContextProvider(),
} as LoaderFunctionArgs;

const SESSION_LANGUAGE_PAGES: readonly string[] = ['dm', 'about'];

const showsPageOutsideDm = (route: { id: string; element?: unknown; children?: unknown }) =>
  !SESSION_LANGUAGE_PAGES.includes(route.id) &&
  (route.element !== undefined || route.children !== undefined);

const holdSession = (api: FakeApiClient): (() => void) => {
  const session = api.auth.session.bind(api.auth);
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(api.auth, 'session').mockImplementationOnce(async () => {
    await gate;
    return session();
  });
  return release;
};

describe('watchRouteLocale', () => {
  it('restores the browser language on sign-in after a DM in ru signs out', async () => {
    const { api, router, i18n } = await start('/combats');
    await i18n.changeLanguage('ru');
    await go(router, '/settings');
    expect(i18n.language).toBe('ru');
    await api.auth.signOut();
    await go(router, '/auth/sign-in');
    expect(router.state.location.pathname).toBe('/auth/sign-in');
    expect(i18n.language).toBe(BROWSER_LOCALE);
  });

  it('restores the browser language when a player leaves for a system page', async () => {
    const { router, i18n } = await start(`/combats/${COMBAT_ID}/play?t=token-1`);
    await i18n.changeLanguage('ja');
    await go(router, '/missing');
    expect(i18n.language).toBe(BROWSER_LOCALE);
  });

  it('leaves the language of DM and player routes to their pages', async () => {
    const { router, i18n } = await start('/combats');
    await i18n.changeLanguage('ru');
    await go(router, `/combats/${COMBAT_ID}/play?t=token-1`);
    expect(i18n.language).toBe('ru');
    await go(router, '/library');
    expect(i18n.language).toBe('ru');
  });

  it('shows a DM route entered from a player route in the DM language from the first frame', async () => {
    const { router, i18n } = await start(`/combats/${COMBAT_ID}/play?t=token-1`);
    await i18n.changeLanguage('ja');
    const applied: string[] = [];
    const onChange = (language: string) => applied.push(language);
    i18n.on('languageChanged', onChange);
    cleanups.push(() => i18n.off('languageChanged', onChange));
    const firstFrames = recordDmFirstFrames(router, i18n);
    await go(router, '/combats');
    await i18n.changeLanguage('ja');
    await go(router, `/combats/${COMBAT_ID}/play?t=token-1`);
    await go(router, `/combats/${COMBAT_ID}`);
    expect(firstFrames).toEqual([DM_LANGUAGE, DM_LANGUAGE]);
    expect(applied).not.toContain(BROWSER_LOCALE);
  });

  it('shows a DM route entered from sign-in in the DM language from the first frame', async () => {
    const { api, queryClient, router, i18n } = await start('/auth/sign-in', false);
    expect(i18n.language).toBe(BROWSER_LOCALE);
    const firstFrames = recordDmFirstFrames(router, i18n);
    await api.auth.signIn({ email: DM.email, password: DM.password });
    queryClient.clear();
    await go(router, '/combats');
    expect(router.state.location.pathname).toBe('/combats');
    expect(firstFrames).toEqual([DM_LANGUAGE]);
  });

  it('shows a DM route entered from a system page in the DM language from the first frame', async () => {
    const { router, i18n } = await start('/missing');
    expect(i18n.language).toBe(BROWSER_LOCALE);
    const firstFrames = recordDmFirstFrames(router, i18n);
    await go(router, '/library');
    expect(firstFrames).toEqual([DM_LANGUAGE]);
  });

  it('applies the DM language once a session that failed on entry arrives', async () => {
    const { queryClient, router, i18n } = await start('/combats', true, failSessionOnce);
    expect(router.state.location.pathname).toBe('/combats');
    expect(i18n.language).toBe(BROWSER_LOCALE);
    await queryClient.refetchQueries({ queryKey: ['session'] });
    await vi.waitFor(() => expect(i18n.language).toBe(DM_LANGUAGE));
  });

  it('leaves the language alone when a late session arrives after the DM route is left', async () => {
    const { queryClient, router, i18n } = await start('/combats', true, failSessionOnce);
    await go(router, '/missing');
    await queryClient.refetchQueries({ queryKey: ['session'] });
    await tick();
    expect(i18n.language).toBe(BROWSER_LOCALE);
  });

  it('keeps the browser language on the error page when a session that failed on entry arrives', async () => {
    const { queryClient, router, i18n } = await start('/failing', true, failSessionOnce, [
      failingDmPage,
    ]);
    expect(router.state.errors).not.toBeNull();
    await queryClient.refetchQueries({ queryKey: ['session'] });
    await tick();
    expect(i18n.language).toBe(BROWSER_LOCALE);
  });

  it('keeps the browser language on the root error page when a session that failed on entry arrives', async () => {
    const { queryClient, router, i18n } = await start('/combats', true, failSessionOnce);
    const errorPage = router.routes[0]?.errorElement as ReactElement<{ onShow?: () => void }>;
    expect(errorPage.props.onShow).toBeTypeOf('function');
    errorPage.props.onShow?.();
    await queryClient.refetchQueries({ queryKey: ['session'] });
    await tick();
    expect(router.state.errors).toBeNull();
    expect(i18n.language).toBe(BROWSER_LOCALE);
  });

  it('stops the late-session follower in the loader of every top-level page outside DM', async () => {
    const { router: probe } = await start('/combats');
    const pageIds = (probe.routes[0]?.children ?? [])
      .filter(showsPageOutsideDm)
      .map(({ id }) => id);
    expect(pageIds.length).toBeGreaterThan(0);
    for (const pageId of pageIds) {
      const { queryClient, router, i18n } = await start('/combats', true, failSessionOnce);
      const loader = router.routes[0]?.children?.find(({ id }) => id === pageId)?.loader;
      expect(typeof loader, pageId).toBe('function');
      if (typeof loader !== 'function') continue;
      await (async () => loader(loaderArgs))().catch(() => undefined);
      await queryClient.refetchQueries({ queryKey: ['session'] });
      await tick();
      expect(router.state.location.pathname).toBe('/combats');
      expect(i18n.language, pageId).toBe(BROWSER_LOCALE);
    }
  });

  it.each([
    [true, DM_LANGUAGE],
    [false, BROWSER_LOCALE],
  ])('opens About in the session language, signed in: %s', async (signedIn, language) => {
    const { router, i18n } = await start('/about', signedIn);
    expect(router.state.location.pathname).toBe('/about');
    expect(i18n.language).toBe(language);
  });

  it('leaves the language alone when a DM navigation is aborted', async () => {
    const { api, router, i18n } = await start(`/combats/${COMBAT_ID}/play?t=token-1`);
    const release = holdSession(api);
    const entering = router.navigate('/combats');
    await tick();
    await go(router, '/missing');
    release();
    await entering;
    await tick();
    expect(router.state.location.pathname).toBe('/missing');
    expect(i18n.language).toBe(BROWSER_LOCALE);
  });

  it('stops after the cleanup', async () => {
    const { router, i18n } = await start('/combats');
    cleanups.shift()?.();
    await i18n.changeLanguage('ru');
    await go(router, '/missing');
    expect(i18n.language).toBe('ru');
  });
});
