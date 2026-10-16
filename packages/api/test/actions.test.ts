import type { Action, Combat, PlayerCombat } from '@combat-planner/domain';
import { playerCombatSchema } from '@combat-planner/domain';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import type { ApiEvent } from '../src/client.ts';
import { dispatch } from '../src/combats/dispatch.ts';
import { actionLog, combats } from '../src/db/schema.ts';
import { subscribe } from '../src/live/registry.ts';
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

let opened: TestApp;
let dm: ReturnType<typeof withUser>;
let stranger: ReturnType<typeof withUser>;
let actionIndex = 0;
const nextActionId = () => ulidAt(200 + actionIndex++);

const post = (action: Action, combatId = COMBAT_ID) =>
  call(dm, 'POST', `/combats/${combatId}/actions`, action);

const logRows = () =>
  opened.db
    .select({
      seq: actionLog.seq,
      actionId: actionLog.actionId,
      type: actionLog.action,
      author: actionLog.author,
      patch: actionLog.patch,
      undoneBy: actionLog.undoneBy,
    })
    .from(actionLog)
    .where(eq(actionLog.combatId, COMBAT_ID))
    .orderBy(asc(actionLog.seq))
    .all();

const listen = (viewer: { kind: 'dm' } | { kind: 'player'; playerId: string }) => {
  const events: ApiEvent[] = [];
  const unsubscribe = subscribe(COMBAT_ID, {
    viewer,
    send: (event) => {
      events.push(event);
    },
  });
  return { events, unsubscribe };
};

beforeAll(async () => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  stranger = withUser(opened.app, OTHER_DM);
  expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
});

afterAll(() => {
  opened.close();
});

describe('POST /combats/:id/actions', () => {
  it('applies an action, bumps the version, logs the patch and broadcasts per viewer', async () => {
    const dmStream = listen({ kind: 'dm' });
    const playerStream = listen({ kind: 'player', playerId: PLAYER_ID });
    const action = addUnitAction(nextActionId(), 1, HERO_ID, 'Ada', 'hero');
    const response = await post(action);
    dmStream.unsubscribe();
    playerStream.unsubscribe();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 2 });
    const combat = await fetchCombat(dm);
    expect(combat.version).toBe(2);
    expect(combat.units.map((unit) => unit.id)).toEqual([HERO_ID]);
    expect(dmStream.events).toEqual([{ type: 'document', version: 2, document: combat }]);
    expect(playerStream.events).toHaveLength(1);
    const playerEvent = playerStream.events[0];
    expect(playerEvent?.type).toBe('document');
    const playerDocument = playerCombatSchema.parse(
      (playerEvent as { document: PlayerCombat }).document,
    );
    expect(playerDocument.version).toBe(2);
    expect(playerDocument).not.toHaveProperty('linkGeneration');
    expect(logRows()).toEqual([
      expect.objectContaining({
        seq: 1,
        actionId: action.id,
        author: { kind: 'dm' },
        undoneBy: null,
        patch: expect.objectContaining({ actionId: action.id }),
      }),
    ]);
  });

  it('answers 409 version for a stale action version and changes nothing', async () => {
    const response = await post(addUnitAction(nextActionId(), 1, ENEMY_ID, 'Goblin', 'enemy'));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'version' });
    expect((await fetchCombat(dm)).version).toBe(2);
    expect(logRows()).toHaveLength(1);
  });

  it('replays a known action id with the same version and no second log entry', async () => {
    const action = addUnitAction(nextActionId(), 2, ENEMY_ID, 'Goblin', 'enemy');
    const first = await post(action);
    expect(await first.json()).toEqual({ version: 3 });
    const { events, unsubscribe } = listen({ kind: 'dm' });
    const replay = await post({ ...action, version: 99 });
    unsubscribe();
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual({ version: 3 });
    expect(events).toEqual([]);
    expect(logRows()).toHaveLength(2);
    expect((await fetchCombat(dm)).version).toBe(3);
  });

  it('answers 403 forbidden when the DM sends a player-only action', async () => {
    const response = await post({
      id: nextActionId(),
      version: 3,
      type: 'claimUnit',
      unitId: HERO_ID,
      displayName: 'Ada',
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'forbidden' });
  });

  it('answers 403 for a player viewer acting outside the player actions', () => {
    const outcome = dispatch(opened.db, {
      combatId: COMBAT_ID,
      viewer: { kind: 'player', playerId: PLAYER_ID },
      action: { id: nextActionId(), version: 3, type: 'nextTurn' },
      now: NOW,
    });
    expect(outcome).toMatchObject({ ok: false, status: 403, code: 'forbidden' });
  });

  it('answers 422 blocked on a failing apply and leaves document, log and version intact', async () => {
    const before = opened.db.select().from(combats).where(eq(combats.id, COMBAT_ID)).get();
    const log = logRows();
    const response = await post({ id: nextActionId(), version: 3, type: 'nextTurn' });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'blocked' });
    expect(opened.db.select().from(combats).where(eq(combats.id, COMBAT_ID)).get()).toEqual(before);
    expect(logRows()).toEqual(log);
  });

  it('answers 404 notFound for a unit that is not in the combat', async () => {
    const response = await post({
      id: nextActionId(),
      version: 3,
      type: 'damage',
      unitId: ulidAt(999),
      amount: 3,
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'notFound' });
  });

  it('answers 422 invalid for an addUnit beyond the unit limit', async () => {
    const limited = createTestApp();
    const owner = withUser(limited.app, DM);
    try {
      const combatId = ulidAt(300);
      expect((await call(owner, 'POST', '/combats', combatInput(combatId))).status).toBe(200);
      for (let index = 0; index < 99; index += 1) {
        const response = await call(
          owner,
          'POST',
          `/combats/${combatId}/actions`,
          addUnitAction(
            ulidAt(400 + index),
            index + 1,
            ulidAt(600 + index),
            `Unit ${index}`,
            'enemy',
          ),
        );
        expect(response.status).toBe(200);
      }
      const extra = await call(
        owner,
        'POST',
        `/combats/${combatId}/actions`,
        addUnitAction(ulidAt(999), 100, ulidAt(998), 'One too many', 'enemy'),
      );
      expect(extra.status).toBe(422);
      expect(await extra.json()).toMatchObject({ code: 'limit' });
    } finally {
      limited.close();
    }
  });

  it('answers 404 for a combat of another user', async () => {
    const response = await call(stranger, 'POST', `/combats/${COMBAT_ID}/actions`, {
      id: nextActionId(),
      version: 3,
      type: 'nextTurn',
    });
    expect(response.status).toBe(404);
  });

  it('rejects a malformed action with 400', async () => {
    const response = await post({ id: 'nope', version: 3, type: 'nextTurn' } as unknown as Action);
    expect(response.status).toBe(400);
  });
});

