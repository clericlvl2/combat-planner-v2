import {
  About,
  Account,
  CombatList,
  FakeApiClient,
  Library,
  Settings,
  SignIn,
  SignUp,
  createI18n,
  createQueryClient,
  scenario,
} from '@combat-planner/ui';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { CombatPage, DmPages, NotFoundPage, PlayerPage, RouteError } from './pages.tsx';
import { AppProviders } from './providers.tsx';
import { createRoutes } from './router.tsx';

const COMBAT_ID = '01JA0000000000000000000001';
const about = {
  version: '2.0.0',
  sourceUrl: 'https://example.com/source',
};

type MemoryRouter = ReturnType<typeof createMemoryRouter>;

const routers: MemoryRouter[] = [];

afterEach(() => {
  for (const router of routers.splice(0)) router.dispose();
});

const throwing: RouteObject = {
  id: 'throwing',
  path: 'throwing',
  loader: () => {
    throw new Error('route failed');
  },
};

async function open(
  path: string,
  signedIn: boolean,
  extraRoutes: RouteObject[] = [],
): Promise<MemoryRouter> {
  const api = new FakeApiClient({ scenario: signedIn ? scenario() : scenario({ session: null }) });
  const routes = createRoutes(
    {
      api,
      queryClient: createQueryClient(),
      about,
      language: Promise.resolve(createI18n('en')),
    },
    () => router,
  );
  routes[0]?.children?.unshift(...extraRoutes);
  const router: MemoryRouter = createMemoryRouter(routes, { initialEntries: [path] });
  routers.push(router);
  await new Promise<void>((resolve) => {
    const settled = () => router.state.initialized && router.state.navigation.state === 'idle';
    if (settled()) {
      resolve();
      return;
    }
    const unsubscribe = router.subscribe(() => {
      if (!settled()) return;
      unsubscribe();
      resolve();
    });
  });
  return router;
}

const render = (router: MemoryRouter): string =>
  renderToString(
    createElement(AppProviders, {
      api: new FakeApiClient({ scenario: scenario() }),
      queryClient: createQueryClient(),
      locale: 'en',
      children: createElement(RouterProvider, { router }),
    }),
  );

const leaf = (router: MemoryRouter) => {
  const match = router.state.matches.at(-1);
  if (!match) throw new Error(`no match for ${router.state.location.pathname}`);
  return match;
};

const leafElement = (router: MemoryRouter): ReactElement =>
  leaf(router).route.element as ReactElement;

const routeIds = (router: MemoryRouter): string[] =>
  router.state.matches.map((match) => match.route.id);

describe('router', () => {
  it('redirects / to /combats', async () => {
    const router = await open('/', true);
    expect(router.state.location.pathname).toBe('/combats');
    expect(leafElement(router).type).toBe(CombatList);
  });

  it.each([
    ['/combats', 'combats', CombatList],
    ['/library', 'library', Library],
    ['/settings', 'settings', Settings],
    ['/account', 'account', Account],
    ['/about', 'about', About],
  ])('renders the DM page %s behind the session guard', async (path, id, screen) => {
    const router = await open(path, true);
    expect(router.state.location.pathname).toBe(path);
    expect(routeIds(router)).toEqual(['root', 'dm', id]);
    expect(leafElement(router).type).toBe(screen);
    expect(router.state.matches[1]?.route.element).toMatchObject({ type: DmPages });
  });

  it('passes the build values to About', async () => {
    const router = await open('/about', true);
    expect(leafElement(router).props).toEqual(about);
  });

  it('passes the route param to the combat screen as combatId', async () => {
    const router = await open(`/combats/${COMBAT_ID}`, true);
    expect(routeIds(router)).toEqual(['root', 'dm', 'combat']);
    expect(leafElement(router).type).toBe(CombatPage);
    expect(router.state.loaderData.combat).toEqual({ combatId: COMBAT_ID });
  });

  it.each([
    '/',
    '/combats',
    `/combats/${COMBAT_ID}`,
    '/library',
    '/settings',
    '/account',
    '/about',
  ])('sends %s to sign-in without a session', async (path) => {
    const router = await open(path, false);
    expect(router.state.location.pathname).toBe('/auth/sign-in');
    expect(leafElement(router).type).toBe(SignIn);
  });

  it.each([
    ['/auth/sign-in', 'sign-in', SignIn],
    ['/auth/sign-up', 'sign-up', SignUp],
  ])('renders %s without a session', async (path, id, screen) => {
    const router = await open(path, false);
    expect(router.state.location.pathname).toBe(path);
    expect(routeIds(router)).toEqual(['root', 'auth', id]);
    expect(leafElement(router).type).toBe(screen);
  });

  it.each(['/auth/sign-in', '/auth/sign-up'])(
    'sends a signed-in user from %s to /combats',
    async (path) => {
      const router = await open(path, true);
      expect(router.state.location.pathname).toBe('/combats');
      expect(leafElement(router).type).toBe(CombatList);
    },
  );

  it.each([true, false])(
    'opens the player view with the token, signed in: %s',
    async (signedIn) => {
      const router = await open(`/combats/${COMBAT_ID}/play?t=token-1`, signedIn);
      expect(router.state.location.pathname).toBe(`/combats/${COMBAT_ID}/play`);
      expect(routeIds(router)).toEqual(['root', 'play']);
      expect(leafElement(router).type).toBe(PlayerPage);
      expect(router.state.loaderData.play).toEqual({
        combatId: COMBAT_ID,
        token: 'token-1',
      });
    },
  );

  it('opens the player route without a token as a link without a token', async () => {
    const router = await open(`/combats/${COMBAT_ID}/play`, false);
    expect(router.state.loaderData.play).toMatchObject({ token: null });
  });

  it.each(['/missing', '/auth', '/auth/callback/github', `/combats/${COMBAT_ID}/play/extra`])(
    'renders NotFound for %s',
    async (path) => {
      const router = await open(path, false);
      expect(router.state.location.pathname).toBe(path);
      expect(routeIds(router)).toEqual(['root', 'not-found']);
      expect(leafElement(router).type).toBe(NotFoundPage);
    },
  );

  it('renders RouteError as UnexpectedError when a route throws', async () => {
    const router = await open('/throwing', true, [throwing]);
    expect(router.state.errors).toEqual({ root: new Error('route failed') });
    const html = render(router);
    expect(html).toContain('data-system-screen');
    expect(html).toContain('Something went wrong');
    expect(html).toContain('Reload the page. Your last saved changes are safe.');
    expect(html).toContain('>Reload<');
    expect(html).toContain('>Go home<');
  });

  it('shows RouteError as the root error page and hands it a callback for when it is shown', async () => {
    const router = await open('/combats', true);
    const element = router.routes[0]?.errorElement as ReactElement<{ onShow: unknown }>;
    expect(element.type).toBe(RouteError);
    expect(element.props.onShow).toBeTypeOf('function');
  });
});
