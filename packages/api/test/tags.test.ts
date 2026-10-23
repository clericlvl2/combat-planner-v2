import type { Tag } from '@combat-planner/domain';
import { LIMITS, presetSchema, tagSchema } from '@combat-planner/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { presetTags, tags } from '../src/db/schema.ts';
import type { Requester, TestApp } from './helpers.ts';
import { DM, OTHER_DM, call, createTestApp, ulidAt, withUser } from './helpers.ts';

const BOSS_ID = '01ARZ3NDEKTSV4RRFFQ69G5TB0';
const UNDEAD_ID = '01ARZ3NDEKTSV4RRFFQ69G5TB1';
const DRAGON_ID = '01ARZ3NDEKTSV4RRFFQ69G5TB2';
const FOREIGN_ID = '01ARZ3NDEKTSV4RRFFQ69G5TB3';
const SPARE_ID = '01ARZ3NDEKTSV4RRFFQ69G5TB4';
const PRESET_ID = '01ARZ3NDEKTSV4RRFFQ69G5TC0';
const MAX_NAME = 'Ancient red dragon lairs';

let opened: TestApp;
let dm: Requester;
let stranger: Requester;

beforeAll(() => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  stranger = withUser(opened.app, OTHER_DM);
});

afterAll(() => {
  opened.close();
});

const list = async (app: Requester): Promise<Tag[]> =>
  tagSchema.array().parse(await (await call(app, 'GET', '/tags')).json());

const create = (app: Requester, id: string, name: string) =>
  call(app, 'POST', '/tags', { id, name });

describe('POST /tags', () => {
  it('creates the tag with the trimmed name', async () => {
    const response = await create(dm, BOSS_ID, '  Boss  ');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: BOSS_ID, name: 'Boss' });
    const row = opened.db.select().from(tags).where(eq(tags.id, BOSS_ID)).get();
    expect(row).toEqual({ id: BOSS_ID, ownerId: DM, name: 'Boss', nameLower: 'boss' });
  });

  it('accepts a name of exactly 24 characters after trimming', async () => {
    expect(MAX_NAME).toHaveLength(24);
    const response = await create(dm, DRAGON_ID, ` ${MAX_NAME} `);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: DRAGON_ID, name: MAX_NAME });
  });

  it('rejects a name of 25 characters with 400', async () => {
    const response = await create(dm, SPARE_ID, `${MAX_NAME}s`);
    expect(response.status).toBe(400);
    expect(opened.db.select().from(tags).where(eq(tags.id, SPARE_ID)).get()).toBeUndefined();
  });

  it('rejects a blank name with 400', async () => {
    const response = await create(dm, SPARE_ID, '   ');
    expect(response.status).toBe(400);
  });

  it('rejects a name that matches an existing tag case-insensitively with 409', async () => {
    const response = await create(dm, SPARE_ID, ' BOSS ');
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'invalid' });
    expect(opened.db.select().from(tags).where(eq(tags.id, SPARE_ID)).get()).toBeUndefined();
  });

  it('lets another DM use the same name', async () => {
    const response = await create(stranger, FOREIGN_ID, 'boss');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: FOREIGN_ID, name: 'boss' });
  });

  it('returns the stored tag again for a known id of the same DM', async () => {
    const response = await create(dm, BOSS_ID, 'Boss');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: BOSS_ID, name: 'Boss' });
  });

  it('rejects an id that belongs to another DM with 422', async () => {
    const response = await create(dm, FOREIGN_ID, 'Minion');
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'invalid' });
  });

  it('rejects a malformed id with 400', async () => {
    const response = await create(dm, 'tag-1', 'Minion');
    expect(response.status).toBe(400);
  });
});

describe('GET /tags', () => {
  it('lists only the tags of the DM, ordered by name', async () => {
    expect((await create(dm, UNDEAD_ID, 'undead')).status).toBe(200);
    expect(await list(dm)).toEqual([
      { id: DRAGON_ID, name: MAX_NAME },
      { id: BOSS_ID, name: 'Boss' },
      { id: UNDEAD_ID, name: 'undead' },
    ]);
    expect(await list(stranger)).toEqual([{ id: FOREIGN_ID, name: 'boss' }]);
  });
});

