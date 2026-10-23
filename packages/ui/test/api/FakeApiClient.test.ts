import type { ApiEndEvent, ApiClient, ConnectionState, DmCombat } from '@combat-planner/api/client';
import { ApiError } from '@combat-planner/api/client';
import type { Action, PlayerCombat, Preset } from '@combat-planner/domain';
import { LIMITS } from '@combat-planner/domain';
import { describe, expect, it, vi } from 'vite-plus/test';
import { FakeApiClient } from '../../src/api/FakeApiClient.ts';
import { emptyScenario, scenario } from '../../src/api/scenarios.ts';
import {
  ACTION_ID,
  COMBAT_ID,
  ENEMY_ID,
  HERO_ID,
  HIDDEN_ID,
  NOW,
  OTHER_PLAYER_ID,
  PLAYER_ID,
  TOKEN,
  combat,
  unit,
} from './fixtures.ts';

const damage = (version: number, unitId = ENEMY_ID, id = ACTION_ID): Action => ({
  id,
  version,
  type: 'damage',
  unitId,
  amount: 7,
});

const seeded = () =>
  new FakeApiClient({ scenario: scenario({ combats: [combat()], playerId: PLAYER_ID }) });

const watchDm = (client: ApiClient) => {
  const documents: DmCombat[] = [];
  const ended: ApiEndEvent[] = [];
  client.combats.subscribe(
    COMBAT_ID,
    (document) => documents.push(document),
    (event) => ended.push(event),
  );
  return { documents, ended };
};

