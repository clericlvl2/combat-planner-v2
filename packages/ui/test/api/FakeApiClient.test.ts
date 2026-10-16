import type { ApiEndEvent, ApiClient, ConnectionState } from '@combat-planner/api/client';
import { ApiError } from '@combat-planner/api/client';
import type { Action, Combat, PlayerCombat } from '@combat-planner/domain';
import { describe, expect, it, vi } from 'vite-plus/test';
import { FakeApiClient } from '../../src/api/FakeApiClient.ts';
import { emptyScenario, scenario } from '../../src/api/scenarios.ts';
import {
  ACTION_ID,
  COMBAT_ID,
  ENEMY_ID,
  HERO_ID,
  HIDDEN_ID,
  OTHER_PLAYER_ID,
  PLAYER_ID,
  TOKEN,
  combat,
} from './fixtures.ts';

const damage = (version: number, unitId = ENEMY_ID, id = ACTION_ID): Action => ({
  id,
  version,
  type: 'damage',
  unitId,
  amount: 7,
});

const seeded = () => new FakeApiClient({ scenario: scenario({ combats: [combat()] }) });

const watchDm = (client: ApiClient) => {
  const documents: Combat[] = [];
  const ended: ApiEndEvent[] = [];
  client.combats.subscribe(
    COMBAT_ID,
    (document) => documents.push(document),
    (event) => ended.push(event),
  );
  return { documents, ended };
};

const watchPlayer = (client: ApiClient, token = TOKEN, playerId = PLAYER_ID) => {
  const documents: PlayerCombat[] = [];
  const ended: ApiEndEvent[] = [];
  client.play.subscribe(
    token,
    playerId,
    (document) => documents.push(document),
    (event) => ended.push(event),
  );
  return { documents, ended };
};

describe('FakeApiClient dispatch', () => {
  it('applies the action and pushes the projected document to every subscriber', async () => {
    const client = seeded();
    const dm = watchDm(client);
    const player = watchPlayer(client);
    expect(dm.documents.map((document) => document.version)).toEqual([1]);
    expect(player.documents.map((document) => document.version)).toEqual([1]);

    await expect(client.combats.dispatch(COMBAT_ID, damage(1))).resolves.toEqual({ version: 2 });

    expect(dm.documents.at(-1)?.units.find((unit) => unit.id === ENEMY_ID)?.hp).toBe(23);
    const enemy = player.documents.at(-1)?.units.find((unit) => unit.id === ENEMY_ID);
    expect(enemy?.healthStatus).toBe('wounded');
    expect(player.documents.at(-1)?.version).toBe(2);
  });

  it('accepts a player action on an own hero through play.dispatch', async () => {
    const client = seeded();
    const dm = watchDm(client);
    await expect(client.play.dispatch(TOKEN, PLAYER_ID, damage(1, HERO_ID))).resolves.toEqual({
      version: 2,
    });
    expect(dm.documents.at(-1)?.units.find((unit) => unit.id === HERO_ID)?.hp).toBe(23);
  });

  it('answers a repeated action id with the earlier version and applies it once', async () => {
    const client = seeded();
    const dm = watchDm(client);
    await client.combats.dispatch(COMBAT_ID, damage(1));
    await expect(client.combats.dispatch(COMBAT_ID, damage(1))).resolves.toEqual({ version: 2 });
    expect(dm.documents).toHaveLength(2);
  });

  it.each([
    ['a stale version', () => damage(5), PLAYER_ID, 'version', 409],
    ['an enemy action from a player', () => damage(1), PLAYER_ID, 'forbidden', 403],
    [
      'an action on a hero of another player',
      () => damage(1, HERO_ID),
      OTHER_PLAYER_ID,
      'forbidden',
      403,
    ],
  ] as const)('rejects %s', async (_label, action, playerId, code, status) => {
    const client = seeded();
    const player = watchPlayer(client);
    const failure = client.play.dispatch(TOKEN, playerId, action());
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ code, status });
    expect(player.documents).toHaveLength(1);
  });

  it('rejects an unknown combat with 404 and a revoked token with 410', async () => {
    const client = seeded();
    await expect(
      client.combats.dispatch('01ARZ3NDEKTSV4RRFFQ69G5FZZ', damage(1)),
    ).rejects.toMatchObject({
      code: 'notFound',
      status: 404,
    });
    await client.link.reissue(COMBAT_ID);
    await expect(client.play.dispatch(TOKEN, PLAYER_ID, damage(2, HERO_ID))).rejects.toMatchObject({
      code: 'linkRevoked',
      status: 410,
    });
  });

  it('rejects DM calls without a session', async () => {
    const client = new FakeApiClient({
      scenario: scenario({ session: null, combats: [combat()] }),
    });
    await expect(client.combats.list()).rejects.toMatchObject({
      code: 'unauthorized',
      status: 401,
    });
  });
});

