import type { Action, Combat, PlayerCombat, PlayerUnit } from '@combat-planner/domain';
import { playerCombatSchema, project } from '@combat-planner/domain';
import { and, eq } from 'drizzle-orm';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import {
  linkReissueResultSchema,
  playViewSchema,
  playerCredentialsSchema,
  playerLinkSchema,
} from '../src/client.ts';
import { players, user } from '../src/db/schema.ts';
import { signLink, signPlayerKey, verifyPlayerKey } from '../src/link/token.ts';
import { broadcast, broadcastDocument, subscriberCount } from '../src/live/registry.ts';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  ENEMY_ID,
  HERO_ID,
  PLAYER_ID,
  addUnitAction,
  call,
  combatInput,
  createTestApp,
  env,
  fetchCombat,
  ulidAt,
  withUser,
} from './helpers.ts';
import { openSse } from './sse.ts';

const SECOND_HERO = ulidAt(900);
const SECOND_PLAYER = ulidAt(901);
const ALLY_ID = ulidAt(902);
const DISABLED_ID = ulidAt(903);
const UNKNOWN_COMBAT = ulidAt(904);

const EVERY_COLUMN = [
  'id',
  'name',
  'role',
  'healthStatus',
  'healthSegments',
  'conditions',
  'position',
  'initiative',
];
const FRIENDLY_COLUMNS = [
  ...EVERY_COLUMN,
  'claimedByName',
  'mine',
  'hp',
  'tempHp',
  'maxHp',
  'ac',
  'pd',
  'md',
];
const OWN_COLUMNS = [...FRIENDLY_COLUMNS, 'initiativeBonus', 'note', 'hpHistory'];

const visibleKeys = (unit: PlayerUnit): string[] => {
  if (unit.mine === true) return OWN_COLUMNS;
  if (unit.role === 'enemy') return EVERY_COLUMN;
  return FRIENDLY_COLUMNS;
};

const assertVisibility = (document: PlayerCombat, source: Combat) => {
  expect(Object.keys(document).sort()).toEqual(
    [
      ...Object.keys(source).filter(
        (key) => key !== 'linkGeneration' && key !== 'undo' && key !== 'players',
      ),
      'myName',
    ].sort(),
  );
  const disabled = source.units.filter((unit) => unit.disabled).map((unit) => unit.id);
  expect(disabled.length).toBeGreaterThan(0);
  const visible = source.units.filter((unit) => !unit.disabled).map((unit) => unit.id);
  expect(document.units.map((unit) => unit.id).sort()).toEqual(visible.sort());
  for (const unit of document.units) {
    expect(disabled).not.toContain(unit.id);
    const allowed = visibleKeys(unit);
    for (const key of Object.keys(unit)) expect(allowed).toContain(key);
    expect(Object.keys(unit).sort()).toEqual([...allowed].sort());
  }
  const roles = new Set(document.units.map((unit) => visibleKeys(unit)));
  expect(roles.size).toBe(3);
};

let opened: TestApp;
let dm: ReturnType<typeof withUser>;
let token: string;
let generation = 0;
let actionIndex = 0;
const nextActionId = () => ulidAt(100 + actionIndex++);
const secret = env.linkSecret;

interface Credentials {
  playerId?: string;
  playerKey?: string;
}

const keyOf = (playerId: string): string =>
  signPlayerKey({ combatId: COMBAT_ID, generation, playerId }, secret);

const credentialsOf = (player: string | Credentials | undefined): Credentials => {
  if (player === undefined) return {};
  if (typeof player !== 'string') return player;
  return { playerId: player, playerKey: keyOf(player) };
};

const playerHeaders = (player: string | Credentials | undefined): Record<string, string> => {
  const { playerId, playerKey } = credentialsOf(player);
  return {
    ...(playerId === undefined ? {} : { 'X-Player-Id': playerId }),
    ...(playerKey === undefined ? {} : { 'X-Player-Key': playerKey }),
  };
};

const getPlay = (t: string, player: string | Credentials | undefined, combatId = COMBAT_ID) =>
  opened.app.request(`/play/${combatId}?t=${encodeURIComponent(t)}`, {
    headers: playerHeaders(player),
  });

