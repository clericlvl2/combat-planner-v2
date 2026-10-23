import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { playerCredentialsSchema, playerLinkSchema } from '../src/client.ts';
import { players, session } from '../src/db/schema.ts';
import { subscriberCount } from '../src/live/registry.ts';
import { readLink } from '../src/sharing/store.ts';
import { closeEndedDmStreams } from '../src/sharing/streams.ts';
import type { Browser, TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  HERO_ID,
  addUnitAction,
  browse,
  call,
  combatInput,
  createBrowser,
  createTestApp,
  fetchCombat,
  signUp,
  ulidAt,
  withUser,
} from './helpers.ts';
import { openSse } from './sse.ts';

const PASSWORD = 'correct horse battery';
const DM_COMBAT_ID = '01ARZ3NDEKTSV4RRFFQ69G5SH0';

let opened: TestApp;
let dm: ReturnType<typeof withUser>;

beforeAll(async () => {
  opened = createTestApp({ rateLimit: false });
  dm = withUser(opened.app, DM);
  expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
  const hero = addUnitAction(ulidAt(600), 1, HERO_ID, 'Ada', 'hero');
  expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, hero)).status).toBe(200);
});

afterAll(() => {
  opened.close();
});

describe('link state', () => {
  it('starts off, turns live when the DM opens the share sheet and stays live after a reissue', async () => {
    expect(readLink(opened.db, COMBAT_ID)).toEqual({ phase: 'off' });
    expect((await call(dm, 'GET', `/combats/${COMBAT_ID}/link`)).status).toBe(200);
    expect(readLink(opened.db, COMBAT_ID)).toEqual({ phase: 'live' });
    expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/link/reissue`)).status).toBe(200);
    expect(readLink(opened.db, COMBAT_ID)).toEqual({ phase: 'live' });
  });
});

describe('player rows', () => {
  it('watch from the join, play while holding a hero and watch again after the release', async () => {
    const link = playerLinkSchema.parse(
      await (await call(dm, 'GET', `/combats/${COMBAT_ID}/link`)).json(),
    );
    const joined = await opened.app.request(
      `/play/${COMBAT_ID}/join?t=${encodeURIComponent(link.token)}`,
      { method: 'POST' },
    );
    const { playerId, playerKey } = playerCredentialsSchema.parse(await joined.json());
    const watchingSince = () =>
      opened.db
        .select({ watchingSince: players.watchingSince })
        .from(players)
        .where(and(eq(players.combatId, COMBAT_ID), eq(players.playerId, playerId)))
        .get()?.watchingSince;
    const act = async (body: Record<string, unknown>) => {
      const { version } = await fetchCombat(dm);
      const response = await opened.app.request(
        `/play/${COMBAT_ID}/actions?t=${encodeURIComponent(link.token)}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-Player-Id': playerId,
            'X-Player-Key': playerKey,
          },
          body: JSON.stringify({ id: ulidAt(610 + version), version, unitId: HERO_ID, ...body }),
        },
      );
      expect(response.status).toBe(200);
    };
    const joinedAt = watchingSince();
    expect(joinedAt).toEqual(expect.any(String));
    await act({ type: 'claimUnit', displayName: 'Ada' });
    expect(watchingSince()).toBeNull();
    await act({ type: 'releaseUnit' });
    expect(watchingSince()).toEqual(expect.any(String));
  });
});

describe('DM streams', () => {
  let erin: Browser;
  let laptop: Browser;
  const email = 'erin-sharing@example.com';

  const openDmStream = async (browser: Browser) => {
    const stream = openSse(await browse(browser, 'GET', `/combats/${DM_COMBAT_ID}/events`));
    await stream.event();
    return stream;
  };

  const signIn = async (browser: Browser) => {
    const response = await browse(browser, 'POST', '/auth/sign-in/email', {
      email,
      password: PASSWORD,
    });
    expect(response.status).toBe(200);
  };

  beforeAll(async () => {
    erin = createBrowser(opened.app);
    laptop = createBrowser(opened.app);
    expect((await signUp(erin, email, 'Erin', PASSWORD)).status).toBe(200);
    await signIn(laptop);
    const created = await browse(erin, 'POST', '/combats', combatInput(DM_COMBAT_ID));
    expect(created.status).toBe(200);
  });

  it('closes the stream of the other sessions right after revoke-other-sessions', async () => {
    const kept = await openDmStream(erin);
    const revoked = await openDmStream(laptop);
    expect(subscriberCount(DM_COMBAT_ID)).toBe(2);
    expect((await browse(erin, 'POST', '/auth/revoke-other-sessions', {})).status).toBe(200);
    expect(await revoked.closed()).toBe(true);
    expect(subscriberCount(DM_COMBAT_ID)).toBe(1);
    await kept.cancel();
  });

  it('closes the stream right after its session signs out', async () => {
    const stream = await openDmStream(erin);
    expect((await browse(erin, 'POST', '/auth/sign-out', {})).status).toBe(200);
    expect(await stream.closed()).toBe(true);
    expect(subscriberCount(DM_COMBAT_ID)).toBe(0);
  });

  it('closes the stream of an expired session on the next check', async () => {
    await signIn(laptop);
    const stream = await openDmStream(laptop);
    closeEndedDmStreams(opened.db);
    expect(subscriberCount(DM_COMBAT_ID)).toBe(1);
    opened.db
      .update(session)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .run();
    closeEndedDmStreams(opened.db);
    expect(await stream.closed()).toBe(true);
    expect(subscriberCount(DM_COMBAT_ID)).toBe(0);
  });
});