describe('player actions through dispatch', () => {
  it('claims a hero as a player, logs the claim without a patch and records the name', () => {
    const action: Action = {
      id: nextActionId(),
      version: 3,
      type: 'claimUnit',
      unitId: HERO_ID,
      displayName: 'Ada',
    };
    const outcome = dispatch(opened.db, {
      combatId: COMBAT_ID,
      viewer: { kind: 'player', playerId: PLAYER_ID },
      action,
      now: NOW,
    });
    expect(outcome).toMatchObject({ ok: true, version: 4 });
    const combat = (outcome as { combat: Combat }).combat;
    expect(combat.units.find((unit) => unit.id === HERO_ID)?.claimedBy).toBe(PLAYER_ID);
    expect(combat.players).toEqual({ [PLAYER_ID]: 'Ada' });
    expect(logRows().at(-1)).toMatchObject({
      actionId: action.id,
      author: { kind: 'player', playerId: PLAYER_ID },
      patch: null,
    });
  });

  it('projects the player document with hidden enemy fields removed', async () => {
    const { events, unsubscribe } = listen({ kind: 'player', playerId: PLAYER_ID });
    const response = await post({
      id: nextActionId(),
      version: 4,
      type: 'damage',
      unitId: ENEMY_ID,
      amount: 5,
    });
    unsubscribe();
    expect(response.status).toBe(200);
    const event = events[0] as { document: PlayerCombat };
    const enemy = event.document.units.find((unit) => unit.id === ENEMY_ID);
    expect(enemy).toBeDefined();
    expect(enemy).not.toHaveProperty('hp');
    expect(enemy).not.toHaveProperty('note');
    const hero = event.document.units.find((unit) => unit.id === HERO_ID);
    expect(hero).toMatchObject({ claimedBy: PLAYER_ID, hp: 20, note: '' });
  });
});

describe('undo through the route', () => {
  it('reverts the newest undoable entry and marks it undoneBy', async () => {
    const before = await fetchCombat(dm);
    const damaged = before.units.find((unit) => unit.id === ENEMY_ID);
    expect(damaged?.hp).toBe(15);
    const damageEntry = logRows().at(-1);
    expect(damageEntry?.undoneBy).toBeNull();
    const undo: Action = { id: nextActionId(), version: before.version, type: 'undo' };
    const response = await post(undo);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: before.version + 1 });
    const after = await fetchCombat(dm);
    expect(after.units.find((unit) => unit.id === ENEMY_ID)?.hp).toBe(20);
    const rows = logRows();
    expect(rows.find((row) => row.actionId === damageEntry?.actionId)?.undoneBy).toBe(undo.id);
    expect(rows.at(-1)).toMatchObject({ actionId: undo.id, patch: null, undoneBy: null });
  });

  it('stops at the claim entry with 422 blocked', async () => {
    const combat = await fetchCombat(dm);
    const response = await post({ id: nextActionId(), version: combat.version, type: 'undo' });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'blocked' });
  });
});
