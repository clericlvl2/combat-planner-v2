import type { Action } from '@combat-planner/domain';
import { project } from '@combat-planner/domain';
import type { DmCombat } from '../src/client.ts';
import { dmCombatSchema } from '../src/client.ts';
import { Hono } from 'hono';
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
import { subscriberCount } from '../src/live/registry.ts';
import { HEARTBEAT_MS, streamCombatEvents } from '../src/live/sse.ts';
import type { StreamRequest } from '../src/live/sse.ts';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  ENEMY_ID,
  HERO_ID,
  NOW,
  OTHER_DM,
  PLAYER_ID,
  addUnitAction,
  call,
  combatInput,
  createTestApp,
  fetchCombat,
  ulidAt,
  withUser,
} from './helpers.ts';
import { openSse } from './sse.ts';

let opened: TestApp;
let dm: ReturnType<typeof withUser>;
let stranger: ReturnType<typeof withUser>;
let actionIndex = 0;
const nextActionId = () => ulidAt(100 + actionIndex++);

const EVENTS = `/combats/${COMBAT_ID}/events`;

const open = (init: RequestInit = {}) => dm.request(EVENTS, init);

const dispatchDamage = async (unitId: string, amount: number) => {
  const combat = await fetchCombat(dm);
  const action: Action = {
    id: nextActionId(),
    version: combat.version,
    type: 'damage',
    unitId,
    amount,
  };
  const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, action);
  expect(response.status).toBe(200);
  return fetchCombat(dm);
};

const settled = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const PENDING = 'pending';

const pendingAfterTick = <T>(read: Promise<T>) =>
  Promise.race([read, settled().then(() => PENDING)]);

const streamWith = (request: StreamRequest) =>
  new Hono().get('/', (c) => streamCombatEvents(c, request)).request('/');

beforeAll(async () => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  stranger = withUser(opened.app, OTHER_DM);
  expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
  const actions = [
    addUnitAction(nextActionId(), 1, HERO_ID, 'Ada', 'hero'),
    addUnitAction(nextActionId(), 2, ENEMY_ID, 'Goblin', 'enemy'),
  ];
  for (const action of actions) {
    expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, action)).status).toBe(200);
  }
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
  vi.restoreAllMocks();
  expect(intervals).toBe(0);
  expect(subscriberCount(COMBAT_ID)).toBe(0);
});

describe('GET /combats/:id/events', () => {
  it('answers 401 without a user', async () => {
    expect((await opened.app.request(EVENTS)).status).toBe(401);
  });

  it('answers 404 for a combat of another user', async () => {
    expect((await stranger.request(EVENTS)).status).toBe(404);
  });

  it('answers 404 for an unknown combat', async () => {
    expect((await dm.request(`/combats/${ulidAt(1)}/events`)).status).toBe(404);
  });

  it('opens with the current DM document and relays a dispatched version with id = version', async () => {
    const combat = await fetchCombat(dm);
    const stream = openSse(await open());
    expect(await stream.event()).toEqual({
      id: String(combat.version),
      event: { type: 'document', version: combat.version, document: combat },
    });
    expect(subscriberCount(COMBAT_ID)).toBe(1);
    const damaged = await dispatchDamage(ENEMY_ID, 3);
    expect(damaged.version).toBe(combat.version + 1);
    expect(damaged.undo).toMatchObject({ action: { type: 'damage', amount: 3 } });
    expect(await stream.event()).toEqual({
      id: String(damaged.version),
      event: { type: 'document', version: damaged.version, document: damaged },
    });
    await stream.cancel();
    await settled();
  });

  it('sends nothing on open when Last-Event-ID equals the current version', async () => {
    const combat = await fetchCombat(dm);
    const stream = openSse(await open({ headers: { 'Last-Event-ID': String(combat.version) } }));
    const healed = await dispatchDamage(ENEMY_ID, 2);
    expect(await stream.event()).toEqual({
      id: String(healed.version),
      event: { type: 'document', version: healed.version, document: healed },
    });
    await stream.cancel();
    await settled();
  });

  it('sends the document on open when Last-Event-ID is behind', async () => {
    const combat = await fetchCombat(dm);
    const stream = openSse(
      await open({ headers: { 'Last-Event-ID': String(combat.version - 1) } }),
    );
    expect((await stream.event()).id).toBe(String(combat.version));
    await stream.cancel();
    await settled();
  });

  it('writes a comment heartbeat every 15 s and nothing before', async () => {
    const stream = openSse(await open());
    await stream.event();
    const first = stream.next();
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS - 1);
    expect(await pendingAfterTick(first)).toBe(PENDING);
    await vi.advanceTimersByTimeAsync(1);
    expect(await first).toEqual({ comment: true, data: '' });
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
    expect(await stream.comment()).toBe('');
    await stream.cancel();
    await settled();
  });

  it('unsubscribes from the registry when the request signal aborts', async () => {
    const controller = new AbortController();
    const stream = openSse(await open({ signal: controller.signal }));
    await stream.event();
    expect(subscriberCount(COMBAT_ID)).toBe(1);
    controller.abort();
    await settled();
    expect(subscriberCount(COMBAT_ID)).toBe(0);
    expect(await stream.closed()).toBe(true);
  });

  it('unsubscribes and clears the heartbeat at once when the request signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const stream = openSse(await open({ signal: controller.signal }));
    expect(subscriberCount(COMBAT_ID)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(await stream.closed()).toBe(true);
  });

  it('unsubscribes from the registry when the client cancels the body', async () => {
    const stream = openSse(await open());
    await stream.event();
    expect(subscriberCount(COMBAT_ID)).toBe(1);
    await stream.cancel();
    await settled();
    expect(subscriberCount(COMBAT_ID)).toBe(0);
  });

  it('ends with deleted carrying the title when the combat is removed', async () => {
    const combat = await fetchCombat(dm);
    const stream = openSse(await open());
    await stream.event();
    expect((await call(dm, 'DELETE', `/combats/${COMBAT_ID}`)).status).toBe(204);
    expect(await stream.event()).toEqual({
      id: undefined,
      event: { type: 'deleted', title: combat.title },
    });
    expect(await stream.closed()).toBe(true);
    expect(subscriberCount(COMBAT_ID)).toBe(0);
  });
});

