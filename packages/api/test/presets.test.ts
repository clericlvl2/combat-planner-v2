import type { Preset } from '@combat-planner/domain';
import { LIMITS, presetSchema } from '@combat-planner/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { presetTags, presets, tags } from '../src/db/schema.ts';
import { insertPreset } from '../src/presets/store.ts';
import type { TestApp } from './helpers.ts';
import {
  COMBAT_ID,
  DM,
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

const PRESET_ID = '01ARZ3NDEKTSV4RRFFQ69G5PA0';
const SECOND_ID = '01ARZ3NDEKTSV4RRFFQ69G5PA1';
const COPY_ID = '01ARZ3NDEKTSV4RRFFQ69G5PA2';
const UNDEAD_TAG = '01ARZ3NDEKTSV4RRFFQ69G5TA0';
const BOSS_TAG = '01ARZ3NDEKTSV4RRFFQ69G5TA1';
const FOREIGN_TAG = '01ARZ3NDEKTSV4RRFFQ69G5TA2';

let opened: TestApp;
let dm: ReturnType<typeof withUser>;
let stranger: ReturnType<typeof withUser>;

beforeAll(() => {
  opened = createTestApp();
  dm = withUser(opened.app, DM);
  stranger = withUser(opened.app, OTHER_DM);
  opened.db
    .insert(tags)
    .values([
      { id: UNDEAD_TAG, ownerId: DM, name: 'Undead', nameLower: 'undead' },
      { id: BOSS_TAG, ownerId: DM, name: 'Boss', nameLower: 'boss' },
      { id: FOREIGN_TAG, ownerId: OTHER_DM, name: 'Foreign', nameLower: 'foreign' },
    ])
    .run();
});

afterAll(() => {
  opened.close();
});

const presetInput = (id = PRESET_ID, tagIds: string[] = [BOSS_TAG, UNDEAD_TAG]) => ({
  id,
  name: 'Lich',
  role: 'enemy' as const,
  maxHp: 120,
  ac: 18,
  pd: 15,
  md: 20,
  initiativeBonus: 4,
  tags: tagIds,
});

const list = async (app: ReturnType<typeof withUser>): Promise<Preset[]> =>
  presetSchema.array().parse(await (await call(app, 'GET', '/presets')).json());

describe('POST /presets', () => {
  it('creates the preset with its tags in the given order', async () => {
    const response = await call(dm, 'POST', '/presets', presetInput());
    expect(response.status).toBe(200);
    const preset = presetSchema.parse(await response.json());
    expect(preset).toMatchObject({ ...presetInput(), createdAt: preset.updatedAt });
    const row = opened.db.select().from(presets).where(eq(presets.id, PRESET_ID)).get();
    expect(row).toMatchObject({ ownerId: DM, name: 'Lich', role: 'enemy', maxHp: 120 });
    const links = opened.db
      .select()
      .from(presetTags)
      .where(eq(presetTags.presetId, PRESET_ID))
      .all();
    expect(links.map((link) => link.tagId).sort()).toEqual([UNDEAD_TAG, BOSS_TAG].sort());
  });

  it('returns the stored preset again for a known id of the same DM', async () => {
    const response = await call(dm, 'POST', '/presets', { ...presetInput(), name: 'Other' });
    expect(response.status).toBe(200);
    expect(presetSchema.parse(await response.json()).name).toBe('Lich');
  });

  it('rejects an id that belongs to another DM with 422', async () => {
    const response = await call(stranger, 'POST', '/presets', presetInput());
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'invalid' });
  });

  it('rejects a tag of another DM with 422', async () => {
    const response = await call(dm, 'POST', '/presets', presetInput(SECOND_ID, [FOREIGN_TAG]));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'invalid' });
    expect(opened.db.select().from(presets).where(eq(presets.id, SECOND_ID)).get()).toBeUndefined();
  });

  it('rejects an invalid body with 400', async () => {
    const response = await call(dm, 'POST', '/presets', { ...presetInput(SECOND_ID), maxHp: 0 });
    expect(response.status).toBe(400);
  });
});

