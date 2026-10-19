import type { PlayerId } from '@combat-planner/domain';
import {
  DM_ACCOUNT,
  FakeApiClient,
  createI18n,
  createQueryClient,
  scenario,
} from '@combat-planner/ui';
import { createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createRoutes } from './router.tsx';
import { watchRouteLocale } from './routeLocale.ts';

const PLAYER_ID: PlayerId = '01JA0000000000000000000000';
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

async function start(path: string, signedIn = true) {
  const api = new FakeApiClient({
    scenario: scenario({
      session: signedIn ? DM_SESSION : null,
      accounts: [DM],
      settings: { language: DM_LANGUAGE },
    }),
  });
  const queryClient = createQueryClient();
  const i18n = createI18n(BROWSER_LOCALE);
  const router = createMemoryRouter(
    createRoutes({
      api,
      queryClient,
      playerId: () => PLAYER_ID,
      about: { version: '2.0.0', sourceUrl: 'https://s.example' },
      language: Promise.resolve(i18n),
    }),
    { initialEntries: [path] },
  );
  cleanups.push(watchRouteLocale(router, i18n, BROWSER_LOCALE), () => router.dispose());
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

  it('stops after the cleanup', async () => {
    const { router, i18n } = await start('/combats');
    cleanups.shift()?.();
    await i18n.changeLanguage('ru');
    await go(router, '/missing');
    expect(i18n.language).toBe('ru');
  });
});