describe('PATCH /tags/:id', () => {
  it('renames the tag with the trimmed name', async () => {
    const response = await call(dm, 'PATCH', `/tags/${UNDEAD_ID}`, { name: ' Undead horde ' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: UNDEAD_ID, name: 'Undead horde' });
    const row = opened.db.select().from(tags).where(eq(tags.id, UNDEAD_ID)).get();
    expect(row?.nameLower).toBe('undead horde');
  });

  it('changes only the case of its own name', async () => {
    const response = await call(dm, 'PATCH', `/tags/${UNDEAD_ID}`, { name: 'UNDEAD HORDE' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: UNDEAD_ID, name: 'UNDEAD HORDE' });
  });

  it('rejects the name of another tag of the DM with 409', async () => {
    const response = await call(dm, 'PATCH', `/tags/${UNDEAD_ID}`, { name: 'boss' });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'invalid' });
    expect(opened.db.select().from(tags).where(eq(tags.id, UNDEAD_ID)).get()?.name).toBe(
      'UNDEAD HORDE',
    );
  });

  it('rejects a name of 25 characters with 400', async () => {
    const response = await call(dm, 'PATCH', `/tags/${UNDEAD_ID}`, { name: `${MAX_NAME}s` });
    expect(response.status).toBe(400);
  });

  it('answers 404 for a tag of another user', async () => {
    const response = await call(stranger, 'PATCH', `/tags/${BOSS_ID}`, { name: 'Mine' });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'notFound', message: 'Tag not found' });
  });
});

describe('DELETE /tags/:id', () => {
  it('answers 404 for a tag of another user and keeps the row', async () => {
    const response = await call(stranger, 'DELETE', `/tags/${BOSS_ID}`);
    expect(response.status).toBe(404);
    expect(opened.db.select().from(tags).where(eq(tags.id, BOSS_ID)).get()).toBeDefined();
  });

  it('removes the tag and its preset links and keeps the presets', async () => {
    const created = await call(dm, 'POST', '/presets', {
      id: PRESET_ID,
      name: 'Lich',
      role: 'enemy',
      maxHp: 120,
      ac: 18,
      pd: 15,
      md: 20,
      initiativeBonus: 4,
      tags: [BOSS_ID, UNDEAD_ID],
    });
    expect(created.status).toBe(200);
    const response = await call(dm, 'DELETE', `/tags/${BOSS_ID}`);
    expect(response.status).toBe(204);
    expect(opened.db.select().from(tags).where(eq(tags.id, BOSS_ID)).get()).toBeUndefined();
    expect(opened.db.select().from(presetTags).where(eq(presetTags.tagId, BOSS_ID)).all()).toEqual(
      [],
    );
    const presets = presetSchema.array().parse(await (await call(dm, 'GET', '/presets')).json());
    expect(presets.map((preset) => [preset.id, preset.tags])).toEqual([[PRESET_ID, [UNDEAD_ID]]]);
    expect((await list(dm)).map((tag) => tag.id)).toEqual([DRAGON_ID, UNDEAD_ID]);
  });

  it('frees the name for a new tag', async () => {
    const response = await create(dm, SPARE_ID, 'Boss');
    expect(response.status).toBe(200);
  });
});

describe('tag limit', () => {
  it('refuses the 26th tag of a DM with the limit error and keeps a known id', async () => {
    const limited = createTestApp();
    const owner = withUser(limited.app, DM);
    for (let index = 0; index < LIMITS.tagsPerDm; index += 1) {
      expect((await create(owner, ulidAt(index), `Tag ${index}`)).status).toBe(200);
    }
    const refused = await create(owner, ulidAt(LIMITS.tagsPerDm), 'One more');
    expect(refused.status).toBe(422);
    expect(await refused.json()).toEqual({
      code: 'limit',
      message: `A DM keeps at most ${LIMITS.tagsPerDm} tags`,
    });
    expect(await list(owner)).toHaveLength(LIMITS.tagsPerDm);
    expect((await create(owner, ulidAt(0), 'Tag 0')).status).toBe(200);
    expect((await create(withUser(limited.app, OTHER_DM), ulidAt(99), 'Boss')).status).toBe(200);
    limited.close();
  });
});
