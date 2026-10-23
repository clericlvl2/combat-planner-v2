import type { Action } from '@combat-planner/domain';
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
import type { ApiEvent, DmCombat, PlayerCredentials } from '../src/client.ts';
import { playerCredentialsSchema, playerLinkSchema } from '../src/client.ts';
import { players } from '../src/db/schema.ts';
import { subscribe, subscriberCount } from '../src/live/registry.ts';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  ENEMY_ID,
  HERO_ID,
  addUnitAction,
  call,
  combatInput,
  createTestApp,
  fetchCombat,
  ulidAt,
  withUser,
} from './helpers.ts';
import { openSse } from './sse.ts';

const SECOND_HERO = ulidAt(900);

let opened: TestApp;
let dm: ReturnType<typeof withUser>;
let token: string;
let actionIndex = 0;
const nextActionId = () => ulidAt(100 + actionIndex++);
const unsubscribes: (() => void)[] = [];

const join = async (credentials?: PlayerCredentials) => {
  const response = await opened.app.request(
    `/play/${COMBAT_ID}/join?t=${encodeURIComponent(token)}`,
    { method: 'POST', headers: credentials ? playerHeaders(credentials) : {} },
  );
  expect(response.status).toBe(200);
  return playerCredentialsSchema.parse(await response.json());
};

const playerHeaders = ({ playerId, playerKey }: PlayerCredentials): Record<string, string> => ({
  'X-Player-Id': playerId,
  'X-Player-Key': playerKey,
});

const leave = (credentials: PlayerCredentials, combatId = COMBAT_ID) =>
  opened.app.request(`/play/${combatId}/leave`, {
    method: 'POST',
    headers: playerHeaders(credentials),
  });

const getPlay = (credentials: PlayerCredentials) =>
  opened.app.request(`/play/${COMBAT_ID}?t=${encodeURIComponent(token)}`, {
    headers: playerHeaders(credentials),
  });

type PlayerBody =
  | { type: 'claimUnit'; unitId: string; displayName: string }
  | { type: 'releaseUnit'; unitId: string };