describe('FakeApiClient projection', () => {
  it('never hands a player a field the domain hides', async () => {
    const client = seeded();
    const player = watchPlayer(client);
    await client.combats.dispatch(COMBAT_ID, damage(1));
    const view = await client.play.get(TOKEN, PLAYER_ID);
    for (const document of [...player.documents, view.combat]) {
      const serialized = JSON.stringify(document);
      expect(serialized).not.toContain('enemy secret plan');
      expect(serialized).not.toContain(HIDDEN_ID);
      const enemy = document.units.find((unit) => unit.id === ENEMY_ID);
      expect(enemy).toBeDefined();
      expect(enemy).not.toHaveProperty('hp');
      expect(enemy).not.toHaveProperty('ac');
      expect(enemy).not.toHaveProperty('note');
      expect(document).not.toHaveProperty('linkGeneration');
      expect(document.units.find((unit) => unit.id === HERO_ID)?.note).toBe('hero private note');
    }
  });

  it('hides the own-hero note from another player', async () => {
    const client = seeded();
    const other = watchPlayer(client, TOKEN, OTHER_PLAYER_ID);
    expect(JSON.stringify(other.documents)).not.toContain('hero private note');
  });
});

describe('FakeApiClient final events', () => {
  it('remove ends DM and player subscribers with deleted and the title', async () => {
    const client = seeded();
    const dm = watchDm(client);
    const player = watchPlayer(client);
    await client.combats.remove(COMBAT_ID);
    const deleted = { type: 'deleted', title: 'Засада гоблинов' };
    expect(dm.ended).toEqual([deleted]);
    expect(player.ended).toEqual([deleted]);
    await expect(client.combats.get(COMBAT_ID)).rejects.toMatchObject({ code: 'notFound' });
    await client.combats.update(COMBAT_ID, { title: 'x' }).catch(() => {});
    expect(dm.documents).toHaveLength(1);
  });

  it('reissue ends player subscribers with linkRevoked and releases every claim', async () => {
    const client = seeded();
    const dm = watchDm(client);
    const player = watchPlayer(client);
    const { token, version } = await client.link.reissue(COMBAT_ID);
    expect(player.ended).toEqual([{ type: 'linkRevoked' }]);
    expect(dm.ended).toEqual([]);
    const latest = dm.documents.at(-1);
    expect(latest?.version).toBe(version);
    expect(latest?.linkGeneration).toBe(1);
    expect(latest?.units.every((unit) => unit.claimedBy === null)).toBe(true);
    expect(token).not.toBe(TOKEN);
    await expect(client.play.get(TOKEN, PLAYER_ID)).rejects.toMatchObject({ code: 'linkRevoked' });
    await expect(client.play.get(token, PLAYER_ID)).resolves.toMatchObject({ combatId: COMBAT_ID });
    expect(watchPlayer(client).ended).toEqual([{ type: 'linkRevoked' }]);
  });
});

