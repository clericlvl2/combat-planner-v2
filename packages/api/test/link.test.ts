import type { Action, Combat } from '@combat-planner/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import type { ApiEvent } from '../src/client.ts';
import { playerLinkSchema, linkReissueResultSchema } from '../src/client.ts';
import { dispatch } from '../src/combats/dispatch.ts';
import { actionLog } from '../src/db/schema.ts';
import { signLink, verifyLink } from '../src/link/token.ts';
import { subscribe } from '../src/live/registry.ts';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  HERO_ID,
  NOW,
  OTHER_DM,
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

const SECOND_HERO = ulidAt(700);
const SECOND_PLAYER = ulidAt(701);
const secret = env.linkSecret;

describe('signLink and verifyLink', () => {
  const claims = { combatId: COMBAT_ID, generation: 3 };

  it('signs <combatId>.<generation>.<hmac> and verifies it back', () => {
    const token = signLink(claims, secret);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(COMBAT_ID);
    expect(parts[1]).toBe('3');
    expect(parts[2]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifyLink(token, secret)).toEqual(claims);
    expect(verifyLink(token, secret, claims)).toEqual(claims);
  });

  it('rejects a tampered signature, generation and combat id', () => {
    const token = signLink(claims, secret);
    const [combatId, generation, hmac] = token.split('.') as [string, string, string];
    const flipped = `${hmac.slice(0, -1)}${hmac.endsWith('A') ? 'B' : 'A'}`;
    expect(verifyLink(`${combatId}.${generation}.${flipped}`, secret)).toBeNull();
    expect(verifyLink(`${combatId}.4.${hmac}`, secret)).toBeNull();
    expect(verifyLink(`${ulidAt(1)}.${generation}.${hmac}`, secret)).toBeNull();
    expect(verifyLink(`${combatId}.03.${hmac}`, secret)).toBeNull();
    expect(verifyLink(token, 'another-secret')).toBeNull();
    expect(verifyLink('not-a-token', secret)).toBeNull();
    expect(verifyLink(`${combatId}.${generation}`, secret)).toBeNull();
  });

  it('rejects an older generation than the current one', () => {
    const stale = signLink({ combatId: COMBAT_ID, generation: 2 }, secret);
    expect(verifyLink(stale, secret)).toEqual({ combatId: COMBAT_ID, generation: 2 });
    expect(verifyLink(stale, secret, claims)).toBeNull();
    expect(verifyLink(stale, secret, { combatId: ulidAt(1), generation: 2 })).toBeNull();
  });
});

describe('link routes', () => {
  let opened: TestApp;
  let dm: ReturnType<typeof withUser>;
  let stranger: ReturnType<typeof withUser>;

  const claim = (playerId: string, unitId: string, displayName: string, version: number) =>
    dispatch(opened.db, {
      combatId: COMBAT_ID,
      viewer: { kind: 'player', playerId },
      action: { id: ulidAt(800 + version), version, type: 'claimUnit', unitId, displayName },
      now: NOW,
    });

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
    const actions: Action[] = [
      addUnitAction(ulidAt(710), 1, HERO_ID, 'Ada', 'hero'),
      addUnitAction(ulidAt(711), 2, SECOND_HERO, 'Bram', 'hero'),
      addUnitAction(ulidAt(712), 3, ulidAt(702), 'Goblin', 'enemy'),
    ];
    for (const action of actions) {
      expect((await call(dm, 'POST', `/combats/${COMBAT_ID}/actions`, action)).status).toBe(200);
    }
    expect(claim(PLAYER_ID, HERO_ID, 'Ada', 4)).toMatchObject({ ok: true, version: 5 });
    expect(claim(SECOND_PLAYER, SECOND_HERO, 'Bram', 5)).toMatchObject({ ok: true, version: 6 });
  });

  afterAll(() => {
    opened.close();
  });

  it('GET /combats/:id/link returns the signed token of the current generation', async () => {
    const response = await call(dm, 'GET', `/combats/${COMBAT_ID}/link`);
    expect(response.status).toBe(200);
    const link = playerLinkSchema.parse(await response.json());
    expect(link.generation).toBe(0);
    expect(link.token).toBe(signLink({ combatId: COMBAT_ID, generation: 0 }, secret));
    expect(verifyLink(link.token, secret)).toEqual({ combatId: COMBAT_ID, generation: 0 });
  });

  it('GET /combats/:id/link answers 404 for a combat of another user', async () => {
    expect((await call(stranger, 'GET', `/combats/${COMBAT_ID}/link`)).status).toBe(404);
  });

  it('POST /combats/:id/link/reissue answers 404 for a combat of another user', async () => {
    const response = await call(stranger, 'POST', `/combats/${COMBAT_ID}/link/reissue`);
    expect(response.status).toBe(404);
    expect((await fetchCombat(dm)).linkGeneration).toBe(0);
  });

  it('reissue bumps the generation, releases every claim, empties the undo stack and broadcasts', async () => {
    const before = await fetchCombat(dm);
    expect(before.units.filter((unit) => unit.claimedBy !== null)).toHaveLength(2);
    const dmStream = listen({ kind: 'dm' });
    const playerStream = listen({ kind: 'player', playerId: PLAYER_ID });
    const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/link/reissue`);
    dmStream.unsubscribe();
    playerStream.unsubscribe();
    expect(response.status).toBe(200);
    const result = linkReissueResultSchema.parse(await response.json());
    const after = await fetchCombat(dm);
    expect(after.linkGeneration).toBe(1);
    expect(after.version).toBe(before.version + 3);
    expect(result.generation).toBe(after.linkGeneration);
    expect(result.token).toBe(signLink({ combatId: COMBAT_ID, generation: 1 }, secret));
    expect(after.units.every((unit) => unit.claimedBy === null)).toBe(true);
    expect(after.players).toEqual(before.players);
    expect(dmStream.events).toEqual([
      { type: 'document', version: after.version, document: after },
    ]);
    expect(playerStream.events).toEqual([{ type: 'linkRevoked' }]);
    expect(after.undo).toBeNull();
    expect(
      opened.db.select().from(actionLog).where(eq(actionLog.combatId, COMBAT_ID)).all(),
    ).toEqual([]);
  });

  it('the old token no longer matches the combat after reissue', async () => {
    const combat: Combat = await fetchCombat(dm);
    const stale = signLink({ combatId: COMBAT_ID, generation: 0 }, secret);
    const current = { combatId: combat.id, generation: combat.linkGeneration };
    expect(verifyLink(stale, secret, current)).toBeNull();
    const link = playerLinkSchema.parse(
      await (await call(dm, 'GET', `/combats/${COMBAT_ID}/link`)).json(),
    );
    expect(verifyLink(link.token, secret, current)).toEqual(current);
  });

  it('reissue without claims bumps the version once and writes no log entry', async () => {
    const before = await fetchCombat(dm);
    const count = () =>
      opened.db.select().from(actionLog).where(eq(actionLog.combatId, COMBAT_ID)).all().length;
    const entries = count();
    const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/link/reissue`);
    expect(response.status).toBe(200);
    const after = await fetchCombat(dm);
    expect(after.linkGeneration).toBe(2);
    expect(after.version).toBe(before.version + 1);
    expect(count()).toBe(entries);
  });
});
