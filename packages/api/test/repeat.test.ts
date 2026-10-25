import type { Action, CombatId, UnitId } from '@combat-planner/domain';
import { LIMITS } from '@combat-planner/domain';
import { ulid } from 'ulid';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { dispatch } from '../src/combats/dispatch.ts';
import type { TestApp } from './helpers.ts';
import {
  DM,
  NOW,
  PLAYER_ID,
  addUnitAction,
  call,
  combatInput,
  createTestApp,
  fetchCombat,
  withUser,
} from './helpers.ts';

let opened: TestApp;
let dm: ReturnType<typeof withUser>;

beforeAll(() => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
});

afterAll(() => {
  opened.close();
});

const post = (combatId: CombatId, action: Action) =>
  call(dm, 'POST', `/combats/${combatId}/actions`, action);

const sendAsDm = async (combatId: CombatId, action: Action): Promise<number> => {
  const response = await post(combatId, action);
  expect(response.status).toBe(200);
  return ((await response.json()) as { version: number }).version;
};

const sendAsPlayer = (combatId: CombatId, action: Action) =>
  dispatch(opened.db, {
    combatId,
    viewer: { kind: 'player', playerId: PLAYER_ID },
    action,
    now: NOW,
  });

const toggle = (version: number, unitId: UnitId): Action => ({
  id: ulid(),
  version,
  type: 'toggleCondition',
  unitId,
  condition: 'dazed',
});

const withHero = async () => {
  const combatId = ulid();
  expect((await call(dm, 'POST', '/combats', combatInput(combatId))).status).toBe(200);
  const heroId = ulid();
  const version = await sendAsDm(combatId, addUnitAction(ulid(), 1, heroId, 'Vashti', 'hero'));
  return { combatId, heroId, version };
};

describe('a repeat after a lost reply', () => {
  it('a repeated claimUnit answers 200 with the current version and changes nothing', async () => {
    const { combatId, heroId, version } = await withHero();
    const claim: Action = {
      id: ulid(),
      version,
      type: 'claimUnit',
      unitId: heroId,
      displayName: 'Mika',
    };
    expect(sendAsPlayer(combatId, claim)).toMatchObject({ ok: true, version: version + 1 });
    expect(sendAsPlayer(combatId, claim)).toMatchObject({ ok: true, version: version + 1 });
    const stored = await fetchCombat(dm, combatId);
    expect(stored.version).toBe(version + 1);
    expect(stored.units[0]?.claimedBy).toBe(PLAYER_ID);
  });

  it('a repeated releaseUnit answers 200 with the current version and changes nothing', async () => {
    const { combatId, heroId, version } = await withHero();
    sendAsPlayer(combatId, {
      id: ulid(),
      version,
      type: 'claimUnit',
      unitId: heroId,
      displayName: 'Mika',
    });
    const release: Action = {
      id: ulid(),
      version: version + 1,
      type: 'releaseUnit',
      unitId: heroId,
    };
    expect(sendAsPlayer(combatId, release)).toMatchObject({ ok: true, version: version + 2 });
    expect(sendAsPlayer(combatId, release)).toMatchObject({ ok: true, version: version + 2 });
    const stored = await fetchCombat(dm, combatId);
    expect(stored.version).toBe(version + 2);
    expect(stored.units[0]?.claimedBy).toBeNull();
  });

  it('a repeated undo answers 200 and leaves the next undoable action in place', async () => {
    const { combatId, heroId, version: added } = await withHero();
    const first = toggle(added, heroId);
    let version = await sendAsDm(combatId, first);
    version = await sendAsDm(combatId, toggle(version, heroId));
    const undo: Action = { id: ulid(), version, type: 'undo' };
    version = await sendAsDm(combatId, undo);
    const repeated = await post(combatId, undo);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toEqual({ version });
    const stored = await fetchCombat(dm, combatId);
    expect(stored.version).toBe(version);
    expect(stored.units[0]?.conditions).toEqual(['dazed']);
    expect(stored.undo?.action.id).toBe(first.id);
  });

  it('a repeat of an action pushed out of the 10-deep undo stack answers 200', async () => {
    const combatId = ulid();
    expect((await call(dm, 'POST', '/combats', combatInput(combatId))).status).toBe(200);
    const unitId = ulid();
    const added = addUnitAction(ulid(), 1, unitId, 'Orc', 'enemy');
    let version = await sendAsDm(combatId, added);
    for (let index = 0; index < 10; index += 1) {
      version = await sendAsDm(combatId, toggle(version, unitId));
    }
    const repeated = await post(combatId, added);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toEqual({ version });
    const stored = await fetchCombat(dm, combatId);
    expect(stored.version).toBe(version);
    expect(stored.units).toHaveLength(1);
  });

  it('a repeat older than LIMITS.repeatWindow applied actions rejects version 409', async () => {
    const combatId = ulid();
    expect((await call(dm, 'POST', '/combats', combatInput(combatId))).status).toBe(200);
    const unitId = ulid();
    const added = addUnitAction(ulid(), 1, unitId, 'Orc', 'enemy');
    let version = await sendAsDm(combatId, added);
    for (let index = 1; index < LIMITS.repeatWindow; index += 1) {
      version = await sendAsDm(combatId, toggle(version, unitId));
    }
    expect((await post(combatId, added)).status).toBe(200);
    version = await sendAsDm(combatId, toggle(version, unitId));
    const repeated = await post(combatId, added);
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toMatchObject({ code: 'version' });
    const stored = await fetchCombat(dm, combatId);
    expect(stored.version).toBe(version);
    expect(stored.units).toHaveLength(1);
  });
});
