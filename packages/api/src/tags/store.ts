import type { Tag, TagId } from '@combat-planner/domain';
import { normalizeTag } from '@combat-planner/domain';
import { and, asc, count, eq, ne } from 'drizzle-orm';
import type { Executor } from '../combats/store.ts';
import { presetTags, tags } from '../db/schema.ts';

export const TAG_NOT_FOUND = { code: 'notFound', message: 'Tag not found' } as const;

export interface TagRow {
  ownerId: string;
  tag: Tag;
}

const tagColumns = { id: tags.id, name: tags.name };

export const findTagRow = (db: Executor, tagId: TagId): TagRow | undefined => {
  const row = db.select().from(tags).where(eq(tags.id, tagId)).get();
  return row ? { ownerId: row.ownerId, tag: { id: row.id, name: row.name } } : undefined;
};

export const findOwnTag = (db: Executor, ownerId: string, tagId: TagId): Tag | undefined =>
  db
    .select(tagColumns)
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.ownerId, ownerId)))
    .get();

export const listOwnTags = (db: Executor, ownerId: string): Tag[] =>
  db
    .select(tagColumns)
    .from(tags)
    .where(eq(tags.ownerId, ownerId))
    .orderBy(asc(tags.nameLower), asc(tags.id))
    .all();

export const countOwnTags = (db: Executor, ownerId: string): number =>
  db.select({ total: count() }).from(tags).where(eq(tags.ownerId, ownerId)).get()?.total ?? 0;

export const isNameTaken = (db: Executor, ownerId: string, name: string, exceptId?: TagId) =>
  db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(
        eq(tags.ownerId, ownerId),
        eq(tags.nameLower, normalizeTag(name)),
        exceptId === undefined ? undefined : ne(tags.id, exceptId),
      ),
    )
    .get() !== undefined;

export const insertTag = (db: Executor, ownerId: string, tag: Tag): void => {
  db.insert(tags)
    .values({ id: tag.id, ownerId, name: tag.name, nameLower: normalizeTag(tag.name) })
    .run();
};

export const renameTag = (db: Executor, tag: Tag): void => {
  db.update(tags)
    .set({ name: tag.name, nameLower: normalizeTag(tag.name) })
    .where(eq(tags.id, tag.id))
    .run();
};

export const deleteTag = (db: Executor, tagId: TagId): void => {
  db.delete(presetTags).where(eq(presetTags.tagId, tagId)).run();
  db.delete(tags).where(eq(tags.id, tagId)).run();
};
