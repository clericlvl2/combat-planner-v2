import type { Combat } from '@combat-planner/domain';
import { combatSchema } from '@combat-planner/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import type { ApiEvent } from '../src/client.ts';
import { combatSummarySchema } from '../src/client.ts';
import { combats } from '../src/db/schema.ts';
import { subscribe, subscriberCount } from '../src/live/registry.ts';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
  OTHER_DM,
  PLAYER_ID,
  call,
  combatInput,
  createTestApp,
  fetchCombat,
  ulidAt,
  withUser,
} from './helpers.ts';

const SECOND_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAX';
const COPY_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAY';

let opened: TestApp;
let dm: ReturnType<typeof withUser>;
let stranger: ReturnType<typeof withUser>;

beforeAll(() => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  stranger = withUser(opened.app, OTHER_DM);
});

afterAll(() => {
  opened.close();
});

const listen = (combatId: string, kind: 'dm' | 'player' = 'dm') => {
  const events: ApiEvent[] = [];
  const unsubscribe = subscribe(combatId, {
    viewer: kind === 'dm' ? { kind } : { kind, playerId: PLAYER_ID },
    send: (event) => {
      events.push(event);
    },
  });
  return { events, unsubscribe };
};

describe('requireUser', () => {
  it('answers 401 without a session or an auth instance', async () => {
    const response = await opened.app.request('/combats');
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: 'unauthorized', message: 'Sign in first' });
  });

  it('resolves the user through the auth instance when present', async () => {
    const seen: Headers[] = [];
    const authed = createTestApp({
      auth: {
        api: {
          getSession: async ({ headers }) => {
            seen.push(headers);
            return headers.get('cookie') === 'session=dm' ? { user: { id: DM } } : null;
          },
        },
      },
    });
    try {
      const anonymous = await authed.app.request('/combats');
      expect(anonymous.status).toBe(401);
      const signedIn = await authed.app.request('/combats', { headers: { cookie: 'session=dm' } });
      expect(signedIn.status).toBe(200);
      expect(await signedIn.json()).toEqual([]);
      expect(seen).toHaveLength(2);
    } finally {
      authed.close();
    }
  });
});

describe('POST /combats', () => {
  it('creates the combat at version 1 and stores the row columns', async () => {
    const response = await call(dm, 'POST', '/combats', combatInput());
    expect(response.status).toBe(200);
    const combat = combatSchema.parse(await response.json());
    expect(combat).toMatchObject({
      id: COMBAT_ID,
      title: 'Goblin ambush',
      description: 'Road to Shadowfall',
      color: 3,
      status: 'setup',
      version: 1,
      linkGeneration: 0,
      units: [],
      players: {},
      lastPlayedAt: null,
    });
    const row = opened.db.select().from(combats).where(eq(combats.id, COMBAT_ID)).get();
    expect(row).toMatchObject({ ownerId: DM, version: 1, title: 'Goblin ambush', color: 3 });
  });

  it('returns the stored combat again for a known id of the same DM', async () => {
    const response = await call(dm, 'POST', '/combats', { ...combatInput(), title: 'Other' });
    expect(response.status).toBe(200);
    expect(combatSchema.parse(await response.json()).title).toBe('Goblin ambush');
  });

  it('rejects an id that belongs to another DM with 422', async () => {
    const response = await call(stranger, 'POST', '/combats', combatInput());
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'invalid' });
  });

  it('rejects an invalid body with 400', async () => {
    const response = await call(dm, 'POST', '/combats', { ...combatInput(SECOND_ID), title: '' });
    expect(response.status).toBe(400);
  });
});

describe('GET /combats', () => {
  it('lists summaries of the DM only', async () => {
    const created = await call(dm, 'POST', '/combats', {
      ...combatInput(SECOND_ID),
      title: 'Lair',
    });
    expect(created.status).toBe(200);
    const response = await call(dm, 'GET', '/combats');
    expect(response.status).toBe(200);
    const summaries = combatSummarySchema.array().parse(await response.json());
    expect(summaries.map((summary) => summary.id).sort()).toEqual([COMBAT_ID, SECOND_ID]);
    expect(summaries.find((summary) => summary.id === COMBAT_ID)).toEqual({
      id: COMBAT_ID,
      title: 'Goblin ambush',
      description: 'Road to Shadowfall',
      color: 3,
      status: 'setup',
      unitCount: 0,
      lastPlayedAt: null,
      updatedAt: expect.any(String),
    });
    const foreign = await call(stranger, 'GET', '/combats');
    expect(await foreign.json()).toEqual([]);
  });
});