describe('GET /presets', () => {
  it('lists the presets of the DM newest first with their tags', async () => {
    const created = await call(dm, 'POST', '/presets', {
      ...presetInput(SECOND_ID, []),
      name: 'Skeleton',
    });
    expect(created.status).toBe(200);
    const found = await list(dm);
    expect(found.map((preset) => preset.id)).toEqual([SECOND_ID, PRESET_ID]);
    expect(found[1]?.tags).toEqual([BOSS_TAG, UNDEAD_TAG]);
    expect(found[0]?.tags).toEqual([]);
    expect(await list(stranger)).toEqual([]);
  });
});

describe('PATCH /presets/:id', () => {
  it('updates the fields, replaces the tags and bumps updatedAt', async () => {
    const before = (await list(dm)).find((preset) => preset.id === PRESET_ID);
    const response = await call(dm, 'PATCH', `/presets/${PRESET_ID}`, {
      name: 'Lich king',
      ac: 19,
      tags: [UNDEAD_TAG],
    });
    expect(response.status).toBe(200);
    const preset = presetSchema.parse(await response.json());
    expect(preset).toMatchObject({ name: 'Lich king', ac: 19, pd: 15, tags: [UNDEAD_TAG] });
    expect(preset.createdAt).toBe(before?.createdAt);
    expect(preset.updatedAt >= preset.createdAt).toBe(true);
    const links = opened.db
      .select()
      .from(presetTags)
      .where(eq(presetTags.presetId, PRESET_ID))
      .all();
    expect(links).toEqual([{ presetId: PRESET_ID, tagId: UNDEAD_TAG }]);
  });

  it('rejects a tag of another DM with 422', async () => {
    const response = await call(dm, 'PATCH', `/presets/${PRESET_ID}`, { tags: [FOREIGN_TAG] });
    expect(response.status).toBe(422);
  });

  it('answers 404 for a preset of another user', async () => {
    const response = await call(stranger, 'PATCH', `/presets/${PRESET_ID}`, { name: 'Mine' });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'notFound', message: 'Preset not found' });
  });

  it('rejects a name over the limit with 400', async () => {
    const response = await call(dm, 'PATCH', `/presets/${PRESET_ID}`, { name: 'x'.repeat(41) });
    expect(response.status).toBe(400);
  });
});

describe('POST /presets/:id/duplicate', () => {
  it('copies the preset as "<name> 2" with its tags at the top of the list', async () => {
    const response = await call(dm, 'POST', `/presets/${PRESET_ID}/duplicate`, { id: COPY_ID });
    expect(response.status).toBe(200);
    const copy = presetSchema.parse(await response.json());
    expect(copy).toMatchObject({
      id: COPY_ID,
      name: 'Lich king 2',
      role: 'enemy',
      maxHp: 120,
      ac: 19,
      tags: [UNDEAD_TAG],
      createdAt: copy.updatedAt,
    });
    const found = await list(dm);
    expect(found.map((preset) => preset.id)).toEqual([COPY_ID, SECOND_ID, PRESET_ID]);
  });

  it('numbers the next copy after the existing ones', async () => {
    const response = await call(dm, 'POST', `/presets/${PRESET_ID}/duplicate`, {
      id: '01ARZ3NDEKTSV4RRFFQ69G5PA3',
    });
    expect(response.status).toBe(200);
    expect(presetSchema.parse(await response.json()).name).toBe('Lich king 3');
  });

  it('answers 404 for a preset of another user', async () => {
    const response = await call(stranger, 'POST', `/presets/${PRESET_ID}/duplicate`, {
      id: '01ARZ3NDEKTSV4RRFFQ69G5PA4',
    });
    expect(response.status).toBe(404);
  });

  it('rejects a malformed new id with 400', async () => {
    const response = await call(dm, 'POST', `/presets/${PRESET_ID}/duplicate`, { id: 'copy' });
    expect(response.status).toBe(400);
  });
});