describe('FakeApiClient test controls', () => {
  it('failNext rejects only the next call and leaves the state unchanged', async () => {
    const client = seeded();
    const dm = watchDm(client);
    client.failNext('network');
    const failure = client.combats.dispatch(COMBAT_ID, damage(1));
    await expect(failure).rejects.toMatchObject({ code: 'network', status: 0, retryable: true });
    expect(dm.documents).toHaveLength(1);
    await expect(client.combats.dispatch(COMBAT_ID, damage(1))).resolves.toEqual({ version: 2 });
    client.failNext('version');
    await expect(client.combats.list()).rejects.toMatchObject({ code: 'version', status: 409 });
  });

  it('setConnection notifies subscribers and changes state()', () => {
    const client = new FakeApiClient({ scenario: scenario({ connection: 'offline' }) });
    const states: ConnectionState[] = [];
    const unsubscribe = client.connection.subscribe((state) => states.push(state));
    expect(client.connection.state()).toBe('offline');
    client.setConnection('connected');
    client.setConnection('reconnecting');
    client.setConnection('reconnecting');
    unsubscribe();
    client.setConnection('connected');
    expect(states).toEqual(['connected', 'reconnecting']);
    expect(client.connection.state()).toBe('connected');
  });

  it('records every call with its arguments in order', async () => {
    const client = seeded();
    await client.combats.list();
    await client.combats.dispatch(COMBAT_ID, damage(1));
    expect(client.calls).toEqual([
      { method: 'combats.list', args: [] },
      { method: 'combats.dispatch', args: [COMBAT_ID, damage(1)] },
    ]);
  });

  it('delay 0 resolves in the same macrotask', async () => {
    const client = new FakeApiClient({ scenario: emptyScenario, delay: 0 });
    const order: string[] = [];
    setTimeout(() => order.push('timer'), 0);
    await client.combats.list();
    order.push('resolved');
    expect(order).toEqual(['resolved']);
  });

  it('a positive delay resolves after the timer', async () => {
    vi.useFakeTimers();
    try {
      const client = new FakeApiClient({ scenario: emptyScenario, delay: 300 });
      const resolved = vi.fn();
      void client.settings.get().then(resolved);
      await vi.advanceTimersByTimeAsync(299);
      expect(resolved).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(resolved).toHaveBeenCalledWith({ language: 'en' });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('FakeApiClient REST groups', () => {
  it('signs in with a seeded account and rejects wrong credentials', async () => {
    const client = new FakeApiClient({ scenario: scenario({ session: null }) });
    await expect(
      client.auth.signIn({ email: 'dm@example.com', password: 'wrong password' }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(
      client.auth.signIn({ email: 'dm@example.com', password: 'correct horse battery' }),
    ).resolves.toMatchObject({ email: 'dm@example.com' });
    await expect(client.auth.session()).resolves.toMatchObject({ email: 'dm@example.com' });
  });

  it('lists the configured providers and returns a sign-in URL only for them', async () => {
    const client = new FakeApiClient({ scenario: scenario({ providers: ['github'] }) });
    await expect(client.auth.providers()).resolves.toEqual(['github']);
    await expect(client.auth.socialSignIn('github', '/combats')).resolves.toMatchObject({
      url: expect.stringContaining('github'),
    });
    await expect(client.auth.socialSignIn('google', '/combats')).rejects.toMatchObject({
      code: 'notFound',
    });
  });

  it('duplicates a preset on top with a numbered name', async () => {
    const client = new FakeApiClient({ scenario: emptyScenario });
    const preset = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FD0',
      name: 'Goblin',
      role: 'enemy' as const,
      maxHp: 10,
      ac: 13,
      pd: 11,
      md: 10,
      initiativeBonus: 1,
      tags: [],
    };
    await client.presets.create(preset);
    await client.presets.duplicate(preset.id, '01ARZ3NDEKTSV4RRFFQ69G5FD1');
    const list = await client.presets.list();
    expect(list.map((item) => item.name)).toEqual(['Goblin 2', 'Goblin']);
  });

  it('rejects a tag whose name differs only in case', async () => {
    const client = new FakeApiClient({ scenario: emptyScenario });
    await client.tags.create({ id: '01ARZ3NDEKTSV4RRFFQ69G5FE0', name: 'Undead' });
    await expect(
      client.tags.create({ id: '01ARZ3NDEKTSV4RRFFQ69G5FE1', name: 'undead' }),
    ).rejects.toMatchObject({ code: 'invalid', status: 422 });
  });

  it('settings.update changes the session language', async () => {
    const client = new FakeApiClient({ scenario: emptyScenario });
    await client.settings.update({ language: 'ja' });
    await expect(client.auth.session()).resolves.toMatchObject({ language: 'ja' });
  });

  it('account.remove ends the DM streams and signs out', async () => {
    const client = seeded();
    const dm = watchDm(client);
    await client.account.remove();
    expect(dm.ended).toEqual([{ type: 'deleted', title: 'Засада гоблинов' }]);
    await expect(client.auth.session()).resolves.toBeNull();
  });
});