describe('GET /combats/:id', () => {
  it('returns the DM document', async () => {
    const response = await call(dm, 'GET', `/combats/${COMBAT_ID}`);
    expect(response.status).toBe(200);
    expect(combatSchema.parse(await response.json()).id).toBe(COMBAT_ID);
  });

  it('answers 404 for a combat of another user', async () => {
    const response = await call(stranger, 'GET', `/combats/${COMBAT_ID}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'notFound', message: 'Combat not found' });
  });
});

describe('PATCH /combats/:id', () => {
  it('updates title, description and color, bumps the version and broadcasts', async () => {
    const { events, unsubscribe } = listen(COMBAT_ID);
    const response = await call(dm, 'PATCH', `/combats/${COMBAT_ID}`, {
      title: 'Ambush',
      color: 5,
    });
    unsubscribe();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 2 });
    const combat = await fetchCombat(dm);
    expect(combat).toMatchObject({
      title: 'Ambush',
      description: 'Road to Shadowfall',
      color: 5,
      version: 2,
    });
    expect(events).toEqual([{ type: 'document', version: 2, document: combat }]);
  });

  it('answers 404 for a combat of another user', async () => {
    const response = await call(stranger, 'PATCH', `/combats/${COMBAT_ID}`, { title: 'Mine' });
    expect(response.status).toBe(404);
  });

  it('rejects a title over the limit with 400', async () => {
    const response = await call(dm, 'PATCH', `/combats/${COMBAT_ID}`, { title: 'x'.repeat(81) });
    expect(response.status).toBe(400);
  });
});

describe('POST /combats/:id/open', () => {
  it('sets lastPlayedAt, bumps the version and returns the document', async () => {
    const { events, unsubscribe } = listen(COMBAT_ID);
    const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/open`);
    unsubscribe();
    expect(response.status).toBe(200);
    const combat = combatSchema.parse(await response.json());
    expect(combat.lastPlayedAt).toEqual(expect.any(String));
    expect(combat.version).toBe(3);
    expect(events).toEqual([{ type: 'document', version: 3, document: combat }]);
    const summaries = combatSummarySchema
      .array()
      .parse(await (await call(dm, 'GET', '/combats')).json());
    expect(summaries.find((summary) => summary.id === COMBAT_ID)?.lastPlayedAt).toBe(
      combat.lastPlayedAt,
    );
  });

  it('answers 404 for a combat of another user', async () => {
    const response = await call(stranger, 'POST', `/combats/${COMBAT_ID}/open`);
    expect(response.status).toBe(404);
  });
});

describe('POST /combats/:id/duplicate', () => {
  it('copies the combat through copyCombat under the new id', async () => {
    const source = await fetchCombat(dm);
    const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/duplicate`, { id: COPY_ID });
    expect(response.status).toBe(200);
    const copy = combatSchema.parse(await response.json());
    expect(copy).toMatchObject({
      id: COPY_ID,
      title: 'Ambush (copy)',
      description: source.description,
      color: source.color,
      status: 'setup',
      lastPlayedAt: null,
      linkGeneration: 0,
      players: {},
    });
    expect(copy.createdAt).not.toBe(source.createdAt);
    const stored = await fetchCombat(dm, COPY_ID);
    expect(stored).toEqual(copy);
  });

  it('answers 404 for a combat of another user', async () => {
    const response = await call(stranger, 'POST', `/combats/${COMBAT_ID}/duplicate`, {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAZ',
    });
    expect(response.status).toBe(404);
  });

  it('rejects a malformed new id with 400', async () => {
    const response = await call(dm, 'POST', `/combats/${COMBAT_ID}/duplicate`, { id: 'copy' });
    expect(response.status).toBe(400);
  });
});

describe('DELETE /combats/:id', () => {
  it('answers 404 for a combat of another user and keeps the row', async () => {
    const response = await call(stranger, 'DELETE', `/combats/${COPY_ID}`);
    expect(response.status).toBe(404);
    expect((await call(dm, 'GET', `/combats/${COPY_ID}`)).status).toBe(200);
  });

  it('hard-deletes the combat and sends deleted with the title to every subscriber', async () => {
    const dmStream = listen(COPY_ID, 'dm');
    const playerStream = listen(COPY_ID, 'player');
    const response = await call(dm, 'DELETE', `/combats/${COPY_ID}`);
    dmStream.unsubscribe();
    playerStream.unsubscribe();
    expect(response.status).toBe(204);
    expect(dmStream.events).toEqual([{ type: 'deleted', title: 'Ambush (copy)' }]);
    expect(playerStream.events).toEqual([{ type: 'deleted', title: 'Ambush (copy)' }]);
    expect(subscriberCount(COPY_ID)).toBe(0);
    expect(opened.db.select().from(combats).where(eq(combats.id, COPY_ID)).get()).toBeUndefined();
    expect((await call(dm, 'GET', `/combats/${COPY_ID}`)).status).toBe(404);
  });
});

describe('combat limit', () => {
  it('rejects the 101st combat and its duplicate with 422 limit', async () => {
    const limited = createTestApp();
    const owner = withUser(limited.app, DM);
    try {
      const ids = Array.from({ length: 100 }, (_, index) => ulidAt(index + 100));
      for (const id of ids) {
        expect((await call(owner, 'POST', '/combats', combatInput(id))).status).toBe(200);
      }
      const extra = await call(
        owner,
        'POST',
        '/combats',
        combatInput('01ARZ3NDEKTSV4RRFFQ69G5ZZZ'),
      );
      expect(extra.status).toBe(422);
      expect(await extra.json()).toMatchObject({ code: 'limit' });
      const copy = await call(owner, 'POST', `/combats/${ids[0]}/duplicate`, {
        id: '01ARZ3NDEKTSV4RRFFQ69G5ZZY',
      });
      expect(copy.status).toBe(422);
      const summaries: Combat[] = await (await call(owner, 'GET', '/combats')).json();
      expect(summaries).toHaveLength(100);
    } finally {
      limited.close();
    }
  });
});