describe('DELETE /presets/:id', () => {
  it('answers 404 for a preset of another user and keeps the row', async () => {
    const response = await call(stranger, 'DELETE', `/presets/${COPY_ID}`);
    expect(response.status).toBe(404);
    expect((await list(dm)).some((preset) => preset.id === COPY_ID)).toBe(true);
  });

  it('removes the preset and its tag links and leaves units in combats alone', async () => {
    expect((await call(dm, 'POST', '/combats', combatInput())).status).toBe(200);
    const added = await call(
      dm,
      'POST',
      `/combats/${COMBAT_ID}/actions`,
      addUnitAction('01ARZ3NDEKTSV4RRFFQ69G5PA5', 1, HERO_ID, 'Lich king 2', 'enemy'),
    );
    expect(added.status).toBe(200);
    const response = await call(dm, 'DELETE', `/presets/${COPY_ID}`);
    expect(response.status).toBe(204);
    expect(opened.db.select().from(presets).where(eq(presets.id, COPY_ID)).get()).toBeUndefined();
    expect(
      opened.db.select().from(presetTags).where(eq(presetTags.presetId, COPY_ID)).all(),
    ).toEqual([]);
    expect(opened.db.select().from(tags).where(eq(tags.id, UNDEAD_TAG)).get()).toBeDefined();
    const combat = await fetchCombat(dm);
    expect(combat.units.map((unit) => unit.name)).toEqual(['Lich king 2']);
  });
});

describe('preset limit', () => {
  it('rejects the 1001st preset and its duplicate with 422 limit', async () => {
    const limited = createTestApp();
    const owner = withUser(limited.app, DM);
    try {
      const now = '2026-10-16T12:00:00.000Z';
      const rows = Array.from({ length: 1000 }, (_, index) => ({
        ...presetInput(ulidAt(index), []),
        tags: undefined,
        ownerId: DM,
        createdAt: now,
        updatedAt: now,
      }));
      for (let start = 0; start < rows.length; start += 250) {
        limited.db
          .insert(presets)
          .values(rows.slice(start, start + 250))
          .run();
      }
      const extra = await call(owner, 'POST', '/presets', presetInput(PRESET_ID, []));
      expect(extra.status).toBe(422);
      expect(await extra.json()).toMatchObject({ code: 'limit' });
      const copy = await call(owner, 'POST', `/presets/${ulidAt(0)}/duplicate`, { id: COPY_ID });
      expect(copy.status).toBe(422);
      expect(await copy.json()).toMatchObject({ code: 'limit' });
      expect(await list(owner)).toHaveLength(1000);
    } finally {
      limited.close();
    }
  });
});

describe('preset tag limit', () => {
  it('returns a stored preset with 30 tags and refuses 26 tags on create and patch', async () => {
    const limited = createTestApp();
    const owner = withUser(limited.app, DM);
    try {
      const tagIds = Array.from({ length: 30 }, (_, index) => ulidAt(index));
      limited.db
        .insert(tags)
        .values(
          tagIds.map((id, index) => ({
            id,
            ownerId: DM,
            name: `Tag ${index}`,
            nameLower: `tag ${index}`,
          })),
        )
        .run();
      const now = '2026-10-16T12:00:00.000Z';
      insertPreset(limited.db, DM, {
        ...presetInput(PRESET_ID, tagIds),
        createdAt: now,
        updatedAt: now,
      });
      expect((await list(owner))[0]?.tags).toEqual(tagIds);
      const over = tagIds.slice(0, LIMITS.tagsPerDm + 1);
      const created = await call(owner, 'POST', '/presets', presetInput(SECOND_ID, over));
      expect(created.status).toBe(400);
      const patched = await call(owner, 'PATCH', `/presets/${PRESET_ID}`, { tags: over });
      expect(patched.status).toBe(400);
      const atLimit = tagIds.slice(0, LIMITS.tagsPerDm);
      expect((await call(owner, 'PATCH', `/presets/${PRESET_ID}`, { tags: atLimit })).status).toBe(
        200,
      );
    } finally {
      limited.close();
    }
  });
});
