import { eq } from 'drizzle-orm';
import type { Settings } from '../client.ts';
import { localeSchema } from '../client.ts';
import type { Executor } from '../combats/store.ts';
import { user } from '../db/schema.ts';

export const USER_NOT_FOUND = { code: 'notFound', message: 'User not found' } as const;

export const findSettings = (db: Executor, userId: string): Settings | undefined => {
  const row = db.select({ language: user.language }).from(user).where(eq(user.id, userId)).get();
  return row ? { language: localeSchema.parse(row.language) } : undefined;
};

export const saveSettings = (db: Executor, userId: string, settings: Settings): boolean =>
  db.update(user).set({ language: settings.language }).where(eq(user.id, userId)).run().changes > 0;
