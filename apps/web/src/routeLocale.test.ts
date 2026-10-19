import type { PlayerId } from '@combat-planner/domain';
import { FakeApiClient, createI18n, createQueryClient, scenario } from '@combat-planner/ui';
import { createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createRoutes } from './router.tsx';
import { watchRouteLocale } from './routeLocale.ts';

const PLAYER_ID: PlayerId = '01JA0000000000000000000000';
const COMBAT_ID = '01JA0000000000000000000001';
const BROWSER_LOCALE = 'de';

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

async function start(path: string) {
  const api = new FakeApiClient({ scenario: scenario() });
  const router = createMemoryRouter(
    createRoutes({
      api,
      queryClient: createQueryClient(),
      playerId: () => PLAYER_ID,
      about: { version: '2.0.0', sourceUrl: 'https://s.example' },
    }),
    { initialEntries: [path] },
  );
  const i18n = createI18n(BROWSER_LOCALE);
  cleanups.push(watchRouteLocale(router, i18n, BROWSER_LOCALE), () => router.dispose());
  await settled(router);
  return { api, router, i18n };
}

const go = async (router: MemoryRouter, path: string) => {
  await router.navigate(path);
  await settled(router);
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

  it('stops after the cleanup', async () => {
    const { router, i18n } = await start('/combats');
    cleanups.shift()?.();
    await i18n.changeLanguage('ru');
    await go(router, '/missing');
    expect(i18n.language).toBe('ru');
  });
});
