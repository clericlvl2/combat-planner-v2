import type { Action, ActionId, LogEntry, Patch } from '@combat-planner/domain';
import { LIMITS, undoSummary } from '@combat-planner/domain';
import { asc, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { linkSchema } from '../src/client.ts';
import { appendLogEntry, markUndone, nextSeq } from '../src/combats/log.ts';
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

const SEEDED = 300;
const ROW_BOUND = 2 * (LIMITS.undoDepth + 1);

let opened: TestApp;
let dm: ReturnType<typeof withUser>;
let seeded = 0;
let token: string;

const seededId = (): ActionId => {
  seeded += 1;
  return `01BX5ZZKBKACTAV9WEVGEMM${String(seeded).padStart(3, '0')}`;
};

const append = (action: Action, patch: Patch | null): void => {
  const entry: LogEntry = { action, author: { kind: 'dm' }, at: NOW, patch, undoneBy: null };
  appendLogEntry(opened.db, COMBAT_ID, nextSeq(opened.db, COMBAT_ID), entry);
};

const damage = (amount: number): Action => {
  const action: Action = {
    id: seededId(),
    version: 3,
    type: 'damage',
    unitId: ENEMY_ID,
    amount,
  };
  append(action, { actionId: action.id, fields: {}, units: { [ENEMY_ID]: { hp: 20 } } });
  return action;
};

const undoOf = (target: Action): void => {
  const undo: Action = { id: seededId(), version: 3, type: 'undo' };
  append(undo, null);
  markUndone(opened.db, COMBAT_ID, target.id, undo.id);
};

const claim = (): void => {
  append(
    { id: seededId(), version: 3, type: 'claimUnit', unitId: HERO_ID, displayName: 'Mika' },
    null,
  );
};

const fullLog = (): LogEntry[] =>
  opened.db
    .select({
      action: actionLog.action,
      author: actionLog.author,
      at: actionLog.at,
      patch: actionLog.patch,
      undoneBy: actionLog.undoneBy,
    })
    .from(actionLog)
    .where(eq(actionLog.combatId, COMBAT_ID))
    .orderBy(asc(actionLog.seq))
    .all();

const countLogReads = () => {
  const reads = { statements: 0, rows: 0 };
  const client = opened.db.$client;
  const prepare = client.prepare.bind(client);
  vi.spyOn(client, 'prepare').mockImplementation((source: string) => {
    const statement = prepare(source);
    if (!/^select .* from "action_log"/i.test(source)) return statement;
    reads.statements += 1;
    const all = statement.all.bind(statement);
    const get = statement.get.bind(statement);
    statement.all = (...parameters: unknown[]) => {
      const rows = all(...parameters);
      reads.rows += rows.length;
      return rows;
    };
    statement.get = (...parameters: unknown[]) => {
      const row = get(...parameters);
      if (row !== undefined) reads.rows += 1;
      return row;
    };
    return statement;
  });
  return reads;
};

const expectBoundedSummary = async () => {
  const combat = await fetchCombat(dm);
  const expected = undoSummary(combat, fullLog());
  const reads = countLogReads();
  const document = await fetchCombat(dm);
  vi.restoreAllMocks();
  expect(document.undo).toEqual(expected);
  expect(reads.statements).toBeGreaterThan(0);
  expect(reads.rows).toBeLessThanOrEqual(ROW_BOUND);
  return document.undo;
};

beforeAll(async () => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
  const actions = [
    addUnitAction(ulidAt(100), 1, HERO_ID, 'Ada', 'hero'),
    addUnitAction(ulidAt(101), 2, ENEMY_ID, 'Goblin', 'enemy'),
  ];
  for (const action of actions) {
    expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, action)).status).toBe(200);
  }
  const link = linkSchema.parse(await (await call(dm, 'GET', `/combats/${COMBAT_ID}/link`)).json());
  token = link.token;
  for (let index = 0; index < SEEDED; index += 1) damage(1 + (index % 7));
});

afterAll(() => {
  opened.close();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('undo summary over a long log', () => {
  it('reads newest-first and stops at the newest undoable entry not undone', async () => {
    expect(fullLog().length).toBeGreaterThan(SEEDED);
    const newest = damage(9);
    expect(await expectBoundedSummary()).toEqual({ action: newest, unitName: 'Goblin' });
  });

  it('skips undone entries and their undo entries within the depth', async () => {
    const target = damage(4);
    const undone = [damage(5), damage(6), damage(7)];
    for (const action of [...undone].reverse()) undoOf(action);
    expect(await expectBoundedSummary()).toEqual({ action: target, unitName: 'Goblin' });
  });

  it('stops at the first entry without a patch', async () => {
    claim();
    const undone = damage(2);
    undoOf(undone);
    expect(await expectBoundedSummary()).toBeNull();
  });

  it('stops once the depth is exceeded', async () => {
    damage(3);
    const undone = Array.from({ length: LIMITS.undoDepth }, (_, index) => damage(index + 1));
    for (const action of [...undone].reverse()) undoOf(action);
    expect(await expectBoundedSummary()).toBeNull();
  });
});

describe('player SSE connect', () => {
  it('reads no log', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const reads = countLogReads();
    const response = await opened.app.request(
      `/play/${COMBAT_ID}/events?${new URLSearchParams({ t: token, playerId: PLAYER_ID }).toString()}`,
    );
    const stream = openSse(response);
    const initial = await stream.event();
    await stream.cancel();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(initial.event.type).toBe('document');
    expect(reads).toEqual({ statements: 0, rows: 0 });
  });
});
