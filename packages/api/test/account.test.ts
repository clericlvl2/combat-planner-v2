import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import type { ApiEvent } from '../src/client.ts';
import { sessionSchema } from '../src/client.ts';
import {
  account,
  actionLog,
  combats,
  players,
  presetTags,
  presets,
  session,
  tags,
  user,
} from '../src/db/schema.ts';
import { subscribe } from '../src/live/registry.ts';
import type { Browser, Requester, TestApp } from './helpers.ts';
import {
  HERO_ID,
  OTHER_DM,
  PLAYER_ID,
  addUnitAction,
  browse,
  call,
  combatInput,
  createBrowser,
  createTestApp,
  signUp,
  withUser,
} from './helpers.ts';

const EMAIL = 'erin@example.com';
const PASSWORD = 'correct horse battery';
const COMBAT_ID = '01ARZ3NDEKTSV4RRFFQ69G5AC0';
const SECOND_COMBAT_ID = '01ARZ3NDEKTSV4RRFFQ69G5AC1';
const KEPT_COMBAT_ID = '01ARZ3NDEKTSV4RRFFQ69G5AC2';
const ACTION_ID = '01ARZ3NDEKTSV4RRFFQ69G5AC3';
const PRESET_ID = '01ARZ3NDEKTSV4RRFFQ69G5AC4';
const KEPT_PRESET_ID = '01ARZ3NDEKTSV4RRFFQ69G5AC5';
const TAG_ID = '01ARZ3NDEKTSV4RRFFQ69G5AC6';
const KEPT_TAG_ID = '01ARZ3NDEKTSV4RRFFQ69G5AC7';

let opened: TestApp;
let erin: Browser;
let erinId: string;
let stranger: Requester;

beforeAll(async () => {
  opened = createTestApp();
  erin = createBrowser(opened.app);
  stranger = withUser(opened.app, OTHER_DM);
  const response = await signUp(erin, EMAIL, 'Erin');
  erinId = sessionSchema.shape.userId.parse(
    ((await response.json()) as { user: { id: unknown } }).user.id,
  );
});

afterAll(() => {
  opened.close();
});

const presetInput = (id: string, tagIds: string[]) => ({
  id,
  name: 'Lich',
  role: 'enemy',
  maxHp: 120,
  ac: 18,
  pd: 15,
  md: 20,
  initiativeBonus: 4,
  tags: tagIds,
});

const listen = (combatId: string) => {
  const events: ApiEvent[] = [];
  const unsubscribes = [
    subscribe(combatId, { viewer: { kind: 'dm' }, send: (event) => events.push(event) }),
    subscribe(combatId, {
      viewer: { kind: 'player', playerId: PLAYER_ID },
      send: (event) => events.push(event),
    }),
  ];
  return {
    events,
    unsubscribe: () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    },
  };
};

const rowsOf = (userId: string) => ({
  user: opened.db.select().from(user).where(eq(user.id, userId)).all().length,
  session: opened.db.select().from(session).where(eq(session.userId, userId)).all().length,
  account: opened.db.select().from(account).where(eq(account.userId, userId)).all().length,
  combats: opened.db.select().from(combats).where(eq(combats.ownerId, userId)).all().length,
  presets: opened.db.select().from(presets).where(eq(presets.ownerId, userId)).all().length,
  tags: opened.db.select().from(tags).where(eq(tags.ownerId, userId)).all().length,
});

describe('PATCH /account', () => {
  it('answers 401 without a session', async () => {
    const response = await browse(createBrowser(opened.app), 'PATCH', '/account', {
      displayName: 'Nobody',
    });
    expect(response.status).toBe(401);
  });

  it('writes the display name to user.name and returns the session', async () => {
    const response = await browse(erin, 'PATCH', '/account', { displayName: 'Erin the Bold' });
    expect(response.status).toBe(200);
    expect(sessionSchema.parse(await response.json())).toEqual({
      userId: erinId,
      email: EMAIL,
      displayName: 'Erin the Bold',
      language: 'en',
      method: 'email',
    });
    expect(opened.db.select().from(user).where(eq(user.id, erinId)).get()?.name).toBe(
      'Erin the Bold',
    );
    const current = await browse(erin, 'GET', '/auth/get-session');
    expect(await current.json()).toMatchObject({ user: { name: 'Erin the Bold' } });
  });

  it('rejects an empty name and a name over 40 characters with 400', async () => {
    expect((await browse(erin, 'PATCH', '/account', { displayName: '' })).status).toBe(400);
    const long = await browse(erin, 'PATCH', '/account', { displayName: 'x'.repeat(41) });
    expect(long.status).toBe(400);
  });

  it('answers 404 when the user row is gone', async () => {
    const response = await call(withUser(opened.app, 'missing-user'), 'PATCH', '/account', {
      displayName: 'Ghost',
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'notFound', message: 'User not found' });
  });
});