const playerAction = async (credentials: PlayerCredentials, body: PlayerBody) => {
  const { version } = await fetchCombat(dm);
  const response = await opened.app.request(
    `/play/${COMBAT_ID}/actions?t=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...playerHeaders(credentials) },
      body: JSON.stringify({ ...body, id: nextActionId(), version }),
    },
  );
  expect(response.status).toBe(200);
};

const dmAction = async (action: Omit<Extract<Action, { type: 'damage' }>, 'id' | 'version'>) => {
  const { version } = await fetchCombat(dm);
  const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, {
    ...action,
    id: nextActionId(),
    version,
  });
  expect(response.status).toBe(200);
};

const listenAsDm = () => {
  const events: ApiEvent[] = [];
  unsubscribes.push(
    subscribe(COMBAT_ID, { viewer: { kind: 'dm' }, send: (event) => events.push(event) }),
  );
  return events;
};

const playerRow = (playerId: string) =>
  opened.db
    .select({ playerId: players.playerId })
    .from(players)
    .where(and(eq(players.combatId, COMBAT_ID), eq(players.playerId, playerId)))
    .get();

const playerCount = () =>
  opened.db
    .select({ playerId: players.playerId })
    .from(players)
    .where(eq(players.combatId, COMBAT_ID))
    .all().length;

const settled = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeAll(async () => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
  const actions = [
    addUnitAction(nextActionId(), 1, HERO_ID, 'Ada', 'hero'),
    addUnitAction(nextActionId(), 2, SECOND_HERO, 'Bram', 'hero'),
    addUnitAction(nextActionId(), 3, ENEMY_ID, 'Goblin', 'enemy'),
  ];
  for (const action of actions) {
    expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, action)).status).toBe(200);
  }
  token = playerLinkSchema.parse(
    await (await call(dm, 'GET', `/combats/${COMBAT_ID}/link`)).json(),
  ).token;
});

afterAll(() => {
  opened.close();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
});

afterEach(() => {
  for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
  vi.useRealTimers();
  expect(subscriberCount(COMBAT_ID)).toBe(0);
});

describe('player joined', () => {
  it('tells only the DM when a new player joins, and nobody when a player rejoins with a valid key', async () => {
    const dmEvents = listenAsDm();
    const playerEvents: ApiEvent[] = [];
    const known = await join();
    unsubscribes.push(
      subscribe(COMBAT_ID, {
        viewer: { kind: 'player', playerId: known.playerId },
        send: (event) => playerEvents.push(event),
      }),
    );
    expect(dmEvents).toEqual([{ type: 'playerJoined' }]);
    expect(await join(known)).toEqual(known);
    expect(dmEvents).toEqual([{ type: 'playerJoined' }]);
    await join();
    expect(dmEvents).toEqual([{ type: 'playerJoined' }, { type: 'playerJoined' }]);
    expect(playerEvents).toEqual([]);
  });

  it('streams the join to the DM without ending the stream', async () => {
    const stream = openSse(await dm.request(`/combats/${COMBAT_ID}/events`));
    expect((await stream.event()).event.type).toBe('document');
    await join();
    expect(await stream.event()).toEqual({ id: undefined, event: { type: 'playerJoined' } });
    await dmAction({ type: 'damage', unitId: ENEMY_ID, amount: 1 });
    expect((await stream.event()).event.type).toBe('document');
    await stream.cancel();
    await settled();
  });
});

describe('POST /play/:id/leave', () => {
  it('releases the heroes outside the undo stack, drops the player and tells the DM', async () => {
    const player = await join();
    await playerAction(player, { type: 'claimUnit', unitId: HERO_ID, displayName: 'Mika' });
    await playerAction(player, { type: 'claimUnit', unitId: SECOND_HERO, displayName: 'Mika' });
    await dmAction({ type: 'damage', unitId: ENEMY_ID, amount: 2 });
    const before = await fetchCombat(dm);
    const dmEvents = listenAsDm();
    const playerEvents: ApiEvent[] = [];
    let closed = false;
    const unsubscribe = subscribe(COMBAT_ID, {
      viewer: { kind: 'player', playerId: player.playerId },
      send: (event) => playerEvents.push(event),
      close: () => {
        closed = true;
        unsubscribe();
      },
    });
    unsubscribes.push(unsubscribe);
    const response = await leave(player);
    expect(response.status).toBe(204);
    const after = await fetchCombat(dm);
    expect(after.version).toBe(before.version + 1);
    expect(after.units.map((unit) => unit.claimedBy)).toEqual([null, null, null]);
    expect(after.players[player.playerId]).toBeUndefined();
    expect(after.undo).toEqual(before.undo);
    expect(dmEvents).toEqual([
      expect.objectContaining({ type: 'document', version: after.version }),
      { type: 'playerLeft', name: 'Mika' },
    ]);
    expect((dmEvents[0] as { document: DmCombat }).document.players).toEqual(after.players);
    expect(closed).toBe(true);
    expect(playerEvents).toEqual([{ type: 'left' }]);
    expect(playerRow(player.playerId)).toBeUndefined();
    expect((await getPlay(player)).status).toBe(401);
    expect((await join(player)).playerId).not.toBe(player.playerId);
  });

  it('ends the leaver stream with left, and no player takes the freed place', async () => {
    const player = await join();
    await playerAction(player, { type: 'claimUnit', unitId: HERO_ID, displayName: 'Mika' });
    const rowsBefore = playerCount();
    const query = new URLSearchParams({ t: token, ...player });
    const stream = openSse(await opened.app.request(`/play/${COMBAT_ID}/events?${query}`));
    expect((await stream.event()).event.type).toBe('document');
    const dmEvents = listenAsDm();
    expect((await leave(player)).status).toBe(204);
    expect(await stream.event()).toEqual({ id: undefined, event: { type: 'left' } });
    expect(await stream.closed()).toBe(true);
    await settled();
    expect(playerCount()).toBe(rowsBefore - 1);
    expect(dmEvents.map((event) => event.type)).toEqual(['document', 'playerLeft']);
  });

  it('drops a player without a name and tells the DM nothing', async () => {
    const player = await join();
    const before = await fetchCombat(dm);
    const dmEvents = listenAsDm();
    expect((await leave(player)).status).toBe(204);
    expect((await fetchCombat(dm)).version).toBe(before.version);
    expect(dmEvents).toEqual([]);
    expect(playerRow(player.playerId)).toBeUndefined();
  });

  it('answers 401 without a valid key or a player row, and 404 for an unknown combat', async () => {
    const player = await join();
    const other = await join();
    expect((await leave({ ...player, playerKey: other.playerKey })).status).toBe(401);
    expect(
      (
        await opened.app.request(`/play/${COMBAT_ID}/leave`, {
          method: 'POST',
          headers: { 'X-Player-Id': player.playerId },
        })
      ).status,
    ).toBe(401);
    expect((await leave(player, ulidAt(990))).status).toBe(404);
    expect(playerRow(player.playerId)).toBeDefined();
    expect((await leave(player)).status).toBe(204);
    expect((await leave(player)).status).toBe(401);
  });
});
