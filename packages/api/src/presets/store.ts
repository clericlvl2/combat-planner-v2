import type { Preset, PresetId, TagId } from '@combat-planner/domain';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Executor } from '../combats/store.ts';
import { presetTags, presets, tags } from '../db/schema.ts';

export const PRESET_NOT_FOUND = { code: 'notFound', message: 'Preset not found' } as const;

interface PresetFields {
  id: PresetId;
  ownerId: string;
  name: Preset['name'];
  role: Preset['role'];
  maxHp: number;
  ac: number;
  pd: number;
  md: number;
  initiativeBonus: number;
  createdAt: string;
  updatedAt: string;
}

export interface PresetRow {
  ownerId: string;
  preset: Preset;
}

const presetTagRowId = sql<number>`"preset_tags"."rowid"`;

const tagsByPreset = (db: Executor, presetIds: PresetId[]): Map<PresetId, TagId[]> => {
  const found = new Map<PresetId, TagId[]>();
  if (presetIds.length === 0) return found;
  const rows = db
    .select({ presetId: presetTags.presetId, tagId: presetTags.tagId })
    .from(presetTags)
    .where(inArray(presetTags.presetId, presetIds))
    .orderBy(presetTagRowId)
    .all();
  for (const row of rows) found.set(row.presetId, [...(found.get(row.presetId) ?? []), row.tagId]);
  return found;
};

const presetOf = (fields: PresetFields, tagIds: TagId[]): Preset => ({
  id: fields.id,
  name: fields.name,
  role: fields.role,
  maxHp: fields.maxHp,
  ac: fields.ac,
  pd: fields.pd,
  md: fields.md,
  initiativeBonus: fields.initiativeBonus,
  tags: tagIds,
  createdAt: fields.createdAt,
  updatedAt: fields.updatedAt,
});

const withTags = (db: Executor, rows: PresetFields[]): PresetRow[] => {
  const tagIds = tagsByPreset(
    db,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    ownerId: row.ownerId,
    preset: presetOf(row, tagIds.get(row.id) ?? []),
  }));
};

export const findPresetRow = (db: Executor, presetId: PresetId): PresetRow | undefined => {
  const row = db.select().from(presets).where(eq(presets.id, presetId)).get();
  return row ? withTags(db, [row])[0] : undefined;
};

export const findOwnPreset = (
  db: Executor,
  ownerId: string,
  presetId: PresetId,
): Preset | undefined => {
  const row = db
    .select()
    .from(presets)
    .where(and(eq(presets.id, presetId), eq(presets.ownerId, ownerId)))
    .get();
  return row ? withTags(db, [row])[0]?.preset : undefined;
};

export const listOwnPresets = (db: Executor, ownerId: string): Preset[] =>
  withTags(
    db,
    db
      .select()
      .from(presets)
      .where(eq(presets.ownerId, ownerId))
      .orderBy(desc(presets.createdAt), desc(sql`"presets"."rowid"`))
      .all(),
  ).map((row) => row.preset);

export const countOwnPresets = (db: Executor, ownerId: string): number =>
  db.select({ total: count() }).from(presets).where(eq(presets.ownerId, ownerId)).get()?.total ?? 0;

export const ownsTags = (db: Executor, ownerId: string, tagIds: TagId[]): boolean => {
  if (tagIds.length === 0) return true;
  const owned =
    db
      .select({ total: count() })
      .from(tags)
      .where(and(eq(tags.ownerId, ownerId), inArray(tags.id, tagIds)))
      .get()?.total ?? 0;
  return owned === tagIds.length;
};

const replaceTags = (db: Executor, presetId: PresetId, tagIds: TagId[]): void => {
  db.delete(presetTags).where(eq(presetTags.presetId, presetId)).run();
  if (tagIds.length === 0) return;
  db.insert(presetTags)
    .values(tagIds.map((tagId) => ({ presetId, tagId })))
    .run();
};

export const insertPreset = (db: Executor, ownerId: string, preset: Preset): void => {
  db.insert(presets)
    .values({
      id: preset.id,
      ownerId,
      name: preset.name,
      role: preset.role,
      maxHp: preset.maxHp,
      ac: preset.ac,
      pd: preset.pd,
      md: preset.md,
      initiativeBonus: preset.initiativeBonus,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
    })
    .run();
  replaceTags(db, preset.id, preset.tags);
};

export const savePreset = (db: Executor, preset: Preset): void => {
  db.update(presets)
    .set({
      name: preset.name,
      role: preset.role,
      maxHp: preset.maxHp,
      ac: preset.ac,
      pd: preset.pd,
      md: preset.md,
      initiativeBonus: preset.initiativeBonus,
      updatedAt: preset.updatedAt,
    })
    .where(eq(presets.id, preset.id))
    .run();
  replaceTags(db, preset.id, preset.tags);
};

export const deletePreset = (db: Executor, presetId: PresetId): void => {
  db.delete(presets).where(eq(presets.id, presetId)).run();
};
