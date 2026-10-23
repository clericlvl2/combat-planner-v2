import {
  announceReissue,
  broadcastDocument,
  closeEndedDmStreams,
  findCombatRow,
  lastActionAt,
  listSharedCombats,
  listWatchingPlayers,
  reissueGeneration,
  removePlayer,
  sendToPlayer,
  signedInSince,
  subscriptions,
  writeLink,
} from '@combat-planner/api';
import type { AppDatabase } from '@combat-planner/api';
import type { CombatId, LinkState, SharingTimeouts } from '@combat-planner/domain';
import { streamIdle, sweepLink, sweepWatching } from '@combat-planner/domain';
import type { SharingTimers } from './timers.ts';

const sameLink = (a: LinkState, b: LinkState): boolean =>
  a.phase === b.phase &&
  (a.phase !== 'orphaned' || (b.phase === 'orphaned' && a.since === b.since));

const sweepLinks = (db: AppDatabase, now: string, timeouts: SharingTimeouts): void => {
  const signedIn = signedInSince(db, now);
  for (const shared of listSharedCombats(db)) {
    const next = sweepLink(
      shared.link,
      { ownerSignedInSince: signedIn.get(shared.ownerId) ?? null, now },
      timeouts,
    );
    if (sameLink(next, shared.link)) continue;
    if (next.phase !== 'off') {
      writeLink(db, shared.combatId, next);
      continue;
    }
    const reissued = db.transaction((tx) => {
      const row = findCombatRow(tx, shared.combatId);
      return row && reissueGeneration(tx, row.document, next, now);
    });
    if (reissued) announceReissue(reissued);
  }
};

const dropWatchingPlayers = (db: AppDatabase, now: string, timeouts: SharingTimeouts): void => {
  for (const { combatId, playerId, state } of listWatchingPlayers(db)) {
    if (sweepWatching(state, now, timeouts).phase !== 'dropped') continue;
    const document = db.transaction((tx) => removePlayer(tx, combatId, playerId));
    sendToPlayer(combatId, playerId, { type: 'dropped' });
    if (document) broadcastDocument(combatId, document);
  }
};

const dropIdleStreams = (db: AppDatabase, now: string, timeouts: SharingTimeouts): void => {
  const lastActions = new Map<CombatId, string | undefined>();
  for (const { combatId, subscriber, openedAt } of subscriptions()) {
    if (subscriber.viewer.kind !== 'player') continue;
    if (!lastActions.has(combatId)) lastActions.set(combatId, lastActionAt(db, combatId));
    const last = lastActions.get(combatId);
    if (last === undefined) continue;
    if (streamIdle({ openedAt, lastActionAt: last, now }, timeouts)) {
      subscriber.send({ type: 'dropped' });
    }
  }
};

export function sweep(db: AppDatabase, now: string, timeouts: SharingTimeouts): void {
  sweepLinks(db, now, timeouts);
  dropWatchingPlayers(db, now, timeouts);
  dropIdleStreams(db, now, timeouts);
  closeEndedDmStreams(db, now);
}

export function startSweeper(db: AppDatabase, timers: SharingTimers): () => void {
  const timer = setInterval(() => {
    try {
      sweep(db, new Date().toISOString(), timers.timeouts);
    } catch (error) {
      console.error('sharing sweep failed', error);
    }
  }, timers.sweepIntervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
