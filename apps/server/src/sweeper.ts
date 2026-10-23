import {
  announceReissue,
  announceRemoval,
  closeEndedDmStreams,
  deleteOldStats,
  findCombatRow,
  lastActionAt,
  listSharedCombats,
  listWatchingPlayers,
  reissueGeneration,
  removePlayer,
  sendToPlayer,
  signedInUsers,
  subscriptions,
  writeLink,
} from '@combat-planner/api';
import type { AppDatabase, SharedCombat } from '@combat-planner/api';
import type { CombatId, LinkState, SharingTimeouts } from '@combat-planner/domain';
import { streamIdle, sweepLink, sweepWatching } from '@combat-planner/domain';
import type { SharingTimers } from './timers.ts';

const sameLink = (a: LinkState, b: LinkState): boolean =>
  a.phase === b.phase &&
  (a.phase !== 'orphaned' || (b.phase === 'orphaned' && a.since === b.since));

const attempt = (label: string, run: () => void): void => {
  try {
    run();
  } catch (error) {
    console.error(`sharing sweep: ${label} failed`, error);
  }
};

const sweepOneLink = (
  db: AppDatabase,
  shared: SharedCombat,
  signedIn: Set<string>,
  now: string,
  timeouts: SharingTimeouts,
): void => {
  const next = sweepLink(
    shared.link,
    { ownerSignedIn: signedIn.has(shared.ownerId), now },
    timeouts,
  );
  if (sameLink(next, shared.link)) return;
  if (next.phase !== 'off') {
    writeLink(db, shared.combatId, next);
    return;
  }
  const reissued = db.transaction((tx) => {
    const row = findCombatRow(tx, shared.combatId);
    return row && reissueGeneration(tx, row.document, next, now);
  });
  if (reissued) announceReissue(reissued);
};

const sweepLinks = (db: AppDatabase, now: string, timeouts: SharingTimeouts): void => {
  const signedIn = signedInUsers(db, now);
  for (const shared of listSharedCombats(db)) {
    attempt(`link of combat ${shared.combatId}`, () =>
      sweepOneLink(db, shared, signedIn, now, timeouts),
    );
  }
};

const dropWatchingPlayers = (db: AppDatabase, now: string, timeouts: SharingTimeouts): void => {
  for (const { combatId, playerId, state } of listWatchingPlayers(db)) {
    if (sweepWatching(state, now, timeouts).phase !== 'dropped') continue;
    attempt(`player ${playerId} of combat ${combatId}`, () => {
      const removed = db.transaction((tx) => removePlayer(tx, combatId, playerId));
      sendToPlayer(combatId, playerId, { type: 'dropped' });
      announceRemoval(combatId, removed);
    });
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
  attempt('links', () => sweepLinks(db, now, timeouts));
  attempt('watching players', () => dropWatchingPlayers(db, now, timeouts));
  attempt('idle streams', () => dropIdleStreams(db, now, timeouts));
  attempt('ended DM streams', () => closeEndedDmStreams(db, now));
  attempt('daily stats', () => deleteOldStats(db, now));
}

export function startSweeper(
  db: AppDatabase,
  timers: SharingTimers,
  onSwept: (at: Date) => void = () => {},
): () => void {
  const timer = setInterval(() => {
    sweep(db, new Date().toISOString(), timers.timeouts);
    onSwept(new Date());
  }, timers.sweepIntervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
