import type { Combat } from '@combat-planner/domain';
import { eq } from 'drizzle-orm';
import type { Session } from '../client.ts';
import { localeSchema } from '../client.ts';
import type { Executor } from '../combats/store.ts';
import { listOwnCombats } from '../combats/store.ts';
import { user } from '../db/schema.ts';

export const USER_NOT_FOUND = { code: 'notFound', message: 'User not found' } as const;

export type DeletedCombat = Pick<Combat, 'id' | 'title'>;

export const findSession = (db: Executor, userId: string): Session | undefined => {
  const row = db
    .select({ email: user.email, name: user.name, language: user.language })
    .from(user)
    .where(eq(user.id, userId))
    .get();
  if (!row) return undefined;
  return {
    userId,
    email: row.email,
    displayName: row.name,
    language: localeSchema.parse(row.language),
  };
};

export const renameUser = (db: Executor, userId: string, displayName: string): boolean =>
  db.update(user).set({ name: displayName }).where(eq(user.id, userId)).run().changes > 0;

export const deleteUser = (db: Executor, userId: string): DeletedCombat[] | undefined => {
  const combats = listOwnCombats(db, userId).map(({ id, title }) => ({ id, title }));
  const removed = db.delete(user).where(eq(user.id, userId)).run().changes > 0;
  return removed ? combats : undefined;
};