const postAction = (t: string, player: string | Credentials | undefined, action: unknown) =>
  opened.app.request(`/play/${COMBAT_ID}/actions?t=${encodeURIComponent(t)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...playerHeaders(player) },
    body: JSON.stringify(action),
  });

const openEvents = (t: string, player: string | Credentials, combatId = COMBAT_ID) =>
  opened.app.request(
    `/play/${combatId}/events?${new URLSearchParams({ t, ...credentialsOf(player) }).toString()}`,
  );

const join = (t: string, combatId = COMBAT_ID) =>
  opened.app.request(`/play/${combatId}/join?t=${encodeURIComponent(t)}`, { method: 'POST' });

const playerRows = () =>
  opened.db
    .select({ playerId: players.playerId, displayName: players.displayName })
    .from(players)
    .where(eq(players.combatId, COMBAT_ID))
    .all();

const tamper = (t: string): string => `${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`;

type ActionBody<A> = A extends Action ? Omit<A, 'id' | 'version'> : never;

const dmAction = async (action: ActionBody<Action>) => {
  const combat = await fetchCombat(dm);
  const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, {
    ...action,
    id: nextActionId(),
    version: combat.version,
  });
  expect(response.status).toBe(200);
  return fetchCombat(dm);
};

const settled = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeAll(async () => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  opened.db.update(user).set({ language: 'ru' }).where(eq(user.id, DM)).run();
  expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
  const actions = [
    addUnitAction(nextActionId(), 1, HERO_ID, 'Ada', 'hero'),
    addUnitAction(nextActionId(), 2, SECOND_HERO, 'Bram', 'hero'),
    addUnitAction(nextActionId(), 3, ALLY_ID, 'Cleric', 'ally'),
    addUnitAction(nextActionId(), 4, ENEMY_ID, 'Goblin', 'enemy'),
    addUnitAction(nextActionId(), 5, DISABLED_ID, 'Hidden ogre', 'enemy'),
  ];
  for (const action of actions) {
    expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, action)).status).toBe(200);
  }
  await dmAction({ type: 'setDisabled', unitId: DISABLED_ID, disabled: true });
  const link = playerLinkSchema.parse(
    await (await call(dm, 'GET', `/combats/${COMBAT_ID}/link`)).json(),
  );
  token = link.token;
  generation = link.generation;
});

afterAll(() => {
  opened.close();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
});

afterEach(() => {
  const intervals = vi.getTimerCount();
  vi.useRealTimers();
  expect(intervals).toBe(0);
  expect(subscriberCount(COMBAT_ID)).toBe(0);
});

describe('POST /play/:id/join', () => {
  it('issues a new player id with a key bound to the combat and the link generation', async () => {
    const first = await join(token);
    const second = await join(token);
    expect(first.status).toBe(200);
    const credentials = playerCredentialsSchema.parse(await first.json());
    const other = playerCredentialsSchema.parse(await second.json());
    expect(other.playerId).not.toBe(credentials.playerId);
    expect(
      verifyPlayerKey(
        credentials.playerKey,
        { combatId: COMBAT_ID, generation, playerId: credentials.playerId },
        secret,
      ),
    ).toBe(true);
    expect((await getPlay(token, credentials)).status).toBe(200);
    expect((await getPlay(token, { ...credentials, playerKey: other.playerKey })).status).toBe(401);
  });

  it('answers 404 for a tampered token and 410 for a generation that is not the current one', async () => {
    expect((await join(tamper(token))).status).toBe(404);
    const stale = signLink({ combatId: COMBAT_ID, generation: 7 }, secret);
    const response = await join(stale);
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ code: 'linkRevoked' });
  });
});

describe('GET /play/:id', () => {
  it('answers the projection, the player id and the DM language for a valid token', async () => {
    const response = await getPlay(token, PLAYER_ID);
    expect(response.status).toBe(200);
    const view = playViewSchema.parse(await response.json());
    const combat = await fetchCombat(dm);
    expect(view).toEqual({
      combatId: COMBAT_ID,
      playerId: PLAYER_ID,
      language: 'ru',
      combat: project(combat, { kind: 'player', playerId: PLAYER_ID }),
    });
    expect(view.combat).not.toHaveProperty('linkGeneration');
    expect(playerRows()).toEqual([]);
  });

  it('answers 401 unauthorized without a ULID in X-Player-Id or without a key', async () => {
    for (const response of [
      await getPlay(token, undefined),
      await getPlay(token, 'not-a-ulid'),
      await getPlay(token, { playerId: PLAYER_ID }),
    ]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: 'unauthorized' });
    }
  });

  it('answers 404 for a tampered token', async () => {
    const response = await getPlay(tamper(token), PLAYER_ID);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'notFound' });
  });

  it('answers 404 for a token of another combat and for a combat that is gone', async () => {
    const foreign = signLink({ combatId: UNKNOWN_COMBAT, generation: 0 }, secret);
    expect((await getPlay(foreign, PLAYER_ID)).status).toBe(404);
    expect((await getPlay(foreign, PLAYER_ID, UNKNOWN_COMBAT)).status).toBe(404);
    expect((await getPlay(token, PLAYER_ID, UNKNOWN_COMBAT)).status).toBe(404);
  });

  it('answers 400 without a token', async () => {
    expect((await opened.app.request(`/play/${COMBAT_ID}`)).status).toBe(400);
  });

  it('answers 410 linkRevoked for a generation that is not the current one', async () => {
    const other = signLink({ combatId: COMBAT_ID, generation: 7 }, secret);
    const response = await getPlay(other, PLAYER_ID);
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ code: 'linkRevoked' });
  });
});

describe('POST /play/:id/actions', () => {
  it('claims a hero, answers the version and records the display name', async () => {
    const before = await fetchCombat(dm);
    const response = await postAction(token, PLAYER_ID, {
      id: nextActionId(),
      version: before.version,
      type: 'claimUnit',
      unitId: HERO_ID,
      displayName: 'Ada',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: before.version + 1 });
    const after = await fetchCombat(dm);
    expect(after.units.find((unit) => unit.id === HERO_ID)?.claimedBy).toBe(PLAYER_ID);
    expect(playerRows()).toEqual([{ playerId: PLAYER_ID, displayName: 'Ada' }]);
    const second = await postAction(token, SECOND_PLAYER, {
      id: nextActionId(),
      version: after.version,
      type: 'claimUnit',
      unitId: SECOND_HERO,
      displayName: 'Bram',
    });
    expect(second.status).toBe(200);
    expect(playerRows()).toEqual([
      { playerId: PLAYER_ID, displayName: 'Ada' },
      { playerId: SECOND_PLAYER, displayName: 'Bram' },
    ]);
  });

  it('GET upserts the player row when the document already knows the name', async () => {
    opened.db
      .delete(players)
      .where(and(eq(players.combatId, COMBAT_ID), eq(players.playerId, PLAYER_ID)))
      .run();
    expect(playerRows()).toEqual([{ playerId: SECOND_PLAYER, displayName: 'Bram' }]);
    expect((await getPlay(token, PLAYER_ID)).status).toBe(200);
    expect(playerRows()).toEqual([
      { playerId: PLAYER_ID, displayName: 'Ada' },
      { playerId: SECOND_PLAYER, displayName: 'Bram' },
    ]);
  });

  it('applies an action on the own hero', async () => {
    const before = await fetchCombat(dm);
    const response = await postAction(token, PLAYER_ID, {
      id: nextActionId(),
      version: before.version,
      type: 'damage',
      unitId: HERO_ID,
      amount: 4,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: before.version + 1 });
    expect((await fetchCombat(dm)).units.find((unit) => unit.id === HERO_ID)?.hp).toBe(16);
  });

  it('answers 403 forbidden on a hero of another player and on an enemy', async () => {
    const combat = await fetchCombat(dm);
    for (const unitId of [SECOND_HERO, ENEMY_ID]) {
      const response = await postAction(token, PLAYER_ID, {
        id: nextActionId(),
        version: combat.version,
        type: 'damage',
        unitId,
        amount: 1,
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: 'forbidden' });
    }
    expect((await fetchCombat(dm)).version).toBe(combat.version);
  });

  it('answers 403 forbidden for a DM-only action', async () => {
    const combat = await fetchCombat(dm);
    const response = await postAction(token, PLAYER_ID, {
      id: nextActionId(),
      version: combat.version,
      type: 'nextTurn',
    });
    expect(response.status).toBe(403);
  });

  it('answers 409 version for a stale version', async () => {
    const combat = await fetchCombat(dm);
    const response = await postAction(token, PLAYER_ID, {
      id: nextActionId(),
      version: combat.version - 1,
      type: 'heal',
      unitId: HERO_ID,
      amount: 1,
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'version' });
  });

  it('answers 404 for a tampered token, 401 without a player id and 400 for a malformed action', async () => {
    const combat = await fetchCombat(dm);
    const action = {
      id: nextActionId(),
      version: combat.version,
      type: 'heal',
      unitId: HERO_ID,
      amount: 1,
    };
    expect((await postAction(tamper(token), PLAYER_ID, action)).status).toBe(404);
    expect((await postAction(token, undefined, action)).status).toBe(401);
    expect((await postAction(token, PLAYER_ID, { ...action, amount: 'lots' })).status).toBe(400);
    expect((await fetchCombat(dm)).version).toBe(combat.version);
  });
});

describe('another player', () => {
  it('answers 401 to a request with another player id and no key or a wrong key', async () => {
    const combat = await fetchCombat(dm);
    const action = {
      id: nextActionId(),
      version: combat.version,
      type: 'damage',
      unitId: SECOND_HERO,
      amount: 1,
    };
    const impostors: Credentials[] = [
      { playerId: SECOND_PLAYER },
      { playerId: SECOND_PLAYER, playerKey: keyOf(PLAYER_ID) },
      { playerId: SECOND_PLAYER, playerKey: tamper(keyOf(SECOND_PLAYER)) },
    ];
    for (const impostor of impostors) {
      for (const response of [
        await getPlay(token, impostor),
        await postAction(token, impostor, action),
        await openEvents(token, impostor),
      ]) {
        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({ code: 'unauthorized' });
      }
    }
    expect((await fetchCombat(dm)).version).toBe(combat.version);
  });

  it('never reaches a player through a response or a live document', async () => {
    const combat = await fetchCombat(dm);
    const claimers = combat.units.map((unit) => unit.claimedBy);
    expect(claimers).toContain(PLAYER_ID);
    expect(claimers).toContain(SECOND_PLAYER);
    for (const [self, other] of [
      [PLAYER_ID, SECOND_PLAYER],
      [SECOND_PLAYER, PLAYER_ID],
    ] as const) {
      const view = await (await getPlay(token, self)).text();
      expect(view).not.toContain(other);
      expect(playViewSchema.parse(JSON.parse(view)).combat.units).toContainEqual(
        expect.objectContaining({ mine: false, claimedByName: expect.any(String) }),
      );
      const stream = openSse(await openEvents(token, self));
      expect(JSON.stringify((await stream.event()).event)).not.toContain(other);
      await dmAction({ type: 'damage', unitId: ENEMY_ID, amount: 1 });
      const relayed = await stream.event();
      expect(relayed.event.type).toBe('document');
      expect(JSON.stringify(relayed.event)).not.toContain(other);
      await stream.cancel();
      await settled();
    }
  });
});

describe('GET /play/:id/events', () => {
  it('answers 400 without a token and 401 for a missing or malformed player id or key', async () => {
    const base = `/play/${COMBAT_ID}/events`;
    expect((await opened.app.request(`${base}?playerId=${PLAYER_ID}`)).status).toBe(400);
    expect((await opened.app.request(`${base}?t=${encodeURIComponent(token)}`)).status).toBe(401);
    expect((await openEvents(token, 'nope')).status).toBe(401);
    expect((await openEvents(token, { playerId: PLAYER_ID })).status).toBe(401);
  });

  it('answers 404 for a tampered token', async () => {
    expect((await openEvents(tamper(token), PLAYER_ID)).status).toBe(404);
  });

  it('streams the player projection without hidden fields and relays dispatches', async () => {
    const combat = await fetchCombat(dm);
    const stream = openSse(await openEvents(token, PLAYER_ID));
    const initial = await stream.event();
    expect(initial.id).toBe(String(combat.version));
    expect(initial.event.type).toBe('document');
    const document = playerCombatSchema.parse((initial.event as { document: unknown }).document);
    expect(document).toEqual(project(combat, { kind: 'player', playerId: PLAYER_ID }));
    assertVisibility(document, combat);
    expect(subscriberCount(COMBAT_ID)).toBe(1);
    const damaged = await dmAction({ type: 'damage', unitId: ENEMY_ID, amount: 6 });
    const relayed = await stream.event();
    expect(relayed.id).toBe(String(damaged.version));
    const relayedDocument = playerCombatSchema.parse(
      (relayed.event as { document: unknown }).document,
    );
    assertVisibility(relayedDocument, damaged);
    expect(relayedDocument.units.find((unit) => unit.id === ENEMY_ID)).toMatchObject({
      healthStatus: 'wounded',
    });
    await stream.cancel();
    await settled();
  });

  it('carries the DM language in every document, so a language change arrives with the next one', async () => {
    const stream = openSse(await openEvents(token, PLAYER_ID));
    expect((await stream.event()).event).toMatchObject({ type: 'document', language: 'ru' });
    expect((await call(dm, 'PATCH', '/settings', { language: 'ja' })).status).toBe(200);
    await dmAction({ type: 'damage', unitId: ENEMY_ID, amount: 1 });
    expect((await stream.event()).event).toMatchObject({ type: 'document', language: 'ja' });
    expect((await call(dm, 'PATCH', '/settings', { language: 'ru' })).status).toBe(200);
    await stream.cancel();
    await settled();
  });

  it('stops accepting events once linkRevoked is sent, so a later broadcast is not delivered', async () => {
    const combat = await fetchCombat(dm);
    const stream = openSse(await openEvents(token, PLAYER_ID));
    await stream.event();
    broadcast(COMBAT_ID, { type: 'linkRevoked' }, 'player');
    expect(subscriberCount(COMBAT_ID)).toBe(0);
    broadcastDocument(COMBAT_ID, combat, 'player');
    expect(await stream.event()).toEqual({ id: undefined, event: { type: 'linkRevoked' } });
    expect(await stream.closed()).toBe(true);
  });

  it('ends with linkRevoked when the link is reissued, and the old token answers 410 afterwards', async () => {
    const stream = openSse(await openEvents(token, PLAYER_ID));
    await stream.event();
    const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/link/reissue`);
    expect(response.status).toBe(200);
    const reissued = linkReissueResultSchema.parse(await response.json());
    const oldKey = { playerId: PLAYER_ID, playerKey: keyOf(PLAYER_ID) };
    const { version } = await fetchCombat(dm);
    expect(await stream.event()).toEqual({ id: undefined, event: { type: 'linkRevoked' } });
    expect(await stream.closed()).toBe(true);
    expect(subscriberCount(COMBAT_ID)).toBe(0);
    for (const stale of [
      await getPlay(token, PLAYER_ID),
      await postAction(token, PLAYER_ID, {
        id: nextActionId(),
        version,
        type: 'heal',
        unitId: HERO_ID,
        amount: 1,
      }),
      await openEvents(token, PLAYER_ID),
    ]) {
      expect(stale.status).toBe(410);
      expect(await stale.json()).toMatchObject({ code: 'linkRevoked' });
    }
    token = reissued.token;
    generation = reissued.generation;
    const heal = { id: nextActionId(), version, type: 'heal', unitId: HERO_ID, amount: 1 };
    for (const old of [
      await getPlay(token, oldKey),
      await postAction(token, oldKey, heal),
      await openEvents(token, oldKey),
    ]) {
      expect(old.status).toBe(401);
      expect(await old.json()).toMatchObject({ code: 'unauthorized' });
    }
    expect((await getPlay(token, PLAYER_ID)).status).toBe(200);
  });

  it('ends with deleted carrying the title when the combat is removed', async () => {
    const combat = await fetchCombat(dm);
    const stream = openSse(await openEvents(token, PLAYER_ID));
    await stream.event();
    expect((await call(dm, 'DELETE', `/combats/${COMBAT_ID}`)).status).toBe(204);
    expect(await stream.event()).toEqual({
      id: undefined,
      event: { type: 'deleted', title: combat.title },
    });
    expect(await stream.closed()).toBe(true);
    expect((await getPlay(token, PLAYER_ID)).status).toBe(404);
  });
});