describe('streamCombatEvents', () => {
  it('unsubscribes and clears the heartbeat when load() throws', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('load failed');
    const stream = openSse(
      await streamWith({
        combatId: COMBAT_ID,
        viewer: { kind: 'dm' },
        load: () => {
          throw failure;
        },
      }),
    );
    expect(subscriberCount(COMBAT_ID)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(await stream.closed()).toBe(true);
    expect(logged).toHaveBeenCalledWith(failure);
  });

  it('unsubscribes and clears the heartbeat when project() throws', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('project failed');
    const liveId = ulidAt(900);
    expect((await call(dm, 'POST', '/combats', combatInput(liveId))).status).toBe(200);
    const combat = dmCombatSchema.parse(await fetchCombat(dm, liveId));
    const broken: DmCombat = {
      ...combat,
      get units(): DmCombat['units'] {
        throw failure;
      },
    };
    const viewer = { kind: 'player', playerId: PLAYER_ID } as const;
    const stream = openSse(
      await streamWith({
        combatId: liveId,
        viewer,
        load: () => project(broken, viewer),
        language: () => 'en',
      }),
    );
    expect(subscriberCount(liveId)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(await stream.closed()).toBe(true);
    expect(logged).toHaveBeenCalledWith(failure);
  });

  it('sends a player stream its projection and refuses a DmCombat loader at compile time', async () => {
    const combat: DmCombat = {
      id: COMBAT_ID,
      title: 'Goblin ambush',
      description: '',
      color: 3,
      status: 'setup',
      round: 1,
      escalation: 0,
      activeUnitId: null,
      lastPlayedAt: null,
      linkGeneration: 2,
      version: 7,
      players: {},
      createdAt: NOW,
      updatedAt: NOW,
      units: [],
      undo: null,
    };
    const viewer = { kind: 'player', playerId: PLAYER_ID } as const;
    const projected = project(combat, viewer);
    const app = new Hono()
      .get('/', (c) =>
        streamCombatEvents(c, {
          combatId: COMBAT_ID,
          viewer,
          load: () => projected,
          language: () => 'de',
        }),
      )
      .get('/dm-document', (c) => {
        const dmLoader = {
          combatId: COMBAT_ID,
          viewer,
          load: () => combat,
          language: () => 'de' as const,
        };
        // @ts-expect-error a DmCombat never reaches a player stream
        return streamCombatEvents(c, dmLoader);
      });
    const stream = openSse(await app.request('/'));
    expect(await stream.event()).toEqual({
      id: String(combat.version),
      event: { type: 'document', version: combat.version, document: projected, language: 'de' },
    });
    expect(projected).not.toHaveProperty('linkGeneration');
    await stream.cancel();
    await settled();
  });
});
