import type { CombatId, DisplayName, PlayerId } from '@combat-planner/domain';
import { eq } from 'drizzle-orm';
import type { Locale } from '../client.ts';
import { localeSchema } from '../client.ts';
import type { Executor } from '../combats/store.ts';
import { players, user } from '../db/schema.ts';

export const dmLanguage = (db: Executor, ownerId: string): Locale => {
  const stored = db
    .select({ language: user.language })
    .from(user)
    .where(eq(user.id, ownerId))
    .get();
  const parsed = localeSchema.safeParse(stored?.language);
  return parsed.success ? parsed.data : 'en';
};

export const recordPlayer = (
  db: Executor,
  combatId: CombatId,
  playerId: PlayerId,
  displayName: DisplayName,
): void => {
  db.insert(players)
    .values({ combatId, playerId, displayName })
    .onConflictDoUpdate({ target: [players.combatId, players.playerId], set: { displayName } })
    .run();
};