describe('DELETE /account', () => {
  it('answers 401 without a session', async () => {
    const response = await browse(createBrowser(opened.app), 'DELETE', '/account');
    expect(response.status).toBe(401);
  });

  it('answers 404 when the user row is gone', async () => {
    const response = await call(withUser(opened.app, 'missing-user'), 'DELETE', '/account');
    expect(response.status).toBe(404);
  });

  it('deletes the user with every owned row, ends each stream and signs out', async () => {
    const steps = [
      await browse(erin, 'POST', '/combats', combatInput(COMBAT_ID)),
      await browse(erin, 'POST', '/combats', {
        ...combatInput(SECOND_COMBAT_ID),
        title: 'Dragon lair',
      }),
      await browse(
        erin,
        'POST',
        `/combats/${COMBAT_ID}/actions`,
        addUnitAction(ACTION_ID, 1, HERO_ID, 'Erin', 'hero'),
      ),
      await browse(erin, 'POST', '/tags', { id: TAG_ID, name: 'Boss' }),
      await browse(erin, 'POST', '/presets', presetInput(PRESET_ID, [TAG_ID])),
      await call(stranger, 'POST', '/combats', combatInput(KEPT_COMBAT_ID)),
      await call(stranger, 'POST', '/tags', { id: KEPT_TAG_ID, name: 'Boss' }),
      await call(stranger, 'POST', '/presets', presetInput(KEPT_PRESET_ID, [KEPT_TAG_ID])),
    ];
    expect(steps.map((step) => step.status)).toEqual([200, 200, 200, 200, 200, 200, 200, 200]);
    opened.db
      .insert(players)
      .values({ combatId: COMBAT_ID, playerId: PLAYER_ID, displayName: 'Pip' })
      .run();
    const before = rowsOf(erinId);
    expect(before).toEqual({ user: 1, session: 1, account: 1, combats: 2, presets: 1, tags: 1 });
    const first = listen(COMBAT_ID);
    const second = listen(SECOND_COMBAT_ID);
    const kept = listen(KEPT_COMBAT_ID);

    const response = await browse(erin, 'DELETE', '/account');
    first.unsubscribe();
    second.unsubscribe();
    kept.unsubscribe();

    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie().join('\n')).toMatch(/session_token=;.*Max-Age=0/);
    expect(rowsOf(erinId)).toEqual({
      user: 0,
      session: 0,
      account: 0,
      combats: 0,
      presets: 0,
      tags: 0,
    });
    for (const combatId of [COMBAT_ID, SECOND_COMBAT_ID]) {
      expect(
        opened.db.select().from(actionLog).where(eq(actionLog.combatId, combatId)).all(),
      ).toEqual([]);
      expect(opened.db.select().from(players).where(eq(players.combatId, combatId)).all()).toEqual(
        [],
      );
    }
    expect(
      opened.db.select().from(presetTags).where(eq(presetTags.presetId, PRESET_ID)).all(),
    ).toEqual([]);
    expect(first.events).toEqual([
      { type: 'deleted', title: 'Goblin ambush' },
      { type: 'deleted', title: 'Goblin ambush' },
    ]);
    expect(second.events).toEqual([
      { type: 'deleted', title: 'Dragon lair' },
      { type: 'deleted', title: 'Dragon lair' },
    ]);
    expect(kept.events).toEqual([]);
    expect(rowsOf(OTHER_DM)).toMatchObject({ user: 1, combats: 1, presets: 1, tags: 1 });
    expect(
      opened.db.select().from(presetTags).where(eq(presetTags.presetId, KEPT_PRESET_ID)).all(),
    ).toEqual([{ presetId: KEPT_PRESET_ID, tagId: KEPT_TAG_ID }]);
  });

  it('leaves the browser signed out and the credentials unusable', async () => {
    expect(await (await browse(erin, 'GET', '/auth/get-session')).json()).toBeNull();
    expect((await browse(erin, 'GET', '/combats')).status).toBe(401);
    const signIn = await browse(erin, 'POST', '/auth/sign-in/email', {
      email: EMAIL,
      password: PASSWORD,
    });
    expect(signIn.status).toBe(401);
  });
});
