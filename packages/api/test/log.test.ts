import type { Action, Combat, Patch, UndoableEntry, Viewer } from '@combat-planner/domain';
import { DomainError, LIMITS, apply, nextStack, undoSummary } from '@combat-planner/domain';
import { asc, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { playerCredentialsSchema, playerLinkSchema } from '../src/client.ts';
import { dispatch } from '../src/combats/dispatch.ts';
import { actionLog } from '../src/db/schema.ts';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  ENEMY_ID,
  HERO_ID,
  NOW,
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

const DM_VIEWER: Viewer = { kind: 'dm' };
const PLAYER: Viewer = { kind: 'player', playerId: PLAYER_ID };

const rowsOf = (source: TestApp) =>
  source.db
    .select({ actionId: actionLog.actionId, undoneBy: actionLog.undoneBy })
    .from(actionLog)
    .where(eq(actionLog.combatId, COMBAT_ID))
    .orderBy(asc(actionLog.seq))
    .all();

const countLogReads = (source: TestApp) => {
  const reads = { statements: 0 };
  const client = source.db.$client;
  const prepare = client.prepare.bind(client);
  vi.spyOn(client, 'prepare').mockImplementation((statement: string) => {
    if (/^select .* from "action_log"/i.test(statement)) reads.statements += 1;
    return prepare(statement);
  });
  return reads;
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('undo stack through dispatch', () => {
  type Payload =
    | { type: 'damage' | 'heal'; unitId: string; amount: number }
    | { type: 'undo' }
    | { type: 'claimUnit'; unitId: string; displayName: string }
    | { type: 'releaseUnit'; unitId: string }
    | { type: 'removeUnit'; unitId: string }
    | ReturnType<typeof addUnitAction>;

  let opened: TestApp;
  let dm: ReturnType<typeof withUser>;
  let mirror: Combat;
  let stack: UndoableEntry[] = [];
  let next = 0;

  const step = async (payload: Payload, viewer: Viewer = DM_VIEWER) => {
    next += 1;
    const action = { ...payload, id: ulidAt(200 + next), version: mirror.version } as Action;
    const status =
      viewer.kind === 'dm'
        ? (await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, action)).status
        : dispatch(opened.db, { combatId: COMBAT_ID, viewer, action, now: NOW }).ok
          ? 200
          : 422;
    const result = apply(mirror, action, viewer, NOW, stack);
    if (result instanceof DomainError) {
      expect(status).toBe(422);
    } else {
      expect(status).toBe(200);
      stack = nextStack(stack, { action, author: viewer, at: NOW, patch: result.patch });
      mirror = result.combat;
    }
    const document = await fetchCombat(dm);
    expect(document.version).toBe(mirror.version);
    expect(document.units.map(({ id, hp, claimedBy }) => ({ id, hp, claimedBy }))).toEqual(
      mirror.units.map(({ id, hp, claimedBy }) => ({ id, hp, claimedBy })),
    );
    expect(document.undo).toEqual(undoSummary(mirror, stack));
    expect(rowsOf(opened).map((row) => row.actionId)).toEqual(
      stack.map((entry) => entry.action.id),
    );
    expect(rowsOf(opened).length).toBeLessThanOrEqual(LIMITS.undoDepth);
    return { status, action };
  };
  const hits = async (count: number) => {
    for (let index = 0; index < count; index += 1) {
      await step({
        type: index % 3 === 2 ? 'heal' : 'damage',
        unitId: ENEMY_ID,
        amount: 1 + (index % 4),
      });
    }
  };
  const undos = async (count: number) => {
    const statuses: number[] = [];
    for (let index = 0; index < count; index += 1) {
      statuses.push((await step({ type: 'undo' })).status);
    }
    return statuses;
  };
  const times = (count: number, status: number) => Array.from({ length: count }, () => status);

  beforeAll(async () => {
    opened = createTestApp({ rateLimit: false });
    dm = withUser(opened.app, DM);
    expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
    const { undo: _undo, ...initial } = await fetchCombat(dm);
    mirror = initial;
    await step(addUnitAction(ulidAt(150), 1, ENEMY_ID, 'Goblin', 'enemy'));
    await step(addUnitAction(ulidAt(151), 2, HERO_ID, 'Ada', 'hero'));
  });

  afterAll(() => {
    opened.close();
  });

  it('after 10 actions, 5 undos and 1 action, exactly 6 undos succeed', async () => {
    await hits(10);
    expect(await undos(5)).toEqual(times(5, 200));
    await hits(1);
    expect(await undos(7)).toEqual([...times(6, 200), 422]);
  });

  it('a push past 10 drops the oldest action', async () => {
    await hits(LIMITS.undoDepth + 5);
    expect(rowsOf(opened)).toHaveLength(LIMITS.undoDepth);
    expect(await undos(LIMITS.undoDepth + 1)).toEqual([...times(LIMITS.undoDepth, 200), 422]);
    expect(rowsOf(opened)).toEqual([]);
  });

  it('a claim and a release between DM actions keep the stack and the undo summary', async () => {
    await hits(3);
    const before = rowsOf(opened);
    const { undo } = await fetchCombat(dm);
    await step({ type: 'claimUnit', unitId: HERO_ID, displayName: 'Ada' }, PLAYER);
    await step({ type: 'releaseUnit', unitId: HERO_ID }, PLAYER);
    expect(rowsOf(opened)).toEqual(before);
    expect((await fetchCombat(dm)).undo).toEqual(undo);
    await hits(2);
    expect(await undos(6)).toEqual([...times(5, 200), 422]);
  });

  it('a link reissue keeps the stack', async () => {
    await hits(2);
    await step({ type: 'claimUnit', unitId: HERO_ID, displayName: 'Ada' }, PLAYER);
    const before = rowsOf(opened);
    const { undo } = await fetchCombat(dm);
    expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/link/reissue`)).status).toBe(200);
    const { undo: after, ...reissued } = await fetchCombat(dm);
    expect(reissued.units.every((unit) => unit.claimedBy === null)).toBe(true);
    expect(rowsOf(opened)).toEqual(before);
    expect(after).toEqual(undo);
    mirror = reissued;
    expect(await undos(3)).toEqual([200, 200, 422]);
  });

  it('undo of a DM action after a claim keeps the claim', async () => {
    await hits(1);
    await step({ type: 'claimUnit', unitId: HERO_ID, displayName: 'Ada' }, PLAYER);
    expect(await undos(1)).toEqual([200]);
    expect((await fetchCombat(dm)).units.find((unit) => unit.id === HERO_ID)?.claimedBy).toBe(
      PLAYER_ID,
    );
  });

  it('undo restoring a removed hero returns it unclaimed', async () => {
    await step({ type: 'removeUnit', unitId: HERO_ID });
    await undos(1);
    expect((await fetchCombat(dm)).units.find((unit) => unit.id === HERO_ID)?.claimedBy).toBe(null);
  });

  it('a retried undo is refused with 409 version and writes no row', async () => {
    await hits(2);
    const { action } = await step({ type: 'undo' });
    const before = rowsOf(opened);
    const retry = await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, action);
    expect(retry.status).toBe(409);
    expect(await retry.json()).toMatchObject({ code: 'version' });
    expect(rowsOf(opened)).toEqual(before);
    expect(before).toHaveLength(1);
  });

  it('deleting the combat deletes its stack', async () => {
    expect((await call(dm, 'DELETE', `/combats/${COMBAT_ID}`)).status).toBe(204);
    expect(rowsOf(opened)).toEqual([]);
  });
});

describe('a log written before the stack', () => {
  let opened: TestApp;
  let dm: ReturnType<typeof withUser>;
  let seq = 1;

  const patchOf = (id: string): Patch => ({
    actionId: id,
    fields: {},
    units: { [ENEMY_ID]: { hp: 20 } },
  });
  const insert = (action: Action, patch: Patch | null) => {
    seq += 1;
    opened.db
      .insert(actionLog)
      .values({
        combatId: COMBAT_ID,
        seq,
        actionId: action.id,
        action,
        author: DM_VIEWER,
        at: NOW,
        patch,
      })
      .run();
  };
  const damage = (index: number): Action => {
    const action: Action = {
      id: ulidAt(300 + index),
      version: 2,
      type: 'damage',
      unitId: ENEMY_ID,
      amount: 1,
    };
    insert(action, patchOf(action.id));
    return action;
  };

  beforeAll(async () => {
    opened = createTestApp({ rateLimit: false });
    dm = withUser(opened.app, DM);
    expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
    const added = addUnitAction(ulidAt(100), 1, ENEMY_ID, 'Goblin', 'enemy');
    expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, added)).status).toBe(200);
  });

  afterAll(() => {
    opened.close();
  });

  it('shows the top of its stack, skips claims and is trimmed to the stack on the next action', async () => {
    const damages = Array.from({ length: 6 }, (_, index) => damage(index));
    insert(
      { id: ulidAt(299), version: 2, type: 'claimUnit', unitId: HERO_ID, displayName: 'Ada' },
      null,
    );
    damages.push(...Array.from({ length: 6 }, (_, index) => damage(index + 6)));
    const undo: Action = { id: ulidAt(400), version: 2, type: 'undo' };
    opened.db
      .update(actionLog)
      .set({ undoneBy: undo.id })
      .where(eq(actionLog.actionId, damages[11]?.id ?? ''))
      .run();
    insert(undo, null);
    const legacy = await fetchCombat(dm);
    expect(legacy.undo).toEqual({ action: damages[10], unitName: 'Goblin' });
    const heal: Action = {
      id: ulidAt(401),
      version: legacy.version,
      type: 'heal',
      unitId: ENEMY_ID,
      amount: 1,
    };
    expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, heal)).status).toBe(200);
    expect(rowsOf(opened)).toEqual([
      ...damages.slice(2, 11).map((action) => ({ actionId: action.id, undoneBy: null })),
      { actionId: heal.id, undoneBy: null },
    ]);
  });

  it('a player stream connect reads no log', async () => {
    const link = playerLinkSchema.parse(
      await (await call(dm, 'GET', `/combats/${COMBAT_ID}/link`)).json(),
    );
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const joined = await opened.app.request(
      `/play/${COMBAT_ID}/join?${new URLSearchParams({ t: link.token }).toString()}`,
      { method: 'POST' },
    );
    const credentials = playerCredentialsSchema.parse(await joined.json());
    const reads = countLogReads(opened);
    const response = await opened.app.request(
      `/play/${COMBAT_ID}/events?${new URLSearchParams({ t: link.token, ...credentials }).toString()}`,
    );
    const stream = openSse(response);
    const initial = await stream.event();
    await stream.cancel();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(initial.event.type).toBe('document');
    expect(reads).toEqual({ statements: 0 });
  });
});