const watchPlayer = (client: FakeApiClient, token = TOKEN, playerId = PLAYER_ID) => {
  const documents: PlayerCombat[] = [];
  const ended: ApiEndEvent[] = [];
  client.playAs(playerId).subscribe(
    token,
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
    await expect(client.play.dispatch(TOKEN, damage(1, HERO_ID))).resolves.toEqual({
      version: 2,
    });
    expect(dm.documents.at(-1)?.units.find((unit) => unit.id === HERO_ID)?.hp).toBe(23);
  });

  it('refuses a retried action with version and applies it once', async () => {
    const client = seeded();
    const dm = watchDm(client);
    await client.combats.dispatch(COMBAT_ID, damage(1));
    await expect(client.combats.dispatch(COMBAT_ID, damage(1))).rejects.toMatchObject({
      code: 'version',
    });
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
    const failure = client.playAs(playerId).dispatch(TOKEN, action());
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
    await expect(client.play.dispatch(TOKEN, damage(2, HERO_ID))).rejects.toMatchObject({
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

describe('FakeApiClient undo', () => {
  const ACTION_2 = '01ARZ3NDEKTSV4RRFFQ69G5FC1';
  const ACTION_3 = '01ARZ3NDEKTSV4RRFFQ69G5FC2';

  it('the DM document carries the newest undoable action with its unit name', async () => {
    const client = seeded();
    const dm = watchDm(client);
    expect(dm.documents[0]?.undo).toBeNull();
    await client.combats.dispatch(COMBAT_ID, damage(1));
    const undo = { action: damage(1), unitName: 'Goblin boss' };
    expect(dm.documents.at(-1)?.undo).toEqual(undo);
    await expect(client.combats.get(COMBAT_ID)).resolves.toMatchObject({ undo });
    await expect(client.combats.open(COMBAT_ID)).resolves.toMatchObject({ undo });
  });

  it('reflects a player action and gives a reopened stream the same undo', async () => {
    const client = seeded();
    await client.play.dispatch(TOKEN, damage(1, HERO_ID));
    const reopened = watchDm(client);
    expect(reopened.documents[0]?.undo).toEqual({
      action: damage(1, HERO_ID),
      unitName: 'Aria',
    });
  });

  it('is null after everything is undone, kept by a release, and never reaches a player', async () => {
    const client = seeded();
    const dm = watchDm(client);
    const player = watchPlayer(client);
    await client.combats.dispatch(COMBAT_ID, damage(1));
    await client.combats.dispatch(COMBAT_ID, { id: ACTION_2, version: 2, type: 'undo' });
    expect(dm.documents.at(-1)?.undo).toBeNull();
    await client.combats.dispatch(COMBAT_ID, damage(3, ENEMY_ID, ACTION_3));
    expect(dm.documents.at(-1)?.undo?.action.type).toBe('damage');
    await client.play.dispatch(TOKEN, {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FC3',
      version: 4,
      type: 'releaseUnit',
      unitId: HERO_ID,
    });
    expect(dm.documents.at(-1)?.undo?.action).toEqual(damage(3, ENEMY_ID, ACTION_3));
    expect(player.documents.every((document) => !('undo' in document))).toBe(true);
  });

  it('a link reissue keeps the undo', async () => {
    const client = seeded();
    const dm = watchDm(client);
    await client.combats.dispatch(COMBAT_ID, damage(1));
    await client.link.reissue(COMBAT_ID);
    const latest = dm.documents.at(-1);
    expect(latest?.units.every((unit) => unit.claimedBy === null)).toBe(true);
    expect(latest?.undo?.action).toEqual(damage(1));
  });

  it('deferBroadcasts delivers the document after the dispatch resolves', async () => {
    const client = seeded();
    const dm = watchDm(client);
    client.deferBroadcasts();
    await client.combats.dispatch(COMBAT_ID, damage(1));
    expect(dm.documents.map((document) => document.version)).toEqual([1]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dm.documents.map((document) => document.version)).toEqual([1, 2]);
    expect(dm.documents.at(-1)?.undo?.action.type).toBe('damage');
  });
});

describe('FakeApiClient projection', () => {
  it('never hands a player a field the domain hides', async () => {
    const client = seeded();
    const player = watchPlayer(client);
    await client.combats.dispatch(COMBAT_ID, damage(1));
    const view = await client.play.get(TOKEN);
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
    const { token, generation } = await client.link.reissue(COMBAT_ID);
    expect(player.ended).toEqual([{ type: 'linkRevoked' }]);
    expect(dm.ended).toEqual([]);
    const latest = dm.documents.at(-1);
    expect(generation).toBe(1);
    expect(latest?.linkGeneration).toBe(1);
    expect(latest?.units.every((unit) => unit.claimedBy === null)).toBe(true);
    expect(token).not.toBe(TOKEN);
    await expect(client.play.get(TOKEN)).rejects.toMatchObject({ code: 'linkRevoked' });
    await expect(client.play.get(token)).resolves.toMatchObject({ combatId: COMBAT_ID });
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

  it('setConnection holds documents while the stream is down and delivers the latest one on connected', async () => {
    const client = seeded();
    const dm = watchDm(client);
    const player = watchPlayer(client);
    client.setConnection('reconnecting');
    await client.combats.dispatch(COMBAT_ID, damage(1));
    await client.combats.dispatch(COMBAT_ID, damage(2, ENEMY_ID, '01ARZ3NDEKTSV4RRFFQ69G5FC1'));
    expect(dm.documents.map((document) => document.version)).toEqual([1]);
    expect(player.documents.map((document) => document.version)).toEqual([1]);
    client.setConnection('connected');
    expect(dm.documents.map((document) => document.version)).toEqual([1, 3]);
    expect(player.documents.map((document) => document.version)).toEqual([1, 3]);
    client.setConnection('offline');
    client.setConnection('connected');
    expect(dm.documents).toHaveLength(2);
  });

  it('expireSession ends every DM stream with unauthorized and leaves player streams open', async () => {
    const client = seeded();
    const dm = watchDm(client);
    const player = watchPlayer(client);
    client.expireSession();
    expect(dm.ended).toEqual([{ type: 'unauthorized' }]);
    expect(player.ended).toEqual([]);
    await expect(client.auth.session()).resolves.toBeNull();
    expect(watchDm(client).ended).toEqual([{ type: 'unauthorized' }]);
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

  it('lists summaries with the round of an active combat and the creation time', async () => {
    const active = combat({
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAZ',
      status: 'active',
      round: 4,
      createdAt: '2026-10-15T09:00:00.000Z',
    });
    const client = new FakeApiClient({ scenario: scenario({ combats: [combat(), active] }) });
    const summaries = await client.combats.list();
    expect(summaries.map(({ id, round, createdAt }) => ({ id, round, createdAt }))).toEqual([
      { id: COMBAT_ID, round: null, createdAt: NOW },
      { id: active.id, round: 4, createdAt: '2026-10-15T09:00:00.000Z' },
    ]);
  });

  it('carries the sign-in method in the session', async () => {
    const seededSession = new FakeApiClient({ scenario: emptyScenario });
    await expect(seededSession.auth.session()).resolves.toMatchObject({ method: 'email' });
    const social = new FakeApiClient({
      scenario: scenario({
        session: {
          userId: 'dm-2',
          email: 'ilse@example.com',
          displayName: 'Ilse',
          language: 'de',
          method: 'github',
        },
      }),
    });
    await expect(social.auth.session()).resolves.toMatchObject({ method: 'github' });
    const legacy = new FakeApiClient({
      scenario: scenario({
        session: { userId: 'dm-3', email: 'kai@example.com', displayName: 'Kai', language: 'en' },
      }),
    });
    await expect(legacy.auth.session()).resolves.toMatchObject({ method: 'email' });
    await social.auth.signOut();
    await expect(
      social.auth.signIn({ email: 'dm@example.com', password: 'correct horse battery' }),
    ).resolves.toMatchObject({ method: 'email' });
  });

  it('failNext rejects with the server status of limit and emailTaken', async () => {
    const client = new FakeApiClient({ scenario: scenario({ session: null }) });
    client.failNext('emailTaken');
    await expect(
      client.auth.signUp({ email: 'new@example.com', password: 'horse battery', displayName: 'N' }),
    ).rejects.toMatchObject({ code: 'emailTaken', status: 422 });
    client.failNext('limit');
    await expect(client.auth.providers()).rejects.toMatchObject({ code: 'limit', status: 422 });
  });

  it('answers the tag cap with limit and keeps a known tag id', async () => {
    const tags = Array.from({ length: LIMITS.tagsPerDm }, (_, index) => ({
      id: `01ARZ3NDEKTSV4RRFFQ69T${String(index).padStart(4, '0')}`,
      name: `Tag ${index}`,
    }));
    const full = new FakeApiClient({ scenario: scenario({ tags }) });
    await expect(
      full.tags.create({ id: '01ARZ3NDEKTSV4RRFFQ69T9999', name: 'One more' }),
    ).rejects.toMatchObject({
      code: 'limit',
      status: 422,
      message: `A DM keeps at most ${LIMITS.tagsPerDm} tags`,
    });
    await expect(full.tags.create(tags[0]!)).resolves.toEqual(tags[0]);
  });

  it('answers the combat, preset and unit caps with limit', async () => {
    const full = new FakeApiClient({
      scenario: scenario({
        combats: Array.from({ length: LIMITS.combatsPerDm }, (_, index) =>
          combat({ id: `01ARZ3NDEKTSV4RRFFQ69G${String(index).padStart(4, '0')}` }),
        ),
        presets: Array.from({ length: LIMITS.presetsPerDm }, (_, index): Preset => ({
          id: `01ARZ3NDEKTSV4RRFFQ69H${String(index).padStart(4, '0')}`,
          name: `Goblin ${index}`,
          role: 'enemy',
          maxHp: 10,
          ac: 13,
          pd: 11,
          md: 10,
          initiativeBonus: 1,
          tags: [],
          createdAt: NOW,
          updatedAt: NOW,
        })),
      }),
    });
    await expect(
      full.combats.duplicate('01ARZ3NDEKTSV4RRFFQ69G0000', '01ARZ3NDEKTSV4RRFFQ69J0000'),
    ).rejects.toMatchObject({ code: 'limit', status: 422 });
    await expect(
      full.presets.duplicate('01ARZ3NDEKTSV4RRFFQ69H0000', '01ARZ3NDEKTSV4RRFFQ69J0001'),
    ).rejects.toMatchObject({ code: 'limit', status: 422 });
    const crowded = new FakeApiClient({
      scenario: scenario({
        combats: [
          combat({
            units: Array.from({ length: LIMITS.unitsPerCombat }, (_, index) =>
              unit({
                id: `01ARZ3NDEKTSV4RRFFQ69K${String(index).padStart(4, '0')}`,
                name: `Orc ${index}`,
                role: 'enemy',
              }),
            ),
          }),
        ],
      }),
    });
    await expect(
      crowded.combats.dispatch(COMBAT_ID, {
        id: ACTION_ID,
        version: 1,
        type: 'duplicateUnit',
        unitId: '01ARZ3NDEKTSV4RRFFQ69K0000',
        newUnitId: '01ARZ3NDEKTSV4RRFFQ69J0002',
      }),
    ).rejects.toMatchObject({ code: 'limit', status: 422 });
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
