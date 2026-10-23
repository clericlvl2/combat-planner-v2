import type { CombatId, ConnectedPlayer, LinkState, PlayerId } from '@combat-planner/domain';
import { followClaims } from '@combat-planner/domain';
import type { Combat } from '@combat-planner/domain';
import { and, eq, gt, isNotNull, min } from 'drizzle-orm';
import type { DmCombat } from '../client.ts';
import { dmDocument } from '../combats/log.ts';
import type { Executor, Transaction } from '../combats/store.ts';
import { findCombatRow, saveCombat } from '../combats/store.ts';
import { combats, players, session } from '../db/schema.ts';

export interface SharedCombat {
  combatId: CombatId;
  ownerId: string;
  link: LinkState;
}

export interface PlayerRow {
  combatId: CombatId;
  playerId: PlayerId;
  state: ConnectedPlayer;
}

const linkOf = (shared: boolean, orphanedAt: string | null): LinkState => {
  if (!shared) return { phase: 'off' };
  return orphanedAt === null ? { phase: 'live' } : { phase: 'orphaned', since: orphanedAt };
};

const stateOf = (watchingSince: string | null): ConnectedPlayer =>
  watchingSince === null ? { phase: 'playing' } : { phase: 'watching', since: watchingSince };

const watchingSinceOf = (state: ConnectedPlayer): string | null =>
  state.phase === 'watching' ? state.since : null;

export const readLink = (db: Executor, combatId: CombatId): LinkState | undefined => {
  const row = db
    .select({ linkShared: combats.linkShared, orphanedAt: combats.orphanedAt })
    .from(combats)
    .where(eq(combats.id, combatId))
    .get();
  return row && linkOf(row.linkShared, row.orphanedAt);
};

export const writeLink = (db: Executor, combatId: CombatId, link: LinkState): void => {
  db.update(combats)
    .set({
      linkShared: link.phase !== 'off',
      orphanedAt: link.phase === 'orphaned' ? link.since : null,
    })
    .where(eq(combats.id, combatId))
    .run();
};

export const listSharedCombats = (db: Executor): SharedCombat[] =>
  db
    .select({
      combatId: combats.id,
      ownerId: combats.ownerId,
      linkShared: combats.linkShared,
      orphanedAt: combats.orphanedAt,
    })
    .from(combats)
    .where(eq(combats.linkShared, true))
    .all()
    .map((row) => ({
      combatId: row.combatId,
      ownerId: row.ownerId,
      link: linkOf(row.linkShared, row.orphanedAt),
    }));

export const signedInSince = (db: Executor, now: string): Map<string, string> => {
  const rows = db
    .select({ userId: session.userId, since: min(session.createdAt) })
    .from(session)
    .where(gt(session.expiresAt, new Date(now)))
    .groupBy(session.userId)
    .all();
  return new Map(
    rows.flatMap((row) => (row.since === null ? [] : [[row.userId, row.since.toISOString()]])),
  );
};

export const liveSessionIds = (db: Executor, now: string): Set<string> =>
  new Set(
    db
      .select({ id: session.id })
      .from(session)
      .where(gt(session.expiresAt, new Date(now)))
      .all()
      .map((row) => row.id),
  );

export const lastActionAt = (db: Executor, combatId: CombatId): string | undefined =>
  db.select({ updatedAt: combats.updatedAt }).from(combats).where(eq(combats.id, combatId)).get()
    ?.updatedAt;

export const insertPlayer = (
  db: Executor,
  combatId: CombatId,
  playerId: PlayerId,
  state: ConnectedPlayer,
): void => {
  db.insert(players)
    .values({ combatId, playerId, displayName: '', watchingSince: watchingSinceOf(state) })
    .run();
};

export const playerExists = (db: Executor, combatId: CombatId, playerId: PlayerId): boolean =>
  db
    .select({ playerId: players.playerId })
    .from(players)
    .where(and(eq(players.combatId, combatId), eq(players.playerId, playerId)))
    .get() !== undefined;

export const listWatchingPlayers = (db: Executor): PlayerRow[] =>
  db
    .select({
      combatId: players.combatId,
      playerId: players.playerId,
      watchingSince: players.watchingSince,
    })
    .from(players)
    .where(isNotNull(players.watchingSince))
    .all()
    .map((row) => ({
      combatId: row.combatId,
      playerId: row.playerId,
      state: stateOf(row.watchingSince),
    }));

export const deletePlayer = (db: Executor, combatId: CombatId, playerId: PlayerId): void => {
  db.delete(players)
    .where(and(eq(players.combatId, combatId), eq(players.playerId, playerId)))
    .run();
};

export const deletePlayers = (db: Executor, combatId: CombatId): void => {
  db.delete(players).where(eq(players.combatId, combatId)).run();
};

export const followCombatClaims = (db: Executor, combat: Combat, now: string): void => {
  const rows = db
    .select({ playerId: players.playerId, watchingSince: players.watchingSince })
    .from(players)
    .where(eq(players.combatId, combat.id))
    .all();
  for (const row of rows) {
    const holdsHero = combat.units.some((unit) => unit.claimedBy === row.playerId);
    const next = watchingSinceOf(followClaims(stateOf(row.watchingSince), holdsHero, now));
    if (next === row.watchingSince) continue;
    db.update(players)
      .set({ watchingSince: next })
      .where(and(eq(players.combatId, combat.id), eq(players.playerId, row.playerId)))
      .run();
  }
};

export const removePlayer = (
  tx: Transaction,
  combatId: CombatId,
  playerId: PlayerId,
): DmCombat | undefined => {
  deletePlayer(tx, combatId, playerId);
  const combat = findCombatRow(tx, combatId)?.document;
  if (!combat || combat.players[playerId] === undefined) return undefined;
  const next: Combat = {
    ...combat,
    players: Object.fromEntries(Object.entries(combat.players).filter(([id]) => id !== playerId)),
    version: combat.version + 1,
  };
  saveCombat(tx, next);
  return dmDocument(tx, next);
};
