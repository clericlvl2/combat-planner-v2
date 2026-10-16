import type { Action } from '@combat-planner/domain';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { subscriberCount } from '../src/live/registry.ts';
import { HEARTBEAT_MS } from '../src/live/sse.ts';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  ENEMY_ID,
  HERO_ID,
  OTHER_DM,
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

afterEach(() => {
  vi.useRealTimers();
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

  it('writes a comment heartbeat every 15 s', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const stream = openSse(await open());
    await stream.event();
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS - 1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await stream.comment()).toBe('');
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
